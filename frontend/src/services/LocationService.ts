import axios from "axios";
import * as Location from "expo-location";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { getAuthHeader } from "../utils/auth";
import { API_URL } from "../utils/config";
import * as locationApi from "../api/locationApi";

export interface Coordinates {
    latitude: number;
    longitude: number;
}

export interface Address {
    village: string;
    street: string;
    district: string;
    state: string;
    pincode: string;
}

export interface LocationType {
    type: string;
    coordinates: number[];
}

export interface DistanceMatrixResult {
    distance: number;
    duration: string;
    polyline?: string;
}

export interface DirectionsResult {
    routes: Array<{
        legs: Array<{
            distance: {
                text: string;
                value: number;
            };
            duration: {
                text: string;
                value: number;
            };
            steps: Array<{
                distance: {
                    text: string;
                    value: number;
                };
                duration: {
                    text: string;
                    value: number;
                };
                polyline: {
                    points: string;
                };
            }>;
        }>;
        overview_polyline: {
            points: string;
        };
    }>;
}

export class LocationService {
    // Get current location coordinates with better accuracy
    static async getCurrentLocation(): Promise<Coordinates> {
        try {
            const { status } = await Location.requestForegroundPermissionsAsync();

            if (status !== "granted") {
                throw new Error("Permission to access location was denied");
            }

            try {
                // Try to get high accuracy location
                const location = await Location.getCurrentPositionAsync({
                    accuracy: Location.Accuracy.High,
                });

                // Validate coordinates
                if (!location?.coords || 
                    typeof location.coords.latitude !== 'number' || 
                    typeof location.coords.longitude !== 'number' ||
                    isNaN(location.coords.latitude) || 
                    isNaN(location.coords.longitude)) {
                    throw new Error("Invalid location coordinates received");
                }

                console.log("Got high accuracy location:", location.coords);
                return {
                    latitude: location.coords.latitude,
                    longitude: location.coords.longitude,
                };
            } catch (error) {
                console.error("Error getting high accuracy location, falling back to regular accuracy", error);

                // Fall back to regular accuracy
                const location = await Location.getCurrentPositionAsync({});

                // Validate fallback coordinates
                if (!location?.coords || 
                    typeof location.coords.latitude !== 'number' || 
                    typeof location.coords.longitude !== 'number' ||
                    isNaN(location.coords.latitude) || 
                    isNaN(location.coords.longitude)) {
                    throw new Error("Invalid fallback location coordinates received");
                }

                return {
                    latitude: location.coords.latitude,
                    longitude: location.coords.longitude,
                };
            }
        } catch (error) {
            console.error("Error getting current location:", error);
            throw new Error(error instanceof Error ? error.message : "Failed to get current location");
        }
    }

    // Geocode an address to get coordinates
    static async geocodeAddress(address: Address): Promise<LocationType> {
        try {
            const response = await locationApi.geocodeAddress(address);
            return response.data.location;
        } catch (error) {
            console.error("Error geocoding address:", error);
            throw new Error("Failed to geocode address");
        }
    }

    // Get coordinates from a string address
    static async geocodeStringAddress(address: string): Promise<Coordinates> {
        try {
            // First try to parse if it's already coordinates
            if (address.includes(",")) {
                const parts = address.split(",").map((part) => parseFloat(part.trim()));
                if (parts.length >= 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
                    return {
                        latitude: parts[0],
                        longitude: parts[1],
                    };
                }
            }

            // Try backend geocoding service
            try {
                const addressParts = address.split(",").map((part) => part.trim());
                const formattedAddress = {
                    street: addressParts[0] || "",
                    village: addressParts[1] || "",
                    district: addressParts[2] || "",
                    state: addressParts[3] || "",
                    pincode: addressParts[4] || "",
                };

                const response = await locationApi.geocodeAddress(formattedAddress);
                if (response?.data?.location?.coordinates?.length === 2) {
                    return {
                        latitude: response.data.location.coordinates[1],
                        longitude: response.data.location.coordinates[0],
                    };
                }
            } catch (backendError) {
                console.log("Backend geocoding failed, trying fallback");
            }

            // Fallback: return a default location if geocoding fails
            console.warn("Geocoding failed, using fallback coordinates");
            return {
                latitude: 0,
                longitude: 0,
            };
        } catch (error) {
            console.error("Error geocoding string address:", error);
            // Return fallback coordinates instead of throwing
            return {
                latitude: 0,
                longitude: 0,
            };
        }
    }

    // Calculate distance between two coordinates - removed to avoid conflicts
    // Use getDistanceMatrix instead for simplified format

    static async getDistanceMatrix(
        origins: Coordinates | Coordinates[],
        destinations: Coordinates | Coordinates[]
    ): Promise<{
        distance: number;
        duration: string;
        polyline?: string;
    }> {
        try {
            // Validate input coordinates
            const validateCoordinates = (coords: Coordinates | Coordinates[]) => {
                const coordArray = Array.isArray(coords) ? coords : [coords];
                return coordArray.every(coord => 
                    coord && 
                    typeof coord.latitude === 'number' && 
                    typeof coord.longitude === 'number' &&
                    !isNaN(coord.latitude) && 
                    !isNaN(coord.longitude) &&
                    coord.latitude >= -90 && coord.latitude <= 90 &&
                    coord.longitude >= -180 && coord.longitude <= 180
                );
            };

            if (!validateCoordinates(origins) || !validateCoordinates(destinations)) {
                throw new Error("Invalid coordinates provided");
            }

            const cacheKey = JSON.stringify({ origins, destinations });
            try {
                const cachedData = await AsyncStorage.getItem(`distance_matrix_${cacheKey}`);
                if (cachedData) {
                    const { result, timestamp } = JSON.parse(cachedData);
                    const fifteenMinutesAgo = Date.now() - 15 * 60 * 1000;
                    if (timestamp > fifteenMinutesAgo && result) {
                        return result;
                    }
                }
            } catch (e) {
                console.log("Cache access error:", e);
            }

            const response = await locationApi.calculateDistance(origins, destinations);

            if (!response?.success || !response?.data) {
                throw new Error("Failed to calculate distance - no response data");
            }

            // More thorough validation of response structure
            if (!response.data.rows || 
                !Array.isArray(response.data.rows) || 
                response.data.rows.length === 0) {
                throw new Error("Invalid response structure - missing rows");
            }

            const firstRow = response.data.rows[0];
            if (!firstRow?.elements || 
                !Array.isArray(firstRow.elements) || 
                firstRow.elements.length === 0) {
                throw new Error("Invalid response structure - missing elements");
            }

            const element = firstRow.elements[0];

            // Check if the element has a successful status and contains distance/duration data
            if (!element || element.status !== "OK") {
                throw new Error(`Distance calculation failed with status: ${element?.status || "unknown"}`);
            }

            // Verify that distance and duration properties exist
            if (!element.distance || !element.duration) {
                throw new Error("Distance calculation response missing distance or duration data");
            }

            // Ensure the distance and duration have the expected properties
            if (typeof element.distance.value !== "number" || 
                typeof element.duration.text !== "string" ||
                isNaN(element.distance.value)) {
                console.error("Invalid distance matrix element structure:", element);
                throw new Error("Invalid distance matrix response structure");
            }

            const result = {
                distance: element.distance.value,
                duration: element.duration.text,
            };

            try {
                await AsyncStorage.setItem(
                    `distance_matrix_${cacheKey}`,
                    JSON.stringify({
                        result,
                        timestamp: Date.now(),
                    })
                );
            } catch (e) {
                console.log("Cache write error:", e);
            }

            return result;
        } catch (error) {
            console.error("Error getting distance matrix:", error);
            throw new Error(error instanceof Error ? error.message : "Failed to get distance matrix");
        }
    }

    static async getDirections(origin: Coordinates, destination: Coordinates, waypoints?: Coordinates[]): Promise<DirectionsResult> {
        try {
            const response = await locationApi.getDirections(origin, destination, waypoints);
            return response.data;
        } catch (error) {
            console.error("Error getting directions:", error);
            throw new Error("Failed to get directions");
        }
    }

    static async getNearbyShops(coordinates: Coordinates, distance: number = 10): Promise<any> {
        try {
            const response = await locationApi.findNearbyShops(coordinates, distance);
            return response;
        } catch (error) {
            console.error("Error fetching nearby shops:", error);
            throw new Error("Failed to fetch nearby shops");
        }
    }

    // Update user's current location
    static async updateUserLocation(coordinates: Coordinates): Promise<any> {
        try {
            const response = await locationApi.updateUserLocation(coordinates);
            return response;
        } catch (error) {
            console.error("Error updating user location:", error);
            throw new Error("Failed to update user location");
        }
    }

    // Track an order's location using the location API
    static async trackOrderLocation(orderId: string): Promise<any> {
        try {
            const response = await locationApi.trackOrderLocation(orderId);
            return response;
        } catch (error) {
            console.error("Error tracking order location:", error);
            throw new Error("Failed to track order location");
        }
    }

    // Track an order's location (legacy method - consider using trackOrderLocation instead)
    static async trackOrder(orderId: string): Promise<any> {
        try {
            const response = await axios.get(`${API_URL}/orders/${orderId}/tracking`, { headers: await getAuthHeader() });

            return response.data;
        } catch (error) {
            console.error("Error tracking order:", error);
            throw new Error("Failed to track order");
        }
    }

    // For vendors: Update order tracking information
    static async updateOrderTracking(
        orderId: string,
        trackingData: {
            latitude: number;
            longitude: number;
            status?: string;
            eta?: Date;
            distance?: number;
            route?: string;
        }
    ): Promise<any> {
        try {
            const response = await axios.put(`${API_URL}/orders/${orderId}/tracking`, trackingData, { headers: await getAuthHeader() });

            return response.data;
        } catch (error) {
            console.error("Error updating order tracking:", error);
            throw new Error("Failed to update order tracking");
        }
    }

    // Decode a polyline to coordinates array
    static decodePolyline(encoded: string): Coordinates[] {
        const points: Coordinates[] = [];
        let index = 0;
        const len = encoded.length;
        let lat = 0;
        let lng = 0;

        while (index < len) {
            let b;
            let shift = 0;
            let result = 0;
            do {
                b = encoded.charCodeAt(index++) - 63;
                result |= (b & 0x1f) << shift;
                shift += 5;
            } while (b >= 0x20);
            const dlat = (result & 1) !== 0 ? ~(result >> 1) : result >> 1;
            lat += dlat;

            shift = 0;
            result = 0;
            do {
                b = encoded.charCodeAt(index++) - 63;
                result |= (b & 0x1f) << shift;
                shift += 5;
            } while (b >= 0x20);
            const dlng = (result & 1) !== 0 ? ~(result >> 1) : result >> 1;
            lng += dlng;

            points.push({
                latitude: lat / 1e5,
                longitude: lng / 1e5,
            });
        }

        return points;
    }

    // Format distance for display
    static formatDistance(meters: number): string {
        if (meters < 1000) {
            return `${meters.toFixed(0)} m`;
        } else {
            return `${(meters / 1000).toFixed(1)} km`;
        }
    }

    // Format duration for display
    static formatDuration(seconds: number): string {
        if (seconds < 60) {
            return `${seconds} sec`;
        } else if (seconds < 3600) {
            return `${Math.floor(seconds / 60)} min`;
        } else {
            const hours = Math.floor(seconds / 3600);
            const minutes = Math.floor((seconds % 3600) / 60);
            return `${hours} hr ${minutes} min`;
        }
    }
}

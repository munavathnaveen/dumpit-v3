import apiClient from "./apiClient";
import { User } from "./types";

export interface LocationData {
    latitude: number;
    longitude: number;
}

export interface Address {
    street: string;
    village: string;
    district: string;
    state: string;
    pincode: string;
    phone?: string;
}

/**
 * Update user's current location
 */
export const updateUserLocation = async (
    locationData: LocationData
): Promise<{
    success: boolean;
    data: User;
}> => {
    const response = await apiClient.put("/location", {
        longitude: locationData.longitude,
        latitude: locationData.latitude,
    });
    return response.data;
};

interface Shop {
    _id: string;
    name: string;
    description: string;
    address: Address;
    location: {
        type: string;
        coordinates: number[];
    };
    rating: number;
    images: string[];
    distance?: number;
}

/**
 * Find shops near a specific location
 */
export const findNearbyShops = async (
    locationData: LocationData,
    distance: number = 10
): Promise<{
    success: boolean;
    count: number;
    data: Shop[];
}> => {
    const response = await apiClient.get("/location/shops", {
        params: {
            longitude: locationData.longitude,
            latitude: locationData.latitude,
            distance,
        },
    });
    return response.data;
};

/**
 * Geocode an address to coordinates
 */
export const geocodeAddress = async (
    address: Address
): Promise<{
    success: boolean;
    data: {
        location: {
            type: string;
            coordinates: number[];
        };
        formattedAddress: string;
    };
}> => {
    const response = await apiClient.post("/location/geocode", { address });
    return response.data;
};

/**
 * Calculate distance between points
 */
export const calculateDistance = async (
    origins: LocationData | LocationData[],
    destinations: LocationData | LocationData[]
): Promise<{
    success: boolean;
    data: {
        rows: Array<{
            elements: Array<{
                distance: { text: string; value: number };
                duration: { text: string; value: number };
                status: string;
            }>;
        }>;
        status: string;
    };
}> => {
    try {
        const response = await apiClient.post("/location/distance", {
            origins,
            destinations,
        });

        if (!response.data.success || !response.data.data) {
            throw new Error(response.data.data?.message || "Failed to calculate distance");
        }

        return response.data;
    } catch (error) {
        console.error("Error calculating distance:", error);
        throw new Error(error instanceof Error ? error.message : "Failed to calculate distance");
    }
};

interface DirectionsResponse {
    routes: Array<{
        legs: Array<{
            distance: { text: string; value: number };
            duration: { text: string; value: number };
            end_address: string;
            start_address: string;
            steps: Array<{
                distance: { text: string; value: number };
                duration: { text: string; value: number };
                html_instructions: string;
                polyline: { points: string };
                travel_mode: string;
            }>;
        }>;
        overview_polyline: { points: string };
        summary: string;
    }>;
    status: string;
}

/**
 * Get directions between points
 */
export const getDirections = async (
    origin: LocationData,
    destination: LocationData,
    waypoints?: LocationData[]
): Promise<{
    success: boolean;
    data: DirectionsResponse;
}> => {
    const response = await apiClient.get("/location/directions", {
        params: {
            origin: `${origin.latitude},${origin.longitude}`,
            destination: `${destination.latitude},${destination.longitude}`,
            waypoints: waypoints?.map((wp) => `${wp.latitude},${wp.longitude}`).join("|"),
        },
    });
    return response.data;
};

/**
 * Get orders by location (vendor only)
 */
export const getOrdersByLocation = async (
    locationData: LocationData,
    distance: number = 10
): Promise<{
    success: boolean;
    count: number;
    data: any[];
}> => {
    const response = await apiClient.get("/location/orders", {
        params: {
            longitude: locationData.longitude,
            latitude: locationData.latitude,
            distance,
        },
    });
    return response.data;
};

/**
 * Track order location
 */
export const trackOrderLocation = async (
    orderId: string
): Promise<{
    success: boolean;
    data: {
        orderId: string;
        status: string;
        location: {
            type: string;
            coordinates: number[];
        };
        tracking: any;
        address: Address;
    };
}> => {
    const response = await apiClient.get(`/location/orders/${orderId}/track`);
    return response.data;
};

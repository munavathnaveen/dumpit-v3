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
        latitude: locationData.latitude,
        longitude: locationData.longitude,
    });
    return response.data;
};

/**
 * Find shops near a specific location
 */
export const findNearbyShops = async (
    locationData: LocationData,
    distance: number = 10
): Promise<{
    success: boolean;
    count: number;
    data: any[];
}> => {
    const response = await apiClient.get("/location/shops", {
        params: {
            latitude: locationData.latitude,
            longitude: locationData.longitude,
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
    data: any;
}> => {
    const response = await apiClient.post("/location/distance", {
        origins,
        destinations,
    });
    return response.data;
};

/**
 * Get directions between points
 */
export const getDirections = async (
    origin: LocationData,
    destination: LocationData,
    waypoints?: LocationData[]
): Promise<{
    success: boolean;
    data: any;
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
            latitude: locationData.latitude,
            longitude: locationData.longitude,
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

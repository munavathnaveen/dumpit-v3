import apiClient from "./apiClient";
import { User } from "./types";

export interface LocationData {
    latitude: number;
    longitude: number;
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

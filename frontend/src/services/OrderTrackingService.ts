import io from "socket.io-client";
import axios from "axios";
import { getAuthHeader } from "../utils/auth";
import { LocationService, Coordinates, DirectionsResult } from "./LocationService";
import { API_URL } from "../utils/config";

// Get API_URL from our config file
// const API_URL = process.env.API_URL || 'http://localhost:5000/api/v1';

export type OrderStatus = "pending" | "processing" | "shipped" | "delivered" | "cancelled";
export type TrackingStatus = "preparing" | "ready_for_pickup" | "in_transit" | "delivered";

export interface TrackingInfo {
    currentLocation?: {
        type: string;
        coordinates: number[];
    };
    status?: TrackingStatus;
    eta?: string;
    distance?: number;
    route?: string;
    lastUpdated?: string;
}

export interface OrderTrackingData {
    _id: string;
    orderNumber: string;
    status: OrderStatus;
    tracking?: TrackingInfo;
    shippingAddress: {
        location?: {
            type: string;
            coordinates: number[];
        };
    };
}

export type TrackingUpdateListener = (data: OrderTrackingData) => void;

// Add export for navigation type
export type OrderTrackingScreenParams = {
    orderId: string;
};

export class OrderTrackingService {
    private static socketInstance: any = null;
    private static listeners: Map<string, TrackingUpdateListener[]> = new Map();

    /**
     * Initialize socket connection for real-time order tracking
     */
    static initializeSocket(): void {
        if (!this.socketInstance) {
            this.socketInstance = io(`${API_URL}`);

            this.socketInstance.on("connect", () => {
                console.log("Connected to order tracking socket server");
            });

            this.socketInstance.on("order-tracking-update", (data: OrderTrackingData) => {
                console.log("Received order tracking update:", data);

                // Notify all listeners for this order
                const orderId = data._id;
                const orderListeners = this.listeners.get(orderId) || [];
                orderListeners.forEach((listener) => listener(data));
            });
        }
    }

    /**
     * Subscribe to real-time updates for a specific order
     */
    static subscribeToOrderUpdates(orderId: string, listener: TrackingUpdateListener): () => void {
        // Initialize socket if not already done
        this.initializeSocket();

        // Join the order-specific room
        this.socketInstance.emit("join-order-tracking", orderId);

        // Add listener to the map
        if (!this.listeners.has(orderId)) {
            this.listeners.set(orderId, []);
        }
        this.listeners.get(orderId)?.push(listener);

        // Return unsubscribe function
        return () => {
            const orderListeners = this.listeners.get(orderId) || [];
            const index = orderListeners.indexOf(listener);
            if (index !== -1) {
                orderListeners.splice(index, 1);
            }

            // Leave the room if no more listeners
            if (orderListeners.length === 0) {
                this.socketInstance.emit("leave-order-tracking", orderId);
                this.listeners.delete(orderId);
            }
        };
    }

    /**
     * Get the current tracking information for an order
     */
    static async getOrderTracking(orderId: string): Promise<OrderTrackingData> {
        try {
            const response = await axios.get(`${API_URL}/orders/${orderId}/tracking`, { headers: await getAuthHeader() });

            return response.data.data;
        } catch (error) {
            console.error("Error getting order tracking:", error);
            throw new Error("Failed to get order tracking information");
        }
    }

    /**
     * Get directions from current delivery location to destination
     */
    static async getOrderDirections(orderData: OrderTrackingData): Promise<{
        route: Coordinates[];
        distance: number;
        duration: number;
    }> {
        try {
            if (!orderData.tracking?.currentLocation?.coordinates || !orderData.shippingAddress?.location?.coordinates) {
                throw new Error("Missing location coordinates for route calculation");
            }

            const origin = {
                latitude: orderData.tracking.currentLocation.coordinates[1],
                longitude: orderData.tracking.currentLocation.coordinates[0],
            };

            const destination = {
                latitude: orderData.shippingAddress.location.coordinates[1],
                longitude: orderData.shippingAddress.location.coordinates[0],
            };

            const directionsResult = await LocationService.getDirections(origin, destination);

            if (directionsResult.routes && directionsResult.routes.length > 0) {
                const route = directionsResult.routes[0];

                // Get first leg distance and duration
                const distance = route.legs[0].distance.value;
                const duration = route.legs[0].duration.value;

                // Decode route polyline
                let decodedRoute: Coordinates[] = [];
                if (route.overview_polyline && route.overview_polyline.points) {
                    decodedRoute = LocationService.decodePolyline(route.overview_polyline.points);
                }

                return {
                    route: decodedRoute,
                    distance,
                    duration,
                };
            }

            throw new Error("No route found");
        } catch (error) {
            console.error("Error getting order directions:", error);
            throw new Error("Failed to get directions for order");
        }
    }

    /**
     * Format estimated time of arrival
     */
    static formatETA(seconds: number): string {
        const now = new Date();
        const etaDate = new Date(now.getTime() + seconds * 1000);

        // Format as "X:XX PM" or "Tomorrow at X:XX AM"
        const isToday = now.getDate() === etaDate.getDate() && now.getMonth() === etaDate.getMonth() && now.getFullYear() === etaDate.getFullYear();

        const hours = etaDate.getHours();
        const minutes = etaDate.getMinutes();
        const period = hours >= 12 ? "PM" : "AM";
        const formattedHours = hours % 12 === 0 ? 12 : hours % 12;
        const formattedMinutes = minutes < 10 ? `0${minutes}` : minutes;

        if (isToday) {
            return `${formattedHours}:${formattedMinutes} ${period}`;
        } else {
            return `Tomorrow at ${formattedHours}:${formattedMinutes} ${period}`;
        }
    }

    /**
     * Get human-readable status message based on tracking status
     */
    static getStatusMessage(status: TrackingStatus): string {
        switch (status) {
            case "preparing":
                return "Your order is being prepared";
            case "ready_for_pickup":
                return "Your order is ready for pickup";
            case "in_transit":
                return "Your order is on the way";
            case "delivered":
                return "Your order has been delivered";
            default:
                return "Tracking your order...";
        }
    }
}

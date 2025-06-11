import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { API_URL } from "../utils/config";

// Base URL for our API
const BASE_URL = API_URL;
console.log("API Base URL:", BASE_URL);

// Create an axios instance
const apiClient = axios.create({
    baseURL: BASE_URL,
    headers: {
        "Content-Type": "application/json",
    },
    timeout: 10000, // 10 second timeout
});

// Add a request interceptor to add the auth token to requests
apiClient.interceptors.request.use(
    async (config) => {
        try {
            const token = await AsyncStorage.getItem("token");
            if (token) {
                config.headers.Authorization = `Bearer ${token}`;
            }
        } catch (error) {
            console.error("Error getting token from AsyncStorage", error);
        }
        return config;
    },
    (error) => {
        console.error("Request interceptor error:", error);
        return Promise.reject(error);
    }
);

// Add a response interceptor to handle common errors
apiClient.interceptors.response.use(
    (response) => {
        return response;
    },
    async (error) => {
        const originalRequest = error.config;
        
        // Handle network errors
        if (!error.response) {
            console.error("Network error:", error.message);
            return Promise.reject({
                message: "Network error. Please check your internet connection.",
                status: 0,
                originalError: error
            });
        }

        // Handle authentication errors
        if (error.response.status === 401 && !originalRequest._retry) {
            console.warn("Authentication failed, removing token");
            try {
                await AsyncStorage.removeItem("token");
                resetAuthHeader();
            } catch (storageError) {
                console.error("Error removing token:", storageError);
            }
        }

        // Handle specific error cases
        const errorResponse = {
            message: error.response?.data?.error || error.response?.data?.message || error.message || "An error occurred",
            status: error.response?.status || 500,
            data: error.response?.data,
            originalError: error
        };

        console.error("API Error:", errorResponse);
        return Promise.reject(errorResponse);
    }
);

// Function to reset the authorization header (used on logout)
export const resetAuthHeader = () => {
    delete apiClient.defaults.headers.common["Authorization"];
};

export default apiClient;

import Constants from "expo-constants";

interface Config {
    apiUrl: string;
    environment: string;
    googleMapsApiKey: string;
}

// Define default fallback values
const defaultConfig: Config = {
    apiUrl: "http://localhost:5000/api/v1",
    environment: "development",
    googleMapsApiKey: "",
};

// Function to load environment variables from Expo Constants
const loadEnvVariables = (): Config => {
    const envConfig: Partial<Config> = {};

    // Get values from Expo Constants
    const expoConstants = Constants.expoConfig?.extra;

    if (Constants.expoConfig?.extra?.apiUrl || process.env.EXPO_PUBLIC_API_URL) {
        envConfig.apiUrl = Constants.expoConfig?.extra?.apiUrl || process.env.EXPO_PUBLIC_API_URL || "";
    }

    if (process.env.EXPO_PUBLIC_NODE_ENV) {
        envConfig.environment = process.env.EXPO_PUBLIC_NODE_ENV;
    }

    // Get Google Maps API key from Constants
    if (Constants.expoConfig?.extra?.googleMapsApiKey || process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY) {
        envConfig.googleMapsApiKey = Constants.expoConfig?.extra?.googleMapsApiKey || process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY || "";
    }

    // Return merged config with defaults
    return { ...defaultConfig, ...envConfig };
};

// Export the configuration
export const config = loadEnvVariables();

// Export individual config values for convenience
export const API_URL = config.apiUrl;
export const ENVIRONMENT = config.environment;
export const GOOGLE_MAPS_API_KEY = config.googleMapsApiKey;

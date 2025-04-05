import { API_URL as ENV_API_URL, NODE_ENV } from '@env';

interface Config {
  apiUrl: string;
  environment: string;
  googleMapsApiKey: string;
}

// Define default fallback values
const defaultConfig: Config = {
  apiUrl: 'http://localhost:5000/api/v1',
  environment: 'development',
  googleMapsApiKey: '',
};

// Function to load environment variables from .env through react-native-dotenv
const loadEnvVariables = (): Config => {
  const envConfig: Partial<Config> = {};
  
  // Use environment variables from .env file through @env
  if (ENV_API_URL) {
    envConfig.apiUrl = ENV_API_URL;
  }
  
  if (NODE_ENV) {
    envConfig.environment = NODE_ENV;
  }
  
  try {
    // Attempt to load GOOGLE_MAPS_API_KEY from process.env
    // This approach handles the case where it might not be available from @env directly
    const googleMapsApiKey = process.env.GOOGLE_MAPS_API_KEY;
    if (googleMapsApiKey) {
      envConfig.googleMapsApiKey = googleMapsApiKey;
    }
  } catch (error) {
    console.warn('Could not load Google Maps API key from environment variables');
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
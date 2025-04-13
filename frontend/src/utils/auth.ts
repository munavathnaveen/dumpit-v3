import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Retrieves the authentication token from AsyncStorage
 */
export const getAuthToken = async (): Promise<string | null> => {
  try {
    return await AsyncStorage.getItem('token');
  } catch (error) {
    console.error('Error retrieving auth token:', error);
    return null;
  }
};

/**
 * Creates authentication headers for API requests
 */
export const getAuthHeader = async (): Promise<Record<string, string>> => {
  const token = await getAuthToken();
  
  if (!token) {
    return {};
  }
  
  return {
    Authorization: `Bearer ${token}`,
  };
}; 
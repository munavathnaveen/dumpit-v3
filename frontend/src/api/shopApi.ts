import apiClient from './apiClient';

export interface Shop {
  _id: string;
  name: string;
  description: string;
  image: string;
  address: {
    village: string;
    street: string;
    district: string;
    state: string;
    pincode: string;
    phone: string;
  };
  location: {
    type: string;
    coordinates: number[];
  };
  isActive: boolean;
  isVerified: boolean;
  minimumOrderAmount: number;
  shippingFee: number;
  freeShippingThreshold: number;
  taxRate: number;
  reviews: {
    rating: number;
    text: string;
    user: {
      _id: string;
      name: string;
    };
    createdAt: string;
  }[];
  rating: number;
  isOpen: boolean;
  categories: string[];
  createdAt: string;
  updatedAt: string;
}

export type ShopSettings = {
  name: string;
  description: string;
  image?: string;
  address: {
    village: string;
    street: string;
    district: string;
    state: string;
    pincode: string;
    phone: string;
  };
  location?: {
    type: string;
    coordinates: number[];
  };
  isActive?: boolean;
  minimumOrderAmount?: number;
  shippingFee?: number;
  freeShippingThreshold?: number;
  taxRate?: number;
  categories?: string[];
  isOpen?: boolean;
  openingHours?: {
    days: string;
    hours: string;
  }[];
};

export type ShopsResponse = {
  success: boolean;
  count: number;
  data: Shop[];
};

export type SingleShopResponse = {
  success: boolean;
  data: Shop;
};

export const getShops = async (query: string = ''): Promise<ShopsResponse> => {
  const response = await apiClient.get(`/shops${query ? `?${query}` : ''}`);
  return response.data;
};

export const getShop = async (shopId: string): Promise<SingleShopResponse> => {
  const response = await apiClient.get(`/shops/${shopId}`);
  return response.data;
};

export const getShopsByDistance = async (
  longitude: number, 
  latitude: number, 
  distance: number = 10000
): Promise<ShopsResponse> => {
  const response = await apiClient.get(
    `/shops/radius/${longitude}/${latitude}/${distance}`
  );
  return response.data;
};

export const getNearbyShops = async (
  coords?: { latitude: number; longitude: number },
  distance: number = 10000
): Promise<ShopsResponse> => {
  let url = '/shops/nearby';
  
  // If coordinates are provided, add them as query parameters
  if (coords) {
    url += `?latitude=${coords.latitude}&longitude=${coords.longitude}&distance=${distance}`;
  }
  
  const response = await apiClient.get(url);
  return response.data;
};

export const getShopCategories = async (): Promise<{success: boolean, count: number, data: string[]}> => {
  const response = await apiClient.get('/shops/categories');
  return response.data;
};

export const searchShops = async (searchTerm: string): Promise<ShopsResponse> => {
  // Use proper search query parameter for the API
  const response = await apiClient.get(`/shops?search=${encodeURIComponent(searchTerm)}`);
  return response.data;
};

// Vendor-specific API functions

export const getVendorShop = async (userId: string): Promise<SingleShopResponse> => {
  const response = await apiClient.get(`/shops/${userId}`);
  return response.data;
};

export const createShop = async (shopData: ShopSettings): Promise<SingleShopResponse> => {
  const response = await apiClient.post('/shops', shopData);
  return response.data;
};

export const updateShop = async (shopId: string, shopData: Partial<ShopSettings>): Promise<SingleShopResponse> => {
  const response = await apiClient.put(`/shops/${shopId}`, shopData);
  return response.data;
};

export const getShopDetails = async (userId: string): Promise<SingleShopResponse> => {
  // This is an alias for getVendorShop to match the function name used in VendorShopSetupScreen
    return getVendorShop(userId);
};

export const uploadShopImage = async (shopId: string, imageUrl: string): Promise<{
  success: boolean;
  data: {
    image: string;
  };
}> => {
  const response = await apiClient.put(`/shops/${shopId}/image`, { image: imageUrl });
  return response.data;
};

// Review related functions
export interface ShopReview {
  rating: number;
  text: string;
}

export const addShopReview = async (shopId: string, reviewData: ShopReview): Promise<SingleShopResponse> => {
  const response = await apiClient.post(`/shops/${shopId}/reviews`, reviewData);
  return response.data;
}; 
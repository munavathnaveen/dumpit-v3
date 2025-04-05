import apiClient from './apiClient';

type Shop = {
  _id: string;
  name: string;
  description: string;
  logo: string;
  coverImage: string;
  owner: string;
  location: {
    type: string;
    coordinates: [number, number];
  };
  address: string;
  contactNumber: string;
  email: string;
  categories: string[];
  rating: number;
  reviewCount: number;
  isVerified: boolean;
  isOpen: boolean;
  openingHours: {
    days: string;
    hours: string;
  }[];
  createdAt: string;
  updatedAt: string;
};

type ShopsResponse = {
  success: boolean;
  count: number;
  data: Shop[];
};

type SingleShopResponse = {
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

export const getNearbyShops = async (): Promise<ShopsResponse> => {
  const response = await apiClient.get('/shops/nearby');
  return response.data;
};

export const searchShops = async (searchTerm: string): Promise<ShopsResponse> => {
  // Since there's no dedicated search endpoint, we'll use query parameters to filter
  const response = await apiClient.get(`/shops?name=${searchTerm}`);
  return response.data;
}; 
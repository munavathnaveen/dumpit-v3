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
  pagination?: {
    page: number;
    limit: number;
    total: number;
    pages: number;
    next?: {
      page: number;
      limit: number;
    };
    prev?: {
      page: number;
      limit: number;
    };
  };
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

// Enhanced client-side shop search that enables fuzzy/substring matching
export const enhancedSearchShops = async (searchTerm: string, page = 1, limit = 10): Promise<ShopsResponse> => {
  try {
    // Get a reasonable number of shops to search through
    const response = await apiClient.get('/shops?limit=100');
    const allShops = response.data;
    
    // If no search term, return all shops
    if (!searchTerm || searchTerm.trim() === '') {
      return allShops;
    }
    
    // Normalize search term for case-insensitive matching
    const normalizedSearchTerm = searchTerm.toLowerCase().trim();
    
    // Filter shops that match the search term in various fields
    const matchedShops = allShops.data.filter((shop: Shop) => {
      // Check for substring match in various shop fields
      return (
        // Check shop name
        (shop.name && shop.name.toLowerCase().includes(normalizedSearchTerm)) ||
        // Check shop description
        (shop.description && shop.description.toLowerCase().includes(normalizedSearchTerm)) ||
        // Check categories
        (shop.categories && Array.isArray(shop.categories) && 
          shop.categories.some(category => 
            category.toLowerCase().includes(normalizedSearchTerm)
          )) ||
        // Check address fields if available as an object
        (shop.address && typeof shop.address === 'object' && (
          (shop.address.village && shop.address.village.toLowerCase().includes(normalizedSearchTerm)) ||
          (shop.address.street && shop.address.street.toLowerCase().includes(normalizedSearchTerm)) ||
          (shop.address.district && shop.address.district.toLowerCase().includes(normalizedSearchTerm)) ||
          (shop.address.state && shop.address.state.toLowerCase().includes(normalizedSearchTerm)) ||
          (shop.address.pincode && shop.address.pincode.includes(normalizedSearchTerm))
        ))
      );
    });
    
    // Implement basic pagination
    const totalShops = matchedShops.length;
    const totalPages = Math.ceil(totalShops / limit);
    const startIndex = (page - 1) * limit;
    const endIndex = Math.min(startIndex + limit, totalShops);
    const paginatedShops = matchedShops.slice(startIndex, endIndex);
    
    // Create pagination object
    const pagination = {
      page,
      limit,
      total: totalShops,
      pages: totalPages
    };
    
    // Return in the same format as the API response
    return {
      ...allShops,
      data: paginatedShops,
      count: paginatedShops.length,
      pagination
    };
  } catch (error) {
    console.error("Enhanced shop search failed:", error);
    // Fallback to standard search if enhanced search fails
    return searchShops(searchTerm);
  }
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
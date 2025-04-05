import apiClient from './apiClient';

type Product = {
  _id: string;
  name: string;
  description: string;
  price: number;
  category: string;
  shop: string;
  vendor: string;
  stock: number;
  images: string[];
  rating: number;
  reviewCount: number;
  isAvailable: boolean;
  tags: string[];
  specs: Record<string, string>;
  createdAt: string;
  updatedAt: string;
};

type ProductsResponse = {
  success: boolean;
  count: number;
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
  data: Product[];
};

type SingleProductResponse = {
  success: boolean;
  data: Product;
};

export const getProducts = async (query: string = ''): Promise<ProductsResponse> => {
  const response = await apiClient.get(`/products${query ? `?${query}` : ''}`);
  return response.data;
};

export const getProduct = async (productId: string): Promise<SingleProductResponse> => {
  const response = await apiClient.get(`/products/${productId}`);
  return response.data;
};

export const getProductsByShop = async (shopId: string): Promise<ProductsResponse> => {
  const response = await apiClient.get(`/shops/${shopId}/products`);
  return response.data;
};

export const getProductsByCategory = async (category: string): Promise<ProductsResponse> => {
  const response = await apiClient.get(`/products?category=${category}`);
  return response.data;
};

export const searchProducts = async (searchTerm: string): Promise<ProductsResponse> => {
  const response = await apiClient.get(`/products/search/${searchTerm}`);
  return response.data;
}; 
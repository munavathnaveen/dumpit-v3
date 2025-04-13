import apiClient from './apiClient';
import { Product } from '../types/product';

export interface ProductFormData {
  name: string;
  description: string;
  price?: number;
  discountPrice?: number;
  type?: string;
  category: string;
  units?: string;
  stock?: number;
  stockQuantity?: number;
  discount?: number;  
  image?: string;
  tags?: string[];
  specs?: Record<string, string>;
  isAvailable?: boolean;
  isActive?: boolean;
}

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

export const getProductCategories = async (): Promise<{success: boolean, count: number, data: string[]}> => {
  const response = await apiClient.get('/products/categories');
  return response.data;
};

export const searchProducts = async (searchTerm: string): Promise<ProductsResponse> => {
  const response = await apiClient.get(`/products/search/${encodeURIComponent(searchTerm)}`);
  return response.data;
};

// Vendor-specific API functions

export const getVendorProducts = async (): Promise<Product[]> => {
  const response = await apiClient.get('/products/vendor');
  return response.data.data;
};

export const createProduct = async (productData: ProductFormData): Promise<SingleProductResponse> => {
    const response = await apiClient.post('/products', productData);
  return response.data;
};

export const updateProduct = async (productId: string, productData: Partial<ProductFormData>): Promise<SingleProductResponse> => {
  const response = await apiClient.put(`/products/${productId}`, productData);
  return response.data;
};

export const deleteProduct = async (productId: string): Promise<{ success: boolean }> => {
  const response = await apiClient.delete(`/products/${productId}`);
  return response.data;
};

export const uploadProductImage = async (productId: string, imageUrl: string): Promise<{
  success: boolean;
  data: {
    image: string;
  };
}> => {
  const response = await apiClient.put(`/products/${productId}/image`, { image: imageUrl });
  return response.data;
};

export const getProductTypes = async (): Promise<{success: boolean, count: number, data: string[]}> => {
  const response = await apiClient.get('/products/types');
  return response.data;
};

export const getShops = async (): Promise<{success: boolean, count: number, data: { _id: string, name: string }[]}> => {
  const response = await apiClient.get('/shops?select=name');
  return response.data;
};

// Review related functions
export interface ProductReview {
  rating: number;
  text: string;
}

export const addProductReview = async (productId: string, reviewData: ProductReview): Promise<SingleProductResponse> => {
  const response = await apiClient.post(`/products/${productId}/reviews`, reviewData);
  return response.data;
}; 
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

export interface ProductFormData {
  name: string;
  description: string;
  price: number;
  discountPrice?: number;
  category: string;
  stock?: number;
  stockQuantity?: number;
  images: string[];
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
  const response = await apiClient.get(`/api/v1/products${query ? `?${query}` : ''}`);
  return response.data;
};

export const getProduct = async (productId: string): Promise<SingleProductResponse> => {
  const response = await apiClient.get(`/api/v1/products/${productId}`);
  return response.data;
};

export const getProductsByShop = async (shopId: string): Promise<ProductsResponse> => {
  const response = await apiClient.get(`/api/v1/shops/${shopId}/products`);
  return response.data;
};

export const getProductsByCategory = async (category: string): Promise<ProductsResponse> => {
  const response = await apiClient.get(`/api/v1/products?category=${category}`);
  return response.data;
};

export const searchProducts = async (searchTerm: string): Promise<ProductsResponse> => {
  const response = await apiClient.get(`/api/v1/products/search/${searchTerm}`);
  return response.data;
};

// Vendor-specific API functions

export const getVendorProducts = async (): Promise<Product[]> => {
  const response = await apiClient.get('/api/v1/products/vendor');
  return response.data.data;
};

export const createProduct = async (productData: ProductFormData): Promise<SingleProductResponse> => {
  const response = await apiClient.post('/api/v1/products', productData);
  return response.data;
};

export const updateProduct = async (productId: string, productData: Partial<ProductFormData>): Promise<SingleProductResponse> => {
  const response = await apiClient.put(`/api/v1/products/${productId}`, productData);
  return response.data;
};

export const deleteProduct = async (productId: string): Promise<{ success: boolean }> => {
  const response = await apiClient.delete(`/api/v1/products/${productId}`);
  return response.data;
};

export const uploadProductImage = async (file: File): Promise<{ success: boolean, data: string }> => {
  const formData = new FormData();
  formData.append('file', file);
  
  const response = await apiClient.post('/api/v1/products/upload', formData, {
    headers: {
      'Content-Type': 'multipart/form-data'
    }
  });
  
  return response.data;
}; 
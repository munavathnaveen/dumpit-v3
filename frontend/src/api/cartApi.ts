import apiClient from './apiClient';

type CartItem = {
  _id: string;
  product: {
    _id: string;
    name: string;
    price: number;
    images: string[];
    description: string;
  };
  quantity: number;
};

type CartResponse = {
  success: boolean;
  data: CartItem[];
};

type CartItemResponse = {
  success: boolean;
  data: CartItem;
};

export const getCart = async (): Promise<CartResponse> => {
  const response = await apiClient.get('/cart');
  return response.data;
};

export const addToCart = async ({productId, quantity}: {productId: string, quantity: number}): Promise<CartItemResponse> => {
  const response = await apiClient.post(`/cart/${productId}`, { product: productId, quantity });
  return response.data;
};

export const updateCartItem = async (itemId: string, quantity: number): Promise<CartItemResponse> => {
  const response = await apiClient.put(`/cart/${itemId}`, { quantity });
  return response.data;
};

export const removeFromCart = async (itemId: string): Promise<{ success: boolean; data: {} }> => {
  const response = await apiClient.delete(`/cart/${itemId}`);
  return response.data;
};

export const clearCart = async (): Promise<{ success: boolean; data: {} }> => {
  const response = await apiClient.delete('/cart');
  return response.data;
}; 
import apiClient from './apiClient';
import { CartItem } from '../store/cartSlice';

export const getCart = async (): Promise<{ data: CartItem[] }> => {
  const response = await apiClient.get('/cart');
  return response.data;
};

export const addToCart = async ({ productId, quantity }: { productId: string; quantity: number }): Promise<{ data: CartItem }> => {
  const response = await apiClient.post(`/cart/${productId}`, { quantity });
  return response.data;
};

export const updateCartItem = async (itemId: string, quantity: number): Promise<{ data: CartItem }> => {
  const response = await apiClient.put(`/cart/${itemId}`, { quantity });
  return response.data;
};

export const removeFromCart = async (itemId: string): Promise<void> => {
  await apiClient.delete(`/cart/${itemId}`);
};

export const clearCart = async (): Promise<void> => {
  await apiClient.delete('/cart');
}; 
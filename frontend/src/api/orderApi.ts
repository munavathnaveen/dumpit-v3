import apiClient from './apiClient';

type OrderStatus = 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled';

type OrderItem = {
  product: {
    _id: string;
    name: string;
  };
  quantity: number;
  price: number;
};

type Order = {
  _id: string;
  orderNumber: string;
  user: string;
  items: OrderItem[];
  shippingAddress: {
    _id: string;
    name: string;
    village: string;
    street: string;
    district: string;
    state: string;
    pincode: string;
    phone: string;
  };
  paymentMethod: string;
  paymentStatus: 'pending' | 'paid' | 'failed';
  status: OrderStatus;
  totalAmount: number;
  createdAt: string;
  updatedAt: string;
};

type OrderResponse = {
  success: boolean;
  data: Order[];
};

type SingleOrderResponse = {
  success: boolean;
  data: Order;
};

export const getOrders = async (): Promise<OrderResponse> => {
  const response = await apiClient.get('/orders');
  return response.data;
};

export const getOrder = async (orderId: string): Promise<SingleOrderResponse> => {
  const response = await apiClient.get(`/orders/${orderId}`);
  return response.data;
};

export const createOrder = async (orderData: {
  shippingAddress: string;
  paymentMethod: string;
}): Promise<SingleOrderResponse> => {
  const response = await apiClient.post('/orders', orderData);
  return response.data;
};

export const cancelOrder = async (orderId: string): Promise<SingleOrderResponse> => {
  const response = await apiClient.put(`/orders/${orderId}/cancel`);
  return response.data;
}; 
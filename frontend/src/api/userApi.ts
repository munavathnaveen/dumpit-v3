import apiClient from './apiClient';
import { User } from './types';

// Address types
export interface Address {
  _id: string;
  user: string;
  name: string;
  village: string;
  street: string;
  district: string;
  state: string;
  pincode: string;
  phone: string;
  isDefault: boolean;
  location?: {
    type: string;
    coordinates: number[];
  };
}

export interface AddressRequest {
  name: string;
  village: string;
  street: string;
  district: string;
  state: string;
  pincode: string;
  phone: string;
  isDefault?: boolean;
  location?: {
    type: string;
    coordinates: number[];
  };
}

// User notifications
export const getUserNotifications = async (userId: string): Promise<{
  success: boolean;
  count: number;
  data: Array<{
    _id: string;
    message: string;
    read: boolean;
    createdAt: string;
  }>;
}> => {
  const response = await apiClient.get(`/users/${userId}/notifications`);
  return response.data;
};

export const markNotificationAsRead = async (userId: string, notificationId: string): Promise<{
  success: boolean;
  data: {
    _id: string;
    message: string;
    read: boolean;
    createdAt: string;
  };
}> => {
  const response = await apiClient.put(`/users/${userId}/notifications/${notificationId}`);
  return response.data;
};

export const updateNotificationSettings = async (
  userId: string,
  settings: {
    email?: boolean;
    push?: boolean;
  }
): Promise<{
  success: boolean;
  data: {
    email: boolean;
    push: boolean;
  };
}> => {
  const response = await apiClient.put(`/users/${userId}/notification-settings`, settings);
  return response.data;
};

// User addresses
export const getUserAddresses = async (): Promise<{
  success: boolean;
  count: number;
  data: Address[];
}> => {
  const response = await apiClient.get('/addresses');
  return response.data;
};

export const createAddress = async (addressData: AddressRequest): Promise<{
  success: boolean;
  data: Address;
}> => {
  const response = await apiClient.post('/addresses', addressData);
  return response.data;
};

export const updateAddress = async (
  addressId: string,
  addressData: AddressRequest
): Promise<{
  success: boolean;
  data: Address;
}> => {
  const response = await apiClient.put(`/addresses/${addressId}`, addressData);
  return response.data;
};

export const deleteAddress = async (addressId: string): Promise<{
  success: boolean;
  data: {};
}> => {
  const response = await apiClient.delete(`/addresses/${addressId}`);
  return response.data;
};

// Avatar upload
export const uploadAvatar = async (userId: string, file: File): Promise<{
  success: boolean;
  data: {
    url: string;
  };
}> => {
  const formData = new FormData();
  formData.append('avatar', file);

  const response = await apiClient.put(`/users/${userId}/avatar`, formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  return response.data;
}; 
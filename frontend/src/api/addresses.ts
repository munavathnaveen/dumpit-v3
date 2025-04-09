import apiClient from './apiClient';

// Address interface
export interface Address {
  _id: string;
  name: string;
  type: string;
  street: string;
  city: string;
  state: string;
  country: string;
  pincode: string;
  phone: string;
  isDefault?: boolean;
}

// Get all addresses for the authenticated user
export const getAddresses = async (): Promise<{ success: boolean; data: Address[]; count: number }> => {
  try {
    const response = await apiClient.get('/addresses');
    return response.data;
  } catch (error: any) {
    throw error.response?.data || { message: 'Failed to fetch addresses' };
  }
};

// Add a new address for the authenticated user
export const addAddress = async (addressData: Omit<Address, '_id'>): Promise<{ success: boolean; data: Address }> => {
  try {
    const response = await apiClient.post('/addresses', addressData);
    return response.data;
  } catch (error: any) {
    throw error.response?.data || { message: 'Failed to add address' };
  }
};

// Update an existing address
export const updateAddress = async (id: string, addressData: Partial<Omit<Address, '_id'>>): Promise<{ success: boolean; data: Address }> => {
  try {
    const response = await apiClient.put(`/addresses/${id}`, addressData);
    return response.data;
  } catch (error: any) {
    throw error.response?.data || { message: 'Failed to update address' };
  }
};

// Delete an address
export const deleteAddress = async (id: string): Promise<{ success: boolean; data: null }> => {
  try {
    const response = await apiClient.delete(`/addresses/${id}`);
    return response.data;
  } catch (error: any) {
    throw error.response?.data || { message: 'Failed to delete address' };
  }
};

// Set address as default
export const setDefaultAddress = async (id: string): Promise<{ success: boolean; data: Address }> => {
  try {
    const response = await apiClient.patch(`/addresses/${id}/default`);
    return response.data;
  } catch (error: any) {
    throw error.response?.data || { message: 'Failed to set default address' };
  }
}; 
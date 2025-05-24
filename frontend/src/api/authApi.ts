import apiClient from './apiClient';
import {
  AuthResponse,
  LoginRequest,
  RegisterRequest,
  ForgotPasswordRequest,
  ResetPasswordRequest,
  UpdateDetailsRequest,
  UpdatePasswordRequest,
  User,
} from './types';

// Register a new user
export const register = async (userData: RegisterRequest): Promise<AuthResponse> => {
  const response = await apiClient.post<AuthResponse>('/auth/register', userData);
  return response.data;
};

// Login user
export const login = async (userData: LoginRequest): Promise<AuthResponse> => {
  const response = await apiClient.post<AuthResponse>('/auth/login', userData);
  console.log("Login ",response);
  return response.data;
};

// Logout user
export const logout = async (): Promise<{ success: boolean }> => {
  const response = await apiClient.get<{ success: boolean, data: {} }>('/auth/logout');
  return response.data;
};

// Get current user
export const getCurrentUser = async (): Promise<{ success: boolean; data: User }> => {
  const response = await apiClient.get<{ success: boolean; data: User }>('/auth/me');
  return response.data;
};

// Forgot password
export const forgotPassword = async (email: ForgotPasswordRequest): Promise<{ success: boolean; data: string }> => {
  const response = await apiClient.post<{ success: boolean; data: string }>('/auth/forgotpassword', email);
  return response.data;
};

// Reset password
export const resetPassword = async (
  resetData: { token: string, password: string }
): Promise<AuthResponse> => {
  const { token, password } = resetData;
  const response = await apiClient.put<AuthResponse>(`/auth/resetpassword/${token}`, { password });
  return response.data;
};

// Update user details
export const updateDetails = async (userData: UpdateDetailsRequest): Promise<{ success: boolean; data: User }> => {
  const response = await apiClient.put<{ success: boolean; data: User }>('/auth/updatedetails', userData);
  return response.data;
};

// Update password
export const updatePassword = async (passwordData: UpdatePasswordRequest): Promise<AuthResponse> => {
  const response = await apiClient.put<AuthResponse>('/auth/updatepassword', passwordData);
  return response.data;
}; 
// Auth types
export interface User {
  _id: string;
  name: string;
  email: string;
  phone: string;
  role: string;
  avatar_url?: string;
  location?: {
    type: string;
    coordinates: number[];
  };
  currentLocation?: {
    type: string;
    coordinates: number[];
  };
  addresses?: string[];
  cart?: Array<{
    product: string;
    quantity: number;
  }>;
  notifications?: Array<{
    message: string;
    read: boolean;
    createdAt: string;
  }>;
  notificationSettings?: {
    email: boolean;
    push: boolean;
  };
  createdAt: string;
}

export interface AuthResponse {
  success: boolean;
  token: string;
}

export interface LoginRequest {
  email: string;
  password: string;
  role?: string;
}

export interface RegisterRequest {
  name: string;
  email: string;
  password: string;
  phone: string;
  role?: string;
}

export interface ForgotPasswordRequest {
  email: string;
}

export interface ResetPasswordRequest {
  password: string;
}

export interface UpdateDetailsRequest {
  name: string;
  phone: string;
}

export interface UpdatePasswordRequest {
  currentPassword: string;
  newPassword: string;
}

// Error response type
export interface ApiError {
  success: boolean;
  error: string;
} 
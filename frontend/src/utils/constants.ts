// API URL - Using the environment variable for base URL
export const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:5000/api/v1';

// User roles
export const USER_ROLES = {
  CUSTOMER: 'customer',
  VENDOR: 'vendor',
  ADMIN: 'admin',
};

// For backward compatibility with existing code
export const constants = {
  userRoles: USER_ROLES
};

// Order status
export const ORDER_STATUS = {
  PENDING: 'pending',
  PROCESSING: 'processing',
  SHIPPED: 'shipped',
  DELIVERED: 'delivered',
  CANCELLED: 'cancelled',
};

// Payment status
export const PAYMENT_STATUS = {
  PENDING: 'pending',
  COMPLETED: 'completed',
  FAILED: 'failed',
  REFUNDED: 'refunded',
};

// Payment methods
export const PAYMENT_METHODS = {
  RAZORPAY: 'razorpay',
  COD: 'cod',
};

// Address types
export const ADDRESS_TYPES = [
  'Home',
  'Work',
  'Other',
];

// Theme colors
export const COLORS = {
  PRIMARY: '#6200EE',
  PRIMARY_DARK: '#3700B3',
  SECONDARY: '#03DAC6',
  BACKGROUND: '#F5F5F5',
  SURFACE: '#FFFFFF',
  ERROR: '#B00020',
  TEXT_PRIMARY: '#333333',
  TEXT_SECONDARY: '#666666',
  TEXT_HINT: '#999999',
};

// Animation durations
export const ANIMATION = {
  DURATION_SHORT: 200,
  DURATION_MEDIUM: 300,
  DURATION_LONG: 500,
}; 
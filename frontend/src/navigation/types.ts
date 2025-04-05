import { RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { MutableRefObject } from 'react';
import { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import { NativeStackScreenProps } from '@react-navigation/native-stack';

// Auth stack params
export type AuthStackParamList = {
  Login: undefined;
  Register: undefined;
  ForgotPassword: undefined;
  ResetPassword: { token: string };
};

// Main stack params  
export type MainStackParamList = {
  Home: undefined;
  Login: undefined;
  Register: undefined;
  Profile: undefined;
  Notifications: undefined;
  Products: { searchQuery?: string, category?: string };
  ProductDetails: { productId: string };
  ShopDetails: { shopId: string };
  Cart: undefined;
  Checkout: undefined;
  Orders: undefined;
  OrderDetails: { orderId: string };
  Settings: undefined;
  ChangePassword: undefined;
  EditProfile: undefined;
  Shops: { searchQuery?: string };
  AddEditShop: { shopId?: string };
  BottomTabs: undefined;
  VendorBottomTabs: undefined;
  VendorDashboard: undefined;
  VendorProducts: undefined;
  VendorOrders: undefined;
  VendorProduct: { productId?: string };
  VendorEditProduct: { productId: string };
  VendorOrderDetails: { orderId: string };
  VendorShops: undefined;
  VendorCustomers: undefined;
  VendorImportExport: undefined;
  VendorShopSetup: undefined;
  // Add other main stack screens
};

// Tab navigator params
export type BottomTabParamList = {
  HomeTab: undefined;
  ProductsTab: undefined;
  ShopsTab: undefined;
  OrdersTab: undefined;
  CartTab: undefined;
  // Vendor tabs
  VendorDashboardTab: undefined;
  VendorProductsTab: undefined;
  VendorOrdersTab: undefined;
  VendorAnalyticsTab: undefined;
};

// Root navigator params
export type RootStackParamList = {
  Auth: undefined;
  Main: undefined;
  Loading: undefined;
};

// Navigation types for screens
export type MainStackNavigationProp<T extends keyof MainStackParamList> = StackNavigationProp<MainStackParamList, T>;
export type MainStackRouteProp<T extends keyof MainStackParamList> = RouteProp<MainStackParamList, T>; 
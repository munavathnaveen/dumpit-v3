import { RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';

// Auth stack params
export type AuthStackParamList = {
  Login: undefined;
  Register: undefined;
  ForgotPassword: undefined;
};

// Main stack params  
export type MainStackParamList = {
  TabNavigator: undefined;
  Home: undefined;
  Profile: undefined;
  Notifications: undefined;
  Products: { searchQuery?: string };
  Shops: { searchQuery?: string };
  ProductDetails: { productId: string };
  ShopDetails: { shopId: string };
  OrderDetails: { orderId: string };
};

// Tab navigator params
export type BottomTabParamList = {
  HomeTab: undefined;
  ProductsTab: undefined;
  ShopsTab: undefined;
  OrdersTab: undefined;
  CartTab: undefined;
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
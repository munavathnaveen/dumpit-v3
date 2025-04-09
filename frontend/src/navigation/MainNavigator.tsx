import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useSelector } from 'react-redux';

import TabNavigator from './TabNavigator';
import ProfileScreen from '../screens/ProfileScreen';
import ProductDetailsScreen from '../screens/ProductDetailsScreen';
import ShopDetailsScreen from '../screens/ShopDetailsScreen';
import OrderDetailsScreen from '../screens/OrderDetailsScreen';
import CheckoutScreen from '../screens/CheckoutScreen';
import NotificationsScreen from '../screens/NotificationsScreen';
import { MainStackParamList } from './types';
import { RootState } from '../store';
import { USER_ROLES } from '../utils/constants';

// Vendor screens
import VendorAddProductScreen from '../screens/vendor/VendorAddProductScreen';
import VendorDashboardScreen from '../screens/vendor/VendorDashboardScreen';
import VendorProductsScreen from '../screens/vendor/VendorProductsScreen';
import VendorOrdersScreen from '../screens/vendor/VendorOrdersScreen';
import VendorOrderDetailsScreen from '../screens/vendor/VendorOrderDetailsScreen';
import VendorEditProductScreen from '../screens/vendor/VendorEditProductScreen';
import VendorPaymentsScreen from '../screens/vendor/VendorPaymentsScreen';
import VendorShopSetupScreen from '../screens/vendor/VendorShopSetupScreen';
import VendorAnalyticsScreen from '../screens/vendor/VendorAnalyticsScreen';
import VendorImportExportScreen from '../screens/vendor/VendorImportExportScreen';

const Stack = createNativeStackNavigator<MainStackParamList>();

const MainNavigator: React.FC = () => {
  const { user } = useSelector((state: RootState) => state.auth);
  const isVendor = user?.role === USER_ROLES.VENDOR;

  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen name="TabNavigator" component={TabNavigator} />
      <Stack.Screen name="Profile" component={ProfileScreen} />
      <Stack.Screen name="Notifications" component={NotificationsScreen} />
      
      {/* Customer-specific screens */}
      {!isVendor && (
        <>
          <Stack.Screen name="ProductDetails" component={ProductDetailsScreen} />
          <Stack.Screen name="ShopDetails" component={ShopDetailsScreen} />
          <Stack.Screen name="OrderDetails" component={OrderDetailsScreen} />
          <Stack.Screen name="CheckoutScreen" component={CheckoutScreen} />
        </>
      )}

      {/* Vendor-specific screens */}
      {isVendor && (
        <>
          <Stack.Screen name="VendorDashboard" component={VendorDashboardScreen} />
          <Stack.Screen name="VendorProducts" component={VendorProductsScreen} />
          <Stack.Screen name="VendorAddProduct" component={VendorAddProductScreen} />
          <Stack.Screen name="VendorEditProduct" component={VendorEditProductScreen} />
          <Stack.Screen name="VendorOrders" component={VendorOrdersScreen} />
          <Stack.Screen name="VendorOrderDetails" component={VendorOrderDetailsScreen} />
          <Stack.Screen name="VendorPayments" component={VendorPaymentsScreen} />
          <Stack.Screen name="VendorShopSetup" component={VendorShopSetupScreen} />
          <Stack.Screen name="VendorImportExport" component={VendorImportExportScreen} />
          <Stack.Screen name="VendorAnalytics" component={VendorAnalyticsScreen} />
        </>
      )}
    </Stack.Navigator>
  );
};

export default MainNavigator; 
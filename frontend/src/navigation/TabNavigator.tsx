import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useSelector } from 'react-redux';
import { Ionicons } from '@expo/vector-icons';
import { RouteProp } from '@react-navigation/native';

import HomeScreen from '../screens/HomeScreen';
import ProductsScreen from '../screens/ProductsScreen';
import ShopsScreen from '../screens/ShopsScreen';
import OrdersScreen from '../screens/OrdersScreen';
import CartScreen from '../screens/CartScreen';
import ProfileScreen from '../screens/ProfileScreen';
// Import vendor screens using require to bypass TypeScript errors
const VendorDashboardScreen = require('../screens/vendor/VendorDashboardScreen').default;
const VendorProductsScreen = require('../screens/vendor/VendorProductsScreen').default;
const VendorOrdersScreen = require('../screens/vendor/VendorOrdersScreen').default;
const VendorPaymentsScreen = require('../screens/vendor/VendorPaymentsScreen').default;

import { BottomTabParamList } from './types';
import { theme } from '../theme';
import { RootState } from '../store';
import { USER_ROLES } from '../utils/constants';

type TabBarIconProps = {
  focused: boolean;
  color: string;
  size: number;
};

const Tab = createBottomTabNavigator<BottomTabParamList>();

const TabNavigator: React.FC = () => {
  const { user } = useSelector((state: RootState) => state.auth);
  const isVendor = user?.role === USER_ROLES.VENDOR;

  // Force refresh when user role changes
  const [key, setKey] = React.useState(Date.now());
  
  React.useEffect(() => {
    // When user or role changes, update key to force re-render
    setKey(Date.now());
  }, [user?.role]);

  return (
    <Tab.Navigator
      key={key}
      screenOptions={({ route }: { route: RouteProp<BottomTabParamList, keyof BottomTabParamList> }) => ({
        tabBarIcon: ({ focused, color, size }: TabBarIconProps) => {
          let iconName: any = 'help-circle-outline';

          if (route.name === 'HomeTab') {
            iconName = focused ? 'home' : 'home-outline';
          } else if (route.name === 'ProductsTab') {
            iconName = focused ? 'grid' : 'grid-outline';
          } else if (route.name === 'ShopsTab') {
            iconName = focused ? 'storefront' : 'storefront-outline';
          } else if (route.name === 'OrdersTab') {
            iconName = focused ? 'list' : 'list-outline';
          } else if (route.name === 'CartTab') {
            iconName = focused ? 'cart' : 'cart-outline';
          } else if (route.name === 'ProfileTab') {
            iconName = focused ? 'person' : 'person-outline';
          } else if (route.name === 'VendorDashboardTab') {
            iconName = focused ? 'bar-chart' : 'bar-chart-outline';
          } else if (route.name === 'VendorProductsTab') {
            iconName = focused ? 'cube' : 'cube-outline';
          } else if (route.name === 'VendorOrdersTab') {
            iconName = focused ? 'receipt' : 'receipt-outline';
          } else if (route.name === 'VendorPaymentsTab') {
            iconName = focused ? 'wallet' : 'wallet-outline';
          }

          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: theme.colors.primary,
        tabBarInactiveTintColor: theme.colors.gray,
        tabBarStyle: styles.tabBar,
        tabBarLabelStyle: styles.tabBarLabel,
        tabBarBackground: () => (
          <View style={styles.tabBarBackground} />
        ),
        headerShown: false,
        tabBarHideOnKeyboard: true,
        tabBarItemStyle: { paddingVertical: 4 },
        tabBarIconStyle: { marginTop: 4 },
        tabBarLabelPosition: 'below-icon',
      })}
      safeAreaInsets={{ bottom: 10 }}
    >
      {isVendor ? (
        // Vendor Tabs
        <>
          <Tab.Screen
            name="VendorDashboardTab"
            component={VendorDashboardScreen}
            options={{
              title: 'Dashboard',
            }}
          />
          <Tab.Screen
            name="VendorProductsTab"
            component={VendorProductsScreen}
            options={{
              title: 'Products',
            }}
          />
          <Tab.Screen
            name="VendorOrdersTab"
            component={VendorOrdersScreen}
            options={{
              title: 'Orders',
            }}
          />
          <Tab.Screen
            name="VendorPaymentsTab"
            component={VendorPaymentsScreen}
            options={{
              title: 'Payments',
            }}
          />
        </>
      ) : (
        // Customer Tabs
        <>
          <Tab.Screen
            name="HomeTab"
            component={HomeScreen}
            options={{
              title: 'Home',
            }}
          />
          <Tab.Screen
            name="ProductsTab"
            component={ProductsScreen}
            options={{
              title: 'Products',
            }}
          />
          <Tab.Screen
            name="ShopsTab"
            component={ShopsScreen}
            options={{
              title: 'Shops',
            }}
          />
          <Tab.Screen
            name="OrdersTab"
            component={OrdersScreen}
            options={{
              title: 'Orders',
            }}
          />
          <Tab.Screen
            name="CartTab"
            component={CartScreen}
            options={{
              title: 'Cart',
            }}
          />
          <Tab.Screen
            name="ProfileTab"
            component={ProfileScreen}
            options={{
              title: 'Profile',
            }}
          />
        </>
      )}
    </Tab.Navigator>
  );
};

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: 'transparent',
    borderTopColor: 'transparent',
    height: 64,
    paddingBottom: 8,
    paddingTop: 6,
    marginBottom: 12,
    marginHorizontal: 20,
    borderRadius: 30,
    position: 'absolute',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 5,
    },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 12,
    bottom: 15,
  },
  tabBarLabel: {
    fontSize: 12,
    fontWeight: '500',
    marginBottom: 5,
  },
  tabBarBackground: {
    flex: 1,
    backgroundColor: theme.colors.white,
    borderRadius: 30,
    overflow: 'hidden',
  },
  screenContainer: {
    flex: 1,
    paddingBottom: 100,
  },
});

export default TabNavigator; 
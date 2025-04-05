import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { FontAwesome } from '@expo/vector-icons';
import { useSelector } from 'react-redux';

import { BottomTabParamList } from './types';
import HomeScreen from '../screens/HomeScreen';
import ProductsScreen from '../screens/ProductsScreen';
import ShopsScreen from '../screens/ShopsScreen';
import OrdersScreen from '../screens/OrdersScreen';
import CartScreen from '../screens/CartScreen';
import { theme } from '../theme';
import { RootState } from '../store';

const Tab = createBottomTabNavigator<BottomTabParamList>();

// Define interface for tab bar icon props
interface TabBarIconProps {
  color: string;
  size: number;
}

const TabNavigator: React.FC = () => {
  const cartItems = useSelector((state: RootState) => state.cart.totalItems);

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: true,
        tabBarActiveTintColor: theme.colors.primary,
        tabBarInactiveTintColor: theme.colors.textLight,
        tabBarStyle: styles.tabBar,
        tabBarLabelStyle: styles.tabBarLabel,
      }}
    >
      <Tab.Screen
        name="HomeTab"
        component={HomeScreen}
        options={{
          tabBarLabel: 'Home',
          tabBarIcon: ({ color, size }: TabBarIconProps) => (
            <FontAwesome name="home" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="ProductsTab"
        component={ProductsScreen}
        options={{
          tabBarLabel: 'Products',
          tabBarIcon: ({ color, size }: TabBarIconProps) => (
            <FontAwesome name="shopping-bag" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="ShopsTab"
        component={ShopsScreen}
        options={{
          tabBarLabel: 'Shops',
          tabBarIcon: ({ color, size }: TabBarIconProps) => (
            <FontAwesome name="building" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="OrdersTab"
        component={OrdersScreen}
        options={{
          tabBarLabel: 'Orders',
          tabBarIcon: ({ color, size }: TabBarIconProps) => (
            <FontAwesome name="list-alt" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="CartTab"
        component={CartScreen}
        options={{
          tabBarLabel: 'Cart',
          tabBarIcon: ({ color, size }: TabBarIconProps) => (
            <View style={styles.cartIconContainer}>
              <FontAwesome name="shopping-cart" size={size} color={color} />
              {cartItems > 0 && (
                <View style={styles.cartBadge}>
                  <Text style={styles.cartBadgeText}>
                    {cartItems > 99 ? '99+' : cartItems}
                  </Text>
                </View>
              )}
            </View>
          ),
        }}
      />
    </Tab.Navigator>
  );
};

const styles = StyleSheet.create({
  tabBar: {
    height: 60,
    paddingBottom: 5,
    paddingTop: 5,
    borderTopWidth: 1,
    borderTopColor: theme.colors.lightGray,
    backgroundColor: theme.colors.white,
    elevation: 8,
    shadowColor: theme.colors.dark,
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  tabBarLabel: {
    fontSize: 12,
    fontWeight: '500',
  },
  cartIconContainer: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cartBadge: {
    position: 'absolute',
    right: -8,
    top: -5,
    backgroundColor: theme.colors.error,
    borderRadius: 10,
    minWidth: 16,
    height: 16,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  cartBadgeText: {
    color: theme.colors.white,
    fontSize: 10,
    fontWeight: 'bold',
  },
});

export default TabNavigator; 
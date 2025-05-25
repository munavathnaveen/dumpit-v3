import React from "react";
import { View, StyleSheet } from "react-native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { useSelector } from "react-redux";
import { Ionicons } from "@expo/vector-icons";
import { RouteProp } from "@react-navigation/native";

import HomeScreen from "../screens/HomeScreen";
import ProductsScreen from "../screens/ProductsScreen";
import ShopsScreen from "../screens/ShopsScreen";
import OrdersScreen from "../screens/OrdersScreen";
import CartScreen from "../screens/CartScreen";
import ProfileScreen from "../screens/ProfileScreen";

// Vendor Screens (using require to avoid TypeScript errors with default export)
const VendorDashboardScreen = require("../screens/vendor/VendorDashboardScreen").default;
const VendorProductsScreen = require("../screens/vendor/VendorProductsScreen").default;
const VendorOrdersScreen = require("../screens/vendor/VendorOrdersScreen").default;
const VendorPaymentsScreen = require("../screens/vendor/VendorPaymentsScreen").default;

import { BottomTabParamList } from "./types";
import { theme } from "../theme";
import { RootState } from "../store";
import { USER_ROLES } from "../utils/constants";

const Tab = createBottomTabNavigator<BottomTabParamList>();

const TabNavigator: React.FC = () => {
    const { user } = useSelector((state: RootState) => state.auth);
    const isVendor = user?.role === USER_ROLES.VENDOR;

    const [key, setKey] = React.useState(Date.now());

    React.useEffect(() => {
        if (user) {
            setKey(Date.now());
        }
    }, [user, user?.role]);

    const getIconName = (routeName: keyof BottomTabParamList, focused: boolean): keyof typeof Ionicons.glyphMap => {
        const iconMap: Record<keyof BottomTabParamList, [string, string]> = {
            HomeTab: ["home-outline", "home"],
            ProductsTab: ["grid-outline", "grid"],
            ShopsTab: ["storefront-outline", "storefront"],
            OrdersTab: ["list-outline", "list"],
            CartTab: ["cart-outline", "cart"],
            ProfileTab: ["person-outline", "person"],
            VendorDashboardTab: ["bar-chart-outline", "bar-chart"],
            VendorProductsTab: ["cube-outline", "cube"],
            VendorOrdersTab: ["receipt-outline", "receipt"],
            VendorPaymentsTab: ["wallet-outline", "wallet"],
        };

        const [outline, filled] = iconMap[routeName] || ["help-circle-outline", "help-circle"];
        return (focused ? filled : outline) as keyof typeof Ionicons.glyphMap;
    };

    return (
        <Tab.Navigator
            key={key}
            screenOptions={({ route }: { route: RouteProp<BottomTabParamList, keyof BottomTabParamList> }) => ({
                tabBarIcon: ({ focused, color }: { focused: boolean; color: string }) => (
                    <Ionicons
                        name={getIconName(route.name, focused)}
                        size={20} // Smaller icon size
                        color={color}
                        style={styles.icon}
                    />
                ),
                tabBarActiveTintColor: theme.colors.primary,
                tabBarInactiveTintColor: theme.colors.gray,
                tabBarStyle: styles.tabBar,
                tabBarLabelStyle: styles.tabBarLabel,
                tabBarBackground: () => <View style={styles.tabBarBackground} />,
                headerShown: false,
                tabBarHideOnKeyboard: true,
                tabBarItemStyle: styles.tabBarItem,
                tabBarIconStyle: styles.tabBarIcon,
                tabBarLabelPosition: "below-icon",
            })}
            safeAreaInsets={{ bottom: 10 }}
        >
            {isVendor ? (
                <>
                    <Tab.Screen name="VendorDashboardTab" component={VendorDashboardScreen} options={{ title: "Dashboard" }} />
                    <Tab.Screen name="VendorProductsTab" component={VendorProductsScreen} options={{ title: "Products" }} />
                    <Tab.Screen name="VendorOrdersTab" component={VendorOrdersScreen} options={{ title: "Orders" }} />
                    <Tab.Screen name="VendorPaymentsTab" component={VendorPaymentsScreen} options={{ title: "Payments" }} />
                </>
            ) : (
                <>
                    <Tab.Screen name="HomeTab" component={HomeScreen} options={{ title: "Home" }} />
                    <Tab.Screen name="ProductsTab" component={ProductsScreen} options={{ title: "Products" }} />
                    <Tab.Screen name="ShopsTab" component={ShopsScreen} options={{ title: "Shops" }} />
                    <Tab.Screen name="OrdersTab" component={OrdersScreen} options={{ title: "Orders" }} />
                    <Tab.Screen name="CartTab" component={CartScreen} options={{ title: "Cart" }} />
                    <Tab.Screen name="ProfileTab" component={ProfileScreen} options={{ title: "Profile" }} />
                </>
            )}
        </Tab.Navigator>
    );
};

const styles = StyleSheet.create({
    tabBar: {
        backgroundColor: "transparent",
        borderTopColor: "transparent",
        height: 60,
        paddingBottom: 6,
        marginHorizontal: 20,
        borderRadius: 30,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 5 },
        shadowOpacity: 0.2,
        shadowRadius: 10,
        elevation: 12,
        bottom: 10,
        position: "absolute",
    },
    tabBarBackground: {
        flex: 1,
        backgroundColor: theme.colors.white,
        borderRadius: 30,
        overflow: "hidden",
    },
    tabBarLabel: {
        fontSize: 10,
        fontWeight: "500",
        marginBottom: 4,
        textAlign: "center",
    },
    tabBarItem: {
        paddingVertical: 4,
        justifyContent: "center",
        alignItems: "center",
    },
    tabBarIcon: {
        justifyContent: "center",
        alignItems: "center",
    },
    icon: {
        alignSelf: "center",
    },
});

export default TabNavigator;

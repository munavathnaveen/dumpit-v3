import React, { useEffect, useState } from "react";
import { View, ActivityIndicator, StyleSheet } from "react-native";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { useSelector, useDispatch } from "react-redux";
import AsyncStorage from "@react-native-async-storage/async-storage";

import AuthNavigator from "./AuthNavigator";
import MainNavigator from "./MainNavigator";
import { RootStackParamList } from "./types";
import { RootState, AppDispatch } from "../store";
import { loadUser } from "../store/authSlice";
import { theme } from "../theme";

const Stack = createNativeStackNavigator<RootStackParamList>();

// Navigation persistence configuration
const NAVIGATION_STATE_KEY = "@dumpit_nav_state";

const RootNavigator: React.FC = () => {
    const { isAuthenticated, loading } = useSelector((state: RootState) => state.auth);
    const dispatch = useDispatch<AppDispatch>();
    const [isLoading, setIsLoading] = useState(true);
    const [initialState, setInitialState] = useState<any>(undefined);
    const [shouldRestoreNavigation, setShouldRestoreNavigation] = useState(false);

    // Load the saved navigation state and validate it's safe to restore
    useEffect(() => {
        const restoreState = async () => {
            try {
                const savedStateString = await AsyncStorage.getItem(NAVIGATION_STATE_KEY);
                if (savedStateString) {
                    const state = JSON.parse(savedStateString);

                    // Only restore navigation state if it's safe to do so
                    // Avoid restoring to screens that might crash on startup
                    const isSafeToRestore = validateNavigationState(state);

                    if (isSafeToRestore) {
                        console.log("✅ Navigation state is safe to restore");
                        setInitialState(state);
                        setShouldRestoreNavigation(true);
                    } else {
                        console.log("⚠️ Navigation state not safe to restore, starting fresh");
                        // Clear the problematic navigation state
                        await AsyncStorage.removeItem(NAVIGATION_STATE_KEY);
                    }
                }
            } catch (e) {
                console.warn("Failed to load navigation state", e);
                // Clear corrupted navigation state
                await AsyncStorage.removeItem(NAVIGATION_STATE_KEY);
            }
        };

        restoreState();
    }, []);

    // Validate if the navigation state is safe to restore
    const validateNavigationState = (state: any): boolean => {
        try {
            // If we're not authenticated, don't restore any state
            if (!isAuthenticated) {
                return false;
            }

            // Check if the state would navigate directly to potentially problematic screens
            const isRestoringToProblematicScreen = (navState: any): boolean => {
                if (!navState || !navState.routes) return false;

                // Check all routes in the state recursively
                for (const route of navState.routes) {
                    if (route.state) {
                        // Recursive check for nested navigators
                        if (isRestoringToProblematicScreen(route.state)) {
                            return true;
                        }
                    }

                    // Check if we're restoring directly to ProductsScreen or other heavy screens
                    if (
                        route.name === "ProductsTab" ||
                        route.name === "VendorProductsTab" ||
                        (route.state &&
                            route.state.index !== undefined &&
                            route.state.routes &&
                            route.state.routes[route.state.index] &&
                            (route.state.routes[route.state.index].name === "ProductsTab" || route.state.routes[route.state.index].name === "VendorProductsTab"))
                    ) {
                        console.log("⚠️ Would restore to ProductsScreen - not safe");
                        return true;
                    }
                }

                return false;
            };

            return !isRestoringToProblematicScreen(state);
        } catch (error) {
            console.error("Error validating navigation state:", error);
            return false;
        }
    };

    useEffect(() => {
        // Check if user is authenticated on app start
        const checkAuth = async () => {
            try {
                const token = await AsyncStorage.getItem("token");
                if (token) {
                    await dispatch(loadUser()).unwrap();
                }
            } catch (error) {
                console.error("Failed to load user:", error);
            } finally {
                setIsLoading(false);
            }
        };

        checkAuth();
    }, [dispatch]);

    if (isLoading || loading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={theme.colors.primary} />
            </View>
        );
    }

    return (
        <NavigationContainer
            initialState={shouldRestoreNavigation ? initialState : undefined}
            onStateChange={(state: any) => {
                if (state) {
                    AsyncStorage.setItem(NAVIGATION_STATE_KEY, JSON.stringify(state));
                }
            }}
        >
            <Stack.Navigator screenOptions={{ headerShown: false }}>
                {isAuthenticated ? <Stack.Screen name="Main" component={MainNavigator} /> : <Stack.Screen name="Auth" component={AuthNavigator} />}
            </Stack.Navigator>
        </NavigationContainer>
    );
};

const styles = StyleSheet.create({
    loadingContainer: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: theme.colors.white,
    },
});

export default RootNavigator;

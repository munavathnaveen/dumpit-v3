import React, { useEffect, useState } from "react";
import { StyleSheet } from "react-native";
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
import LoadingScreen from "../components/LoadingScreen";

const Stack = createNativeStackNavigator<RootStackParamList>();

// Navigation persistence configuration
const NAVIGATION_STATE_KEY = "@dumpit_nav_state";

const RootNavigator: React.FC = () => {
    const { isAuthenticated, loading } = useSelector((state: RootState) => state.auth);
    const dispatch = useDispatch<AppDispatch>();
    const [isLoading, setIsLoading] = useState(true);

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
        return <LoadingScreen message="Initializing app..." />;
    }

    return (
        <NavigationContainer>
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

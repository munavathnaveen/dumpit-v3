import React from "react";
import { View, ActivityIndicator, StyleSheet, Text } from "react-native";
import { theme } from "../theme";

interface LoadingScreenProps {
    message?: string;
    fullScreen?: boolean;
}

const LoadingScreen: React.FC<LoadingScreenProps> = ({ message = "Loading...", fullScreen = true }) => {
    return (
        <View style={[styles.container, fullScreen ? styles.fullScreen : styles.inline]}>
            <ActivityIndicator size="large" color={theme.colors.primary} />
            {message && <Text style={styles.message}>{message}</Text>}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: theme.colors.white,
    },
    fullScreen: {
        flex: 1,
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 999,
    },
    inline: {
        padding: 20,
    },
    message: {
        marginTop: 10,
        color: theme.colors.text,
        fontSize: 16,
    },
});

export default LoadingScreen;

import React, { ReactNode } from "react";
import { View, StyleSheet } from "react-native";
import ErrorBoundary from "./ErrorBoundary";
import { theme } from "../theme";

interface ScreenWrapperProps {
    children: ReactNode;
    fallback?: ReactNode;
    resetOnPropsChange?: any[];
    style?: any;
}

const ScreenWrapper: React.FC<ScreenWrapperProps> = ({ 
    children, 
    fallback, 
    resetOnPropsChange, 
    style 
}) => {
    const handleError = (error: Error, errorInfo: any) => {
        // Enhanced error logging for production debugging
        console.error("ScreenWrapper caught error:", {
            message: error.message,
            stack: error.stack,
            componentStack: errorInfo.componentStack,
            timestamp: new Date().toISOString(),
            userAgent: navigator?.userAgent || "unknown",
            url: window?.location?.href || "unknown"
        });

        // Here you could send to analytics/crash reporting
        // Example: Crashlytics.recordError(error);
    };

    return (
        <View style={[styles.container, style]}>
            <ErrorBoundary
                fallback={fallback}
                onError={handleError}
                resetOnPropsChange={resetOnPropsChange}
            >
                {children}
            </ErrorBoundary>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: theme.colors.background,
    },
});

export default ScreenWrapper; 
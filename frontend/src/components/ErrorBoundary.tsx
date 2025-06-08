import React, { Component, ReactNode } from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { theme } from "../theme";

interface Props {
    children: ReactNode;
    fallback?: ReactNode;
    onError?: (error: Error, errorInfo: any) => void;
}

interface State {
    hasError: boolean;
    error?: Error;
}

class ErrorBoundary extends Component<Props, State> {
    public state: State = {
        hasError: false,
    };

    public static getDerivedStateFromError(error: Error): State {
        // Update state so the next render will show the fallback UI
        return { hasError: true, error };
    }

    public componentDidCatch(error: Error, errorInfo: any) {
        console.error("ErrorBoundary caught an error:", error, errorInfo);

        // Call custom error handler if provided
        if (this.props.onError) {
            this.props.onError(error, errorInfo);
        }
    }

    private handleRetry = () => {
        this.setState({ hasError: false, error: undefined });
    };

    public render() {
        if (this.state.hasError) {
            // Custom fallback UI
            if (this.props.fallback) {
                return this.props.fallback;
            }

            // Default fallback UI
            return (
                <View style={styles.container}>
                    <View style={styles.errorContainer}>
                        <Text style={styles.errorTitle}>Oops! Something went wrong</Text>
                        <Text style={styles.errorMessage}>We encountered an unexpected error. Please try again.</Text>
                        {this.state.error && __DEV__ && <Text style={styles.errorDetails}>{this.state.error.toString()}</Text>}
                        <TouchableOpacity style={styles.retryButton} onPress={this.handleRetry}>
                            <Text style={styles.retryButtonText}>Try Again</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            );
        }

        return this.props.children;
    }
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: theme.colors.white,
        justifyContent: "center",
        alignItems: "center",
        padding: theme.spacing.lg,
    },
    errorContainer: {
        alignItems: "center",
        padding: theme.spacing.xl,
        backgroundColor: theme.colors.white,
        borderRadius: theme.borderRadius.large,
        shadowColor: "#000",
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 4,
    },
    errorTitle: {
        fontSize: 24,
        fontWeight: "bold",
        color: theme.colors.dark,
        marginBottom: theme.spacing.md,
        textAlign: "center",
    },
    errorMessage: {
        fontSize: 16,
        color: theme.colors.gray,
        textAlign: "center",
        marginBottom: theme.spacing.lg,
        lineHeight: 24,
    },
    errorDetails: {
        fontSize: 12,
        color: theme.colors.error,
        textAlign: "center",
        marginBottom: theme.spacing.lg,
        fontFamily: "monospace",
    },
    retryButton: {
        backgroundColor: theme.colors.primary,
        paddingHorizontal: theme.spacing.xl,
        paddingVertical: theme.spacing.md,
        borderRadius: theme.borderRadius.medium,
    },
    retryButtonText: {
        color: theme.colors.white,
        fontSize: 16,
        fontWeight: "600",
    },
});

export default ErrorBoundary;

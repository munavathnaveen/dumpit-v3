import React, { Component, ReactNode } from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { theme } from "../theme";

interface Props {
    children: ReactNode;
    fallback?: ReactNode;
    onError?: (error: Error, errorInfo: any) => void;
    resetOnPropsChange?: any[];
}

interface State {
    hasError: boolean;
    error: Error | null;
    errorInfo: any;
}

class ErrorBoundary extends Component<Props, State> {
    constructor(props: Props) {
        super(props);
        this.state = {
            hasError: false,
            error: null,
            errorInfo: null,
        };
    }

    static getDerivedStateFromError(error: Error): State {
        return {
            hasError: true,
            error,
            errorInfo: null,
        };
    }

    componentDidCatch(error: Error, errorInfo: any) {
        console.error("ErrorBoundary caught an error:", error, errorInfo);

        this.setState({
            error,
            errorInfo,
        });

        // Call custom error handler if provided
        if (this.props.onError) {
            this.props.onError(error, errorInfo);
        }

        // Log to crash reporting service if available
        this.logErrorToService(error, errorInfo);
    }

    componentDidUpdate(prevProps: Props) {
        const { resetOnPropsChange } = this.props;
        const { hasError } = this.state;

        if (hasError && resetOnPropsChange) {
            const hasPropsChanged = resetOnPropsChange.some(
                (prop, index) => prop !== prevProps.resetOnPropsChange?.[index]
            );

            if (hasPropsChanged) {
                this.resetErrorBoundary();
            }
        }
    }

    resetErrorBoundary = () => {
        this.setState({
            hasError: false,
            error: null,
            errorInfo: null,
        });
    };

    logErrorToService = (error: Error, errorInfo: any) => {
        try {
            // Here you would integrate with a crash reporting service like Crashlytics, Sentry, etc.
            console.warn("Error logged to service:", {
                message: error.message,
                stack: error.stack,
                componentStack: errorInfo.componentStack,
                timestamp: new Date().toISOString(),
            });
        } catch (logError) {
            console.error("Failed to log error to service:", logError);
        }
    };

    render() {
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
                        <Text style={styles.errorMessage}>
                            We're sorry, but something unexpected happened. Please try again.
                        </Text>
                        
                        {__DEV__ && this.state.error && (
                            <Text style={styles.errorDetails}>
                                {this.state.error.message}
                            </Text>
                        )}

                        <TouchableOpacity style={styles.retryButton} onPress={this.resetErrorBoundary}>
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

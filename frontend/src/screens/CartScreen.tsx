import React, { useEffect, useState, useCallback, useRef } from "react";
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, Image, SafeAreaView } from "react-native";
import { useDispatch, useSelector } from "react-redux";
import { RootState, AppDispatch } from "../store";
import { getCart, removeFromCart, updateCartItem, clearCart, clearCartError } from "../store/cartSlice";
import { CartItem } from "../store/cartSlice";
import { Ionicons } from "@expo/vector-icons";
import Toast from "react-native-toast-message";

import { theme } from "../theme";
import Card3D from "../components/Card3D";
import ScreenHeader from "../components/ScreenHeader";
import alert from "../utils/alert";
import { useNavigation as useAppNavigation } from "../navigation/hooks";

const CartScreen = () => {
    const dispatch = useDispatch<AppDispatch>();
    const navigation = useAppNavigation();
    const { items, loading, currentRequest, error, totalItems, totalAmount } = useSelector((state: RootState) => state.cart);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const isInitialMount = useRef(true);
    const [updatingItemId, setUpdatingItemId] = useState<string | null>(null);
    const [renderError, setRenderError] = useState<string | null>(null);

    // Clear any cart errors when component mounts or unmounts
    useEffect(() => {
        dispatch(clearCartError());
        return () => {
            dispatch(clearCartError());
        };
    }, [dispatch]);

    // Show error as toast if present
    useEffect(() => {
        if (error) {
            console.error("Cart error:", error);
            Toast.show({
                type: "error",
                text1: "Error",
                text2: error,
            });
            // Clear the error from the state after showing it
            dispatch(clearCartError());
        }
    }, [error, dispatch]);

    const fetchCart = useCallback(async () => {
        try {
            console.log("Fetching cart items...");
            await dispatch(getCart()).unwrap();
            console.log("Cart items fetched successfully");
        } catch (error) {
            console.error("Failed to fetch cart items:", error);
            Toast.show({
                type: "error",
                text1: "Error",
                text2: "Failed to load cart items",
            });
        }
    }, [dispatch]);

    useEffect(() => {
        if (isInitialMount.current) {
            fetchCart();
            isInitialMount.current = false;
        }
    }, [fetchCart]);

    const handleRefresh = useCallback(async () => {
        setIsRefreshing(true);
        await fetchCart();
        setIsRefreshing(false);
    }, [fetchCart]);

    const handleRemoveItem = async (itemId: string) => {
        try {
            console.log(`Removing item from cart: ${itemId}`);
            setUpdatingItemId(itemId);
            await dispatch(removeFromCart(itemId)).unwrap();
            console.log(`Item removed successfully: ${itemId}`);
            Toast.show({
                type: "success",
                text1: "Item Removed",
                text2: "Item has been removed from your cart",
            });
        } catch (error) {
            console.error(`Failed to remove item ${itemId} from cart:`, error);
            Toast.show({
                type: "error",
                text1: "Error",
                text2: "Failed to remove item from cart",
            });
        } finally {
            setUpdatingItemId(null);
        }
    };

    const handleUpdateQuantity = async (itemId: string, quantity: number) => {
        console.log(`Updating quantity for item ${itemId} to ${quantity}`);
        if (quantity > 0) {
            try {
                setUpdatingItemId(itemId);
                await dispatch(updateCartItem({ itemId, quantity })).unwrap();
                console.log(`Quantity updated successfully for item ${itemId}: ${quantity}`);
            } catch (error) {
                console.error(`Failed to update quantity for item ${itemId}:`, error);
                Toast.show({
                    type: "error",
                    text1: "Error",
                    text2: "Failed to update quantity",
                });
            } finally {
                setUpdatingItemId(null);
            }
        } else {
            handleRemoveItem(itemId);
        }
    };

    const handleClearCart = async () => {
        try {
            console.log("Clearing cart...");
            await dispatch(clearCart()).unwrap();
            console.log("Cart cleared successfully");
            Toast.show({
                type: "success",
                text1: "Cart Cleared",
                text2: "Your cart has been cleared",
            });
        } catch (error) {
            console.error("Failed to clear cart:", error);
            Toast.show({
                type: "error",
                text1: "Error",
                text2: "Failed to clear cart",
            });
        }
    };

    const handleCheckout = () => {
        if (items.length === 0) {
            alert("Empty Cart", "Please add items to your cart before checkout.");
            return;
        }
        // Navigate to checkout screen with the total amount
        navigation.navigate("Checkout", {
            totalAmount: totalAmount + (totalAmount > 0 ? 40 : 0),
        });
    };

    const handleShopNow = () => {
        console.log("Navigating to ShopsTab");
        navigation.navigate("TabNavigator", { screen: "ShopsTab" });
    };

    const renderItem = ({ item }: { item: CartItem }) => {
        try {
            // Ensure item.product exists before rendering
            if (!item.product || !item.product._id) {
                console.warn("Invalid cart item:", item);
                return null;
            }

            // Safe access to price with fallback to 0
            const price = item.product.price || 0;
            const isUpdatingThisItem = updatingItemId === item.product._id;
            const productId = item.product._id;
            const productName = item.product.name || "Unknown Product";
            const imageUri = item.product.image || "https://via.placeholder.com/100";
            const quantity = item.quantity || 0;
            const stock = item.product.stock || 0;

            return (
                <View style={styles.cartItem}>
                    <Image source={{ uri: imageUri }} style={styles.productImage} onError={(e) => console.log("Image loading error:", e.nativeEvent.error)} />
                    <View style={styles.itemDetails}>
                        <Text style={styles.productName} numberOfLines={2}>
                            {productName}
                        </Text>
                        <Text style={styles.productPrice}>₹{price.toFixed(2)}</Text>
                        <View style={styles.quantityContainer}>
                            {isUpdatingThisItem ? (
                                <ActivityIndicator size="small" color={theme.colors.primary} style={{ width: 60 }} />
                            ) : (
                                <>
                                    <TouchableOpacity onPress={() => handleUpdateQuantity(productId, quantity - 1)} style={styles.quantityButton} disabled={isUpdatingThisItem}>
                                        <Ionicons name="remove" size={16} color="#000" />
                                    </TouchableOpacity>
                                    <Text style={styles.quantity}>{quantity}</Text>
                                    <TouchableOpacity
                                        onPress={() => handleUpdateQuantity(productId, quantity + 1)}
                                        style={styles.quantityButton}
                                        disabled={isUpdatingThisItem || (stock !== undefined && quantity >= stock)}
                                    >
                                        <Ionicons name="add" size={16} color="#000" />
                                    </TouchableOpacity>
                                </>
                            )}
                        </View>
                    </View>
                    <TouchableOpacity onPress={() => handleRemoveItem(productId)} style={styles.removeButton} disabled={isUpdatingThisItem}>
                        {isUpdatingThisItem ? <ActivityIndicator size="small" color="#ff4444" /> : <Ionicons name="trash-outline" size={20} color="#ff4444" />}
                    </TouchableOpacity>
                </View>
            );
        } catch (error) {
            console.error("Error rendering cart item:", error);
            return (
                <View style={styles.errorItem}>
                    <Text style={styles.errorText}>Error displaying this item</Text>
                    <TouchableOpacity onPress={() => handleRemoveItem(item.product?._id || "")} style={styles.errorButton}>
                        <Text style={styles.errorButtonText}>Remove</Text>
                    </TouchableOpacity>
                </View>
            );
        }
    };

    // Safe rendering of the FlatList items
    const safeRenderList = () => {
        try {
            return (
                <FlatList
                    data={items}
                    renderItem={renderItem}
                    keyExtractor={(item) => item.product?._id || Math.random().toString()}
                    contentContainerStyle={styles.listContainer}
                    refreshing={isRefreshing}
                    onRefresh={handleRefresh}
                />
            );
        } catch (error) {
            console.error("Error rendering list:", error);
            setRenderError("Failed to display cart items. Please try refreshing.");
            return (
                <View style={styles.errorContainer}>
                    <Text style={styles.errorText}>{renderError}</Text>
                    <TouchableOpacity style={styles.refreshButton} onPress={handleRefresh}>
                        <Text style={styles.refreshButtonText}>Refresh</Text>
                    </TouchableOpacity>
                </View>
            );
        }
    };

    // Only show full screen loader on initial load, not for item updates
    if (loading && currentRequest === "getCart" && items.length === 0) {
        return (
            <SafeAreaView style={styles.container}>
                <ScreenHeader title="My Cart" />
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={theme.colors.primary} />
                </View>
            </SafeAreaView>
        );
    }

    // Main render
    return (
        <SafeAreaView style={styles.container}>
            <ScreenHeader title="My Cart" />

            <View style={styles.contentContainer}>
                {renderError ? (
                    <View style={styles.errorContainer}>
                        <Text style={styles.errorText}>{renderError}</Text>
                        <TouchableOpacity
                            style={styles.refreshButton}
                            onPress={() => {
                                setRenderError(null);
                                handleRefresh();
                            }}
                        >
                            <Text style={styles.refreshButtonText}>Refresh</Text>
                        </TouchableOpacity>
                    </View>
                ) : items.length === 0 ? (
                    <View style={styles.emptyContainer}>
                        <Text style={styles.emptyText}>Your cart is empty</Text>
                        <TouchableOpacity style={styles.shopNowButton} onPress={handleShopNow}>
                            <Text style={styles.shopNowText}>Shop Now</Text>
                        </TouchableOpacity>
                    </View>
                ) : (
                    <>
                        {safeRenderList()}

                        <Card3D style={styles.summaryCard} elevation="medium">
                            <View style={styles.summaryHeader}>
                                <Text style={styles.summaryTitle}>Order Summary</Text>
                            </View>

                            <View style={styles.summaryContent}>
                                <View style={styles.summaryRow}>
                                    <Text style={styles.summaryLabel}>Items ({totalItems || 0})</Text>
                                    <Text style={styles.summaryValue}>₹{(totalAmount || 0).toFixed(2)}</Text>
                                </View>
                                <View style={styles.summaryRow}>
                                    <Text style={styles.summaryLabel}>Delivery Fee</Text>
                                    <Text style={styles.summaryValue}>₹{(totalAmount || 0) > 0 ? "40.00" : "0.00"}</Text>
                                </View>
                                <View style={styles.divider} />
                                <View style={styles.summaryRow}>
                                    <Text style={styles.totalLabel}>Total</Text>
                                    <Text style={styles.totalValue}>₹{((totalAmount || 0) + ((totalAmount || 0) > 0 ? 40 : 0)).toFixed(2)}</Text>
                                </View>
                            </View>

                            {loading && currentRequest === "clearCart" ? (
                                <View style={styles.buttonContainer}>
                                    <ActivityIndicator size="small" color={theme.colors.primary} />
                                </View>
                            ) : (
                                <View style={styles.buttonContainer}>
                                    <TouchableOpacity style={styles.checkoutButton} onPress={handleCheckout} disabled={loading}>
                                        <Ionicons name="arrow-forward" size={16} color={theme.colors.white} />
                                        <Text style={styles.checkoutButtonText}>Proceed to Checkout</Text>
                                    </TouchableOpacity>

                                    <View style={styles.clearButtonContainer}>
                                        <TouchableOpacity style={styles.clearButton} onPress={handleClearCart} disabled={loading}>
                                            <Ionicons name="trash-outline" size={20} color={theme.colors.white} />
                                        </TouchableOpacity>
                                        <Text style={styles.clearButtonText}>Clear</Text>
                                    </View>
                                </View>
                            )}
                        </Card3D>
                    </>
                )}
            </View>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: theme.colors.background,
    },
    contentContainer: {
        flex: 1,
        padding: theme.spacing.sm,
        paddingBottom: 80,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
    },
    errorContainer: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        padding: 20,
    },
    errorText: {
        color: "#ff4444",
        fontSize: 16,
        textAlign: "center",
        marginBottom: 20,
    },
    refreshButton: {
        backgroundColor: theme.colors.primary,
        paddingHorizontal: 24,
        paddingVertical: 12,
        borderRadius: 25,
    },
    refreshButtonText: {
        color: theme.colors.white,
        fontSize: 16,
        fontWeight: "bold",
    },
    errorItem: {
        padding: 16,
        backgroundColor: "#ffeeee",
        borderRadius: 8,
        marginBottom: 8,
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
    },
    errorButton: {
        backgroundColor: "#ff4444",
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 16,
    },
    errorButtonText: {
        color: "#fff",
        fontWeight: "bold",
    },
    emptyContainer: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
    },
    emptyText: {
        fontSize: 18,
        color: "#666",
    },
    listContainer: {
        padding: theme.spacing.sm,
    },
    cartItem: {
        flexDirection: "row",
        padding: 12,
        borderBottomWidth: 1,
        borderBottomColor: "#eee",
        alignItems: "center",
    },
    productImage: {
        width: 60,
        height: 60,
        borderRadius: 8,
        marginRight: 12,
    },
    itemDetails: {
        flex: 1,
    },
    productName: {
        fontSize: 14,
        fontWeight: "bold",
        marginBottom: 2,
    },
    productPrice: {
        fontSize: 12,
        color: "#666",
        marginBottom: 6,
    },
    quantityContainer: {
        flexDirection: "row",
        alignItems: "center",
    },
    quantityButton: {
        width: 24,
        height: 24,
        borderRadius: 12,
        backgroundColor: "#f0f0f0",
        justifyContent: "center",
        alignItems: "center",
    },
    quantity: {
        marginHorizontal: 10,
        fontSize: 14,
    },
    removeButton: {
        padding: 6,
    },
    summaryCard: {
        borderRadius: 12,
        backgroundColor: theme.colors.white,
        marginTop: 8,
        marginBottom: 8,
        paddingHorizontal: 16,
        paddingVertical: 12,
        shadowColor: theme.colors.shadow,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 4,
        elevation: 4,
    },
    summaryHeader: {
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.lightGray,
        paddingBottom: 8,
        marginBottom: 10,
    },
    summaryTitle: {
        fontSize: 16,
        fontWeight: "bold",
        color: theme.colors.text,
        textAlign: "center",
    },
    summaryContent: {
        marginBottom: 10,
    },
    summaryRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        marginBottom: 4,
    },
    summaryLabel: {
        fontSize: 13,
        color: theme.colors.textLight,
    },
    summaryValue: {
        fontSize: 13,
        fontWeight: "600",
        color: theme.colors.text,
    },
    divider: {
        height: 1,
        backgroundColor: theme.colors.lightGray,
        marginVertical: 6,
    },
    totalLabel: {
        fontSize: 14,
        fontWeight: "bold",
        color: theme.colors.text,
    },
    totalValue: {
        fontSize: 16,
        fontWeight: "bold",
        color: theme.colors.primary,
    },
    buttonContainer: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        gap: 12,
    },
    checkoutButton: {
        flex: 1,
        backgroundColor: theme.colors.success,
        borderRadius: 8,
        paddingVertical: 10,
        paddingHorizontal: 12,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        shadowColor: theme.colors.success,
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.15,
        shadowRadius: 2,
        elevation: 2,
    },
    checkoutButtonText: {
        color: theme.colors.white,
        fontSize: 14,
        fontWeight: "bold",
        marginLeft: 6,
    },
    clearButtonContainer: {
        alignItems: "center",
        justifyContent: "center",
    },
    clearButton: {
        backgroundColor: theme.colors.error,
        borderRadius: 20,
        width: 40,
        height: 40,
        alignItems: "center",
        justifyContent: "center",
        shadowColor: theme.colors.error,
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.15,
        shadowRadius: 2,
        elevation: 2,
    },
    clearButtonText: {
        color: theme.colors.error,
        fontSize: 11,
        fontWeight: "600",
        marginTop: 2,
    },
    buttonIcon: {
        marginRight: 4,
    },
    shopNowButton: {
        backgroundColor: theme.colors.primary,
        paddingHorizontal: 24,
        paddingVertical: 12,
        borderRadius: 25,
    },
    shopNowText: {
        color: theme.colors.white,
        fontSize: 16,
        fontWeight: "bold",
    },
});

export default CartScreen;

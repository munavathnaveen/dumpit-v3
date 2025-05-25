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
                        <Text style={styles.productName}>{productName}</Text>
                        <Text style={styles.productPrice}>₹{price.toFixed(2)}</Text>
                        <View style={styles.quantityContainer}>
                            {isUpdatingThisItem ? (
                                <ActivityIndicator size="small" color={theme.colors.primary} style={{ width: 80 }} />
                            ) : (
                                <>
                                    <TouchableOpacity onPress={() => handleUpdateQuantity(productId, quantity - 1)} style={styles.quantityButton} disabled={isUpdatingThisItem}>
                                        <Ionicons name="remove" size={20} color="#000" />
                                    </TouchableOpacity>
                                    <Text style={styles.quantity}>{quantity}</Text>
                                    <TouchableOpacity
                                        onPress={() => handleUpdateQuantity(productId, quantity + 1)}
                                        style={styles.quantityButton}
                                        disabled={isUpdatingThisItem || (stock !== undefined && quantity >= stock)}
                                    >
                                        <Ionicons name="add" size={20} color="#000" />
                                    </TouchableOpacity>
                                </>
                            )}
                        </View>
                    </View>
                    <TouchableOpacity onPress={() => handleRemoveItem(productId)} style={styles.removeButton} disabled={isUpdatingThisItem}>
                        {isUpdatingThisItem ? <ActivityIndicator size="small" color="#ff4444" /> : <Ionicons name="trash-outline" size={24} color="#ff4444" />}
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

                        <Card3D style={styles.summaryCard}>
                            <View style={styles.summaryRow}>
                                <Text style={styles.summaryLabel}>Total Items:</Text>
                                <Text style={styles.summaryValue}>{totalItems || 0}</Text>
                            </View>
                            <View style={styles.summaryRow}>
                                <Text style={styles.summaryLabel}>Total Amount:</Text>
                                <Text style={styles.summaryValue}>₹{(totalAmount || 0).toFixed(2)}</Text>
                            </View>
                            <View style={styles.divider} />
                            <View style={styles.summaryRow}>
                                <Text style={styles.totalLabel}>Total</Text>
                                <Text style={styles.totalValue}>₹{((totalAmount || 0) + ((totalAmount || 0) > 0 ? 40 : 0)).toFixed(2)}</Text>
                            </View>

                            {loading && currentRequest === "clearCart" ? (
                                <View style={styles.checkoutButton}>
                                    <ActivityIndicator size="small" color="#ffffff" />
                                </View>
                            ) : (
                                <>
                                    <TouchableOpacity style={styles.checkoutButton} onPress={handleCheckout} disabled={loading}>
                                        <Text style={styles.checkoutButtonText}>Proceed to Checkout</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity style={styles.clearButton} onPress={handleClearCart} disabled={loading}>
                                        <Text style={styles.clearButtonText}>Clear Cart</Text>
                                    </TouchableOpacity>
                                </>
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
        padding: theme.spacing.md,
        paddingBottom: 100,
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
        padding: 16,
    },
    cartItem: {
        flexDirection: "row",
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: "#eee",
        alignItems: "center",
    },
    productImage: {
        width: 80,
        height: 80,
        borderRadius: 8,
        marginRight: 16,
    },
    itemDetails: {
        flex: 1,
    },
    productName: {
        fontSize: 16,
        fontWeight: "bold",
        marginBottom: 4,
    },
    productPrice: {
        fontSize: 14,
        color: "#666",
        marginBottom: 8,
    },
    quantityContainer: {
        flexDirection: "row",
        alignItems: "center",
    },
    quantityButton: {
        width: 30,
        height: 30,
        borderRadius: 15,
        backgroundColor: "#f0f0f0",
        justifyContent: "center",
        alignItems: "center",
    },
    quantity: {
        marginHorizontal: 16,
        fontSize: 16,
    },
    removeButton: {
        padding: 8,
    },
    summaryCard: {
        padding: 16,
        borderRadius: 12,
        backgroundColor: theme.colors.white,
        marginTop: "auto",
    },
    summaryRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        marginBottom: 8,
    },
    summaryLabel: {
        fontSize: 16,
        color: "#666",
    },
    summaryValue: {
        fontSize: 16,
        fontWeight: "bold",
    },
    divider: {
        height: 1,
        backgroundColor: theme.colors.border,
        marginVertical: 8,
    },
    totalLabel: {
        fontSize: 16,
        fontWeight: "bold",
        color: theme.colors.text,
    },
    totalValue: {
        fontSize: 18,
        fontWeight: "bold",
        color: theme.colors.primary,
    },
    checkoutButton: {
        backgroundColor: theme.colors.primary,
        borderRadius: 25,
        paddingVertical: 14,
        alignItems: "center",
        marginTop: 16,
    },
    checkoutButtonText: {
        color: theme.colors.white,
        fontSize: 16,
        fontWeight: "bold",
    },
    clearButton: {
        backgroundColor: "#ff4444",
        padding: 16,
        borderRadius: 8,
        alignItems: "center",
        marginTop: 8,
    },
    clearButtonText: {
        color: "#fff",
        fontSize: 16,
        fontWeight: "bold",
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

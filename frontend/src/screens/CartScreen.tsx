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
            const totalPrice = price * quantity;
            const discount = (item.product as any).discount || 0;
            const discountedPrice = discount > 0 ? price * (1 - discount / 100) : price;

            return (
                <Card3D style={styles.cartItemCard}>
                    <View style={styles.cartItemContent}>
                        <View style={styles.productImageContainer}>
                            <Image source={{ uri: imageUri }} style={styles.productImage} onError={(e) => console.log("Image loading error:", e.nativeEvent.error)} />
                            {discount > 0 && (
                                <View style={styles.discountBadge}>
                                    <Text style={styles.discountText}>{Math.round(discount)}%</Text>
                                </View>
                            )}
                        </View>

                        <View style={styles.itemDetails}>
                            <Text style={styles.productName} numberOfLines={2}>
                                {productName}
                            </Text>

                            {(item.product as any).shop && (
                                <View style={styles.shopInfo}>
                                    <Ionicons name="storefront-outline" size={12} color={theme.colors.textLight} />
                                    <Text style={styles.shopName} numberOfLines={1}>
                                        {(item.product as any).shop.name}
                                    </Text>
                                </View>
                            )}

                            <View style={styles.priceContainer}>
                                {discount > 0 ? (
                                    <View style={styles.priceRow}>
                                        <Text style={styles.discountedPrice}>₹{discountedPrice.toFixed(2)}</Text>
                                        <Text style={styles.originalPrice}>₹{price.toFixed(2)}</Text>
                                    </View>
                                ) : (
                                    <Text style={styles.productPrice}>₹{price.toFixed(2)}</Text>
                                )}
                                <Text style={styles.totalPrice}>Total: ₹{(discountedPrice * quantity).toFixed(2)}</Text>
                            </View>

                            <View style={styles.quantityControls}>
                                {isUpdatingThisItem ? (
                                    <View style={styles.loadingQuantity}>
                                        <ActivityIndicator size="small" color={theme.colors.primary} />
                                        <Text style={styles.loadingText}>Updating...</Text>
                                    </View>
                                ) : (
                                    <View style={styles.quantityContainer}>
                                        <TouchableOpacity
                                            onPress={() => handleUpdateQuantity(productId, quantity - 1)}
                                            style={[styles.quantityButton, styles.quantityButtonMinus]}
                                            disabled={isUpdatingThisItem}
                                        >
                                            <Ionicons name="remove" size={16} color={theme.colors.white} />
                                        </TouchableOpacity>

                                        <View style={styles.quantityDisplay}>
                                            <Text style={styles.quantity}>{quantity}</Text>
                                        </View>

                                        <TouchableOpacity
                                            onPress={() => handleUpdateQuantity(productId, quantity + 1)}
                                            style={[styles.quantityButton, styles.quantityButtonPlus]}
                                            disabled={isUpdatingThisItem || (stock !== undefined && quantity >= stock)}
                                        >
                                            <Ionicons name="add" size={16} color={theme.colors.white} />
                                        </TouchableOpacity>
                                    </View>
                                )}
                            </View>

                            {stock !== undefined && quantity >= stock && <Text style={styles.stockWarning}>Max stock reached</Text>}
                        </View>

                        <TouchableOpacity onPress={() => handleRemoveItem(productId)} style={styles.removeButton} disabled={isUpdatingThisItem}>
                            {isUpdatingThisItem ? <ActivityIndicator size="small" color={theme.colors.error} /> : <Ionicons name="trash-outline" size={20} color={theme.colors.error} />}
                        </TouchableOpacity>
                    </View>
                </Card3D>
            );
        } catch (error) {
            console.error("Error rendering cart item:", error);
            return (
                <Card3D style={styles.errorItem}>
                    <View style={styles.errorContent}>
                        <Text style={styles.errorText}>Error displaying this item</Text>
                        <TouchableOpacity onPress={() => handleRemoveItem(item.product?._id || "")} style={styles.errorButton}>
                            <Text style={styles.errorButtonText}>Remove</Text>
                        </TouchableOpacity>
                    </View>
                </Card3D>
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
                    showsVerticalScrollIndicator={false}
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
                    <Text style={styles.loadingText}>Loading your cart...</Text>
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
                        <Ionicons name="alert-circle-outline" size={64} color={theme.colors.error} />
                        <Text style={styles.errorTitle}>Oops! Something went wrong</Text>
                        <Text style={styles.errorText}>{renderError}</Text>
                        <TouchableOpacity
                            style={styles.refreshButton}
                            onPress={() => {
                                setRenderError(null);
                                handleRefresh();
                            }}
                        >
                            <Ionicons name="refresh" size={20} color={theme.colors.white} />
                            <Text style={styles.refreshButtonText}>Try Again</Text>
                        </TouchableOpacity>
                    </View>
                ) : items.length === 0 ? (
                    <View style={styles.emptyContainer}>
                        <Ionicons name="bag-outline" size={80} color={theme.colors.textLight} />
                        <Text style={styles.emptyTitle}>Your cart is empty</Text>
                        <Text style={styles.emptySubtitle}>Add some products to get started!</Text>
                        <TouchableOpacity style={styles.shopNowButton} onPress={handleShopNow}>
                            <Ionicons name="storefront-outline" size={20} color={theme.colors.white} />
                            <Text style={styles.shopNowText}>Start Shopping</Text>
                        </TouchableOpacity>
                    </View>
                ) : (
                    <>
                        <View style={styles.cartHeader}>
                            <Text style={styles.cartTitle}>
                                {totalItems} {totalItems === 1 ? "Item" : "Items"} in Cart
                            </Text>
                            <TouchableOpacity style={styles.clearAllButton} onPress={handleClearCart} disabled={loading}>
                                <Ionicons name="trash-outline" size={16} color={theme.colors.error} />
                                <Text style={styles.clearAllText}>Clear All</Text>
                            </TouchableOpacity>
                        </View>

                        {safeRenderList()}

                        <Card3D style={styles.summaryCard}>
                            <View style={styles.summaryHeader}>
                                <Ionicons name="receipt-outline" size={24} color={theme.colors.primary} />
                                <Text style={styles.summaryTitle}>Order Summary</Text>
                            </View>

                            <View style={styles.summaryRow}>
                                <Text style={styles.summaryLabel}>Subtotal ({totalItems} items)</Text>
                                <Text style={styles.summaryValue}>₹{(totalAmount || 0).toFixed(2)}</Text>
                            </View>

                            <View style={styles.summaryRow}>
                                <Text style={styles.summaryLabel}>Delivery Fee</Text>
                                <Text style={styles.summaryValue}>{(totalAmount || 0) > 0 ? "₹40.00" : "₹0.00"}</Text>
                            </View>

                            <View style={styles.divider} />

                            <View style={styles.totalRow}>
                                <Text style={styles.totalLabel}>Total Amount</Text>
                                <Text style={styles.totalValue}>₹{((totalAmount || 0) + ((totalAmount || 0) > 0 ? 40 : 0)).toFixed(2)}</Text>
                            </View>

                            {loading && currentRequest === "clearCart" ? (
                                <View style={styles.checkoutButton}>
                                    <ActivityIndicator size="small" color={theme.colors.white} />
                                    <Text style={styles.checkoutButtonText}>Processing...</Text>
                                </View>
                            ) : (
                                <TouchableOpacity style={[styles.checkoutButton, { opacity: loading ? 0.7 : 1 }]} onPress={handleCheckout} disabled={loading}>
                                    <Ionicons name="card-outline" size={20} color={theme.colors.white} />
                                    <Text style={styles.checkoutButtonText}>Proceed to Checkout</Text>
                                    <Ionicons name="arrow-forward" size={20} color={theme.colors.white} />
                                </TouchableOpacity>
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
    emptyTitle: {
        fontSize: 24,
        fontWeight: "bold",
        color: theme.colors.text,
        marginBottom: 16,
    },
    emptySubtitle: {
        fontSize: 16,
        color: theme.colors.textLight,
        textAlign: "center",
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
    cartHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 16,
    },
    cartTitle: {
        fontSize: 18,
        fontWeight: "bold",
        color: theme.colors.text,
    },
    clearAllButton: {
        flexDirection: "row",
        alignItems: "center",
        padding: 8,
        borderRadius: 8,
        backgroundColor: theme.colors.error,
    },
    clearAllText: {
        color: theme.colors.white,
        fontSize: 16,
        fontWeight: "bold",
    },
    cartItemCard: {
        padding: 16,
        borderRadius: 12,
        backgroundColor: theme.colors.white,
        marginBottom: 16,
    },
    cartItemContent: {
        flexDirection: "row",
        alignItems: "center",
    },
    productImageContainer: {
        position: "relative",
    },
    productImage: {
        width: 80,
        height: 80,
        borderRadius: 8,
        marginRight: 16,
    },
    discountBadge: {
        position: "absolute",
        top: 8,
        right: 8,
        backgroundColor: theme.colors.primary,
        paddingHorizontal: 4,
        paddingVertical: 2,
        borderRadius: 4,
    },
    discountText: {
        color: theme.colors.white,
        fontSize: 12,
        fontWeight: "bold",
    },
    itemDetails: {
        flex: 1,
    },
    productName: {
        fontSize: 16,
        fontWeight: "bold",
        marginBottom: 4,
    },
    shopInfo: {
        flexDirection: "row",
        alignItems: "center",
        marginBottom: 4,
    },
    shopName: {
        fontSize: 14,
        color: theme.colors.textLight,
    },
    priceContainer: {
        marginBottom: 8,
    },
    priceRow: {
        flexDirection: "row",
        alignItems: "center",
    },
    discountedPrice: {
        fontSize: 14,
        fontWeight: "bold",
        color: theme.colors.primary,
    },
    originalPrice: {
        fontSize: 14,
        color: theme.colors.textLight,
        marginLeft: 4,
    },
    totalPrice: {
        fontSize: 14,
        color: theme.colors.textLight,
    },
    quantityControls: {
        flexDirection: "row",
        alignItems: "center",
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
    quantityButtonMinus: {
        backgroundColor: "#ff4444",
    },
    quantityButtonPlus: {
        backgroundColor: "#007bff",
    },
    quantityDisplay: {
        marginHorizontal: 16,
    },
    quantity: {
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
    summaryHeader: {
        flexDirection: "row",
        alignItems: "center",
        marginBottom: 16,
    },
    summaryTitle: {
        fontSize: 18,
        fontWeight: "bold",
        color: theme.colors.text,
        marginLeft: 8,
    },
    summaryRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        marginBottom: 8,
    },
    summaryLabel: {
        fontSize: 16,
        color: theme.colors.text,
    },
    summaryValue: {
        fontSize: 16,
        color: theme.colors.text,
        fontWeight: "600",
    },
    divider: {
        height: 1,
        backgroundColor: theme.colors.lightGray,
        marginVertical: 8,
    },
    totalRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        marginBottom: 16,
    },
    totalLabel: {
        fontSize: 18,
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
        padding: 16,
        borderRadius: 12,
        alignItems: "center",
        flexDirection: "row",
        justifyContent: "center",
        ...theme.shadow.medium,
    },
    checkoutButtonText: {
        color: theme.colors.white,
        fontSize: 16,
        fontWeight: "bold",
        marginHorizontal: 8,
    },
    listContainer: {
        paddingBottom: 16,
    },
    loadingText: {
        marginTop: 12,
        fontSize: 16,
        color: theme.colors.textLight,
        textAlign: "center",
    },
    errorTitle: {
        fontSize: 20,
        fontWeight: "bold",
        color: theme.colors.text,
        marginTop: 16,
        marginBottom: 8,
        textAlign: "center",
    },
    errorContent: {
        alignItems: "center",
        padding: 16,
    },
    productPrice: {
        fontSize: 14,
        fontWeight: "600",
        color: theme.colors.text,
    },
    loadingQuantity: {
        flexDirection: "row",
        alignItems: "center",
        paddingVertical: 8,
    },
    stockWarning: {
        fontSize: 12,
        color: theme.colors.error,
        fontStyle: "italic",
        marginTop: 4,
    },
});

export default CartScreen;

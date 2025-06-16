import React, { useState, useEffect, useCallback } from "react";
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, RefreshControl, Image } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { useFocusEffect } from "@react-navigation/core";
import { Ionicons } from "@expo/vector-icons";
import { useSelector } from "react-redux";

import { theme } from "../../theme";
import Card3D from "../../components/Card3D";
import SegmentedControl from "../../components/SegmentedControl";
import { MainStackNavigationProp } from "../../navigation/types";
import { getVendorOrders, updateOrderStatus, vendorOrderAction } from "../../api/orderApi";
import ScreenHeader from "../../components/ScreenHeader";
import { RootState } from "../../store";
import alert from "../../utils/alert";

type OrderStatus = "pending" | "processing" | "shipped" | "delivered" | "cancelled";

interface OrderItem {
    product: {
        _id: string;
        name: string;
        price: number;
        image: string;
    };
    quantity: number;
    price: number;
}

interface Order {
    _id: string;
    orderNumber: string;
    user: {
        _id: string;
        name: string;
        email: string;
        phone: string;
    };
    items: OrderItem[];
    status: OrderStatus;
    total: number;
    shippingAddress: {
        street?: string;
        city?: string;
        state?: string;
        pincode?: string;
        phone?: string;
    };
    paymentMethod: string;
    paymentStatus: "pending" | "paid" | "failed";
    createdAt: string;
    updatedAt: string;
}

// Filter options for the orders
const ORDER_FILTERS = ["All", "Pending", "Processing", "Shipped", "Delivered", "Cancelled"];

const VendorOrdersScreen: React.FC = () => {
    const navigation = useNavigation<MainStackNavigationProp<"VendorOrders">>();

    const [orders, setOrders] = useState<Order[]>([]);
    const [filteredOrders, setFilteredOrders] = useState<Order[]>([]);
    const [selectedFilter, setSelectedFilter] = useState(0); // 0 is 'All'
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);

    const loadOrders = useCallback(
        async (refresh = false) => {
            try {
                setError(null);
                if (refresh) {
                    setPage(1);
                    setHasMore(true);
                }

                const response = await getVendorOrders(page, 10);

                if (response.success) {
                    const newOrders = response.data;
                    if (refresh || page === 1) {
                        setOrders(newOrders);
                        filterOrders(newOrders, selectedFilter);
                    } else {
                        setOrders((prevOrders) => {
                            const updatedOrders = [...prevOrders, ...newOrders];
                            filterOrders(updatedOrders, selectedFilter);
                            return updatedOrders;
                        });
                    }

                    // Check if we have more pages
                    setHasMore(!!response.pagination?.next);
                } else {
                    setError("Failed to load orders");
                }
            } catch (error) {
                console.error("Failed to load orders:", error);
                setError("Failed to load orders");
            } finally {
                setLoading(false);
                setRefreshing(false);
                setLoadingMore(false);
            }
        },
        [page]
    );

    useEffect(() => {
        // Apply filter whenever selectedFilter changes without reloading data
        if (orders.length > 0) {
            filterOrders(orders, selectedFilter);
        }
    }, [selectedFilter, orders]);

    useEffect(() => {
        loadOrders(false);
    }, [page, loadOrders]);

    useFocusEffect(
        useCallback(() => {
            setPage(1);
            loadOrders(true);

            return () => {
                // Cleanup if needed when screen loses focus
            };
        }, []) // Empty dependency array to prevent infinite loops
    );

    const filterOrders = (ordersList: Order[], filterIndex: number) => {
        if (filterIndex === 0) {
            // 'All' filter
            setFilteredOrders(ordersList);
        } else {
            const status = ORDER_FILTERS[filterIndex].toLowerCase() as OrderStatus;
            const filtered = ordersList.filter((order) => order.status === status);
            setFilteredOrders(filtered);
        }
    };

    const handleFilterChange = (index: number) => {
        setSelectedFilter(index);
        filterOrders(orders, index);
    };

    const handleOrderStatusUpdate = (orderId: string, currentStatus: OrderStatus) => {
        // Define possible next statuses based on current status
        let nextStatuses: { [key: string]: OrderStatus } = {};

        switch (currentStatus) {
            case "pending":
                nextStatuses = {
                    "Accept Order": "processing",
                    "Cancel Order": "cancelled",
                };
                break;
            case "processing":
                nextStatuses = {
                    "Mark as Shipped": "shipped",
                    "Cancel Order": "cancelled",
                };
                break;
            case "shipped":
                nextStatuses = {
                    "Mark as Delivered": "delivered",
                };
                break;
            case "delivered":
            case "cancelled":
                // No further status changes allowed
                alert("Status Locked", "This order is in a final state and cannot be updated.");
                return;
        }

        // Create alert options based on next possible statuses
        const alertButtons = Object.entries(nextStatuses).map(([label, status]) => ({
            text: label,
            onPress: async () => {
                try {
                    setLoading(true);
                    await updateOrderStatus(orderId, status);

                    // Update local order list with new status
                    const updatedOrders = orders.map((order) => (order._id === orderId ? { ...order, status } : order));
                    setOrders(updatedOrders);
                    filterOrders(updatedOrders, selectedFilter);

                    alert("Success", `Order ${status === "cancelled" ? "cancelled" : "updated"} successfully`);
                } catch (error) {
                    console.error("Failed to update order status:", error);
                    alert("Error", "Failed to update order status");
                } finally {
                    setLoading(false);
                }
            },
        }));

        // Add cancel button
        alertButtons.push({
            text: "Cancel",
            // @ts-ignore
            style: "cancel",
        } as any);

        alert("Update Order Status", "What would you like to do with this order?", alertButtons as any);
    };

    const handleNotificationPress = () => {
        navigation.navigate("Notifications");
    };

    const handleOrderActions = (orderId: string, orderStatus: OrderStatus, paymentMethod: string) => {
        // Special handling for COD orders in pending status
        if (orderStatus === "pending" && paymentMethod === "cash_on_delivery") {
            alert("Cash on Delivery Order", "What would you like to do with this order?", [
                { text: "Cancel", style: "cancel" },
                {
                    text: "View Details",
                    onPress: () => navigation.navigate("VendorOrderDetails", { orderId }),
                },
                {
                    text: "Accept Order",
                    onPress: async () => {
                        try {
                            setLoading(true);
                            await vendorOrderAction(orderId, "accept");

                            // Update order in local state
                            const updatedOrders = orders.map((order) => (order._id === orderId ? { ...order, status: "processing" as OrderStatus } : order));
                            setOrders(updatedOrders);
                            filterOrders(updatedOrders, selectedFilter);

                            alert("Success", "Order accepted successfully");
                        } catch (error) {
                            console.error("Failed to accept order:", error);
                            alert("Error", "Failed to accept order");
                        } finally {
                            setLoading(false);
                        }
                    },
                },
                {
                    text: "Reject Order",
                    onPress: async () => {
                        try {
                            setLoading(true);
                            await vendorOrderAction(orderId, "reject");

                            // Update order in local state
                            const updatedOrders = orders.map((order) => (order._id === orderId ? { ...order, status: "cancelled" as OrderStatus } : order));
                            setOrders(updatedOrders);
                            filterOrders(updatedOrders, selectedFilter);

                            alert("Success", "Order rejected successfully");
                        } catch (error) {
                            console.error("Failed to reject order:", error);
                            alert("Error", "Failed to reject order");
                        } finally {
                            setLoading(false);
                        }
                    },
                    style: "destructive",
                },
            ]);
            return;
        }

        alert("Order Actions", "What would you like to do with this order?", [
            { text: "Cancel", style: "cancel" },
            {
                text: "View Details",
                onPress: () => navigation.navigate("VendorOrderDetails", { orderId }),
            },
            ...(orderStatus !== "delivered" && orderStatus !== "cancelled"
                ? [
                      {
                          text: "Mark as Processing",
                          onPress: () => handleOrderStatusUpdate(orderId, "processing"),
                      },
                      {
                          text: "Mark as Shipped",
                          onPress: () => handleOrderStatusUpdate(orderId, "shipped"),
                      },
                      {
                          text: "Mark as Delivered",
                          onPress: () => handleOrderStatusUpdate(orderId, "delivered"),
                      },
                      {
                          text: "Cancel Order",
                          style: "destructive" as "destructive",
                          onPress: () => handleOrderStatusUpdate(orderId, "cancelled"),
                      },
                  ]
                : []),
        ]);
    };

    const renderOrderItem = ({ item }: { item: Order }) => {
        const statusColor = getStatusColor(item.status);
        const statusIcon = getStatusIcon(item.status);

        return (
            <Card3D>
                <View style={styles.orderHeader}>
                    <View style={styles.orderInfo}>
                        <Text style={styles.orderNumber}>Order #{item.orderNumber}</Text>
                        <Text style={styles.orderDate}>{new Date(item.createdAt).toLocaleDateString()}</Text>
                    </View>
                    <View style={[styles.statusBadge, { backgroundColor: statusColor }]}>
                        <Ionicons name={statusIcon} size={16} color={theme.colors.white} />
                        <Text style={styles.statusText}>{item.status.toUpperCase()}</Text>
                    </View>
                </View>

                <View style={styles.customerInfo}>
                    <Text style={styles.customerName}>{item.user?.name || 'Unknown Customer'}</Text>
                    <Text style={styles.customerContact}>{item.user?.phone || 'No phone'}</Text>
                </View>

                <View style={styles.itemsContainer}>
                    {item.items.map((orderItem, index) => (
                        <View key={index} style={styles.itemRow}>
                            <Image
                                source={{ uri: orderItem.product?.image}}
                                style={styles.productImage}
                            />
                            <View style={styles.itemDetails}>
                                <Text style={styles.itemName}>{orderItem.product?.name || 'Unknown Product'}</Text>
                                <Text style={styles.itemQuantity}>Qty: {orderItem.quantity || 0}</Text>
                            </View>
                            <Text style={styles.itemPrice}>₹{(orderItem.price || 0) * (orderItem.quantity || 0)}</Text>
                        </View>
                    ))}
                </View>

                <View style={styles.orderFooter}>
                    <View style={styles.totalContainer}>
                        <Text style={styles.totalLabel}>Total Amount:</Text>
                        <Text style={styles.totalAmount}>₹{item.total || 0}</Text>
                    </View>
                    <View style={styles.paymentInfo}>
                        <Text style={styles.paymentMethod}>
                            Payment: {item.paymentMethod?.toUpperCase() || 'UNKNOWN'}
                        </Text>
                        <Text style={[
                            styles.paymentStatus,
                            { color: item.paymentStatus === 'paid' ? theme.colors.success : theme.colors.error }
                        ]}>
                            {item.paymentStatus?.toUpperCase() || 'PENDING'}
                        </Text>
                    </View>
                </View>

                <View style={styles.actionButtons}>
                    <TouchableOpacity
                        style={[styles.actionButton, styles.viewButton]}
                        onPress={() => handleOrderActions(item._id, item.status, item.paymentMethod)}
                    >
                        <Text style={styles.actionButtonText}>View Details</Text>
                    </TouchableOpacity>
                    {item.status === 'pending' && (
                        <TouchableOpacity
                            style={[styles.actionButton, styles.updateButton]}
                            onPress={() => handleOrderStatusUpdate(item._id, item.status)}
                        >
                            <Text style={styles.actionButtonText}>Update Status</Text>
                        </TouchableOpacity>
                    )}
                </View>
            </Card3D>
        );
    };

    if (loading && !refreshing) {
        return (
            <View style={styles.container}>
                <ScreenHeader title="Orders" showBackButton={false} />
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={theme.colors.primary} />
                </View>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <ScreenHeader title="Orders" showBackButton={true} onNotificationPress={handleNotificationPress} />

            <View style={styles.filterContainer}>
                <SegmentedControl values={ORDER_FILTERS} selectedIndex={selectedFilter} onChange={handleFilterChange} style={styles.segmentedControl} />
            </View>

            {error ? (
                <View style={styles.errorContainer}>
                    <Text style={styles.errorText}>{error}</Text>
                    <TouchableOpacity
                        style={styles.retryButton}
                        onPress={() => {
                            setLoading(true);
                            loadOrders(true);
                        }}
                    >
                        <Text style={styles.retryButtonText}>Retry</Text>
                    </TouchableOpacity>
                </View>
            ) : filteredOrders.length === 0 ? (
                <View style={styles.emptyContainer}>
                    <Ionicons name="receipt-outline" size={80} color={theme.colors.primary} style={styles.emptyIcon} />
                    <Text style={styles.emptyTextMain}>No orders found</Text>
                    <Text style={styles.emptyTextSub}>There are no {selectedFilter !== 0 ? ORDER_FILTERS[selectedFilter].toLowerCase() : ""} orders at the moment.</Text>
                </View>
            ) : (
                <FlatList
                    data={filteredOrders}
                    keyExtractor={(item) => item._id}
                    renderItem={renderOrderItem}
                    contentContainerStyle={styles.ordersList}
                    showsVerticalScrollIndicator={false}
                    refreshControl={
                        <RefreshControl
                            refreshing={refreshing}
                            onRefresh={() => {
                                setRefreshing(true);
                                loadOrders(true);
                            }}
                            colors={[theme.colors.primary]}
                        />
                    }
                    onEndReached={() => {
                        if (hasMore && !loadingMore) {
                            setLoadingMore(true);
                            setPage((prev) => prev + 1);
                        }
                    }}
                    onEndReachedThreshold={0.5}
                    ListFooterComponent={
                        loadingMore ? (
                            <View style={styles.loadingMore}>
                                <ActivityIndicator size="small" color={theme.colors.primary} />
                            </View>
                        ) : null
                    }
                />
            )}
        </View>
    );
};

const getStatusColor = (status: OrderStatus): string => {
    switch (status) {
        case "pending":
            return theme.colors.warning;
        case "processing":
            return theme.colors.info;
        case "shipped":
            return theme.colors.accent;
        case "delivered":
            return theme.colors.success;
        case "cancelled":
            return theme.colors.error;
        default:
            return theme.colors.gray;
    }
};

const getStatusIcon = (status: OrderStatus): any => {
    switch (status) {
        case "pending":
            return "time-outline";
        case "processing":
            return "hammer-outline";
        case "shipped":
            return "car-outline";
        case "delivered":
            return "checkmark-circle-outline";
        case "cancelled":
            return "close-circle-outline";
        default:
            return "help-circle-outline";
    }
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: theme.colors.background,
    },
    header: {
        padding: theme.spacing.md,
        backgroundColor: theme.colors.white,
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.lightGray,
    },
    title: {
        fontSize: 24,
        fontWeight: "bold",
        color: theme.colors.dark,
    },
    filterContainer: {
        padding: theme.spacing.sm,
        backgroundColor: theme.colors.white,
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.lightGray,
    },
    segmentedControl: {
        marginVertical: theme.spacing.xs,
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
        padding: theme.spacing.lg,
    },
    errorText: {
        fontSize: 16,
        color: theme.colors.error,
        marginBottom: theme.spacing.md,
        textAlign: "center",
    },
    retryButton: {
        backgroundColor: theme.colors.primary,
        paddingVertical: theme.spacing.sm,
        paddingHorizontal: theme.spacing.lg,
        borderRadius: theme.borderRadius.medium,
    },
    retryButtonText: {
        color: theme.colors.white,
        fontWeight: "bold",
    },
    emptyContainer: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        padding: theme.spacing.xl,
    },
    emptyIcon: {
        marginBottom: theme.spacing.md,
        opacity: 0.7,
    },
    emptyTextMain: {
        fontSize: 18,
        fontWeight: "bold",
        color: theme.colors.dark,
        marginBottom: theme.spacing.sm,
    },
    emptyTextSub: {
        fontSize: 16,
        color: theme.colors.gray,
        textAlign: "center",
    },
    ordersList: {
        padding: theme.spacing.md,
    },
    orderCard: {
        marginBottom: theme.spacing.md,
        backgroundColor: theme.colors.white,
    },
    orderCardContent: {
        padding: theme.spacing.md,
    },
    orderHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "flex-start",
        marginBottom: theme.spacing.sm,
    },
    orderNumber: {
        fontSize: 16,
        fontWeight: "bold",
        color: theme.colors.dark,
    },
    orderDate: {
        fontSize: 14,
        color: theme.colors.gray,
    },
    statusBadge: {
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: theme.spacing.sm,
        paddingVertical: 4,
        borderRadius: theme.borderRadius.small,
    },
    statusText: {
        fontSize: 12,
        fontWeight: "500",
        color: theme.colors.white,
        marginLeft: 4,
    },
    orderInfo: {
        marginBottom: theme.spacing.md,
    },
    infoRow: {
        flexDirection: "row",
        alignItems: "center",
        marginBottom: theme.spacing.xs,
    },
    customerName: {
        fontSize: 14,
        color: theme.colors.dark,
        marginLeft: theme.spacing.xs,
    },
    itemCount: {
        fontSize: 14,
        color: theme.colors.dark,
        marginLeft: theme.spacing.xs,
    },
    totalAmount: {
        fontSize: 14,
        fontWeight: "bold",
        color: theme.colors.dark,
        marginLeft: theme.spacing.xs,
    },
    paymentStatus: {
        fontSize: 14,
        fontWeight: "500",
        marginLeft: theme.spacing.xs,
    },
    orderFooter: {
        flexDirection: "row",
        justifyContent: "space-between",
        borderTopWidth: 1,
        borderTopColor: theme.colors.lightGray,
        paddingTop: theme.spacing.sm,
    },
    viewDetailsButton: {
        paddingVertical: theme.spacing.xs,
        paddingHorizontal: theme.spacing.sm,
    },
    viewDetailsText: {
        color: theme.colors.primary,
        fontWeight: "500",
    },
    actionButton: {
        backgroundColor: theme.colors.primary,
        paddingVertical: theme.spacing.xs,
        paddingHorizontal: theme.spacing.sm,
        borderRadius: theme.borderRadius.small,
    },
    actionButtonText: {
        color: theme.colors.white,
        fontWeight: "500",
    },
    disabledButton: {
        backgroundColor: theme.colors.lightGray,
    },
    disabledButtonText: {
        color: theme.colors.gray,
    },
    loadingMore: {
        padding: theme.spacing.md,
        justifyContent: "center",
        alignItems: "center",
    },
    customerInfo: {
        marginBottom: theme.spacing.md,
    },
    customerContact: {
        fontSize: 14,
        color: theme.colors.gray,
    },
    itemsContainer: {
        marginBottom: theme.spacing.md,
    },
    itemRow: {
        flexDirection: "row",
        alignItems: "center",
        marginBottom: theme.spacing.xs,
    },
    productImage: {
        width: 50,
        height: 50,
        borderRadius: theme.borderRadius.small,
        marginRight: theme.spacing.sm,
    },
    itemDetails: {
        flex: 1,
    },
    itemName: {
        fontSize: 14,
        fontWeight: "bold",
        color: theme.colors.dark,
    },
    itemQuantity: {
        fontSize: 14,
        color: theme.colors.gray,
    },
    itemPrice: {
        fontSize: 14,
        fontWeight: "bold",
        color: theme.colors.dark,
    },
    totalContainer: {
        flexDirection: "row",
        alignItems: "center",
    },
    totalLabel: {
        fontSize: 14,
        fontWeight: "bold",
        color: theme.colors.dark,
        marginRight: theme.spacing.xs,
    },
    paymentInfo: {
        flexDirection: "row",
        alignItems: "center",
    },
    paymentMethod: {
        fontSize: 14,
        fontWeight: "bold",
        color: theme.colors.dark,
        marginRight: theme.spacing.xs,
    },
    actionButtons: {
        flexDirection: "row",
        justifyContent: "space-between",
        paddingTop: theme.spacing.sm,
    },
    viewButton: {
        backgroundColor: theme.colors.primary,
        paddingVertical: theme.spacing.xs,
        paddingHorizontal: theme.spacing.sm,
        borderRadius: theme.borderRadius.small,
    },
    updateButton: {
        backgroundColor: theme.colors.primary,
        paddingVertical: theme.spacing.xs,
        paddingHorizontal: theme.spacing.sm,
        borderRadius: theme.borderRadius.small,
    },
});

export default VendorOrdersScreen;

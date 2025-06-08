import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, RefreshControl, Alert, Linking, Platform, Image, Modal } from "react-native";
import { FontAwesome } from "@expo/vector-icons";
import { format } from "date-fns";
import io from "socket.io-client";

import { theme } from "../theme";
import { getOrder, cancelOrder } from "../api/orderApi";
import { useNavigation, useRoute } from "../navigation/hooks";
import Card3D from "../components/Card3D";
import alert from "../utils/alert";
import MapViewComponent from "../components/MapView";
import { LocationService, Coordinates } from "../services/LocationService";
import OrderTrackingCard from "../components/OrderTrackingCard";

type OrderStatus = "pending" | "processing" | "shipped" | "delivered" | "cancelled";
type TrackingStatus = "preparing" | "ready_for_pickup" | "in_transit" | "delivered";
type PaymentStatus = "pending" | "paid" | "failed";

type OrderItem = {
    product: {
        _id: string;
        name: string;
        image?: string;
    };
    quantity: number;
    price: number;
    shop?: {
        _id: string;
        name: string;
        location?: {
            type: string;
            coordinates: number[];
        };
    };
};

type ShippingAddress = {
    _id: string;
    name: string;
    village: string;
    street: string;
    district: string;
    state: string;
    pincode: string;
    phone: string;
    location?: {
        type: string;
        coordinates: number[];
    };
};

type PaymentInfo = {
    method: string;
    razorpayOrderId?: string;
    razorpayPaymentId?: string;
    status: PaymentStatus;
};

type TrackingInfo = {
    currentLocation?: {
        type: string;
        coordinates: number[];
    };
    status?: TrackingStatus;
    eta?: string;
    distance?: number;
    route?: string;
    lastUpdated?: string;
};

interface BackendOrder {
    _id: string;
    orderNumber?: string;
    user: string;
    items: OrderItem[];
    shippingAddress: ShippingAddress;
    paymentMethod?: string;
    paymentStatus?: PaymentStatus;
    payment?: PaymentInfo;
    status: OrderStatus;
    totalAmount?: number;
    totalPrice?: number;
    tracking?: TrackingInfo;
    createdAt: string;
    updatedAt: string;
}

type Order = {
    _id: string;
    orderNumber: string;
    user: string;
    items: OrderItem[];
    shippingAddress: ShippingAddress;
    payment: PaymentInfo;
    status: OrderStatus;
    totalAmount: number;
    tracking?: TrackingInfo;
    createdAt: string;
    updatedAt: string;
};

const OrderDetailsScreen: React.FC = () => {
    const route = useRoute<"OrderDetails">();
    const navigation = useNavigation<"OrderDetails">();

    const { orderId } = route.params;
    const [order, setOrder] = useState<Order | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [refreshing, setRefreshing] = useState(false);
    const [showMap, setShowMap] = useState(false);

    useEffect(() => {
        loadOrderDetails();
    }, [orderId]);

    const loadOrderDetails = async () => {
        try {
            setLoading(true);
            const response = await getOrder(orderId);

            if (response.success) {
                // Convert any mismatched fields for consistency
                const backendData = response.data as BackendOrder;
                const normalizedOrder: Order = {
                    _id: backendData._id,
                    orderNumber: backendData.orderNumber || backendData._id.toString().slice(-6).toUpperCase(),
                    user: backendData.user,
                    items: backendData.items,
                    shippingAddress: backendData.shippingAddress,
                    payment: backendData.payment || {
                        method: backendData.paymentMethod || "not_specified",
                        status: backendData.paymentStatus || "pending",
                    },
                    status: backendData.status,
                    totalAmount: backendData.totalAmount || backendData.totalPrice || 0,
                    tracking: backendData.tracking,
                    createdAt: backendData.createdAt,
                    updatedAt: backendData.updatedAt,
                };
                setOrder(normalizedOrder);
            }

            setError(null);
        } catch (err: any) {
            setError(err.message || "Failed to load order details");
        } finally {
            setLoading(false);
        }
    };

    const handleRefresh = async () => {
        setRefreshing(true);
        try {
            await loadOrderDetails();
        } finally {
            setRefreshing(false);
        }
    };

    const handleCancelOrder = async () => {
        if (!order) return;

        if (order.status !== "pending" && order.status !== "processing") {
            alert("Cannot Cancel", "This order cannot be cancelled because it has already been shipped or delivered.");
            return;
        }

        alert("Cancel Order", "Are you sure you want to cancel this order?", [
            { text: "No", style: "cancel" },
            {
                text: "Yes, Cancel",
                style: "destructive",
                onPress: async () => {
                    try {
                        setLoading(true);
                        const response = await cancelOrder(orderId);
                        if (response.success) {
                            // Handle the response data properly
                            const backendData = response.data as BackendOrder;
                            const updatedOrder: Order = {
                                ...order,
                                status: backendData.status,
                            };
                            setOrder(updatedOrder);
                            alert("Success", "Order has been cancelled successfully.");
                        }
                    } catch (err: any) {
                        alert("Error", err.message || "Failed to cancel order");
                    } finally {
                        setLoading(false);
                    }
                },
            },
        ]);
    };

    const getStatusColor = (status: OrderStatus) => {
        switch (status) {
            case "pending":
                return theme.colors.warning;
            case "processing":
                return "#3498db"; // info blue
            case "shipped":
                return theme.colors.primary;
            case "delivered":
                return theme.colors.success;
            case "cancelled":
                return theme.colors.error;
            default:
                return theme.colors.textLight;
        }
    };

    const getStatusIcon = (status: OrderStatus) => {
        switch (status) {
            case "pending":
                return "clock-o";
            case "processing":
                return "refresh";
            case "shipped":
                return "truck";
            case "delivered":
                return "check-circle";
            case "cancelled":
                return "times-circle";
            default:
                return "question-circle";
        }
    };

    const getPaymentStatusColor = (status: PaymentStatus) => {
        switch (status) {
            case "pending":
                return theme.colors.warning;
            case "paid":
                return theme.colors.success;
            case "failed":
                return theme.colors.error;
            default:
                return theme.colors.textLight;
        }
    };

    const getTrackingStatusText = (status?: TrackingStatus) => {
        if (!status) return "Not Tracked";

        switch (status) {
            case "preparing":
                return "Preparing Your Order";
            case "ready_for_pickup":
                return "Ready for Pickup";
            case "in_transit":
                return "Out for Delivery";
            case "delivered":
                return "Delivered";
            default:
                return "Unknown Status";
        }
    };

    const getTrackingStatusIcon = (status?: TrackingStatus) => {
        if (!status) return "question-circle";

        switch (status) {
            case "preparing":
                return "cutlery";
            case "ready_for_pickup":
                return "shopping-bag";
            case "in_transit":
                return "truck";
            case "delivered":
                return "check-circle";
            default:
                return "question-circle";
        }
    };

    const formatAddress = (address: ShippingAddress) => {
        return `${address.street}, ${address.village}, ${address.district}, ${address.state} - ${address.pincode}`;
    };

    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        return date.toLocaleDateString("en-US", {
            year: "numeric",
            month: "long",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit",
        });
    };

    const handleViewTracking = () => {
        navigation.navigate("OrderTracking", { orderId });
    };

    if (loading && !refreshing) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={theme.colors.primary} />
            </View>
        );
    }

    if (error) {
        return (
            <View style={styles.errorContainer}>
                <Text style={styles.errorText}>{error}</Text>
                <TouchableOpacity style={styles.retryButton} onPress={loadOrderDetails}>
                    <Text style={styles.retryButtonText}>Retry</Text>
                </TouchableOpacity>
            </View>
        );
    }

    if (!order) {
        return (
            <View style={styles.errorContainer}>
                <Text style={styles.errorText}>Order not found</Text>
                <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
                    <Text style={styles.backButtonText}>Go Back</Text>
                </TouchableOpacity>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <ScrollView style={styles.scrollView} contentContainerStyle={styles.contentContainer} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}>
                {/* Order Summary Card */}
                <Card3D style={styles.card}>
                    <View style={styles.orderHeader}>
                        <View>
                            <Text style={styles.orderNumber}>Order #{order.orderNumber}</Text>
                            <Text style={styles.orderDate}>{formatDate(order.createdAt)}</Text>
                        </View>
                        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(order.status) + "20" }]}>
                            <FontAwesome name={getStatusIcon(order.status)} size={14} color={getStatusColor(order.status)} style={styles.statusIcon} />
                            <Text style={[styles.statusText, { color: getStatusColor(order.status) }]}>{order.status.charAt(0).toUpperCase() + order.status.slice(1)}</Text>
                        </View>
                    </View>
                </Card3D>

                {/* Tracking Card */}
                {order.status !== "cancelled" && (
                    <Card3D style={styles.card}>
                        <Text style={styles.sectionTitle}>Tracking Information</Text>
                        <OrderTrackingCard orderId={orderId} onViewMapPress={() => setShowMap(true)} />
                        <TouchableOpacity style={styles.viewTrackingButton} onPress={handleViewTracking}>
                            <Text style={styles.viewTrackingButtonText}>View Detailed Tracking</Text>
                            <FontAwesome name="chevron-right" size={14} color={theme.colors.primary} style={{ marginLeft: 8 }} />
                        </TouchableOpacity>
                    </Card3D>
                )}

                {/* Shipping Address Card */}
                <Card3D style={styles.card}>
                    <Text style={styles.sectionTitle}>Shipping Information</Text>
                    <View style={styles.addressContainer}>
                        <FontAwesome name="map-marker" size={18} color={theme.colors.primary} style={styles.addressIcon} />
                        <View style={styles.addressContent}>
                            <Text style={styles.addressName}>{order.shippingAddress.name}</Text>
                            <Text style={styles.addressText}>
                                {order.shippingAddress.street}, {order.shippingAddress.village}
                            </Text>
                            <Text style={styles.addressText}>
                                {order.shippingAddress.district}, {order.shippingAddress.state} - {order.shippingAddress.pincode}
                            </Text>
                            <Text style={styles.addressText}>Phone: {order.shippingAddress.phone}</Text>
                        </View>
                    </View>
                </Card3D>

                {/* Payment Information Card */}
                <Card3D style={styles.card}>
                    <Text style={styles.sectionTitle}>Payment Information</Text>
                    <View style={styles.paymentContainer}>
                        <View style={styles.paymentRow}>
                            <Text style={styles.paymentLabel}>Payment Method</Text>
                            <Text style={styles.paymentValue}>
                                {order.payment?.method === "razorpay" ? "Online Payment" : order.payment?.method === "cash_on_delivery" ? "Cash on Delivery" : order.payment?.method || "Not specified"}
                            </Text>
                        </View>
                        <View style={styles.paymentRow}>
                            <Text style={styles.paymentLabel}>Payment Status</Text>
                            <View
                                style={[
                                    styles.paymentStatusBadge,
                                    {
                                        backgroundColor: getPaymentStatusColor(order.payment?.status || "pending") + "20",
                                    },
                                ]}
                            >
                                <Text
                                    style={[
                                        styles.paymentStatusText,
                                        {
                                            color: getPaymentStatusColor(order.payment?.status || "pending"),
                                        },
                                    ]}
                                >
                                    {(order.payment?.status || "pending").charAt(0).toUpperCase() + (order.payment?.status || "pending").slice(1)}
                                </Text>
                            </View>
                        </View>
                    </View>
                </Card3D>

                {/* Order Items Card */}
                <Card3D style={styles.card}>
                    <Text style={styles.sectionTitle}>Order Items</Text>
                    {order.items.map((item, index) => (
                        <View key={index} style={[styles.orderItem, index < order.items.length - 1 && styles.orderItemDivider]}>
                            <Image source={{ uri: item.product?.image || "https://via.placeholder.com/100" }} style={styles.productImage} />
                            <View style={styles.productDetails}>
                                <Text style={styles.productName}>{item.product?.name}</Text>
                                <Text style={styles.productPrice}>
                                    ₹{item.price.toFixed(2)} x {item.quantity}
                                </Text>
                                <Text style={styles.productTotal}>
                                    Total: <Text style={styles.boldText}>₹{(item.price * item.quantity).toFixed(2)}</Text>
                                </Text>
                            </View>
                        </View>
                    ))}

                    <View style={styles.summaryContainer}>
                        <View style={styles.summaryRow}>
                            <Text style={styles.summaryLabel}>Subtotal</Text>
                            <Text style={styles.summaryValue}>₹{order.items.reduce((sum, item) => sum + item.price * item.quantity, 0).toFixed(2)}</Text>
                        </View>

                        <View style={styles.summaryRow}>
                            <Text style={styles.summaryLabel}>Delivery Fee</Text>
                            <Text style={styles.summaryValue}>₹0.00</Text>
                        </View>

                        <View style={[styles.summaryRow, styles.totalRow]}>
                            <Text style={styles.totalLabel}>Order Total</Text>
                            <Text style={styles.totalValue}>₹{order.totalAmount.toFixed(2)}</Text>
                        </View>
                    </View>
                </Card3D>

                {/* Actions Card - only show if order can be cancelled */}
                {(order.status === "pending" || order.status === "processing") && (
                    <Card3D style={styles.card}>
                        <Text style={styles.sectionTitle}>Order Actions</Text>
                        <TouchableOpacity style={styles.cancelButton} onPress={handleCancelOrder}>
                            <FontAwesome name="times-circle" size={18} color={theme.colors.white} />
                            <Text style={styles.cancelButtonText}>Cancel Order</Text>
                        </TouchableOpacity>
                    </Card3D>
                )}
            </ScrollView>

            {/* Map Modal */}
            <Modal visible={showMap} animationType="slide" transparent={false} onRequestClose={() => setShowMap(false)}>
                <View style={styles.mapContainer}>
                    <TouchableOpacity style={styles.closeMapButton} onPress={() => setShowMap(false)}>
                        <FontAwesome name="close" size={24} color="#fff" />
                    </TouchableOpacity>

                    {order?.tracking?.currentLocation?.coordinates && (
                        <MapViewComponent
                            showsUserLocation={true}
                            markers={[
                                {
                                    id: "delivery",
                                    coordinate: {
                                        latitude: order.tracking.currentLocation.coordinates[1],
                                        longitude: order.tracking.currentLocation.coordinates[0],
                                    },
                                    title: order.shippingAddress?.name,
                                    description: formatAddress(order.shippingAddress),
                                    pinColor: theme.colors.primary,
                                },
                            ]}
                        />
                    )}
                </View>
            </Modal>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: theme.colors.background,
    },
    scrollView: {
        flex: 1,
    },
    contentContainer: {
        padding: theme.spacing.md,
        paddingBottom: theme.spacing.lg * 2,
    },
    card: {
        marginBottom: theme.spacing.md,
        padding: theme.spacing.md,
    },
    orderHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
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
        marginTop: 4,
    },
    statusBadge: {
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 20,
    },
    statusIcon: {
        marginRight: 4,
    },
    statusText: {
        fontSize: 14,
        fontWeight: "500",
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: "bold",
        color: theme.colors.dark,
        marginBottom: theme.spacing.sm,
    },
    addressContainer: {
        flexDirection: "row",
        alignItems: "flex-start",
    },
    addressIcon: {
        marginTop: 2,
        marginRight: theme.spacing.sm,
    },
    addressContent: {
        flex: 1,
    },
    addressName: {
        fontSize: 16,
        fontWeight: "500",
        color: theme.colors.dark,
        marginBottom: 2,
    },
    addressText: {
        fontSize: 14,
        color: theme.colors.gray,
        marginBottom: 2,
    },
    paymentContainer: {
        marginTop: theme.spacing.xs,
    },
    paymentRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: theme.spacing.sm,
    },
    paymentLabel: {
        fontSize: 14,
        color: theme.colors.gray,
    },
    paymentValue: {
        fontSize: 14,
        fontWeight: "500",
        color: theme.colors.dark,
    },
    paymentStatusBadge: {
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 12,
    },
    paymentStatusText: {
        fontSize: 12,
        fontWeight: "500",
    },
    orderItem: {
        flexDirection: "row",
        padding: theme.spacing.sm,
    },
    orderItemDivider: {
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.border,
    },
    productImage: {
        width: 60,
        height: 60,
        borderRadius: 8,
        marginRight: theme.spacing.sm,
    },
    productDetails: {
        flex: 1,
        justifyContent: "center",
    },
    productName: {
        fontSize: 16,
        fontWeight: "500",
        color: theme.colors.dark,
        marginBottom: 2,
    },
    productPrice: {
        fontSize: 14,
        color: theme.colors.gray,
        marginBottom: 2,
    },
    productTotal: {
        fontSize: 14,
        color: theme.colors.dark,
    },
    boldText: {
        fontWeight: "600",
    },
    summaryContainer: {
        marginTop: theme.spacing.md,
        paddingTop: theme.spacing.sm,
        borderTopWidth: 1,
        borderTopColor: theme.colors.border,
    },
    summaryRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        marginBottom: 8,
    },
    summaryLabel: {
        fontSize: 14,
        color: theme.colors.gray,
    },
    summaryValue: {
        fontSize: 14,
        color: theme.colors.dark,
    },
    totalRow: {
        marginTop: 4,
        paddingTop: 8,
        borderTopWidth: 1,
        borderTopColor: theme.colors.border,
    },
    totalLabel: {
        fontSize: 16,
        fontWeight: "bold",
        color: theme.colors.dark,
    },
    totalValue: {
        fontSize: 16,
        fontWeight: "bold",
        color: theme.colors.primary,
    },
    viewTrackingButton: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        paddingVertical: theme.spacing.sm,
        marginTop: theme.spacing.sm,
        borderTopWidth: 1,
        borderTopColor: theme.colors.border,
    },
    viewTrackingButtonText: {
        fontSize: 14,
        fontWeight: "500",
        color: theme.colors.primary,
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
        color: theme.colors.error,
        fontSize: 16,
        textAlign: "center",
        marginBottom: theme.spacing.md,
    },
    retryButton: {
        backgroundColor: theme.colors.primary,
        paddingHorizontal: theme.spacing.md,
        paddingVertical: theme.spacing.sm,
        borderRadius: theme.borderRadius.medium,
    },
    retryButtonText: {
        color: theme.colors.white,
        fontWeight: "500",
    },
    backButton: {
        backgroundColor: theme.colors.primary,
        paddingHorizontal: theme.spacing.md,
        paddingVertical: theme.spacing.sm,
        borderRadius: theme.borderRadius.medium,
    },
    backButtonText: {
        color: theme.colors.white,
        fontWeight: "500",
    },
    mapContainer: {
        flex: 1,
    },
    closeMapButton: {
        position: "absolute",
        top: 40,
        right: 20,
        zIndex: 1,
        backgroundColor: "rgba(0, 0, 0, 0.5)",
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: "center",
        alignItems: "center",
    },
    cancelButton: {
        backgroundColor: theme.colors.error,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        padding: theme.spacing.sm,
        borderRadius: theme.borderRadius.medium,
    },
    cancelButtonText: {
        color: theme.colors.white,
        fontWeight: "500",
        marginLeft: 8,
    },
});

export default OrderDetailsScreen;

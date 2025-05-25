import React, { useState, useEffect } from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Alert, Image, SafeAreaView, Animated } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { useRoute } from "@react-navigation/core";
import { RouteProp } from "@react-navigation/native";
import { Ionicons, MaterialIcons, FontAwesome5 } from "@expo/vector-icons";

import Card3D from "../../components/Card3D";
import ScreenHeader from "../../components/ScreenHeader";
import { theme } from "../../theme";
import { MainStackNavigationProp, MainStackParamList } from "../../navigation/types";
import { getVendorOrder, updateOrderStatus, vendorOrderAction } from "../../api/orderApi";
import { VendorOrder } from "../../api/orderApi";

type OrderDetailsRouteProp = RouteProp<MainStackParamList, "VendorOrderDetails">;

const VendorOrderDetailsScreen: React.FC = () => {
    const navigation = useNavigation<MainStackNavigationProp<"VendorOrderDetails">>();
    const route = useRoute<OrderDetailsRouteProp>();
    const { orderId } = route.params;

    const [order, setOrder] = useState<VendorOrder | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [updatingStatus, setUpdatingStatus] = useState(false);
    const [activeSection, setActiveSection] = useState("summary");

    // Animation values
    const scaleAnim = useState(new Animated.Value(0.95))[0];
    const opacityAnim = useState(new Animated.Value(0))[0];

    useEffect(() => {
        // Run entrance animation
        Animated.parallel([
            Animated.spring(scaleAnim, {
                toValue: 1,
                friction: 8,
                tension: 40,
                useNativeDriver: true,
            }),
            Animated.timing(opacityAnim, {
                toValue: 1,
                duration: 300,
                useNativeDriver: true,
            }),
        ]).start();

        fetchOrderDetails();
    }, [orderId]);

    const fetchOrderDetails = async () => {
        try {
            setLoading(true);
            const response = await getVendorOrder(orderId);
            if (response.success) {
                setOrder(response.data);
            } else {
                setError("Failed to load order details");
            }
        } catch (error) {
            console.error("Failed to load order details:", error);
            setError("Failed to load order details");
        } finally {
            setLoading(false);
        }
    };

    const handleStatusUpdate = (newStatus: string) => {
        if (!order) return;

        setUpdatingStatus(true);

        // For COD orders in pending status, use the accept/reject workflow
        if (order.status === "pending" && order.paymentMethod === "cash_on_delivery" && (newStatus === "processing" || newStatus === "cancelled")) {
            const action = newStatus === "processing" ? "accept" : "reject";

            vendorOrderAction(orderId, action)
                .then(() => {
                    // Update local order state with new status
                    setOrder((prevOrder) => {
                        if (!prevOrder) return null;
                        return {
                            ...prevOrder,
                            status: newStatus as any,
                        };
                    });
                    Alert.alert("Success", `Order ${action === "accept" ? "accepted" : "rejected"} successfully.`);
                })
                .catch((error) => {
                    console.error(`Failed to ${action} order:`, error);
                    Alert.alert("Error", `Failed to ${action} order.`);
                })
                .finally(() => {
                    setUpdatingStatus(false);
                });

            return;
        }

        // For other status updates
        updateOrderStatus(orderId, newStatus as any)
            .then(() => {
                // Update local order state with new status
                setOrder((prevOrder) => {
                    if (!prevOrder) return null;
                    return {
                        ...prevOrder,
                        status: newStatus as any,
                    };
                });
                Alert.alert("Success", `Order status updated to ${newStatus} successfully.`);
            })
            .catch((error) => {
                console.error("Failed to update order status:", error);
                Alert.alert("Error", "Failed to update order status.");
            })
            .finally(() => {
                setUpdatingStatus(false);
            });
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

    const formatCurrency = (amount: number) => {
        return amount.toLocaleString("en-IN", {
            style: "currency",
            currency: "INR",
            minimumFractionDigits: 2,
        });
    };

    const getNextPossibleStatuses = (): { label: string; value: string; icon: string }[] => {
        if (!order) return [];

        switch (order.status) {
            case "pending":
                return [
                    { label: "Accept Order", value: "processing", icon: "thumbs-up" },
                    { label: "Reject Order", value: "cancelled", icon: "thumbs-down" },
                ];
            case "processing":
                return [
                    { label: "Mark as Shipped", value: "shipped", icon: "shipping-fast" },
                    { label: "Cancel Order", value: "cancelled", icon: "ban" },
                ];
            case "shipped":
                return [{ label: "Mark as Delivered", value: "delivered", icon: "check-circle" }];
            default:
                return [];
        }
    };

    if (loading) {
        return (
            <SafeAreaView style={styles.safeArea}>
                <ScreenHeader title="Order Details" showBackButton={true} />
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={theme.colors.primary} />
                </View>
            </SafeAreaView>
        );
    }

    if (error || !order) {
        return (
            <SafeAreaView style={styles.safeArea}>
                <ScreenHeader title="Order Details" showBackButton={true} />
                <View style={styles.errorContainer}>
                    <Text style={styles.errorText}>{error || "Order not found"}</Text>
                    <TouchableOpacity style={styles.retryButton} onPress={() => navigation.goBack()}>
                        <Text style={styles.retryButtonText}>Go Back</Text>
                    </TouchableOpacity>
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.safeArea}>
            <ScreenHeader title="Order Details" showBackButton={true} />

            <Animated.View
                style={[
                    styles.animatedContainer,
                    {
                        opacity: opacityAnim,
                        transform: [{ scale: scaleAnim }],
                    },
                ]}
            >
                <ScrollView contentContainerStyle={styles.contentContainer}>
                    {/* Status Header */}
                    <Card3D style={styles.statusCard} elevation="medium">
                        <View style={styles.orderHeader}>
                            <View>
                                <Text style={styles.orderNumber}>Order #{order.orderNumber}</Text>
                                <Text style={styles.orderDate}>{formatDate(order.createdAt)}</Text>
                            </View>
                            <View style={[styles.statusBadge, { backgroundColor: getStatusColor(order.status) }]}>
                                <Text style={styles.statusText}>{order.status.toUpperCase()}</Text>
                            </View>
                        </View>

                        {/* Quick Action Buttons */}
                        {getNextPossibleStatuses().length > 0 && (
                            <View style={styles.actionButtons}>
                                {getNextPossibleStatuses().map((statusOption) => (
                                    <TouchableOpacity
                                        key={statusOption.value}
                                        style={[styles.actionButton, { backgroundColor: getActionButtonColor(statusOption.value) }]}
                                        onPress={() => handleStatusUpdate(statusOption.value)}
                                        disabled={updatingStatus}
                                    >
                                        <FontAwesome5 name={statusOption.icon} size={16} color="white" style={styles.actionIcon} />
                                        <Text style={styles.actionButtonText}>{statusOption.label}</Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        )}
                    </Card3D>

                    {/* Navigation Tabs */}
                    <View style={styles.tabContainer}>
                        <TouchableOpacity style={[styles.tab, activeSection === "summary" && styles.activeTab]} onPress={() => setActiveSection("summary")}>
                            <Text style={[styles.tabText, activeSection === "summary" && styles.activeTabText]}>Summary</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={[styles.tab, activeSection === "items" && styles.activeTab]} onPress={() => setActiveSection("items")}>
                            <Text style={[styles.tabText, activeSection === "items" && styles.activeTabText]}>Items</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={[styles.tab, activeSection === "customer" && styles.activeTab]} onPress={() => setActiveSection("customer")}>
                            <Text style={[styles.tabText, activeSection === "customer" && styles.activeTabText]}>Customer</Text>
                        </TouchableOpacity>
                    </View>

                    {/* Summary Section */}
                    {activeSection === "summary" && (
                        <Card3D style={styles.card} elevation="medium">
                            <Text style={styles.cardTitle}>Order Summary</Text>

                            <View style={styles.summaryRow}>
                                <View style={styles.summaryItem}>
                                    <Ionicons name="cart-outline" size={24} color={theme.colors.primary} />
                                    <Text style={styles.summaryLabel}>Items</Text>
                                    <Text style={styles.summaryValue}>{order.items.length}</Text>
                                </View>

                                <View style={styles.summaryItem}>
                                    <Ionicons name="wallet-outline" size={24} color={theme.colors.primary} />
                                    <Text style={styles.summaryLabel}>Payment</Text>
                                    <Text style={styles.summaryValue}>{order.paymentMethod === "cash_on_delivery" ? "COD" : "Online"}</Text>
                                </View>

                                <View style={styles.summaryItem}>
                                    <Ionicons name="card-outline" size={24} color={theme.colors.primary} />
                                    <Text style={styles.summaryLabel}>Status</Text>
                                    <Text style={styles.summaryValue}>{order.paymentStatus === "paid" ? "Paid" : "Pending"}</Text>
                                </View>
                            </View>

                            <View style={styles.divider} />

                            <View style={styles.priceRow}>
                                <Text style={styles.priceLabel}>Total Amount:</Text>
                                <Text style={styles.priceValue}>{formatCurrency(order.total)}</Text>
                            </View>
                        </Card3D>
                    )}

                    {/* Items Section */}
                    {activeSection === "items" && (
                        <Card3D style={styles.card} elevation="medium">
                            <Text style={styles.cardTitle}>Order Items</Text>

                            {order.items.map((item, index) => (
                                <View key={index} style={styles.itemContainer}>
                                    <View style={styles.itemImageContainer}>
                                        {item.product.image ? (
                                            <Image source={{ uri: item.product.image }} style={styles.itemImage} resizeMode="cover" />
                                        ) : (
                                            <View style={styles.noImageContainer}>
                                                <Ionicons name="image-outline" size={30} color={theme.colors.lightGray} />
                                            </View>
                                        )}
                                    </View>

                                    <View style={styles.itemDetails}>
                                        <Text style={styles.itemName}>{item.product.name}</Text>
                                        <Text style={styles.itemPrice}>
                                            {formatCurrency(item.price)} × {item.quantity}
                                        </Text>
                                    </View>

                                    <Text style={styles.itemTotal}>{formatCurrency(item.price * item.quantity)}</Text>
                                </View>
                            ))}
                        </Card3D>
                    )}

                    {/* Customer Section */}
                    {activeSection === "customer" && (
                        <Card3D style={styles.card} elevation="medium">
                            <Text style={styles.cardTitle}>Customer Information</Text>

                            <View style={styles.infoRow}>
                                <Ionicons name="person-outline" size={18} color={theme.colors.gray} />
                                <Text style={styles.infoLabel}>Name:</Text>
                                <Text style={styles.infoValue}>{order.user.name}</Text>
                            </View>

                            <View style={styles.infoRow}>
                                <Ionicons name="mail-outline" size={18} color={theme.colors.gray} />
                                <Text style={styles.infoLabel}>Email:</Text>
                                <Text style={styles.infoValue}>{order.user.email}</Text>
                            </View>

                            <View style={styles.infoRow}>
                                <Ionicons name="call-outline" size={18} color={theme.colors.gray} />
                                <Text style={styles.infoLabel}>Phone:</Text>
                                <Text style={styles.infoValue}>{order.user.phone || order.shippingAddress.phone || "N/A"}</Text>
                            </View>

                            <View style={styles.divider} />

                            <Text style={styles.addressTitle}>Shipping Address</Text>

                            <View style={styles.addressContainer}>
                                <Ionicons name="location-outline" size={24} color={theme.colors.primary} style={styles.addressIcon} />
                                <View style={styles.addressDetails}>
                                    <Text style={styles.addressText}>
                                        {order.shippingAddress.street}, {order.shippingAddress.city}
                                    </Text>
                                    <Text style={styles.addressText}>
                                        {order.shippingAddress.state} - {order.shippingAddress.pincode}
                                    </Text>
                                    <Text style={styles.addressText}>Phone: {order.shippingAddress.phone}</Text>
                                </View>
                            </View>
                        </Card3D>
                    )}
                </ScrollView>
            </Animated.View>
        </SafeAreaView>
    );
};

const getStatusColor = (status: string): string => {
    switch (status) {
        case "pending":
            return theme.colors.warning;
        case "processing":
            return theme.colors.info;
        case "shipped":
            return theme.colors.secondary;
        case "delivered":
            return theme.colors.success;
        case "cancelled":
            return theme.colors.error;
        default:
            return theme.colors.gray;
    }
};

const getActionButtonColor = (status: string): string => {
    switch (status) {
        case "processing":
            return theme.colors.primary;
        case "shipped":
            return theme.colors.info;
        case "delivered":
            return theme.colors.success;
        case "cancelled":
            return theme.colors.error;
        default:
            return theme.colors.primary;
    }
};

const styles = StyleSheet.create({
    safeArea: {
        flex: 1,
        backgroundColor: theme.colors.background,
    },
    animatedContainer: {
        flex: 1,
    },
    contentContainer: {
        padding: 16,
        paddingBottom: 32,
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
        fontSize: 18,
        color: theme.colors.error,
        textAlign: "center",
        marginBottom: 20,
    },
    retryButton: {
        backgroundColor: theme.colors.primary,
        padding: 12,
        borderRadius: 8,
    },
    retryButtonText: {
        color: theme.colors.white,
        fontSize: 16,
        fontWeight: "600",
    },
    card: {
        marginBottom: 16,
        padding: 16,
        borderRadius: 16,
    },
    statusCard: {
        marginBottom: 16,
        padding: 16,
        borderRadius: 16,
        backgroundColor: theme.colors.background,
    },
    orderHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "flex-start",
        marginBottom: 16,
    },
    orderNumber: {
        fontSize: 18,
        fontWeight: "bold",
        color: theme.colors.text,
        marginBottom: 4,
    },
    orderDate: {
        fontSize: 14,
        color: theme.colors.gray,
    },
    statusBadge: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 16,
        justifyContent: "center",
        alignItems: "center",
    },
    statusText: {
        color: theme.colors.white,
        fontSize: 12,
        fontWeight: "bold",
    },
    actionButtons: {
        flexDirection: "row",
        justifyContent: "space-around",
        marginTop: 8,
    },
    actionButton: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        paddingVertical: 10,
        paddingHorizontal: 16,
        borderRadius: 8,
        marginHorizontal: 4,
        flex: 1,
    },
    actionIcon: {
        marginRight: 6,
    },
    actionButtonText: {
        color: theme.colors.white,
        fontWeight: "600",
        fontSize: 14,
    },
    tabContainer: {
        flexDirection: "row",
        marginBottom: 16,
        backgroundColor: theme.colors.background,
        borderRadius: 12,
        overflow: "hidden",
    },
    tab: {
        flex: 1,
        paddingVertical: 12,
        alignItems: "center",
    },
    activeTab: {
        backgroundColor: theme.colors.primary,
    },
    tabText: {
        color: theme.colors.text,
        fontWeight: "500",
    },
    activeTabText: {
        color: theme.colors.white,
        fontWeight: "600",
    },
    cardTitle: {
        fontSize: 18,
        fontWeight: "bold",
        color: theme.colors.text,
        marginBottom: 16,
    },
    summaryRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        marginBottom: 16,
    },
    summaryItem: {
        alignItems: "center",
        flex: 1,
    },
    summaryLabel: {
        fontSize: 14,
        color: theme.colors.gray,
        marginTop: 8,
        marginBottom: 4,
    },
    summaryValue: {
        fontSize: 16,
        fontWeight: "600",
        color: theme.colors.text,
    },
    divider: {
        height: 1,
        backgroundColor: theme.colors.border,
        marginVertical: 16,
    },
    priceRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
    },
    priceLabel: {
        fontSize: 16,
        color: theme.colors.text,
        fontWeight: "600",
    },
    priceValue: {
        fontSize: 18,
        color: theme.colors.primary,
        fontWeight: "bold",
    },
    itemContainer: {
        flexDirection: "row",
        padding: 12,
        marginBottom: 8,
        backgroundColor: theme.colors.lightGray,
        borderRadius: 12,
        alignItems: "center",
    },
    itemImageContainer: {
        width: 60,
        height: 60,
        borderRadius: 8,
        overflow: "hidden",
        backgroundColor: theme.colors.lightGray,
    },
    itemImage: {
        width: "100%",
        height: "100%",
    },
    noImageContainer: {
        width: "100%",
        height: "100%",
        justifyContent: "center",
        alignItems: "center",
    },
    itemDetails: {
        flex: 1,
        marginLeft: 12,
    },
    itemName: {
        fontSize: 16,
        fontWeight: "600",
        color: theme.colors.text,
        marginBottom: 4,
    },
    itemPrice: {
        fontSize: 14,
        color: theme.colors.gray,
    },
    itemTotal: {
        fontSize: 16,
        fontWeight: "600",
        color: theme.colors.text,
    },
    infoRow: {
        flexDirection: "row",
        alignItems: "center",
        marginBottom: 12,
    },
    infoLabel: {
        fontSize: 15,
        color: theme.colors.gray,
        marginLeft: 8,
        marginRight: 8,
        width: 50,
    },
    infoValue: {
        fontSize: 15,
        color: theme.colors.text,
        flex: 1,
    },
    addressTitle: {
        fontSize: 16,
        fontWeight: "600",
        color: theme.colors.text,
        marginBottom: 12,
    },
    addressContainer: {
        flexDirection: "row",
        alignItems: "flex-start",
        backgroundColor: theme.colors.lightGray,
        borderRadius: 12,
        padding: 12,
    },
    addressIcon: {
        marginRight: 12,
        marginTop: 2,
    },
    addressDetails: {
        flex: 1,
    },
    addressText: {
        fontSize: 14,
        color: theme.colors.text,
        marginBottom: 4,
    },
});

export default VendorOrderDetailsScreen;

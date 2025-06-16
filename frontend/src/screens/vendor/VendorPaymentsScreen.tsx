import React, { useState, useCallback } from "react";
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, RefreshControl, Modal, ScrollView } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/core";

import Card3D from "../../components/Card3D";
import ScreenHeader from "../../components/ScreenHeader";
import { theme } from "../../theme";
import SegmentedControl from "../../components/SegmentedControl";
import { MainStackNavigationProp } from "../../navigation/types";
import alert from "../../utils/alert";
import { getVendorOrders, updateOrderStatus, VendorOrder } from "../../api/orderApi";

const paymentFilterOptions = ["All", "Pending", "Processing", "Completed", "Failed"];

// Map order payment status to payment screen status
const mapPaymentStatus = (status: string): "pending" | "processing" | "completed" | "failed" => {
    switch (status) {
        case "paid":
            return "completed";
        case "pending":
            return "pending";
        case "failed":
            return "failed";
        default:
            return "processing";
    }
};

const VendorPaymentsScreen: React.FC = () => {
    const navigation = useNavigation<MainStackNavigationProp<"VendorPayments">>();
    const [payments, setPayments] = useState<VendorOrder[]>([]);
    const [filteredPayments, setFilteredPayments] = useState<VendorOrder[]>([]);
    const [selectedFilterIndex, setSelectedFilterIndex] = useState(0);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [loadingMore, setLoadingMore] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [selectedPayment, setSelectedPayment] = useState<VendorOrder | null>(null);
    const [showDetailsModal, setShowDetailsModal] = useState(false);
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(true);
    const [totalItems, setTotalItems] = useState(0);

    // Calculate total earnings
    const completedPaymentsTotal = payments.filter((payment) => payment.paymentStatus === "paid").reduce((sum, payment) => sum + payment.total, 0);

    // Calculate pending payouts
    const pendingPaymentsTotal = payments.filter((payment) => payment.paymentStatus === "pending").reduce((sum, payment) => sum + payment.total, 0);

    const loadPayments = useCallback(async (pageNum = 1, shouldAppend = false) => {
        try {
            if (pageNum === 1) {
                setLoading(true);
            } else {
                setLoadingMore(true);
            }

            // Get orders from the API with pagination
            const response = await getVendorOrders(pageNum, 10);

            if (response.success) {
                const newPayments = response.data;

                // Update state based on whether we're appending or replacing
                if (shouldAppend) {
                    setPayments((prevPayments) => [...prevPayments, ...newPayments]);
                } else {
                    setPayments(newPayments);
                }

                // Update pagination info
                setTotalItems(response.count);
                setHasMore(!!response.pagination?.next);
                setPage(pageNum);
            } else {
                setError("Failed to load payment data");
            }
        } catch (err) {
            console.error("Failed to load payments:", err);
            setError("Failed to load payments. Please try again.");
        } finally {
            setLoading(false);
            setLoadingMore(false);
        }
    }, []);

    // Move filter logic outside of loadPayments
    const applyCurrentFilter = useCallback(() => {
        const filter = paymentFilterOptions[selectedFilterIndex].toLowerCase();

        if (filter === "all") {
            setFilteredPayments(payments);
        } else {
            setFilteredPayments(payments.filter((payment) => mapPaymentStatus(payment.paymentStatus) === filter));
        }
    }, [payments, selectedFilterIndex]);

    // Apply filter whenever payments or selectedFilterIndex changes
    React.useEffect(() => {
        applyCurrentFilter();
    }, [applyCurrentFilter, payments, selectedFilterIndex]);

    useFocusEffect(
        useCallback(() => {
            let isMounted = true;

            const fetchData = async () => {
                if (isMounted) {
                    await loadPayments(1, false);
                }
            };

            fetchData();

            return () => {
                isMounted = false;
            };
        }, [loadPayments])
    );

    const handleFilterChange = (index: number) => {
        setSelectedFilterIndex(index);
    };

    const handleLoadMore = () => {
        if (hasMore && !loading && !refreshing && !loadingMore) {
            loadPayments(page + 1, true);
        }
    };

    const onRefresh = useCallback(() => {
        setRefreshing(true);
        loadPayments(1, false).finally(() => {
            setRefreshing(false);
        });
    }, [loadPayments]);

    const handlePaymentDetails = (payment: VendorOrder) => {
        setSelectedPayment(payment);
        setShowDetailsModal(true);
    };

    const closeDetailsModal = () => {
        setShowDetailsModal(false);
        setSelectedPayment(null);
    };

    // Functions for payment actions
    const handleSendReminder = async (paymentId: string) => {
        alert("Reminder Sent", "Payment reminder has been sent to the customer.");
    };

    const handleViewOrder = (orderId: string) => {
        navigation.navigate("VendorOrderDetails", { orderId });
    };

    const handleActionPress = (payment: VendorOrder) => {
        alert("Payment Actions", `Order #${payment.orderNumber}`, [
            { text: "Cancel", style: "cancel" },
            {
                text: "View Details",
                onPress: () => handlePaymentDetails(payment),
            },
            {
                text: "View Order",
                onPress: () => handleViewOrder(payment._id),
            },
            ...(payment.paymentStatus === "pending"
                ? [
                      {
                          text: "Send Reminder",
                          onPress: () => handleSendReminder(payment._id),
                      },
                  ]
                : []),
        ]);
    };

    const renderPaymentItem = ({ item }: { item: VendorOrder }) => {
        const statusColor = getStatusColor(item.paymentStatus);
        const statusIcon = getStatusIcon(item.paymentStatus);

        return (
            <Card3D>
                <View style={styles.paymentHeader}>
                    <View style={styles.paymentInfo}>
                        <Text style={styles.orderNumber}>Order #{item.orderNumber}</Text>
                        <Text style={styles.paymentDate}>{new Date(item.createdAt).toLocaleDateString()}</Text>
                    </View>
                    <View style={[styles.statusBadge, { backgroundColor: statusColor }]}>
                        <Ionicons name={statusIcon as any} size={16} color={theme.colors.white} />
                        <Text style={styles.statusText}>{item.paymentStatus?.toUpperCase() || 'PENDING'}</Text>
                    </View>
                </View>

                <View style={styles.customerInfo}>
                    <Text style={styles.customerName}>{item.user?.name || 'Unknown Customer'}</Text>
                    <Text style={styles.customerContact}>{item.user?.phone || 'No phone'}</Text>
                </View>

                <View style={styles.paymentDetails}>
                    <View style={styles.amountContainer}>
                        <Text style={styles.amountLabel}>Amount:</Text>
                        <Text style={styles.amount}>₹{item.total || 0}</Text>
                    </View>
                    <View style={styles.methodContainer}>
                        <Text style={styles.methodLabel}>Method:</Text>
                        <Text style={styles.method}>{item.paymentMethod?.toUpperCase() || 'UNKNOWN'}</Text>
                    </View>
                </View>

                <View style={styles.actionButtons}>
                    <TouchableOpacity
                        style={[styles.actionButton, styles.viewButton]}
                        onPress={() => handlePaymentDetails(item)}
                    >
                        <Text style={styles.actionButtonText}>View Details</Text>
                    </TouchableOpacity>
                    {item.paymentStatus === 'pending' && (
                        <TouchableOpacity
                            style={[styles.actionButton, styles.reminderButton]}
                            onPress={() => handleSendReminder(item._id)}
                        >
                            <Text style={styles.actionButtonText}>Send Reminder</Text>
                        </TouchableOpacity>
                    )}
                </View>
            </Card3D>
        );
    };

    // Render payment details modal
    const renderDetailsModal = () => {
        if (!selectedPayment) return null;

        return (
            <Modal
                visible={!!selectedPayment}
                transparent
                animationType="slide"
                onRequestClose={closeDetailsModal}
            >
                <View style={styles.modalContainer}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Payment Details</Text>
                            <TouchableOpacity onPress={closeDetailsModal}>
                                <Ionicons name="close" size={24} color={theme.colors.dark} />
                            </TouchableOpacity>
                        </View>

                        <ScrollView style={styles.modalBody}>
                            <View style={styles.detailRow}>
                                <Text style={styles.detailLabel}>Order Number:</Text>
                                <Text style={styles.detailValue}>{selectedPayment.orderNumber}</Text>
                            </View>

                            <View style={styles.detailRow}>
                                <Text style={styles.detailLabel}>Customer:</Text>
                                <Text style={styles.detailValue}>{selectedPayment.user?.name || 'Unknown Customer'}</Text>
                            </View>

                            <View style={styles.detailRow}>
                                <Text style={styles.detailLabel}>Amount:</Text>
                                <Text style={styles.detailValue}>₹{selectedPayment.total || 0}</Text>
                            </View>

                            <View style={styles.detailRow}>
                                <Text style={styles.detailLabel}>Payment Method:</Text>
                                <Text style={styles.detailValue}>{selectedPayment.paymentMethod?.toUpperCase() || 'UNKNOWN'}</Text>
                            </View>

                            <View style={styles.detailRow}>
                                <Text style={styles.detailLabel}>Status:</Text>
                                <Text style={[styles.detailValue, { color: getStatusColor(selectedPayment.paymentStatus) }]}>
                                    {selectedPayment.paymentStatus?.toUpperCase() || 'PENDING'}
                                </Text>
                            </View>

                            <View style={styles.detailRow}>
                                <Text style={styles.detailLabel}>Date:</Text>
                                <Text style={styles.detailValue}>
                                    {new Date(selectedPayment.createdAt).toLocaleString()}
                                </Text>
                            </View>
                        </ScrollView>

                        <View style={styles.modalFooter}>
                            <TouchableOpacity
                                style={[styles.modalButton, styles.closeButton]}
                                onPress={closeDetailsModal}
                            >
                                <Text style={styles.modalButtonText}>Close</Text>
                            </TouchableOpacity>
                            {selectedPayment.paymentStatus === 'pending' && (
                                <TouchableOpacity
                                    style={[styles.modalButton, styles.reminderButton]}
                                    onPress={() => handleSendReminder(selectedPayment._id)}
                                >
                                    <Text style={styles.modalButtonText}>Send Reminder</Text>
                                </TouchableOpacity>
                            )}
                        </View>
                    </View>
                </View>
            </Modal>
        );
    };

    const renderFooter = () => {
        if (!loadingMore) return null;

        return (
            <View style={styles.footerLoader}>
                <ActivityIndicator size="small" color={theme.colors.primary} />
                <Text style={styles.footerText}>Loading more...</Text>
            </View>
        );
    };

    return (
        <View style={styles.container}>
            <ScreenHeader title="Payments" showBackButton={true} />

            <Card3D style={styles.summaryCard} elevation="medium">
                <View style={styles.summaryItem}>
                    <Text style={styles.summaryLabel}>Total Earnings</Text>
                    <Text style={styles.summaryAmount}>₹{completedPaymentsTotal.toFixed(2)}</Text>
                </View>
                <View style={styles.divider} />
                <View style={styles.summaryItem}>
                    <Text style={styles.summaryLabel}>Pending</Text>
                    <Text style={styles.summaryAmount}>₹{pendingPaymentsTotal.toFixed(2)}</Text>
                </View>
            </Card3D>

            <SegmentedControl values={paymentFilterOptions} selectedIndex={selectedFilterIndex} onChange={handleFilterChange} style={styles.filterControl} />

            {loading && !loadingMore ? (
                <View style={styles.loaderContainer}>
                    <ActivityIndicator size="large" color={theme.colors.primary} />
                </View>
            ) : error ? (
                <View style={styles.errorContainer}>
                    <Text style={styles.errorText}>{error}</Text>
                    <TouchableOpacity style={styles.retryButton} onPress={() => loadPayments(1, false)}>
                        <Text style={styles.retryButtonText}>Retry</Text>
                    </TouchableOpacity>
                </View>
            ) : filteredPayments.length === 0 ? (
                <View style={styles.emptyContainer}>
                    <Ionicons name="cash-outline" size={64} color={theme.colors.gray} />
                    <Text style={styles.emptyText}>No payments found</Text>
                </View>
            ) : (
                <FlatList
                    data={filteredPayments}
                    keyExtractor={(item) => item._id}
                    renderItem={renderPaymentItem}
                    contentContainerStyle={styles.listContent}
                    showsVerticalScrollIndicator={false}
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
                    onEndReached={handleLoadMore}
                    onEndReachedThreshold={0.5}
                    ListFooterComponent={renderFooter}
                />
            )}

            {renderDetailsModal()}
        </View>
    );
};

// Helper function to get status color
const getStatusColor = (status: string): string => {
    switch (status) {
        case "completed":
            return theme.colors.success;
        case "pending":
            return theme.colors.warning;
        case "processing":
            return theme.colors.info;
        case "failed":
            return theme.colors.error;
        default:
            return theme.colors.gray;
    }
};

const getStatusIcon = (status: string): string => {
    switch (status) {
        case "completed":
            return "checkmark-circle";
        case "pending":
            return "hourglass";
        case "processing":
            return "refresh";
        case "failed":
            return "close-circle";
        default:
            return "help-circle";
    }
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: theme.colors.background,
        padding: 15,
    },
    summaryCard: {
        flexDirection: "row",
        justifyContent: "space-between",
        paddingVertical: 15,
        paddingHorizontal: 20,
        marginBottom: 15,
        borderRadius: 12,
    },
    summaryItem: {
        flex: 1,
        alignItems: "center",
    },
    summaryLabel: {
        fontSize: 14,
        color: theme.colors.gray,
        marginBottom: 4,
        fontWeight: "500",
    },
    summaryAmount: {
        fontSize: 20,
        fontWeight: "bold",
        color: theme.colors.text,
    },
    divider: {
        width: 1,
        height: "80%",
        backgroundColor: theme.colors.border,
        alignSelf: "center",
    },
    filterControl: {
        marginBottom: 15,
    },
    paymentCard: {
        padding: 15,
        marginBottom: 12,
        borderRadius: 12,
    },
    paymentHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 10,
    },
    paymentInfo: {
        flex: 1,
    },
    orderNumber: {
        fontSize: 14,
        fontWeight: "bold",
        color: theme.colors.text,
    },
    paymentDate: {
        fontSize: 12,
        color: theme.colors.gray,
        marginTop: 2,
    },
    statusBadge: {
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 12,
    },
    statusText: {
        color: "#fff",
        fontSize: 12,
        fontWeight: "600",
    },
    customerInfo: {
        marginTop: 5,
    },
    customerName: {
        fontSize: 14,
        fontWeight: "bold",
        color: theme.colors.text,
    },
    customerContact: {
        fontSize: 12,
        color: theme.colors.gray,
        marginTop: 2,
    },
    paymentDetails: {
        marginTop: 5,
    },
    amountContainer: {
        marginBottom: 5,
    },
    amountLabel: {
        fontSize: 14,
        color: theme.colors.gray,
        marginRight: 5,
    },
    amount: {
        fontSize: 14,
        color: theme.colors.text,
        fontWeight: "bold",
    },
    methodContainer: {
        marginBottom: 5,
    },
    methodLabel: {
        fontSize: 14,
        color: theme.colors.gray,
        marginRight: 5,
    },
    method: {
        fontSize: 14,
        color: theme.colors.text,
        fontWeight: "bold",
    },
    actionButtons: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginTop: 10,
    },
    actionButton: {
        paddingHorizontal: 15,
        paddingVertical: 10,
        borderRadius: 8,
        flex: 1,
        alignItems: "center",
        marginHorizontal: 5,
    },
    viewButton: {
        backgroundColor: theme.colors.primary,
    },
    reminderButton: {
        backgroundColor: theme.colors.warning,
    },
    actionButtonText: {
        color: "#fff",
        fontWeight: "600",
    },
    loaderContainer: {
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
        fontSize: 16,
        color: theme.colors.error,
        marginBottom: 15,
        textAlign: "center",
    },
    retryButton: {
        backgroundColor: theme.colors.primary,
        paddingHorizontal: 20,
        paddingVertical: 10,
        borderRadius: 8,
    },
    retryButtonText: {
        color: "#fff",
        fontWeight: "600",
        fontSize: 16,
    },
    emptyContainer: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        padding: 20,
    },
    emptyText: {
        fontSize: 16,
        color: theme.colors.gray,
        marginTop: 15,
        textAlign: "center",
    },
    listContent: {
        paddingBottom: 20,
    },
    footerLoader: {
        flexDirection: "row",
        justifyContent: "center",
        alignItems: "center",
        padding: 10,
    },
    footerText: {
        marginLeft: 10,
        fontSize: 14,
        color: theme.colors.gray,
    },
    modalContainer: {
        flex: 1,
        backgroundColor: "rgba(0, 0, 0, 0.5)",
        justifyContent: "center",
        alignItems: "center",
    },
    modalContent: {
        backgroundColor: theme.colors.background,
        borderRadius: 12,
        width: "90%",
        maxHeight: "80%",
        padding: 20,
    },
    modalHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 15,
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: "bold",
        color: theme.colors.text,
    },
    modalBody: {
        marginBottom: 20,
    },
    detailRow: {
        flexDirection: "row",
        alignItems: "center",
        marginBottom: 10,
    },
    detailLabel: {
        fontSize: 14,
        color: theme.colors.gray,
        width: 100,
    },
    detailValue: {
        fontSize: 14,
        color: theme.colors.text,
        flex: 1,
    },
    modalFooter: {
        flexDirection: "row",
        justifyContent: "space-between",
    },
    modalButton: {
        paddingHorizontal: 15,
        paddingVertical: 10,
        borderRadius: 8,
        flex: 1,
        alignItems: "center",
        marginHorizontal: 5,
    },
    closeButton: {
        backgroundColor: theme.colors.primary,
    },
    modalButtonText: {
        color: "#fff",
        fontWeight: "600",
    },
});

export default VendorPaymentsScreen;

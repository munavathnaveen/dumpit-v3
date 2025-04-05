import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/core';

import Card3D from '../../components/Card3D';
import { theme } from '../../theme';
import SegmentedControl from '../../components/SegmentedControl';
import { MainStackNavigationProp } from '../../navigation/types';

// Mock data for payments
// In a real application, this would come from an API
interface Payment {
  id: string;
  amount: number;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  date: string;
  orderId: string;
  orderNumber: string;
  paymentMethod: string;
  transactionId: string;
}

const mockPayments: Payment[] = [
  {
    id: '1',
    amount: 1750.00,
    status: 'completed',
    date: '2024-06-10T10:30:00Z',
    orderId: 'ord123',
    orderNumber: 'ORD-12345',
    paymentMethod: 'Bank Transfer',
    transactionId: 'TXN78945612',
  },
  {
    id: '2',
    amount: 2500.50,
    status: 'pending',
    date: '2024-06-05T14:45:00Z',
    orderId: 'ord124',
    orderNumber: 'ORD-12346',
    paymentMethod: 'Bank Transfer',
    transactionId: 'TXN78945613',
  },
  {
    id: '3',
    amount: 3450.75,
    status: 'processing',
    date: '2024-06-01T09:15:00Z',
    orderId: 'ord125',
    orderNumber: 'ORD-12347',
    paymentMethod: 'Bank Transfer',
    transactionId: 'TXN78945614',
  },
  {
    id: '4',
    amount: 1200.25,
    status: 'completed',
    date: '2024-05-25T16:20:00Z',
    orderId: 'ord126',
    orderNumber: 'ORD-12348',
    paymentMethod: 'Bank Transfer',
    transactionId: 'TXN78945615',
  },
  {
    id: '5',
    amount: 980.50,
    status: 'failed',
    date: '2024-05-20T11:10:00Z',
    orderId: 'ord127',
    orderNumber: 'ORD-12349',
    paymentMethod: 'Bank Transfer',
    transactionId: 'TXN78945616',
  },
];

const paymentFilterOptions = ['All', 'Pending', 'Processing', 'Completed', 'Failed'];

const VendorPaymentsScreen: React.FC = () => {
  const navigation = useNavigation<MainStackNavigationProp<'VendorPayments'>>();
  const [payments, setPayments] = useState<Payment[]>([]);
  const [filteredPayments, setFilteredPayments] = useState<Payment[]>([]);
  const [selectedFilterIndex, setSelectedFilterIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Calculate total earnings
  const completedPaymentsTotal = payments
    .filter(payment => payment.status === 'completed')
    .reduce((sum, payment) => sum + payment.amount, 0);

  // Calculate pending payouts
  const pendingPaymentsTotal = payments
    .filter(payment => payment.status === 'pending' || payment.status === 'processing')
    .reduce((sum, payment) => sum + payment.amount, 0);

  const loadPayments = useCallback(async () => {
    try {
      setLoading(true);
      // In a real app, this would be an API call
      // const response = await getVendorPayments();
      // setPayments(response);
      
      // Using mock data for now
      setPayments(mockPayments);
      
      // Initially show all payments
      setFilteredPayments(mockPayments);
      setError(null);
    } catch (err) {
      console.error('Failed to load payments:', err);
      setError('Failed to load payments. Please try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadPayments();
    }, [loadPayments])
  );

  const handleFilterChange = (index: number) => {
    setSelectedFilterIndex(index);
    const filter = paymentFilterOptions[index].toLowerCase();
    
    if (filter === 'all') {
      setFilteredPayments(payments);
    } else {
      setFilteredPayments(
        payments.filter(payment => payment.status.toLowerCase() === filter)
      );
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadPayments();
    setRefreshing(false);
  };

  const handlePaymentDetails = (payment: Payment) => {
    // In a real app, navigate to payment details screen
    Alert.alert(
      'Payment Details',
      `Payment ID: ${payment.id}\nAmount: ₹${payment.amount.toFixed(2)}\nStatus: ${payment.status}\nTransaction ID: ${payment.transactionId}\nOrder: ${payment.orderNumber}\nDate: ${new Date(payment.date).toLocaleString()}`
    );
  };

  const renderPaymentItem = ({ item }: { item: Payment }) => {
    return (
      <TouchableOpacity
        onPress={() => handlePaymentDetails(item)}
        activeOpacity={0.7}
      >
        <Card3D style={styles.paymentCard} elevation="small">
          <View style={styles.paymentHeader}>
            <View>
              <Text style={styles.paymentAmount}>₹{item.amount.toFixed(2)}</Text>
              <Text style={styles.paymentDate}>
                {new Date(item.date).toLocaleDateString('en-IN', {
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric',
                })}
              </Text>
            </View>
            <View style={[
              styles.statusBadge,
              { backgroundColor: getStatusColor(item.status) }
            ]}>
              <Text style={styles.statusText}>
                {item.status.charAt(0).toUpperCase() + item.status.slice(1)}
              </Text>
            </View>
          </View>
          
          <View style={styles.paymentDetails}>
            <View style={styles.detailRow}>
              <Ionicons name="receipt-outline" size={16} color={theme.colors.gray} />
              <Text style={styles.detailLabel}>Order:</Text>
              <Text style={styles.detailValue}>{item.orderNumber}</Text>
            </View>
            
            <View style={styles.detailRow}>
              <Ionicons name="card-outline" size={16} color={theme.colors.gray} />
              <Text style={styles.detailLabel}>Method:</Text>
              <Text style={styles.detailValue}>{item.paymentMethod}</Text>
            </View>
            
            <View style={styles.detailRow}>
              <Ionicons name="key-outline" size={16} color={theme.colors.gray} />
              <Text style={styles.detailLabel}>Transaction ID:</Text>
              <Text style={styles.detailValue} numberOfLines={1} ellipsizeMode="middle">
                {item.transactionId}
              </Text>
            </View>
          </View>

          <View style={styles.viewDetailsContainer}>
            <Text style={styles.viewDetailsText}>View Details</Text>
            <Ionicons name="chevron-forward" size={16} color={theme.colors.primary} />
          </View>
        </Card3D>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Payments</Text>
      </View>

      {/* Summary Cards */}
      <View style={styles.summaryContainer}>
        <Card3D style={[styles.summaryCard, styles.earningsCard]} elevation="medium">
          <Text style={styles.summaryLabel}>Total Earnings</Text>
          <Text style={styles.summaryAmount}>₹{completedPaymentsTotal.toFixed(2)}</Text>
          <View style={styles.summaryIconContainer}>
            <Ionicons name="cash-outline" size={24} color={theme.colors.white} />
          </View>
        </Card3D>

        <Card3D style={[styles.summaryCard, styles.pendingCard]} elevation="medium">
          <Text style={styles.summaryLabel}>Pending Payouts</Text>
          <Text style={styles.summaryAmount}>₹{pendingPaymentsTotal.toFixed(2)}</Text>
          <View style={styles.summaryIconContainer}>
            <Ionicons name="time-outline" size={24} color={theme.colors.white} />
          </View>
        </Card3D>
      </View>

      {/* Filter Controls */}
      <View style={styles.filterContainer}>
        <SegmentedControl
          values={paymentFilterOptions}
          selectedIndex={selectedFilterIndex}
          onChange={handleFilterChange}
        />
      </View>

      {loading && !refreshing ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
        </View>
      ) : error ? (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={loadPayments}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : filteredPayments.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="cash-outline" size={64} color={theme.colors.lightGray} />
          <Text style={styles.emptyText}>No payments found</Text>
        </View>
      ) : (
        <FlatList
          data={filteredPayments}
          renderItem={renderPaymentItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              colors={[theme.colors.primary]}
              tintColor={theme.colors.primary}
            />
          }
        />
      )}

      {/* Withdraw Button */}
      <TouchableOpacity
        style={styles.withdrawButton}
        onPress={() => {
          Alert.alert(
            'Withdraw Funds',
            'This feature will be available soon!',
            [{ text: 'OK' }]
          );
        }}
      >
        <Ionicons name="wallet-outline" size={20} color={theme.colors.white} />
        <Text style={styles.withdrawButtonText}>Withdraw Funds</Text>
      </TouchableOpacity>
    </View>
  );
};

const getStatusColor = (status: string): string => {
  switch (status.toLowerCase()) {
    case 'pending':
      return theme.colors.warning;
    case 'processing':
      return theme.colors.info;
    case 'completed':
      return theme.colors.success;
    case 'failed':
      return theme.colors.error;
    default:
      return theme.colors.gray;
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
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: theme.colors.dark,
  },
  summaryContainer: {
    flexDirection: 'row',
    paddingHorizontal: theme.spacing.md,
    marginTop: theme.spacing.md,
  },
  summaryCard: {
    flex: 1,
    padding: theme.spacing.md,
    height: 100,
    borderRadius: theme.borderRadius.medium,
    marginHorizontal: theme.spacing.xs,
    position: 'relative',
    overflow: 'hidden',
  },
  earningsCard: {
    backgroundColor: theme.colors.primary,
  },
  pendingCard: {
    backgroundColor: theme.colors.accent,
  },
  summaryLabel: {
    fontSize: 14,
    color: theme.colors.white,
    opacity: 0.9,
    marginBottom: theme.spacing.xs,
  },
  summaryAmount: {
    fontSize: 20,
    fontWeight: 'bold',
    color: theme.colors.white,
  },
  summaryIconContainer: {
    position: 'absolute',
    right: theme.spacing.sm,
    bottom: theme.spacing.sm,
    opacity: 0.2,
  },
  filterContainer: {
    paddingHorizontal: theme.spacing.md,
    marginVertical: theme.spacing.md,
  },
  listContainer: {
    padding: theme.spacing.md,
    paddingBottom: 90, // Space for the withdraw button
  },
  paymentCard: {
    backgroundColor: theme.colors.white,
    borderRadius: theme.borderRadius.medium,
    marginBottom: theme.spacing.md,
    padding: theme.spacing.md,
  },
  paymentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: theme.spacing.sm,
  },
  paymentAmount: {
    fontSize: 18,
    fontWeight: 'bold',
    color: theme.colors.dark,
  },
  paymentDate: {
    fontSize: 12,
    color: theme.colors.gray,
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 4,
    borderRadius: theme.borderRadius.small,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '500',
    color: theme.colors.white,
  },
  paymentDetails: {
    marginTop: theme.spacing.xs,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  detailLabel: {
    fontSize: 12,
    color: theme.colors.gray,
    marginLeft: theme.spacing.xs,
    width: 90,
  },
  detailValue: {
    fontSize: 12,
    color: theme.colors.dark,
    flex: 1,
  },
  viewDetailsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginTop: theme.spacing.xs,
  },
  viewDetailsText: {
    fontSize: 12,
    color: theme.colors.primary,
    fontWeight: '500',
    marginRight: 4,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: theme.spacing.lg,
  },
  errorText: {
    fontSize: 16,
    color: theme.colors.error,
    marginBottom: theme.spacing.md,
    textAlign: 'center',
  },
  retryButton: {
    backgroundColor: theme.colors.primary,
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.lg,
    borderRadius: theme.borderRadius.medium,
  },
  retryButtonText: {
    color: theme.colors.white,
    fontWeight: 'bold',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: theme.spacing.lg,
  },
  emptyText: {
    fontSize: 16,
    color: theme.colors.gray,
    marginTop: theme.spacing.md,
    textAlign: 'center',
  },
  withdrawButton: {
    position: 'absolute',
    bottom: theme.spacing.md,
    left: theme.spacing.md,
    right: theme.spacing.md,
    backgroundColor: theme.colors.primary,
    borderRadius: theme.borderRadius.medium,
    paddingVertical: theme.spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    ...theme.shadow.medium,
  },
  withdrawButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: theme.colors.white,
    marginLeft: theme.spacing.xs,
  },
});

export default VendorPaymentsScreen; 
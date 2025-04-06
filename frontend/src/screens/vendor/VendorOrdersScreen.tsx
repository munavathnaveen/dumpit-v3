import React, { useState, useEffect, useCallback } from 'react';
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
import { useFocusEffect } from '@react-navigation/core';
import { Ionicons } from '@expo/vector-icons';
import { useSelector } from 'react-redux';

import { theme } from '../../theme';
import Card3D from '../../components/Card3D';
import SegmentedControl from '../../components/SegmentedControl';
import { MainStackNavigationProp } from '../../navigation/types';
import { getVendorOrders, updateOrderStatus } from '../../api/orderApi';
import ScreenHeader from '../../components/ScreenHeader';
import { RootState } from '../../store';

type OrderStatus = 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled';

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
    street: string;
    city: string;
    state: string;
    pincode: string;
    phone: string;
  };
  paymentMethod: string;
  paymentStatus: 'pending' | 'paid' | 'failed';
  createdAt: string;
  updatedAt: string;
}

// Filter options for the orders
const ORDER_FILTERS = ['All', 'Pending', 'Processing', 'Shipped', 'Delivered', 'Cancelled'];

const VendorOrdersScreen: React.FC = () => {
  const navigation = useNavigation<MainStackNavigationProp<'VendorOrders'>>();
  
  const [orders, setOrders] = useState<Order[]>([]);
  const [filteredOrders, setFilteredOrders] = useState<Order[]>([]);
  const [selectedFilter, setSelectedFilter] = useState(0); // 0 is 'All'
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadOrders = useCallback(async () => {
    try {
      setError(null);
      const data = await getVendorOrders();
      setOrders(data);
      filterOrders(data, selectedFilter);
    } catch (error) {
      console.error('Failed to load orders:', error);
      setError('Failed to load orders');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [selectedFilter]);

  useEffect(() => {
    loadOrders();
  }, [loadOrders]);

  useFocusEffect(
    useCallback(() => {
      loadOrders();
    }, [loadOrders])
  );

  const filterOrders = (ordersList: Order[], filterIndex: number) => {
    if (filterIndex === 0) {
      // 'All' filter
      setFilteredOrders(ordersList);
    } else {
      const status = ORDER_FILTERS[filterIndex].toLowerCase() as OrderStatus;
      const filtered = ordersList.filter(order => order.status === status);
      setFilteredOrders(filtered);
    }
  };

  const handleFilterChange = (index: number) => {
    setSelectedFilter(index);
    filterOrders(orders, index);
  };

  const handleRefresh = () => {
    setRefreshing(true);
    loadOrders();
  };

  const handleOrderStatusUpdate = (orderId: string, currentStatus: OrderStatus) => {
    // Define possible next statuses based on current status
    let nextStatuses: { [key: string]: OrderStatus } = {};
    
    switch (currentStatus) {
      case 'pending':
        nextStatuses = {
          'Accept Order': 'processing',
          'Cancel Order': 'cancelled',
        };
        break;
      case 'processing':
        nextStatuses = {
          'Mark as Shipped': 'shipped',
          'Cancel Order': 'cancelled',
        };
        break;
      case 'shipped':
        nextStatuses = {
          'Mark as Delivered': 'delivered',
        };
        break;
      case 'delivered':
      case 'cancelled':
        // No further status changes allowed
        Alert.alert('Status Locked', 'This order is in a final state and cannot be updated.');
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
          const updatedOrders = orders.map(order => 
            order._id === orderId ? { ...order, status } : order
          );
          setOrders(updatedOrders);
          filterOrders(updatedOrders, selectedFilter);
          
          Alert.alert('Success', `Order ${status === 'cancelled' ? 'cancelled' : 'updated'} successfully`);
        } catch (error) {
          console.error('Failed to update order status:', error);
          Alert.alert('Error', 'Failed to update order status');
        } finally {
          setLoading(false);
        }
      },
    }));

    // Add cancel button
    alertButtons.push({
      text: 'Cancel',
      // @ts-ignore
      style: 'cancel',
    } as any);

    Alert.alert(
      'Update Order Status',
      'What would you like to do with this order?',
      alertButtons as any
    );
  };

  const renderOrderItem = ({ item }: { item: Order }) => {
    const orderDate = new Date(item.createdAt).toLocaleDateString();
    const statusColor = getStatusColor(item.status);
    const statusIcon = getStatusIcon(item.status);
    
    return (
      <Card3D style={styles.orderCard} elevation="small">
        <TouchableOpacity
          style={styles.orderCardContent}
          onPress={() => navigation.navigate('VendorOrderDetails', { orderId: item._id })}
        >
          <View style={styles.orderHeader}>
            <View>
              <Text style={styles.orderNumber}>Order #{item.orderNumber}</Text>
              <Text style={styles.orderDate}>{orderDate}</Text>
            </View>
            
            <View style={[styles.statusBadge, { backgroundColor: statusColor }]}>
              <Ionicons name={statusIcon} size={14} color={theme.colors.white} />
              <Text style={styles.statusText}>{item.status.charAt(0).toUpperCase() + item.status.slice(1)}</Text>
            </View>
          </View>
          
          <View style={styles.orderInfo}>
            <View style={styles.infoRow}>
              <Ionicons name="person-outline" size={16} color={theme.colors.gray} />
              <Text style={styles.customerName}>{item.user.name}</Text>
            </View>
            
            <View style={styles.infoRow}>
              <Ionicons name="cube-outline" size={16} color={theme.colors.gray} />
              <Text style={styles.itemCount}>
                {item.items.length} {item.items.length === 1 ? 'item' : 'items'}
              </Text>
            </View>
            
            <View style={styles.infoRow}>
              <Ionicons name="cash-outline" size={16} color={theme.colors.gray} />
              <Text style={styles.totalAmount}>₹{item.total.toFixed(2)}</Text>
            </View>
            
            <View style={styles.infoRow}>
              <Ionicons name="card-outline" size={16} color={theme.colors.gray} />
              <Text style={[
                styles.paymentStatus, 
                { color: item.paymentStatus === 'paid' ? theme.colors.success : theme.colors.warning }
              ]}>
                {item.paymentStatus.charAt(0).toUpperCase() + item.paymentStatus.slice(1)}
              </Text>
            </View>
          </View>
          
          <View style={styles.orderFooter}>
            <TouchableOpacity
              style={styles.viewDetailsButton}
              onPress={() => navigation.navigate('VendorOrderDetails', { orderId: item._id })}
            >
              <Text style={styles.viewDetailsText}>View Details</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[
                styles.actionButton,
                (item.status === 'delivered' || item.status === 'cancelled') && styles.disabledButton
              ]}
              onPress={() => handleOrderStatusUpdate(item._id, item.status)}
              disabled={item.status === 'delivered' || item.status === 'cancelled'}
            >
              <Text style={[
                styles.actionButtonText,
                (item.status === 'delivered' || item.status === 'cancelled') && styles.disabledButtonText
              ]}>
                Update Status
              </Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
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
      <ScreenHeader title="Orders" showBackButton={true} />
      
      <View style={styles.filterContainer}>
        <SegmentedControl
          values={ORDER_FILTERS}
          selectedIndex={selectedFilter}
          onChange={handleFilterChange}
          style={styles.segmentedControl}
        />
      </View>
      
      {error ? (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity 
            style={styles.retryButton}
            onPress={loadOrders}
          >
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : filteredOrders.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="receipt-outline" size={80} color={theme.colors.primary} style={styles.emptyIcon} />
          <Text style={styles.emptyTextMain}>No orders found</Text>
          <Text style={styles.emptyTextSub}>
            There are no {selectedFilter !== 0 ? ORDER_FILTERS[selectedFilter].toLowerCase() : ''} orders at the moment.
          </Text>
        </View>
      ) : (
        <FlatList
          data={filteredOrders}
          renderItem={renderOrderItem}
          keyExtractor={(item) => item._id}
          contentContainerStyle={styles.ordersList}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              colors={[theme.colors.primary]}
            />
          }
        />
      )}
    </View>
  );
};

const getStatusColor = (status: OrderStatus): string => {
  switch (status) {
    case 'pending':
      return theme.colors.warning;
    case 'processing':
      return theme.colors.info;
    case 'shipped':
      return theme.colors.accent;
    case 'delivered':
      return theme.colors.success;
    case 'cancelled':
      return theme.colors.error;
    default:
      return theme.colors.gray;
  }
};

const getStatusIcon = (status: OrderStatus): any => {
  switch (status) {
    case 'pending':
      return 'time-outline';
    case 'processing':
      return 'hammer-outline';
    case 'shipped':
      return 'car-outline';
    case 'delivered':
      return 'checkmark-circle-outline';
    case 'cancelled':
      return 'close-circle-outline';
    default:
      return 'help-circle-outline';
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
    fontWeight: 'bold',
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
    padding: theme.spacing.xl,
  },
  emptyIcon: {
    marginBottom: theme.spacing.md,
    opacity: 0.7,
  },
  emptyTextMain: {
    fontSize: 18,
    fontWeight: 'bold',
    color: theme.colors.dark,
    marginBottom: theme.spacing.sm,
  },
  emptyTextSub: {
    fontSize: 16,
    color: theme.colors.gray,
    textAlign: 'center',
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: theme.spacing.sm,
  },
  orderNumber: {
    fontSize: 16,
    fontWeight: 'bold',
    color: theme.colors.dark,
  },
  orderDate: {
    fontSize: 14,
    color: theme.colors.gray,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 4,
    borderRadius: theme.borderRadius.small,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '500',
    color: theme.colors.white,
    marginLeft: 4,
  },
  orderInfo: {
    marginBottom: theme.spacing.md,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
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
    fontWeight: 'bold',
    color: theme.colors.dark,
    marginLeft: theme.spacing.xs,
  },
  paymentStatus: {
    fontSize: 14,
    fontWeight: '500',
    marginLeft: theme.spacing.xs,
  },
  orderFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
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
    fontWeight: '500',
  },
  actionButton: {
    backgroundColor: theme.colors.primary,
    paddingVertical: theme.spacing.xs,
    paddingHorizontal: theme.spacing.sm,
    borderRadius: theme.borderRadius.small,
  },
  actionButtonText: {
    color: theme.colors.white,
    fontWeight: '500',
  },
  disabledButton: {
    backgroundColor: theme.colors.lightGray,
  },
  disabledButtonText: {
    color: theme.colors.gray,
  },
});

export default VendorOrdersScreen; 
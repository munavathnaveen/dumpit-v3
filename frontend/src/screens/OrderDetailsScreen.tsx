import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { FontAwesome } from '@expo/vector-icons';
import { format } from 'date-fns';

import { theme } from '../theme';
import { getOrder, cancelOrder } from '../api/orderApi';
import { useNavigation, useRoute } from '../navigation/hooks';
import Card3D from '../components/Card3D';
import alert from '../utils/alert';

type OrderStatus = 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled';

type OrderItem = {
  product: {
    _id: string;
    name: string;
  };
  quantity: number;
  price: number;
};

type Order = {
  _id: string;
  orderNumber: string;
  user: string;
  items: OrderItem[];
  shippingAddress: {
    _id: string;
    name: string;
    village: string;
    street: string;
    district: string;
    state: string;
    pincode: string;
    phone: string;
  };
  paymentMethod: string;
  paymentStatus: 'pending' | 'paid' | 'failed';
  status: OrderStatus;
  totalAmount: number;
  createdAt: string;
  updatedAt: string;
};

const OrderDetailsScreen: React.FC = () => {
  const route = useRoute<'OrderDetails'>();
  const navigation = useNavigation<'OrderDetails'>();
  
  const { orderId } = route.params;
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  
  useEffect(() => {
    loadOrderDetails();
  }, [orderId]);
  
  const loadOrderDetails = async () => {
    try {
      setLoading(true);
      const response = await getOrder(orderId);
      if (response.success) {
        setOrder(response.data);
      }
      setLoading(false);
    } catch (err: any) {
      setError(err.message || 'Failed to load order details');
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
    
    if (order.status !== 'pending' && order.status !== 'processing') {
      alert('Cannot Cancel', 'This order cannot be cancelled because it has already been shipped or delivered.');
      return;
    }
    
    alert(
      'Cancel Order',
      'Are you sure you want to cancel this order?',
      [
        { text: 'No', style: 'cancel' },
        {
          text: 'Yes, Cancel',
          style: 'destructive',
          onPress: async () => {
            try {
              setLoading(true);
              const response = await cancelOrder(orderId);
              if (response.success) {
                setOrder(response.data);
                alert('Success', 'Order has been cancelled successfully.');
              }
            } catch (err: any) {
              alert('Error', err.message || 'Failed to cancel order');
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
  };
  
  const getStatusColor = (status: OrderStatus) => {
    switch (status) {
      case 'pending': return theme.colors.warning;
      case 'processing': return '#3498db'; // info blue
      case 'shipped': return theme.colors.primary;
      case 'delivered': return theme.colors.success;
      case 'cancelled': return theme.colors.error;
      default: return theme.colors.textLight;
    }
  };

  const getStatusIcon = (status: OrderStatus) => {
    switch (status) {
      case 'pending': return 'clock-o';
      case 'processing': return 'refresh';
      case 'shipped': return 'truck';
      case 'delivered': return 'check-circle';
      case 'cancelled': return 'times-circle';
      default: return 'question-circle';
    }
  };
  
  const handleGoBack = () => {
    navigation.goBack();
  };
  
  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }
  
  if (error || !order) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>
          {error || 'Order not found. Please try again.'}
        </Text>
        <TouchableOpacity style={styles.backButton} onPress={handleGoBack}>
          <Text style={styles.backButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }
  
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={handleGoBack}>
          <FontAwesome name="arrow-left" size={20} color={theme.colors.white} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Order Details</Text>
        <View style={styles.placeholder} />
      </View>
      
      <ScrollView 
        showsVerticalScrollIndicator={false} 
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      >
        <Card3D style={styles.orderSummaryCard}>
          <View style={styles.orderNumberRow}>
            <Text style={styles.orderNumber}>Order #{order.orderNumber}</Text>
            <View style={[styles.statusBadge, { backgroundColor: `${getStatusColor(order.status)}20` }]}>
              <FontAwesome name={getStatusIcon(order.status)} size={14} color={getStatusColor(order.status)} />
              <Text style={[styles.statusText, { color: getStatusColor(order.status) }]}>
                {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
              </Text>
            </View>
          </View>
          
          <View style={styles.dateRow}>
            <FontAwesome name="calendar" size={14} color={theme.colors.textLight} />
            <Text style={styles.dateText}>
              {format(new Date(order.createdAt), 'dd MMM yyyy, hh:mm a')}
            </Text>
          </View>
          
          {/* Payment Info */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Payment</Text>
            <View style={styles.paymentInfo}>
              <View style={styles.paymentRow}>
                <Text style={styles.paymentLabel}>Method:</Text>
                <Text style={styles.paymentValue}>{order.paymentMethod}</Text>
              </View>
              <View style={styles.paymentRow}>
                <Text style={styles.paymentLabel}>Status:</Text>
                <View style={[
                  styles.paymentStatusBadge, 
                  { 
                    backgroundColor: order.paymentStatus === 'paid' 
                      ? `${theme.colors.success}20` 
                      : order.paymentStatus === 'pending' 
                        ? `${theme.colors.warning}20` 
                        : `${theme.colors.error}20` 
                  }
                ]}>
                  <Text style={[
                    styles.paymentStatusText, 
                    { 
                      color: order.paymentStatus === 'paid' 
                        ? theme.colors.success 
                        : order.paymentStatus === 'pending' 
                          ? theme.colors.warning 
                          : theme.colors.error 
                    }
                  ]}>
                    {order.paymentStatus.toUpperCase()}
                  </Text>
                </View>
              </View>
            </View>
          </View>
          
          {/* Shipping Address */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Shipping Address</Text>
            <View style={styles.addressInfo}>
              <Text style={styles.addressName}>{order.shippingAddress.name}</Text>
              <Text style={styles.addressDetails}>
                {order.shippingAddress.street}, {order.shippingAddress.village}
              </Text>
              <Text style={styles.addressDetails}>
                {order.shippingAddress.district}, {order.shippingAddress.state} - {order.shippingAddress.pincode}
              </Text>
              <Text style={styles.addressDetails}>
                Phone: {order.shippingAddress.phone}
              </Text>
            </View>
          </View>
          
          {/* Order Items */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Order Items</Text>
            {order.items.map((item, index) => (
              <View key={index} style={styles.orderItem}>
                <View style={styles.itemInfo}>
                  <Text style={styles.itemName}>{item.product.name}</Text>
                  <Text style={styles.itemQuantity}>Qty: {item.quantity}</Text>
                </View>
                <Text style={styles.itemPrice}>₹{(item.price * item.quantity).toFixed(2)}</Text>
              </View>
            ))}
          </View>
          
          {/* Price Summary */}
          <View style={styles.priceSummary}>
            <View style={styles.priceRow}>
              <Text style={styles.priceLabel}>Subtotal</Text>
              <Text style={styles.priceValue}>₹{order.totalAmount.toFixed(2)}</Text>
            </View>
            <View style={styles.priceRow}>
              <Text style={styles.priceLabel}>Shipping</Text>
              <Text style={styles.priceValue}>₹50.00</Text>
            </View>
            {/* You might want to include tax, discounts, etc. */}
            <View style={styles.divider} />
            <View style={styles.priceRow}>
              <Text style={styles.totalLabel}>Total</Text>
              <Text style={styles.totalValue}>₹{(order.totalAmount + 50).toFixed(2)}</Text>
            </View>
          </View>
        </Card3D>
        
        {/* Actions */}
        {(order.status === 'pending' || order.status === 'processing') && (
          <TouchableOpacity 
            style={styles.cancelButton} 
            onPress={handleCancelOrder}
          >
            <Text style={styles.cancelButtonText}>Cancel Order</Text>
          </TouchableOpacity>
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: theme.colors.primary,
    paddingTop: 50,
    paddingBottom: 15,
    paddingHorizontal: 16,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: theme.colors.white,
  },
  placeholder: {
    width: 40,
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
    padding: 20,
  },
  errorText: {
    fontSize: 16,
    color: theme.colors.error,
    textAlign: 'center',
    marginBottom: 20,
  },
  backButtonText: {
    color: theme.colors.white,
    fontWeight: 'bold',
  },
  content: {
    padding: 16,
  },
  orderSummaryCard: {
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: theme.colors.white,
    padding: 16,
    marginBottom: 16,
  },
  orderNumberRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  orderNumber: {
    fontSize: 16,
    fontWeight: 'bold',
    color: theme.colors.text,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    marginLeft: 4,
    fontSize: 12,
    fontWeight: 'bold',
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  dateText: {
    marginLeft: 6,
    fontSize: 12,
    color: theme.colors.textLight,
  },
  section: {
    marginBottom: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.lightGray,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: theme.colors.text,
    marginBottom: 8,
  },
  paymentInfo: {
    backgroundColor: theme.colors.background,
    borderRadius: 8,
    padding: 12,
  },
  paymentRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  paymentLabel: {
    fontSize: 14,
    color: theme.colors.textLight,
  },
  paymentValue: {
    fontSize: 14,
    fontWeight: '500',
    color: theme.colors.text,
  },
  paymentStatusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  paymentStatusText: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  addressInfo: {
    backgroundColor: theme.colors.background,
    borderRadius: 8,
    padding: 12,
  },
  addressName: {
    fontSize: 14,
    fontWeight: 'bold',
    color: theme.colors.text,
    marginBottom: 4,
  },
  addressDetails: {
    fontSize: 14,
    color: theme.colors.text,
    marginBottom: 2,
  },
  orderItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.lightGray,
  },
  itemInfo: {
    flex: 1,
  },
  itemName: {
    fontSize: 14,
    fontWeight: '500',
    color: theme.colors.text,
    marginBottom: 2,
  },
  itemQuantity: {
    fontSize: 12,
    color: theme.colors.textLight,
  },
  itemPrice: {
    fontSize: 14,
    fontWeight: 'bold',
    color: theme.colors.text,
  },
  priceSummary: {
    marginTop: 8,
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  priceLabel: {
    fontSize: 14,
    color: theme.colors.textLight,
  },
  priceValue: {
    fontSize: 14,
    color: theme.colors.text,
  },
  divider: {
    height: 1,
    backgroundColor: theme.colors.lightGray,
    marginVertical: 8,
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: theme.colors.text,
  },
  totalValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: theme.colors.primary,
  },
  cancelButton: {
    backgroundColor: theme.colors.error,
    borderRadius: 25,
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: 20,
  },
  cancelButtonText: {
    color: theme.colors.white,
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default OrderDetailsScreen; 
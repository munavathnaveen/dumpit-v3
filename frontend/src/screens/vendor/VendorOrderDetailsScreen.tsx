import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Image,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useRoute } from '@react-navigation/core';
import { RouteProp } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';

import Card3D from '../../components/Card3D';
import ScreenHeader from '../../components/ScreenHeader';
import { theme } from '../../theme';
import { MainStackNavigationProp, MainStackParamList } from '../../navigation/types';
import { getVendorOrder, updateOrderStatus } from '../../api/orderApi';
import { VendorOrder } from '../../api/orderApi';

type OrderDetailsRouteProp = RouteProp<MainStackParamList, 'VendorOrderDetails'>;

const VendorOrderDetailsScreen: React.FC = () => {
  const navigation = useNavigation<MainStackNavigationProp<'VendorOrderDetails'>>();
  const route = useRoute<OrderDetailsRouteProp>();
  const { orderId } = route.params;

  const [order, setOrder] = useState<VendorOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updatingStatus, setUpdatingStatus] = useState(false);

  useEffect(() => {
    const fetchOrderDetails = async () => {
      try {
        setLoading(true);
        const response = await getVendorOrder(orderId);
        if (response.success) {
          setOrder(response.data);
        } else {
          setError('Failed to load order details');
        }
      } catch (error) {
        console.error('Failed to load order details:', error);
        setError('Failed to load order details');
      } finally {
        setLoading(false);
      }
    };

    fetchOrderDetails();
  }, [orderId]);

  const handleStatusUpdate = () => {
    if (!order) return;

    // Define possible next statuses based on current status
    let nextStatuses: { [key: string]: string } = {};
    
    switch (order.status) {
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
          setUpdatingStatus(true);
          await updateOrderStatus(orderId, status as any);
          
          // Update local order state with new status
          setOrder((prevOrder) => prevOrder ? { ...prevOrder, status: status as any } : null);
          
          Alert.alert('Success', `Order ${status === 'cancelled' ? 'cancelled' : 'updated'} successfully`);
        } catch (error) {
          console.error('Failed to update order status:', error);
          Alert.alert('Error', 'Failed to update order status');
        } finally {
          setUpdatingStatus(false);
        }
      },
    }));

    // Add cancel button
    alertButtons.push({
      text: 'Cancel',
      // @ts-ignore
      style: 'cancel',
    });

    Alert.alert(
      'Update Order Status',
      'What would you like to do with this order?',
      alertButtons as any
    );
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <ScreenHeader title="Order Details" showBackButton={true} />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
        </View>
      </View>
    );
  }

  if (error || !order) {
    return (
      <View style={styles.container}>
        <ScreenHeader title="Order Details" showBackButton={true} />
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error || 'Order not found'}</Text>
          <TouchableOpacity 
            style={styles.retryButton}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.retryButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <View style={styles.container}>
      <ScreenHeader title="Order Details" showBackButton={true} />
      
      <ScrollView contentContainerStyle={styles.contentContainer}>
        {/* Order Summary Card */}
        <Card3D style={styles.card} elevation="medium">
          <View style={styles.orderHeader}>
            <View>
              <Text style={styles.orderNumber}>Order #{order.orderNumber}</Text>
              <Text style={styles.orderDate}>{formatDate(order.createdAt)}</Text>
            </View>
            <View style={[
              styles.statusBadge, 
              { backgroundColor: getStatusColor(order.status) }
            ]}>
              <Text style={styles.statusText}>
                {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
              </Text>
            </View>
          </View>
        </Card3D>

        {/* Customer Info Card */}
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
            <Text style={styles.infoValue}>{order.user.phone}</Text>
          </View>
        </Card3D>

        {/* Shipping Address Card */}
        <Card3D style={styles.card} elevation="medium">
          <Text style={styles.cardTitle}>Shipping Address</Text>
          <View style={styles.addressContainer}>
            <Ionicons name="location-outline" size={24} color={theme.colors.primary} style={styles.addressIcon} />
            <View style={styles.addressContent}>
              <Text style={styles.addressText}>{order.shippingAddress.street}</Text>
              <Text style={styles.addressText}>{order.shippingAddress.city}, {order.shippingAddress.state} {order.shippingAddress.pincode}</Text>
              <Text style={styles.addressText}>Phone: {order.shippingAddress.phone}</Text>
            </View>
          </View>
        </Card3D>

        {/* Order Items Card */}
        <Card3D style={styles.card} elevation="medium">
          <Text style={styles.cardTitle}>Order Items</Text>
          {order.items.map((item, index) => (
            <View key={index} style={[
              styles.orderItem,
              index < order.items.length - 1 && styles.orderItemDivider
            ]}>
              <Image 
                source={{ uri: item.product.image || 'https://via.placeholder.com/100' }} 
                style={styles.productImage} 
              />
              <View style={styles.productDetails}>
                <Text style={styles.productName}>{item.product.name}</Text>
                <Text style={styles.productPrice}>₹{item.price.toFixed(2)} x {item.quantity}</Text>
                <Text style={styles.productTotal}>
                  Total: <Text style={styles.boldText}>₹{(item.price * item.quantity).toFixed(2)}</Text>
                </Text>
              </View>
            </View>
          ))}
          
          <View style={styles.totalContainer}>
            <Text style={styles.totalLabel}>Order Total:</Text>
            <Text style={styles.totalValue}>₹{order.total.toFixed(2)}</Text>
          </View>
        </Card3D>

        {/* Payment Info Card */}
        <Card3D style={styles.card} elevation="medium">
          <Text style={styles.cardTitle}>Payment Information</Text>
          <View style={styles.infoRow}>
            <Ionicons name="card-outline" size={18} color={theme.colors.gray} />
            <Text style={styles.infoLabel}>Method:</Text>
            <Text style={styles.infoValue}>{order.paymentMethod}</Text>
          </View>
          <View style={styles.infoRow}>
            <Ionicons 
              name={
                order.paymentStatus === 'paid' 
                  ? 'checkmark-circle-outline' 
                  : order.paymentStatus === 'pending' 
                    ? 'time-outline' 
                    : 'close-circle-outline'
              } 
              size={18} 
              color={
                order.paymentStatus === 'paid' 
                  ? theme.colors.success 
                  : order.paymentStatus === 'pending' 
                    ? theme.colors.warning 
                    : theme.colors.error
              } 
            />
            <Text style={styles.infoLabel}>Status:</Text>
            <Text 
              style={[
                styles.infoValue, 
                {
                  color: order.paymentStatus === 'paid' 
                    ? theme.colors.success 
                    : order.paymentStatus === 'pending' 
                      ? theme.colors.warning 
                      : theme.colors.error
                }
              ]}
            >
              {order.paymentStatus.charAt(0).toUpperCase() + order.paymentStatus.slice(1)}
            </Text>
          </View>
        </Card3D>

        {/* Action Buttons */}
        <View style={styles.actionButtonsContainer}>
          <TouchableOpacity
            style={[
              styles.actionButton,
              (order.status === 'delivered' || order.status === 'cancelled') && styles.disabledButton
            ]}
            onPress={handleStatusUpdate}
            disabled={order.status === 'delivered' || order.status === 'cancelled' || updatingStatus}
          >
            {updatingStatus ? (
              <ActivityIndicator size="small" color={theme.colors.white} />
            ) : (
              <>
                <Ionicons name="refresh-outline" size={20} color={theme.colors.white} />
                <Text style={styles.actionButtonText}>Update Status</Text>
              </>
            )}
          </TouchableOpacity>
          
          <TouchableOpacity
            style={styles.printButton}
            onPress={() => Alert.alert('Print', 'Invoice printing functionality would be implemented here.')}
          >
            <Ionicons name="print-outline" size={20} color={theme.colors.dark} />
            <Text style={styles.printButtonText}>Print Invoice</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
};

const getStatusColor = (status: string): string => {
  switch (status.toLowerCase()) {
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  contentContainer: {
    padding: theme.spacing.md,
    paddingBottom: theme.spacing.xl,
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
  card: {
    backgroundColor: theme.colors.white,
    borderRadius: theme.borderRadius.medium,
    marginBottom: theme.spacing.md,
    padding: theme.spacing.md,
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  orderNumber: {
    fontSize: 16,
    fontWeight: 'bold',
    color: theme.colors.dark,
    marginBottom: theme.spacing.xs,
  },
  orderDate: {
    fontSize: 14,
    color: theme.colors.gray,
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
  cardTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: theme.colors.dark,
    marginBottom: theme.spacing.md,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.sm,
  },
  infoLabel: {
    fontSize: 14,
    color: theme.colors.gray,
    marginLeft: theme.spacing.xs,
    width: 60,
  },
  infoValue: {
    fontSize: 14,
    color: theme.colors.dark,
    flex: 1,
  },
  addressContainer: {
    flexDirection: 'row',
  },
  addressIcon: {
    marginRight: theme.spacing.sm,
  },
  addressContent: {
    flex: 1,
  },
  addressText: {
    fontSize: 14,
    color: theme.colors.dark,
    marginBottom: theme.spacing.xs,
  },
  orderItem: {
    flexDirection: 'row',
    paddingVertical: theme.spacing.sm,
  },
  orderItemDivider: {
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.lightGray,
  },
  productImage: {
    width: 60,
    height: 60,
    borderRadius: theme.borderRadius.small,
    marginRight: theme.spacing.sm,
  },
  productDetails: {
    flex: 1,
  },
  productName: {
    fontSize: 14,
    fontWeight: '500',
    color: theme.colors.dark,
    marginBottom: theme.spacing.xs,
  },
  productPrice: {
    fontSize: 13,
    color: theme.colors.gray,
    marginBottom: theme.spacing.xs,
  },
  productTotal: {
    fontSize: 13,
    color: theme.colors.dark,
  },
  boldText: {
    fontWeight: 'bold',
  },
  totalContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: theme.colors.lightGray,
    paddingTop: theme.spacing.md,
    marginTop: theme.spacing.sm,
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: theme.colors.dark,
  },
  totalValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: theme.colors.primary,
  },
  actionButtonsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.primary,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.medium,
    marginRight: theme.spacing.sm,
    ...theme.shadow.small,
  },
  actionButtonText: {
    color: theme.colors.white,
    fontWeight: 'bold',
    marginLeft: theme.spacing.xs,
  },
  disabledButton: {
    backgroundColor: theme.colors.lightGray,
  },
  printButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.white,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.medium,
    marginLeft: theme.spacing.sm,
    borderWidth: 1,
    borderColor: theme.colors.lightGray,
  },
  printButtonText: {
    color: theme.colors.dark,
    fontWeight: 'bold',
    marginLeft: theme.spacing.xs,
  },
});

export default VendorOrderDetailsScreen; 
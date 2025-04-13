import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Alert,
  Linking,
  Platform,
  Image,
  Modal,
} from 'react-native';
import { FontAwesome } from '@expo/vector-icons';
import { format } from 'date-fns';
import io from 'socket.io-client';

import { theme } from '../theme';
import { getOrder, cancelOrder } from '../api/orderApi';
import { useNavigation, useRoute } from '../navigation/hooks';
import Card3D from '../components/Card3D';
import alert from '../utils/alert';
import MapViewComponent from '../components/MapView';
import { LocationService, Coordinates } from '../services/LocationService';
import OrderTrackingCard from '../components/OrderTrackingCard';

type OrderStatus = 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled';
type TrackingStatus = 'preparing' | 'ready_for_pickup' | 'in_transit' | 'delivered';

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

type Order = {
  _id: string;
  orderNumber: string;
  user: string;
  items: OrderItem[];
  shippingAddress: ShippingAddress;
  paymentMethod: string;
  paymentStatus: 'pending' | 'paid' | 'failed';
  status: OrderStatus;
  totalAmount: number;
  tracking?: TrackingInfo;
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
  const [showMap, setShowMap] = useState(false);
  
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
      
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Failed to load order details');
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
  
  const getTrackingStatusText = (status?: TrackingStatus) => {
    if (!status) return 'Not Tracked';
    
    switch (status) {
      case 'preparing': return 'Preparing Your Order';
      case 'ready_for_pickup': return 'Ready for Pickup';
      case 'in_transit': return 'Out for Delivery';
      case 'delivered': return 'Delivered';
      default: return 'Unknown Status';
    }
  };
  
  const getTrackingStatusIcon = (status?: TrackingStatus) => {
    if (!status) return 'question-circle';
    
    switch (status) {
      case 'preparing': return 'cutlery';
      case 'ready_for_pickup': return 'shopping-bag';
      case 'in_transit': return 'truck';
      case 'delivered': return 'check-circle';
      default: return 'question-circle';
    }
  };
  
  const formatAddress = (address: ShippingAddress) => {
    return `${address.street}, ${address.village}, ${address.district}, ${address.state} - ${address.pincode}`;
  };
  
  const handleViewTracking = () => {
    navigation.navigate('OrderTracking', { orderId });
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
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <FontAwesome name="arrow-left" size={24} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Order #{order.orderNumber}</Text>
        <View style={{ width: 24 }} />
      </View>
      
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      >
        <Card3D style={styles.orderCard}>
          {/* Order Status */}
          <View style={styles.statusContainer}>
            <View style={styles.statusHeader}>
              <Text style={styles.statusTitle}>Order Status</Text>
              <View style={styles.statusBadge}>
                <Text style={styles.statusText}>{order.status}</Text>
              </View>
            </View>
            <View style={styles.dateContainer}>
              <FontAwesome name="calendar" size={14} color={theme.colors.textLight} />
              <Text style={styles.dateText}>
                {format(new Date(order.createdAt), 'dd MMM yyyy, hh:mm a')}
              </Text>
            </View>
          </View>
          
          {/* Replace old tracking section with new OrderTrackingCard */}
          {order && (
            <View style={styles.sectionContainer}>
              <Text style={styles.sectionTitle}>Tracking Information</Text>
              <OrderTrackingCard 
                orderId={orderId} 
                onViewMapPress={() => setShowMap(true)}
              />
              <TouchableOpacity
                style={styles.viewTrackingButton}
                onPress={handleViewTracking}
              >
                <Text style={styles.viewTrackingButtonText}>View Detailed Tracking</Text>
                <FontAwesome name="chevron-right" size={14} color={theme.colors.primary} style={{ marginLeft: 8 }} />
              </TouchableOpacity>
            </View>
          )}
          
          {/* Shipping Information */}
          <View style={styles.sectionContainer}>
            <Text style={styles.sectionTitle}>Shipping Information</Text>
            <View style={styles.shippingContainer}>
              <FontAwesome name="map-marker" size={18} color={theme.colors.primary} style={styles.shippingIcon} />
              <View style={styles.addressContainer}>
                <Text style={styles.addressName}>{order.shippingAddress.name}</Text>
                <Text style={styles.addressText}>
                  {order.shippingAddress.village}, {order.shippingAddress.street}
                  {'\n'}
                  {order.shippingAddress.district}, {order.shippingAddress.state} - {order.shippingAddress.pincode}
                  {'\n'}
                  Phone: {order.shippingAddress.phone}
                </Text>
              </View>
            </View>
          </View>
          
          {/* Payment Information */}
          <View style={styles.sectionContainer}>
            <Text style={styles.sectionTitle}>Payment Information</Text>
            <View style={styles.paymentContainer}>
              <View style={styles.paymentRow}>
                <Text style={styles.paymentLabel}>Payment Method</Text>
                <Text style={styles.paymentValue}>{order.paymentMethod}</Text>
              </View>
              <View style={styles.paymentRow}>
                <Text style={styles.paymentLabel}>Payment Status</Text>
                <View style={[styles.paymentStatus, { 
                  backgroundColor: order.paymentStatus === 'paid' 
                    ? theme.colors.success + '20' 
                    : order.paymentStatus === 'failed'
                    ? theme.colors.error + '20'
                    : theme.colors.warning + '20'
                }]}>
                  <Text style={[styles.paymentStatusText, { 
                    color: order.paymentStatus === 'paid' 
                      ? theme.colors.success 
                      : order.paymentStatus === 'failed'
                      ? theme.colors.error
                      : theme.colors.warning
                  }]}>
                    {order.paymentStatus.charAt(0).toUpperCase() + order.paymentStatus.slice(1)}
                  </Text>
                </View>
              </View>
            </View>
          </View>
          
          {/* Order Items */}
          <View style={styles.sectionContainer}>
            <Text style={styles.sectionTitle}>Order Items</Text>
            {order.items.map((item, index) => (
              <View key={index} style={styles.itemContainer}>
                <View style={styles.itemDetails}>
                  <View style={styles.itemQuantityBadge}>
                    <Text style={styles.itemQuantityText}>{item.quantity}</Text>
                  </View>
                  <View style={styles.itemInfo}>
                    <Text style={styles.itemName}>{item.product.name}</Text>
                    <Text style={styles.itemUnitPrice}>₹{item.price.toFixed(2)} each</Text>
                  </View>
                </View>
                <Text style={styles.itemPrice}>₹{(item.price * item.quantity).toFixed(2)}</Text>
              </View>
            ))}
          </View>
          
          {/* Order Summary */}
          <View style={styles.sectionContainer}>
            <Text style={styles.sectionTitle}>Order Summary</Text>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Subtotal</Text>
              <Text style={styles.summaryValue}>
                ₹{order.items.reduce((sum, item) => sum + item.price * item.quantity, 0).toFixed(2)}
              </Text>
            </View>
            
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Delivery Fee</Text>
              <Text style={styles.summaryValue}>₹0.00</Text>
            </View>
            
            <View style={[styles.summaryRow, styles.totalRow]}>
              <Text style={styles.totalLabel}>Total</Text>
              <Text style={styles.totalValue}>₹{order.totalAmount.toFixed(2)}</Text>
            </View>
          </View>
          
          {/* Actions */}
          {(order.status === 'pending' || order.status === 'processing') && (
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={handleCancelOrder}
            >
              <Text style={styles.cancelButtonText}>Cancel Order</Text>
            </TouchableOpacity>
          )}
        </Card3D>
      </ScrollView>
      
      {/* Full map modal */}
      {showMap && order?.tracking && (
        <Modal
          animationType="slide"
          transparent={false}
          visible={showMap}
          onRequestClose={() => setShowMap(false)}
        >
          <View style={styles.mapModalContainer}>
            <View style={styles.mapModalHeader}>
              <TouchableOpacity
                style={styles.mapModalCloseButton}
                onPress={() => setShowMap(false)}
              >
                <FontAwesome name="chevron-left" size={20} color={theme.colors.text} />
              </TouchableOpacity>
              <Text style={styles.mapModalTitle}>Order Tracking</Text>
            </View>
            
            <MapViewComponent 
              style={styles.fullMapView}
              markers={[
                {
                  id: 'destination',
                  coordinate: {
                    latitude: order.shippingAddress.location?.coordinates[1] || 0,
                    longitude: order.shippingAddress.location?.coordinates[0] || 0
                  },
                  title: 'Delivery Location',
                  description: 'Your delivery address',
                  pinColor: theme.colors.primary
                }
              ]}
              showsUserLocation={true}
            />
          </View>
        </Modal>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  header: {
    backgroundColor: theme.colors.white,
    paddingTop: 50,
    paddingBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: theme.colors.text,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 32,
  },
  orderCard: {
    padding: 0,
    overflow: 'hidden',
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
    padding: 16,
  },
  errorText: {
    fontSize: 16,
    marginBottom: 16,
    color: theme.colors.error,
    textAlign: 'center',
  },
  retryButton: {
    backgroundColor: theme.colors.primary,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 4,
  },
  retryButtonText: {
    color: theme.colors.white,
    fontWeight: 'bold',
  },
  backButton: {
    backgroundColor: theme.colors.primary,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 4,
  },
  backButtonText: {
    color: theme.colors.white,
    fontWeight: 'bold',
  },
  statusContainer: {
    backgroundColor: theme.colors.white,
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.lightGray,
  },
  statusHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  statusTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: theme.colors.text,
  },
  statusBadge: {
    backgroundColor: theme.colors.primary + '20',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 4,
  },
  statusText: {
    color: theme.colors.primary,
    fontSize: 12,
    fontWeight: 'bold',
    textTransform: 'uppercase',
  },
  dateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dateText: {
    marginLeft: 8,
    color: theme.colors.textLight,
    fontSize: 14,
  },
  sectionContainer: {
    marginBottom: 20,
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.lightGray,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: theme.colors.text,
    marginBottom: 12,
  },
  shippingContainer: {
    flexDirection: 'row',
  },
  shippingIcon: {
    marginRight: 12,
    marginTop: 4,
  },
  addressContainer: {
    flex: 1,
  },
  addressName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: theme.colors.text,
    marginBottom: 4,
  },
  addressText: {
    fontSize: 14,
    color: theme.colors.textLight,
    lineHeight: 20,
  },
  paymentContainer: {
    backgroundColor: theme.colors.white,
  },
  paymentRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  paymentLabel: {
    fontSize: 14,
    color: theme.colors.text,
  },
  paymentValue: {
    fontSize: 14,
    fontWeight: '500',
    color: theme.colors.text,
  },
  paymentStatus: {
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 4,
  },
  paymentStatusText: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  itemContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.lightGray,
  },
  itemDetails: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  itemQuantityBadge: {
    backgroundColor: theme.colors.lightGray,
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  itemQuantityText: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  itemInfo: {
    flex: 1,
  },
  itemName: {
    fontSize: 14,
    fontWeight: '500',
    color: theme.colors.text,
    marginBottom: 4,
  },
  itemUnitPrice: {
    fontSize: 12,
    color: theme.colors.textLight,
  },
  itemPrice: {
    fontSize: 14,
    fontWeight: 'bold',
    color: theme.colors.text,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  summaryLabel: {
    fontSize: 14,
    color: theme.colors.textLight,
  },
  summaryValue: {
    fontSize: 14,
    color: theme.colors.text,
  },
  totalRow: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: theme.colors.lightGray,
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: theme.colors.text,
  },
  totalValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: theme.colors.primary,
  },
  cancelButton: {
    backgroundColor: theme.colors.error,
    padding: 16,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: theme.colors.white,
    fontWeight: 'bold',
    fontSize: 16,
  },
  mapModalContainer: {
    flex: 1,
    backgroundColor: theme.colors.white,
  },
  mapModalHeader: {
    backgroundColor: theme.colors.primary,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 50,
  },
  mapModalCloseButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mapModalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: theme.colors.white,
    marginLeft: 8,
  },
  fullMapView: {
    ...StyleSheet.absoluteFillObject,
    top: 90,
  },
  viewTrackingButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: `${theme.colors.primary}10`,
    padding: 12,
    borderRadius: 8,
    marginTop: 12,
  },
  viewTrackingButtonText: {
    color: theme.colors.primary,
    fontWeight: 'bold',
    fontSize: 14,
  },
});

export default OrderDetailsScreen; 
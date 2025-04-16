import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons, MaterialIcons, FontAwesome5 } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { MainStackNavigationProp, MainStackParamList } from '../navigation/types';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { Address, getAddresses } from '../api/addresses';
import { VerifyCouponResponse, verifyCoupon } from '../api/coupons';
import { Order, createOrder, processPayment } from '../api/orders';
import { clearCart } from '../store/cartSlice';
import { formatCurrency } from '../utils/format';
import alert from '../utils/alert';

interface CartProduct {
  _id: string;
  name: string;
  price: number;
  images: string[];
  description?: string;
}

interface CartItem {
  _id: string;
  quantity: number;
  product: CartProduct;
}

const CheckoutScreen: React.FC = () => {
  const navigation = useNavigation<MainStackNavigationProp<'CheckoutScreen'>>();
  const dispatch = useAppDispatch();
  
  const { user } = useAppSelector((state) => state.auth);
  const { items } = useAppSelector((state) => state.cart);
  
  const [loading, setLoading] = useState(false);
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [selectedAddress, setSelectedAddress] = useState<Address | null>(null);
  const [couponCode, setCouponCode] = useState('');
  const [couponApplied, setCouponApplied] = useState(false);
  const [couponDiscount, setCouponDiscount] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState('cash_on_delivery');
  const [notes, setNotes] = useState('');
  
  // Calculate totals
  const subtotal = items.reduce((acc, item) => {
    // Safely access price, default to 0 if not available
    if (!item.product || typeof item.product.price !== 'number') return acc;
    const price = item.product.price || 0;
    const quantity = item.quantity || 0;
    return acc + (price * quantity);
  }, 0);
  
  const deliveryFee = 40; // Fixed delivery fee
  const total = (subtotal || 0) + deliveryFee - (couponDiscount || 0);

  useEffect(() => {
    loadAddresses();
  }, []);

  const loadAddresses = async () => {
    try {
      setLoading(true);
      const response = await getAddresses();
      setAddresses(response.data);
      
      // Set first address as default if user has addresses
      if (response.data.length > 0) {
        setSelectedAddress(response.data[0]);
      }
      
      setLoading(false);
    } catch (error) {
      setLoading(false);
      alert('Error', 'Failed to load addresses');
      console.error(error);
    }
  };

  const handleApplyCoupon = async () => {
    if (!couponCode.trim()) {
      alert('Error', 'Please enter a coupon code');
      return;
    }
    
    try {
      setLoading(true);
      const response = await verifyCoupon(couponCode, subtotal);
      
      if (response.success && response.data) {
        setCouponApplied(true);
        setCouponDiscount(response.data.discountAmount);
        alert('Success', `Coupon applied! You saved ${formatCurrency(response.data.discountAmount)}`);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } else {
        alert('Error', response.message || 'Invalid coupon');
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      }
      
      setLoading(false);
    } catch (error) {
      setLoading(false);
      alert('Error', 'Failed to apply coupon');
      console.error(error);
    }
  };

  const handleRemoveCoupon = () => {
    setCouponApplied(false);
    setCouponDiscount(0);
    setCouponCode('');
  };

  const handlePlaceOrder = async () => {
    if (!selectedAddress) {
      alert('Error', 'Please select a delivery address');
      return;
    }
    
    if (items.length === 0) {
      alert('Error', 'Your cart is empty');
      return;
    }
    
    try {
      setLoading(true);
      
      // Create order
      const orderData = {
        shippingAddress: selectedAddress._id,
        paymentMethod,
        couponCode: couponApplied ? couponCode : '',
        notes: notes.trim() || undefined,
      };
      
      const orderResponse = await createOrder(orderData);
      
      if (orderResponse.success) {
        const orderDetails = orderResponse.data;
        
        // If payment method is Razorpay, initiate payment
        if (paymentMethod === 'razorpay') {
          handleRazorpayPayment(orderDetails);
        } else {
          // For COD or other methods
          dispatch(clearCart());
          navigation.navigate('OrderDetails', { orderId: orderDetails._id });
          alert('Success', 'Your order has been placed successfully!');
        }
      } else {
        // Handle the error case - assume response might have a message property
        const errorMessage = 'Failed to place order';
        alert('Error', errorMessage);
      }
      
      setLoading(false);
    } catch (error) {
      setLoading(false);
      alert('Error', 'Failed to place order');
      console.error(error);
    }
  };

  const handleRazorpayPayment = async (orderDetails: Order) => {
    try {
      // Process Razorpay payment
      const paymentResponse = await processPayment({
        orderId: orderDetails._id,
        amount: orderDetails.totalAmount,
        currency: 'INR',
        name: user?.name || '',
        email: user?.email || '',
        phone: user?.phone || '',
      });
      
      if (paymentResponse.success) {
        dispatch(clearCart());
        navigation.navigate('OrderDetails', { orderId: orderDetails._id });
        alert('Success', 'Your payment was successful and order has been placed!');
      } else {
        alert('Payment Failed', paymentResponse.message || 'Please try again later');
      }
    } catch (error) {
      alert('Payment Error', 'Failed to process payment');
      console.error(error);
    }
  };

  const renderAddressItem = (address: Address, index: number) => (
    <TouchableOpacity
      key={address._id}
      style={[
        styles.addressItem,
        selectedAddress?._id === address._id && styles.selectedAddressItem,
      ]}
      onPress={() => setSelectedAddress(address)}
    >
      <View style={styles.addressContent}>
        <Text style={styles.addressType}>{address.type}</Text>
        <Text style={styles.addressName}>{address.name}</Text>
        <Text style={styles.addressText}>
          {address.street}, {address.city}, {address.state} - {address.pincode}
        </Text>
        <Text style={styles.addressPhone}>Phone: {address.phone}</Text>
      </View>
      
      {selectedAddress?._id === address._id && (
        <View style={styles.selectedCheck}>
          <Ionicons name="checkmark-circle" size={24} color="#00C853" />
        </View>
      )}
    </TouchableOpacity>
  );

  const renderPaymentMethodItem = (method: string, label: string, icon: React.ReactNode) => (
    <TouchableOpacity
      style={[styles.paymentItem, paymentMethod === method && styles.selectedPaymentItem]}
      onPress={() => setPaymentMethod(method)}
    >
      <View style={styles.paymentIconContainer}>
        {icon}
      </View>
      <Text style={styles.paymentLabel}>{label}</Text>
      {paymentMethod === method && (
        <Ionicons name="checkmark-circle" size={20} color="#00C853" style={styles.paymentCheck} />
      )}
    </TouchableOpacity>
  );

  if (loading && addresses.length === 0) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#6200EE" />
        <Text style={styles.loadingText}>Loading checkout...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Checkout</Text>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
        </View>

        {/* Delivery Address Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionHeaderLeft}>
              <MaterialIcons name="location-on" size={22} color="#6200EE" />
              <Text style={styles.sectionTitle}>Delivery Address</Text>
            </View>
            <TouchableOpacity 
              style={styles.addButton}
              onPress={() => navigation.navigate('Profile', { initialTab: 'addresses' })}
            >
              <Text style={styles.addButtonText}>Add New</Text>
            </TouchableOpacity>
          </View>

          {addresses.length === 0 ? (
            <View style={styles.emptyAddressContainer}>
              <FontAwesome5 name="map-marker-alt" size={50} color="#ccc" />
              <Text style={styles.emptyAddressText}>No addresses found</Text>
              <TouchableOpacity 
                style={styles.addAddressButton}
                onPress={() => navigation.navigate('Profile', { initialTab: 'addresses' })}
              >
                <Text style={styles.addAddressButtonText}>Add New Address</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.addressList}>
              {addresses.map(renderAddressItem)}
            </View>
          )}
        </View>

        {/* Coupon Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionHeaderLeft}>
              <MaterialIcons name="card-giftcard" size={22} color="#6200EE" />
              <Text style={styles.sectionTitle}>Apply Coupon</Text>
            </View>
          </View>

          {couponApplied ? (
            <View style={styles.appliedCouponContainer}>
              <View style={styles.appliedCouponContent}>
                <View style={styles.couponIconContainer}>
                  <MaterialIcons name="local-offer" size={20} color="#00C853" />
                </View>
                <View style={styles.appliedCouponInfo}>
                  <Text style={styles.appliedCouponCode}>{couponCode}</Text>
                  <Text style={styles.appliedCouponValue}>
                    Discount: {formatCurrency(couponDiscount)}
                  </Text>
                </View>
              </View>
              <TouchableOpacity 
                style={styles.removeCouponButton}
                onPress={handleRemoveCoupon}
              >
                <Text style={styles.removeCouponText}>Remove</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.couponInputContainer}>
              <TextInput
                style={styles.couponInput}
                placeholder="Enter coupon code"
                value={couponCode}
                onChangeText={setCouponCode}
                autoCapitalize="characters"
              />
              <TouchableOpacity 
                style={styles.applyCouponButton}
                onPress={handleApplyCoupon}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.applyCouponButtonText}>Apply</Text>
                )}
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Payment Method Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionHeaderLeft}>
              <MaterialIcons name="payment" size={22} color="#6200EE" />
              <Text style={styles.sectionTitle}>Payment Method</Text>
            </View>
          </View>

          <View style={styles.paymentMethodsContainer}>
            {renderPaymentMethodItem(
              'razorpay',
              'Razorpay',
              <FontAwesome5 name="credit-card" size={24} color="#072654" />
            )}
            {renderPaymentMethodItem(
              'cash_on_delivery',
              'Cash on Delivery',
              <MaterialIcons name="attach-money" size={24} color="#00C853" />
            )}
          </View>
        </View>

        {/* Order Notes */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionHeaderLeft}>
              <MaterialIcons name="note" size={22} color="#6200EE" />
              <Text style={styles.sectionTitle}>Order Notes (Optional)</Text>
            </View>
          </View>

          <TextInput
            style={styles.notesInput}
            placeholder="Add any special instructions for delivery..."
            value={notes}
            onChangeText={setNotes}
            multiline
            numberOfLines={3}
            textAlignVertical="top"
          />
        </View>

        {/* Order Summary */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionHeaderLeft}>
              <MaterialIcons name="receipt" size={22} color="#6200EE" />
              <Text style={styles.sectionTitle}>Order Summary</Text>
            </View>
          </View>

          <View style={styles.summaryContainer}>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Subtotal</Text>
              <Text style={styles.summaryValue}>{formatCurrency(subtotal)}</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Delivery Fee</Text>
              <Text style={styles.summaryValue}>{formatCurrency(deliveryFee)}</Text>
            </View>
            {couponDiscount > 0 && (
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Coupon Discount</Text>
                <Text style={styles.summaryValueDiscount}>-{formatCurrency(couponDiscount)}</Text>
              </View>
            )}
            <View style={styles.divider} />
            <View style={styles.summaryRowTotal}>
              <Text style={styles.summaryLabelTotal}>Total</Text>
              <Text style={styles.summaryValueTotal}>{formatCurrency(total)}</Text>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Bottom Action Bar */}
      <View style={styles.bottomBar}>
        <View style={styles.totalContainer}>
          <Text style={styles.totalLabel}>Total Payment</Text>
          <Text style={styles.totalValue}>{formatCurrency(total)}</Text>
        </View>
        <TouchableOpacity
          style={styles.placeOrderButton}
          onPress={handlePlaceOrder}
          disabled={loading || addresses.length === 0}
        >
          {loading ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <>
              <Text style={styles.placeOrderButtonText}>Place Order</Text>
              <MaterialIcons name="arrow-forward" size={20} color="#fff" />
            </>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
  header: {
    paddingTop: 60,
    paddingBottom: 20,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    marginBottom: 20,
    backgroundColor: '#6a11cb',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
  },
  backButton: {
    position: 'absolute',
    top: 60,
    left: 20,
    padding: 5,
  },
  section: {
    backgroundColor: '#fff',
    borderRadius: 15,
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 3,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginLeft: 8,
    color: '#333',
  },
  addButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#f0f0f0',
    borderRadius: 20,
  },
  addButtonText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#6200EE',
  },
  emptyAddressContainer: {
    alignItems: 'center',
    paddingVertical: 30,
  },
  emptyAddressText: {
    fontSize: 16,
    color: '#888',
    marginTop: 16,
    marginBottom: 20,
  },
  addAddressButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: '#6200EE',
    borderRadius: 25,
  },
  addAddressButtonText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#fff',
  },
  addressList: {
    gap: 12,
  },
  addressItem: {
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 12,
    padding: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  selectedAddressItem: {
    borderColor: '#6200EE',
    backgroundColor: 'rgba(98, 0, 238, 0.05)',
  },
  addressContent: {
    flex: 1,
  },
  addressType: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#6200EE',
    backgroundColor: 'rgba(98, 0, 238, 0.1)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    alignSelf: 'flex-start',
    marginBottom: 8,
  },
  addressName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  addressText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  addressPhone: {
    fontSize: 14,
    color: '#666',
  },
  selectedCheck: {
    marginLeft: 10,
  },
  couponInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  couponInput: {
    flex: 1,
    height: 48,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 10,
    paddingHorizontal: 16,
    fontSize: 16,
  },
  applyCouponButton: {
    marginLeft: 12,
    height: 48,
    paddingHorizontal: 20,
    backgroundColor: '#6200EE',
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  applyCouponButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
  },
  appliedCouponContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: 'rgba(0, 200, 83, 0.1)',
    borderRadius: 10,
  },
  appliedCouponContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  couponIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0, 200, 83, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  appliedCouponInfo: {
    flex: 1,
  },
  appliedCouponCode: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  appliedCouponValue: {
    fontSize: 14,
    color: '#00C853',
  },
  removeCouponButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: 'rgba(255, 0, 0, 0.1)',
    borderRadius: 20,
  },
  removeCouponText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#FF0000',
  },
  paymentMethodsContainer: {
    gap: 12,
  },
  paymentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 12,
  },
  selectedPaymentItem: {
    borderColor: '#6200EE',
    backgroundColor: 'rgba(98, 0, 238, 0.05)',
  },
  paymentIconContainer: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  paymentLogo: {
    width: 36,
    height: 36,
    resizeMode: 'contain',
  },
  paymentLabel: {
    flex: 1,
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
  },
  paymentCheck: {
    marginLeft: 10,
  },
  notesInput: {
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 10,
    padding: 12,
    fontSize: 16,
    color: '#333',
    minHeight: 80,
  },
  summaryContainer: {
    gap: 12,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  summaryLabel: {
    fontSize: 16,
    color: '#666',
  },
  summaryValue: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
  },
  summaryValueDiscount: {
    fontSize: 16,
    fontWeight: '500',
    color: '#00C853',
  },
  divider: {
    height: 1,
    backgroundColor: '#e0e0e0',
    marginVertical: 8,
  },
  summaryRowTotal: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  summaryLabelTotal: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  summaryValueTotal: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#6200EE',
  },
  bottomBar: {
    backgroundColor: '#fff',
    flexDirection: 'row',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  totalContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  totalLabel: {
    fontSize: 14,
    color: '#666',
  },
  totalValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  placeOrderButton: {
    flexDirection: 'row',
    backgroundColor: '#6200EE',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeOrderButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
    marginRight: 8,
  },
});

export default CheckoutScreen; 
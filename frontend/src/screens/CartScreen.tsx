import React, { useEffect, useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  FlatList, 
  TouchableOpacity, 
  ActivityIndicator,
  Image,
} from 'react-native';
import { useSelector, useDispatch } from 'react-redux';
import { FontAwesome } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';

import { RootState, AppDispatch } from '../store';
import { theme } from '../theme';
import { getCart, updateCartItem, removeFromCart } from '../api/cartApi';
import Card3D from '../components/Card3D';
import ScreenHeader from '../components/ScreenHeader';
import alert from '../utils/alert';
import { useNavigation as useAppNavigation } from '../navigation/hooks';

type CartItem = {
  _id: string;
  product: {
    _id: string;
    name: string;
    price: number;
    images: string[];
  };
  quantity: number;
};

const CartScreen: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const navigation = useAppNavigation();
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [totalAmount, setTotalAmount] = useState(0);

  useEffect(() => {
    loadCart();
  }, []);

  useEffect(() => {
    // Calculate total amount whenever cart items change
    const total = cartItems.reduce(
      (sum, item) => sum + item.product.price * item.quantity,
      0
    );
    setTotalAmount(total);
  }, [cartItems]);

  const loadCart = async () => {
    try {
      setLoading(true);
      const response = await getCart();
      if (response.success) {
        setCartItems(response.data);
      }
    } catch (error) {
      console.error('Failed to load cart:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleQuantityChange = async (itemId: string, newQuantity: number) => {
    if (newQuantity < 1) {
      handleRemoveItem(itemId);
      return;
    }

    try {
      const response = await updateCartItem(itemId, newQuantity);
      if (response.success) {
        setCartItems(prevItems =>
          prevItems.map(item => 
            item._id === itemId ? { ...item, quantity: newQuantity } : item
          )
        );
      }
    } catch (error) {
      console.error('Failed to update quantity:', error);
    }
  };

  const handleRemoveItem = async (itemId: string) => {
    try {
      alert(
        'Remove Item',
        'Are you sure you want to remove this item from your cart?',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Remove',
            style: 'destructive',
            onPress: async () => {
              const response = await removeFromCart(itemId);
              if (response.success) {
                setCartItems(prevItems => prevItems.filter(item => item._id !== itemId));
              }
            },
          },
        ]
      );
    } catch (error) {
      console.error('Failed to remove item:', error);
    }
  };

  const handleCheckout = () => {
    if (cartItems.length === 0) {
      alert('Empty Cart', 'Please add items to your cart before checkout.');
      return;
    }
    
    // Navigate to checkout screen with the total amount
    navigation.navigate('CheckoutScreen', {
      totalAmount: totalAmount + (totalAmount > 0 ? 50 : 0)
    });
  };

  const handleShopNow = () => {
    navigation.navigate('TabNavigator', { screen: 'ShopsTab' });
  };

  const renderCartItem = ({ item }: { item: CartItem }) => (
    <Card3D style={styles.cartItemCard}>
      <Image 
        source={{ uri: item.product.images[0] || 'https://via.placeholder.com/100' }} 
        style={styles.productImage} 
      />
      <View style={styles.itemContent}>
        <Text style={styles.productName}>{item.product.name}</Text>
        <Text style={styles.productPrice}>₹{item.product.price.toFixed(2)}</Text>
        
        <View style={styles.quantityContainer}>
          <TouchableOpacity
            style={styles.quantityButton}
            onPress={() => handleQuantityChange(item._id, item.quantity - 1)}
          >
            <FontAwesome name="minus" size={12} color={theme.colors.text} />
          </TouchableOpacity>
          
          <Text style={styles.quantityText}>{item.quantity}</Text>
          
          <TouchableOpacity
            style={styles.quantityButton}
            onPress={() => handleQuantityChange(item._id, item.quantity + 1)}
          >
            <FontAwesome name="plus" size={12} color={theme.colors.text} />
          </TouchableOpacity>
        </View>
      </View>
      
      <TouchableOpacity
        style={styles.removeButton}
        onPress={() => handleRemoveItem(item._id)}
      >
        <FontAwesome name="trash" size={18} color={theme.colors.error} />
      </TouchableOpacity>
    </Card3D>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScreenHeader title="My Cart" />
      
      <View style={styles.contentContainer}>
        {cartItems.length > 0 ? (
          <>
            <FlatList
              data={cartItems}
              renderItem={renderCartItem}
              keyExtractor={(item) => item._id}
              contentContainerStyle={styles.cartList}
              showsVerticalScrollIndicator={false}
            />
            
            <Card3D style={styles.summaryCard}>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Subtotal</Text>
                <Text style={styles.summaryValue}>₹{totalAmount.toFixed(2)}</Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Delivery</Text>
                <Text style={styles.summaryValue}>₹{(totalAmount > 0 ? 50 : 0).toFixed(2)}</Text>
              </View>
              <View style={styles.divider} />
              <View style={styles.summaryRow}>
                <Text style={styles.totalLabel}>Total</Text>
                <Text style={styles.totalValue}>₹{(totalAmount + (totalAmount > 0 ? 50 : 0)).toFixed(2)}</Text>
              </View>
              
              <TouchableOpacity
                style={styles.checkoutButton}
                onPress={handleCheckout}
              >
                <Text style={styles.checkoutButtonText}>Proceed to Checkout</Text>
              </TouchableOpacity>
            </Card3D>
          </>
        ) : (
          <View style={styles.emptyCartContainer}>
            <FontAwesome name="shopping-cart" size={64} color={theme.colors.lightGray} />
            <Text style={styles.emptyCartText}>Your cart is empty</Text>
            <TouchableOpacity 
              style={styles.shopNowButton}
              onPress={handleShopNow}
            >
              <Text style={styles.shopNowText}>Shop Now</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  contentContainer: {
    flex: 1,
    padding: theme.spacing.md,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cartList: {
    flexGrow: 1,
    paddingBottom: 16,
  },
  cartItemCard: {
    marginBottom: 12,
    borderRadius: 12,
    padding: 12,
    backgroundColor: theme.colors.white,
    flexDirection: 'row',
    alignItems: 'center',
  },
  productImage: {
    width: 70,
    height: 70,
    borderRadius: 8,
    marginRight: 12,
  },
  itemContent: {
    flex: 1,
  },
  productName: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
    color: theme.colors.text,
  },
  productPrice: {
    fontSize: 15,
    fontWeight: 'bold',
    color: theme.colors.primary,
    marginBottom: 8,
  },
  quantityContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.bgLight,
    borderRadius: 20,
    paddingVertical: 4,
    paddingHorizontal: 8,
    alignSelf: 'flex-start',
  },
  quantityButton: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: theme.colors.white,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  quantityText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: theme.colors.text,
    marginHorizontal: 12,
    minWidth: 20,
    textAlign: 'center',
  },
  removeButton: {
    padding: 8,
  },
  summaryCard: {
    padding: 16,
    borderRadius: 12,
    backgroundColor: theme.colors.white,
    marginTop: 'auto',
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
    fontWeight: '500',
  },
  divider: {
    height: 1,
    backgroundColor: theme.colors.border,
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
  checkoutButton: {
    backgroundColor: theme.colors.primary,
    borderRadius: 25,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 16,
  },
  checkoutButtonText: {
    color: theme.colors.white,
    fontSize: 16,
    fontWeight: 'bold',
  },
  emptyCartContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyCartText: {
    fontSize: 18,
    color: theme.colors.textLight,
    marginTop: 16,
    marginBottom: 24,
  },
  shopNowButton: {
    backgroundColor: theme.colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 25,
  },
  shopNowText: {
    color: theme.colors.white,
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default CartScreen; 
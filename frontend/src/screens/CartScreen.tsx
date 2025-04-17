import React, {useEffect, useState, useCallback, useRef} from 'react'
import {View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, Image} from 'react-native'
import {useDispatch, useSelector} from 'react-redux'
import {RootState, AppDispatch} from '../store'
import {getCart, removeFromCart, updateCartItem, clearCart} from '../store/cartSlice'
import {CartItem} from '../store/cartSlice'
import {Ionicons} from '@expo/vector-icons'
import Toast from 'react-native-toast-message'

import {theme} from '../theme'
import Card3D from '../components/Card3D'
import ScreenHeader from '../components/ScreenHeader'
import alert from '../utils/alert'
import {useNavigation as useAppNavigation} from '../navigation/hooks'

const CartScreen = () => {
  const dispatch = useDispatch<AppDispatch>()
  const navigation = useAppNavigation()
  const {items, loading, currentRequest, error, totalItems, totalAmount} = useSelector((state: RootState) => state.cart)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const isInitialMount = useRef(true)
  const [updatingItemId, setUpdatingItemId] = useState<string | null>(null)

  const fetchCart = useCallback(async () => {
    try {
      await dispatch(getCart()).unwrap()
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Failed to load cart items',
      })
    }
  }, [dispatch])

  useEffect(() => {
    if (isInitialMount.current) {
      fetchCart()
      isInitialMount.current = false
    }
  }, [fetchCart])

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true)
    await fetchCart()
    setIsRefreshing(false)
  }, [fetchCart])

  const handleRemoveItem = async (itemId: string) => {
    try {
      setUpdatingItemId(itemId)
      await dispatch(removeFromCart(itemId)).unwrap()
      Toast.show({
        type: 'success',
        text1: 'Item Removed',
        text2: 'Item has been removed from your cart',
      })
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Failed to remove item from cart',
      })
    } finally {
      setUpdatingItemId(null)
    }
  }

  const handleUpdateQuantity = async (itemId: string, quantity: number) => {
    if (quantity > 0) {
      try {
        setUpdatingItemId(itemId)
        await dispatch(updateCartItem({itemId, quantity})).unwrap()
      } catch (error) {
        Toast.show({
          type: 'error',
          text1: 'Error',
          text2: 'Failed to update quantity',
        })
      } finally {
        setUpdatingItemId(null)
      }
    } else {
      handleRemoveItem(itemId)
    }
  }

  const handleClearCart = async () => {
    try {
      await dispatch(clearCart()).unwrap()
      Toast.show({
        type: 'success',
        text1: 'Cart Cleared',
        text2: 'Your cart has been cleared',
      })
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Failed to clear cart',
      })
    }
  }

  const handleCheckout = () => {
    if (items.length === 0) {
      alert('Empty Cart', 'Please add items to your cart before checkout.')
      return
    }

    // Navigate to checkout screen with the total amount
    navigation.navigate('Checkout', {
      totalAmount: totalAmount + (totalAmount > 0 ? 50 : 0),
    })
  }

  const handleShopNow = () => {
    navigation.navigate('TabNavigator', {screen: 'ShopsTab'})
  }

  const renderItem = ({item}: {item: CartItem}) => {
    // Ensure item.product exists before rendering
    if (!item.product) {
      return null;
    }
    
    // Safe access to price with fallback to 0
    const price = item.product.price || 0;
    const isUpdatingThisItem = updatingItemId === item.product._id;
    
    return (
      <View style={styles.cartItem}>
        <Image 
          source={item.product.image ? {uri: item.product.image} : {uri: 'https://via.placeholder.com/100'}} 
          style={styles.productImage} 
          onError={(e) => console.log('Image loading error:', e.nativeEvent.error)}
        />
        <View style={styles.itemDetails}>
          <Text style={styles.productName}>{item.product.name}</Text>
          <Text style={styles.productPrice}>₹{price.toFixed(2)}</Text>
          <View style={styles.quantityContainer}>
            {isUpdatingThisItem ? (
              <ActivityIndicator size="small" color={theme.colors.primary} style={{width: 80}} />
            ) : (
              <>
                <TouchableOpacity
                  onPress={() => handleUpdateQuantity(item.product._id, item.quantity - 1)}
                  style={styles.quantityButton}
                  disabled={isUpdatingThisItem}>
                  <Ionicons name='remove' size={20} color='#000' />
                </TouchableOpacity>
                <Text style={styles.quantity}>{item.quantity}</Text>
                <TouchableOpacity
                  onPress={() => handleUpdateQuantity(item.product._id, item.quantity + 1)}
                  style={styles.quantityButton}
                  disabled={isUpdatingThisItem || (item.product.stock !== undefined && item.quantity >= item.product.stock)}>
                  <Ionicons name='add' size={20} color='#000' />
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
        <TouchableOpacity 
          onPress={() => handleRemoveItem(item.product._id)} 
          style={styles.removeButton}
          disabled={isUpdatingThisItem}>
          {isUpdatingThisItem ? (
            <ActivityIndicator size="small" color="#ff4444" />
          ) : (
            <Ionicons name='trash-outline' size={24} color='#ff4444' />
          )}
        </TouchableOpacity>
      </View>
    )
  }

  // Only show full screen loader on initial load, not for item updates
  if (loading && currentRequest === 'getCart' && items.length === 0) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size='large' color='#0000ff' />
      </View>
    )
  }

  if (error) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>{error}</Text>
      </View>
    )
  }

  return (
    <View style={styles.container}>
      <ScreenHeader title='My Cart' />

      <View style={styles.contentContainer}>
        {items.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>Your cart is empty</Text>
            <TouchableOpacity style={styles.shopNowButton} onPress={handleShopNow}>
              <Text style={styles.shopNowText}>Shop Now</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            <FlatList
              data={items}
              renderItem={renderItem}
              keyExtractor={(item) => item._id}
              contentContainerStyle={styles.listContainer}
              refreshing={isRefreshing}
              onRefresh={handleRefresh}
            />

            <Card3D style={styles.summaryCard}>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Total Items:</Text>
                <Text style={styles.summaryValue}>{totalItems || 0}</Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Total Amount:</Text>
                <Text style={styles.summaryValue}>₹{(totalAmount || 0).toFixed(2)}</Text>
              </View>
              <View style={styles.divider} />
              <View style={styles.summaryRow}>
                <Text style={styles.totalLabel}>Total</Text>
                <Text style={styles.totalValue}>
                  ₹{((totalAmount || 0) + ((totalAmount || 0) > 0 ? 50 : 0)).toFixed(2)}
                </Text>
              </View>

              {loading && currentRequest === 'clearCart' ? (
                <View style={styles.checkoutButton}>
                  <ActivityIndicator size="small" color="#ffffff" />
                </View>
              ) : (
                <>
                  <TouchableOpacity 
                    style={styles.checkoutButton} 
                    onPress={handleCheckout}
                    disabled={loading}>
                    <Text style={styles.checkoutButtonText}>Proceed to Checkout</Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={styles.clearButton} 
                    onPress={handleClearCart}
                    disabled={loading}>
                    <Text style={styles.clearButtonText}>Clear Cart</Text>
                  </TouchableOpacity>
                </>
              )}
            </Card3D>
          </>
        )}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  contentContainer: {
    flex: 1,
    padding: theme.spacing.md,
    paddingBottom: 100,
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
    color: '#ff4444',
    fontSize: 16,
    textAlign: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 18,
    color: '#666',
  },
  listContainer: {
    padding: 16,
  },
  cartItem: {
    flexDirection: 'row',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    alignItems: 'center',
  },
  productImage: {
    width: 80,
    height: 80,
    borderRadius: 8,
    marginRight: 16,
  },
  itemDetails: {
    flex: 1,
  },
  productName: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  productPrice: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  quantityContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  quantityButton: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  quantity: {
    marginHorizontal: 16,
    fontSize: 16,
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
    fontSize: 16,
    color: '#666',
  },
  summaryValue: {
    fontSize: 16,
    fontWeight: 'bold',
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
  clearButton: {
    backgroundColor: '#ff4444',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 8,
  },
  clearButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
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
})

export default CartScreen

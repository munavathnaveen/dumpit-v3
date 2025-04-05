import React, { useEffect, useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  FlatList, 
  TouchableOpacity, 
  ActivityIndicator,
  RefreshControl
} from 'react-native';
import { useSelector, useDispatch } from 'react-redux';
import { FontAwesome } from '@expo/vector-icons';
import { format } from 'date-fns';

import { RootState, AppDispatch } from '../store';
import { theme } from '../theme';
import { getOrders } from '../api/orderApi';
import Card3D from '../components/Card3D';
import ScreenHeader from '../components/ScreenHeader';
import { useNavigation } from '../navigation/hooks';

type OrderStatus = 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled';

type Order = {
  _id: string;
  orderNumber: string;
  status: OrderStatus;
  totalAmount: number;
  items: Array<{
    product: {
      _id: string;
      name: string;
    };
    quantity: number;
    price: number;
  }>;
  createdAt: string;
};

const OrdersScreen: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const navigation = useNavigation();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadOrders();
  }, []);

  const loadOrders = async () => {
    try {
      setLoading(true);
      const response = await getOrders();
      if (response.success) {
        setOrders(response.data);
      }
    } catch (error) {
      console.error('Failed to load orders:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadOrders();
    setRefreshing(false);
  };

  const getStatusColor = (status: OrderStatus) => {
    switch (status) {
      case 'pending': return theme.colors.warning;
      case 'processing': return theme.colors.info;
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

  const renderOrderItem = ({ item }: { item: Order }) => (
    <Card3D style={styles.orderCard}>
      <View style={styles.orderHeader}>
        <Text style={styles.orderNumber}>Order #{item.orderNumber}</Text>
        <View style={[styles.statusContainer, { backgroundColor: `${getStatusColor(item.status)}20` }]}>
          <FontAwesome name={getStatusIcon(item.status)} size={14} color={getStatusColor(item.status)} />
          <Text style={[styles.statusText, { color: getStatusColor(item.status) }]}>
            {item.status.charAt(0).toUpperCase() + item.status.slice(1)}
          </Text>
        </View>
      </View>
      
      <View style={styles.orderDate}>
        <FontAwesome name="calendar" size={14} color={theme.colors.textLight} />
        <Text style={styles.dateText}>
          {format(new Date(item.createdAt), 'dd MMM yyyy, hh:mm a')}
        </Text>
      </View>
      
      <View style={styles.itemsContainer}>
        <Text style={styles.itemsTitle}>Items:</Text>
        {item.items.map((orderItem, index) => (
          <Text key={index} style={styles.itemText}>
            {orderItem.quantity}x {orderItem.product.name}
          </Text>
        ))}
      </View>
      
      <View style={styles.orderFooter}>
        <Text style={styles.totalAmount}>
          Total: ₹{item.totalAmount.toFixed(2)}
        </Text>
        <TouchableOpacity style={styles.detailsButton}>
          <Text style={styles.detailsText}>View Details</Text>
          <FontAwesome name="chevron-right" size={12} color={theme.colors.primary} />
        </TouchableOpacity>
      </View>
    </Card3D>
  );

  const handleShopNow = () => {
    navigation.navigate('Shops');
  };

  if (loading && !refreshing) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScreenHeader title="My Orders" />
      
      <View style={styles.contentContainer}>
        <FlatList
          data={orders}
          renderItem={renderOrderItem}
          keyExtractor={(item) => item._id}
          contentContainerStyle={styles.ordersList}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <FontAwesome name="shopping-bag" size={64} color={theme.colors.lightGray} />
              <Text style={styles.emptyText}>No orders yet</Text>
              <TouchableOpacity 
                style={styles.shopNowButton}
                onPress={handleShopNow}
              >
                <Text style={styles.shopNowText}>Shop Now</Text>
              </TouchableOpacity>
            </View>
          }
        />
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
  ordersList: {
    paddingBottom: 80,
  },
  orderCard: {
    marginBottom: 16,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: theme.colors.white,
    padding: 16,
  },
  orderHeader: {
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
  statusContainer: {
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
  orderDate: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  dateText: {
    marginLeft: 6,
    fontSize: 12,
    color: theme.colors.textLight,
  },
  itemsContainer: {
    marginBottom: 12,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  itemsTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 4,
    color: theme.colors.text,
  },
  itemText: {
    fontSize: 14,
    color: theme.colors.text,
    marginVertical: 2,
  },
  orderFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    paddingTop: 12,
  },
  totalAmount: {
    fontSize: 16,
    fontWeight: 'bold',
    color: theme.colors.text,
  },
  detailsButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  detailsText: {
    fontSize: 14,
    color: theme.colors.primary,
    marginRight: 4,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 16,
    color: theme.colors.textLight,
    marginTop: 12,
    marginBottom: 20,
  },
  shopNowButton: {
    backgroundColor: theme.colors.primary,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  shopNowText: {
    color: theme.colors.white,
    fontWeight: 'bold',
    fontSize: 16,
  },
});

export default OrdersScreen; 
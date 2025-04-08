import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useSelector, useDispatch } from 'react-redux';

import Card3D from '../../components/Card3D';
import ScreenHeader from '../../components/ScreenHeader';
import { theme } from '../../theme';
import { fetchAnalytics, Analytics } from '../../api/analyticsApi';
import { RootState } from '../../store';
import { MainStackNavigationProp } from '../../navigation/types';
import { logout } from '../../store/authSlice';
import { AppDispatch } from '../../store';

const VendorDashboardScreen: React.FC = () => {
  const navigation = useNavigation<MainStackNavigationProp<'VendorDashboard'>>();
  const dispatch = useDispatch<AppDispatch>();
  const { user } = useSelector((state: RootState) => state.auth);
  const [loading, setLoading] = useState(true);
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadAnalytics = async () => {
      try {
        setLoading(true);
        const data = await fetchAnalytics();
        setAnalytics(data);
        setError(null);
      } catch (error) {
        console.error('Failed to load analytics:', error);
        setError('Failed to load dashboard data');
      } finally {
        setLoading(false);
      }
    };

    loadAnalytics();
  }, []);

  const handleNotificationPress = () => {
    navigation.navigate('Notifications');
  };

  const renderDashboardItem = (
    title: string, 
    value: string | number, 
    icon: string, 
    color: string,
    onPress?: () => void
  ) => (
    <TouchableOpacity 
      style={styles.dashboardItem} 
      onPress={onPress}
      disabled={!onPress}
    >
      <Card3D style={styles.dashboardCard} elevation="small">
        <View style={[styles.iconContainer, { backgroundColor: color }]}>
          <Ionicons name={icon as any} size={24} color="white" />
        </View>
        <Text style={styles.dashboardItemTitle}>{title}</Text>
        <Text style={styles.dashboardItemValue}>{value}</Text>
      </Card3D>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={styles.container}>
        <ScreenHeader 
          title="Dashboard" 
          showBackButton={false} 
          onNotificationPress={handleNotificationPress}
        />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
        </View>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.container}>
        <ScreenHeader 
          title="Dashboard" 
          showBackButton={false} 
          onNotificationPress={handleNotificationPress}
        />
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity 
            style={styles.retryButton}
            onPress={() => navigation.replace('VendorDashboard')}
          >
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScreenHeader 
        title="Dashboard" 
        showBackButton={false} 
        onNotificationPress={handleNotificationPress}
      />
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.contentContainer}>
        <View style={styles.header}>
          <View style={styles.headerTop}>
            <View>
              <Text style={styles.greeting}>Hello, {user?.name || 'Vendor'}!</Text>
              <Text style={styles.subTitle}>Here's your business at a glance</Text>
            </View>
          </View>
        </View>

        <View style={styles.dashboardGrid}>
          {renderDashboardItem(
            'Total Revenue', 
            analytics?.totalRevenue ? `₹${analytics.totalRevenue.toFixed(2)}` : '₹0.00',
            'cash-outline',
            theme.colors.success,
            () => navigation.navigate('VendorAnalytics')
          )}
          
          {renderDashboardItem(
            'Orders', 
            analytics?.totalOrders || 0, 
            'receipt-outline',
            theme.colors.warning,
            () => navigation.navigate('VendorOrders')
          )}
          
          {renderDashboardItem(
            'Products', 
            analytics?.totalProducts || 0, 
            'cube-outline',
            theme.colors.primary,
            () => navigation.navigate('VendorProducts')
          )}
          
          {renderDashboardItem(
            'Pending Orders', 
            analytics?.pendingOrders || 0, 
            'time-outline',
            theme.colors.error,
            () => navigation.navigate('VendorOrders')
          )}
        </View>

        <Card3D style={styles.recentActivityCard} elevation="medium">
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>Recent Orders</Text>
            <TouchableOpacity onPress={() => navigation.navigate('VendorOrders')}>
              <Text style={styles.viewAllText}>View All</Text>
            </TouchableOpacity>
          </View>

          {analytics?.recentOrders && analytics.recentOrders.length > 0 ? (
            analytics.recentOrders.map((order, index) => (
              <TouchableOpacity 
                key={order.id}
                style={[
                  styles.orderItem,
                  index !== analytics.recentOrders.length - 1 && styles.orderItemBorder
                ]}
                onPress={() => navigation.navigate('VendorOrderDetails', { orderId: order.id })}
              >
                <View style={styles.orderInfo}>
                  <Text style={styles.orderCustomer}>{order.customerName}</Text>
                  <Text style={styles.orderDate}>{new Date(order.date).toLocaleDateString()}</Text>
                </View>
                <View style={styles.orderDetails}>
                  <Text style={styles.orderAmount}>₹{order.total.toFixed(2)}</Text>
                  <View style={[
                    styles.orderStatus,
                    { backgroundColor: getStatusColor(order.status) }
                  ]}>
                    <Text style={styles.orderStatusText}>{order.status}</Text>
                  </View>
                </View>
              </TouchableOpacity>
            ))
          ) : (
            <Text style={styles.noDataText}>No recent orders found</Text>
          )}
        </Card3D>

        <View style={styles.actionButtonsContainer}>
          <TouchableOpacity 
            style={styles.actionButton}
            onPress={() => navigation.navigate('VendorAddProduct')}
          >
            <Card3D style={styles.actionButtonCard} elevation="small">
              <Ionicons name="add-circle-outline" size={24} color={theme.colors.primary} />
              <Text style={styles.actionButtonText}>Add Product</Text>
            </Card3D>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.actionButton}
            onPress={() => navigation.navigate('VendorShopSetup')}
          >
            <Card3D style={styles.actionButtonCard} elevation="small">
              <Ionicons name="storefront-outline" size={24} color={theme.colors.primary} />
              <Text style={styles.actionButtonText}>Shop Setup</Text>
            </Card3D>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.actionButton}
            onPress={() => navigation.navigate('VendorImportExport')}
          >
            <Card3D style={styles.actionButtonCard} elevation="small">
              <Ionicons name="cloud-download-outline" size={24} color={theme.colors.primary} />
              <Text style={styles.actionButtonText}>Import/Export</Text>
            </Card3D>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.actionButton}
            onPress={() => navigation.navigate('VendorPayments')}
          >
            <Card3D style={styles.actionButtonCard} elevation="small">
              <Ionicons name="wallet-outline" size={24} color={theme.colors.primary} />
              <Text style={styles.actionButtonText}>Payments</Text>
            </Card3D>
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
  scrollView: {
    flex: 1,
  },
  contentContainer: {
    padding: theme.spacing.md,
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
  header: {
    marginBottom: theme.spacing.lg,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.sm,
  },
  greeting: {
    fontSize: 24,
    fontWeight: 'bold',
    color: theme.colors.primary,
    marginBottom: theme.spacing.xs,
  },
  subTitle: {
    fontSize: 16,
    color: theme.colors.gray,
  },
  dashboardGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: theme.spacing.lg,
  },
  dashboardItem: {
    width: '50%',
    padding: theme.spacing.xs,
  },
  dashboardCard: {
    padding: theme.spacing.md,
    alignItems: 'center',
    backgroundColor: theme.colors.white,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: theme.spacing.sm,
  },
  dashboardItemTitle: {
    fontSize: 14,
    color: theme.colors.gray,
    marginBottom: theme.spacing.xs,
  },
  dashboardItemValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: theme.colors.dark,
  },
  recentActivityCard: {
    marginBottom: theme.spacing.lg,
    padding: theme.spacing.md,
    backgroundColor: theme.colors.white,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: theme.colors.dark,
  },
  viewAllText: {
    fontSize: 14,
    color: theme.colors.primary,
    fontWeight: '500',
  },
  orderItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: theme.spacing.sm,
  },
  orderItemBorder: {
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.lightGray,
  },
  orderInfo: {
    flex: 1,
  },
  orderCustomer: {
    fontSize: 16,
    fontWeight: '500',
    color: theme.colors.dark,
    marginBottom: theme.spacing.xs,
  },
  orderDate: {
    fontSize: 14,
    color: theme.colors.gray,
  },
  orderDetails: {
    alignItems: 'flex-end',
  },
  orderAmount: {
    fontSize: 16,
    fontWeight: 'bold',
    color: theme.colors.dark,
    marginBottom: theme.spacing.xs,
  },
  orderStatus: {
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 4,
    borderRadius: theme.borderRadius.small,
  },
  orderStatusText: {
    fontSize: 12,
    fontWeight: '500',
    color: theme.colors.white,
  },
  noDataText: {
    fontSize: 16,
    color: theme.colors.gray,
    textAlign: 'center',
    paddingVertical: theme.spacing.lg,
  },
  actionButtonsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: theme.spacing.lg,
  },
  actionButton: {
    flex: 1,
    marginHorizontal: theme.spacing.xs,
  },
  actionButtonCard: {
    padding: theme.spacing.md,
    alignItems: 'center',
    backgroundColor: theme.colors.white,
  },
  actionButtonText: {
    fontSize: 14,
    color: theme.colors.dark,
    marginTop: theme.spacing.xs,
    textAlign: 'center',
  },
});

export default VendorDashboardScreen; 
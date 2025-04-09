import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Dimensions,
  RefreshControl,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useFocusEffect } from '@react-navigation/core';
import { Ionicons } from '@expo/vector-icons';

import Card3D from '../../components/Card3D';
import ScreenHeader from '../../components/ScreenHeader';
import { theme } from '../../theme';
import { MainStackNavigationProp } from '../../navigation/types';
import { fetchAnalytics, Analytics } from '../../api/analyticsApi';
import { getVendorOrderStats } from '../../api/orderApi';

// Time periods for data filtering
// const TIME_PERIODS = ['Weekly', 'Monthly', 'Yearly'];

const VendorAnalyticsScreen: React.FC = () => {
  const navigation = useNavigation<MainStackNavigationProp<'VendorAnalytics'>>();
  
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [orderStats, setOrderStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    try {
      setError(null);
      const [analyticsData, statsData] = await Promise.all([
        fetchAnalytics(),
        getVendorOrderStats()
      ]);
      setAnalytics(analyticsData);
      setOrderStats(statsData);
    } catch (error) {
      console.error('Failed to load analytics data:', error);
      setError('Failed to load analytics data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, []);

  useFocusEffect(
    React.useCallback(() => {
      loadData();
      
      return () => {
        // Cleanup if needed when screen loses focus
      };
    }, [])
  );

  const handleRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const renderStats = (title: string, value: string | number, icon: string, color: string) => (
    <Card3D style={styles.statCard} elevation="small">
      <View style={[styles.iconContainer, { backgroundColor: color }]}>
        <Ionicons name={icon as any} size={20} color="white" />
      </View>
      <View style={styles.statContent}>
        <Text style={styles.statTitle}>{title}</Text>
        <Text style={styles.statValue}>{value}</Text>
      </View>
    </Card3D>
  );

  // Simplify chart to only show monthly data
  const renderMonthlyRevenueChart = () => {
    if (!analytics || !analytics.revenue || !analytics.revenue.monthly) return null;

    const data = analytics.revenue.monthly.map(item => ({
      label: item.month,
      value: item.amount
    }));

    // Find the maximum value for scaling
    const maxValue = Math.max(...data.map(item => item.value));

    return (
      <View style={styles.chartContainer}>
        {data.map((item, index) => {
          const barHeight = (item.value / maxValue) * 150;
          return (
            <View key={index} style={styles.barContainer}>
              <View style={styles.barLabelContainer}>
                <Text style={styles.barValue}>₹{item.value.toLocaleString()}</Text>
              </View>
              <View style={[styles.bar, { height: barHeight }]} />
              <Text style={styles.barLabel}>{item.label}</Text>
            </View>
          );
        })}
      </View>
    );
  };

  // Order status breakdown
  const renderOrderStatusChart = () => {
    if (!analytics || !analytics.ordersByStatus) return null;

    const totalOrders = analytics.ordersByStatus.reduce((sum, item) => sum + item.count, 0);

    return (
      <View style={styles.orderStatusContainer}>
        {analytics.ordersByStatus.map((item, index) => {
          const percentage = totalOrders > 0 ? (item.count / totalOrders) * 100 : 0;
          const statusColor = getStatusColor(item.status);
          
          return (
            <View key={index} style={styles.statusRow}>
              <View style={styles.statusLabelContainer}>
                <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
                <Text style={styles.statusLabel}>
                  {item.status.charAt(0).toUpperCase() + item.status.slice(1)}
                </Text>
              </View>
              <View style={styles.statusBarContainer}>
                <View style={[styles.statusBar, { backgroundColor: statusColor, width: `${percentage}%` }]} />
              </View>
              <Text style={styles.statusCount}>{item.count}</Text>
            </View>
          );
        })}
      </View>
    );
  };

  if (loading && !refreshing) {
    return (
      <View style={styles.container}>
        <ScreenHeader title="Analytics" showBackButton={true} />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScreenHeader title="Analytics" showBackButton={true} />
      
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.contentContainer}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={[theme.colors.primary]}
          />
        }
      >
        {error ? (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity 
              style={styles.retryButton}
              onPress={loadData}
            >
              <Text style={styles.retryButtonText}>Retry</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            {/* Key Metrics */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Key Metrics</Text>
              <View style={styles.statsGrid}>
                {renderStats(
                  'Total Revenue',
                  `₹${analytics?.totalRevenue?.toLocaleString() || '0'}`,
                  'cash-outline',
                  theme.colors.success
                )}
                {renderStats(
                  'Total Orders',
                  analytics?.totalOrders?.toString() || '0',
                  'receipt-outline',
                  theme.colors.primary
                )}
                {renderStats(
                  'Products',
                  analytics?.totalProducts?.toString() || '0',
                  'cube-outline',
                  theme.colors.info
                )}
                {renderStats(
                  'Pending Orders',
                  analytics?.pendingOrders?.toString() || '0',
                  'time-outline',
                  theme.colors.warning
                )}
              </View>
            </View>

            {/* Monthly Revenue Chart */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Monthly Revenue</Text>
              <Card3D style={styles.chartCard} elevation="medium">
                {renderMonthlyRevenueChart()}
              </Card3D>
            </View>

            {/* Order Status Breakdown */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Order Status Breakdown</Text>
              <Card3D style={styles.chartCard} elevation="medium">
                {renderOrderStatusChart()}
              </Card3D>
            </View>

            {/* Export Data Button */}
            <TouchableOpacity 
              style={styles.exportButton}
              onPress={() => navigation.navigate('VendorImportExport')}
            >
              <Ionicons name="download-outline" size={20} color={theme.colors.white} />
              <Text style={styles.exportButtonText}>Export Analytics Data</Text>
            </TouchableOpacity>
          </>
        )}
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
  scrollView: {
    flex: 1,
  },
  contentContainer: {
    paddingBottom: theme.spacing.xl,
    paddingHorizontal: theme.spacing.md,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorContainer: {
    padding: theme.spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
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
  section: {
    marginHorizontal: theme.spacing.md,
    marginTop: theme.spacing.lg,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: theme.colors.dark,
    marginBottom: theme.spacing.sm,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -theme.spacing.xs,
  },
  statCard: {
    width: '50%',
    paddingHorizontal: theme.spacing.xs,
    marginBottom: theme.spacing.sm,
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'absolute',
    top: -12,
    left: theme.spacing.sm,
    ...theme.shadow.small,
  },
  statContent: {
    backgroundColor: theme.colors.white,
    padding: theme.spacing.md,
    paddingTop: theme.spacing.lg,
    borderRadius: theme.borderRadius.medium,
  },
  statTitle: {
    fontSize: 14,
    color: theme.colors.gray,
    marginBottom: theme.spacing.xs,
  },
  statValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: theme.colors.dark,
  },
  chartCard: {
    backgroundColor: theme.colors.white,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.medium,
  },
  chartContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    height: 200,
    paddingVertical: theme.spacing.md,
  },
  barContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  barLabelContainer: {
    marginBottom: theme.spacing.xs,
  },
  barValue: {
    fontSize: 10,
    color: theme.colors.gray,
    textAlign: 'center',
  },
  bar: {
    width: 20,
    backgroundColor: theme.colors.primary,
    borderTopLeftRadius: 4,
    borderTopRightRadius: 4,
  },
  barLabel: {
    fontSize: 10,
    color: theme.colors.gray,
    marginTop: theme.spacing.xs,
  },
  orderStatusContainer: {
    marginVertical: theme.spacing.sm,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.sm,
  },
  statusLabelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    width: 100,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: theme.spacing.xs,
  },
  statusLabel: {
    fontSize: 12,
    color: theme.colors.dark,
  },
  statusBarContainer: {
    flex: 1,
    height: 12,
    backgroundColor: theme.colors.bgLight,
    borderRadius: 6,
    marginHorizontal: theme.spacing.sm,
    overflow: 'hidden',
  },
  statusBar: {
    height: '100%',
    borderRadius: 6,
  },
  statusCount: {
    fontSize: 12,
    fontWeight: 'bold',
    color: theme.colors.dark,
    width: 30,
    textAlign: 'right',
  },
  exportButton: {
    flexDirection: 'row',
    backgroundColor: theme.colors.primary,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.medium,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: theme.spacing.md,
    marginTop: theme.spacing.lg,
    ...theme.shadow.small,
  },
  exportButtonText: {
    color: theme.colors.white,
    fontWeight: 'bold',
    marginLeft: theme.spacing.sm,
  },
});

export default VendorAnalyticsScreen; 
import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Switch,
  ActivityIndicator,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useSelector, useDispatch } from 'react-redux';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons, Feather } from '@expo/vector-icons';

import Card3D from '../components/Card3D';
import ScreenHeader from '../components/ScreenHeader';
import { theme } from '../theme';
import { RootState, AppDispatch } from '../store';
import {
  fetchNotifications,
  markNotificationRead,
  updateNotificationSettings,
} from '../store/userSlice';
import { MainStackParamList } from '../navigation/types';
import { USER_ROLES } from '../utils/constants';

type NotificationScreenNavigationProp = NativeStackNavigationProp<MainStackParamList, 'Notifications'>;

const NotificationsScreen = () => {
  const navigation = useNavigation<NotificationScreenNavigationProp>();
  const dispatch = useDispatch<AppDispatch>();
  const { user } = useSelector((state: RootState) => state.auth);
  const { notifications, notificationSettings, loading } = useSelector((state: RootState) => state.user);
  
  const isVendor = user?.role === USER_ROLES.VENDOR;
  const [emailNotifications, setEmailNotifications] = useState(notificationSettings?.email || false);
  const [pushNotifications, setPushNotifications] = useState(notificationSettings?.push || false);

  useEffect(() => {
    if (user?._id) {
      dispatch(fetchNotifications(user._id));
    }
  }, [dispatch, user]);

  // Update local state when Redux store changes
  useEffect(() => {
    if (notificationSettings) {
      setEmailNotifications(notificationSettings.email);
      setPushNotifications(notificationSettings.push);
    }
  }, [notificationSettings]);

  const handleMarkAsRead = (notificationId: string) => {
    if (user?._id) {
      dispatch(markNotificationRead({ userId: user._id, notificationId }));
    }
  };

  const handleToggleEmailNotifications = (value: boolean) => {
    setEmailNotifications(value);
    if (user?._id) {
      dispatch(
        updateNotificationSettings({
          userId: user._id,
          settings: { email: value },
        })
      );
    }
  };

  const handleTogglePushNotifications = (value: boolean) => {
    setPushNotifications(value);
    if (user?._id) {
      dispatch(
        updateNotificationSettings({
          userId: user._id,
          settings: { push: value },
        })
      );
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <ScreenHeader title="Notifications" showBackButton={true} />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
        </View>
      </View>
    );
  }

  // Filter notifications based on role
  const filteredNotifications = isVendor 
    ? notifications.filter(notification => 
        notification.message.includes('order') || 
        notification.message.includes('product') || 
        notification.message.includes('payment'))
    : notifications;

  return (
    <View style={styles.container}>
      <ScreenHeader title="Notifications" showBackButton={true} />

      {/* Notification Settings */}
      <Card3D style={styles.settingsCard}>
        <Text style={styles.settingsTitle}>Notification Settings</Text>
        <View style={styles.settingRow}>
          <Text style={styles.settingText}>Email Notifications</Text>
          <Switch
            value={emailNotifications}
            onValueChange={handleToggleEmailNotifications}
            trackColor={{ false: theme.colors.lightGray, true: theme.colors.primary }}
            thumbColor={theme.colors.white}
          />
        </View>
        <View style={styles.settingRow}>
          <Text style={styles.settingText}>Push Notifications</Text>
          <Switch
            value={pushNotifications}
            onValueChange={handleTogglePushNotifications}
            trackColor={{ false: theme.colors.lightGray, true: theme.colors.primary }}
            thumbColor={theme.colors.white}
          />
        </View>
      </Card3D>

      {/* Notifications List */}
      <FlatList
        data={filteredNotifications}
        keyExtractor={(item) => item._id}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[styles.notificationItem, item.read && styles.notificationRead]}
            onPress={() => !item.read && handleMarkAsRead(item._id)}
          >
            <Card3D elevation="small" style={styles.notificationCard}>
              <View style={styles.notificationHeader}>
                <Text style={styles.notificationDate}>{formatDate(item.createdAt)}</Text>
                {!item.read && <View style={styles.unreadDot} />}
              </View>
              <Text style={styles.notificationMessage}>{item.message}</Text>
              {!item.read && (
                <TouchableOpacity
                  style={styles.markAsReadButton}
                  onPress={() => handleMarkAsRead(item._id)}
                >
                  <Text style={styles.markAsReadText}>Mark as Read</Text>
                </TouchableOpacity>
              )}
            </Card3D>
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No notifications yet!</Text>
          </View>
        }
        contentContainerStyle={styles.listContent}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
    padding: theme.spacing.md,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: theme.spacing.sm,
    marginBottom: theme.spacing.md,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: theme.colors.text,
  },
  backButton: {
    padding: theme.spacing.xs,
  },
  placeholder: {
    width: 24, // Same size as back button for alignment
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginVertical: theme.spacing.lg,
    color: theme.colors.text,
  },
  settingsCard: {
    marginBottom: theme.spacing.lg,
  },
  settingsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: theme.spacing.md,
    color: theme.colors.text,
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: theme.spacing.sm,
  },
  settingText: {
    fontSize: 16,
    color: theme.colors.text,
  },
  listContent: {
    paddingBottom: theme.spacing.xl,
  },
  notificationItem: {
    marginBottom: theme.spacing.md,
  },
  notificationRead: {
    opacity: 0.7,
  },
  notificationCard: {
    padding: theme.spacing.md,
  },
  notificationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.xs,
  },
  notificationDate: {
    fontSize: 12,
    color: theme.colors.textLight,
  },
  unreadDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: theme.colors.primary,
  },
  notificationMessage: {
    fontSize: 14,
    color: theme.colors.text,
    marginBottom: theme.spacing.sm,
  },
  markAsReadButton: {
    alignSelf: 'flex-end',
    paddingVertical: theme.spacing.xs,
    paddingHorizontal: theme.spacing.sm,
    backgroundColor: theme.colors.primaryLight,
    borderRadius: theme.borderRadius.small,
  },
  markAsReadText: {
    fontSize: 12,
    color: theme.colors.primary,
    fontWeight: 'bold',
  },
  emptyContainer: {
    padding: theme.spacing.lg,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: theme.colors.textLight,
    textAlign: 'center',
  },
});

export default NotificationsScreen; 
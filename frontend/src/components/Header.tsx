import React, { ReactNode } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, Platform, StatusBar } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Feather } from '@expo/vector-icons';
import { theme } from '../theme';
import LogoImage from './LogoImage';
import { useDispatch, useSelector } from 'react-redux';
import { logout } from '../store/authSlice';
import { AppDispatch, RootState } from '../store';

// Get status bar height for proper spacing
const STATUSBAR_HEIGHT = Platform.OS === 'ios' ? 44 : StatusBar.currentHeight || 0;

export interface HeaderProps {
  location?: string;
  onNotificationPress?: () => void;
  showBackButton?: boolean;
  onProfilePress?: () => void;
  onLogoutPress?: () => void;
  rightComponent?: ReactNode;
  onLogoPress?: () => void;
  customLocation?: ReactNode;
  showLocation?: boolean;
}

const Header: React.FC<HeaderProps> = ({
  location = 'Your Location',
  onNotificationPress,
  showBackButton = false,
  onProfilePress,
  onLogoutPress,
  rightComponent,
  onLogoPress,
  customLocation,
  showLocation = false,
}) => {
  const navigation = useNavigation();
  const dispatch = useDispatch<AppDispatch>();
  const { notifications } = useSelector((state: RootState) => state.user);
  
  // Count unread notifications
  const unreadCount = notifications.filter(notification => !notification.read).length;

  const handleProfilePress = () => {
    if (onProfilePress) {
      onProfilePress();
    } else {
      navigation.navigate('Profile');
    }
  };

  const handleLogoutPress = () => {
    if (onLogoutPress) {
      onLogoutPress();
    } else {
      dispatch(logout());
      navigation.reset({
        index: 0,
        routes: [{ name: 'TabNavigator' }],
      });
    }
  };

  const handleNotificationPress = () => {
    if (onNotificationPress) {
      onNotificationPress();
    } else {
      navigation.navigate('Notifications');
    }
  };

  const handleLogoPress = () => {
    if (onLogoPress) {
      onLogoPress();
    } else {
      // Navigate to HomeTab or reset navigation to home
      navigation.navigate('TabNavigator', { screen: 'HomeTab' });
    }
  };

  return (
    <View style={styles.container}>
      {/* Left: Back button or Location */}
      <View style={styles.leftContainer}>
        {showBackButton ? (
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Feather name="arrow-left" size={24} color={theme.colors.primary} />
          </TouchableOpacity>
        ) : showLocation && customLocation ? (
          customLocation
        ) : showLocation ? (
          <View style={styles.locationContainer}>
            <Feather name="map-pin" size={18} color={theme.colors.primary} style={styles.locationIcon} />
            <Text style={styles.locationText} ellipsizeMode="tail" numberOfLines={1}>
              {location}
            </Text>
          </View>
        ) : (
          <View />
        )}
      </View>

      {/* Center: Logo */}
      <TouchableOpacity style={styles.logoContainer} onPress={handleLogoPress}>
        <LogoImage size="tiny" style={styles.logoImage} />
        <Text style={styles.logoText}>Dumpit</Text>
      </TouchableOpacity>

      {/* Right: Custom component or default icons */}
      {rightComponent ? (
        <View style={styles.rightContainer}>
          {rightComponent}
        </View>
      ) : (
        <View style={styles.rightContainer}>
          <TouchableOpacity style={styles.iconButton} onPress={handleNotificationPress}>
            <Feather name="bell" size={20} color={theme.colors.dark} />
            {unreadCount > 0 && (
              <View style={styles.notificationBadge}>
                <Text style={styles.notificationBadgeText}>
                  {unreadCount > 9 ? '9+' : unreadCount}
                </Text>
              </View>
            )}
          </TouchableOpacity>
          <TouchableOpacity style={styles.iconButton} onPress={handleProfilePress}>
            <Feather name="user" size={20} color={theme.colors.dark} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.iconButton} onPress={handleLogoutPress}>
            <Feather name="log-out" size={20} color={theme.colors.dark} />
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    paddingTop: Platform.OS === 'ios' ? theme.spacing.lg : theme.spacing.lg + STATUSBAR_HEIGHT,
    backgroundColor: theme.colors.white,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.lightGray,
    borderRadius: theme.borderRadius.large,
    elevation: 2,
    shadowColor: theme.colors.dark,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  leftContainer: {
    flex: 1,
    maxWidth: '30%',
  },
  backButton: {
    padding: theme.spacing.xs,
  },
  locationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  locationIcon: {
    marginRight: theme.spacing.xs,
  },
  locationText: {
    fontSize: 14,
    color: theme.colors.dark,
    maxWidth: 120,
  },
  logoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
  },
  logoImage: {
    marginRight: theme.spacing.xs,
  },
  logoText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: theme.colors.primary,
  },
  rightContainer: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  iconButton: {
    padding: theme.spacing.xs,
    marginLeft: theme.spacing.sm,
    position: 'relative',
  },
  notificationBadge: {
    position: 'absolute',
    top: 0,
    right: 0,
    backgroundColor: theme.colors.error,
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 2,
  },
  notificationBadgeText: {
    color: theme.colors.white,
    fontSize: 10,
    fontWeight: 'bold',
  },
});

export default Header; 
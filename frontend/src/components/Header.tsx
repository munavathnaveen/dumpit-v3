import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Feather } from '@expo/vector-icons';
import { theme } from '../theme';
import LogoImage from './LogoImage';
import { useDispatch } from 'react-redux';
import { logout } from '../store/authSlice';
import { AppDispatch } from '../store';

interface HeaderProps {
  location?: string;
  onNotificationPress?: () => void;
  showBackButton?: boolean;
  onProfilePress?: () => void;
  onLogoutPress?: () => void;
}

const Header: React.FC<HeaderProps> = ({
  location = 'Your Location',
  onNotificationPress,
  showBackButton = false,
  onProfilePress,
  onLogoutPress,
}) => {
  const navigation = useNavigation();
  const dispatch = useDispatch<AppDispatch>();

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
        ) : (
          <View style={styles.locationContainer}>
            <Feather name="map-pin" size={18} color={theme.colors.primary} style={styles.locationIcon} />
            <Text style={styles.locationText} numberOfLines={1}>
              {location}
            </Text>
          </View>
        )}
      </View>

      {/* Center: Logo */}
      <View style={styles.logoContainer}>
        <LogoImage size="tiny" style={styles.logoImage} />
        <Text style={styles.logoText}>Dumpit</Text>
      </View>

      {/* Right: Notification, Profile and Logout */}
      <View style={styles.rightContainer}>
        <TouchableOpacity style={styles.iconButton} onPress={handleNotificationPress}>
          <Feather name="bell" size={20} color={theme.colors.dark} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.iconButton} onPress={handleProfilePress}>
          <Feather name="user" size={20} color={theme.colors.dark} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.iconButton} onPress={handleLogoutPress}>
          <Feather name="log-out" size={20} color={theme.colors.dark} />
        </TouchableOpacity>
      </View>
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
    backgroundColor: theme.colors.white,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.lightGray,
  },
  leftContainer: {
    flex: 1,
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
    maxWidth: 150,
  },
  logoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
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
  },
});

export default Header; 
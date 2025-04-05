import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Feather } from '@expo/vector-icons';
import { theme } from '../theme';

interface HeaderProps {
  location?: string;
  onNotificationPress?: () => void;
  onProfilePress?: () => void;
  onLogoutPress?: () => void;
}

const Header: React.FC<HeaderProps> = ({
  location = 'Your Location',
  onNotificationPress,
  onProfilePress,
  onLogoutPress,
}) => {
  const navigation = useNavigation();

  return (
    <View style={styles.container}>
      {/* Left: Location */}
      <View style={styles.locationContainer}>
        <Feather name="map-pin" size={18} color={theme.colors.primary} style={styles.locationIcon} />
        <Text style={styles.locationText} numberOfLines={1}>
          {location}
        </Text>
      </View>

      {/* Center: Logo */}
      <View style={styles.logoContainer}>
        <Text style={styles.logoText}>Dumpit</Text>
      </View>

      {/* Right: Notification, Profile and Logout */}
      <View style={styles.rightContainer}>
        <TouchableOpacity style={styles.iconButton} onPress={onNotificationPress}>
          <Feather name="bell" size={20} color={theme.colors.dark} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.iconButton} onPress={onProfilePress}>
          <Feather name="user" size={20} color={theme.colors.dark} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.iconButton} onPress={onLogoutPress}>
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
    ...theme.shadow.small,
    height: 60,
  },
  locationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  locationIcon: {
    marginRight: theme.spacing.xs,
  },
  locationText: {
    fontSize: 14,
    color: theme.colors.dark,
    flex: 1,
  },
  logoContainer: {
    flex: 1,
    alignItems: 'center',
  },
  logoText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: theme.colors.primary,
  },
  rightContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    flex: 1,
  },
  iconButton: {
    padding: theme.spacing.xs,
    marginLeft: theme.spacing.sm,
  },
});

export default Header; 
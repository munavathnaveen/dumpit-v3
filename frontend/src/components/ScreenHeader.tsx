import React, { ReactNode } from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { theme } from '../theme';
import Header from './Header';
import { Ionicons } from '@expo/vector-icons';

export interface ScreenHeaderProps {
  title: string;
  showBackButton?: boolean;
  onNotificationPress?: () => void;
  rightIcon?: string;
  onRightPress?: () => void;
  customLocation?: ReactNode;
}

const ScreenHeader: React.FC<ScreenHeaderProps> = ({
  title,
  showBackButton = false,
  onNotificationPress,
  rightIcon,
  onRightPress,
  customLocation,
}) => {
  return (
    <View style={styles.container}>
      <Header
        location={title}
        showBackButton={showBackButton}
        onNotificationPress={onNotificationPress}
        customLocation={customLocation}
        rightComponent={
          rightIcon && onRightPress ? (
            <TouchableOpacity onPress={onRightPress} style={styles.rightButton}>
              <Ionicons name={rightIcon as any} size={24} color={theme.colors.dark} />
            </TouchableOpacity>
          ) : null
        }
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: theme.colors.white,
  },
  rightButton: {
    padding: 8,
  },
});

export default ScreenHeader; 
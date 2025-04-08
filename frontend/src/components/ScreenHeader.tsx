import React from 'react';
import { View, StyleSheet } from 'react-native';
import { theme } from '../theme';
import Header from './Header';

interface ScreenHeaderProps {
  title: string;
  showBackButton?: boolean;
  onNotificationPress?: () => void;
  onRightPress?: () => void;
  rightIcon?: string;
}

const ScreenHeader: React.FC<ScreenHeaderProps> = ({
  title,
  showBackButton = false,
  onNotificationPress,
  onRightPress,
  rightIcon,
}) => {
  return (
    <View style={styles.container}>
      <Header
        location={title}
        showBackButton={showBackButton}
        onNotificationPress={onNotificationPress}
        onRightPress={onRightPress}
        rightIcon={rightIcon}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: theme.colors.white,
  },
});

export default ScreenHeader; 
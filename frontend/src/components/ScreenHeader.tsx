import React from 'react';
import { View, StyleSheet } from 'react-native';
import { theme } from '../theme';
import Header from './Header';

interface ScreenHeaderProps {
  title: string;
  showBackButton?: boolean;
  onNotificationPress?: () => void;
}

const ScreenHeader: React.FC<ScreenHeaderProps> = ({
  title,
  showBackButton = false,
  onNotificationPress,
}) => {
  return (
    <View style={styles.container}>
      <Header
        location={title}
        showBackButton={showBackButton}
        onNotificationPress={onNotificationPress}
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
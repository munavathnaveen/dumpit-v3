import React from 'react';
import { View, Image, StyleSheet, StyleProp, ViewStyle } from 'react-native';
import { theme } from '../theme';

interface LogoImageProps {
  size?: 'small' | 'medium' | 'large';
  style?: StyleProp<ViewStyle>;
}

const LogoImage: React.FC<LogoImageProps> = ({ size = 'medium', style }) => {
  // Scale image size based on the size prop
  const getDimensions = () => {
    switch (size) {
      case 'small':
        return { width: 80, height: 80 };
      case 'medium':
        return { width: 120, height: 120 };
      case 'large':
        return { width: 160, height: 160 };
      default:
        return { width: 120, height: 120 };
    }
  };

  return (
    <View style={[styles.container, style]}>
      <Image 
        source={require('../../assets/logo.png')} 
        style={[styles.image, getDimensions()]}
        resizeMode="contain"
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  image: {
    // Base styles for the image
  },
});

export default LogoImage; 
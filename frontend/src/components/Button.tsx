import React from 'react';
import { TouchableOpacity, Text, StyleSheet, ActivityIndicator, StyleProp, ViewStyle, TextStyle, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { theme } from '../theme';

export interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'outline';
  type?: 'primary' | 'secondary'; // Alias for variant
  disabled?: boolean;
  loading?: boolean;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
  icon?: string;
  outline?: boolean;
}

const Button: React.FC<ButtonProps> = ({
  title,
  onPress,
  variant = 'primary',
  type,
  disabled = false,
  loading = false,
  style,
  textStyle,
  icon,
  outline = false,
}) => {
  // Use type as an alias for variant if provided
  const buttonVariant = type || variant;

  // Get button and text styles based on variant
  const getButtonStyles = () => {
    switch (buttonVariant) {
      case 'primary':
        return [styles.button, styles.primaryButton, disabled && styles.disabledButton, style];
      case 'secondary':
        return [styles.button, styles.secondaryButton, disabled && styles.disabledButton, style];
      case 'outline':
        return [styles.button, styles.outlineButton, disabled && styles.disabledOutlineButton, style];
      default:
        return [styles.button, styles.primaryButton, disabled && styles.disabledButton, style];
    }
  };

  const getTextStyles = () => {
    switch (buttonVariant) {
      case 'primary':
        return [styles.buttonText, styles.primaryButtonText, textStyle];
      case 'secondary':
        return [styles.buttonText, styles.secondaryButtonText, textStyle];
      case 'outline':
        return [styles.buttonText, styles.outlineButtonText, disabled && styles.disabledOutlineButtonText, textStyle];
      default:
        return [styles.buttonText, styles.primaryButtonText, textStyle];
    }
  };

  const getIconColor = () => {
    if (disabled) {
      return theme.colors.gray;
    }
    
    switch (buttonVariant) {
      case 'primary':
        return theme.colors.white;
      case 'secondary':
        return theme.colors.dark;
      case 'outline':
        return theme.colors.primary;
      default:
        return theme.colors.white;
    }
  };

  return (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={onPress}
      disabled={disabled || loading}
      style={[
        ...getButtonStyles(),
        outline && styles.buttonOutline,
      ]}
    >
      {loading ? (
        <ActivityIndicator size="small" color={outline ? theme.colors.primary : theme.colors.white} />
      ) : (
        <View style={styles.buttonContent}>
          {icon && (
            <MaterialIcons
              name={icon as any}
              size={20}
              color={getIconColor()}
              style={styles.icon}
            />
          )}
          <Text style={getTextStyles()}>{title}</Text>
        </View>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    height: 50,
    borderRadius: theme.borderRadius.medium,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.lg,
    ...theme.shadow.small,
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  icon: {
    marginRight: theme.spacing.xs,
  },
  primaryButton: {
    backgroundColor: theme.colors.primary,
  },
  secondaryButton: {
    backgroundColor: theme.colors.accent,
  },
  outlineButton: {
    backgroundColor: 'transparent',
    borderWidth: 1.5,
    borderColor: theme.colors.primary,
  },
  disabledButton: {
    backgroundColor: theme.colors.lightGray,
  },
  disabledOutlineButton: {
    borderColor: theme.colors.lightGray,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  primaryButtonText: {
    color: theme.colors.white,
  },
  secondaryButtonText: {
    color: theme.colors.dark,
  },
  outlineButtonText: {
    color: theme.colors.primary,
  },
  disabledOutlineButtonText: {
    color: theme.colors.gray,
  },
  buttonOutline: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: theme.colors.primary,
  },
});

export default Button; 
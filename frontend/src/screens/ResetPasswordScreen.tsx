import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Alert, TouchableOpacity, Linking } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { theme } from '../theme';
import Input from '../components/Input';
import Button from '../components/Button';
import Card3D from '../components/Card3D';
import LogoImage from '../components/LogoImage';
import { resetPasswordSchema } from '../utils/validationSchemas';
import { resetPassword } from '../api/authApi';
import { AuthStackParamList } from '../navigation/types';

type ResetPasswordScreenNavigationProp = NativeStackNavigationProp<AuthStackParamList, 'ResetPassword'>;

const ResetPasswordScreen: React.FC = () => {
  const navigation = useNavigation<ResetPasswordScreenNavigationProp>();
  
  const [token, setToken] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [loading, setLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  // Handle deep linking
  useEffect(() => {
    // Handle case when app was opened via deep link
    const getUrlAsync = async () => {
      // Get the initial URL that opened the app
      const initialUrl = await Linking.getInitialURL();
      if (initialUrl) {
        const tokenFromUrl = extractTokenFromUrl(initialUrl);
        if (tokenFromUrl) {
          setToken(tokenFromUrl);
        }
      }
    };

    // Set up event listener for deep links while app is running
    const linkingListener = Linking.addEventListener('url', ({ url }) => {
      const tokenFromUrl = extractTokenFromUrl(url);
      if (tokenFromUrl) {
        setToken(tokenFromUrl);
      }
    });

    getUrlAsync();

    // Cleanup the listener
    return () => {
      linkingListener.remove();
    };
  }, []);

  // Helper to extract token from deep link URL
  const extractTokenFromUrl = (url: string): string | null => {
    // Expected format: dumpit://resetpassword/TOKEN
    if (url && url.includes('resetpassword/')) {
      return url.split('resetpassword/')[1];
    }
    return null;
  };

  const handleSubmit = async () => {
    if (!token) {
      Alert.alert('Error', 'Reset token is missing. Please use the link from your email.');
      return;
    }

    try {
      // Validate form
      resetPasswordSchema.parse({ password, confirmPassword });
      
      setLoading(true);
      // Reset password
      const response = await resetPassword(token, { password });
      
      // Show success
      setIsSuccess(true);
      setTimeout(() => {
        navigation.navigate('Login');
      }, 3000);
    } catch (error: any) {
      if (error.errors) {
        // Handle validation errors
        const formattedErrors: { [key: string]: string } = {};
        error.errors.forEach((err: any) => {
          if (err.path) {
            formattedErrors[err.path[0]] = err.message;
          }
        });
        setErrors(formattedErrors);
      } else if (error.response) {
        // Handle API errors
        Alert.alert('Error', error.response.data.error || 'Failed to reset password');
      } else {
        // Handle other errors
        Alert.alert('Error', 'An unexpected error occurred');
      }
    } finally {
      setLoading(false);
    }
  };

  if (isSuccess) {
    return (
      <View style={styles.gradientBackground}>
        <View style={styles.successContainer}>
          <LogoImage size="medium" />
          <Card3D style={styles.successCard}>
            <Text style={styles.successTitle}>Password Reset!</Text>
            <Text style={styles.successText}>
              Your password has been successfully reset. You will be redirected to the login screen.
            </Text>
          </Card3D>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <LogoImage size="medium" />
        <Card3D style={styles.card}>
          <Text style={styles.title}>Reset Password</Text>
          <Text style={styles.subtitle}>Enter your new password below</Text>
          
          {token ? (
            <>
              <Input
                label="New Password"
                value={password}
                onChangeText={setPassword}
                placeholder="Enter new password"
                secureTextEntry
                error={errors.password}
              />
              
              <Input
                label="Confirm Password"
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                placeholder="Confirm your password"
                secureTextEntry
                error={errors.confirmPassword}
              />
              
              <Button
                title="Reset Password"
                onPress={handleSubmit}
                loading={loading}
                style={styles.button}
              />
            </>
          ) : (
            <View style={styles.tokenMissingContainer}>
              <Text style={styles.tokenMissingText}>
                No reset token found. Please use the reset link from your email.
              </Text>
            </View>
          )}
          
          <TouchableOpacity
            style={styles.backLink}
            onPress={() => navigation.navigate('Login')}
          >
            <Text style={styles.backLinkText}>Back to Login</Text>
          </TouchableOpacity>
        </Card3D>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  gradientBackground: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: theme.spacing.lg,
  },
  card: {
    width: '100%',
    padding: theme.spacing.lg,
    marginTop: theme.spacing.md,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: theme.colors.text,
    marginBottom: theme.spacing.xs,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: theme.colors.textLight,
    marginBottom: theme.spacing.md,
    textAlign: 'center',
  },
  button: {
    marginTop: theme.spacing.md,
  },
  backLink: {
    marginTop: theme.spacing.md,
    alignItems: 'center',
  },
  backLinkText: {
    color: theme.colors.primary,
    fontSize: 16,
  },
  successContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: theme.spacing.lg,
  },
  successCard: {
    width: '100%',
    padding: theme.spacing.lg,
    marginTop: theme.spacing.md,
    alignItems: 'center',
  },
  successTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: theme.colors.success,
    marginBottom: theme.spacing.md,
  },
  successText: {
    fontSize: 16,
    color: theme.colors.text,
    textAlign: 'center',
    marginBottom: theme.spacing.md,
  },
  tokenMissingContainer: {
    padding: theme.spacing.md,
    backgroundColor: theme.colors.background,
    borderRadius: 8,
    marginBottom: theme.spacing.md,
  },
  tokenMissingText: {
    fontSize: 14,
    color: theme.colors.error,
    textAlign: 'center',
  },
});

export default ResetPasswordScreen; 
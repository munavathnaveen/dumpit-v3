import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useDispatch, useSelector } from 'react-redux';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { z } from 'zod';

import Input from '../components/Input';
import Button from '../components/Button';
import Card3D from '../components/Card3D';
import LogoImage from '../components/LogoImage';
import { theme } from '../theme';
import { forgotPasswordSchema, ForgotPasswordFormData } from '../utils/validationSchemas';
import { forgotPassword } from '../store/authSlice';
import { RootState, AppDispatch } from '../store';
import * as authApi from '../api/authApi';
import alert from '../utils/alert';

const ForgotPasswordScreen: React.FC = () => {
  const navigation = useNavigation<NativeStackNavigationProp<any>>();
  const dispatch = useDispatch<AppDispatch>();
  const { loading, error } = useSelector((state: RootState) => state.auth);

  const [email, setEmail] = useState('');
  const [validationError, setValidationError] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);

  const handleSubmit = async () => {
    try {
      // Validate email
      forgotPasswordSchema.parse({ email });
      
      // Dispatch forgot password action
      await dispatch(forgotPassword({ email })).unwrap();
      
      // Show success
      setIsSuccess(true);

      console.log('Password reset requested for:', email);
      // TODO: Implement actual password reset API call
    } catch (error: any) {
      if (error.errors) {
        // Handle Zod validation errors
        setValidationError(error.errors[0].message);
      } else {
        // Handle other errors
        alert('Error', error.message || 'Failed to send reset email');
      }
    }
  };

  if (isSuccess) {
    return (
      <View style={styles.gradientBackground}>
        <View style={styles.successContainer}>
          <LogoImage size="medium" />
          <Card3D style={styles.successCard}>
            <Text style={styles.successTitle}>Email Sent!</Text>
            <Text style={styles.successText}>
              We've sent a password reset link to your email address. Please check your inbox.
            </Text>
            <Button
              title="Back to Login"
              onPress={() => navigation.navigate('Login')}
              style={styles.button}
            />
          </Card3D>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.gradientBackground}>
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <View style={styles.container}>
          <View style={styles.header}>
            <LogoImage size="medium" />
          </View>

          <Card3D style={styles.card}>
            <Text style={styles.cardTitle}>Forgot Password</Text>
            <Text style={styles.subtitle}>Enter your email to reset your password</Text>

            <View style={styles.form}>
              <Input
                label="Email"
                value={email}
                onChangeText={(text) => {
                  setEmail(text);
                  setValidationError('');
                }}
                placeholder="Enter your email"
                keyboardType="email-address"
                error={validationError}
              />

              {error && <Text style={styles.errorText}>{error}</Text>}

              <Button
                title="Send Reset Link"
                onPress={handleSubmit}
                loading={loading}
                style={styles.button}
              />
            </View>

            <TouchableOpacity
              style={styles.backLink}
              onPress={() => navigation.navigate('Login')}
            >
              <Text style={styles.backLinkText}>← Back to Login</Text>
            </TouchableOpacity>
          </Card3D>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  gradientBackground: {
    flex: 1,
    backgroundColor: '#FFF9F5', // Light warm color inspired by Zomato
  },
  scrollContainer: {
    flexGrow: 1,
    paddingVertical: theme.spacing.xl,
  },
  container: {
    flex: 1,
    padding: theme.spacing.lg,
  },
  header: {
    marginBottom: theme.spacing.xl,
    alignItems: 'center',
  },
  card: {
    marginBottom: theme.spacing.lg,
  },
  cardTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: theme.colors.primary,
    marginBottom: theme.spacing.sm,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: theme.colors.gray,
    textAlign: 'center',
    marginBottom: theme.spacing.lg,
  },
  form: {
    marginBottom: theme.spacing.xl,
  },
  button: {
    marginTop: theme.spacing.lg,
  },
  backLink: {
    alignItems: 'center',
  },
  backLinkText: {
    color: theme.colors.primary,
    fontSize: 16,
  },
  errorText: {
    color: theme.colors.error,
    marginBottom: theme.spacing.sm,
    textAlign: 'center',
  },
  successContainer: {
    flex: 1,
    padding: theme.spacing.lg,
    justifyContent: 'center',
    alignItems: 'center',
  },
  successCard: {
    marginTop: theme.spacing.xl,
    alignItems: 'center',
    paddingHorizontal: theme.spacing.xl,
  },
  successTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: theme.colors.success,
    marginBottom: theme.spacing.md,
  },
  successText: {
    fontSize: 16,
    color: theme.colors.dark,
    textAlign: 'center',
    marginBottom: theme.spacing.xl,
  },
});

export default ForgotPasswordScreen; 
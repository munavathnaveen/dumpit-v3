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
import RoleTabSelector from '../components/RoleTabSelector';
import { theme } from '../theme';
import { loginSchema, LoginFormData } from '../utils/validationSchemas';
import { login } from '../store/authSlice';
import { RootState, AppDispatch } from '../store';
import { constants, USER_ROLES } from '../utils/constants';
import alert from '../utils/alert';

const LoginScreen: React.FC = () => {
  const navigation = useNavigation<NativeStackNavigationProp<any>>();
  const dispatch = useDispatch<AppDispatch>();
  const { loading, error } = useSelector((state: RootState) => state.auth);

  const [formData, setFormData] = useState<LoginFormData>({
    email: '',
    password: '',
  });
  const [role, setRole] = useState<'customer' | 'vendor'>('customer');
  const [validationErrors, setValidationErrors] = useState<Partial<LoginFormData>>({});

  const handleChange = (field: keyof LoginFormData, value: string) => {
    setFormData({ ...formData, [field]: value });
    // Clear validation error when user types
    if (validationErrors[field]) {
      setValidationErrors({ ...validationErrors, [field]: undefined });
    }
  };

  const handleLogin = async () => {
    try {
      // Validate form data
      loginSchema.parse(formData);
      
      // Dispatch login action with role
      await dispatch(login({
        ...formData,
        role: role === 'vendor' ? USER_ROLES.VENDOR : USER_ROLES.CUSTOMER
      })).unwrap();
      
      // Navigation happens automatically due to the authentication state change
    } catch (error: any) {
      if (error.errors) {
        // Handle Zod validation errors
        const errors: Partial<LoginFormData> = {};
        error.errors.forEach((err: any) => {
          const path = err.path[0] as keyof LoginFormData;
          errors[path] = err.message;
        });
        setValidationErrors(errors);
      } else {
        // Handle other errors
        alert('Error', error.message || 'Login failed');
      }
    }
  };

  return (
    <View style={styles.gradientBackground}>
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <View style={styles.container}>
          <View style={styles.header}>
            <LogoImage size="large" />
          </View>

          <Card3D style={styles.card} elevation="medium">
            <Text style={styles.cardTitle}>Login</Text>
            
            <RoleTabSelector
              selectedRole={role}
              onRoleChange={setRole}
            />

            <View style={styles.form}>
              <Input
                label="Email"
                value={formData.email}
                onChangeText={(text) => handleChange('email', text)}
                placeholder="Enter your email"
                keyboardType="email-address"
                error={validationErrors.email}
              />

              <Input
                label="Password"
                value={formData.password}
                onChangeText={(text) => handleChange('password', text)}
                placeholder="Enter your password"
                secureTextEntry
                error={validationErrors.password}
              />

              {error && <Text style={styles.errorText}>{error}</Text>}

              <TouchableOpacity 
                style={styles.forgotPassword}
                onPress={() => navigation.navigate('ForgotPassword')}
              >
                <Text style={styles.forgotPasswordText}>Forgot Password?</Text>
              </TouchableOpacity>

              <Button
                title={`Login as ${role === 'vendor' ? 'Vendor' : 'Customer'}`}
                onPress={handleLogin}
                loading={loading}
                style={styles.button}
              />
            </View>

            <View style={styles.footer}>
              <Text style={styles.footerText}>Don't have an account?</Text>
              <TouchableOpacity onPress={() => navigation.navigate('Register')}>
                <Text style={styles.signupText}>Sign Up</Text>
              </TouchableOpacity>
            </View>
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
    marginBottom: theme.spacing.lg,
    textAlign: 'center',
  },
  form: {
    marginBottom: theme.spacing.md,
  },
  forgotPassword: {
    alignSelf: 'flex-end',
    marginBottom: theme.spacing.lg,
  },
  forgotPasswordText: {
    color: theme.colors.primary,
    fontSize: 14,
  },
  button: {
    marginTop: theme.spacing.md,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: theme.spacing.lg,
  },
  footerText: {
    color: theme.colors.gray,
    marginRight: theme.spacing.xs,
  },
  signupText: {
    color: theme.colors.primary,
    fontWeight: 'bold',
  },
  errorText: {
    color: theme.colors.error,
    marginBottom: theme.spacing.sm,
    textAlign: 'center',
  },
});

export default LoginScreen;
import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useDispatch, useSelector } from 'react-redux';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';

import Input from '../components/Input';
import Button from '../components/Button';
import Card3D from '../components/Card3D';
import LogoImage from '../components/LogoImage';
import RoleTabSelector from '../components/RoleTabSelector';
import { theme } from '../theme';
import { registerSchema, RegisterFormData } from '../utils/validationSchemas';
import { register } from '../store/authSlice';
import { RootState, AppDispatch } from '../store';
import { constants } from '../utils/constants';

const RegisterScreen: React.FC = () => {
  const navigation = useNavigation<NativeStackNavigationProp<any>>();
  const dispatch = useDispatch<AppDispatch>();
  const { loading, error } = useSelector((state: RootState) => state.auth);

  const [formData, setFormData] = useState<RegisterFormData>({
    name: '',
    email: '',
    phone: '',
    password: '',
  });
  const [role, setRole] = useState<'customer' | 'vendor'>('customer');
  const [validationErrors, setValidationErrors] = useState<Partial<RegisterFormData>>({});

  const handleChange = (field: keyof RegisterFormData, value: string) => {
    setFormData({ ...formData, [field]: value });
    // Clear validation error when user types
    if (validationErrors[field]) {
      setValidationErrors({ ...validationErrors, [field]: undefined });
    }
  };

  const handleRegister = async () => {
    try {
      // Validate form data
      registerSchema.parse(formData);
      
      // Dispatch register action with role
      await dispatch(register({
        ...formData,
        role: role === 'vendor' ? constants.userRoles.VENDOR : constants.userRoles.CUSTOMER
      })).unwrap();
      
      // Navigation happens automatically due to the authentication state change
    } catch (error: any) {
      if (error.errors) {
        // Handle Zod validation errors
        const errors: Partial<RegisterFormData> = {};
        error.errors.forEach((err: any) => {
          const path = err.path[0] as keyof RegisterFormData;
          errors[path] = err.message;
        });
        setValidationErrors(errors);
      } else {
        // Handle other errors
        Alert.alert('Error', error.message || 'Registration failed');
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
            <Text style={styles.cardTitle}>Create Account</Text>
            
            <RoleTabSelector
              selectedRole={role}
              onRoleChange={setRole}
            />

            <View style={styles.form}>
              <Input
                label="Full Name"
                value={formData.name}
                onChangeText={(text) => handleChange('name', text)}
                placeholder="Enter your full name"
                error={validationErrors.name}
                autoCapitalize="words"
              />

              <Input
                label="Email"
                value={formData.email}
                onChangeText={(text) => handleChange('email', text)}
                placeholder="Enter your email"
                keyboardType="email-address"
                error={validationErrors.email}
              />

              <Input
                label="Phone Number"
                value={formData.phone}
                onChangeText={(text) => handleChange('phone', text)}
                placeholder="Enter your 10-digit phone number"
                keyboardType="phone-pad"
                error={validationErrors.phone}
                maxLength={10}
              />

              <Input
                label="Password"
                value={formData.password}
                onChangeText={(text) => handleChange('password', text)}
                placeholder="Create a password (min. 6 characters)"
                secureTextEntry
                error={validationErrors.password}
              />

              {error && <Text style={styles.errorText}>{error}</Text>}

              <Button
                title={`Register as ${role === 'vendor' ? 'Vendor' : 'Customer'}`}
                onPress={handleRegister}
                loading={loading}
                style={styles.button}
              />
            </View>

            <View style={styles.footer}>
              <Text style={styles.footerText}>Already have an account?</Text>
              <TouchableOpacity onPress={() => navigation.navigate('Login')}>
                <Text style={styles.loginText}>Log In</Text>
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
  button: {
    marginTop: theme.spacing.lg,
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
  loginText: {
    color: theme.colors.primary,
    fontWeight: 'bold',
  },
  errorText: {
    color: theme.colors.error,
    marginBottom: theme.spacing.sm,
    textAlign: 'center',
  },
});

export default RegisterScreen; 
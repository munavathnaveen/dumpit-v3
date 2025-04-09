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
import { registerSchema, vendorRegisterSchema, RegisterFormData, VendorRegisterFormData } from '../utils/validationSchemas';
import { register } from '../store/authSlice';
import { RootState, AppDispatch } from '../store';
import alert from '../utils/alert';
import { constants, USER_ROLES } from '../utils/constants';

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
  
  const [shopData, setShopData] = useState({
    shopName: '',
    shopDescription: '',
    shopAddress: {
      village: '',
      street: '',
      district: '',
      state: '',
      pincode: '',
      phone: '',
    },
  });
  
  const [role, setRole] = useState<'customer' | 'vendor'>('customer');
  const [validationErrors, setValidationErrors] = useState<any>({});
  const [currentStep, setCurrentStep] = useState<1 | 2>(1);

  const handleChange = (field: keyof RegisterFormData, value: string) => {
    setFormData({ ...formData, [field]: value });
    // Clear validation error when user types
    if (validationErrors[field]) {
      setValidationErrors({ ...validationErrors, [field]: undefined });
    }
  };
  
  const handleShopChange = (field: string, value: string) => {
    setShopData({ ...shopData, [field]: value });
    // Clear validation error when user types
    if (validationErrors[field]) {
      setValidationErrors({ ...validationErrors, [field]: undefined });
    }
  };
  
  const handleShopAddressChange = (field: string, value: string) => {
    setShopData({
      ...shopData,
      shopAddress: {
        ...shopData.shopAddress,
        [field]: value,
      },
    });
    // Clear validation error
    if (validationErrors.shopAddress && validationErrors.shopAddress[field]) {
      setValidationErrors({
        ...validationErrors,
        shopAddress: {
          ...validationErrors.shopAddress,
          [field]: undefined,
        },
      });
    }
  };

  const validateStep1 = () => {
    try {
      registerSchema.parse(formData);
      setCurrentStep(2);
    } catch (error: any) {
      // Handle Zod validation errors
      const errors: Partial<RegisterFormData> = {};
      error.errors.forEach((err: any) => {
        const path = err.path[0] as keyof RegisterFormData;
        errors[path] = err.message;
      });
      setValidationErrors(errors);
    }
  };

  const handleRegister = async () => {
    try {
      if (role === 'vendor') {
        // Validate all data for vendor
        const vendorData = { ...formData, ...shopData };
        vendorRegisterSchema.parse(vendorData);
        
        // Dispatch register action with vendor data
        await dispatch(register({
          ...formData,
          ...shopData,
          role: USER_ROLES.VENDOR
        })).unwrap();
      } else {
        // Validate customer data
        registerSchema.parse(formData);
        
        // Dispatch register action for customer
        await dispatch(register({
          ...formData,
          role: USER_ROLES.CUSTOMER
        })).unwrap();
      }
      
      // Navigation happens automatically due to the authentication state change
    } catch (error: any) {
      if (error.errors) {
        // Handle Zod validation errors
        const errors: any = {};
        error.errors.forEach((err: any) => {
          if (err.path.length === 1) {
            errors[err.path[0]] = err.message;
          } else if (err.path.length === 2) {
            if (!errors[err.path[0]]) {
              errors[err.path[0]] = {};
            }
            errors[err.path[0]][err.path[1]] = err.message;
          }
        });
        setValidationErrors(errors);
      } else {
        // Handle other errors
        alert('Error', error.message || 'Registration failed');
      }
    }
  };

  const renderStepOne = () => (
    <>
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
        title="Continue"
        onPress={role === 'vendor' ? validateStep1 : handleRegister}
        loading={loading}
        style={styles.button}
      />
    </>
  );

  const renderStepTwo = () => (
    <>
      <Text style={styles.stepTitle}>Shop Details</Text>
      
      <Input
        label="Shop Name"
        value={shopData.shopName}
        onChangeText={(text) => handleShopChange('shopName', text)}
        placeholder="Enter your shop name"
        error={validationErrors.shopName}
      />

      <Input
        label="Shop Description"
        value={shopData.shopDescription}
        onChangeText={(text) => handleShopChange('shopDescription', text)}
        placeholder="Describe your shop (min. 10 characters)"
        multiline
        numberOfLines={3}
        error={validationErrors.shopDescription}
      />
      
      <Text style={styles.sectionTitle}>Shop Address</Text>
      
      <Input
        label="Village/Town"
        value={shopData.shopAddress.village}
        onChangeText={(text) => handleShopAddressChange('village', text)}
        placeholder="Enter village/town name"
        error={validationErrors.shopAddress?.village}
      />
      
      <Input
        label="Street"
        value={shopData.shopAddress.street}
        onChangeText={(text) => handleShopAddressChange('street', text)}
        placeholder="Enter street name"
        error={validationErrors.shopAddress?.street}
      />
      
      <Input
        label="District"
        value={shopData.shopAddress.district}
        onChangeText={(text) => handleShopAddressChange('district', text)}
        placeholder="Enter district name"
        error={validationErrors.shopAddress?.district}
      />
      
      <Input
        label="State"
        value={shopData.shopAddress.state}
        onChangeText={(text) => handleShopAddressChange('state', text)}
        placeholder="Enter state name"
        error={validationErrors.shopAddress?.state}
      />
      
      <Input
        label="Pincode"
        value={shopData.shopAddress.pincode}
        onChangeText={(text) => handleShopAddressChange('pincode', text)}
        placeholder="Enter 6-digit pincode"
        keyboardType="number-pad"
        maxLength={6}
        error={validationErrors.shopAddress?.pincode}
      />
      
      <Input
        label="Shop Phone Number"
        value={shopData.shopAddress.phone}
        onChangeText={(text) => handleShopAddressChange('phone', text)}
        placeholder="Enter shop phone number"
        keyboardType="phone-pad"
        maxLength={10}
        error={validationErrors.shopAddress?.phone}
      />

      <View style={styles.buttonContainer}>
        <Button
          title="Back"
          onPress={() => setCurrentStep(1)}
          style={[styles.button, styles.backButton]}
          textStyle={styles.backButtonText}
          outline
        />
        <Button
          title="Register"
          onPress={handleRegister}
          loading={loading}
          style={[styles.button, styles.registerButton]}
        />
      </View>
    </>
  );

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
              onRoleChange={(newRole) => {
                setRole(newRole);
                setCurrentStep(1);
                setValidationErrors({});
              }}
            />

            <View style={styles.form}>
              {currentStep === 1 ? renderStepOne() : renderStepTwo()}
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
  stepTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: theme.colors.primary,
    marginBottom: theme.spacing.md,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginTop: theme.spacing.md,
    marginBottom: theme.spacing.xs,
    color: theme.colors.dark,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: theme.spacing.lg,
  },
  backButton: {
    flex: 1,
    marginRight: theme.spacing.sm,
    backgroundColor: 'transparent',
    borderColor: theme.colors.primary,
  },
  backButtonText: {
    color: theme.colors.primary,
  },
  registerButton: {
    flex: 1,
    marginLeft: theme.spacing.sm,
  },
});

export default RegisterScreen; 
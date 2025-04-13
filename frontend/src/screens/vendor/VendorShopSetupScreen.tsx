import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Image,
  Switch,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';

import Card3D from '../../components/Card3D';
import VendorLocationHeader from '../../components/VendorLocationHeader';
import { theme } from '../../theme';
import { MainStackNavigationProp } from '../../navigation/types';
import { getShopDetails, updateShop, ShopSettings, createShop, Shop } from '../../api/shopApi';
import alert from '../../utils/alert';
import { RootState } from '../../store';
import { useSelector } from 'react-redux';
import * as locationApi from '../../api/locationApi';

interface LocationType {
  type: string;
  coordinates: number[];
}

interface AddressType {
  village: string;
  street: string;
  district: string;
  state: string;
  pincode: string;
  phone: string;
}

interface ShopFormState {
  name: string;
  description: string;
  image?: string;
  address: AddressType;
  location: LocationType;
  isActive: boolean;
  minimumOrderAmount: string;
  shippingFee: string;
  freeShippingThreshold: string;
  taxRate: string;
}

const VendorShopSetupScreen: React.FC = () => {
  const navigation = useNavigation<MainStackNavigationProp<'VendorShopSetup'>>();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [shopId, setShopId] = useState<string | null>(null);
  const [locationLoading, setLocationLoading] = useState(false);
  const [form, setForm] = useState<ShopFormState>({
    name: '',
    description: '',
    image: '',
    address: {
      village: '',
      street: '',
      district: '',
      state: '',
      pincode: '',
      phone: '',
    },
    location: {
      type: 'Point',
      coordinates: [0, 0],
    },
    isActive: true,
    minimumOrderAmount: '',
    shippingFee: '',
    freeShippingThreshold: '',
    taxRate: '',
  });
  const [error, setError] = useState<string | null>(null);
  const userId = useSelector((state: RootState) => state.auth.user?._id);
  
  useEffect(() => {
    if (!userId) return;
    
    const loadShopDetails = async () => {
      try {
        setLoading(true);
        try {
          const response = await getShopDetails(userId);  
          const shop = response.data;
          
          setShopId(shop._id);
          setForm({
            name: shop.name || '',
            description: shop.description || '',
            image: shop.image || '',
            address: {
              village: shop.address.village || '',
              street: shop.address.street || '',
              district: shop.address.district || '',
              state: shop.address.state || '',
              pincode: shop.address.pincode || '',
              phone: shop.address.phone || ''
            },
            location: {
              type: shop.location.type || 'Point',
              coordinates: shop.location.coordinates || [0, 0],
            },
            isActive: shop.isActive || true,
            minimumOrderAmount: shop.minimumOrderAmount?.toString() || '',
            shippingFee: shop.shippingFee?.toString() || '',
            freeShippingThreshold: shop.freeShippingThreshold?.toString() || '',
            taxRate: shop.taxRate?.toString() || ''
          });
        } catch (error) {
          // If shop doesn't exist yet, we'll create one
          console.log('No existing shop found, will create new one on save');
          setShopId(null);
        }
        setError(null);
      } catch (error) {
        console.error('Error loading shop details:', error);
        setError('Failed to load shop details');
      } finally {
        setLoading(false);
      }
    };

    loadShopDetails();
  }, [userId]);

  const handleInputChange = (
    field: keyof ShopFormState,
    value: string | boolean | LocationType
  ) => {
    setForm({
      ...form,
      [field]: value,
    });
  };

  const handleNumericInputChange = (field: keyof ShopFormState, value: string) => {
    // Only allow numeric values
    if (value === '' || /^\d*\.?\d*$/.test(value)) {
      handleInputChange(field, value);
    }
  };

  const handleImageUrlChange = (url: string) => {
    setForm({
      ...form,
      image: url,
    });
  };

  const handleSave = async () => {
    try {
      // Validate form data
      if (!form.name || !form.description || !form.address.village || !form.address.street || 
          !form.address.district || !form.address.state || !form.address.pincode || !form.address.phone) {
        Alert.alert('Error', 'Please fill in all required fields');
        return;
      }

      // Validate phone number format (10 digits)
      if (!/^[0-9]{10}$/.test(form.address.phone)) {
        Alert.alert('Error', 'Please enter a valid 10-digit phone number');
        return;
      }

      // Validate pincode format (6 digits)
      if (!/^[0-9]{6}$/.test(form.address.pincode)) {
        Alert.alert('Error', 'Please enter a valid 6-digit pincode');
        return;
      }

      // Transform the data to match the backend model
      const apiData: ShopSettings = {
        name: form.name,
        description: form.description,
        image: form.image,
        address: {
          village: form.address.village,
          street: form.address.street,
          district: form.address.district,
          state: form.address.state,
          pincode: form.address.pincode,
          phone: form.address.phone
        },
        location: {
          type: form.location.type,
          coordinates: form.location.coordinates
        },
        isActive: form.isActive,
        minimumOrderAmount: parseFloat(form.minimumOrderAmount) || 0,
        shippingFee: parseFloat(form.shippingFee) || 0,
        freeShippingThreshold: parseFloat(form.freeShippingThreshold) || 0,
        taxRate: parseFloat(form.taxRate) || 0
      };

      setSaving(true);
      try {
        if (shopId) {
          await updateShop(shopId, apiData);
        } else {
          await createShop(apiData);
        }
        navigation.goBack();
      } catch (error: any) {
        console.error('Error saving shop:', error);
        Alert.alert('Error', error.response?.data?.error || 'Failed to save shop details');
      } finally {
        setSaving(false);
      }
    } catch (error) {
      console.error('Error in form validation:', error);
      Alert.alert('Error', 'Please check all fields and try again');
    }
  };

  const handleAddressChange = (field: keyof ShopFormState['address'], value: string) => {
    setForm(prev => ({
      ...prev,
      address: {
        ...prev.address,
        [field]: value
      }
    }));
  };

  const handleLocationChange = (field: 'type' | 'coordinates', value: string | number[]) => {
    setForm(prev => ({
      ...prev,
      location: {
        ...prev.location,
        [field]: value
      }
    }));
  };

  const handleGetCurrentLocation = async () => {
    try {
      setLocationLoading(true);
      
      // Request location permissions
      const { status } = await Location.requestForegroundPermissionsAsync();
      
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Permission to access location was denied. Please enable it in your device settings.');
        setLocationLoading(false);
        return;
      }
      
      // Get current position
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      
      const { latitude, longitude } = location.coords;
      
      // Update form with new coordinates
      setForm({
        ...form,
        location: {
          ...form.location,
          coordinates: [longitude, latitude], // MongoDB uses [longitude, latitude] format
        },
      });
      
      // Also update user location in the backend
      if (userId) {
        try {
          await locationApi.updateUserLocation({
            latitude,
            longitude,
          });
        } catch (error) {
          console.error('Error updating user location in backend:', error);
          // Continue anyway, this is not critical
        }
      }
      
      Alert.alert('Success', 'Your current location has been set successfully!');
    } catch (error) {
      console.error('Error getting current location:', error);
      Alert.alert('Location Error', 'Failed to get your current location. Please try again or enter coordinates manually.');
    } finally {
      setLocationLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <VendorLocationHeader title="Shop Setup" showBackButton={true} />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
        </View>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.container}>
        <VendorLocationHeader title="Shop Setup" showBackButton={true} />
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity 
            style={styles.retryButton}
            onPress={() => navigation.replace('VendorShopSetup')}
          >
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <VendorLocationHeader title={shopId ? "Edit Shop" : "Create Shop"} showBackButton />
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.contentContainer}>
        {loading ? (
          <ActivityIndicator size="large" color={theme.colors.primary} />
        ) : error ? (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity 
              style={styles.retryButton}
              onPress={() => navigation.goBack()}
            >
              <Text style={styles.retryButtonText}>Go Back</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            <Card3D style={styles.card}>
              <Text style={styles.sectionTitle}>Basic Information</Text>
              
              <View style={styles.formGroup}>
                <Text style={styles.label}>Shop Name *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Enter shop name"
                  value={form.name}
                  onChangeText={(value) => handleInputChange('name', value)}
                />
              </View>
              
              <View style={styles.formGroup}>
                <Text style={styles.label}>Description *</Text>
                <TextInput
                  style={[styles.input, styles.textarea]}
                  placeholder="Enter shop description"
                  value={form.description}
                  onChangeText={(value) => handleInputChange('description', value)}
                  multiline
                  numberOfLines={4}
                />
              </View>
              
              <View style={styles.formGroup}>
                <Text style={styles.label}>Shop Image URL</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Enter image URL"
                  value={form.image}
                  onChangeText={handleImageUrlChange}
                />
                <TouchableOpacity 
                  style={styles.imagePickerButton} 
                  onPress={() => {}}
                >
                  <Text style={styles.imagePickerButtonText}>Choose Image</Text>
                </TouchableOpacity>
                
                {form.image ? (
                  <Image source={{ uri: form.image }} style={styles.previewImage} />
                ) : null}
              </View>
              
              <View style={styles.formGroup}>
                <View style={styles.switchContainer}>
                  <Text style={styles.label}>Active</Text>
                  <Switch
                    value={form.isActive}
                    onValueChange={(value) => handleInputChange('isActive', value)}
                    trackColor={{ false: theme.colors.gray, true: theme.colors.primary }}
                    thumbColor={form.isActive ? theme.colors.white : theme.colors.lightGray}
                  />
                </View>
                <Text style={styles.helperText}>
                  When active, your shop will be visible to customers
                </Text>
              </View>
            </Card3D>
            
            <Card3D style={styles.card}>
              <Text style={styles.sectionTitle}>Address Information</Text>
              
              <View style={styles.formGroup}>
                <Text style={styles.label}>Street *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Enter street address"
                  value={form.address.street}
                  onChangeText={(value) => handleAddressChange('street', value)}
                />
              </View>
              
              <View style={styles.formGroup}>
                <Text style={styles.label}>Village/Town *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Enter village or town"
                  value={form.address.village}
                  onChangeText={(value) => handleAddressChange('village', value)}
                />
              </View>
              
              <View style={styles.formGroup}>
                <Text style={styles.label}>District *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Enter district"
                  value={form.address.district}
                  onChangeText={(value) => handleAddressChange('district', value)}
                />
              </View>
              
              <View style={styles.formGroup}>
                <Text style={styles.label}>State *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Enter state"
                  value={form.address.state}
                  onChangeText={(value) => handleAddressChange('state', value)}
                />
              </View>
              
              <View style={styles.formGroup}>
                <Text style={styles.label}>Pincode *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Enter 6-digit pincode"
                  value={form.address.pincode}
                  onChangeText={(value) => handleAddressChange('pincode', value)}
                  keyboardType="number-pad"
                  maxLength={6}
                />
              </View>
              
              <View style={styles.formGroup}>
                <Text style={styles.label}>Phone Number *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Enter 10-digit phone number"
                  value={form.address.phone}
                  onChangeText={(value) => handleAddressChange('phone', value)}
                  keyboardType="phone-pad"
                  maxLength={10}
                />
              </View>
              
              <View style={styles.formGroup}>
                <Text style={styles.sectionTitle}>Shop Location</Text>
                <Text style={styles.helperText}>
                  Set your shop's location to help customers find you. 
                  Your current coordinates are: [{form.location.coordinates[0].toFixed(6)}, {form.location.coordinates[1].toFixed(6)}]
                </Text>
                
                <TouchableOpacity 
                  style={styles.locationButton}
                  onPress={handleGetCurrentLocation}
                  disabled={locationLoading}
                >
                  {locationLoading ? (
                    <ActivityIndicator size="small" color={theme.colors.white} />
                  ) : (
                    <>
                      <Ionicons name="location" size={18} color={theme.colors.white} />
                      <Text style={styles.locationButtonText}>Get My Current Location</Text>
                    </>
                  )}
                </TouchableOpacity>
                
                <View style={styles.coordinatesContainer}>
                  <View style={styles.coordinateInput}>
                    <Text style={styles.coordinateLabel}>Longitude</Text>
                    <TextInput
                      style={styles.input}
                      value={form.location.coordinates[0].toString()}
                      onChangeText={(value) => {
                        const newCoordinates = [...form.location.coordinates];
                        newCoordinates[0] = parseFloat(value) || 0;
                        handleLocationChange('coordinates', newCoordinates);
                      }}
                      keyboardType="decimal-pad"
                    />
                  </View>
                  
                  <View style={styles.coordinateInput}>
                    <Text style={styles.coordinateLabel}>Latitude</Text>
                    <TextInput
                      style={styles.input}
                      value={form.location.coordinates[1].toString()}
                      onChangeText={(value) => {
                        const newCoordinates = [...form.location.coordinates];
                        newCoordinates[1] = parseFloat(value) || 0;
                        handleLocationChange('coordinates', newCoordinates);
                      }}
                      keyboardType="decimal-pad"
                    />
                  </View>
                </View>
              </View>
            </Card3D>
            
            <Card3D style={styles.card}>
              <Text style={styles.sectionTitle}>Shipping & Payment Settings</Text>
              
              <View style={styles.formGroup}>
                <Text style={styles.label}>Minimum Order Amount (₹)</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Enter minimum order amount"
                  value={form.minimumOrderAmount}
                  onChangeText={(value) => handleNumericInputChange('minimumOrderAmount', value)}
                  keyboardType="decimal-pad"
                />
              </View>
              
              <View style={styles.formGroup}>
                <Text style={styles.label}>Shipping Fee (₹)</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Enter shipping fee"
                  value={form.shippingFee}
                  onChangeText={(value) => handleNumericInputChange('shippingFee', value)}
                  keyboardType="decimal-pad"
                />
              </View>
              
              <View style={styles.formGroup}>
                <Text style={styles.label}>Free Shipping Threshold (₹)</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Enter free shipping threshold"
                  value={form.freeShippingThreshold}
                  onChangeText={(value) => handleNumericInputChange('freeShippingThreshold', value)}
                  keyboardType="decimal-pad"
                />
                <Text style={styles.helperText}>
                  Orders above this amount will have free shipping
                </Text>
              </View>
              
              <View style={styles.formGroup}>
                <Text style={styles.label}>Tax Rate (%)</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Enter tax rate"
                  value={form.taxRate}
                  onChangeText={(value) => handleNumericInputChange('taxRate', value)}
                  keyboardType="decimal-pad"
                />
              </View>
            </Card3D>
            
            <TouchableOpacity 
              style={[styles.saveButton, saving && styles.disabledButton]}
              onPress={handleSave}
              disabled={saving}
            >
              {saving ? (
                <ActivityIndicator size="small" color={theme.colors.white} />
              ) : (
                <Text style={styles.saveButtonText}>
                  {shopId ? "Update Shop" : "Create Shop"}
                </Text>
              )}
            </TouchableOpacity>
          </>
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: theme.spacing.lg,
  },
  errorText: {
    color: theme.colors.error,
    fontSize: 16,
    textAlign: 'center',
    marginBottom: theme.spacing.md,
  },
  retryButton: {
    backgroundColor: theme.colors.primary,
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    borderRadius: theme.borderRadius.medium,
  },
  retryButtonText: {
    color: theme.colors.white,
    fontSize: 16,
    fontWeight: 'bold',
  },
  scrollView: {
    flex: 1,
  },
  contentContainer: {
    padding: theme.spacing.md,
    paddingBottom: theme.spacing.xl * 2,
  },
  card: {
    marginHorizontal: theme.spacing.md,
    marginVertical: theme.spacing.sm,
    padding: theme.spacing.lg,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: theme.spacing.md,
    color: theme.colors.dark,
  },
  formGroup: {
    marginBottom: theme.spacing.md,
  },
  label: {
    fontSize: 14,
    marginBottom: theme.spacing.xs,
    color: theme.colors.gray,
  },
  input: {
    borderWidth: 1,
    borderColor: theme.colors.lightGray,
    borderRadius: theme.borderRadius.small,
    padding: theme.spacing.md,
    fontSize: 16,
    backgroundColor: theme.colors.white,
  },
  textarea: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  imagePickerButton: {
    backgroundColor: theme.colors.primary,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  imagePickerButtonText: {
    color: theme.colors.white,
    fontWeight: '600',
  },
  previewImage: {
    width: 120,
    height: 120,
    borderRadius: 60,
    marginTop: theme.spacing.md,
  },
  switchContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
  },
  helperText: {
    fontSize: 14,
    color: theme.colors.gray,
  },
  locationButton: {
    backgroundColor: theme.colors.primary,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 12,
  },
  locationButtonText: {
    color: theme.colors.white,
    fontWeight: '600',
    marginLeft: 8,
  },
  coordinatesContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  coordinateInput: {
    width: '48%',
  },
  coordinateLabel: {
    fontWeight: '500',
    fontSize: 14,
    marginBottom: 4,
    color: theme.colors.text,
  },
  saveButton: {
    backgroundColor: theme.colors.primary,
    marginHorizontal: theme.spacing.md,
    marginVertical: theme.spacing.lg,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.medium,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  disabledButton: {
    backgroundColor: theme.colors.gray,
    opacity: 0.7,
  },
  saveButtonText: {
    color: theme.colors.white,
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default VendorShopSetupScreen; 
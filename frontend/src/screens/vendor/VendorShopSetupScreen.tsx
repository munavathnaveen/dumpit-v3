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

import Card3D from '../../components/Card3D';
import ScreenHeader from '../../components/ScreenHeader';
import { theme } from '../../theme';
import { MainStackNavigationProp } from '../../navigation/types';
import { getShopDetails, updateShop, ShopSettings, createShop, Shop } from '../../api/shopApi';
import alert from '../../utils/alert';
import { RootState } from '../../store';
import { useSelector } from 'react-redux';

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

  if (loading) {
    return (
      <View style={styles.container}>
        <ScreenHeader title="Shop Setup" showBackButton={true} />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
        </View>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.container}>
        <ScreenHeader title="Shop Setup" showBackButton={true} />
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
      <ScreenHeader title="Shop Setup" showBackButton={true} />
      
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.contentContainer}>
        {/* Basic Information */}
        <Card3D style={styles.section} elevation="medium">
          <Text style={styles.sectionTitle}>Basic Information</Text>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Shop Name</Text>
            <TextInput
              style={styles.input}
              value={form.name}
              onChangeText={(text) => handleInputChange('name', text)}
              placeholder="Enter shop name"
            />
          </View>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Description</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={form.description}
              onChangeText={(text) => handleInputChange('description', text)}
              placeholder="Enter shop description"
              multiline
              numberOfLines={4}
            />
          </View>
          <View style={styles.imageSection}>
            <Text style={styles.label}>Shop Image (Optional)</Text>
            {form.image ? (
              <View style={styles.imageContainer}>
                <Image source={{ uri: form.image }} style={styles.image} />
                <TouchableOpacity
                  style={styles.removeImageButton}
                  onPress={() => handleImageUrlChange('')}
                >
                  <Ionicons name="close-circle" size={24} color={theme.colors.error} />
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.imagePlaceholder}>
                <Ionicons name="image-outline" size={40} color={theme.colors.gray} />
              </View>
            )}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Image URL</Text>
              <TextInput
                style={styles.input}
                value={form.image}
                onChangeText={(text) => handleImageUrlChange(text)}
                placeholder="Enter image URL (optional)"
              />
            </View>
          </View>
        </Card3D>
        
        {/* Contact Information */}
        <Card3D style={styles.section} elevation="medium">
          <Text style={styles.sectionTitle}>Contact Information</Text>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Village</Text>
            <TextInput
              style={styles.input}
              value={form.address.village}
              onChangeText={(text) => handleAddressChange('village', text)}
              placeholder="Enter village name"
            />
          </View>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Street</Text>
            <TextInput
              style={styles.input}
              value={form.address.street}
              onChangeText={(text) => handleAddressChange('street', text)}
              placeholder="Enter street address"
            />
          </View>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>District</Text>
            <TextInput
              style={styles.input}
              value={form.address.district}
              onChangeText={(text) => handleAddressChange('district', text)}
              placeholder="Enter district"
            />
          </View>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>State</Text>
            <TextInput
              style={styles.input}
              value={form.address.state}
              onChangeText={(text) => handleAddressChange('state', text)}
              placeholder="Enter state"
            />
          </View>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Pincode</Text>
            <TextInput
              style={styles.input}
              value={form.address.pincode}
              onChangeText={(text) => handleAddressChange('pincode', text)}
              placeholder="Enter pincode"
              keyboardType="numeric"
            />
          </View>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Phone Number</Text>
            <TextInput
              style={styles.input}
              value={form.address.phone}
              onChangeText={(text) => handleAddressChange('phone', text)}
              placeholder="Enter phone number"
              keyboardType="phone-pad"
            />
          </View>
        </Card3D>
        
        {/* Location */}
        <Card3D style={styles.section} elevation="medium">
          <Text style={styles.sectionTitle}>Location</Text>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Location Type</Text>
            <TextInput
              style={styles.input}
              value={form.location.type}
              onChangeText={(text) => handleLocationChange('type', text)}
              placeholder="Enter location type"
            />
          </View>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Coordinates</Text>
            <TextInput
              style={styles.input}
              value={form.location.coordinates.join(',')}
              onChangeText={(text) => {
                const coords = text.split(',').map(Number);
                handleLocationChange('coordinates', coords);
              }}
              placeholder="Enter coordinates (comma-separated)"
              keyboardType="numeric"
            />
          </View>
        </Card3D>
        
        {/* Shop Status */}
        <Card3D style={styles.section} elevation="medium">
          <Text style={styles.sectionTitle}>Shop Status</Text>
          <View style={styles.switchContainer}>
            <Text style={styles.label}>Active</Text>
            <Switch
              value={form.isActive}
              onValueChange={(value) => handleInputChange('isActive', value)}
            />
          </View>
        </Card3D>
        
        {/* Payment Settings */}
        <Card3D style={styles.section} elevation="medium">
          <Text style={styles.sectionTitle}>Payment & Delivery Settings</Text>
          
          <View style={styles.formGroup}>
            <Text style={styles.label}>Minimum Order Amount (₹)</Text>
            <TextInput
              style={styles.input}
              value={form.minimumOrderAmount}
              onChangeText={(text) => handleNumericInputChange('minimumOrderAmount', text)}
              placeholder="Enter minimum order amount"
              keyboardType="numeric"
            />
          </View>
          
          <View style={styles.formGroup}>
            <Text style={styles.label}>Shipping Fee (₹)</Text>
            <TextInput
              style={styles.input}
              value={form.shippingFee}
              onChangeText={(text) => handleNumericInputChange('shippingFee', text)}
              placeholder="Enter shipping fee"
              keyboardType="numeric"
            />
          </View>
          
          <View style={styles.formGroup}>
            <Text style={styles.label}>Free Shipping Threshold (₹)</Text>
            <TextInput
              style={styles.input}
              value={form.freeShippingThreshold}
              onChangeText={(text) => handleNumericInputChange('freeShippingThreshold', text)}
              placeholder="Enter free shipping threshold"
              keyboardType="numeric"
            />
          </View>
          
          <View style={styles.formGroup}>
            <Text style={styles.label}>Tax Rate (%)</Text>
            <TextInput
              style={styles.input}
              value={form.taxRate}
              onChangeText={(text) => handleNumericInputChange('taxRate', text)}
              placeholder="Enter tax rate"
              keyboardType="numeric"
            />
          </View>
        </Card3D>
        
        {/* Save Button */}
        <TouchableOpacity 
          style={styles.saveButton}
          onPress={handleSave}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator size="small" color={theme.colors.white} />
          ) : (
            <>
              <Ionicons name="save-outline" size={20} color={theme.colors.white} />
              <Text style={styles.saveButtonText}>Save Changes</Text>
            </>
          )}
        </TouchableOpacity>
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
  section: {
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
  inputGroup: {
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
  textArea: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  imageContainer: {
    alignItems: 'center',
    marginBottom: theme.spacing.md,
    position: 'relative',
  },
  imagePlaceholder: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: theme.colors.lightGray,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
  },
  image: {
    width: 120,
    height: 120,
    borderRadius: 60,
    marginBottom: theme.spacing.sm,
  },
  removeImageButton: {
    position: 'absolute',
    top: 0,
    right: 0,
    padding: theme.spacing.xs,
  },
  imageSection: {
    marginBottom: theme.spacing.lg,
  },
  switchContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
  },
  formGroup: {
    marginBottom: theme.spacing.md,
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
  saveButtonText: {
    color: theme.colors.white,
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: theme.spacing.xs,
  },
});

export default VendorShopSetupScreen; 
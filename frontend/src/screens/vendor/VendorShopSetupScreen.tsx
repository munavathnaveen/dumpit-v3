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
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';

import Card3D from '../../components/Card3D';
import ScreenHeader from '../../components/ScreenHeader';
import { theme } from '../../theme';
import { MainStackNavigationProp } from '../../navigation/types';
import { getShopDetails, updateShop, ShopSettings, createShop } from '../../api/shopApi';
import alert from '../../utils/alert';
import { RootState } from '../../store';
import { useSelector } from 'react-redux';

interface ShopFormState {
  name: string;
  description: string;
  logo: string | null;
  bannerImage: string | null;
  address: {
    village: string;
    street: string;
    district: string;
    state: string;
    pincode: string;
    phone: string;
  } | string;
  contactPhone: string;
  contactEmail: string;
  city: string;
  state: string;
  pincode: string;
  isVerified: boolean;
  acceptsCod: boolean;
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
    logo: null,
    bannerImage: null,
    address: '',
    contactPhone: '',
    contactEmail: '',
    city: '',
    state: '',
    pincode: '',
    isVerified: false,
    acceptsCod: true,
    minimumOrderAmount: '0',
    shippingFee: '0',
    freeShippingThreshold: '0',
    taxRate: '0',
  });
  const [error, setError] = useState<string | null>(null);
  const userId = useSelector((state: RootState) => state.auth.user?._id);
  console.log('userId', userId);
  useEffect(() => {
    const loadShopDetails = async () => {
      try {
        setLoading(true);
        try {
          const response = await getShopDetails(userId || '');  
          const shop = response.data;
          
          setShopId(shop._id);
          setForm({
            name: shop.name || '',
            description: shop.description || '',
            logo: shop.logo || null,
            bannerImage: shop.coverImage || null,
            address: typeof shop.address === 'object' 
              ? `${shop.address.street}, ${shop.address.village}, ${shop.address.district}, ${shop.address.state}, ${shop.address.pincode}`
              : shop.address || '',
            contactPhone: shop.contactNumber || '',
            contactEmail: shop.email || '',
            city: '', 
            state: '', 
            pincode: '',
            isVerified: shop.isVerified || false,
            acceptsCod: true,
            minimumOrderAmount: '0',
            shippingFee: '0',
            freeShippingThreshold: '0',
            taxRate: '0',
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

  const handleInputChange = (field: keyof ShopFormState, value: string | boolean) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  const pickImage = async (imageType: 'logo' | 'bannerImage') => {
    try {
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      if (!permissionResult.granted) {
        alert('Permission Required', 'We need permission to access your photos');
        return;
      }
      
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: imageType === 'logo' ? [1, 1] : [16, 9],
        quality: 0.8,
      });
      
      if (!result.canceled && result.assets && result.assets.length > 0) {
        handleInputChange(imageType, result.assets[0].uri);
      }
    } catch (error) {
      console.error('Error picking image:', error);
      alert('Error', 'Failed to pick image');
    }
  };

  const handleSave = async () => {
    if (!form.name.trim()) {
      alert('Error', 'Shop name is required');
      return;
    }

    try {
      setSaving(true);
      
      // Convert numeric string fields to numbers
      const numericFields = {
        minimumOrderAmount: parseFloat(form.minimumOrderAmount) || 0,
        shippingFee: parseFloat(form.shippingFee) || 0,
        freeShippingThreshold: parseFloat(form.freeShippingThreshold) || 0,
        taxRate: parseFloat(form.taxRate) || 0,
      };
      
      // Prepare data to send to API
      const shopData: ShopSettings = {
        name: form.name,
        description: form.description,
        logo: form.logo || undefined,
        coverImage: form.bannerImage || undefined,
        contactNumber: form.contactPhone,
        email: form.contactEmail,
        address: typeof form.address === 'string' 
          ? form.address 
          : form.address 
            ? JSON.stringify(form.address) 
            : undefined,
        // Include numeric fields
        ...numericFields
      };
      
      let response;
      if (shopId) {
        // Update existing shop
        response = await updateShop(shopId, shopData);
        alert('Success', 'Shop updated successfully');
      } else {
        // Create new shop
        response = await createShop(shopData);
        setShopId(response.data._id);
        alert('Success', 'Shop created successfully');
      }
    } catch (error) {
      console.error('Error saving shop details:', error);
      alert('Error', 'Failed to save shop details');
    } finally {
      setSaving(false);
    }
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
          
          <View style={styles.formGroup}>
            <Text style={styles.label}>Shop Name</Text>
            <TextInput
              style={styles.input}
              value={form.name}
              onChangeText={(text) => handleInputChange('name', text)}
              placeholder="Your shop name"
            />
          </View>
          
          <View style={styles.formGroup}>
            <Text style={styles.label}>Description</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={form.description}
              onChangeText={(text) => handleInputChange('description', text)}
              placeholder="Describe your shop"
              multiline
              numberOfLines={4}
            />
          </View>
        </Card3D>
        
        {/* Shop Images */}
        <Card3D style={styles.section} elevation="medium">
          <Text style={styles.sectionTitle}>Shop Images</Text>
          
          <View style={styles.formGroup}>
            <Text style={styles.label}>Shop Logo</Text>
            <View style={styles.imageContainer}>
              {form.logo ? (
                <Image source={{ uri: form.logo }} style={styles.logoPreview} />
              ) : (
                <View style={styles.imagePlaceholder}>
                  <Ionicons name="image-outline" size={40} color={theme.colors.gray} />
                </View>
              )}
              <TouchableOpacity 
                style={styles.uploadButton}
                onPress={() => pickImage('logo')}
              >
                <Text style={styles.uploadButtonText}>
                  {form.logo ? 'Change Logo' : 'Upload Logo'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
          
          <View style={styles.formGroup}>
            <Text style={styles.label}>Banner Image</Text>
            <View style={styles.imageContainer}>
              {form.bannerImage ? (
                <Image source={{ uri: form.bannerImage }} style={styles.bannerPreview} />
              ) : (
                <View style={[styles.imagePlaceholder, styles.bannerPlaceholder]}>
                  <Ionicons name="image-outline" size={40} color={theme.colors.gray} />
                </View>
              )}
              <TouchableOpacity 
                style={styles.uploadButton}
                onPress={() => pickImage('bannerImage')}
              >
                <Text style={styles.uploadButtonText}>
                  {form.bannerImage ? 'Change Banner' : 'Upload Banner'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </Card3D>
        
        {/* Contact Information */}
        <Card3D style={styles.section} elevation="medium">
          <Text style={styles.sectionTitle}>Contact Information</Text>
          
          <View style={styles.formGroup}>
            <Text style={styles.label}>Address</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={typeof form.address === 'string' ? form.address : JSON.stringify(form.address)}
              onChangeText={(text) => handleInputChange('address', text)}
              placeholder="Shop address"
              multiline
              numberOfLines={3}
            />
          </View>
          
          <View style={styles.row}>
            <View style={[styles.formGroup, styles.halfWidth]}>
              <Text style={styles.label}>City</Text>
              <TextInput
                style={styles.input}
                value={form.city}
                onChangeText={(text) => handleInputChange('city', text)}
                placeholder="City"
              />
            </View>
            
            <View style={[styles.formGroup, styles.halfWidth]}>
              <Text style={styles.label}>State</Text>
              <TextInput
                style={styles.input}
                value={form.state}
                onChangeText={(text) => handleInputChange('state', text)}
                placeholder="State"
              />
            </View>
          </View>
          
          <View style={styles.formGroup}>
            <Text style={styles.label}>PIN Code</Text>
            <TextInput
              style={styles.input}
              value={form.pincode}
              onChangeText={(text) => handleInputChange('pincode', text)}
              placeholder="PIN Code"
              keyboardType="number-pad"
              maxLength={6}
            />
          </View>
          
          <View style={styles.formGroup}>
            <Text style={styles.label}>Contact Phone</Text>
            <TextInput
              style={styles.input}
              value={form.contactPhone}
              onChangeText={(text) => handleInputChange('contactPhone', text)}
              placeholder="Contact phone number"
              keyboardType="phone-pad"
            />
          </View>
          
          <View style={styles.formGroup}>
            <Text style={styles.label}>Contact Email</Text>
            <TextInput
              style={styles.input}
              value={form.contactEmail}
              onChangeText={(text) => handleInputChange('contactEmail', text)}
              placeholder="Contact email"
              keyboardType="email-address"
              autoCapitalize="none"
            />
          </View>
        </Card3D>
        
        {/* Payment Settings */}
        <Card3D style={styles.section} elevation="medium">
          <Text style={styles.sectionTitle}>Payment & Delivery Settings</Text>
          
          <View style={styles.switchFormGroup}>
            <Text style={styles.label}>Accept Cash on Delivery</Text>
            <Switch
              value={form.acceptsCod}
              onValueChange={(value) => handleInputChange('acceptsCod', value)}
              trackColor={{ false: theme.colors.lightGray, true: theme.colors.success }}
              thumbColor={theme.colors.white}
            />
          </View>
          
          <View style={styles.formGroup}>
            <Text style={styles.label}>Minimum Order Amount (₹)</Text>
            <TextInput
              style={styles.input}
              value={form.minimumOrderAmount}
              onChangeText={(text) => handleInputChange('minimumOrderAmount', text)}
              placeholder="0"
              keyboardType="decimal-pad"
            />
          </View>
          
          <View style={styles.formGroup}>
            <Text style={styles.label}>Shipping Fee (₹)</Text>
            <TextInput
              style={styles.input}
              value={form.shippingFee}
              onChangeText={(text) => handleInputChange('shippingFee', text)}
              placeholder="0"
              keyboardType="decimal-pad"
            />
          </View>
          
          <View style={styles.formGroup}>
            <Text style={styles.label}>Free Shipping Threshold (₹)</Text>
            <TextInput
              style={styles.input}
              value={form.freeShippingThreshold}
              onChangeText={(text) => handleInputChange('freeShippingThreshold', text)}
              placeholder="0"
              keyboardType="decimal-pad"
            />
          </View>
          
          <View style={styles.formGroup}>
            <Text style={styles.label}>Tax Rate (%)</Text>
            <TextInput
              style={styles.input}
              value={form.taxRate}
              onChangeText={(text) => handleInputChange('taxRate', text)}
              placeholder="0"
              keyboardType="decimal-pad"
            />
          </View>
        </Card3D>
        
        {/* Shop Status */}
        <Card3D style={styles.section} elevation="medium">
          <Text style={styles.sectionTitle}>Shop Status</Text>
          
          <View style={styles.statusContainer}>
            <View style={styles.verificationStatus}>
              <Ionicons 
                name={form.isVerified ? "checkmark-circle" : "information-circle-outline"} 
                size={24} 
                color={form.isVerified ? theme.colors.success : theme.colors.warning} 
              />
              <View style={styles.statusTextContainer}>
                <Text style={styles.statusTitle}>
                  {form.isVerified ? "Verified Shop" : "Verification Pending"}
                </Text>
                <Text style={styles.statusDescription}>
                  {form.isVerified 
                    ? "Your shop is verified and fully operational." 
                    : "Your shop is under review. This may take 1-2 business days."}
                </Text>
              </View>
            </View>
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
    fontSize: 16,
    color: theme.colors.error,
    marginBottom: theme.spacing.md,
    textAlign: 'center',
  },
  retryButton: {
    backgroundColor: theme.colors.primary,
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.lg,
    borderRadius: theme.borderRadius.medium,
  },
  retryButtonText: {
    color: theme.colors.white,
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
    marginBottom: theme.spacing.lg,
    padding: theme.spacing.md,
    backgroundColor: theme.colors.white,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: theme.colors.dark,
    marginBottom: theme.spacing.md,
  },
  formGroup: {
    marginBottom: theme.spacing.md,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  halfWidth: {
    width: '48%',
  },
  label: {
    fontSize: 14,
    color: theme.colors.gray,
    marginBottom: theme.spacing.xs,
  },
  input: {
    backgroundColor: theme.colors.background,
    borderRadius: theme.borderRadius.small,
    padding: theme.spacing.sm,
    borderColor: theme.colors.lightGray,
    borderWidth: 1,
    color: theme.colors.dark,
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  switchFormGroup: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
  },
  imageContainer: {
    alignItems: 'center',
  },
  logoPreview: {
    width: 120,
    height: 120,
    borderRadius: 60,
    marginBottom: theme.spacing.sm,
  },
  bannerPreview: {
    width: '100%',
    height: 160,
    borderRadius: theme.borderRadius.medium,
    marginBottom: theme.spacing.sm,
  },
  imagePlaceholder: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: theme.colors.lightGray,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: theme.spacing.sm,
  },
  bannerPlaceholder: {
    width: '100%',
    height: 160,
    borderRadius: theme.borderRadius.medium,
  },
  uploadButton: {
    backgroundColor: theme.colors.primary,
    paddingVertical: theme.spacing.xs,
    paddingHorizontal: theme.spacing.md,
    borderRadius: theme.borderRadius.small,
  },
  uploadButtonText: {
    color: theme.colors.white,
    fontWeight: '500',
  },
  statusContainer: {
    marginBottom: theme.spacing.md,
  },
  verificationStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.background,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.medium,
  },
  statusTextContainer: {
    marginLeft: theme.spacing.sm,
    flex: 1,
  },
  statusTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: theme.colors.dark,
    marginBottom: 4,
  },
  statusDescription: {
    fontSize: 14,
    color: theme.colors.gray,
  },
  saveButton: {
    backgroundColor: theme.colors.primary,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: theme.spacing.md,
    borderRadius: theme.borderRadius.medium,
    marginTop: theme.spacing.md,
  },
  saveButtonText: {
    color: theme.colors.white,
    fontWeight: 'bold',
    fontSize: 16,
    marginLeft: theme.spacing.xs,
  },
});

export default VendorShopSetupScreen; 
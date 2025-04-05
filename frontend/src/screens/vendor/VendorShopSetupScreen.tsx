import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Switch,
  Image,
  Alert,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';

import Card3D from '../../components/Card3D';
import { theme } from '../../theme';
import { MainStackNavigationProp } from '../../navigation/types';

// Mock shop data
// In a real application, this would come from an API
interface ShopSettings {
  shopName: string;
  description: string;
  logo: string | null;
  bannerImage: string | null;
  contactEmail: string;
  contactPhone: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
  isOpen: boolean;
  isVerified: boolean;
  acceptsCod: boolean;
  minimumOrderAmount: number;
  shippingFee: number;
  freeShippingThreshold: number;
  taxRate: number;
}

const mockShopData: ShopSettings = {
  shopName: 'Fashion Bazaar',
  description: 'Your one-stop shop for all fashion needs. We offer the latest trends at affordable prices.',
  logo: 'https://via.placeholder.com/200',
  bannerImage: 'https://via.placeholder.com/800x300',
  contactEmail: 'contact@fashionbazaar.com',
  contactPhone: '+91 9876543210',
  address: '123 Fashion Street',
  city: 'Mumbai',
  state: 'Maharashtra',
  pincode: '400001',
  isOpen: true,
  isVerified: true,
  acceptsCod: true,
  minimumOrderAmount: 500,
  shippingFee: 100,
  freeShippingThreshold: 1500,
  taxRate: 5,
};

const VendorShopSetupScreen: React.FC = () => {
  const navigation = useNavigation<MainStackNavigationProp<'VendorShopSetup'>>();
  const [shopData, setShopData] = useState<ShopSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // In a real app, fetch from API
    const fetchShopData = async () => {
      try {
        setLoading(true);
        // Simulate API call
        setTimeout(() => {
          setShopData(mockShopData);
          setLoading(false);
        }, 1000);
      } catch (err) {
        console.error('Failed to load shop data:', err);
        setError('Failed to load shop data. Please try again.');
        setLoading(false);
      }
    };

    fetchShopData();
  }, []);

  const handleInputChange = (field: keyof ShopSettings, value: any) => {
    if (!shopData) return;
    
    setShopData({
      ...shopData,
      [field]: value,
    });
  };

  const handleNumericInputChange = (field: keyof ShopSettings, value: string) => {
    if (!shopData) return;
    
    const numericValue = value === '' ? 0 : parseFloat(value);
    
    if (!isNaN(numericValue)) {
      setShopData({
        ...shopData,
        [field]: numericValue,
      });
    }
  };

  const handleImagePicker = async (imageType: 'logo' | 'bannerImage') => {
    // Request permission if needed
    if (Platform.OS !== 'web') {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Sorry, we need camera roll permissions to upload images.');
        return;
      }
    }

    // Launch image picker
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: imageType === 'logo' ? [1, 1] : [3, 1],
      quality: 0.7,
      base64: true,
    });

    if (!result.canceled && result.assets && result.assets.length > 0) {
      const selectedAsset = result.assets[0];
      if (selectedAsset.base64) {
        // For simplicity, we're using base64 data URIs
        // In a production app, you would upload to a server and get back a URL
        const imageUri = `data:image/jpeg;base64,${selectedAsset.base64}`;
        handleInputChange(imageType, imageUri);
      }
    }
  };

  const handleSave = async () => {
    if (!shopData) return;

    try {
      setSaving(true);
      
      // Validate required fields
      if (!shopData.shopName.trim()) {
        Alert.alert('Error', 'Shop name is required');
        setSaving(false);
        return;
      }
      
      if (!shopData.contactEmail.trim()) {
        Alert.alert('Error', 'Contact email is required');
        setSaving(false);
        return;
      }
      
      if (!shopData.contactPhone.trim()) {
        Alert.alert('Error', 'Contact phone is required');
        setSaving(false);
        return;
      }
      
      // In a real app, send to API
      // await updateShopSettings(shopData);
      
      // Simulate API call
      setTimeout(() => {
        setSaving(false);
        Alert.alert(
          'Success',
          'Shop settings updated successfully',
          [{ text: 'OK' }]
        );
      }, 1500);
      
    } catch (err) {
      console.error('Failed to save shop settings:', err);
      Alert.alert('Error', 'Failed to save shop settings. Please try again.');
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  if (error || !shopData) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>{error || 'Failed to load shop data'}</Text>
        <TouchableOpacity 
          style={styles.retryButton} 
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.retryButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Shop Settings</Text>
      </View>

      <ScrollView 
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        {/* Basic Shop Information */}
        <Card3D style={styles.card} elevation="medium">
          <Text style={styles.sectionTitle}>Basic Information</Text>
          
          {/* Shop Name */}
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Shop Name*</Text>
            <TextInput
              style={styles.input}
              value={shopData.shopName}
              onChangeText={(text) => handleInputChange('shopName', text)}
              placeholder="Enter your shop name"
              placeholderTextColor={theme.colors.lightGray}
            />
          </View>
          
          {/* Shop Description */}
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Description</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={shopData.description}
              onChangeText={(text) => handleInputChange('description', text)}
              placeholder="Describe your shop"
              placeholderTextColor={theme.colors.lightGray}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />
          </View>
          
          {/* Shop Logo */}
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Shop Logo</Text>
            <View style={styles.imageContainer}>
              {shopData.logo ? (
                <View style={styles.imagePreview}>
                  <Image 
                    source={{ uri: shopData.logo }} 
                    style={styles.logoImage} 
                  />
                  <TouchableOpacity 
                    style={styles.changeImageButton}
                    onPress={() => handleImagePicker('logo')}
                  >
                    <Text style={styles.changeImageText}>Change Logo</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <TouchableOpacity 
                  style={styles.uploadButton}
                  onPress={() => handleImagePicker('logo')}
                >
                  <Ionicons name="cloud-upload-outline" size={24} color={theme.colors.primary} />
                  <Text style={styles.uploadButtonText}>Upload Logo</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
          
          {/* Banner Image */}
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Banner Image</Text>
            <View style={styles.imageContainer}>
              {shopData.bannerImage ? (
                <View style={styles.imagePreview}>
                  <Image 
                    source={{ uri: shopData.bannerImage }} 
                    style={styles.bannerImage} 
                  />
                  <TouchableOpacity 
                    style={styles.changeImageButton}
                    onPress={() => handleImagePicker('bannerImage')}
                  >
                    <Text style={styles.changeImageText}>Change Banner</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <TouchableOpacity 
                  style={[styles.uploadButton, styles.bannerUploadButton]}
                  onPress={() => handleImagePicker('bannerImage')}
                >
                  <Ionicons name="cloud-upload-outline" size={24} color={theme.colors.primary} />
                  <Text style={styles.uploadButtonText}>Upload Banner</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
          
          {/* Shop Status */}
          <View style={styles.switchContainer}>
            <View style={styles.switchInfo}>
              <Text style={styles.switchLabel}>Shop Open</Text>
              <Text style={styles.switchDescription}>
                Turn off to temporarily close your shop
              </Text>
            </View>
            <Switch
              value={shopData.isOpen}
              onValueChange={(value) => handleInputChange('isOpen', value)}
              trackColor={{ false: theme.colors.lightGray, true: theme.colors.success }}
              thumbColor={theme.colors.white}
              ios_backgroundColor={theme.colors.lightGray}
            />
          </View>
          
          {/* Verification Status - Read-only */}
          <View style={styles.verificationContainer}>
            <View style={styles.verificationContent}>
              <Ionicons 
                name={shopData.isVerified ? "shield-checkmark" : "shield-outline"} 
                size={24} 
                color={shopData.isVerified ? theme.colors.success : theme.colors.warning} 
              />
              <View style={styles.verificationText}>
                <Text style={styles.verificationTitle}>
                  {shopData.isVerified ? "Verified Shop" : "Verification Pending"}
                </Text>
                <Text style={styles.verificationDescription}>
                  {shopData.isVerified 
                    ? "Your shop is verified and trusted by customers" 
                    : "We're reviewing your shop details for verification"}
                </Text>
              </View>
            </View>
          </View>
        </Card3D>
        
        {/* Contact Information */}
        <Card3D style={styles.card} elevation="medium">
          <Text style={styles.sectionTitle}>Contact Information</Text>
          
          {/* Contact Email */}
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Contact Email*</Text>
            <TextInput
              style={styles.input}
              value={shopData.contactEmail}
              onChangeText={(text) => handleInputChange('contactEmail', text)}
              placeholder="Enter contact email"
              placeholderTextColor={theme.colors.lightGray}
              keyboardType="email-address"
              autoCapitalize="none"
            />
          </View>
          
          {/* Contact Phone */}
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Contact Phone*</Text>
            <TextInput
              style={styles.input}
              value={shopData.contactPhone}
              onChangeText={(text) => handleInputChange('contactPhone', text)}
              placeholder="Enter contact phone"
              placeholderTextColor={theme.colors.lightGray}
              keyboardType="phone-pad"
            />
          </View>
          
          {/* Address */}
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Address</Text>
            <TextInput
              style={styles.input}
              value={shopData.address}
              onChangeText={(text) => handleInputChange('address', text)}
              placeholder="Enter street address"
              placeholderTextColor={theme.colors.lightGray}
            />
          </View>
          
          {/* City, State, Pincode - Row */}
          <View style={styles.rowContainer}>
            <View style={[styles.inputContainer, { flex: 1, marginRight: theme.spacing.sm }]}>
              <Text style={styles.label}>City</Text>
              <TextInput
                style={styles.input}
                value={shopData.city}
                onChangeText={(text) => handleInputChange('city', text)}
                placeholder="City"
                placeholderTextColor={theme.colors.lightGray}
              />
            </View>
            
            <View style={[styles.inputContainer, { flex: 1, marginRight: theme.spacing.sm }]}>
              <Text style={styles.label}>State</Text>
              <TextInput
                style={styles.input}
                value={shopData.state}
                onChangeText={(text) => handleInputChange('state', text)}
                placeholder="State"
                placeholderTextColor={theme.colors.lightGray}
              />
            </View>
            
            <View style={[styles.inputContainer, { flex: 0.8 }]}>
              <Text style={styles.label}>Pincode</Text>
              <TextInput
                style={styles.input}
                value={shopData.pincode}
                onChangeText={(text) => handleInputChange('pincode', text)}
                placeholder="Pincode"
                placeholderTextColor={theme.colors.lightGray}
                keyboardType="numeric"
              />
            </View>
          </View>
        </Card3D>
        
        {/* Payment and Shipping Settings */}
        <Card3D style={styles.card} elevation="medium">
          <Text style={styles.sectionTitle}>Payment & Shipping</Text>
          
          {/* COD Option */}
          <View style={styles.switchContainer}>
            <View style={styles.switchInfo}>
              <Text style={styles.switchLabel}>Accept Cash on Delivery</Text>
              <Text style={styles.switchDescription}>
                Allow customers to pay when they receive the order
              </Text>
            </View>
            <Switch
              value={shopData.acceptsCod}
              onValueChange={(value) => handleInputChange('acceptsCod', value)}
              trackColor={{ false: theme.colors.lightGray, true: theme.colors.success }}
              thumbColor={theme.colors.white}
              ios_backgroundColor={theme.colors.lightGray}
            />
          </View>
          
          {/* Minimum Order Amount */}
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Minimum Order Amount (₹)</Text>
            <TextInput
              style={styles.input}
              value={shopData.minimumOrderAmount.toString()}
              onChangeText={(text) => handleNumericInputChange('minimumOrderAmount', text)}
              placeholder="0"
              placeholderTextColor={theme.colors.lightGray}
              keyboardType="numeric"
            />
          </View>
          
          {/* Shipping Fee */}
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Shipping Fee (₹)</Text>
            <TextInput
              style={styles.input}
              value={shopData.shippingFee.toString()}
              onChangeText={(text) => handleNumericInputChange('shippingFee', text)}
              placeholder="0"
              placeholderTextColor={theme.colors.lightGray}
              keyboardType="numeric"
            />
          </View>
          
          {/* Free Shipping Threshold */}
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Free Shipping Threshold (₹)</Text>
            <TextInput
              style={styles.input}
              value={shopData.freeShippingThreshold.toString()}
              onChangeText={(text) => handleNumericInputChange('freeShippingThreshold', text)}
              placeholder="0"
              placeholderTextColor={theme.colors.lightGray}
              keyboardType="numeric"
            />
            <Text style={styles.helperText}>
              Orders above this amount will qualify for free shipping
            </Text>
          </View>
          
          {/* Tax Rate */}
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Tax Rate (%)</Text>
            <TextInput
              style={styles.input}
              value={shopData.taxRate.toString()}
              onChangeText={(text) => handleNumericInputChange('taxRate', text)}
              placeholder="0"
              placeholderTextColor={theme.colors.lightGray}
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
              <Text style={styles.saveButtonText}>Save Settings</Text>
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
  header: {
    padding: theme.spacing.md,
    backgroundColor: theme.colors.white,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.lightGray,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: theme.colors.dark,
  },
  contentContainer: {
    padding: theme.spacing.md,
    paddingBottom: theme.spacing.xl * 2,
  },
  card: {
    backgroundColor: theme.colors.white,
    borderRadius: theme.borderRadius.medium,
    marginBottom: theme.spacing.md,
    padding: theme.spacing.md,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: theme.colors.dark,
    marginBottom: theme.spacing.md,
  },
  inputContainer: {
    marginBottom: theme.spacing.md,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: theme.colors.dark,
    marginBottom: theme.spacing.xs,
  },
  input: {
    borderWidth: 1,
    borderColor: theme.colors.lightGray,
    borderRadius: theme.borderRadius.small,
    padding: theme.spacing.sm,
    fontSize: 14,
    color: theme.colors.dark,
    backgroundColor: theme.colors.background,
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  imageContainer: {
    marginTop: theme.spacing.xs,
  },
  imagePreview: {
    alignItems: 'center',
  },
  logoImage: {
    width: 120,
    height: 120,
    borderRadius: theme.borderRadius.medium,
    marginBottom: theme.spacing.sm,
  },
  bannerImage: {
    width: '100%',
    height: 120,
    borderRadius: theme.borderRadius.medium,
    marginBottom: theme.spacing.sm,
  },
  uploadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: theme.colors.primary,
    borderRadius: theme.borderRadius.medium,
    padding: theme.spacing.md,
    backgroundColor: `${theme.colors.primary}10`,
  },
  bannerUploadButton: {
    height: 120,
  },
  uploadButtonText: {
    color: theme.colors.primary,
    fontWeight: '500',
    marginLeft: theme.spacing.xs,
  },
  changeImageButton: {
    backgroundColor: theme.colors.primary,
    paddingVertical: theme.spacing.xs,
    paddingHorizontal: theme.spacing.md,
    borderRadius: theme.borderRadius.medium,
  },
  changeImageText: {
    color: theme.colors.white,
    fontWeight: '500',
    fontSize: 12,
  },
  switchContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
  },
  switchInfo: {
    flex: 1,
  },
  switchLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: theme.colors.dark,
  },
  switchDescription: {
    fontSize: 12,
    color: theme.colors.gray,
    marginTop: 2,
  },
  verificationContainer: {
    backgroundColor: theme.colors.background,
    borderRadius: theme.borderRadius.small,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.sm,
  },
  verificationContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  verificationText: {
    marginLeft: theme.spacing.sm,
    flex: 1,
  },
  verificationTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: theme.colors.dark,
  },
  verificationDescription: {
    fontSize: 12,
    color: theme.colors.gray,
    marginTop: 2,
  },
  rowContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  helperText: {
    fontSize: 12,
    color: theme.colors.gray,
    marginTop: 4,
  },
  saveButton: {
    backgroundColor: theme.colors.primary,
    borderRadius: theme.borderRadius.medium,
    paddingVertical: theme.spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: theme.spacing.md,
    ...theme.shadow.medium,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: theme.colors.white,
    marginLeft: theme.spacing.xs,
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
});

export default VendorShopSetupScreen; 
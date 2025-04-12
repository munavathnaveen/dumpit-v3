import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  ScrollView,
  Platform,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useRoute, RouteProp } from '@react-navigation/core';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';

import { theme } from '../../theme';
import { MainStackNavigationProp, MainStackParamList } from '../../navigation/types';
import { getProduct, updateProduct, uploadProductImage, ProductFormData } from '../../api/productApi';
import Card3D from '../../components/Card3D';
import ScreenHeader from '../../components/ScreenHeader';
import Button from '../../components/Button';
import alert from '../../utils/alert';

type EditProductRouteProp = RouteProp<MainStackParamList, 'VendorEditProduct'>;

const productCategories = [
  'Electronics',
  'Clothing',
  'Home & Kitchen',
  'Beauty & Personal Care',
  'Books',
  'Sports & Outdoors',
  'Toys & Games',
  'Health & Wellness',
  'Grocery',
  'Other',
];

const VendorEditProductScreen: React.FC = () => {
  const navigation = useNavigation<MainStackNavigationProp<'VendorEditProduct'>>();
  const route = useRoute<EditProductRouteProp>();
  const { productId } = route.params;

  const [formData, setFormData] = useState<ProductFormData>({
    name: '',
    description: '',
    price: 0,
    category: '',
    stockQuantity: 0,
    type: '',
    units: '',
    discount: 0,
    image: '',
    isActive: true,
  });
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load product data on component mount
  useEffect(() => {
    const loadProduct = async () => {
      try {
        setLoading(true);
        const response = await getProduct(productId);
        const product = response.data;
        
        setFormData({
          name: product.name,
          description: product.description,
          price: product.price,
          category: product.category,
          stockQuantity: product.stock || 0,
          type: product.type || '',
          units: product.units || '',
          discount: product.discount || 0,
          image: product.image || '',
          isActive: product.isActive,
        });
        
        setError(null);
      } catch (err) {
        console.error('Failed to load product:', err);
        setError('Failed to load product. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    loadProduct();
  }, [productId]);

  const validateForm = (): boolean => {
    if (!formData.name.trim()) {
      alert('Error', 'Please enter a product name');
      return false;
    }
    if (!formData.description.trim()) {
      alert('Error', 'Please enter a product description');
      return false;
    }
      if (!formData.type || formData.type.trim() === '') {
      alert('Error', 'Please enter a product type');
      return false;
    }
    if (!formData.category) {
      alert('Error', 'Please select a category');
      return false;
    }
    if (!formData.price || formData.price <= 0) {
      alert('Error', 'Please enter a valid price');
      return false;
    }
    if (!formData.units || formData.units.trim() === '') {
      alert('Error', 'Please enter product units');
      return false;
    }
    if (formData.stockQuantity !== undefined && formData.stockQuantity < 0) {
      alert('Error', 'Stock quantity cannot be negative');
      return false;
    }
    if (formData.discount !== undefined && (formData.discount < 0 || formData.discount > 100)) {
      alert('Error', 'Discount must be between 0% and 100%');
      return false;
    }
    return true;
  };

  const handleInputChange = (field: keyof ProductFormData, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleImageChange = (url: string) => {
    setFormData(prev => ({
      ...prev,
      image: url
    }));
  };

  const handleRemoveImage = () => {
    setFormData(prev => ({
      ...prev,
      image: ''
    }));
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    try {
      setSubmitting(true);

      const updatedProductData: ProductFormData = {
        name: formData.name,
        description: formData.description,
        type: formData.type,
        category: formData.category,
        price: formData.price,
        units: formData.units,
        stock: formData.stockQuantity,
        discount: formData.discount,
        isActive: formData.isActive,
        image: formData.image,
      };

      const response = await updateProduct(productId, updatedProductData);
      
      if (response.success) {
        alert(
          'Success',
          'Product updated successfully',
          [{ text: 'OK', onPress: () => navigation.goBack() }]
        );
      } else {
        alert('Error', 'Failed to update product. Please try again.');
      }
    } catch (err) {
      console.error('Failed to update product:', err);
      alert('Error', 'Failed to update product. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <ScreenHeader title="Edit Product" showBackButton={true} />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
        </View>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity 
          style={styles.goBackButton} 
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.goBackButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScreenHeader title="Edit Product" showBackButton={true} />
      
      <KeyboardAwareScrollView 
        contentContainerStyle={styles.contentContainer}
        enableOnAndroid={true}
        keyboardShouldPersistTaps="handled"
      >
        <Card3D style={styles.formCard} elevation="medium">
          {/* Product Name */}
          <View style={styles.formField}>
            <Text style={styles.label}>Product Name*</Text>
            <TextInput
              style={styles.input}
              value={formData.name}
              onChangeText={(text) => handleInputChange('name', text)}
              placeholder="Enter product name"
              placeholderTextColor={theme.colors.lightGray}
            />
          </View>

          {/* Product Description */}
          <View style={styles.formField}>
            <Text style={styles.label}>Description*</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={formData.description}
              onChangeText={(text) => handleInputChange('description', text)}
              placeholder="Enter product description"
              placeholderTextColor={theme.colors.lightGray}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />
          </View>

          {/* Product Type */}
          <View style={styles.formField}>
            <Text style={styles.label}>Product Type*</Text>
            <TextInput
              style={styles.input}
              value={formData.type}
              onChangeText={(text) => handleInputChange('type', text)}
              placeholder="Enter product type (e.g., Physical, Digital)"
              placeholderTextColor={theme.colors.lightGray}
            />
          </View>


          {/* Price */}
          <View style={styles.formField}>
            <Text style={styles.label}>Price (₹)*</Text>
            <TextInput
              style={styles.input}
              value={formData.price ? formData.price.toString() : '0'}
              onChangeText={(text) => handleInputChange('price', parseFloat(text) || 0)}
              placeholder="0.00"
              placeholderTextColor={theme.colors.lightGray}
              keyboardType="numeric"
            />
          </View>

          {/* Units */}
          <View style={styles.formField}>
            <Text style={styles.label}>Units*</Text>
            <TextInput
              style={styles.input}
              value={formData.units}
              onChangeText={(text) => handleInputChange('units', text)}
              placeholder="Enter units (e.g., kg, piece, dozen)"
              placeholderTextColor={theme.colors.lightGray}
            />
          </View>

          {/* Category */}
          <View style={styles.formField}>
            <Text style={styles.label}>Category*</Text>
            <ScrollView 
              horizontal 
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.categoriesContainer}
            >
              {productCategories.map((category) => (
                <TouchableOpacity
                  key={category}
                  style={[
                    styles.categoryChip,
                    formData.category === category && styles.selectedCategoryChip
                  ]}
                  onPress={() => handleInputChange('category', category)}
                >
                  <Text 
                    style={[
                      styles.categoryChipText,
                      formData.category === category && styles.selectedCategoryChipText
                    ]}
                  >
                    {category}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          {/* Stock Quantity */}
          <View style={styles.formField}>
            <Text style={styles.label}>Stock Quantity*</Text>
            <TextInput
              style={styles.input}
              value={formData.stockQuantity?.toString() || '0'}
              onChangeText={(text) => handleInputChange('stockQuantity', parseInt(text) || 0)}
              placeholder="0"
              placeholderTextColor={theme.colors.lightGray}
              keyboardType="numeric"
            />
          </View>

          {/* Discount */}
          <View style={styles.formField}>
            <Text style={styles.label}>Discount (%)</Text>
            <TextInput
              style={styles.input}
              value={formData.discount?.toString() || '0'}
              onChangeText={(text) => handleInputChange('discount', parseFloat(text) || 0)}
              placeholder="0"
              placeholderTextColor={theme.colors.lightGray}
              keyboardType="numeric"
            />
          </View>

          {/* Product Status */}
          <View style={styles.formField}>
            <Text style={styles.label}>Product Status</Text>
            <View style={styles.statusContainer}>
              <TouchableOpacity
                style={[
                  styles.statusButton,
                  formData.isActive && styles.activeStatusButton
                ]}
                onPress={() => handleInputChange('isActive', true)}
              >
                <Ionicons 
                  name="checkmark-circle" 
                  size={20} 
                  color={formData.isActive ? theme.colors.white : theme.colors.dark} 
                />
                <Text 
                  style={[
                    styles.statusButtonText,
                    formData.isActive && styles.activeStatusButtonText
                  ]}
                >
                  Active
                </Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[
                  styles.statusButton,
                  !formData.isActive && styles.inactiveStatusButton
                ]}
                onPress={() => handleInputChange('isActive', false)}
              >
                <Ionicons 
                  name="pause-circle" 
                  size={20} 
                  color={!formData.isActive ? theme.colors.white : theme.colors.dark} 
                />
                <Text 
                  style={[
                    styles.statusButtonText,
                    !formData.isActive && styles.inactiveStatusButtonText
                  ]}
                >
                  Inactive
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </Card3D>

        {/* Product Image */}
        <Card3D style={styles.formCard} elevation="medium">
          <Text style={styles.sectionTitle}>Product Image</Text>
          
          {formData.image && (
            <View style={styles.imageContainer}>
              <Image source={{ uri: formData.image }} style={styles.productImage} />
              <TouchableOpacity 
                style={styles.removeImageButton}
                onPress={handleRemoveImage}
              >
                <Ionicons name="close-circle" size={24} color={theme.colors.error} />
              </TouchableOpacity>
            </View>
          )}

          <View style={styles.formField}>
            <Text style={styles.label}>Image URL (Optional)</Text>
            <TextInput
              style={styles.input}
              value={formData.image}
              onChangeText={(text) => handleImageChange(text)}
              placeholder="Enter image URL"
              placeholderTextColor={theme.colors.lightGray}
            />
            <Text style={styles.helperText}>
              If not provided, a similar product type image will be used if available.
            </Text>
          </View>
        </Card3D>

        {/* Submit Button */}
        <TouchableOpacity
          style={styles.submitButton}
          onPress={handleSubmit}
          disabled={submitting}
        >
          {submitting ? (
            <ActivityIndicator size="small" color={theme.colors.white} />
          ) : (
            <Text style={styles.submitButtonText}>Update Product</Text>
          )}
        </TouchableOpacity>
      </KeyboardAwareScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: theme.spacing.md,
    backgroundColor: theme.colors.white,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.lightGray,
  },
  backButton: {
    padding: theme.spacing.xs,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: theme.colors.dark,
  },
  spacer: {
    width: 40,
  },
  contentContainer: {
    padding: theme.spacing.md,
    paddingBottom: theme.spacing.xl * 2,
  },
  formCard: {
    backgroundColor: theme.colors.white,
    borderRadius: theme.borderRadius.medium,
    marginBottom: theme.spacing.md,
    padding: theme.spacing.md,
  },
  formField: {
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
    paddingTop: theme.spacing.sm,
  },
  categoriesContainer: {
    paddingVertical: theme.spacing.xs,
  },
  categoryChip: {
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.xs,
    borderRadius: 20,
    backgroundColor: theme.colors.background,
    marginRight: theme.spacing.xs,
    borderWidth: 1,
    borderColor: theme.colors.lightGray,
  },
  selectedCategoryChip: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  categoryChipText: {
    fontSize: 14,
    color: theme.colors.dark,
  },
  selectedCategoryChipText: {
    color: theme.colors.white,
    fontWeight: '500',
  },
  statusContainer: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
  },
  statusButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.borderRadius.small,
    marginRight: theme.spacing.sm,
    borderWidth: 1,
    borderColor: theme.colors.lightGray,
  },
  activeStatusButton: {
    backgroundColor: theme.colors.success,
    borderColor: theme.colors.success,
  },
  inactiveStatusButton: {
    backgroundColor: theme.colors.error,
    borderColor: theme.colors.error,
  },
  statusButtonText: {
    fontSize: 14,
    color: theme.colors.dark,
    marginLeft: theme.spacing.xs,
  },
  activeStatusButtonText: {
    color: theme.colors.white,
    fontWeight: '500',
  },
  inactiveStatusButtonText: {
    color: theme.colors.white,
    fontWeight: '500',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: theme.colors.dark,
    marginBottom: theme.spacing.md,
  },
  productImage: {
    width: 200,
    height: 200,
    borderRadius: theme.borderRadius.small,
    borderWidth: 1,
    borderColor: theme.colors.lightGray,
  },
  removeImageButton: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: theme.colors.white,
    borderRadius: 20,
    padding: 0,
  },
  imageContainer: {
    position: 'relative',
  },
  helperText: {
    fontSize: 12,
    color: theme.colors.lightGray,
    marginTop: theme.spacing.xs,
  },
  submitButton: {
    backgroundColor: theme.colors.primary,
    borderRadius: theme.borderRadius.medium,
    paddingVertical: theme.spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: theme.spacing.md,
    ...theme.shadow.medium,
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: theme.colors.white,
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
  goBackButton: {
    backgroundColor: theme.colors.primary,
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.lg,
    borderRadius: theme.borderRadius.medium,
  },
  goBackButtonText: {
    color: theme.colors.white,
    fontWeight: 'bold',
  },
  formGroup: {
    marginBottom: theme.spacing.md,
  },
});

export default VendorEditProductScreen; 
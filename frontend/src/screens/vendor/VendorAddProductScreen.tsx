import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Image,
  Alert,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';

import { theme } from '../../theme';
import { MainStackNavigationProp } from '../../navigation/types';
import { createProduct, uploadProductImage, ProductFormData } from '../../api/productApi';

// Categories for products
const CATEGORIES = [
  'Electronics',
  'Clothing',
  'Home',
  'Beauty',
  'Sports',
  'Books',
  'Food',
  'Toys',
  'Automotive',
  'Other',
];

const VendorAddProductScreen: React.FC = () => {
  const navigation = useNavigation<MainStackNavigationProp<'VendorAddProduct'>>();
  
  const [formData, setFormData] = useState<ProductFormData>({
    name: '',
    description: '',
    price: 0,
    discountPrice: undefined,
    category: '',
    stock: 0,
    images: [],
    tags: [],
    isAvailable: true,
  });

  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [uploading, setUploading] = useState(false);

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Product name is required';
    }

    if (!formData.description.trim()) {
      newErrors.description = 'Description is required';
    }

    if (!formData.price || formData.price <= 0) {
      newErrors.price = 'Price must be greater than 0';
    }

    if (formData.discountPrice !== undefined && (formData.discountPrice <= 0 || formData.discountPrice >= formData.price)) {
      newErrors.discountPrice = 'Discount price must be greater than 0 and less than the regular price';
    }

    if (!formData.category) {
      newErrors.category = 'Please select a category';
    }

    if (formData.stock !== undefined && formData.stock < 0) {
      Alert.alert('Error', 'Stock quantity cannot be negative');
      return false;
    }

    if (formData.images.length === 0) {
      newErrors.images = 'Please add at least one image';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleInputChange = (field: keyof ProductFormData, value: any) => {
    setFormData({
      ...formData,
      [field]: value,
    });

    // Clear error for this field if it exists
    if (errors[field]) {
      const newErrors = { ...errors };
      delete newErrors[field];
      setErrors(newErrors);
    }
  };

  const handleImagePick = async () => {
    try {
      // Request permission
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      if (!permissionResult.granted) {
        Alert.alert('Permission Required', 'Please allow access to your photo library to add product images.');
        return;
      }
      
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });
      
      if (!result.canceled && result.assets && result.assets.length > 0) {
        const selectedAsset = result.assets[0];
        const uri = selectedAsset.uri;
        
        // Upload the image to the server
        setUploading(true);
        try {
          // Create a File from URI for web
          const file = Platform.OS === 'web' 
            ? await fetch(uri).then(r => r.blob()) as File
            : {
                uri,
                type: 'image/jpeg',
                name: 'product_image.jpg',
              } as unknown as File;
          
          const response = await uploadProductImage(file);
          
          if (response.success) {
            // Add the image URL to the images array
            setFormData({
              ...formData,
              images: [...formData.images, response.data],
            });
            
            // Clear any image error
            if (errors.images) {
              const newErrors = { ...errors };
              delete newErrors.images;
              setErrors(newErrors);
            }
          } else {
            Alert.alert('Upload Failed', 'Failed to upload image. Please try again.');
          }
        } catch (error) {
          console.error('Image upload error:', error);
          Alert.alert('Upload Error', 'An error occurred while uploading the image.');
        } finally {
          setUploading(false);
        }
      }
    } catch (error) {
      console.error('Image picker error:', error);
      Alert.alert('Error', 'Failed to open image picker');
      setUploading(false);
    }
  };

  const handleRemoveImage = (index: number) => {
    const newImages = [...formData.images];
    newImages.splice(index, 1);
    setFormData({
      ...formData,
      images: newImages,
    });
  };

  const handleAddProduct = async () => {
    if (!validateForm()) {
      Alert.alert('Validation Error', 'Please fix the errors in the form.');
      return;
    }

    setLoading(true);
    try {
      await createProduct(formData);
      Alert.alert(
        'Success',
        'Product added successfully!',
        [
          {
            text: 'OK',
            onPress: () => navigation.navigate('VendorProducts'),
          },
        ]
      );
    } catch (error) {
      console.error('Failed to add product:', error);
      Alert.alert('Error', 'Failed to add product. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAwareScrollView 
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
    >
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color={theme.colors.dark} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Add New Product</Text>
        <View style={styles.spacer} />
      </View>

      <View style={styles.formContainer}>
        {/* Product Name */}
        <View style={styles.formGroup}>
          <Text style={styles.label}>Product Name *</Text>
          <TextInput
            style={[styles.input, errors.name && styles.inputError]}
            placeholder="Enter product name"
            value={formData.name}
            onChangeText={(text) => handleInputChange('name', text)}
          />
          {errors.name && <Text style={styles.errorText}>{errors.name}</Text>}
        </View>

        {/* Product Description */}
        <View style={styles.formGroup}>
          <Text style={styles.label}>Description *</Text>
          <TextInput
            style={[styles.input, styles.textArea, errors.description && styles.inputError]}
            placeholder="Enter product description"
            value={formData.description}
            onChangeText={(text) => handleInputChange('description', text)}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
          />
          {errors.description && <Text style={styles.errorText}>{errors.description}</Text>}
        </View>

        {/* Price and Discount Price */}
        <View style={styles.rowContainer}>
          <View style={[styles.formGroup, { flex: 1, marginRight: theme.spacing.sm }]}>
            <Text style={styles.label}>Price (₹) *</Text>
            <TextInput
              style={[styles.input, errors.price && styles.inputError]}
              placeholder="0.00"
              value={formData.price ? formData.price.toString() : ''}
              onChangeText={(text) => {
                const numValue = text ? parseFloat(text) : 0;
                handleInputChange('price', numValue);
              }}
              keyboardType="numeric"
            />
            {errors.price && <Text style={styles.errorText}>{errors.price}</Text>}
          </View>

          <View style={[styles.formGroup, { flex: 1 }]}>
            <Text style={styles.label}>Discount Price (₹)</Text>
            <TextInput
              style={[styles.input, errors.discountPrice && styles.inputError]}
              placeholder="0.00"
              value={formData.discountPrice ? formData.discountPrice.toString() : ''}
              onChangeText={(text) => {
                const numValue = text ? parseFloat(text) : undefined;
                handleInputChange('discountPrice', numValue);
              }}
              keyboardType="numeric"
            />
            {errors.discountPrice && <Text style={styles.errorText}>{errors.discountPrice}</Text>}
          </View>
        </View>

        {/* Category and Stock */}
        <View style={styles.rowContainer}>
          <View style={[styles.formGroup, { flex: 1, marginRight: theme.spacing.sm }]}>
            <Text style={styles.label}>Category *</Text>
            <TouchableOpacity
              style={[styles.input, styles.pickerButton, errors.category && styles.inputError]}
              onPress={() => {
                Alert.alert(
                  'Select Category',
                  'Choose a category for your product',
                  CATEGORIES.map((category) => ({
                    text: category,
                    onPress: () => handleInputChange('category', category),
                  }))
                );
              }}
            >
              <Text 
                style={[
                  formData.category ? styles.pickerButtonText : styles.pickerPlaceholder
                ]}
              >
                {formData.category || 'Select Category'}
              </Text>
              <Ionicons name="chevron-down" size={20} color={theme.colors.gray} />
            </TouchableOpacity>
            {errors.category && <Text style={styles.errorText}>{errors.category}</Text>}
          </View>

          <View style={[styles.formGroup, { flex: 1 }]}>
            <Text style={styles.label}>Stock *</Text>
            <TextInput
              style={[styles.input, errors.stock && styles.inputError]}
              placeholder="0"
              value={formData.stock ? formData.stock.toString() : ''}
              onChangeText={(text) => {
                const numValue = text ? parseInt(text, 10) : 0;
                handleInputChange('stock', numValue);
              }}
              keyboardType="numeric"
            />
            {errors.stock && <Text style={styles.errorText}>{errors.stock}</Text>}
          </View>
        </View>

        {/* Product Images */}
        <View style={styles.formGroup}>
          <Text style={styles.label}>Product Images *</Text>
          <View style={styles.imagesContainer}>
            {/* Image Previews */}
            {formData.images.map((image, index) => (
              <View key={index} style={styles.imagePreviewContainer}>
                <Image source={{ uri: image }} style={styles.imagePreview} />
                <TouchableOpacity
                  style={styles.removeImageButton}
                  onPress={() => handleRemoveImage(index)}
                >
                  <Ionicons name="close-circle" size={24} color={theme.colors.error} />
                </TouchableOpacity>
              </View>
            ))}

            {/* Add Image Button */}
            <TouchableOpacity
              style={styles.addImageButton}
              onPress={handleImagePick}
              disabled={uploading}
            >
              {uploading ? (
                <ActivityIndicator size="small" color={theme.colors.primary} />
              ) : (
                <>
                  <Ionicons name="add" size={24} color={theme.colors.primary} />
                  <Text style={styles.addImageText}>Add Image</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
          {errors.images && <Text style={styles.errorText}>{errors.images}</Text>}
        </View>

        {/* Submit Button */}
        <TouchableOpacity
          style={styles.submitButton}
          onPress={handleAddProduct}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator size="small" color={theme.colors.white} />
          ) : (
            <Text style={styles.submitButtonText}>Add Product</Text>
          )}
        </TouchableOpacity>
      </View>
    </KeyboardAwareScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  contentContainer: {
    paddingBottom: theme.spacing.xl,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.lightGray,
    backgroundColor: theme.colors.white,
  },
  backButton: {
    padding: theme.spacing.sm,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: theme.colors.dark,
  },
  spacer: {
    width: 40, // Same width as back button for centering
  },
  formContainer: {
    padding: theme.spacing.md,
  },
  formGroup: {
    marginBottom: theme.spacing.md,
  },
  label: {
    fontSize: 16,
    fontWeight: '500',
    color: theme.colors.dark,
    marginBottom: theme.spacing.xs,
  },
  input: {
    backgroundColor: theme.colors.white,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.medium,
    padding: theme.spacing.sm,
    fontSize: 16,
    color: theme.colors.dark,
  },
  inputError: {
    borderColor: theme.colors.error,
  },
  textArea: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  rowContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  pickerButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  pickerButtonText: {
    fontSize: 16,
    color: theme.colors.dark,
  },
  pickerPlaceholder: {
    fontSize: 16,
    color: theme.colors.gray,
  },
  errorText: {
    color: theme.colors.error,
    fontSize: 14,
    marginTop: 4,
  },
  imagesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: theme.spacing.xs,
  },
  imagePreviewContainer: {
    position: 'relative',
    width: 100,
    height: 100,
    margin: theme.spacing.xs,
    borderRadius: theme.borderRadius.medium,
    overflow: 'hidden',
  },
  imagePreview: {
    width: '100%',
    height: '100%',
    borderRadius: theme.borderRadius.medium,
  },
  removeImageButton: {
    position: 'absolute',
    top: 5,
    right: 5,
    backgroundColor: theme.colors.white,
    borderRadius: 12,
    ...theme.shadow.small,
  },
  addImageButton: {
    width: 100,
    height: 100,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.colors.white,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: theme.colors.primary,
    borderRadius: theme.borderRadius.medium,
    margin: theme.spacing.xs,
  },
  addImageText: {
    marginTop: theme.spacing.xs,
    fontSize: 14,
    color: theme.colors.primary,
  },
  submitButton: {
    backgroundColor: theme.colors.primary,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.medium,
    alignItems: 'center',
    marginTop: theme.spacing.lg,
    ...theme.shadow.small,
  },
  submitButtonText: {
    color: theme.colors.white,
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default VendorAddProductScreen; 
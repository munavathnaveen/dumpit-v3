import React, { useState, useEffect } from 'react';
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
  FlatList,
  Modal,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';

import { theme } from '../../theme';
import { MainStackNavigationProp } from '../../navigation/types';
import { createProduct, uploadProductImage, ProductFormData } from '../../api/productApi';
import ScreenHeader from '../../components/ScreenHeader';
import alert from '../../utils/alert';
import Card3D from '../../components/Card3D';

// Categories and product types from the provided JSON
interface ProductCategoriesMap {
  [key: string]: string[];
}

const PRODUCT_CATEGORIES: ProductCategoriesMap = {
  "Construction Materials": [
    "Cement",
    "Steel",
    "Sand",
    "Aggregate"
  ],
  "Interior Products": [
    "Plywood",
    "Laminates",
    "Hardware",
    "Edge Beeding",
    "Adhesive"
  ],
  "Plumbing & Bathware": [
    "Upvc Pipes",
    "HDPE Pipes",
    "PVC Pipes",
    "Fixtures"
  ],
  "Electrical": [
    "Wires",
    "Lights",
    "Switches & Boards"
  ],
  "Paints": [
    "Putty",
    "Primers",
    "Internal Paints",
    "External Paints",
    "Enamel Paints"
  ],
  "Tiles & Granites": [
    "Floor Tiles",
    "Bath room Dadoo",
    "Bath room Flooring",
    "Adhesives",
    "Granite",
    "Marbles"
  ],
  "Man Power supply": [
    "Carpenters",
    "Painters",
    "Electrician",
    "Plumbers",
    "Masons",
    "Labour",
    "Tile labour"
  ],
  "Machinery & Equipments": [
    "Machinery",
    "Equipments"
  ],
  "Other": ["Other"]
};

// Flattened categories array for display
const CATEGORIES = Object.keys(PRODUCT_CATEGORIES);

const VendorAddProductScreen: React.FC = () => {
  const navigation = useNavigation<MainStackNavigationProp<'VendorAddProduct'>>();
  
  const [formData, setFormData] = useState<ProductFormData>({
    name: '',
    description: '',
    price: 0,
    type: '',
    category: '',
    units: '',
    stock: 0,
    discount: 0,
    image: '',
    isActive: true,
  });

  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [uploading, setUploading] = useState(false);
  
  // State for dropdown functionality
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [showTypeModal, setShowTypeModal] = useState(false);
  const [productTypes, setProductTypes] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  // Effect to update product types when category changes
  useEffect(() => {
    if (formData.category && PRODUCT_CATEGORIES[formData.category]) {
      setProductTypes(PRODUCT_CATEGORIES[formData.category]);
    } else {
      setProductTypes([]);
    }
  }, [formData.category]);

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Product name is required';
    }

    if (!formData.description.trim()) {
      newErrors.description = 'Description is required';
    }

    if (!formData.type || formData.type.trim() === '') {
      newErrors.type = 'Product type is required';
    }

    if (!formData.category || formData.category.trim() === '') {
      newErrors.category = 'Product category is required';
    }

    if (!formData.price || formData.price <= 0) {
      newErrors.price = 'Price must be greater than 0';
    }

    if (!formData.units || formData.units.trim() === '') {
      newErrors.units = 'Units are required';
    }

    if (formData.stock === undefined || formData.stock < 0) {
      newErrors.stock = 'Stock quantity cannot be negative';
    }

    if (formData.discount !== undefined && (formData.discount < 0 || formData.discount > 100)) {
      newErrors.discount = 'Discount must be between 0 and 100%';
    }

    // Images are now optional
    // if (formData.images.length === 0) {
    //   newErrors.images = 'Please add at least one image';
    // }

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

  const handleImageChange = (url: string) => {
    setFormData({
      ...formData,
      image: url,
    });

    // Clear any image error
    if (errors.image) {
      const newErrors = { ...errors };
      delete newErrors.image;
      setErrors(newErrors);
    }
  };

  const handleRemoveImage = () => {
    setFormData({
      ...formData,
      image: '',
    });
  };

  const handleAddProduct = async () => {
    if (!validateForm()) {
      alert('Validation Error', 'Please fix the errors in the form.');
      return;
    }

    setLoading(true);
    try {
      // Create product data object matching backend requirements
      const productData: ProductFormData = {
        name: formData.name,
        description: formData.description,
        type: formData.type,
        category: formData.category,
        price: formData.price,
        units: formData.units,
        stock: formData.stock,
        discount: formData.discount,
        // We'll specifically pass the image URL to make sure it reaches the backend
        image: formData.image || undefined,
        isActive: formData.isActive
      };

      const response = await createProduct(productData);
      
      if (response.success) {
        // If the product has an image URL and was created successfully, ensure the image is properly set
        if (formData.image && formData.image.trim() !== '') {
          await uploadProductImage(response.data._id, formData.image);
        }
        
        alert(
          'Success',
          'Product added successfully!',
          [
            {
              text: 'OK',
              onPress: () => navigation.navigate('VendorProducts'),
            },
          ]
        );
      } else {
        alert('Error', 'Failed to add product. Please try again.');
      }
    } catch (error) {
      console.error('Failed to add product:', error);
      alert('Error', 'Failed to add product. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Filter function for search
  const getFilteredOptions = (options: string[], query: string) => {
    if (!query) return options;
    return options.filter(option => 
      option.toLowerCase().includes(query.toLowerCase())
    );
  };

  // Modal component for dropdown selection
  const SelectionModal = ({ 
    visible, 
    onClose, 
    title, 
    options, 
    onSelect, 
    searchValue,
    onSearchChange
  }: {
    visible: boolean;
    onClose: () => void;
    title: string;
    options: string[];
    onSelect: (option: string) => void;
    searchValue: string;
    onSearchChange: (value: string) => void;
  }) => (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{title}</Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={24} color="#333" />
            </TouchableOpacity>
          </View>
          
          <TextInput
            style={styles.searchInput}
            placeholder="Search..."
            value={searchValue}
            onChangeText={onSearchChange}
            autoFocus
          />
          
          <FlatList
            data={getFilteredOptions(options, searchValue)}
            keyExtractor={(item) => item}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.optionItem}
                onPress={() => {
                  onSelect(item);
                  onClose();
                }}
              >
                <Text style={styles.optionText}>{item}</Text>
              </TouchableOpacity>
            )}
            ItemSeparatorComponent={() => <View style={styles.optionSeparator} />}
            style={styles.optionsList}
          />
        </View>
      </View>
    </Modal>
  );

  if (loading) {
    return (
      <View style={styles.container}>
        <ScreenHeader title="Add Product" showBackButton={true} />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={styles.loadingText}>Creating your product...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScreenHeader title="Add New Product" showBackButton={true} />
      
      <KeyboardAwareScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.contentContainer}
        keyboardShouldPersistTaps="handled"
      >
        <Card3D>
          <Text style={styles.formTitle}>Product Information</Text>
          
          {/* Product Name */}
          <View style={styles.formGroup}>
            <Text style={styles.label}>Product Name*</Text>
            <TextInput
              style={styles.input}
              value={formData.name}
              onChangeText={(text) => handleInputChange('name', text)}
              placeholder="Enter product name"
              placeholderTextColor={theme.colors.gray}
            />
            {errors.name && <Text style={styles.errorText}>{errors.name}</Text>}
          </View>

          {/* Product Description */}
          <View style={styles.formGroup}>
            <Text style={styles.label}>Description*</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={formData.description}
              onChangeText={(text) => handleInputChange('description', text)}
              placeholder="Enter product description"
              placeholderTextColor={theme.colors.gray}
              multiline
              numberOfLines={4}
            />
            {errors.description && <Text style={styles.errorText}>{errors.description}</Text>}
          </View>

          {/* Product Type */}
          <View style={styles.formGroup}>
            <Text style={styles.label}>Product Type*</Text>
            <TouchableOpacity
              style={styles.dropdownInput}
              onPress={() => {
                if (formData.category) {
                  setSearchQuery('');
                  setShowTypeModal(true);
                } else {
                  alert('Select Category', 'Please select a category first to view available product types.');
                }
              }}
              disabled={!formData.category}
            >
              <Text style={formData.type ? styles.dropdownText : styles.dropdownPlaceholder}>
                {formData.type || "Select product type"}
              </Text>
              <Ionicons name="chevron-down" size={20} color={theme.colors.gray} />
            </TouchableOpacity>
            {errors.type && <Text style={styles.errorText}>{errors.type}</Text>}
          </View>

          {/* Product Category */}
          <View style={styles.formGroup}>
            <Text style={styles.label}>Category*</Text>
            <TouchableOpacity
              style={styles.dropdownInput}
              onPress={() => {
                setSearchQuery('');
                setShowCategoryModal(true);
              }}
            >
              <Text style={formData.category ? styles.dropdownText : styles.dropdownPlaceholder}>
                {formData.category || "Select product category"}
              </Text>
              <Ionicons name="chevron-down" size={20} color={theme.colors.gray} />
            </TouchableOpacity>
            {errors.category && <Text style={styles.errorText}>{errors.category}</Text>}
          </View>

          {/* Price/Rate */}
          <View style={styles.formGroup}>
            <Text style={styles.label}>Price (₹)*</Text>
            <TextInput
              style={styles.input}
              value={formData.price?.toString() || ''}
              onChangeText={(text) => handleInputChange('price', parseFloat(text) || 0)}
              placeholder="Enter product price"
              placeholderTextColor={theme.colors.gray}
              keyboardType="decimal-pad"
            />
            {errors.price && <Text style={styles.errorText}>{errors.price}</Text>}
          </View>

          {/* Units */}
          <View style={styles.formGroup}>
            <Text style={styles.label}>Units*</Text>
            <TextInput
              style={styles.input}
              value={formData.units}
              onChangeText={(text) => handleInputChange('units', text)}
              placeholder="Enter units (e.g., kg, piece, dozen)"
              placeholderTextColor={theme.colors.gray}
            />
            {errors.units && <Text style={styles.errorText}>{errors.units}</Text>}
          </View>

          {/* Stock Quantity */}
          <View style={styles.formGroup}>
            <Text style={styles.label}>Stock Quantity*</Text>
            <TextInput
              style={styles.input}
              value={formData.stock?.toString() || ''}
              onChangeText={(text) => handleInputChange('stock', parseInt(text) || 0)}
              placeholder="Enter available stock"
              placeholderTextColor={theme.colors.gray}
              keyboardType="number-pad"
            />
            {errors.stock && <Text style={styles.errorText}>{errors.stock}</Text>}
          </View>

          {/* Discount */}
          <View style={styles.formGroup}>
            <Text style={styles.label}>Discount (%)</Text>
            <TextInput
              style={styles.input}
              value={formData.discount?.toString() || ''}
              onChangeText={(text) => handleInputChange('discount', parseFloat(text) || 0)}
              placeholder="Enter discount percentage"
              placeholderTextColor={theme.colors.gray}
              keyboardType="decimal-pad"
            />
            {errors.discount && <Text style={styles.errorText}>{errors.discount}</Text>}
          </View>

          {/* Product Image */}
          <View style={styles.formGroup}>
            <Text style={styles.label}>Product Image (Optional)</Text>
            <View style={styles.formGroup}>
              <Text style={styles.label}>Image URL</Text>
              <TextInput
                style={styles.input}
                value={formData.image}
                onChangeText={(text) => handleImageChange(text)}
                placeholder="Enter image URL (optional)"
                placeholderTextColor={theme.colors.gray}
              />
              {errors.image && <Text style={styles.errorText}>{errors.image}</Text>}
              
              <Text style={styles.helperText}>
                If not provided, a similar product type image will be used if available.
              </Text>
            </View>
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
        </Card3D>
      </KeyboardAwareScrollView>

      {/* Category Selection Modal */}
      <SelectionModal
        visible={showCategoryModal}
        onClose={() => setShowCategoryModal(false)}
        title="Select Category"
        options={CATEGORIES}
        onSelect={(category) => {
          handleInputChange('category', category);
          handleInputChange('type', ''); // Reset type when category changes
        }}
        searchValue={searchQuery}
        onSearchChange={setSearchQuery}
      />

      {/* Product Type Selection Modal */}
      <SelectionModal
        visible={showTypeModal}
        onClose={() => setShowTypeModal(false)}
        title="Select Product Type"
        options={productTypes}
        onSelect={(type) => handleInputChange('type', type)}
        searchValue={searchQuery}
        onSearchChange={setSearchQuery}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
    paddingTop: Platform.OS === 'android' ? 25 : 0,
  },
  scrollView: {
    flex: 1,
    paddingHorizontal: theme.spacing.md,
    paddingTop: theme.spacing.sm,
  },
  contentContainer: {
    paddingBottom: Platform.OS === 'ios' ? 120 : 140,
  },
  formTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: theme.colors.dark,
    marginBottom: theme.spacing.md,
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
  textArea: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  errorText: {
    color: theme.colors.error,
    fontSize: 14,
    marginTop: 4,
  },
  categoryContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  categoryButton: {
    padding: theme.spacing.xs,
    margin: theme.spacing.xs,
    backgroundColor: theme.colors.white,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.medium,
  },
  categoryButtonSelected: {
    backgroundColor: theme.colors.primary,
  },
  categoryButtonText: {
    fontSize: 16,
    color: theme.colors.dark,
  },
  categoryButtonTextSelected: {
    color: theme.colors.white,
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
    ...theme.shadow.small,
  },
  submitButtonText: {
    color: theme.colors.white,
    fontSize: 16,
    fontWeight: 'bold',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: theme.spacing.md,
    fontSize: 16,
    fontWeight: 'bold',
    color: theme.colors.dark,
  },
  imageSection: {
    alignItems: 'center',
    marginVertical: theme.spacing.md,
  },
  placeholderContainer: {
    width: 150,
    height: 150,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.colors.lightGray,
    borderRadius: theme.borderRadius.medium,
    marginBottom: theme.spacing.sm,
  },
  placeholderText: {
    marginTop: theme.spacing.xs,
    fontSize: 14,
    color: theme.colors.gray,
  },
  helperText: {
    marginTop: theme.spacing.xs,
    fontSize: 12,
    color: theme.colors.gray,
    fontStyle: 'italic',
  },
  dropdownInput: {
    backgroundColor: theme.colors.white,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.medium,
    padding: theme.spacing.sm,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    height: 50,
  },
  dropdownText: {
    fontSize: 16,
    color: theme.colors.dark,
  },
  dropdownPlaceholder: {
    fontSize: 16,
    color: theme.colors.gray,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: 'white',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: theme.colors.dark,
  },
  searchInput: {
    backgroundColor: '#f0f0f0',
    borderRadius: 10,
    padding: 10,
    marginBottom: 15,
  },
  optionsList: {
    maxHeight: 300,
  },
  optionItem: {
    paddingVertical: 12,
  },
  optionText: {
    fontSize: 16,
    color: theme.colors.dark,
  },
  optionSeparator: {
    height: 1,
    backgroundColor: '#eee',
  },
});

export default VendorAddProductScreen; 
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Image,
  ActivityIndicator,
  TextInput,
  RefreshControl
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useFocusEffect } from '@react-navigation/core';
import { Ionicons } from '@expo/vector-icons';
import { useSelector } from 'react-redux';

import Card3D from '../../components/Card3D';
import ScreenHeader from '../../components/ScreenHeader';
import { theme } from '../../theme';
import { MainStackNavigationProp } from '../../navigation/types';
import { RootState } from '../../store';
import { getVendorProducts, deleteProduct } from '../../api/productApi';
import alert from '../../utils/alert';

interface Product {
  _id: string;
  name: string;
  price: number;
  discountPrice?: number;
  stock: number;
  images: string[];
  category: string;
  description: string;
  isActive: boolean;
  type: string;
  units: string;
}

const VendorProductsScreen: React.FC = () => {
  const navigation = useNavigation<MainStackNavigationProp<'VendorProducts'>>();
  const { user } = useSelector((state: RootState) => state.auth);
  
  const [products, setProducts] = useState<Product[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [error, setError] = useState<string | null>(null);

  const loadProducts = useCallback(async () => {
    try {
      setError(null);
      const data = await getVendorProducts();
      
      // Map the API response to match our Product interface
      const formattedProducts: Product[] = data.map((item: any) => ({
        _id: item._id,
        name: item.name,
        price: item.price,
        discountPrice: undefined,
        stock: item.stock,
        images: item.images || [],
        category: item.category,
        description: item.description,
        isActive: item.isActive || false,
        type: item.type || '',
        units: item.units || ''
      }));
      
      setProducts(formattedProducts);
      setFilteredProducts(formattedProducts);
    } catch (error) {
      console.error('Failed to load products:', error);
      setError('Failed to load products');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadProducts();
  }, [loadProducts]);

  useFocusEffect(
    useCallback(() => {
      loadProducts();
    }, [loadProducts])
  );

  const handleRefresh = () => {
    setRefreshing(true);
    loadProducts();
  };

  const handleSearch = (text: string) => {
    setSearchQuery(text);
    if (text.trim() === '') {
      setFilteredProducts(products);
    } else {
      const filtered = products.filter(
        product => 
          product.name.toLowerCase().includes(text.toLowerCase()) ||
          product.category.toLowerCase().includes(text.toLowerCase()) ||
          product.description.toLowerCase().includes(text.toLowerCase())
      );
      setFilteredProducts(filtered);
    }
  };

  const handleDeleteProduct = (productId: string, productName: string) => {
    alert(
      'Delete Product',
      `Are you sure you want to delete "${productName}"?`,
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              setLoading(true);
              const response = await deleteProduct(productId);
              
              if (response.success) {
                // Remove the product from the local state immediately for a faster UI update
                const updatedProducts = products.filter(p => p._id !== productId);
                setProducts(updatedProducts);
                setFilteredProducts(updatedProducts);
                
                alert('Success', 'Product deleted successfully');
              } else {
                alert('Error', 'Failed to delete product. Please try again.');
              }
            } catch (error) {
              console.error('Failed to delete product:', error);
              alert('Error', 'Failed to delete product. Please check your connection and try again.');
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
  };

  const handleNotificationPress = () => {
    navigation.navigate('Notifications');
  };

  const renderProductItem = ({ item }: { item: Product }) => (
    <Card3D style={styles.productCard} elevation="small">
      <View style={styles.productContent}>
        <Image 
          source={{ uri: item.images[0] || 'https://via.placeholder.com/150' }} 
          style={styles.productImage} 
        />
        <View style={styles.productDetails}>
          <Text style={styles.productName} numberOfLines={1}>{item.name}</Text>
          <View style={styles.productPriceContainer}>
            <Text style={styles.productPrice}>₹{item.price.toFixed(2)}</Text>
            {item.discountPrice && (
              <Text style={styles.productDiscountPrice}>₹{item.discountPrice.toFixed(2)}</Text>
            )}
          </View>
          <View style={styles.productStatusContainer}>
            <View style={[
              styles.stockIndicator, 
              { backgroundColor: item.stock > 0 ? theme.colors.success : theme.colors.error }
            ]} />
            <Text style={styles.stockText}>
              {item.stock > 0 ? `In Stock (${item.stock})` : 'Out of Stock'}
            </Text>
          </View>
          <Text style={styles.productCategory}>{item.category}</Text>
        </View>
      </View>
      
      <View style={styles.actionButtons}>
        <TouchableOpacity 
          style={[styles.actionButton, styles.editButton]} 
          onPress={() => navigation.navigate('VendorEditProduct', { productId: item._id })}
        >
          <Ionicons name="create-outline" size={18} color={theme.colors.dark} />
          <Text style={styles.actionButtonText}>Edit</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.actionButton, styles.deleteButton]} 
          onPress={() => handleDeleteProduct(item._id, item.name)}
        >
          <Ionicons name="trash-outline" size={18} color={theme.colors.white} />
          <Text style={[styles.actionButtonText, { color: theme.colors.white }]}>Delete</Text>
        </TouchableOpacity>
      </View>
    </Card3D>
  );

  if (loading && !refreshing) {
    return (
      <View style={styles.container}>
        <ScreenHeader title="Products" showBackButton={true} />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScreenHeader 
        title="My Products" 
        showBackButton={true}
        onNotificationPress={handleNotificationPress} 
      />
      <View style={styles.searchContainer}>
        <View style={styles.searchInputContainer}>
          <Ionicons name="search" size={20} color={theme.colors.gray} style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search products..."
            value={searchQuery}
            onChangeText={handleSearch}
            placeholderTextColor={theme.colors.gray}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => handleSearch('')}>
              <Ionicons name="close-circle" size={20} color={theme.colors.gray} />
            </TouchableOpacity>
          )}
        </View>
      </View>
      
      {error ? (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity 
            style={styles.retryButton}
            onPress={loadProducts}
          >
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : filteredProducts.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="cube-outline" size={80} color={theme.colors.primary} style={styles.emptyIcon} />
          <Text style={styles.emptyTextMain}>No products found</Text>
          <Text style={styles.emptyTextSub}>
            {searchQuery ? `No results for "${searchQuery}"` : "You haven't added any products yet."}
          </Text>
          {!searchQuery && (
            <TouchableOpacity 
              style={styles.addProductButton}
              onPress={() => navigation.navigate('VendorAddProduct')}
            >
              <Text style={styles.addProductButtonText}>Add Product</Text>
            </TouchableOpacity>
          )}
        </View>
      ) : (
        <FlatList
          data={filteredProducts}
          renderItem={renderProductItem}
          keyExtractor={(item) => item._id}
          contentContainerStyle={styles.productsList}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              colors={[theme.colors.primary]}
            />
          }
        />
      )}

      <TouchableOpacity 
        style={styles.floatingButton}
        onPress={() => navigation.navigate('VendorAddProduct')}
      >
        <Ionicons name="add" size={24} color={theme.colors.white} />
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
    padding: theme.spacing.md,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: theme.colors.dark,
  },
  addButton: {
    backgroundColor: theme.colors.primary,
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    ...theme.shadow.small,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.white,
    borderRadius: theme.borderRadius.medium,
    paddingHorizontal: theme.spacing.sm,
    marginBottom: theme.spacing.md,
    ...theme.shadow.small,
  },
  searchIcon: {
    marginRight: theme.spacing.xs,
  },
  searchInput: {
    flex: 1,
    paddingVertical: theme.spacing.sm,
    fontSize: 16,
    color: theme.colors.dark,
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
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: theme.spacing.xl,
  },
  emptyIcon: {
    marginBottom: theme.spacing.md,
    opacity: 0.7,
  },
  emptyTextMain: {
    fontSize: 18,
    fontWeight: 'bold',
    color: theme.colors.dark,
    marginBottom: theme.spacing.sm,
  },
  emptyTextSub: {
    fontSize: 16,
    color: theme.colors.gray,
    textAlign: 'center',
    marginBottom: theme.spacing.lg,
  },
  addProductButton: {
    backgroundColor: theme.colors.primary,
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.lg,
    borderRadius: theme.borderRadius.medium,
  },
  addProductButtonText: {
    color: theme.colors.white,
    fontWeight: 'bold',
    fontSize: 16,
  },
  productsList: {
    paddingBottom: theme.spacing.lg,
  },
  productCard: {
    marginBottom: theme.spacing.md,
    backgroundColor: theme.colors.white,
  },
  productContent: {
    flexDirection: 'row',
    padding: theme.spacing.md,
  },
  productImage: {
    width: 80,
    height: 80,
    borderRadius: theme.borderRadius.medium,
    marginRight: theme.spacing.md,
  },
  productDetails: {
    flex: 1,
    justifyContent: 'space-between',
  },
  productName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: theme.colors.dark,
    marginBottom: theme.spacing.xs,
  },
  productPriceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.xs,
  },
  productPrice: {
    fontSize: 16,
    fontWeight: 'bold',
    color: theme.colors.primary,
    marginRight: theme.spacing.sm,
  },
  productDiscountPrice: {
    fontSize: 14,
    color: theme.colors.gray,
    textDecorationLine: 'line-through',
  },
  productStatusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.xs,
  },
  stockIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: theme.spacing.xs,
  },
  stockText: {
    fontSize: 14,
    color: theme.colors.gray,
  },
  productCategory: {
    fontSize: 14,
    color: theme.colors.gray,
    backgroundColor: theme.colors.secondary,
    alignSelf: 'flex-start',
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 2,
    borderRadius: theme.borderRadius.small,
  },
  actionButtons: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: theme.colors.lightGray,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    padding: theme.spacing.sm,
  },
  editButton: {
    borderRightWidth: 1,
    borderRightColor: theme.colors.lightGray,
  },
  deleteButton: {
    backgroundColor: theme.colors.error,
  },
  actionButtonText: {
    marginLeft: theme.spacing.xs,
    fontWeight: '500',
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.white,
    borderRadius: theme.borderRadius.medium,
    paddingHorizontal: theme.spacing.sm,
    marginBottom: theme.spacing.md,
    ...theme.shadow.small,
  },
  floatingButton: {
    position: 'absolute',
    bottom: theme.spacing.lg,
    right: theme.spacing.lg,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: theme.colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    ...theme.shadow.medium,
  },
});

export default VendorProductsScreen; 
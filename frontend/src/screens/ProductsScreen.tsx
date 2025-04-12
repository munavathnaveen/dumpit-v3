import React, { useEffect, useState, useCallback } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  FlatList, 
  TouchableOpacity, 
  ActivityIndicator,
  Image,
  RefreshControl,
  Modal,
  ScrollView,
  Switch,
  SafeAreaView
} from 'react-native';
import { useSelector, useDispatch } from 'react-redux';
import { FontAwesome, Ionicons, MaterialIcons } from '@expo/vector-icons';
import Slider from '@react-native-community/slider';
import { RouteProp } from '@react-navigation/native';
import debounce from 'lodash.debounce';

import { RootState, AppDispatch } from '../store';
import { theme } from '../theme';
import { addToCart } from '../store/cartSlice';
import { Product } from '../types/product';
import Card3D from '../components/Card3D';
import SearchBar from '../components/SearchBar';
import ScreenHeader from '../components/ScreenHeader';
import { useNavigation, useTabRoute } from '../navigation/hooks';
import { BottomTabParamList } from '../navigation/types';
import * as productApi from '../api/productApi';

const sortOptions = [
  { label: 'Price: Low to High', value: 'price' },
  { label: 'Price: High to Low', value: '-price' },
  { label: 'Rating: High to Low', value: '-rating' },
  { label: 'Newest First', value: '-createdAt' },
];

const ProductsScreen: React.FC = () => {
  const navigation = useNavigation();
  const route = useTabRoute<'ProductsTab'>();
  const dispatch = useDispatch<AppDispatch>();
  const { products, loading, error } = useSelector((state: RootState) => state.product);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  
  // Filter states
  const [filterModalVisible, setFilterModalVisible] = useState(false);
  const [categories, setCategories] = useState<string[]>([]);
  const [productTypes, setProductTypes] = useState<string[]>([]);
  const [shops, setShops] = useState<{ _id: string, name: string }[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [selectedType, setSelectedType] = useState<string>('');
  const [selectedShop, setSelectedShop] = useState<string>('');
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 10000]);
  const [currentPriceRange, setCurrentPriceRange] = useState<[number, number]>([0, 10000]);
  const [sortBy, setSortBy] = useState<string>('');
  const [inStock, setInStock] = useState<boolean>(false);
  const [loadingCategories, setLoadingCategories] = useState(false);
  const [loadingTypes, setLoadingTypes] = useState(false);
  const [loadingShops, setLoadingShops] = useState(false);
  const [shopId, setShopId] = useState<string | undefined>(route.params?.shopId);

  // Create a debounced search function that directly triggers the product search
  const debouncedSearch = useCallback(
    debounce((text: string) => {
      setSearchQuery(text);
      // Don't need to explicitly call loadProducts here as the useEffect will handle it
    }, 500), // 500ms delay
    []
  );

  // Handle search text changes
  const handleSearch = (text: string) => {
    setSearchQuery(text); // Update immediately for UI feedback
    debouncedSearch(text); // Debounce the actual search
  };

  useEffect(() => {
    // Log navigation params for debugging
    console.log("Route params:", route.params);
    
    loadProducts();
    fetchCategories();
    fetchProductTypes();
    fetchShops();
  }, []);

  useEffect(() => {
    // Update parameters when they change in the route
    if (route.params) {
      if (route.params.shopId) {
        setShopId(route.params.shopId);
        setSelectedShop(route.params.shopId);
      } else {
        setShopId(undefined);
        setSelectedShop('');
      }
      
      if (route.params.searchQuery) {
        setSearchQuery(route.params.searchQuery);
      }
      
      if (route.params.category) {
        setSelectedCategory(route.params.category);
      }
    }
  }, [route.params]);

  useEffect(() => {
    loadProducts();
  }, [searchQuery, selectedCategory, selectedType, selectedShop, priceRange, sortBy, inStock, shopId]);

  const fetchCategories = async () => {
    try {
      setLoadingCategories(true);
      const response = await productApi.getProductCategories();
      setCategories(response.data);
    } catch (error) {
      console.error('Failed to fetch categories:', error);
    } finally {
      setLoadingCategories(false);
    }
  };

  const fetchProductTypes = async () => {
    try {
      setLoadingTypes(true);
      const response = await productApi.getProductTypes();
      setProductTypes(response.data);
    } catch (error) {
      console.error('Failed to fetch product types:', error);
    } finally {
      setLoadingTypes(false);
    }
  };

  const fetchShops = async () => {
    try {
      setLoadingShops(true);
      const response = await productApi.getShops();
      setShops(response.data);
    } catch (error) {
      console.error('Failed to fetch shops:', error);
    } finally {
      setLoadingShops(false);
    }
  };

  const loadProducts = async () => {
    try {
      // If search query is provided, use the dedicated search endpoint
      if (searchQuery && searchQuery.trim() !== '') {
        const response = await productApi.searchProducts(searchQuery);
        setFilteredProducts(response.data);
        return;
      }
      
      // Otherwise, build query params based on filters
      const queryParams: Record<string, string> = {};
      
      if (selectedCategory) queryParams.category = selectedCategory;
      if (selectedType) queryParams.type = selectedType;
      if (selectedShop) queryParams.shop = selectedShop;
      if (sortBy) queryParams.sort = sortBy;
      if (priceRange[0] > 0) queryParams.minPrice = priceRange[0].toString();
      if (priceRange[1] < 10000) queryParams.maxPrice = priceRange[1].toString();
      if (inStock) queryParams.stock = 'gt:0';
      
      // Add shopId filter if present
      if (shopId) queryParams.shop = shopId;
      
      // Add pagination params
      queryParams.page = '1';
      queryParams.limit = '20';
      
      // Convert to query string
      const queryString = Object.entries(queryParams)
        .map(([key, value]) => `${key}=${encodeURIComponent(value)}`)
        .join('&');
      
      const response = await productApi.getProducts(queryString);
      setFilteredProducts(response.data);
    } catch (error) {
      console.error('Failed to load products:', error);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadProducts();
    setRefreshing(false);
  };


  const handleNotificationPress = () => {
    navigation.navigate('Notifications');
  };

  const handleAddToCart = (productId: string, quantity: number) => {
    dispatch(addToCart({ productId, quantity }));
  };

  const handleFilterPress = () => {
    setFilterModalVisible(true);
    setCurrentPriceRange(priceRange);
  };

  const applyFilters = () => {
    setPriceRange(currentPriceRange);
    setFilterModalVisible(false);
    loadProducts();
  };

  const resetFilters = () => {
    setSelectedCategory('');
    setSelectedType('');
    setSelectedShop('');
    setPriceRange([0, 10000]);
    setCurrentPriceRange([0, 10000]);
    setSortBy('');
    setInStock(false);
    loadProducts();
  };

  const renderProductItem = ({ item }: { item: Product }) => (
    <Card3D style={styles.productCard}>
      <TouchableOpacity 
        onPress={() => navigation.navigate('ProductDetails', { productId: item._id })}
        activeOpacity={0.9}
      >
        <Image 
          source={{ uri: item.image || 'https://via.placeholder.com/150' }} 
          style={styles.productImage} 
        />
      </TouchableOpacity>
      <View style={styles.productInfo}>
        <Text style={styles.productName}>{item.name}</Text>
        
        {/* Shop name and info */}
        {item.shop && !shopId && (
          <TouchableOpacity 
            style={styles.shopInfoContainer}
            onPress={() => navigation.navigate('ShopDetails', { shopId: item.shop._id })}
          >
            <Ionicons name="storefront-outline" size={14} color={theme.colors.gray} />
            <Text style={styles.shopName} numberOfLines={1}>
              {item.shop.name}
            </Text>
          </TouchableOpacity>
        )}
        
        {item.category && (
          <View style={styles.categoryChip}>
            <Text style={styles.categoryChipText}>{item.category}</Text>
          </View>
        )}
        <Text style={styles.productDescription} numberOfLines={2}>
          {item.description}
        </Text>
        <View style={styles.productBottom}>
          <Text style={styles.productPrice}>₹{item.price.toFixed(2)}</Text>
          <TouchableOpacity 
            style={styles.addButton}
            onPress={() => handleAddToCart(item._id, 1)}
          >
            <FontAwesome name="plus" size={16} color={theme.colors.white} />
          </TouchableOpacity>
        </View>
      </View>
    </Card3D>
  );

  const renderFiltersModal = () => (
    <Modal
      visible={filterModalVisible}
      transparent={true}
      animationType="slide"
      onRequestClose={() => setFilterModalVisible(false)}
    >
      <View style={styles.modalContainer}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Filter Products</Text>
            <TouchableOpacity onPress={() => setFilterModalVisible(false)}>
              <Ionicons name="close" size={24} color={theme.colors.text} />
            </TouchableOpacity>
          </View>
          
          <ScrollView showsVerticalScrollIndicator={false}>
            {/* Category Filter */}
            <View style={styles.filterSection}>
              <Text style={styles.filterSectionTitle}>Categories</Text>
              {loadingCategories ? (
                <ActivityIndicator size="small" color={theme.colors.primary} />
              ) : (
                <ScrollView 
                  horizontal 
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.categoriesContainer}
                >
                  <TouchableOpacity
                    style={[
                      styles.categoryButton,
                      selectedCategory === '' && styles.categoryButtonActive
                    ]}
                    onPress={() => setSelectedCategory('')}
                  >
                    <Text style={[
                      styles.categoryButtonText,
                      selectedCategory === '' && styles.categoryButtonTextActive
                    ]}>All</Text>
                  </TouchableOpacity>
                  
                  {categories.map((category, index) => (
                    <TouchableOpacity
                      key={index}
                      style={[
                        styles.categoryButton,
                        selectedCategory === category && styles.categoryButtonActive
                      ]}
                      onPress={() => setSelectedCategory(category)}
                    >
                      <Text style={[
                        styles.categoryButtonText,
                        selectedCategory === category && styles.categoryButtonTextActive
                      ]}>{category}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              )}
            </View>
            
            {/* Product Type Filter */}
            <View style={styles.filterSection}>
              <Text style={styles.filterSectionTitle}>Product Type</Text>
              {loadingTypes ? (
                <ActivityIndicator size="small" color={theme.colors.primary} />
              ) : (
                <ScrollView 
                  horizontal 
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.productTypesContainer}
                >
                  <TouchableOpacity
                    style={[
                      styles.productTypeButton,
                      selectedType === '' && styles.productTypeButtonActive
                    ]}
                    onPress={() => setSelectedType('')}
                  >
                    <Text style={[
                      styles.productTypeButtonText,
                      selectedType === '' && styles.productTypeButtonTextActive
                    ]}>All</Text>
                  </TouchableOpacity>
                  
                  {productTypes.map((type, index) => (
                    <TouchableOpacity
                      key={index}
                      style={[
                        styles.productTypeButton,
                        selectedType === type && styles.productTypeButtonActive
                      ]}
                      onPress={() => setSelectedType(type)}
                    >
                      <Text style={[
                        styles.productTypeButtonText,
                        selectedType === type && styles.productTypeButtonTextActive
                      ]}>{type}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              )}
            </View>
            
            {/* Shop Filter */}
            <View style={styles.filterSection}>
              <Text style={styles.filterSectionTitle}>Shop</Text>
              {loadingShops ? (
                <ActivityIndicator size="small" color={theme.colors.primary} />
              ) : (
                <ScrollView 
                  horizontal 
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.shopsContainer}
                >
                  <TouchableOpacity
                    style={[
                      styles.shopButton,
                      selectedShop === '' && styles.shopButtonActive
                    ]}
                    onPress={() => setSelectedShop('')}
                  >
                    <Text style={[
                      styles.shopButtonText,
                      selectedShop === '' && styles.shopButtonTextActive
                    ]}>All</Text>
                  </TouchableOpacity>
                  
                  {shops.map((shop, index) => (
                    <TouchableOpacity
                      key={index}
                      style={[
                        styles.shopButton,
                        selectedShop === shop._id && styles.shopButtonActive
                      ]}
                      onPress={() => setSelectedShop(shop._id)}
                    >
                      <Text style={[
                        styles.shopButtonText,
                        selectedShop === shop._id && styles.shopButtonTextActive
                      ]}>{shop.name}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              )}
            </View>
            
            {/* Price Range Filter */}
            <View style={styles.filterSection}>
              <Text style={styles.filterSectionTitle}>Price Range</Text>
              <View style={styles.priceRangeContainer}>
                <Text style={styles.priceRangeText}>₹{currentPriceRange[0]}</Text>
                <Text style={styles.priceRangeText}>₹{currentPriceRange[1]}</Text>
              </View>
              <Slider
                style={styles.slider}
                minimumValue={0}
                maximumValue={10000}
                minimumTrackTintColor={theme.colors.primary}
                maximumTrackTintColor={theme.colors.gray}
                value={currentPriceRange[0]}
                onValueChange={(value: number) => setCurrentPriceRange([value, currentPriceRange[1]])}
              />
              <Slider
                style={styles.slider}
                minimumValue={0}
                maximumValue={10000}
                minimumTrackTintColor={theme.colors.primary}
                maximumTrackTintColor={theme.colors.gray}
                value={currentPriceRange[1]}
                onValueChange={(value: number) => setCurrentPriceRange([currentPriceRange[0], value])}
              />
            </View>
            
            {/* Sort By */}
            <View style={styles.filterSection}>
              <Text style={styles.filterSectionTitle}>Sort By</Text>
              {sortOptions.map((option, index) => (
                <TouchableOpacity
                  key={index}
                  style={styles.sortOption}
                  onPress={() => setSortBy(option.value)}
                >
                  <Text style={styles.sortOptionText}>{option.label}</Text>
                  {sortBy === option.value && (
                    <Ionicons name="checkmark" size={20} color={theme.colors.primary} />
                  )}
                </TouchableOpacity>
              ))}
            </View>
            
            {/* In Stock Only */}
            <View style={styles.filterSection}>
              <View style={styles.switchContainer}>
                <Text style={styles.filterSectionTitle}>In Stock Only</Text>
                <Switch
                  value={inStock}
                  onValueChange={setInStock}
                  trackColor={{ false: theme.colors.gray, true: theme.colors.primary }}
                  thumbColor={theme.colors.white}
                />
              </View>
            </View>
            
            <View style={styles.filterActions}>
              <TouchableOpacity style={styles.resetButton} onPress={resetFilters}>
                <Text style={styles.resetButtonText}>Reset</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.applyButton} onPress={applyFilters}>
                <Text style={styles.applyButtonText}>Apply</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );

  if (loading && !refreshing && products.length === 0) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  if (error && !refreshing && products.length === 0) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={loadProducts}>
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <ScreenHeader 
          title={shopId ? 'Shop Products' : 'Products'}
          showBackButton={true}
          onNotificationPress={handleNotificationPress}
        />
        
        <View style={styles.contentContainer}>
          <View style={styles.searchFilterContainer}>
            <SearchBar 
              placeholder="Search products..."
              onSearch={handleSearch}
              value={searchQuery}
              style={styles.searchBar}
            />
            <TouchableOpacity 
              style={styles.filterButton}
              onPress={handleFilterPress}
            >
              <MaterialIcons name="filter-list" size={24} color={theme.colors.primary} />
            </TouchableOpacity>
          </View>
          
          {/* Active Filters */}
          {(selectedCategory || selectedType || selectedShop || priceRange[0] > 0 || priceRange[1] < 10000 || inStock || sortBy || shopId) && (
            <View style={styles.activeFiltersContainer}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                {selectedCategory && (
                  <View style={styles.activeFilterChip}>
                    <Text style={styles.activeFilterText}>Category: {selectedCategory}</Text>
                    <TouchableOpacity onPress={() => setSelectedCategory('')}>
                      <Ionicons name="close-circle" size={16} color={theme.colors.white} />
                    </TouchableOpacity>
                  </View>
                )}
                
                {selectedType && (
                  <View style={styles.activeFilterChip}>
                    <Text style={styles.activeFilterText}>Type: {selectedType}</Text>
                    <TouchableOpacity onPress={() => setSelectedType('')}>
                      <Ionicons name="close-circle" size={16} color={theme.colors.white} />
                    </TouchableOpacity>
                  </View>
                )}
                
                {selectedShop && (
                  <View style={styles.activeFilterChip}>
                    <Text style={styles.activeFilterText}>Shop: {shops.find(shop => shop._id === selectedShop)?.name || selectedShop}</Text>
                    <TouchableOpacity onPress={() => setSelectedShop('')}>
                      <Ionicons name="close-circle" size={16} color={theme.colors.white} />
                    </TouchableOpacity>
                  </View>
                )}
                
                {(priceRange[0] > 0 || priceRange[1] < 10000) && (
                  <View style={styles.activeFilterChip}>
                    <Text style={styles.activeFilterText}>Price: ₹{priceRange[0]} - ₹{priceRange[1]}</Text>
                    <TouchableOpacity onPress={() => setPriceRange([0, 10000])}>
                      <Ionicons name="close-circle" size={16} color={theme.colors.white} />
                    </TouchableOpacity>
                  </View>
                )}
                
                {inStock && (
                  <View style={styles.activeFilterChip}>
                    <Text style={styles.activeFilterText}>In Stock</Text>
                    <TouchableOpacity onPress={() => setInStock(false)}>
                      <Ionicons name="close-circle" size={16} color={theme.colors.white} />
                    </TouchableOpacity>
                  </View>
                )}
                
                {sortBy && (
                  <View style={styles.activeFilterChip}>
                    <Text style={styles.activeFilterText}>
                      Sort: {sortOptions.find(option => option.value === sortBy)?.label.split(': ')[1]}
                    </Text>
                    <TouchableOpacity onPress={() => setSortBy('')}>
                      <Ionicons name="close-circle" size={16} color={theme.colors.white} />
                    </TouchableOpacity>
                  </View>
                )}
              </ScrollView>
            </View>
          )}
          
          <FlatList
            data={filteredProducts}
            keyExtractor={(item) => item._id}
            renderItem={renderProductItem}
            contentContainerStyle={styles.productList}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
            }
            ListEmptyComponent={
              <Text style={styles.emptyText}>
                {searchQuery || selectedCategory || selectedType || selectedShop || priceRange[0] > 0 || priceRange[1] < 10000 || inStock || shopId
                  ? 'No products match your filters'
                  : 'No products available'}
              </Text>
            }
          />
        </View>
        
        {renderFiltersModal()}
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  contentContainer: {
    flex: 1,
    padding: theme.spacing.md,
    paddingBottom: 120,
  },
  searchFilterContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  searchBar: {
    flex: 1,
    marginRight: 8,
  },
  filterButton: {
    width: 48,
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.colors.white,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  activeFiltersContainer: {
    marginBottom: 12,
  },
  activeFilterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginRight: 8,
  },
  activeFilterText: {
    color: theme.colors.white,
    marginRight: 4,
    fontSize: 12,
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
    padding: 20,
  },
  errorText: {
    color: theme.colors.error,
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 20,
  },
  retryButton: {
    backgroundColor: theme.colors.primary,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 5,
  },
  retryButtonText: {
    color: theme.colors.white,
    fontSize: 16,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: theme.colors.text,
    marginTop: 20,
    marginBottom: 10,
  },
  emptyText: {
    fontSize: 16,
    color: theme.colors.gray,
    textAlign: 'center',
    marginBottom: 20,
  },
  resetButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    backgroundColor: theme.colors.primary,
    borderRadius: 8,
    marginTop: 10,
  },
  resetButtonText: {
    color: theme.colors.white,
    fontSize: 16,
    fontWeight: '600',
  },
  productList: {
    paddingBottom: 100,
  },
  productCard: {
    marginBottom: 16,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: theme.colors.white,
  },
  productImage: {
    width: '100%',
    height: 180,
    resizeMode: 'cover',
  },
  productInfo: {
    padding: 12,
  },
  productName: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4,
    color: theme.colors.text,
  },
  categoryChip: {
    backgroundColor: theme.colors.accent,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
    alignSelf: 'flex-start',
    marginBottom: 6,
  },
  categoryChipText: {
    color: theme.colors.white,
    fontSize: 12,
  },
  productDescription: {
    fontSize: 14,
    color: theme.colors.textLight,
    marginBottom: 8,
  },
  productBottom: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  productPrice: {
    fontSize: 18,
    fontWeight: 'bold',
    color: theme.colors.primary,
  },
  addButton: {
    backgroundColor: theme.colors.primary,
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    backgroundColor: theme.colors.white,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 16,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: theme.colors.text,
  },
  filterSection: {
    marginBottom: 24,
  },
  filterSectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: theme.colors.text,
    marginBottom: 12,
  },
  categoriesContainer: {
    paddingBottom: 8,
  },
  categoryButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: theme.colors.lightGray,
    marginRight: 8,
  },
  categoryButtonActive: {
    backgroundColor: theme.colors.primary,
  },
  categoryButtonText: {
    color: theme.colors.text,
  },
  categoryButtonTextActive: {
    color: theme.colors.white,
    fontWeight: 'bold',
  },
  productTypesContainer: {
    paddingBottom: 8,
  },
  productTypeButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: theme.colors.lightGray,
    marginRight: 8,
  },
  productTypeButtonActive: {
    backgroundColor: theme.colors.primary,
  },
  productTypeButtonText: {
    color: theme.colors.text,
  },
  productTypeButtonTextActive: {
    color: theme.colors.white,
    fontWeight: 'bold',
  },
  shopsContainer: {
    paddingBottom: 8,
  },
  shopButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: theme.colors.lightGray,
    marginRight: 8,
  },
  shopButtonActive: {
    backgroundColor: theme.colors.primary,
  },
  shopButtonText: {
    color: theme.colors.text,
  },
  shopButtonTextActive: {
    color: theme.colors.white,
    fontWeight: 'bold',
  },
  priceRangeContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  priceRangeText: {
    color: theme.colors.text,
  },
  slider: {
    width: '100%',
    height: 40,
  },
  sortOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.lightGray,
  },
  sortOptionText: {
    color: theme.colors.text,
  },
  switchContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  filterActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
    marginBottom: 32,
  },
  applyButton: {
    backgroundColor: theme.colors.primary,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  applyButtonText: {
    color: theme.colors.white,
    fontWeight: 'bold',
  },
  shopInfoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 5,
  },
  shopName: {
    fontSize: 14,
    color: theme.colors.gray,
    marginLeft: 4,
    flex: 1,
  },
  distanceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.lightGray,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
  },
  distanceText: {
    fontSize: 12,
    color: theme.colors.primary,
    marginLeft: 2,
  },
});

export default ProductsScreen; 
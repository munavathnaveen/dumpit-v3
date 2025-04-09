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
  Platform,
  Alert,
  SafeAreaView
} from 'react-native';
import { useSelector, useDispatch } from 'react-redux';
import { FontAwesome, Ionicons, MaterialIcons } from '@expo/vector-icons';
import * as Location from 'expo-location';

import { RootState, AppDispatch } from '../store';
import { theme } from '../theme';
import { getShops, getNearbyShops, ShopsResponse, getShopCategories, searchShops } from '../api/shopApi';
import Card3D from '../components/Card3D';
import SearchBar from '../components/SearchBar';
import ScreenHeader from '../components/ScreenHeader';
import { useRoute, useNavigation } from '../navigation/hooks';
import alert from '../utils/alert';

// Define a flexible address type that can handle both string and object formats
type ShopAddress = string | {
  village: string;
  district: string;
};

type Shop = {
  _id: string;
  name: string;
  description: string;
  logo: string;
  address: ShopAddress;
  rating: number;
  isOpen: boolean;
  categories: string[];
};

type ShopFilters = {
  category?: string;
  isOpen?: boolean;
  minRating?: number;
  sort?: string;
  nearby?: boolean;
}

const ShopsScreen: React.FC = () => {
  const navigation = useNavigation();
  const route = useRoute<'Shops'>();
  const dispatch = useDispatch<AppDispatch>();
  const [shops, setShops] = useState<Shop[]>([]);
  const [filteredShops, setFilteredShops] = useState<Shop[]>([]);
  const [searchQuery, setSearchQuery] = useState(route.params?.searchQuery || '');
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  
  // Filter states
  const [filterModalVisible, setFilterModalVisible] = useState(false);
  const [shopCategories, setShopCategories] = useState<string[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [onlyOpen, setOnlyOpen] = useState(false);
  const [minRating, setMinRating] = useState(0);
  const [sortBy, setSortBy] = useState('');
  const [showNearby, setShowNearby] = useState(false);
  const [loadingCategories, setLoadingCategories] = useState(false);

  // Add location state
  const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [locationPermissionDenied, setLocationPermissionDenied] = useState(false);

  useEffect(() => {
    loadShops();
    fetchShopCategories();
  }, []);

  useEffect(() => {
    if (showNearby && !userLocation && !locationPermissionDenied) {
      getUserLocation();
    }
  }, [showNearby]);

  useEffect(() => {
    if (shops.length > 0) {
      filterShops();
    }
  }, [searchQuery, selectedCategory, onlyOpen, minRating, sortBy, showNearby]);

  const fetchShopCategories = async () => {
    try {
      setLoadingCategories(true);
      
      // Fetch categories from API
      const response = await getShopCategories();
      if (response.success) {
        setShopCategories(response.data);
      } else {
        // Fallback to extracting from loaded shops if API fails
        const categoriesSet = new Set<string>();
        shops.forEach(shop => {
          if (shop.categories && shop.categories.length > 0) {
            shop.categories.forEach(category => categoriesSet.add(category));
          }
        });
        
        setShopCategories(Array.from(categoriesSet).sort());
      }
    } catch (error) {
      console.error('Failed to fetch shop categories:', error);
      // Fallback to extracting from loaded shops
      const categoriesSet = new Set<string>();
      shops.forEach(shop => {
        if (shop.categories && shop.categories.length > 0) {
          shop.categories.forEach(category => categoriesSet.add(category));
        }
      });
      
      setShopCategories(Array.from(categoriesSet).sort());
    } finally {
      setLoadingCategories(false);
    }
  };

  const filterShops = useCallback(() => {
    let filtered = [...shops];
    
    // Apply text search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (shop) => 
          shop.name.toLowerCase().includes(query) || 
          shop.description.toLowerCase().includes(query) ||
          (shop.address && 
            (typeof shop.address === 'string' 
              ? shop.address.toLowerCase().includes(query)
              : ((shop.address.village && shop.address.village.toLowerCase().includes(query)) ||
                 (shop.address.district && shop.address.district.toLowerCase().includes(query)))
            )
          )
      );
    }
    
    // Apply category filter
    if (selectedCategory) {
      filtered = filtered.filter(shop => 
        shop.categories && shop.categories.includes(selectedCategory)
      );
    }
    
    // Apply open filter
    if (onlyOpen) {
      filtered = filtered.filter(shop => shop.isOpen);
    }
    
    // Apply rating filter
    if (minRating > 0) {
      filtered = filtered.filter(shop => shop.rating >= minRating);
    }
    
    // Apply sorting
    if (sortBy === 'rating') {
      filtered.sort((a, b) => b.rating - a.rating);
    } else if (sortBy === 'name') {
      filtered.sort((a, b) => a.name.localeCompare(b.name));
    }
    
    setFilteredShops(filtered);
  }, [shops, searchQuery, selectedCategory, onlyOpen, minRating, sortBy]);

  const getUserLocation = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setLocationPermissionDenied(true);
        alert(
          'Permission Denied',
          'Please enable location services to find nearby shops.',
          [{ text: 'OK' }]
        );
        return;
      }

      const location = await Location.getCurrentPositionAsync({});
      setUserLocation({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      });
    } catch (error) {
      console.error('Error getting location:', error);
      setLocationPermissionDenied(true);
    }
  };

  const loadShops = async () => {
    try {
      setLoading(true);
      
      // If search query is provided, use the dedicated search function
      if (searchQuery && searchQuery.trim() !== '') {
        const response = await searchShops(searchQuery);
        setShops(response.data as unknown as Shop[]);
        setFilteredShops(response.data as unknown as Shop[]);
        return;
      }
      
      let response: ShopsResponse;
      if (showNearby && userLocation) {
        response = await getNearbyShops(userLocation);
      } else {
        // Build query string based on filters
        const queryParams: Record<string, string> = {};
        if (selectedCategory) queryParams.category = selectedCategory;
        if (onlyOpen) queryParams.isOpen = 'true';
        if (minRating > 0) queryParams.minRating = minRating.toString();
        if (sortBy) queryParams.sortBy = sortBy;
        
        const queryString = Object.entries(queryParams)
          .map(([key, value]) => `${key}=${encodeURIComponent(value)}`)
          .join('&');
          
        response = await getShops(queryString);
      }
      
      if (response.success) {
        setShops(response.data as unknown as Shop[]);
        setFilteredShops(response.data as unknown as Shop[]);
        
        // Extract categories after loading shops
        if (response.data.length > 0) {
          const categoriesSet = new Set<string>();
          response.data.forEach((shop: any) => {
            if (shop.categories && shop.categories.length > 0) {
              shop.categories.forEach((category: string) => categoriesSet.add(category));
            }
          });
          setShopCategories(Array.from(categoriesSet).sort());
        }
      }
    } catch (error) {
      console.error('Failed to load shops:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadShops();
    setRefreshing(false);
  };

  const handleSearch = (text: string) => {
    setSearchQuery(text);
  };

  const handleFilterPress = () => {
    setFilterModalVisible(true);
  };

  const applyFilters = () => {
    setFilterModalVisible(false);
    loadShops();
  };

  const resetFilters = () => {
    setSelectedCategory('');
    setOnlyOpen(false);
    setMinRating(0);
    setSortBy('');
    setShowNearby(false);
    setUserLocation(null);
    setLocationPermissionDenied(false);
    loadShops();
  };

  const renderShopItem = ({ item }: { item: Shop }) => (
    <TouchableOpacity 
      onPress={() => navigation.navigate('ShopDetails', { shopId: item._id })}
      activeOpacity={0.9}
    >
      <Card3D style={styles.shopCard}>
        <Image 
          source={{ uri: item.logo || 'https://via.placeholder.com/150' }} 
          style={styles.shopLogo} 
        />
        <View style={styles.shopInfo}>
          <View style={styles.shopHeader}>
            <Text style={styles.shopName}>{item.name}</Text>
            <View style={styles.ratingContainer}>
              <FontAwesome name="star" size={14} color="#FFD700" />
              <Text style={styles.ratingText}>{item.rating.toFixed(1)}</Text>
            </View>
          </View>
          <Text style={styles.shopDescription} numberOfLines={2}>
            {item.description}
          </Text>
          <Text style={styles.shopAddress} numberOfLines={1}>
            {typeof item.address === 'string' 
              ? item.address 
              : `${item.address?.village || ''}, ${item.address?.district || ''}`
            }
          </Text>
          <View style={styles.shopFooter}>
            <View style={styles.shopStatusContainer}>
              <View style={[styles.statusDot, { backgroundColor: item.isOpen ? theme.colors.success : theme.colors.error }]} />
              <Text style={styles.statusText}>
                {item.isOpen ? 'Open Now' : 'Closed'}
              </Text>
            </View>
            
            {item.categories && item.categories.length > 0 && (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoriesContainer}>
                {item.categories.map((category, index) => (
                  <TouchableOpacity 
                    key={index}
                    style={styles.categoryChip}
                    onPress={() => {
                      setSelectedCategory(category);
                      filterShops();
                    }}
                  >
                    <Text style={styles.categoryChipText}>{category}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}
          </View>
        </View>
      </Card3D>
    </TouchableOpacity>
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
            <Text style={styles.modalTitle}>Filter Shops</Text>
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
                  contentContainerStyle={styles.modalCategoriesContainer}
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
                  
                  {shopCategories.map((category, index) => (
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
            
            {/* Other Filters */}
            <View style={styles.filterSection}>
              <Text style={styles.filterSectionTitle}>Availability</Text>
              <TouchableOpacity 
                style={styles.filterOption}
                onPress={() => setOnlyOpen(!onlyOpen)}
              >
                <Text style={styles.filterOptionText}>Only Show Open Shops</Text>
                {onlyOpen && <Ionicons name="checkmark" size={20} color={theme.colors.primary} />}
              </TouchableOpacity>
            </View>
            
            <View style={styles.filterSection}>
              <Text style={styles.filterSectionTitle}>Rating</Text>
              <View style={styles.ratingOptions}>
                {[0, 3, 3.5, 4, 4.5].map((rating, index) => (
                  <TouchableOpacity
                    key={index}
                    style={[
                      styles.ratingButton,
                      minRating === rating && styles.ratingButtonActive
                    ]}
                    onPress={() => setMinRating(rating)}
                  >
                    <Text style={[
                      styles.ratingButtonText,
                      minRating === rating && styles.ratingButtonTextActive
                    ]}>
                      {rating === 0 ? 'All' : `${rating}+`}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
            
            <View style={styles.filterSection}>
              <Text style={styles.filterSectionTitle}>Sort By</Text>
              <TouchableOpacity 
                style={styles.filterOption}
                onPress={() => setSortBy('rating')}
              >
                <Text style={styles.filterOptionText}>Rating (High to Low)</Text>
                {sortBy === 'rating' && <Ionicons name="checkmark" size={20} color={theme.colors.primary} />}
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.filterOption}
                onPress={() => setSortBy('name')}
              >
                <Text style={styles.filterOptionText}>Name (A to Z)</Text>
                {sortBy === 'name' && <Ionicons name="checkmark" size={20} color={theme.colors.primary} />}
              </TouchableOpacity>
            </View>
            
            <View style={styles.filterSection}>
              <Text style={styles.filterSectionTitle}>Location</Text>
              <TouchableOpacity 
                style={styles.filterOption}
                onPress={() => setShowNearby(!showNearby)}
              >
                <Text style={styles.filterOptionText}>Show Nearby Shops</Text>
                {showNearby && <Ionicons name="checkmark" size={20} color={theme.colors.primary} />}
              </TouchableOpacity>
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

  if (loading && !refreshing) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <ScreenHeader title="Shops" />
        
        <View style={styles.contentContainer}>
          <View style={styles.searchFilterContainer}>
            <SearchBar 
              placeholder="Search shops..."
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
          {(selectedCategory || onlyOpen || minRating > 0 || sortBy || showNearby) && (
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
                
                {onlyOpen && (
                  <View style={styles.activeFilterChip}>
                    <Text style={styles.activeFilterText}>Open Only</Text>
                    <TouchableOpacity onPress={() => setOnlyOpen(false)}>
                      <Ionicons name="close-circle" size={16} color={theme.colors.white} />
                    </TouchableOpacity>
                  </View>
                )}
                
                {minRating > 0 && (
                  <View style={styles.activeFilterChip}>
                    <Text style={styles.activeFilterText}>Rating: {minRating}+</Text>
                    <TouchableOpacity onPress={() => setMinRating(0)}>
                      <Ionicons name="close-circle" size={16} color={theme.colors.white} />
                    </TouchableOpacity>
                  </View>
                )}
                
                {sortBy && (
                  <View style={styles.activeFilterChip}>
                    <Text style={styles.activeFilterText}>
                      Sort: {sortBy === 'rating' ? 'Rating' : 'Name'}
                    </Text>
                    <TouchableOpacity onPress={() => setSortBy('')}>
                      <Ionicons name="close-circle" size={16} color={theme.colors.white} />
                    </TouchableOpacity>
                  </View>
                )}
                
                {showNearby && (
                  <View style={styles.activeFilterChip}>
                    <Text style={styles.activeFilterText}>Nearby</Text>
                    <TouchableOpacity onPress={() => setShowNearby(false)}>
                      <Ionicons name="close-circle" size={16} color={theme.colors.white} />
                    </TouchableOpacity>
                  </View>
                )}
              </ScrollView>
            </View>
          )}
          
          <FlatList
            data={filteredShops}
            renderItem={renderShopItem}
            keyExtractor={(item) => item._id}
            contentContainerStyle={styles.shopsList}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
            }
            ListEmptyComponent={
              <Text style={styles.emptyText}>
                {searchQuery || selectedCategory || onlyOpen || minRating > 0
                  ? 'No shops match your filters'
                  : 'No shops available'}
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
  shopsList: {
    paddingBottom: 100,
  },
  shopCard: {
    marginBottom: 16,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: theme.colors.white,
    flexDirection: 'row',
    alignItems: 'center',
  },
  shopLogo: {
    width: 100,
    height: 100,
    resizeMode: 'cover',
  },
  shopInfo: {
    flex: 1,
    padding: 12,
  },
  shopHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  shopName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: theme.colors.text,
    flex: 1,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 215, 0, 0.1)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 12,
  },
  ratingText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: theme.colors.text,
    marginLeft: 2,
  },
  shopDescription: {
    fontSize: 14,
    color: theme.colors.textLight,
    marginBottom: 4,
  },
  shopAddress: {
    fontSize: 12,
    color: theme.colors.gray,
    marginBottom: 8,
  },
  shopFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  shopStatusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 4,
  },
  statusText: {
    fontSize: 12,
    color: theme.colors.textLight,
  },
  categoriesContainer: {
    flex: 1,
    maxWidth: '70%',
  },
  categoryChip: {
    backgroundColor: theme.colors.accent,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
    marginRight: 4,
  },
  categoryChipText: {
    color: theme.colors.white,
    fontSize: 10,
  },
  emptyText: {
    textAlign: 'center',
    color: theme.colors.gray,
    marginTop: 40,
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
  modalCategoriesContainer: {
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
  filterOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.lightGray,
  },
  filterOptionText: {
    color: theme.colors.text,
  },
  ratingOptions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  ratingButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    backgroundColor: theme.colors.lightGray,
  },
  ratingButtonActive: {
    backgroundColor: theme.colors.primary,
  },
  ratingButtonText: {
    color: theme.colors.text,
    fontSize: 12,
  },
  ratingButtonTextActive: {
    color: theme.colors.white,
    fontWeight: 'bold',
  },
  filterActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
    marginBottom: 32,
  },
  resetButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: theme.colors.primary,
  },
  resetButtonText: {
    color: theme.colors.primary,
    fontWeight: 'bold',
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
});

export default ShopsScreen; 
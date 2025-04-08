import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Image, ActivityIndicator, Dimensions, ImageBackground, Linking, Alert } from 'react-native';
import { useSelector, useDispatch } from 'react-redux';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import * as Location from 'expo-location';
import axios from 'axios';
import { Feather, Ionicons, MaterialIcons, FontAwesome5 } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

import Header from '../components/Header';
import Button from '../components/Button';
import Card3D from '../components/Card3D';
import SearchBar from '../components/SearchBar';
import alert from '../utils/alert';
import { theme } from '../theme';
import { RootState, AppDispatch } from '../store';
import { logout } from '../store/authSlice';
import { MainStackParamList } from '../navigation/types';
import * as locationApi from '../api/locationApi';
import * as productApi from '../api/productApi';
import * as shopApi from '../api/shopApi';
import { GOOGLE_MAPS_API_KEY } from '../utils/config';

const { width } = Dimensions.get('window');
const CARD_WIDTH = width * 0.7;
const SHOP_CARD_WIDTH = width * 0.8;

type HomeScreenNavigationProp = NativeStackNavigationProp<MainStackParamList, 'Home'>;

type SearchType = 'all' | 'products' | 'shops';

// Product and Shop type definitions
interface Product {
  _id: string;
  name: string;
  description: string;
  rate: number;
  discount: number;
  images: string[];
  rating: number;
  shop: any;
}

interface Shop {
  _id: string;
  name: string;
  address: {
    village: string;
    district: string;
  };
  rating: number;
  reviews: any[];
  categories: string[];
  isOpen: boolean;
  images: string[];
}

// Ad data structure
interface AdBanner {
  id: string;
  imageUrl: string;
  title: string;
  description: string;
  action: string;
}

// Placeholder ad data
const adBanners: AdBanner[] = [
  {
    id: '1',
    imageUrl: 'https://i.ibb.co/MndGRfB/construction-materials.jpg',
    title: 'Summer Sale',
    description: 'Up to 40% off on selected materials',
    action: 'Shop Now'
  },
  {
    id: '2',
    imageUrl: 'https://i.ibb.co/NWNzfQL/renovation-tools.jpg',
    title: 'New Arrivals',
    description: 'Check out our latest tools collection',
    action: 'Explore'
  }
];

const HomeScreen: React.FC = () => {
  const navigation = useNavigation<HomeScreenNavigationProp>();
  const dispatch = useDispatch<AppDispatch>();
  const { user } = useSelector((state: RootState) => state.auth);
  const [location, setLocation] = useState<string>('Fetching location...');
  const [locationData, setLocationData] = useState<{ latitude: number; longitude: number } | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchType, setSearchType] = useState<SearchType>('all');
  
  // State for products and shops
  const [featuredProducts, setFeaturedProducts] = useState<Product[]>([]);
  const [nearbyShops, setNearbyShops] = useState<Shop[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [loading, setLoading] = useState({
    products: true,
    shops: true,
    categories: true
  });
  const [currentAdIndex, setCurrentAdIndex] = useState(0);

  useEffect(() => {
    getLocation();
    fetchFeaturedProducts();
    fetchNearbyShops();
    fetchCategories();
    
    // Auto rotate ads
    const adInterval = setInterval(() => {
      setCurrentAdIndex(prev => (prev + 1) % adBanners.length);
    }, 5000);
    
    return () => clearInterval(adInterval);
  }, []);

  const fetchFeaturedProducts = async () => {
    try {
      setLoading(prev => ({ ...prev, products: true }));
      const response = await productApi.getProducts('featured=true&limit=10');
      const productsData = response.data as unknown as Product[];
      setFeaturedProducts(productsData);
    } catch (error) {
      console.error('Failed to fetch featured products:', error);
    } finally {
      setLoading(prev => ({ ...prev, products: false }));
    }
  };

  const fetchNearbyShops = async () => {
    try {
      setLoading(prev => ({ ...prev, shops: true }));
      
      let response;
      // If we already have location data, use it
      if (locationData) {
        response = await shopApi.getNearbyShops(locationData);
      } else {
        // Try to get current location
        try {
          const { status } = await Location.requestForegroundPermissionsAsync();
          
          if (status === 'granted') {
            const location = await Location.getCurrentPositionAsync({
              accuracy: Location.Accuracy.Balanced,
            });
            
            const coords = {
              latitude: location.coords.latitude,
              longitude: location.coords.longitude,
            };
            
            setLocationData(coords);
            
            // Use the location for nearby shops
            response = await shopApi.getNearbyShops(coords);
            
            // Also update server with user location if logged in
            if (user) {
              await locationApi.updateUserLocation(coords);
            }
          } else {
            // No permission, use the default endpoint
            response = await shopApi.getNearbyShops();
          }
        } catch (locationError) {
          console.error('Error getting location:', locationError);
          // Fall back to regular endpoint
          response = await shopApi.getNearbyShops();
        }
      }
      
      const shopsData = response.data as unknown as Shop[];
      setNearbyShops(shopsData);
    } catch (error) {
      console.error('Failed to fetch nearby shops:', error);
    } finally {
      setLoading(prev => ({ ...prev, shops: false }));
    }
  };

  const fetchCategories = async () => {
    try {
      setLoading(prev => ({ ...prev, categories: true }));
      const response = await productApi.getProductCategories();
      setCategories(response.data);
    } catch (error) {
      console.error('Failed to fetch categories:', error);
    } finally {
      setLoading(prev => ({ ...prev, categories: false }));
    }
  };

  const getLocation = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setLocation('Permission denied');
        return;
      }

      const currentLocation = await Location.getCurrentPositionAsync({});
      const { latitude, longitude } = currentLocation.coords;
      setLocationData({ latitude, longitude });

      if (user?._id) {
        try {
          await locationApi.updateUserLocation({ latitude, longitude });
        } catch (error) {
          console.error('Failed to update location in backend:', error);
        }
      }

      try {
        const apiKey = GOOGLE_MAPS_API_KEY;
        if (!apiKey) {
          setLocation('Location service unavailable');
          return;
        }
        
        const response = await axios.get(
          `https://maps.googleapis.com/maps/api/geocode/json?latlng=${latitude},${longitude}&key=${apiKey}`
        );
        if (response.data.status === 'OK' && response.data.results.length > 0) {
          const addressComponents = response.data.results[0].address_components;
          const city = addressComponents.find((component: any) => 
            component.types.includes('locality')
          )?.long_name;
          
          const region = addressComponents.find((component: any) => 
            component.types.includes('administrative_area_level_1')
          )?.long_name;
          
          const locationString = `${city || ''}, ${region || ''}`;
          setLocation(locationString || 'Location Not found');
        } else {
          setLocation('Location Not found');
        }
      } catch (error) {
        console.error('Error with Google Places API:', error);
        setLocation('Location Not found');
      }
    } catch (error) {
      console.error('Error getting location:', error);
      setLocation('Error getting location');
    }
  };

  const handleLogout = async () => {
    try {
      await dispatch(logout()).unwrap();
      // Navigation will happen automatically due to auth state change
    } catch (error: any) {
      alert('Error', error.message || 'Failed to logout');
    }
  };

  const handleProfilePress = () => {
    navigation.navigate('Profile');
  };

  const handleNotificationPress = () => {
    navigation.navigate('Notifications');
  };

  const handleSearch = (text: string) => {
    setSearchQuery(text);
    // Here you can implement the search functionality
    // For example, redirect to Products screen with search query
    if (text.length > 2) {
      // Only navigate if user has typed at least 3 characters
      if (searchType === 'products' || searchType === 'all') {
        navigation.navigate('Products', { searchQuery: text });
      } else if (searchType === 'shops') {
        navigation.navigate('Shops', { searchQuery: text });
      }
    }
  };

  const handleSearchTypeChange = (type: SearchType) => {
    setSearchType(type);
  };

  const navigateToProductDetails = (productId: string) => {
    navigation.navigate('ProductDetails', { productId });
  };

  const navigateToShopDetails = (shopId: string) => {
    navigation.navigate('ShopDetails', { shopId });
  };

  const navigateToProductsByCategory = (category: string) => {
    navigation.navigate('ProductsTab', { category });
  };

  const renderAdBanner = () => {
    const ad = adBanners[currentAdIndex];
    
    return (
      <Card3D style={styles.adBannerContainer} elevation="medium">
        <ImageBackground 
          source={{ uri: ad.imageUrl }} 
          style={styles.adBannerImage}
          imageStyle={{ borderRadius: 16, opacity: 0.85 }}
        >
          <LinearGradient
            colors={['rgba(0,0,0,0.1)', 'rgba(0,0,0,0.7)']}
            style={styles.adGradient}
          >
            <View style={styles.adTextContainer}>
              <Text style={styles.adTitle}>{ad.title}</Text>
              <Text style={styles.adDescription}>{ad.description}</Text>
              <TouchableOpacity style={styles.adButton}>
                <Text style={styles.adButtonText}>{ad.action}</Text>
              </TouchableOpacity>
            </View>
          </LinearGradient>
        </ImageBackground>
        <View style={styles.adIndicators}>
          {adBanners.map((_, index) => (
            <View 
              key={index} 
              style={[
                styles.adIndicator, 
                index === currentAdIndex && styles.adIndicatorActive
              ]} 
            />
          ))}
        </View>
      </Card3D>
    );
  };

  const renderProductCard = (product: Product) => {
    const discountedPrice = product.discount 
      ? product.rate * (1 - product.discount / 100) 
      : null;
    
    return (
      <TouchableOpacity 
        key={product._id} 
        onPress={() => navigateToProductDetails(product._id)}
        style={styles.productCardWrapper}
      >
        <Card3D style={styles.productCard} elevation="medium">
          <View style={styles.productImageContainer}>
            <Image 
              source={{ 
                uri: product.images && product.images.length > 0 
                  ? product.images[0] 
                  : 'https://i.ibb.co/X3Cq1qM/placeholder.jpg'
              }} 
              style={styles.productImage} 
              resizeMode="cover"
            />
            {product.discount > 0 && (
              <View style={styles.discountBadge}>
                <Text style={styles.discountText}>{product.discount}% OFF</Text>
              </View>
            )}
          </View>
          <View style={styles.productContent}>
            <Text style={styles.productName} numberOfLines={1}>{product.name}</Text>
            <View style={styles.productRatingContainer}>
              <Ionicons name="star" size={16} color={theme.colors.warning} />
              <Text style={styles.productRating}>{product.rating.toFixed(1)}</Text>
            </View>
            <View style={styles.productShopContainer}>
              <Text style={styles.productShopLabel}>By </Text>
              <Text style={styles.productShopName} numberOfLines={1}>
                {typeof product.shop === 'object' ? product.shop.name : 'Unknown Shop'}
              </Text>
            </View>
            <View style={styles.productPriceContainer}>
              {discountedPrice && (
                <>
                  <Text style={styles.productDiscountedPrice}>₹{discountedPrice.toFixed(2)}</Text>
                  <Text style={styles.productOriginalPrice}>₹{product.rate.toFixed(2)}</Text>
                </>
              )}
              {!discountedPrice && (
                <Text style={styles.productPrice}>₹{product.rate.toFixed(2)}</Text>
              )}
            </View>
          </View>
        </Card3D>
      </TouchableOpacity>
    );
  };

  const renderShopCard = (shop: Shop) => {
    return (
      <TouchableOpacity 
        key={shop._id} 
        onPress={() => navigateToShopDetails(shop._id)}
        style={styles.shopCardWrapper}
      >
        <Card3D style={styles.shopCard} elevation="medium">
          <LinearGradient
            colors={['rgba(255,107,53,0.8)', 'rgba(14,47,88,0.9)']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.shopCardGradient}
          >
            <View style={styles.shopImageContainer}>
              <Image 
                source={{ 
                  uri: shop.images && shop.images.length > 0 
                    ? shop.images[0] 
                    : 'https://i.ibb.co/rskZwbK/shop-placeholder.jpg' 
                }}
                style={styles.shopImage} 
                resizeMode="cover"
              />
            </View>
            <View style={styles.shopContent}>
              <Text style={styles.shopName}>{shop.name}</Text>
              <View style={styles.shopRatingContainer}>
                <Ionicons name="star" size={16} color="#FFD700" />
                <Text style={styles.shopRating}>{shop.rating ? shop.rating.toFixed(1) : '0.0'}</Text>
                <Text style={styles.shopRatingCount}>
                  ({shop.reviews ? shop.reviews.length : 0} reviews)
                </Text>
              </View>
              <View style={styles.shopDetailRow}>
                <Ionicons name="location-outline" size={16} color="#FFFFFF" />
                <Text style={styles.shopAddress} numberOfLines={1}>
                  {shop.address 
                    ? `${shop.address.village}, ${shop.address.district}` 
                    : 'Location not available'}
                </Text>
              </View>
              <View style={styles.shopCategoriesContainer}>
                {shop.categories?.map((category: string, index: number) => (
                  <View key={index} style={styles.categoryTag}>
                    <Text style={styles.categoryTagText}>{category}</Text>
                  </View>
                ))}
              </View>
              <View style={styles.shopStatus}>
                <View style={[
                  styles.statusIndicator, 
                  { backgroundColor: shop.isOpen ? theme.colors.success : theme.colors.error }
                ]} />
                <Text style={styles.statusText}>{shop.isOpen ? 'Open Now' : 'Closed'}</Text>
              </View>
            </View>
          </LinearGradient>
        </Card3D>
      </TouchableOpacity>
    );
  };

  const renderAppInfoSection = () => {
    return (
      <Card3D style={styles.appInfoCard} elevation="medium">
        <LinearGradient
          colors={['#1e3c72', '#2a5298']}
          style={styles.appInfoGradient}
        >
          <Text style={styles.appInfoTitle}>About Dumpit</Text>
          <Text style={styles.appInfoText}>
            Your one-stop marketplace for construction materials. 
            Connect with trusted vendors, discover quality products, and build with confidence.
          </Text>
          
          <View style={styles.featureRow}>
            <View style={styles.featureItem}>
              <View style={styles.featureIconContainer}>
                <Ionicons name="shield-checkmark" size={24} color="#FFFFFF" />
              </View>
              <Text style={styles.featureTitle}>Verified Vendors</Text>
              <Text style={styles.featureDescription}>All vendors are verified for quality and reliability</Text>
            </View>
            
            <View style={styles.featureItem}>
              <View style={styles.featureIconContainer}>
                <Ionicons name="cash" size={24} color="#FFFFFF" />
              </View>
              <Text style={styles.featureTitle}>Secure Payments</Text>
              <Text style={styles.featureDescription}>Multiple payment options with secure transactions</Text>
            </View>
          </View>
          
          <View style={styles.featureRow}>
            <View style={styles.featureItem}>
              <View style={styles.featureIconContainer}>
                <Ionicons name="time" size={24} color="#FFFFFF" />
              </View>
              <Text style={styles.featureTitle}>Fast Delivery</Text>
              <Text style={styles.featureDescription}>Quick delivery to your construction site</Text>
            </View>
            
            <View style={styles.featureItem}>
              <View style={styles.featureIconContainer}>
                <Ionicons name="star" size={24} color="#FFFFFF" />
              </View>
              <Text style={styles.featureTitle}>Quality Materials</Text>
              <Text style={styles.featureDescription}>Top quality construction materials for your projects</Text>
            </View>
          </View>
        </LinearGradient>
      </Card3D>
    );
  };

  return (
    <View style={styles.container}>
      <Header 
        location={location}
        onNotificationPress={handleNotificationPress}
        onProfilePress={handleProfilePress}
        onLogoutPress={handleLogout}
      />
      
      <View style={styles.searchContainer}>
        <SearchBar 
          placeholder={`Search ${searchType === 'all' ? 'products and shops' : searchType}...`}
          onSearch={handleSearch}
          value={searchQuery}
          style={styles.searchBar}
        />
        <View style={styles.searchTypeContainer}>
          <TouchableOpacity 
            style={[
              styles.searchTypeButton, 
              searchType === 'all' && styles.searchTypeButtonActive
            ]}
            onPress={() => handleSearchTypeChange('all')}
          >
            <Text style={[
              styles.searchTypeText,
              searchType === 'all' && styles.searchTypeTextActive
            ]}>All</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[
              styles.searchTypeButton, 
              searchType === 'products' && styles.searchTypeButtonActive
            ]}
            onPress={() => handleSearchTypeChange('products')}
          >
            <Text style={[
              styles.searchTypeText,
              searchType === 'products' && styles.searchTypeTextActive
            ]}>Products</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[
              styles.searchTypeButton, 
              searchType === 'shops' && styles.searchTypeButtonActive
            ]}
            onPress={() => handleSearchTypeChange('shops')}
          >
            <Text style={[
              styles.searchTypeText,
              searchType === 'shops' && styles.searchTypeTextActive
            ]}>Shops</Text>
          </TouchableOpacity>
        </View>
      </View>
      
      <ScrollView 
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollViewContent}
      >
        {/* Welcome message */}
        <View style={styles.welcomeContainer}>
        <Text style={styles.welcomeText}>
            Welcome
            <Text style={styles.welcomeHighlight}>
              {user?.name ? ` ${user.name}!` : ' to Dumpit!'}
            </Text>
        </Text>
          <Text style={styles.welcomeSubtext}>
            Find construction materials from trusted vendors
          </Text>
        </View>
        
        {/* Ad Banners */}
        {renderAdBanner()}
        
        {/* Featured Products Section */}
        <View style={styles.sectionContainer}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionTitleContainer}>
              <Ionicons name="star" size={24} color={theme.colors.primary} />
              <Text style={styles.sectionTitle}>Featured Products</Text>
            </View>
            <TouchableOpacity onPress={() => navigation.navigate('ProductsTab')}>
              <Text style={styles.seeAllText}>See All</Text>
            </TouchableOpacity>
          </View>
          
          {loading.products ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={theme.colors.primary} />
            </View>
          ) : (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.productsScrollContainer}
            >
              {featuredProducts.length > 0 ? (
                featuredProducts.map((product: Product) => renderProductCard(product))
              ) : (
                <View style={styles.emptyStateContainer}>
                  <Text style={styles.emptyStateText}>No featured products available</Text>
                </View>
              )}
            </ScrollView>
          )}
        </View>
        
        {/* Nearby Shops Section */}
        <View style={styles.sectionContainer}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionTitleContainer}>
              <Ionicons name="storefront" size={24} color={theme.colors.primary} />
              <Text style={styles.sectionTitle}>Nearby Shops</Text>
            </View>
            <TouchableOpacity onPress={() => navigation.navigate('ShopsTab')}>
              <Text style={styles.seeAllText}>See All</Text>
            </TouchableOpacity>
          </View>
          
          {loading.shops ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={theme.colors.primary} />
            </View>
          ) : (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.shopsScrollContainer}
            >
              {nearbyShops.length > 0 ? (
                nearbyShops.map((shop: Shop) => renderShopCard(shop))
              ) : (
                <View style={styles.emptyStateContainer}>
                  <Text style={styles.emptyStateText}>No shops available in your area</Text>
                </View>
              )}
            </ScrollView>
          )}
        </View>
        
        {/* App Info Section */}
        {renderAppInfoSection()}
        
        {/* Categories Section */}
        <View style={styles.categoriesContainer}>
          <Text style={styles.categoriesTitle}>Popular Categories</Text>
          {loading.categories ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="small" color={theme.colors.primary} />
            </View>
          ) : (
            <View style={styles.categoriesGrid}>
              {categories.slice(0, 6).map((category, index) => (
                <TouchableOpacity 
                  key={index} 
                  style={styles.categoryCard}
                  onPress={() => navigateToProductsByCategory(category)}
                >
                  <LinearGradient
                    colors={['rgba(255,107,53,0.8)', 'rgba(14,47,88,0.9)']}
                    style={styles.categoryCardGradient}
                  >
                    <MaterialIcons 
                      name={
                        category.toLowerCase().includes('cement') ? 'business' :
                        category.toLowerCase().includes('brick') ? 'grid-on' :
                        category.toLowerCase().includes('sand') ? 'grain' :
                        category.toLowerCase().includes('steel') ? 'straighten' :
                        category.toLowerCase().includes('paint') ? 'format-paint' :
                        'build'
                      } 
                      size={28} 
                      color="#FFFFFF" 
                    />
                    <Text style={styles.categoryCardText}>{category}</Text>
                  </LinearGradient>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  scrollView: {
    flex: 1,
  },
  scrollViewContent: {
    paddingBottom: 120, // Increased padding to account for tab bar
  },
  searchContainer: {
    marginHorizontal: theme.spacing.lg,
    marginTop: theme.spacing.md,
  },
  searchBar: {
    marginBottom: theme.spacing.xs,
  },
  searchTypeContainer: {
    flexDirection: 'row',
    marginBottom: theme.spacing.sm,
  },
  searchTypeButton: {
    paddingVertical: theme.spacing.xs,
    paddingHorizontal: theme.spacing.sm,
    borderRadius: theme.borderRadius.small,
    marginRight: theme.spacing.xs,
  },
  searchTypeButtonActive: {
    backgroundColor: theme.colors.primary,
  },
  searchTypeText: {
    fontSize: 12,
    color: theme.colors.text,
  },
  searchTypeTextActive: {
    color: theme.colors.white,
    fontWeight: 'bold',
  },
  welcomeContainer: {
    paddingHorizontal: theme.spacing.lg,
    marginTop: theme.spacing.md,
    marginBottom: theme.spacing.md,
  },
  welcomeText: {
    fontSize: 24,
    fontWeight: '600',
    color: theme.colors.text,
  },
  welcomeHighlight: {
    color: theme.colors.primary,
    fontWeight: 'bold',
  },
  welcomeSubtext: {
    fontSize: 14,
    color: theme.colors.gray,
    marginTop: 4,
  },
  adBannerContainer: {
    marginHorizontal: theme.spacing.lg,
    marginBottom: theme.spacing.lg,
    borderRadius: theme.borderRadius.large,
    overflow: 'hidden',
    height: 180,
    padding: 0,
  },
  adBannerImage: {
    width: '100%',
    height: '100%',
    justifyContent: 'flex-end',
  },
  adGradient: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: '100%',
    justifyContent: 'flex-end',
    borderRadius: theme.borderRadius.large,
  },
  adTextContainer: {
    padding: theme.spacing.lg,
  },
  adTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  adDescription: {
    fontSize: 14,
    color: '#FFFFFF',
    marginTop: 4,
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  adButton: {
    backgroundColor: theme.colors.primary,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    alignSelf: 'flex-start',
    marginTop: 12,
  },
  adButtonText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 14,
  },
  adIndicators: {
    position: 'absolute',
    bottom: 10,
    right: 15,
    flexDirection: 'row',
  },
  adIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.4)',
    marginHorizontal: 4,
  },
  adIndicatorActive: {
    backgroundColor: '#FFFFFF',
    width: 16,
  },
  sectionContainer: {
    marginBottom: theme.spacing.lg,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.lg,
    marginBottom: theme.spacing.md,
  },
  sectionTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: theme.colors.text,
    marginLeft: 8,
  },
  seeAllText: {
    fontSize: 14,
    color: theme.colors.primary,
    fontWeight: '600',
  },
  productsScrollContainer: {
    paddingLeft: theme.spacing.lg,
    paddingRight: theme.spacing.sm,
  },
  productCardWrapper: {
    width: CARD_WIDTH,
    marginRight: theme.spacing.md,
  },
  productCard: {
    padding: 0,
    overflow: 'hidden',
    height: 280,
  },
  productImageContainer: {
    width: '100%',
    height: 160,
    borderTopLeftRadius: theme.borderRadius.large,
    borderTopRightRadius: theme.borderRadius.large,
    overflow: 'hidden',
    position: 'relative',
  },
  productImage: {
    width: '100%',
    height: '100%',
  },
  discountBadge: {
    position: 'absolute',
    top: 10,
    right: 10,
    backgroundColor: theme.colors.error,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  discountText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 12,
  },
  productContent: {
    padding: theme.spacing.md,
  },
  productName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: theme.colors.text,
    marginBottom: 6,
  },
  productRatingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  productRating: {
    fontSize: 14,
    color: theme.colors.text,
    marginLeft: 4,
    fontWeight: '600',
  },
  productShopContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  productShopLabel: {
    fontSize: 12,
    color: theme.colors.gray,
  },
  productShopName: {
    fontSize: 12,
    color: theme.colors.accent,
    fontWeight: '500',
  },
  productPriceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  productPrice: {
    fontSize: 18,
    fontWeight: 'bold',
    color: theme.colors.primary,
  },
  productDiscountedPrice: {
    fontSize: 18,
    fontWeight: 'bold',
    color: theme.colors.primary,
  },
  productOriginalPrice: {
    fontSize: 14,
    color: theme.colors.gray,
    textDecorationLine: 'line-through',
    marginLeft: 8,
  },
  shopsScrollContainer: {
    paddingLeft: theme.spacing.lg,
    paddingRight: theme.spacing.sm,
  },
  shopCardWrapper: {
    width: SHOP_CARD_WIDTH,
    marginRight: theme.spacing.md,
  },
  shopCard: {
    padding: 0,
    overflow: 'hidden',
    height: 200,
  },
  shopCardGradient: {
    flexDirection: 'row',
    padding: theme.spacing.md,
    height: '100%',
    borderRadius: theme.borderRadius.large,
  },
  shopImageContainer: {
    width: 120,
    height: '100%',
    borderRadius: theme.borderRadius.medium,
    overflow: 'hidden',
    marginRight: theme.spacing.md,
  },
  shopImage: {
    width: '100%',
    height: '100%',
  },
  shopContent: {
    flex: 1,
    justifyContent: 'center',
  },
  shopName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  shopRatingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  shopRating: {
    fontSize: 14,
    color: '#FFFFFF',
    marginLeft: 4,
    fontWeight: '600',
  },
  shopRatingCount: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.7)',
    marginLeft: 4,
  },
  shopDetailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  shopAddress: {
    fontSize: 13,
    color: '#FFFFFF',
    marginLeft: 6,
    flex: 1,
  },
  shopCategoriesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 8,
  },
  categoryTag: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginRight: 6,
    marginBottom: 6,
  },
  categoryTagText: {
    fontSize: 11,
    color: '#FFFFFF',
  },
  shopStatus: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  statusText: {
    fontSize: 12,
    color: '#FFFFFF',
  },
  loadingContainer: {
    height: 200,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyStateContainer: {
    height: 200,
    width: width - theme.spacing.lg * 2,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
    borderRadius: theme.borderRadius.large,
  },
  emptyStateText: {
    fontSize: 14,
    color: theme.colors.gray,
  },
  appInfoCard: {
    marginHorizontal: theme.spacing.lg,
    marginBottom: theme.spacing.lg,
    padding: 0,
    overflow: 'hidden',
  },
  appInfoGradient: {
    padding: theme.spacing.lg,
    borderRadius: theme.borderRadius.large,
  },
  appInfoTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 8,
    textAlign: 'center',
  },
  appInfoText: {
    fontSize: 14,
    color: '#FFFFFF',
    marginBottom: 20,
    textAlign: 'center',
    lineHeight: 20,
  },
  featureRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  featureItem: {
    width: '48%',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: theme.borderRadius.medium,
    padding: 12,
    alignItems: 'center',
  },
  featureIconContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  featureTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 4,
    textAlign: 'center',
  },
  featureDescription: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.8)',
    textAlign: 'center',
  },
  categoriesContainer: {
    marginHorizontal: theme.spacing.lg,
    marginBottom: theme.spacing.xl,
  },
  categoriesTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: theme.colors.text,
    marginBottom: theme.spacing.md,
  },
  categoriesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  categoryCard: {
    width: '31%',
    aspectRatio: 1,
    marginBottom: 10,
    borderRadius: theme.borderRadius.medium,
    overflow: 'hidden',
  },
  categoryCardGradient: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 10,
  },
  categoryCardText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginTop: 8,
    textAlign: 'center',
  },
});

export default HomeScreen; 
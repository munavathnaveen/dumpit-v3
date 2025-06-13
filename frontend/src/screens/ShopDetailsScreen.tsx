import React, { useEffect, useState, useCallback, useMemo, memo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  Dimensions,
  ActivityIndicator,
  FlatList,
  Share,
  Platform,
  useWindowDimensions,
  Linking,
  RefreshControl,
} from 'react-native';
import { useNavigation, RouteProp } from '@react-navigation/native';
import { useRoute } from '@react-navigation/core';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSelector } from 'react-redux';

import { MainStackParamList } from '../navigation/types';
import { Shop } from '../types/shop';
import { Product } from '../types/product';
import * as shopApi from '../api/shopApi';
import * as productApi from '../api/productApi';
import { theme } from '../theme';
import ScreenHeader from '../components/ScreenHeader';
import Button from '../components/Button';
import MapView from '../components/MapView';
import Card3D from '../components/Card3D';
import AddReviewModal from '../components/AddReviewModal';
import { RootState } from '../store';
import alert from '../utils/alert';

type ShopDetailsScreenRouteProp = RouteProp<MainStackParamList, 'ShopDetails'>;
type ShopDetailsScreenNavigationProp = NativeStackNavigationProp<MainStackParamList, 'ShopDetails'>;

const { width: screenWidth } = Dimensions.get('window');

// Constants
const REVIEWS_PER_PAGE = 5;
const PRODUCTS_PER_PAGE = 10;
const MAP_ZOOM_LEVEL = 0.005;

// Memoized components
const ProductCard = memo(({ 
    product, 
    onPress, 
    width 
}: { 
    product: Product; 
    onPress: () => void; 
    width: number;
}) => {
    const discountedPrice = product.discount > 0 
        ? product.price - (product.price * product.discount / 100)
        : product.price;

    return (
        <TouchableOpacity
            style={[styles.productCard, { width }]}
            onPress={onPress}
            activeOpacity={0.8}
        >
            <View style={styles.productImageContainer}>
                {product.image ? (
                    <Image 
                        source={{ uri: product.image }} 
                        style={styles.productImage} 
                    />
                ) : (
                    <View style={styles.productImagePlaceholder}>
                        <Ionicons 
                            name="image-outline" 
                            size={30} 
                            color={theme.colors.gray} 
                        />
                    </View>
                )}
                {product.discount > 0 && (
                    <View style={styles.discountBadge}>
                        <Text style={styles.discountText}>
                            {product.discount}% OFF
                        </Text>
                    </View>
                )}
            </View>
            
            <View style={styles.productInfo}>
                <Text style={styles.productName} numberOfLines={2}>
                    {product.name}
                </Text>
                <View style={styles.productPriceContainer}>
                    <Text style={styles.productPrice}>
                        ₹{discountedPrice.toFixed(2)}
                    </Text>
                    {product.discount > 0 && (
                        <Text style={styles.originalProductPrice}>
                            ₹{product.price.toFixed(2)}
                        </Text>
                    )}
                </View>
                <View style={styles.productRatingContainer}>
                    <RatingStars rating={product.rating || 0} size={12} />
                    <Text style={styles.productRatingText}>
                        ({product.reviews?.length || 0})
                    </Text>
                </View>
            </View>
        </TouchableOpacity>
    );
});

const RatingStars = memo(({ 
    rating, 
    size = 16 
}: { 
    rating: number; 
    size?: number;
}) => {
    const stars = [];
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 !== 0;

    for (let i = 0; i < fullStars; i++) {
        stars.push(
            <Ionicons 
                key={i} 
                name="star" 
                size={size} 
                color={theme.colors.warning} 
            />
        );
    }

    if (hasHalfStar) {
        stars.push(
            <Ionicons 
                key="half" 
                name="star-half" 
                size={size} 
                color={theme.colors.warning} 
            />
        );
    }

    const emptyStars = 5 - Math.ceil(rating);
    for (let i = 0; i < emptyStars; i++) {
        stars.push(
            <Ionicons 
                key={`empty-${i}`} 
                name="star-outline" 
                size={size} 
                color={theme.colors.gray} 
            />
        );
    }

    return <View style={styles.starsContainer}>{stars}</View>;
});

const ReviewItem = memo(({ 
    review 
}: { 
    review: {
        user: { name: string };
        rating: number;
        text: string;
        createdAt: string;
    };
}) => (
    <View style={styles.reviewItem}>
        <View style={styles.reviewHeader}>
            <Text style={styles.reviewerName}>
                {review.user.name}
            </Text>
            <RatingStars rating={review.rating} size={14} />
        </View>
        <Text style={styles.reviewText}>
            {review.text}
        </Text>
        <Text style={styles.reviewDate}>
            {new Date(review.createdAt).toLocaleDateString()}
        </Text>
    </View>
));

const ShopDetailsScreen: React.FC = () => {
  const route = useRoute<ShopDetailsScreenRouteProp>();
  const navigation = useNavigation<ShopDetailsScreenNavigationProp>();
  const { user } = useSelector((state: RootState) => state.auth);
  const dimensions = useWindowDimensions();

  const { shopId } = route.params;

  // State management
  const [shop, setShop] = useState<Shop | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [productsLoading, setProductsLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedTab, setSelectedTab] = useState<'overview' | 'products' | 'reviews'>('overview');
  const [showAllReviews, setShowAllReviews] = useState(false);
  const [showReviewModal, setShowReviewModal] = useState(false);

  // Memoized values
  const imageHeight = useMemo(() => 
    dimensions.width < 380 ? 200 : 250,
    [dimensions.width]
  );

  const cardPadding = useMemo(() => 
    dimensions.width < 380 ? 12 : 16,
    [dimensions.width]
  );

  const productCardWidth = useMemo(() => 
    (dimensions.width - 48) / 2,
    [dimensions.width]
  );

  // Fetch shop details
  const fetchShopDetails = useCallback(async () => {
    try {
      setLoading(true);
      const response = await shopApi.getShop(shopId);
      
      if (response.success && response.data) {
        setShop(response.data);
      } else {
        throw new Error('Shop not found');
      }
    } catch (error) {
      console.error('Error fetching shop details:', error);
      alert('Error', 'Failed to load shop details. Please try again.');
      navigation.goBack();
    } finally {
      setLoading(false);
    }
  }, [shopId, navigation]);

  // Fetch shop products
  const fetchShopProducts = useCallback(async () => {
    try {
      setProductsLoading(true);
      const response = await productApi.getProductsByShop(shopId);
      
      if (response.success && response.data) {
        setProducts(response.data);
      }
    } catch (error) {
      console.error('Error fetching shop products:', error);
    } finally {
      setProductsLoading(false);
    }
  }, [shopId]);

  // Initial load
  useEffect(() => {
    fetchShopDetails();
    fetchShopProducts();
  }, [fetchShopDetails, fetchShopProducts]);

  // Memoized handlers
  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await Promise.all([
        fetchShopDetails(),
        fetchShopProducts()
      ]);
    } catch (error) {
      console.error('Error refreshing:', error);
      alert('Error', 'Failed to refresh data. Please try again.');
    } finally {
      setRefreshing(false);
    }
  }, [fetchShopDetails, fetchShopProducts]);

  const handleProductPress = useCallback((productId: string) => {
    navigation.navigate('ProductDetails', { productId });
  }, [navigation]);

  const handleCall = useCallback(() => {
    if (shop?.address?.phone) {
      Linking.openURL(`tel:${shop.address.phone}`);
    }
  }, [shop]);

  const handleShare = useCallback(async () => {
    if (!shop) return;

    try {
      const message = `Check out this shop: ${shop.name}\nAddress: ${
        shop.address?.village || 'Address not available'
      }\nRating: ${shop.rating?.toFixed(1) || 'No rating'}⭐`;
      
      await Share.share({
        message,
        title: shop.name,
        url: Platform.OS === 'ios' ? '' : undefined,
      });
    } catch (error) {
      console.error('Error sharing shop:', error);
      alert('Error', 'Failed to share shop. Please try again.');
    }
  }, [shop]);

  const handleAddReview = useCallback(async (rating: number, text: string) => {
    if (!user) {
      alert('Please Login', 'You need to login to add a review');
      return;
    }

    if (!shop) return;

    try {
      await shopApi.addShopReview(shop._id, { rating, text });
      await fetchShopDetails();
      alert('Success', 'Your review has been added successfully!');
    } catch (error) {
      console.error('Error adding review:', error);
      alert('Error', 'Failed to add review. Please try again.');
    }
  }, [user, shop, fetchShopDetails]);

  // Navigate to all products with shop filter
  const navigateToAllProducts = useCallback(() => {
    navigation.navigate('Products', { shopId });
  }, [navigation, shopId]);

  // Render shop header
  const renderShopHeader = () => {
    if (!shop) return null;

    return (
      <View style={styles.headerContainer}>
        {/* Shop image */}
        <View style={[styles.imageContainer, { height: imageHeight }]}>
          {shop.image ? (
            <Image source={{ uri: shop.image }} style={styles.shopImage} />
          ) : (
            <View style={styles.placeholderImage}>
              <Ionicons name="storefront-outline" size={60} color={theme.colors.gray} />
              <Text style={styles.placeholderText}>No Image</Text>
            </View>
          )}
          
          {/* Overlay gradient */}
          <LinearGradient
            colors={['transparent', 'rgba(0,0,0,0.7)']}
            style={styles.imageOverlay}
          />
          
          {/* Shop info overlay */}
          <View style={styles.shopInfoOverlay}>
            <Text style={styles.shopName}>{shop.name}</Text>
            <View style={styles.ratingContainer}>
              <RatingStars rating={shop.rating || 0} size={14} />
              <Text style={styles.ratingText}>
                {(shop.rating || 0).toFixed(1)} ({shop.reviews?.length || 0} reviews)
              </Text>
            </View>
            <View style={styles.statusContainer}>
              <View style={[
                styles.statusBadge, 
                { backgroundColor: shop.isOpen ? theme.colors.success : theme.colors.error }
              ]}>
                <Text style={styles.statusText}>
                  {shop.isOpen ? 'Open' : 'Closed'}
                </Text>
              </View>
              {shop.isVerified && (
                <View style={styles.verifiedBadge}>
                  <Ionicons name="checkmark-circle" size={16} color={theme.colors.primary} />
                  <Text style={styles.verifiedText}>Verified</Text>
                </View>
              )}
            </View>
          </View>

          {/* Share button */}
          <TouchableOpacity style={styles.shareButton} onPress={handleShare}>
            <Ionicons name="share-outline" size={24} color={theme.colors.white} />
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  // Render tab selector
  const renderTabSelector = () => (
    <View style={styles.tabContainer}>
      {[
        { key: 'overview', label: 'Overview', icon: 'information-circle-outline' },
        { key: 'products', label: 'Products', icon: 'grid-outline' },
        { key: 'reviews', label: 'Reviews', icon: 'star-outline' },
      ].map((tab) => (
        <TouchableOpacity
          key={tab.key}
          style={[
            styles.tabButton,
            selectedTab === tab.key && styles.activeTabButton,
          ]}
          onPress={() => setSelectedTab(tab.key as any)}
        >
          <Ionicons
            name={tab.icon as any}
            size={20}
            color={selectedTab === tab.key ? theme.colors.primary : theme.colors.gray}
          />
          <Text
            style={[
              styles.tabText,
              selectedTab === tab.key && styles.activeTabText,
            ]}
          >
            {tab.label}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );

  // Render overview tab
  const renderOverviewTab = () => {
    if (!shop) return null;

    return (
      <ScrollView style={styles.tabContent} showsVerticalScrollIndicator={false}>
        {/* Basic Info */}
        <Card3D style={[styles.infoCard, { padding: cardPadding }]}>
          <Text style={styles.sectionTitle}>Shop Information</Text>
          
          {shop.description && (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Description:</Text>
              <Text style={styles.infoValue}>{shop.description}</Text>
            </View>
          )}

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Categories:</Text>
            <View style={styles.categoriesContainer}>
              {shop.categories?.map((category, index) => (
                <View key={index} style={styles.categoryBadge}>
                  <Text style={styles.categoryText}>{category}</Text>
                </View>
              )) || <Text style={styles.infoValue}>No categories listed</Text>}
            </View>
          </View>

          {shop.address && (
            <View style={styles.addressContainer}>
              <Text style={styles.infoLabel}>Address:</Text>
              <View style={styles.addressDetails}>
                <Text style={styles.addressText}>
                  {shop.address.street}, {shop.address.village}
                </Text>
                <Text style={styles.addressText}>
                  {shop.address.district}, {shop.address.state} - {shop.address.pincode}
                </Text>
                {shop.address.phone && (
                  <TouchableOpacity style={styles.phoneContainer} onPress={handleCall}>
                    <Ionicons name="call-outline" size={16} color={theme.colors.primary} />
                    <Text style={styles.phoneText}>{shop.address.phone}</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          )}
        </Card3D>

        {/* Map */}
        {shop.location?.coordinates && shop.location.coordinates[0] !== 0 && (
          <Card3D style={[styles.mapCard, { padding: cardPadding }]}>
            <Text style={styles.sectionTitle}>Location</Text>
            <View style={styles.mapContainer}>
              <MapView
                style={styles.map}
                initialRegion={{
                  latitude: shop.location.coordinates[1],
                  longitude: shop.location.coordinates[0],
                  latitudeDelta: MAP_ZOOM_LEVEL,
                  longitudeDelta: MAP_ZOOM_LEVEL,
                }}
                markers={[
                  {
                    id: shop._id,
                    coordinate: {
                      latitude: shop.location.coordinates[1],
                      longitude: shop.location.coordinates[0],
                    },
                    title: shop.name,
                    description: shop.address?.village || '',
                  },
                ]}
                zoomEnabled={true}
                showsUserLocation={true}
              />
            </View>
          </Card3D>
        )}

        {/* Business Details */}
        <Card3D style={[styles.infoCard, { padding: cardPadding }]}>
          <Text style={styles.sectionTitle}>Business Details</Text>
          
          <View style={styles.businessRow}>
            <View style={styles.businessDetail}>
              <Text style={styles.businessLabel}>Min. Order</Text>
              <Text style={styles.businessValue}>₹{shop.minimumOrderAmount || 0}</Text>
            </View>
            <View style={styles.businessDetail}>
              <Text style={styles.businessLabel}>Shipping Fee</Text>
              <Text style={styles.businessValue}>₹{shop.shippingFee || 0}</Text>
            </View>
          </View>

          <View style={styles.businessRow}>
            <View style={styles.businessDetail}>
              <Text style={styles.businessLabel}>Free Shipping</Text>
              <Text style={styles.businessValue}>₹{shop.freeShippingThreshold || 0}+</Text>
            </View>
            <View style={styles.businessDetail}>
              <Text style={styles.businessLabel}>Tax Rate</Text>
              <Text style={styles.businessValue}>{shop.taxRate || 0}%</Text>
            </View>
          </View>
        </Card3D>

        <View style={styles.bottomSpacing} />
      </ScrollView>
    );
  };

  // Render product card
  const renderProductCard = ({ item: product }: { item: Product }) => (
    <ProductCard
      product={product}
      onPress={() => handleProductPress(product._id)}
      width={productCardWidth}
    />
  );

  // Render products tab
  const renderProductsTab = () => (
    <View style={styles.tabContent}>
      {productsLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={styles.loadingText}>Loading products...</Text>
        </View>
      ) : products.length > 0 ? (
        <>
          <View style={styles.productsHeader}>
            <Text style={styles.productsCount}>{products.length} Products</Text>
            <TouchableOpacity onPress={navigateToAllProducts}>
              <Text style={styles.viewAllText}>View All</Text>
            </TouchableOpacity>
          </View>
          
          <FlatList
            data={products.slice(0, PRODUCTS_PER_PAGE)}
            renderItem={renderProductCard}
            keyExtractor={(item) => item._id}
            numColumns={2}
            contentContainerStyle={styles.productsGrid}
            columnWrapperStyle={styles.productRow}
            showsVerticalScrollIndicator={false}
            scrollEnabled={false}
          />
          
          {products.length > PRODUCTS_PER_PAGE && (
            <Button
              title="View All Products"
              onPress={navigateToAllProducts}
              style={styles.viewAllButton}
            />
          )}
        </>
      ) : (
        <View style={styles.emptyContainer}>
          <Ionicons name="cube-outline" size={64} color={theme.colors.gray} />
          <Text style={styles.emptyText}>No products available</Text>
        </View>
      )}
    </View>
  );

  // Render reviews tab
  const renderReviewsTab = () => {
    if (!shop?.reviews || shop.reviews.length === 0) {
      return (
        <View style={styles.tabContent}>
          <Card3D style={[styles.reviewsCard, { padding: cardPadding }]}>
            <View style={styles.reviewsHeader}>
              <View style={styles.reviewsHeaderLeft}>
                <Text style={styles.sectionTitle}>Reviews (0)</Text>
              </View>

              {user && (
                <TouchableOpacity
                  style={styles.addReviewButton}
                  onPress={() => setShowReviewModal(true)}
                >
                  <Ionicons name="add" size={16} color={theme.colors.white} />
                  <Text style={styles.addReviewText}>Add Review</Text>
                </TouchableOpacity>
              )}
            </View>

            <View style={styles.emptyContainer}>
              <Ionicons name="star-outline" size={48} color={theme.colors.gray} />
              <Text style={styles.emptyText}>No reviews yet</Text>
              <Text>Be the first to review this shop!</Text>
            </View>
          </Card3D>
        </View>
      );
    }

    const reviewsToShow = showAllReviews ? shop.reviews : shop.reviews.slice(0, REVIEWS_PER_PAGE);

    return (
      <ScrollView style={styles.tabContent} showsVerticalScrollIndicator={false}>
        <Card3D style={[styles.reviewsCard, { padding: cardPadding }]}>
          <View style={styles.reviewsHeader}>
            <View style={styles.reviewsHeaderLeft}>
              <Text style={styles.sectionTitle}>Reviews ({shop.reviews.length})</Text>
              <View style={styles.overallRating}>
                <RatingStars rating={shop.rating || 0} size={18} />
                <Text style={styles.overallRatingText}>{(shop.rating || 0).toFixed(1)}</Text>
              </View>
            </View>

            {user && (
              <TouchableOpacity
                style={styles.addReviewButton}
                onPress={() => setShowReviewModal(true)}
              >
                <Ionicons name="add" size={16} color={theme.colors.white} />
                <Text style={styles.addReviewText}>Add Review</Text>
              </TouchableOpacity>
            )}
          </View>

          {reviewsToShow.map((review, index) => (
            <ReviewItem key={index} review={review} />
          ))}

          {shop.reviews.length > REVIEWS_PER_PAGE && (
            <TouchableOpacity
              style={styles.showMoreReviews}
              onPress={() => setShowAllReviews(!showAllReviews)}
            >
              <Text style={styles.showMoreReviewsText}>
                {showAllReviews ? 'Show Less' : `Show ${shop.reviews.length - REVIEWS_PER_PAGE} More Reviews`}
              </Text>
            </TouchableOpacity>
          )}
        </Card3D>
        
        <View style={styles.bottomSpacing} />
      </ScrollView>
    );
  };

  // Loading state
  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text style={styles.loadingText}>Loading shop details...</Text>
      </View>
    );
  }

  // Error state
  if (!shop) {
    return (
      <View style={styles.errorContainer}>
        <Ionicons name="alert-circle-outline" size={64} color={theme.colors.error} />
        <Text style={styles.errorText}>Shop not found</Text>
        <Button
          title="Go Back"
          onPress={() => navigation.goBack()}
          style={styles.errorButton}
        />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScreenHeader
        title="Shop Details"
        showBackButton={true}
      />
      
      <ScrollView 
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={[theme.colors.primary]}
            tintColor={theme.colors.primary}
          />
        }
      >
        {renderShopHeader()}
        {renderTabSelector()}
        
        {selectedTab === 'overview' && renderOverviewTab()}
        {selectedTab === 'products' && renderProductsTab()}
        {selectedTab === 'reviews' && renderReviewsTab()}
      </ScrollView>

      {/* Add Review Modal */}
      <AddReviewModal
        visible={showReviewModal}
        onClose={() => setShowReviewModal(false)}
        onSubmit={handleAddReview}
        title="Review Shop"
        subtitle={shop?.name}
      />
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.colors.background,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: theme.colors.gray,
    fontWeight: '500',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: theme.colors.background,
  },
  errorText: {
    fontSize: 18,
    color: theme.colors.error,
    fontWeight: '600',
    textAlign: 'center',
    marginVertical: 16,
  },
  errorButton: {
    marginTop: 16,
  },

  // Header styles
  headerContainer: {
    backgroundColor: theme.colors.white,
  },
  imageContainer: {
    position: 'relative',
    backgroundColor: theme.colors.lightGray,
  },
  shopImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  placeholderImage: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.colors.lightGray,
  },
  placeholderText: {
    marginTop: 8,
    fontSize: 14,
    color: theme.colors.gray,
  },
  imageOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 120,
  },
  shopInfoOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
  },
  shopName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: theme.colors.white,
    marginBottom: 8,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  starsContainer: {
    flexDirection: 'row',
    marginRight: 8,
  },
  ratingText: {
    color: theme.colors.white,
    fontSize: 14,
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginRight: 8,
  },
  statusText: {
    color: theme.colors.white,
    fontSize: 12,
    fontWeight: 'bold',
  },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.white,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  verifiedText: {
    color: theme.colors.primary,
    fontSize: 12,
    fontWeight: 'bold',
    marginLeft: 4,
  },
  shareButton: {
    position: 'absolute',
    top: 16,
    right: 16,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Tab styles
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: theme.colors.white,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.lightGray,
  },
  tabButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 8,
  },
  activeTabButton: {
    borderBottomWidth: 2,
    borderBottomColor: theme.colors.primary,
  },
  tabText: {
    marginLeft: 6,
    fontSize: 14,
    color: theme.colors.gray,
    fontWeight: '500',
  },
  activeTabText: {
    color: theme.colors.primary,
    fontWeight: '600',
  },
  tabContent: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },

  // Overview tab styles
  infoCard: {
    margin: 16,
    backgroundColor: theme.colors.white,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: theme.colors.dark,
    marginBottom: 12,
  },
  infoRow: {
    marginBottom: 12,
  },
  infoLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.dark,
    marginBottom: 4,
  },
  infoValue: {
    fontSize: 14,
    color: theme.colors.gray,
    lineHeight: 20,
  },
  categoriesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 4,
  },
  categoryBadge: {
    backgroundColor: theme.colors.primaryLight,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginRight: 8,
    marginBottom: 4,
  },
  categoryText: {
    fontSize: 12,
    color: theme.colors.white,
    fontWeight: '500',
  },
  addressContainer: {
    marginBottom: 0,
  },
  addressDetails: {
    marginTop: 4,
  },
  addressText: {
    fontSize: 14,
    color: theme.colors.gray,
    lineHeight: 20,
  },
  phoneContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  phoneText: {
    fontSize: 14,
    color: theme.colors.primary,
    fontWeight: '500',
    marginLeft: 6,
  },

  // Map styles
  mapCard: {
    margin: 16,
    marginTop: 8,
    backgroundColor: theme.colors.white,
  },
  mapContainer: {
    height: 200,
    borderRadius: 8,
    overflow: 'hidden',
  },
  map: {
    flex: 1,
  },

  // Business details styles
  businessRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  businessDetail: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  businessLabel: {
    fontSize: 12,
    color: theme.colors.gray,
    marginBottom: 4,
  },
  businessValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: theme.colors.dark,
  },

  // Products tab styles
  productsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  productsCount: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.dark,
  },
  viewAllText: {
    fontSize: 14,
    color: theme.colors.primary,
    fontWeight: '600',
  },
  productsGrid: {
    paddingHorizontal: 16,
  },
  productRow: {
    justifyContent: 'space-between',
  },
  productCard: {
    backgroundColor: theme.colors.white,
    borderRadius: 12,
    marginBottom: 16,
    ...theme.shadow.small,
  },
  productImageContainer: {
    position: 'relative',
    height: 120,
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
    overflow: 'hidden',
  },
  productImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  productImagePlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.colors.lightGray,
  },
  discountBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: theme.colors.success,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  discountText: {
    color: theme.colors.white,
    fontSize: 10,
    fontWeight: 'bold',
  },
  productInfo: {
    padding: 12,
  },
  productName: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.dark,
    marginBottom: 6,
  },
  productPriceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  productPrice: {
    fontSize: 16,
    fontWeight: 'bold',
    color: theme.colors.primary,
    marginRight: 6,
  },
  originalProductPrice: {
    fontSize: 12,
    color: theme.colors.gray,
    textDecorationLine: 'line-through',
  },
  productRatingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  productRatingText: {
    fontSize: 12,
    color: theme.colors.gray,
    marginLeft: 4,
  },
  viewAllButton: {
    margin: 16,
  },

  // Reviews tab styles
  reviewsCard: {
    margin: 16,
    backgroundColor: theme.colors.white,
  },
  reviewsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  reviewsHeaderLeft: {
    flex: 1,
  },
  addReviewButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    marginLeft: 12,
  },
  addReviewText: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.white,
    marginLeft: 4,
  },
  overallRating: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  overallRatingText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: theme.colors.dark,
    marginLeft: 8,
  },
  reviewItem: {
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.lightGray,
    paddingVertical: 12,
  },
  reviewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  reviewerName: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.dark,
  },
  reviewText: {
    fontSize: 14,
    color: theme.colors.gray,
    lineHeight: 20,
    marginBottom: 4,
  },
  reviewDate: {
    fontSize: 12,
    color: theme.colors.gray,
  },
  showMoreReviews: {
    alignItems: 'center',
    paddingTop: 12,
  },
  showMoreReviewsText: {
    fontSize: 14,
    color: theme.colors.primary,
    fontWeight: '600',
  },

  // Empty state styles
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyText: {
    fontSize: 16,
    color: theme.colors.gray,
    marginTop: 16,
    textAlign: 'center',
  },

  bottomSpacing: {
    height: 20,
  },
});

export default memo(ShopDetailsScreen); 
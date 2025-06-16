import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  Dimensions,
  ActivityIndicator,
  Alert,
  Share,
  Platform,
  useWindowDimensions,
} from 'react-native';
import { useNavigation, RouteProp } from '@react-navigation/native';
import { useRoute } from '@react-navigation/core';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSelector, useDispatch } from 'react-redux';

import { MainStackParamList } from '../navigation/types';
import { Product } from '../types/product';
import { Shop } from '../types/shop';
import * as productApi from '../api/productApi';
import { theme } from '../theme';
import ScreenHeader from '../components/ScreenHeader';
import Button from '../components/Button';
import MapView from '../components/MapView';
import Card3D from '../components/Card3D';
import AddReviewModal from '../components/AddReviewModal';
import { RootState, AppDispatch } from '../store';
import { LocationService } from '../services/LocationService';
import alert from '../utils/alert';

type ProductDetailsScreenRouteProp = RouteProp<MainStackParamList, 'ProductDetails'>;
type ProductDetailsScreenNavigationProp = NativeStackNavigationProp<MainStackParamList, 'ProductDetails'>;

const { width: screenWidth } = Dimensions.get('window');

const ProductDetailsScreen: React.FC = () => {
  const route = useRoute<ProductDetailsScreenRouteProp>();
  const navigation = useNavigation<ProductDetailsScreenNavigationProp>();
  const dispatch = useDispatch<AppDispatch>();
  const { user } = useSelector((state: RootState) => state.auth);
  const dimensions = useWindowDimensions();

  const { productId } = route.params;

  // State management
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [imageLoading, setImageLoading] = useState(true);
  const [addingToCart, setAddingToCart] = useState(false);
  const [quantity, setQuantity] = useState(1);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [showFullDescription, setShowFullDescription] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [shopDistance, setShopDistance] = useState<{
    distance: number;
    distanceText: string;
    duration?: string;
  } | null>(null);
  const [calculatingDistance, setCalculatingDistance] = useState(false);
  const [showReviewModal, setShowReviewModal] = useState(false);

  // Responsive calculations
  const imageHeight = dimensions.width < 380 ? 250 : 300;
  const cardPadding = dimensions.width < 380 ? 12 : 16;

  // Fetch product details
  const fetchProductDetails = useCallback(async () => {
    try {
      setLoading(true);
      const response = await productApi.getProduct(productId);
      
      if (response.success && response.data) {
        setProduct(response.data);
      } else {
        throw new Error('Product not found');
      }
    } catch (error) {
      console.error('Error fetching product details:', error);
      alert('Error', 'Failed to load product details. Please try again.');
      navigation.goBack();
    } finally {
      setLoading(false);
    }
  }, [productId, navigation]);

  // Calculate shop distance
  const calculateShopDistance = useCallback(async () => {
    if (!product?.shop?.location?.coordinates || product.shop.location.coordinates.length !== 2) {
      return;
    }

    try {
      setCalculatingDistance(true);
      const userLocation = await LocationService.getCurrentLocation();
      
      const shopLocation = {
        latitude: product.shop.location.coordinates[1],
        longitude: product.shop.location.coordinates[0],
      };

      const distanceResult = await LocationService.calculateShopDistance(userLocation, shopLocation);
      setShopDistance(distanceResult);
    } catch (error) {
      console.error('Error calculating shop distance:', error);
      // Set fallback distance
      setShopDistance({
        distance: 0,
        distanceText: 'Distance unavailable',
        duration: undefined,
      });
    } finally {
      setCalculatingDistance(false);
    }
  }, [product]);

  // Initial load
  useEffect(() => {
    fetchProductDetails();
  }, [fetchProductDetails]);

  // Calculate distance when product changes
  useEffect(() => {
    if (product) {
      calculateShopDistance();
    }
  }, [product, calculateShopDistance]);

  // Handle refresh
  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchProductDetails();
    setRefreshing(false);
  }, [fetchProductDetails]);

  // Navigate to shop details
  const navigateToShop = useCallback(() => {
    if (product?.shop?._id) {
      navigation.navigate('ShopDetails', { shopId: product.shop._id });
    }
  }, [product, navigation]);

  // Add to cart functionality
  const handleAddToCart = useCallback(async () => {
    if (!user) {
      alert('Please Login', 'You need to login to add items to cart');
      return;
    }

    if (!product) return;

    try {
      setAddingToCart(true);
      
      // Here you would implement your cart API call
      // await cartApi.addToCart(product._id, quantity);
      
      alert('Success', `${product.name} added to cart!`);
    } catch (error) {
      console.error('Error adding to cart:', error);
      alert('Error', 'Failed to add item to cart. Please try again.');
    } finally {
      setAddingToCart(false);
    }
  }, [user, product, quantity]);

  // Share product
  const handleShare = useCallback(async () => {
    if (!product) return;

    try {
      const message = `Check out this product: ${product.name}\nPrice: ₹${product.price}\nShop: ${product.shop?.name || 'Unknown'}`;
      
      await Share.share({
        message,
        title: product.name,
        url: Platform.OS === 'ios' ? '' : undefined,
      });
    } catch (error) {
      console.error('Error sharing product:', error);
    }
  }, [product]);

  // Add product review
  const handleAddReview = useCallback(async (rating: number, text: string) => {
    if (!user) {
      alert('Please Login', 'You need to login to add a review');
      return;
    }

    if (!product) return;

    try {
      await productApi.addProductReview(product._id, { rating, text });
      
      // Refresh product details to show new review
      await fetchProductDetails();
      
      alert('Success', 'Your review has been added successfully!');
    } catch (error) {
      console.error('Error adding review:', error);
      throw new Error('Failed to add review. Please try again.');
    }
  }, [user, product, fetchProductDetails]);

  // Render stars for rating
  const renderStars = (rating: number, size: number = 16) => {
    const stars = [];
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 !== 0;

    for (let i = 0; i < fullStars; i++) {
      stars.push(
        <Ionicons key={i} name="star" size={size} color={theme.colors.warning} />
      );
    }

    if (hasHalfStar) {
      stars.push(
        <Ionicons key="half" name="star-half" size={size} color={theme.colors.warning} />
      );
    }

    const emptyStars = 5 - Math.ceil(rating);
    for (let i = 0; i < emptyStars; i++) {
      stars.push(
        <Ionicons key={`empty-${i}`} name="star-outline" size={size} color={theme.colors.gray} />
      );
    }

    return <View style={styles.starsContainer}>{stars}</View>;
  };

  // Render product images
  const renderProductImages = () => {
    if (!product) return null;

    const images = product.image ? [product.image] : [];
    
    if (images.length === 0) {
      return (
        <View style={[styles.imageContainer, { height: imageHeight }]}>
          <View style={styles.placeholderImage}>
            <Ionicons name="image-outline" size={60} color={theme.colors.gray} />
            <Text style={styles.placeholderText}>No Image</Text>
          </View>
        </View>
      );
    }

    return (
      <View style={[styles.imageContainer, { height: imageHeight }]}>
        <Image
          source={{ uri: images[selectedImageIndex] }}
          style={styles.productImage}
          onLoadStart={() => setImageLoading(true)}
          onLoadEnd={() => setImageLoading(false)}
        />
        {imageLoading && (
          <View style={styles.imageLoader}>
            <ActivityIndicator size="large" color={theme.colors.primary} />
          </View>
        )}
        
        {/* Share button */}
        <TouchableOpacity style={styles.shareButton} onPress={handleShare}>
          <Ionicons name="share-outline" size={24} color={theme.colors.dark} />
        </TouchableOpacity>
      </View>
    );
  };

  // Render product info
  const renderProductInfo = () => {
    if (!product) return null;
    console.log("Product ",product);
    const discountedPrice = product.discount > 0 
      ? product.price - (product.price * product.discount / 100)
      : product.price;

    return (
      <Card3D style={[styles.infoCard, { padding: cardPadding }]}>
        <Text style={styles.productName}>{product.name}</Text>
        
        {/* Price and discount */}
        <View style={styles.priceContainer}>
          <Text style={styles.currentPrice}>₹{discountedPrice.toFixed(2)}</Text>
          {product.discount > 0 && (
            <>
              <Text style={styles.originalPrice}>₹{product.price.toFixed(2)}</Text>
              <View style={styles.discountBadge}>
                <Text style={styles.discountText}>{product.discount}% OFF</Text>
              </View>
            </>
          )}
        </View>
        {product.category === "Paints" && product.colors && product.colors.length > 0 && (
                    <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>Colors:</Text>
                        <View style={styles.colorsContainer}>
                            {product.colors.map((color, index) => (
                                <View key={index} style={styles.colorChip}>
                                    <Text style={styles.colorText}>{color}</Text>
                                </View>
                            ))}
                        </View>
                    </View>
                )}
        {/* Rating */}
        <View style={styles.ratingContainer}>
          {renderStars(product.rating || 0)}
          <Text style={styles.ratingText}>
            {(product.rating || 0).toFixed(1)} ({product.reviews?.length || 0} reviews)
          </Text>
        </View>

        {/* Stock status */}
        <View style={styles.stockContainer}>
          <Ionicons 
            name={product.stock > 0 ? "checkmark-circle" : "close-circle"} 
            size={16} 
            color={product.stock > 0 ? theme.colors.success : theme.colors.error} 
          />
          <Text style={[
            styles.stockText,
            { color: product.stock > 0 ? theme.colors.success : theme.colors.error }
          ]}>
            {product.stock > 0 ? `In Stock (${product.stock} ${product.units || 'units'})` : 'Out of Stock'}
          </Text>
        </View>

        {/* Description */}
        <View style={styles.descriptionContainer}>
          <Text style={styles.sectionTitle}>Description</Text>
          <Text 
            style={styles.description}
            numberOfLines={showFullDescription ? undefined : 3}
          >
            {product.description || 'No description available'}
          </Text>
          {product.description && product.description.length > 100 && (
            <TouchableOpacity onPress={() => setShowFullDescription(!showFullDescription)}>
              <Text style={styles.readMoreText}>
                {showFullDescription ? 'Read Less' : 'Read More'}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </Card3D>
    );
  };

  // Render shop info
  const renderShopInfo = () => {
    if (!product?.shop) return null;

    return (
      <Card3D style={[styles.shopCard, { padding: cardPadding }]}>
        <TouchableOpacity style={styles.shopHeader} onPress={navigateToShop}>
          <View style={styles.shopImageContainer}>
            {product.shop.image ? (
              <Image source={{ uri: product.shop.image }} style={styles.shopImage} />
            ) : (
              <View style={styles.shopImagePlaceholder}>
                <Ionicons name="storefront-outline" size={24} color={theme.colors.gray} />
              </View>
            )}
          </View>
          
          <View style={styles.shopDetails}>
            <Text style={styles.shopName}>{product.shop.name}</Text>
            {(product.shop.location || shopDistance) && (
              <View style={styles.shopLocationContainer}>
                <Ionicons name="location-outline" size={14} color={theme.colors.gray} />
                <Text style={styles.shopLocation}>
                  {product.shop.address?.village || 'Location not available'}
                  {calculatingDistance && ' • Calculating distance...'}
                  {!calculatingDistance && shopDistance && ` • ${shopDistance.distanceText}`}
                  {!calculatingDistance && shopDistance?.duration && ` (${shopDistance.duration})`}
                  {!calculatingDistance && !shopDistance && product.shop.distance && ` • ${product.shop.distance} km`}
                </Text>
              </View>
            )}
            {renderStars(product.shop.rating || 0, 14)}
          </View>
          
          <Ionicons name="chevron-forward" size={20} color={theme.colors.gray} />
        </TouchableOpacity>
      </Card3D>
    );
  };

  // Render quantity selector
  const renderQuantitySelector = () => (
    <View style={styles.quantityContainer}>
      <Text style={styles.quantityLabel}>Quantity:</Text>
      <View style={styles.quantitySelector}>
        <TouchableOpacity
          style={[styles.quantityButton, quantity <= 1 && styles.quantityButtonDisabled]}
          onPress={() => setQuantity(Math.max(1, quantity - 1))}
          disabled={quantity <= 1}
        >
          <Ionicons name="remove" size={20} color={quantity <= 1 ? theme.colors.gray : theme.colors.dark} />
        </TouchableOpacity>
        
        <Text style={styles.quantityText}>{quantity}</Text>
        
        <TouchableOpacity
          style={[styles.quantityButton, quantity >= (product?.stock || 1) && styles.quantityButtonDisabled]}
          onPress={() => setQuantity(Math.min(product?.stock || 1, quantity + 1))}
          disabled={quantity >= (product?.stock || 1)}
        >
          <Ionicons name="add" size={20} color={quantity >= (product?.stock || 1) ? theme.colors.gray : theme.colors.dark} />
        </TouchableOpacity>
      </View>
    </View>
  );

  // Render reviews section
  const renderReviews = () => {
    return (
      <Card3D style={[styles.reviewsCard, { padding: cardPadding }]}>
        <View style={styles.reviewsHeader}>
          <View style={styles.reviewsHeaderLeft}>
            <Text style={styles.sectionTitle}>
              Reviews ({product?.reviews?.length || 0})
            </Text>
            {product && product.reviews && product.reviews.length > 0 && (
              <View style={styles.reviewsStats}>
                {renderStars(product.rating || 0, 14)}
                <Text style={styles.averageRating}>
                  {(product.rating || 0).toFixed(1)}
                </Text>
              </View>
            )}
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

        {!product?.reviews || product.reviews.length === 0 ? (
          <View style={styles.noReviewsContainer}>
            <Ionicons name="star-outline" size={48} color={theme.colors.gray} />
            <Text style={styles.noReviewsText}>No reviews yet</Text>
            <Text style={styles.noReviewsSubtext}>
              Be the first to review this product!
            </Text>
          </View>
        ) : (
          <>
            {product.reviews.slice(0, 3).map((review, index) => (
              <View key={index} style={styles.reviewItem}>
                <View style={styles.reviewHeader}>
                  <Text style={styles.reviewerName}>{review.user.name}</Text>
                  {renderStars(review.rating, 12)}
                </View>
                <Text style={styles.reviewText}>{review.text}</Text>
                <Text style={styles.reviewDate}>
                  {new Date(review.createdAt).toLocaleDateString()}
                </Text>
              </View>
            ))}
            
            {product.reviews.length > 3 && (
              <TouchableOpacity style={styles.viewAllReviews}>
                <Text style={styles.viewAllReviewsText}>View All Reviews</Text>
              </TouchableOpacity>
            )}
          </>
        )}
      </Card3D>
    );
  };

  // Loading state
  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text style={styles.loadingText}>Loading product details...</Text>
      </View>
    );
  }

  // Error state
  if (!product) {
    return (
      <View style={styles.errorContainer}>
        <Ionicons name="alert-circle-outline" size={64} color={theme.colors.error} />
        <Text style={styles.errorText}>Product not found</Text>
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
        title="Product Details"
        showBackButton={true}
      />
      
      <ScrollView 
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
      >
        {renderProductImages()}
        {renderProductInfo()}
        {renderShopInfo()}
        {renderReviews()}
        
        <View style={styles.bottomSpacing} />
      </ScrollView>

      {/* Bottom action bar */}
      <View style={styles.bottomBar}>
        {renderQuantitySelector()}
        <Button
          title={addingToCart ? "Adding..." : "Add to Cart"}
          onPress={handleAddToCart}
          loading={addingToCart}
          disabled={product.stock <= 0 || addingToCart}
          style={[styles.addToCartButton, product.stock <= 0 && styles.disabledButton]}
        />
      </View>

      {/* Add Review Modal */}
      <AddReviewModal
        visible={showReviewModal}
        onClose={() => setShowReviewModal(false)}
        onSubmit={handleAddReview}
        title="Review Product"
        subtitle={product?.name}
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

  // Image styles
  imageContainer: {
    position: 'relative',
    backgroundColor: theme.colors.white,
  },
  productImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  imageLoader: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.colors.lightGray,
  },
  placeholderImage: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.colors.lightGray,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  detailLabel: {
    fontSize: 14,
    fontWeight: 'bold',
    color: theme.colors.dark,
    marginRight: 8,
  },
  detailValue: {
    fontSize: 14,
    color: theme.colors.gray,
  },
  colorsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 4,
  },
  colorChip: {
    backgroundColor: theme.colors.secondary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginRight: 8,
    marginBottom: 8,
  },
  colorText: {
    color: theme.colors.dark,
    fontSize: 14,
    fontWeight: '500',
  },
  placeholderText: {
    marginTop: 8,
    fontSize: 14,
    color: theme.colors.gray,
  },
  shareButton: {
    position: 'absolute',
    top: 16,
    right: 16,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: theme.colors.white,
    justifyContent: 'center',
    alignItems: 'center',
    ...theme.shadow.small,
  },

  // Info card styles
  infoCard: {
    margin: 16,
    backgroundColor: theme.colors.white,
  },
  productName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: theme.colors.dark,
    marginBottom: 12,
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    flexWrap: 'wrap',
  },
  currentPrice: {
    fontSize: 20,
    fontWeight: 'bold',
    color: theme.colors.primary,
    marginRight: 12,
  },
  originalPrice: {
    fontSize: 16,
    color: theme.colors.gray,
    textDecorationLine: 'line-through',
    marginRight: 8,
  },
  discountBadge: {
    backgroundColor: theme.colors.success,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  discountText: {
    color: theme.colors.white,
    fontSize: 12,
    fontWeight: 'bold',
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  starsContainer: {
    flexDirection: 'row',
    marginRight: 8,
  },
  ratingText: {
    fontSize: 14,
    color: theme.colors.gray,
  },
  stockContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  stockText: {
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 6,
  },
  descriptionContainer: {
    marginTop: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: theme.colors.dark,
    marginBottom: 8,
  },
  description: {
    fontSize: 15,
    color: theme.colors.gray,
    lineHeight: 22,
  },
  readMoreText: {
    fontSize: 14,
    color: theme.colors.primary,
    fontWeight: '600',
    marginTop: 8,
  },

  // Shop card styles
  shopCard: {
    margin: 16,
    marginTop: 8,
    backgroundColor: theme.colors.white,
  },
  shopHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  shopImageContainer: {
    width: 50,
    height: 50,
    marginRight: 12,
  },
  shopImage: {
    width: 50,
    height: 50,
    borderRadius: 25,
  },
  shopImagePlaceholder: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: theme.colors.lightGray,
    justifyContent: 'center',
    alignItems: 'center',
  },
  shopDetails: {
    flex: 1,
  },
  shopName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: theme.colors.dark,
    marginBottom: 4,
  },
  shopLocationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  shopLocation: {
    fontSize: 12,
    color: theme.colors.gray,
    marginLeft: 4,
  },

  // Reviews styles
  reviewsCard: {
    margin: 16,
    marginTop: 8,
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
  reviewsStats: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  averageRating: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.dark,
    marginLeft: 8,
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
  noReviewsContainer: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  noReviewsText: {
    fontSize: 16,
    color: theme.colors.gray,
    textAlign: 'center',
    fontWeight: '500',
    marginTop: 12,
  },
  noReviewsSubtext: {
    fontSize: 14,
    color: theme.colors.gray,
    textAlign: 'center',
    marginTop: 4,
    fontStyle: 'italic',
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
  viewAllReviews: {
    alignItems: 'center',
    paddingTop: 12,
  },
  viewAllReviewsText: {
    fontSize: 14,
    color: theme.colors.primary,
    fontWeight: '600',
  },

  // Bottom bar styles
  bottomBar: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: theme.colors.white,
    borderTopWidth: 1,
    borderTopColor: theme.colors.lightGray,
    ...theme.shadow.small,
  },
  quantityContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 16,
  },
  quantityLabel: {
    fontSize: 14,
    color: theme.colors.dark,
    marginRight: 8,
  },
  quantitySelector: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 8,
  },
  quantityButton: {
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
  quantityButtonDisabled: {
    opacity: 0.5,
  },
  quantityText: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.dark,
    paddingHorizontal: 16,
    minWidth: 40,
    textAlign: 'center',
  },
  addToCartButton: {
    flex: 1,
  },
  disabledButton: {
    opacity: 0.5,
  },
  bottomSpacing: {
    height: 20,
  },
});

export default ProductDetailsScreen; 
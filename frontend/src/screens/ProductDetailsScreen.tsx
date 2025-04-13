import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  Dimensions,
  RefreshControl,
  TextInput,
  Alert,
} from 'react-native';
import { FontAwesome } from '@expo/vector-icons';
import { useSelector, useDispatch } from 'react-redux';

import { RootState, AppDispatch } from '../store';
import { theme } from '../theme';
import { getProduct } from '../store/productSlice';
import { addToCart } from '../store/cartSlice';
import { useNavigation, useRoute } from '../navigation/hooks';
import Card3D from '../components/Card3D';
import * as productApi from '../api/productApi';
import { LocationService, Coordinates } from '../services/LocationService';

const { width } = Dimensions.get('window');

const ProductDetailsScreen: React.FC = () => {
  const route = useRoute<'ProductDetails'>();
  const navigation = useNavigation<'ProductDetails'>();
  const dispatch = useDispatch<AppDispatch>();
  
  const { productId } = route.params;
  const [quantity, setQuantity] = useState(1);
  const [refreshing, setRefreshing] = useState(false);
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [reviewText, setReviewText] = useState('');
  const [reviewRating, setReviewRating] = useState(5);
  const [submittingReview, setSubmittingReview] = useState(false);
  const [userLocation, setUserLocation] = useState<Coordinates | null>(null);
  const [localProduct, setLocalProduct] = useState<any>(null);
  
  const { product, loading, error } = useSelector((state: RootState) => state.product);
  
  // Get user location
  useEffect(() => {
    const getUserLocation = async () => {
      try {
        const location = await LocationService.getCurrentLocation();
        setUserLocation(location);
        
        // Once we have the location, fetch the product with distance
        if (location) {
          try {
            const response = await productApi.getProductWithDistance(productId, location);
            setLocalProduct(response.data);
          } catch (err) {
            console.error("Error fetching product with distance:", err);
          }
        }
      } catch (error) {
        console.error('Error getting user location:', error);
      }
    };
    
    getUserLocation();
  }, [productId]);
  
  // Fetch product from Redux store
  useEffect(() => {
    dispatch(getProduct(productId));
  }, [dispatch, productId]);
  
  const handleRefresh = async () => {
    setRefreshing(true);
    
    // Refresh both standard product data and location-aware product data
    await dispatch(getProduct(productId));
    
    if (userLocation) {
      try {
        const response = await productApi.getProductWithDistance(productId, userLocation);
        setLocalProduct(response.data);
      } catch (err) {
        console.error("Error refreshing product with distance:", err);
      }
    }
    
    setRefreshing(false);
  };

  // Use merged product data (preferring local product with distance info if available)
  const productData = localProduct || product;
  
  const handleAddToCart = () => {
    if (productData) {
      dispatch(addToCart({ productId, quantity }));
    }
  };
  
  const handleQuantityChange = (value: number) => {
    const newQuantity = quantity + value;
    if (newQuantity >= 1 && productData && newQuantity <= productData.stock) {
      setQuantity(newQuantity);
    }
  };
  
  const handleGoBack = () => {
    navigation.goBack();
  };
  
  const handleSubmitReview = async () => {
    if (!productData) return;
    
    if (!reviewText.trim()) {
      Alert.alert('Review Required', 'Please enter review text');
      return;
    }
    
    try {
      setSubmittingReview(true);
      await productApi.addProductReview(productId, {
        rating: reviewRating,
        text: reviewText
      });
      
      // Refresh product data to show the new review
      dispatch(getProduct(productId));
      setShowReviewForm(false);
      setReviewText('');
      setReviewRating(5);
      Alert.alert('Success', 'Your review has been submitted!');
    } catch (error) {
      console.error('Failed to submit review:', error);
      Alert.alert('Error', 'Failed to submit review. Please try again later.');
    } finally {
      setSubmittingReview(false);
    }
  };
  
  const renderStarRating = (rating: number, size: number, interactive: boolean = false) => {
    return (
      <View style={{ flexDirection: 'row' }}>
        {[1, 2, 3, 4, 5].map((star) => (
          <TouchableOpacity 
            key={star} 
            onPress={() => interactive && setReviewRating(star)}
            disabled={!interactive}
          >
            <FontAwesome
              name={star <= rating ? 'star' : 'star-o'}
              size={size}
              color={star <= rating ? '#FFD700' : theme.colors.textLight}
              style={{ marginRight: 2 }}
            />
          </TouchableOpacity>
        ))}
      </View>
    );
  };
  
  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }
  
  if (error || !productData) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>
          {error || 'Product not found. Please try again.'}
        </Text>
        <TouchableOpacity style={styles.backButton} onPress={handleGoBack}>
          <Text style={styles.backButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }
  
  // Calculate discounted price if there's a discount
  const discountedPrice = productData.discount > 0 
    ? productData.price - (productData.price * (productData.discount / 100))
    : null;
  
  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.backIconButton} onPress={handleGoBack}>
        <FontAwesome name="arrow-left" size={20} color={theme.colors.dark} />
      </TouchableOpacity>
      
      <ScrollView 
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      >
        <Image 
          source={{ uri: productData.image || 'https://via.placeholder.com/400' }}
          style={styles.productImage}
          resizeMode="cover"
        />
        
        <View style={styles.contentContainer}>
          <Text style={styles.productName}>{productData.name}</Text>
          
          <View style={styles.categoryContainer}>
            <Text style={styles.categoryText}>{productData.category}</Text>
            <Text style={styles.typeText}>{productData.type}</Text>
          </View>
          
          <View style={styles.priceContainer}>
            {discountedPrice ? (
              <>
                <Text style={styles.priceLabel}>Price:</Text>
                <Text style={[styles.priceValue, styles.strikethrough]}>
                  ₹{productData.price.toFixed(2)}
                </Text>
                <Text style={styles.discountedPrice}>
                  ₹{discountedPrice.toFixed(2)}
                </Text>
                <View style={styles.discountBadge}>
                  <Text style={styles.discountText}>{productData.discount}% OFF</Text>
                </View>
              </>
            ) : (
              <>
                <Text style={styles.priceLabel}>Price:</Text>
                <Text style={styles.priceValue}>₹{productData.price.toFixed(2)}</Text>
              </>
            )}
          </View>
          
          <View style={styles.stockInfo}>
            <Text style={[
              styles.stockText, 
              productData.stock > 0 ? styles.inStock : styles.outOfStock
            ]}>
              {productData.stock > 0 ? `In Stock (${productData.stock} ${productData.units})` : 'Out of Stock'}
            </Text>
          </View>
          
          <View style={styles.ratingContainer}>
            <FontAwesome name="star" size={16} color="#FFD700" />
            <Text style={styles.ratingText}>{productData.rating.toFixed(1)}</Text>
            <Text style={styles.reviewCountText}>(
              {productData.reviews ? productData.reviews.length : 0} reviews)
            </Text>
          </View>
          
          <View style={styles.divider} />
          
          <Text style={styles.sectionTitle}>Description</Text>
          <Text style={styles.descriptionText}>{productData.description}</Text>
          
          <View style={styles.divider} />
          
          {productData.vendor && (
            <>
              <Text style={styles.sectionTitle}>Sold By</Text>
              <TouchableOpacity 
                style={styles.vendorContainer}
                onPress={() => navigation.navigate('ShopDetails', { shopId: productData.shop._id })}
              >
                <View style={styles.vendorInfo}>
                  <Text style={styles.vendorName}>{productData.shop.name}</Text>
                  
                  {productData.shop.distance && (
                    <View style={styles.distanceContainer}>
                      <FontAwesome name="map-marker" size={14} color={theme.colors.primary} />
                      <Text style={styles.distanceText}>
                        {typeof productData.shop.distance === 'string' 
                          ? productData.shop.distance 
                          : LocationService.formatDistance(productData.shop.distance as number)} away
                      </Text>
                    </View>
                  )}
                </View>
                <FontAwesome name="chevron-right" size={14} color={theme.colors.textLight} />
              </TouchableOpacity>
              <View style={styles.divider} />
            </>
          )}
          
          {productData.reviews && productData.reviews.length > 0 && (
            <>
              <Text style={styles.sectionTitle}>Reviews</Text>
              {productData.reviews.slice(0, 3).map((review: any, index: number) => (
                <View key={index} style={styles.reviewItem}>
                  <View style={styles.reviewHeader}>
                    <Text style={styles.reviewerName}>{review.user.name}</Text>
                    <View style={styles.reviewRating}>
                      <FontAwesome name="star" size={14} color="#FFD700" />
                      <Text style={styles.reviewRatingText}>{review.rating}</Text>
                    </View>
                  </View>
                  <Text style={styles.reviewText}>{review.text}</Text>
                  <Text style={styles.reviewDate}>
                    {new Date(review.createdAt).toLocaleDateString()}
                  </Text>
                </View>
              ))}
              
              {productData.reviews.length > 3 && (
                <TouchableOpacity style={styles.moreReviewsButton}>
                  <Text style={styles.moreReviewsText}>
                    See all {productData.reviews.length} reviews
                  </Text>
                </TouchableOpacity>
              )}
            </>
          )}
          
          {!showReviewForm ? (
            <TouchableOpacity 
              style={styles.addReviewButton}
              onPress={() => setShowReviewForm(true)}
            >
              <Text style={styles.addReviewText}>Add Review</Text>
            </TouchableOpacity>
          ) : (
            <Card3D style={styles.reviewFormContainer} elevation="medium">
              <Text style={styles.reviewFormTitle}>Write a Review</Text>
              
              <Text style={styles.ratingLabel}>Rating:</Text>
              <View style={styles.ratingSelector}>
                {renderStarRating(reviewRating, 24, true)}
              </View>
              
              <TextInput
                style={styles.reviewInput}
                placeholder="Write your review here..."
                value={reviewText}
                onChangeText={setReviewText}
                multiline
                numberOfLines={4}
                maxLength={200}
              />
              
              <View style={styles.reviewFormButtons}>
                <TouchableOpacity 
                  style={[styles.reviewButton, styles.cancelButton]}
                  onPress={() => {
                    setShowReviewForm(false);
                    setReviewText('');
                    setReviewRating(5);
                  }}
                >
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={[
                    styles.reviewButton, 
                    styles.submitButton,
                    submittingReview && styles.disabledButton
                  ]}
                  onPress={handleSubmitReview}
                  disabled={submittingReview}
                >
                  {submittingReview ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <Text style={styles.submitButtonText}>Submit</Text>
                  )}
                </TouchableOpacity>
              </View>
            </Card3D>
          )}
        </View>
      </ScrollView>
      
      <View style={styles.divider} />
      
      <View style={styles.footer}>
        <View style={styles.quantityContainer}>
          <TouchableOpacity 
            style={[
              styles.quantityButton,
              quantity <= 1 && styles.quantityButtonDisabled
            ]}
            onPress={() => handleQuantityChange(-1)}
            disabled={quantity <= 1}
          >
            <FontAwesome 
              name="minus" 
              size={16} 
              color={quantity <= 1 ? theme.colors.textLight : theme.colors.text} 
            />
          </TouchableOpacity>
          
          <Text style={styles.quantityText}>{quantity}</Text>
          
          <TouchableOpacity 
            style={[
              styles.quantityButton,
              quantity >= productData.stock && styles.quantityButtonDisabled
            ]}
            onPress={() => handleQuantityChange(1)}
            disabled={quantity >= productData.stock}
          >
            <FontAwesome 
              name="plus" 
              size={16} 
              color={quantity >= productData.stock ? theme.colors.textLight : theme.colors.text} 
            />
          </TouchableOpacity>
        </View>
        
        <TouchableOpacity 
          style={[
            styles.addToCartButton,
            productData.stock <= 0 && styles.disabledButton
          ]}
          onPress={handleAddToCart}
          disabled={productData.stock <= 0}
        >
          <FontAwesome name="shopping-cart" size={18} color={theme.colors.white} />
          <Text style={styles.addToCartText}>
            {productData.stock > 0 ? 'Add to Cart' : 'Out of Stock'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
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
    fontSize: 16,
    color: theme.colors.error,
    textAlign: 'center',
    marginBottom: 20,
  },
  backButton: {
    backgroundColor: theme.colors.primary,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 25,
  },
  backButtonText: {
    color: theme.colors.white,
    fontWeight: 'bold',
  },
  backIconButton: {
    position: 'absolute',
    top: 40,
    left: 20,
    zIndex: 10,
    backgroundColor: theme.colors.white,
    borderRadius: 20,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: theme.colors.dark,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 5,
  },
  productImage: {
    width: width,
    height: width * 0.8,
  },
  contentContainer: {
    padding: 16,
  },
  productName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: theme.colors.text,
    marginBottom: 8,
  },
  categoryContainer: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  categoryText: {
    fontSize: 16,
    color: theme.colors.textLight,
    backgroundColor: `${theme.colors.primary}15`,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 20,
    marginRight: 8,
  },
  typeText: {
    fontSize: 16,
    color: theme.colors.textLight,
    backgroundColor: `${theme.colors.secondary}15`,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 20,
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  priceLabel: {
    fontSize: 18,
    color: theme.colors.textLight,
    marginRight: 4,
  },
  priceValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: theme.colors.primary,
  },
  strikethrough: {
    textDecorationLine: 'line-through',
    color: theme.colors.textLight,
    fontSize: 20,
  },
  discountedPrice: {
    fontSize: 24,
    fontWeight: 'bold',
    color: theme.colors.primary,
    marginLeft: 8,
  },
  discountBadge: {
    backgroundColor: theme.colors.error,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 16,
    marginLeft: 8,
  },
  discountText: {
    color: theme.colors.white,
    fontSize: 12,
    fontWeight: 'bold',
  },
  stockInfo: {
    marginBottom: 8,
  },
  stockText: {
    fontSize: 16,
    fontWeight: '500',
  },
  inStock: {
    color: theme.colors.success,
  },
  outOfStock: {
    color: theme.colors.error,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  ratingText: {
    marginLeft: 4,
    fontSize: 14,
    color: theme.colors.text,
  },
  reviewCountText: {
    fontSize: 14,
    color: theme.colors.textLight,
    marginLeft: 4,
  },
  divider: {
    height: 1,
    backgroundColor: theme.colors.border,
    marginVertical: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: theme.colors.text,
    marginBottom: 8,
  },
  descriptionText: {
    fontSize: 16,
    color: theme.colors.text,
    lineHeight: 24,
  },
  vendorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.white,
    padding: 12,
    borderRadius: 8,
    marginTop: 8,
  },
  vendorInfo: {
    flex: 1,
  },
  vendorName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: theme.colors.text,
  },
  reviewItem: {
    marginBottom: 12,
    padding: 12,
    backgroundColor: theme.colors.cardBg,
    borderRadius: 8,
  },
  reviewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  reviewerName: {
    fontSize: 16,
    fontWeight: '500',
    color: theme.colors.text,
  },
  reviewRating: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  reviewRatingText: {
    marginLeft: 4,
    color: theme.colors.text,
  },
  reviewText: {
    fontSize: 14,
    color: theme.colors.text,
    marginBottom: 4,
  },
  reviewDate: {
    fontSize: 12,
    color: theme.colors.textLight,
  },
  moreReviewsButton: {
    padding: 8,
    alignItems: 'center',
  },
  moreReviewsText: {
    color: theme.colors.primary,
    fontSize: 14,
  },
  footer: {
    flexDirection: 'row',
    padding: 16,
    backgroundColor: theme.colors.cardBg,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  quantityContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: theme.colors.background,
    borderRadius: 25,
    paddingHorizontal: 8,
  },
  quantityButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: theme.colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 4,
  },
  quantityButtonDisabled: {
    opacity: 0.5,
  },
  quantityText: {
    fontSize: 16,
    width: 30,
    textAlign: 'center',
  },
  addToCartButton: {
    flex: 1,
    flexDirection: 'row',
    height: 50,
    backgroundColor: theme.colors.primary,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 16,
  },
  disabledButton: {
    backgroundColor: theme.colors.textLight,
  },
  addToCartText: {
    color: theme.colors.white,
    marginLeft: 8,
    fontSize: 16,
    fontWeight: 'bold',
  },
  addReviewButton: {
    backgroundColor: theme.colors.primary,
    padding: 12,
    borderRadius: 8,
    marginHorizontal: 16,
    marginTop: 16,
    alignItems: 'center',
  },
  addReviewText: {
    color: theme.colors.white,
    fontWeight: 'bold',
    fontSize: 16,
  },
  reviewFormContainer: {
    backgroundColor: theme.colors.cardBg,
    borderRadius: 8,
    padding: 16,
    marginHorizontal: 16,
    marginTop: 16,
  },
  reviewFormTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: theme.colors.text,
    marginBottom: 12,
  },
  ratingLabel: {
    fontSize: 16,
    color: theme.colors.text,
    marginBottom: 8,
  },
  ratingSelector: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  reviewInput: {
    backgroundColor: theme.colors.background,
    borderRadius: 8,
    padding: 12,
    minHeight: 100,
    textAlignVertical: 'top',
    marginBottom: 16,
    borderColor: theme.colors.border,
    borderWidth: 1,
  },
  reviewFormButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  reviewButton: {
    padding: 12,
    borderRadius: 8,
    flex: 1,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: theme.colors.lightGray,
    marginRight: 8,
  },
  cancelButtonText: {
    color: theme.colors.text,
    fontWeight: 'bold',
  },
  submitButton: {
    backgroundColor: theme.colors.primary,
    marginLeft: 8,
  },
  submitButtonText: {
    color: theme.colors.white,
    fontWeight: 'bold',
  },
  distanceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  distanceText: {
    fontSize: 12,
    color: theme.colors.primary,
    fontWeight: '500',
    marginLeft: 4,
  },
});

export default ProductDetailsScreen; 
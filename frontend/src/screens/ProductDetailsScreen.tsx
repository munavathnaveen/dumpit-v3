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
} from 'react-native';
import { FontAwesome } from '@expo/vector-icons';
import { useSelector, useDispatch } from 'react-redux';

import { RootState, AppDispatch } from '../store';
import { theme } from '../theme';
import { getProduct } from '../store/productSlice';
import { addToCart } from '../store/cartSlice';
import { useNavigation, useRoute } from '../navigation/hooks';
import Card3D from '../components/Card3D';

const { width } = Dimensions.get('window');

const ProductDetailsScreen: React.FC = () => {
  const route = useRoute<'ProductDetails'>();
  const navigation = useNavigation<'ProductDetails'>();
  const dispatch = useDispatch<AppDispatch>();
  
  const { productId } = route.params;
  const [quantity, setQuantity] = useState(1);
  
  const { product, loading, error } = useSelector((state: RootState) => state.product);
  
  useEffect(() => {
    dispatch(getProduct(productId));
  }, [dispatch, productId]);
  
  const handleAddToCart = () => {
    if (product) {
      dispatch(addToCart({ productId, quantity }));
    }
  };
  
  const handleQuantityChange = (value: number) => {
    const newQuantity = quantity + value;
    if (newQuantity >= 1 && product && newQuantity <= product.stock) {
      setQuantity(newQuantity);
    }
  };
  
  const handleGoBack = () => {
    navigation.goBack();
  };
  
  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }
  
  if (error || !product) {
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
  const discountedPrice = product.discount > 0 
    ? product.price - (product.price * (product.discount / 100))
    : null;
  
  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.backIconButton} onPress={handleGoBack}>
        <FontAwesome name="arrow-left" size={20} color={theme.colors.dark} />
      </TouchableOpacity>
      
      <ScrollView showsVerticalScrollIndicator={false}>
        <Image 
          source={{ uri: product.image || 'https://via.placeholder.com/400' }}
          style={styles.productImage}
          resizeMode="cover"
        />
        
        <View style={styles.contentContainer}>
          <Text style={styles.productName}>{product.name}</Text>
          
          <View style={styles.categoryContainer}>
            <Text style={styles.categoryText}>{product.category}</Text>
            <Text style={styles.typeText}>{product.type}</Text>
          </View>
          
          <View style={styles.priceContainer}>
            {discountedPrice ? (
              <>
                <Text style={styles.priceLabel}>Price:</Text>
                <Text style={[styles.priceValue, styles.strikethrough]}>
                  ₹{product.price.toFixed(2)}
                </Text>
                <Text style={styles.discountedPrice}>
                  ₹{discountedPrice.toFixed(2)}
                </Text>
                <View style={styles.discountBadge}>
                  <Text style={styles.discountText}>{product.discount}% OFF</Text>
                </View>
              </>
            ) : (
              <>
                <Text style={styles.priceLabel}>Price:</Text>
                <Text style={styles.priceValue}>₹{product.price.toFixed(2)}</Text>
              </>
            )}
          </View>
          
          <View style={styles.stockInfo}>
            <Text style={[
              styles.stockText, 
              product.stock > 0 ? styles.inStock : styles.outOfStock
            ]}>
              {product.stock > 0 ? `In Stock (${product.stock} ${product.units})` : 'Out of Stock'}
            </Text>
          </View>
          
          <View style={styles.ratingContainer}>
            <FontAwesome name="star" size={16} color="#FFD700" />
            <Text style={styles.ratingText}>{product.rating.toFixed(1)}</Text>
            <Text style={styles.reviewCountText}>(
              {product.reviews ? product.reviews.length : 0} reviews)
            </Text>
          </View>
          
          <View style={styles.divider} />
          
          <Text style={styles.sectionTitle}>Description</Text>
          <Text style={styles.descriptionText}>{product.description}</Text>
          
          <View style={styles.divider} />
          
          {product.vendor && (
            <>
              <Text style={styles.sectionTitle}>Sold By</Text>
              <TouchableOpacity 
                style={styles.vendorContainer}
                onPress={() => navigation.navigate('ShopDetails', { shopId: product.shop._id })}
              >
                <Text style={styles.vendorName}>{product.shop.name}</Text>
                <FontAwesome name="chevron-right" size={14} color={theme.colors.textLight} />
              </TouchableOpacity>
              <View style={styles.divider} />
            </>
          )}
          
          {product.reviews && product.reviews.length > 0 && (
            <>
              <Text style={styles.sectionTitle}>Reviews</Text>
              {product.reviews.slice(0, 3).map((review, index) => (
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
              {product.reviews.length > 3 && (
                <TouchableOpacity style={styles.moreReviewsButton}>
                  <Text style={styles.moreReviewsText}>
                    See all {product.reviews.length} reviews
                  </Text>
                </TouchableOpacity>
              )}
              <View style={styles.divider} />
            </>
          )}
        </View>
      </ScrollView>
      
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
              quantity >= product.stock && styles.quantityButtonDisabled
            ]}
            onPress={() => handleQuantityChange(1)}
            disabled={quantity >= product.stock}
          >
            <FontAwesome 
              name="plus" 
              size={16} 
              color={quantity >= product.stock ? theme.colors.textLight : theme.colors.text} 
            />
          </TouchableOpacity>
        </View>
        
        <TouchableOpacity 
          style={[
            styles.addToCartButton,
            product.stock <= 0 && styles.disabledButton
          ]}
          onPress={handleAddToCart}
          disabled={product.stock <= 0}
        >
          <FontAwesome name="shopping-cart" size={18} color={theme.colors.white} />
          <Text style={styles.addToCartText}>
            {product.stock > 0 ? 'Add to Cart' : 'Out of Stock'}
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
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    backgroundColor: theme.colors.cardBg,
    borderRadius: 8,
  },
  vendorName: {
    fontSize: 16,
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
});

export default ProductDetailsScreen; 
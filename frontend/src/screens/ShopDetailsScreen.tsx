import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  FlatList,
  Dimensions,
} from 'react-native';
import { FontAwesome } from '@expo/vector-icons';
import { useDispatch } from 'react-redux';

import { AppDispatch } from '../store';
import { theme } from '../theme';
import { getShop } from '../api/shopApi';
import { getProductsByShop } from '../api/productApi';
import { addToCart } from '../store/cartSlice';
import { useNavigation, useRoute } from '../navigation/hooks';
import Card3D from '../components/Card3D';
import { Product } from '../types/product';
import { Shop } from '../api/shopApi';

const { width } = Dimensions.get('window');

const ShopDetailsScreen: React.FC = () => {
  const route = useRoute<'ShopDetails'>();
  const navigation = useNavigation<'ShopDetails'>();
  const dispatch = useDispatch<AppDispatch>();
  
  const { shopId } = route.params;
  const [shop, setShop] = useState<Shop | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  useEffect(() => {
    loadShopDetails();
  }, [shopId]);
  
  const loadShopDetails = async () => {
    try {
      setLoading(true);
      const shopResponse = await getShop(shopId);
      setShop(shopResponse.data);
      
      const productsResponse = await getProductsByShop(shopId);
      setProducts(productsResponse.data);
      
      setLoading(false);
    } catch (err: any) {
      setError(err.message || 'Failed to load shop details');
      setLoading(false);
    }
  };
  
  const handleAddToCart = (productId: string) => {
    dispatch(addToCart({ productId, quantity: 1 }));
  };
  
  const handleProductPress = (productId: string) => {
    navigation.navigate('ProductDetails', { productId });
  };
  
  const handleGoBack = () => {
    navigation.goBack();
  };
  
  const renderProductItem = ({ item }: { item: Product }) => (
    <TouchableOpacity 
      onPress={() => handleProductPress(item._id)}
      activeOpacity={0.8}
    >
      <Card3D style={styles.productCard}>
        <Image 
          source={{ uri: item.images[0] || 'https://via.placeholder.com/150' }} 
          style={styles.productImage} 
        />
        <View style={styles.productInfo}>
          <Text style={styles.productName} numberOfLines={1}>{item.name}</Text>
          <Text style={styles.productPrice}>₹{item.price.toFixed(2)}</Text>
          <View style={styles.productBottom}>
            <View style={styles.ratingContainer}>
              <FontAwesome name="star" size={12} color="#FFD700" />
              <Text style={styles.ratingText}>{item.rating.toFixed(1)}</Text>
            </View>
            <TouchableOpacity 
              style={styles.addButton}
              onPress={() => handleAddToCart(item._id)}
              disabled={item.stock <= 0}
            >
              <FontAwesome name="plus" size={14} color={theme.colors.white} />
            </TouchableOpacity>
          </View>
        </View>
      </Card3D>
    </TouchableOpacity>
  );
  
  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }
  
  if (error || !shop) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>
          {error || 'Shop not found. Please try again.'}
        </Text>
        <TouchableOpacity style={styles.backButton} onPress={handleGoBack}>
          <Text style={styles.backButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }
  
  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.backIconButton} onPress={handleGoBack}>
        <FontAwesome name="arrow-left" size={20} color={theme.colors.dark} />
      </TouchableOpacity>
      
      <ScrollView showsVerticalScrollIndicator={false}>
        <Image 
          source={{ uri: shop.coverImage || shop.logo || 'https://via.placeholder.com/400' }}
          style={styles.coverImage}
          resizeMode="cover"
        />
        
        <View style={styles.shopInfoContainer}>
          <View style={styles.logoContainer}>
            <Image 
              source={{ uri: shop.logo || 'https://via.placeholder.com/100' }}
              style={styles.logoImage}
              resizeMode="cover"
            />
          </View>
          
          <View style={styles.shopHeader}>
            <Text style={styles.shopName}>{shop.name}</Text>
            <View style={styles.ratingRow}>
              <FontAwesome name="star" size={16} color="#FFD700" />
              <Text style={styles.ratingValue}>{shop.rating.toFixed(1)}</Text>
              <Text style={styles.reviewCount}>
                ({shop.reviews ? shop.reviews.length : 0} reviews)
              </Text>
            </View>
            
            <View style={[styles.statusBadge, { 
              backgroundColor: shop.isOpen ? `${theme.colors.success}20` : `${theme.colors.error}20`,
              borderColor: shop.isOpen ? theme.colors.success : theme.colors.error,
            }]}>
              <View style={[styles.statusDot, { 
                backgroundColor: shop.isOpen ? theme.colors.success : theme.colors.error 
              }]} />
              <Text style={[styles.statusText, { 
                color: shop.isOpen ? theme.colors.success : theme.colors.error 
              }]}>
                {shop.isOpen ? 'Open Now' : 'Closed'}
              </Text>
            </View>
          </View>
        </View>
        
        <View style={styles.detailsContainer}>
          <Text style={styles.sectionTitle}>About</Text>
          <Text style={styles.descriptionText}>{shop.description}</Text>
          
          <View style={styles.divider} />
          
          <Text style={styles.sectionTitle}>Contact</Text>
          <View style={styles.contactItem}>
            <FontAwesome name="map-marker" size={16} color={theme.colors.textLight} />
            <Text style={styles.contactText}>
              {shop.address.street}, {shop.address.village}
              {'\n'}
              {shop.address.district}, {shop.address.state} - {shop.address.pincode}
              {'\n'}
              Phone: {shop.address.phone}
            </Text>
          </View>
          
          <View style={styles.divider} />
          
          <Text style={styles.sectionTitle}>Categories</Text>
          <View style={styles.categoriesContainer}>
            {shop.categories.map((category, index) => (
              <View key={index} style={styles.categoryChip}>
                <Text style={styles.categoryText}>{category}</Text>
              </View>
            ))}
          </View>
          
          <View style={styles.divider} />
          
          <Text style={styles.sectionTitle}>Products</Text>
          
          {products.length === 0 ? (
            <View style={styles.emptyProductsContainer}>
              <Text style={styles.emptyProductsText}>No products available</Text>
            </View>
          ) : (
            <FlatList
              data={products}
              renderItem={renderProductItem}
              keyExtractor={(item) => item._id}
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.productsList}
            />
          )}
          
          {products.length > 0 && (
            <TouchableOpacity 
              style={styles.viewAllButton}
              onPress={() => navigation.navigate('ProductsTab')}
            >
              <Text style={styles.viewAllText}>View All Products</Text>
            </TouchableOpacity>
          )}
          
          <View style={styles.divider} />
          
          {shop.reviews && shop.reviews.length > 0 && (
            <>
              <Text style={styles.sectionTitle}>Reviews</Text>
              {shop.reviews.slice(0, 3).map((review, index) => (
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
              {shop.reviews.length > 3 && (
                <TouchableOpacity style={styles.moreReviewsButton}>
                  <Text style={styles.moreReviewsText}>
                    See all {shop.reviews.length} reviews
                  </Text>
                </TouchableOpacity>
              )}
            </>
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
  coverImage: {
    width: width,
    height: width * 0.6,
  },
  shopInfoContainer: {
    flexDirection: 'row',
    padding: 16,
    backgroundColor: theme.colors.cardBg,
    borderRadius: 12,
    marginTop: -40,
    marginHorizontal: 16,
    shadowColor: theme.colors.dark,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 5,
  },
  logoContainer: {
    marginRight: 16,
  },
  logoImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 2,
    borderColor: theme.colors.white,
  },
  shopHeader: {
    flex: 1,
  },
  shopName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: theme.colors.text,
    marginBottom: 4,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  ratingValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: theme.colors.text,
    marginLeft: 4,
  },
  reviewCount: {
    fontSize: 14,
    color: theme.colors.textLight,
    marginLeft: 4,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 12,
    borderWidth: 1,
    alignSelf: 'flex-start',
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 4,
  },
  statusText: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  detailsContainer: {
    padding: 16,
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
  divider: {
    height: 1,
    backgroundColor: theme.colors.border,
    marginVertical: 16,
  },
  contactItem: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  contactText: {
    fontSize: 16,
    color: theme.colors.text,
    marginLeft: 12,
    flex: 1,
    lineHeight: 22,
  },
  categoriesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  categoryChip: {
    backgroundColor: `${theme.colors.primary}15`,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
    marginRight: 8,
    marginBottom: 8,
  },
  categoryText: {
    fontSize: 14,
    color: theme.colors.primary,
  },
  productsList: {
    paddingRight: 16,
  },
  productCard: {
    width: 160,
    marginRight: 12,
    borderRadius: 12,
    backgroundColor: theme.colors.cardBg,
    overflow: 'hidden',
  },
  productImage: {
    width: '100%',
    height: 120,
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
  },
  productInfo: {
    padding: 10,
  },
  productName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: theme.colors.text,
    marginBottom: 4,
  },
  productPrice: {
    fontSize: 14,
    fontWeight: 'bold',
    color: theme.colors.primary,
    marginBottom: 8,
  },
  productBottom: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  ratingText: {
    fontSize: 12,
    color: theme.colors.text,
    marginLeft: 4,
  },
  addButton: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: theme.colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  viewAllButton: {
    alignItems: 'center',
    padding: 12,
    marginTop: 8,
  },
  viewAllText: {
    fontSize: 16,
    color: theme.colors.primary,
    fontWeight: 'bold',
  },
  emptyProductsContainer: {
    padding: 20,
    alignItems: 'center',
    backgroundColor: theme.colors.bgLight,
    borderRadius: 8,
  },
  emptyProductsText: {
    color: theme.colors.textLight,
    fontSize: 16,
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
});

export default ShopDetailsScreen; 
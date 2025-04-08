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
import { getShop, getShopsByDistance } from '../api/shopApi';
import { getProductsByShop } from '../api/productApi';
import { addToCart } from '../store/cartSlice';
import { useNavigation, useRoute } from '../navigation/hooks';
import Card3D from '../components/Card3D';

const { width } = Dimensions.get('window');

type Shop = {
  _id: string;
  name: string;
  description: string;
  logo: string;
  coverImage: string;
  address: {
    village: string;
    street: string;
    district: string;
    state: string;
    pincode: string;
    phone: string;
  };
  contactNumber: string;
  email: string;
  categories: string[];
  rating: number;
  reviewCount: number;
  isOpen: boolean;
  openingHours: {
    days: string;
    hours: string;
  }[];
};

type Product = {
  _id: string;
  name: string;
  description: string;
  price: number;
  images: string[];
  rating: number;
  stock: number;
};

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
              <Text style={styles.reviewCount}>({shop.reviewCount} reviews)</Text>
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
          <View style={styles.contactItem}>
            <FontAwesome name="phone" size={16} color={theme.colors.textLight} />
            <Text style={styles.contactText}>{shop.contactNumber}</Text>
          </View>
          <View style={styles.contactItem}>
            <FontAwesome name="envelope" size={16} color={theme.colors.textLight} />
            <Text style={styles.contactText}>{shop.email}</Text>
          </View>
          
          <View style={styles.divider} />
          
          <Text style={styles.sectionTitle}>Opening Hours</Text>
          {shop.openingHours?.map((hour, index) => (
            <View key={index} style={styles.hourItem}>
              <Text style={styles.dayText}>{hour.days}</Text>
              <Text style={styles.hourText}>{hour.hours}</Text>
            </View>
          ))}
          
          <View style={styles.divider} />
          
          <View style={styles.categoriesContainer}>
            {shop.categories?.map((category, index) => (
              <View key={index} style={styles.categoryChip}>
                <Text style={styles.categoryText}>{category}</Text>
              </View>
            ))}
          </View>
          
          <View style={styles.divider} />
          
          <Text style={styles.sectionTitle}>Products</Text>
          <FlatList
            data={products}
            renderItem={renderProductItem}
            keyExtractor={(item) => item._id}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.productsList}
            ListEmptyComponent={
              <Text style={styles.emptyText}>No products available</Text>
            }
          />
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
    height: 200,
  },
  shopInfoContainer: {
    flexDirection: 'row',
    marginTop: -40,
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  logoContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 2,
    borderColor: theme.colors.white,
    overflow: 'hidden',
    backgroundColor: theme.colors.white,
    shadowColor: theme.colors.dark,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 4,
  },
  logoImage: {
    width: '100%',
    height: '100%',
    borderRadius: 40,
  },
  shopHeader: {
    flex: 1,
    marginLeft: 12,
    marginTop: 12,
  },
  shopName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: theme.colors.text,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  ratingValue: {
    marginLeft: 4,
    fontSize: 14,
    fontWeight: 'bold',
    color: theme.colors.text,
  },
  reviewCount: {
    marginLeft: 4,
    fontSize: 12,
    color: theme.colors.textLight,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    marginTop: 6,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
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
    fontSize: 14,
    lineHeight: 22,
    color: theme.colors.text,
  },
  divider: {
    height: 1,
    backgroundColor: theme.colors.lightGray,
    marginVertical: 16,
  },
  contactItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  contactText: {
    marginLeft: 12,
    fontSize: 14,
    color: theme.colors.text,
  },
  hourItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  dayText: {
    fontSize: 14,
    color: theme.colors.text,
    fontWeight: '500',
  },
  hourText: {
    fontSize: 14,
    color: theme.colors.textLight,
  },
  categoriesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  categoryChip: {
    backgroundColor: theme.colors.primaryLight,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
    marginRight: 8,
    marginBottom: 8,
  },
  categoryText: {
    fontSize: 12,
    color: theme.colors.primary,
  },
  productsList: {
    paddingTop: 8,
    paddingRight: 16,
  },
  productCard: {
    width: 160,
    borderRadius: 12,
    marginRight: 12,
    overflow: 'hidden',
    backgroundColor: theme.colors.white,
  },
  productImage: {
    width: '100%',
    height: 120,
    resizeMode: 'cover',
  },
  productInfo: {
    padding: 12,
  },
  productName: {
    fontSize: 14,
    fontWeight: 'bold',
    color: theme.colors.text,
    marginBottom: 4,
  },
  productPrice: {
    fontSize: 16,
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
    marginLeft: 4,
    fontSize: 12,
    color: theme.colors.text,
  },
  addButton: {
    backgroundColor: theme.colors.primary,
    width: 30,
    height: 30,
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
    color: theme.colors.textLight,
    textAlign: 'center',
    marginTop: 8,
  },
});

export default ShopDetailsScreen; 
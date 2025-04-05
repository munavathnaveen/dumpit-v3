import React, { useEffect, useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  FlatList, 
  TouchableOpacity, 
  ActivityIndicator,
  Image,
  RefreshControl
} from 'react-native';
import { useSelector, useDispatch } from 'react-redux';
import { FontAwesome } from '@expo/vector-icons';

import { RootState, AppDispatch } from '../store';
import { theme } from '../theme';
import { getShops } from '../api/shopApi';
import Card3D from '../components/Card3D';
import SearchBar from '../components/SearchBar';
import ScreenHeader from '../components/ScreenHeader';
import { useRoute, useNavigation } from '../navigation/hooks';

type Shop = {
  _id: string;
  name: string;
  description: string;
  logo: string;
  address: string;
  rating: number;
  isOpen: boolean;
};

const ShopsScreen: React.FC = () => {
  const navigation = useNavigation();
  const route = useRoute<'Shops'>();
  const dispatch = useDispatch<AppDispatch>();
  const [shops, setShops] = useState<Shop[]>([]);
  const [filteredShops, setFilteredShops] = useState<Shop[]>([]);
  const [searchQuery, setSearchQuery] = useState(route.params?.searchQuery || '');
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadShops();
  }, []);

  useEffect(() => {
    if (shops.length > 0) {
      filterShops();
    }
  }, [searchQuery, shops]);

  const filterShops = () => {
    if (!searchQuery.trim()) {
      setFilteredShops(shops);
      return;
    }

    const query = searchQuery.toLowerCase();
    const filtered = shops.filter(
      (shop) => 
        shop.name.toLowerCase().includes(query) || 
        shop.description.toLowerCase().includes(query) ||
        shop.address.toLowerCase().includes(query)
    );
    setFilteredShops(filtered);
  };

  const loadShops = async () => {
    try {
      setLoading(true);
      const response = await getShops();
      if (response.success) {
        setShops(response.data);
        setFilteredShops(response.data);
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

  const renderShopItem = ({ item }: { item: Shop }) => (
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
          {item.address}
        </Text>
        <View style={styles.shopStatusContainer}>
          <View style={[styles.statusDot, { backgroundColor: item.isOpen ? theme.colors.success : theme.colors.error }]} />
          <Text style={styles.statusText}>
            {item.isOpen ? 'Open Now' : 'Closed'}
          </Text>
        </View>
      </View>
    </Card3D>
  );

  if (loading && !refreshing) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScreenHeader title="Shops" />
      
      <View style={styles.contentContainer}>
        <SearchBar 
          placeholder="Search shops by name, description..."
          onSearch={handleSearch}
          value={searchQuery}
          style={styles.searchBar}
        />
        
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
              {searchQuery ? 'No shops match your search' : 'No shops available'}
            </Text>
          }
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  contentContainer: {
    flex: 1,
    padding: theme.spacing.md,
  },
  searchBar: {
    marginBottom: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  shopsList: {
    paddingBottom: 80,
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
    fontSize: 18,
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
    borderRadius: 4,
  },
  ratingText: {
    marginLeft: 4,
    fontSize: 12,
    fontWeight: 'bold',
    color: theme.colors.text,
  },
  shopDescription: {
    fontSize: 14,
    color: theme.colors.textLight,
    marginBottom: 8,
  },
  shopAddress: {
    fontSize: 12,
    color: theme.colors.textLight,
    marginBottom: 8,
  },
  shopStatusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  statusText: {
    fontSize: 12,
    color: theme.colors.text,
  },
  emptyText: {
    textAlign: 'center',
    marginTop: 40,
    fontSize: 16,
    color: theme.colors.textLight,
  },
});

export default ShopsScreen; 
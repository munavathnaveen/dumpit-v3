import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useSelector, useDispatch } from 'react-redux';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import * as Location from 'expo-location';
import axios from 'axios';
import { Feather } from '@expo/vector-icons';

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
import { GOOGLE_MAPS_API_KEY } from '../utils/config';

type HomeScreenNavigationProp = NativeStackNavigationProp<MainStackParamList, 'Home'>;

type SearchType = 'all' | 'products' | 'shops';

const HomeScreen: React.FC = () => {
  const navigation = useNavigation<HomeScreenNavigationProp>();
  const dispatch = useDispatch<AppDispatch>();
  const { user } = useSelector((state: RootState) => state.auth);
  const [location, setLocation] = useState<string>('Fetching location...');
  const [locationData, setLocationData] = useState<{ latitude: number; longitude: number } | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchType, setSearchType] = useState<SearchType>('all');

  useEffect(() => {
    getLocation();
  }, []);

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
      
      <View style={styles.content}>
        <Text style={styles.welcomeText}>
          Welcome {user?.name ? user.name : 'to Dumpit'}!
        </Text>
        
        <Card3D style={styles.card} elevation="medium">
          <Text style={styles.cardTitle}>Construction Material Marketplace</Text>
          <Text style={styles.cardText}>
            Browse and purchase construction materials from trusted vendors in your area.
          </Text>
          <Button 
            title="Explore Materials" 
            onPress={() => navigation.navigate('Products')}
            style={styles.button}
            variant="primary"
          />
        </Card3D>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
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
  content: {
    flex: 1,
    padding: theme.spacing.lg,
  },
  welcomeText: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: theme.spacing.xl,
    color: theme.colors.text,
  },
  card: {
    padding: theme.spacing.lg,
    marginBottom: theme.spacing.lg,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: theme.spacing.md,
    color: theme.colors.text,
  },
  cardText: {
    fontSize: 16,
    marginBottom: theme.spacing.lg,
    color: theme.colors.textLight,
    lineHeight: 24,
  },
  button: {
    alignSelf: 'center',
  },
});

export default HomeScreen; 
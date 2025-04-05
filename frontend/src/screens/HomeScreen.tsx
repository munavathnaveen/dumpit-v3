import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Alert } from 'react-native';
import { useSelector, useDispatch } from 'react-redux';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import * as Location from 'expo-location';
import axios from 'axios';

import Header from '../components/Header';
import Button from '../components/Button';
import Card3D from '../components/Card3D';
import { theme } from '../theme';
import { RootState, AppDispatch } from '../store';
import { logout } from '../store/authSlice';
import { MainStackParamList } from '../navigation/types';
import * as locationApi from '../api/locationApi';
import { GOOGLE_MAPS_API_KEY } from '../utils/config';

type HomeScreenNavigationProp = NativeStackNavigationProp<MainStackParamList, 'Home'>;

const HomeScreen: React.FC = () => {
  const navigation = useNavigation<HomeScreenNavigationProp>();
  const dispatch = useDispatch<AppDispatch>();
  const { user } = useSelector((state: RootState) => state.auth);
  const [location, setLocation] = useState<string>('Fetching location...');
  const [locationData, setLocationData] = useState<{ latitude: number; longitude: number } | null>(null);

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

      // Update user's location in the backend
      if (user?._id) {
        try {
          await locationApi.updateUserLocation({ latitude, longitude });
        } catch (error) {
          console.error('Failed to update location in backend:', error);
        }
      }

      // Get address using Google Places API instead of deprecated Geocoding API
      try {
        // Using Google Maps Reverse Geocoding API
        const apiKey = GOOGLE_MAPS_API_KEY;
        if (!apiKey) {
          setLocation('Location service unavailable');
          return;
        }
        
        const response = await axios.get(
          `https://maps.googleapis.com/maps/api/geocode/json?latlng=${latitude},${longitude}&key=${apiKey}`
        );
        
        if (response.data.status === 'OK' && response.data.results.length > 0) {
          // Extract city and region from results
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
      Alert.alert('Error', error.message || 'Failed to logout');
    }
  };

  const handleProfilePress = () => {
    navigation.navigate('Profile');
  };

  const handleNotificationPress = () => {
    navigation.navigate('Notifications');
  };

  return (
    <View style={styles.container}>
      <Header 
        location={location}
        onNotificationPress={handleNotificationPress}
        onProfilePress={handleProfilePress}
        onLogoutPress={handleLogout}
      />
      
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
            onPress={() => console.log('Explore pressed')}
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
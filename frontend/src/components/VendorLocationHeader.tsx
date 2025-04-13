import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Feather } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { useSelector } from 'react-redux';

import ScreenHeader from './ScreenHeader';
import { theme } from '../theme';
import { RootState } from '../store';
import * as locationApi from '../api/locationApi';

interface VendorLocationHeaderProps {
  title?: string;
  showBackButton?: boolean;
  onNotificationPress?: () => void;
  rightIcon?: string;
  onRightPress?: () => void;
}

const VendorLocationHeader: React.FC<VendorLocationHeaderProps> = ({
  title = 'Location',
  showBackButton = false,
  onNotificationPress,
  rightIcon,
  onRightPress,
}) => {
  const [location, setLocation] = useState<string>('Getting location...');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const userId = useSelector((state: RootState) => state.auth.user?._id);

  useEffect(() => {
    if (!userId) return;
    
    const getLocation = async () => {
      try {
        setIsLoading(true);
        
        // Request location permissions
        const { status } = await Location.requestForegroundPermissionsAsync();
        
        if (status !== 'granted') {
          setLocation('Location permission denied');
          setIsLoading(false);
          return;
        }
        
        // Get current position
        const position = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });
        
        const { latitude, longitude } = position.coords;
        
        // Update user location in the backend
        if (userId) {
          try {
            await locationApi.updateUserLocation({
              latitude,
              longitude,
            });
          } catch (error) {
            console.error('Error updating user location in backend:', error);
          }
        }
        
        // Try to get a readable address
        try {
          const geocodeResult = await Location.reverseGeocodeAsync({
            latitude,
            longitude,
          });
          
          if (geocodeResult && geocodeResult.length > 0) {
            const address = geocodeResult[0];
            // Format location in a readable way
            const locationString = [
              address.district, 
              address.city, 
              address.region
            ]
              .filter(Boolean)
              .slice(0, 2)
              .join(', ');
              
            setLocation(locationString || `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`);
          } else {
            setLocation(`${latitude.toFixed(4)}, ${longitude.toFixed(4)}`);
          }
        } catch (error) {
          console.error('Error getting location name:', error);
          setLocation(`${latitude.toFixed(4)}, ${longitude.toFixed(4)}`);
        }
      } catch (error) {
        console.error('Error getting location:', error);
        setLocation('Location unavailable');
      } finally {
        setIsLoading(false);
      }
    };
    
    getLocation();
    
    // Set up location updates on an interval
    const intervalId = setInterval(() => {
      getLocation();
    }, 5 * 60 * 1000); // Update every 5 minutes
    
    return () => {
      clearInterval(intervalId);
    };
  }, [userId]);
  
  const handleRefreshLocation = async () => {
    if (isLoading) return;
    
    const getLocation = async () => {
      try {
        setIsLoading(true);
        setLocation('Updating location...');
        
        // Get current position
        const position = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });
        
        const { latitude, longitude } = position.coords;
        
        // Update user location in the backend
        if (userId) {
          try {
            await locationApi.updateUserLocation({
              latitude,
              longitude,
            });
          } catch (error) {
            console.error('Error updating user location in backend:', error);
          }
        }
        
        // Try to get a readable address
        try {
          const geocodeResult = await Location.reverseGeocodeAsync({
            latitude,
            longitude,
          });
          
          if (geocodeResult && geocodeResult.length > 0) {
            const address = geocodeResult[0];
            // Format location in a readable way
            const locationString = [
              address.district, 
              address.city, 
              address.region
            ]
              .filter(Boolean)
              .slice(0, 2)
              .join(', ');
              
            setLocation(locationString || `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`);
          } else {
            setLocation(`${latitude.toFixed(4)}, ${longitude.toFixed(4)}`);
          }
        } catch (error) {
          console.error('Error getting location name:', error);
          setLocation(`${latitude.toFixed(4)}, ${longitude.toFixed(4)}`);
        }
      } catch (error) {
        console.error('Error getting location:', error);
        setLocation('Location unavailable');
      } finally {
        setIsLoading(false);
      }
    };
    
    getLocation();
  };
  
  const customLocation = (
    <TouchableOpacity 
      style={styles.locationContainer} 
      onPress={handleRefreshLocation}
      disabled={isLoading}
    >
      <Feather name="map-pin" size={18} color={theme.colors.primary} style={styles.locationIcon} />
      {isLoading ? (
        <ActivityIndicator size="small" color={theme.colors.primary} />
      ) : (
        <Text style={styles.locationText} numberOfLines={1}>
          {location}
        </Text>
      )}
      <Feather name="refresh-cw" size={14} color={theme.colors.gray} style={styles.refreshIcon} />
    </TouchableOpacity>
  );

  return (
    <ScreenHeader
      title={title}
      showBackButton={showBackButton}
      onNotificationPress={onNotificationPress}
      rightIcon={rightIcon}
      onRightPress={onRightPress}
      customLocation={customLocation}
    />
  );
};

const styles = StyleSheet.create({
  locationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: theme.spacing.xs,
  },
  locationIcon: {
    marginRight: theme.spacing.xs,
  },
  refreshIcon: {
    marginLeft: theme.spacing.xs,
  },
  locationText: {
    fontSize: 14,
    color: theme.colors.dark,
    maxWidth: 150,
  },
});

export default VendorLocationHeader; 
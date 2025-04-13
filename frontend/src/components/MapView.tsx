import React, { useRef, useEffect, useState } from 'react';
import { View, StyleSheet, ActivityIndicator, Platform } from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE, Region, Polyline } from 'react-native-maps';
import * as Location from 'expo-location';
import { theme } from '../theme';

interface Location {
  latitude: number;
  longitude: number;
}

interface Route {
  coords: Location[];
  distance: number;
  duration: number;
}

interface MapViewComponentProps {
  style?: any;
  initialRegion?: Region;
  markers?: {
    id: string;
    coordinate: Location;
    title?: string;
    description?: string;
    pinColor?: string;
  }[];
  showsUserLocation?: boolean;
  followsUserLocation?: boolean;
  zoomEnabled?: boolean;
  onRegionChange?: (region: Region) => void;
  onUserLocationChange?: (location: Location) => void;
  onMarkerPress?: (markerId: string) => void;
  route?: Route;
  editable?: boolean;
  onMapPress?: (coordinate: Location) => void;
}

const initialMapRegion = {
  latitude: 12.9716,
  longitude: 77.5946,
  latitudeDelta: 0.0922,
  longitudeDelta: 0.0421,
};

const MapViewComponent: React.FC<MapViewComponentProps> = ({
  style,
  initialRegion,
  markers = [],
  showsUserLocation = true,
  followsUserLocation = false,
  zoomEnabled = true,
  onRegionChange,
  onUserLocationChange,
  onMarkerPress,
  route,
  editable = false,
  onMapPress,
}) => {
  const mapRef = useRef<MapView>(null);
  const [loading, setLoading] = useState(true);
  const [userLocation, setUserLocation] = useState<Location | null>(null);
  const [mapRegion, setMapRegion] = useState(initialRegion || initialMapRegion);

  // Get user's current location
  useEffect(() => {
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          console.log('Permission to access location was denied');
          setLoading(false);
          return;
        }

        const location = await Location.getCurrentPositionAsync({});
        const currentLocation = {
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
        };

        setUserLocation(currentLocation);
        
        if (!initialRegion) {
          setMapRegion({
            ...mapRegion,
            latitude: currentLocation.latitude,
            longitude: currentLocation.longitude,
          });
        }

        if (onUserLocationChange) {
          onUserLocationChange(currentLocation);
        }
      } catch (error) {
        console.error('Error getting location:', error);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // Watch user's location if needed
  useEffect(() => {
    if (!followsUserLocation) return;

    let locationSubscription: Location.LocationSubscription;

    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return;

      locationSubscription = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.High,
          distanceInterval: 10, // Update every 10 meters
        },
        (location) => {
          const newLocation = {
            latitude: location.coords.latitude,
            longitude: location.coords.longitude,
          };

          setUserLocation(newLocation);
          
          if (onUserLocationChange) {
            onUserLocationChange(newLocation);
          }
        }
      );
    })();

    return () => {
      if (locationSubscription) {
        locationSubscription.remove();
      }
    };
  }, [followsUserLocation]);

  // Fit all markers on the map
  const fitAllMarkers = () => {
    if (mapRef.current && markers.length > 0) {
      mapRef.current.fitToSuppliedMarkers(
        markers.map(marker => marker.id),
        {
          edgePadding: { top: 50, right: 50, bottom: 50, left: 50 },
          animated: true,
        }
      );
    }
  };

  // Fit markers when they change
  useEffect(() => {
    if (markers.length > 0) {
      fitAllMarkers();
    }
  }, [markers]);

  // Handle map presses for editable maps
  const handleMapPress = (event: any) => {
    if (editable && onMapPress) {
      onMapPress(event.nativeEvent.coordinate);
    }
  };

  // Handle region changes
  const handleRegionChange = (newRegion: Region) => {
    setMapRegion(newRegion);
    if (onRegionChange) {
      onRegionChange(newRegion);
    }
  };

  if (loading) {
    return (
      <View style={[styles.container, style]}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  return (
    <View style={[styles.container, style]}>
      <MapView
        ref={mapRef}
        style={styles.map}
        provider={PROVIDER_GOOGLE}
        region={mapRegion}
        onRegionChangeComplete={handleRegionChange}
        showsUserLocation={showsUserLocation}
        followsUserLocation={followsUserLocation}
        zoomEnabled={zoomEnabled}
        showsMyLocationButton={true}
        showsCompass={true}
        loadingEnabled={true}
        onPress={handleMapPress}
      >
        {markers.map((marker) => (
          <Marker
            key={marker.id}
            identifier={marker.id}
            coordinate={marker.coordinate}
            title={marker.title}
            description={marker.description}
            pinColor={marker.pinColor}
            onPress={() => onMarkerPress && onMarkerPress(marker.id)}
          />
        ))}

        {route && route.coords.length > 0 && (
          <Polyline
            coordinates={route.coords}
            strokeWidth={4}
            strokeColor={theme.colors.primary}
          />
        )}
      </MapView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 12,
    ...Platform.select({
      ios: {
        shadowColor: theme.colors.dark,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  map: {
    width: '100%',
    height: '100%',
  },
});

export default MapViewComponent; 
import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { FontAwesome } from '@expo/vector-icons';
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from 'react-native-maps';

import { theme } from '../theme';
import Card3D from './Card3D';
import { LocationService, Coordinates } from '../services/LocationService';
import { OrderTrackingService, OrderTrackingData, TrackingStatus } from '../services/OrderTrackingService';

interface OrderTrackingCardProps {
  orderId: string;
  onViewMapPress?: () => void;
}

const OrderTrackingCard: React.FC<OrderTrackingCardProps> = ({ orderId, onViewMapPress }) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [trackingData, setTrackingData] = useState<OrderTrackingData | null>(null);
  const [routeCoordinates, setRouteCoordinates] = useState<Coordinates[]>([]);
  const [eta, setEta] = useState<string | null>(null);
  const [distance, setDistance] = useState<string | null>(null);

  useEffect(() => {
    loadTrackingData();

    // Subscribe to real-time updates
    const unsubscribe = OrderTrackingService.subscribeToOrderUpdates(
      orderId, 
      (data) => {
        setTrackingData(data);
        
        // If there's route information, decode and set it
        if (data.tracking?.route) {
          try {
            const decodedRoute = LocationService.decodePolyline(data.tracking.route);
            setRouteCoordinates(decodedRoute);
          } catch (error) {
            console.error('Error decoding route:', error);
          }
        }
        
        // Set distance if available
        if (data.tracking?.distance) {
          setDistance(LocationService.formatDistance(data.tracking.distance));
        }
        
        // Set ETA if available
        if (data.tracking?.eta) {
          setEta(data.tracking.eta);
        }
      }
    );

    return () => {
      unsubscribe();
    };
  }, [orderId]);

  const loadTrackingData = async () => {
    try {
      setLoading(true);
      
      // Get order tracking data
      const data = await OrderTrackingService.getOrderTracking(orderId);
      setTrackingData(data);
      
      // If there's route information, decode and set it
      if (data.tracking?.route) {
        try {
          const decodedRoute = LocationService.decodePolyline(data.tracking.route);
          setRouteCoordinates(decodedRoute);
        } catch (error) {
          console.error('Error decoding route:', error);
        }
      }
      
      // Set distance if available
      if (data.tracking?.distance) {
        setDistance(LocationService.formatDistance(data.tracking.distance));
      }
      
      // Set ETA if available
      if (data.tracking?.eta) {
        setEta(data.tracking.eta);
      }
      
      // Get directions if needed but not provided
      if (data.tracking?.currentLocation && 
          data.shippingAddress?.location &&
          !data.tracking.route) {
        try {
          const directionsData = await OrderTrackingService.getOrderDirections(data);
          setRouteCoordinates(directionsData.route);
          setDistance(LocationService.formatDistance(directionsData.distance));
          setEta(OrderTrackingService.formatETA(directionsData.duration));
        } catch (error) {
          console.error('Error getting directions:', error);
        }
      }
      
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Failed to load tracking information');
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status: TrackingStatus | undefined) => {
    switch (status) {
      case 'preparing':
        return 'cube';
      case 'ready_for_pickup':
        return 'shopping-bag';
      case 'in_transit':
        return 'truck';
      case 'delivered':
        return 'check-circle';
      default:
        return 'clock-o';
    }
  };

  if (loading) {
    return (
      <Card3D style={styles.card}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={styles.loadingText}>Loading tracking information...</Text>
        </View>
      </Card3D>
    );
  }

  if (error) {
    return (
      <Card3D style={styles.card}>
        <View style={styles.errorContainer}>
          <FontAwesome name="exclamation-circle" size={24} color={theme.colors.error} />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={loadTrackingData}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </Card3D>
    );
  }

  if (!trackingData || !trackingData.tracking) {
    return (
      <Card3D style={styles.card}>
        <View style={styles.noTrackingContainer}>
          <FontAwesome name="map-o" size={24} color={theme.colors.textLight} />
          <Text style={styles.noTrackingText}>
            Tracking information not available yet
          </Text>
        </View>
      </Card3D>
    );
  }

  return (
    <Card3D style={styles.card}>
      <View style={styles.headerContainer}>
        <View style={styles.statusIconContainer}>
          <FontAwesome
            name={getStatusIcon(trackingData.tracking.status)}
            size={20}
            color={theme.colors.white}
          />
        </View>
        <View style={styles.statusTextContainer}>
          <Text style={styles.statusTitle}>Order Status</Text>
          <Text style={styles.statusText}>
            {trackingData.tracking.status
              ? OrderTrackingService.getStatusMessage(trackingData.tracking.status)
              : "Tracking your order..."}
          </Text>
        </View>
      </View>

      {routeCoordinates.length > 0 && (
        <View style={styles.mapPreviewContainer}>
          <MapView
            provider={PROVIDER_GOOGLE}
            style={styles.mapPreview}
            region={{
              latitude: routeCoordinates[0].latitude,
              longitude: routeCoordinates[0].longitude,
              latitudeDelta: 0.02,
              longitudeDelta: 0.02,
            }}
            scrollEnabled={false}
            zoomEnabled={false}
          >
            {trackingData.tracking.currentLocation && (
              <Marker
                coordinate={{
                  latitude: trackingData.tracking.currentLocation.coordinates[1],
                  longitude: trackingData.tracking.currentLocation.coordinates[0],
                }}
                title="Current Location"
              >
                <View style={styles.deliveryMarker}>
                  <FontAwesome name="truck" size={16} color={theme.colors.white} />
                </View>
              </Marker>
            )}

            {trackingData.shippingAddress.location && (
              <Marker
                coordinate={{
                  latitude: trackingData.shippingAddress.location.coordinates[1],
                  longitude: trackingData.shippingAddress.location.coordinates[0],
                }}
                title="Delivery Location"
              >
                <View style={styles.destinationMarker}>
                  <FontAwesome name="map-marker" size={16} color={theme.colors.white} />
                </View>
              </Marker>
            )}

            {routeCoordinates.length > 0 && (
              <Polyline
                coordinates={routeCoordinates}
                strokeWidth={4}
                strokeColor={theme.colors.primary}
              />
            )}
          </MapView>
          
          <TouchableOpacity
            style={styles.viewMapButton}
            onPress={onViewMapPress}
          >
            <Text style={styles.viewMapButtonText}>View Full Map</Text>
          </TouchableOpacity>
        </View>
      )}

      <View style={styles.infoContainer}>
        {distance && (
          <View style={styles.infoItem}>
            <FontAwesome name="road" size={16} color={theme.colors.textLight} />
            <Text style={styles.infoText}>Distance: {distance}</Text>
          </View>
        )}
        
        {eta && (
          <View style={styles.infoItem}>
            <FontAwesome name="clock-o" size={16} color={theme.colors.textLight} />
            <Text style={styles.infoText}>Estimated Arrival: {eta}</Text>
          </View>
        )}
        
        {trackingData.tracking.lastUpdated && (
          <View style={styles.infoItem}>
            <FontAwesome name="refresh" size={16} color={theme.colors.textLight} />
            <Text style={styles.infoText}>
              Last Updated: {new Date(trackingData.tracking.lastUpdated).toLocaleTimeString()}
            </Text>
          </View>
        )}
      </View>
    </Card3D>
  );
};

const styles = StyleSheet.create({
  card: {
    marginVertical: theme.spacing.md,
    padding: theme.spacing.md,
    backgroundColor: theme.colors.white,
  },
  loadingContainer: {
    alignItems: 'center',
    padding: theme.spacing.lg,
  },
  loadingText: {
    marginTop: theme.spacing.md,
    color: theme.colors.textLight,
    fontSize: 14,
  },
  errorContainer: {
    alignItems: 'center',
    padding: theme.spacing.lg,
  },
  errorText: {
    marginTop: theme.spacing.sm,
    color: theme.colors.error,
    fontSize: 14,
    textAlign: 'center',
  },
  retryButton: {
    marginTop: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
    backgroundColor: theme.colors.primary,
    borderRadius: theme.borderRadius.small,
  },
  retryButtonText: {
    color: theme.colors.white,
    fontSize: 14,
    fontWeight: '500',
  },
  noTrackingContainer: {
    alignItems: 'center',
    padding: theme.spacing.lg,
  },
  noTrackingText: {
    marginTop: theme.spacing.sm,
    color: theme.colors.textLight,
    fontSize: 14,
    textAlign: 'center',
  },
  headerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
  },
  statusIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: theme.colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: theme.spacing.md,
  },
  statusTextContainer: {
    flex: 1,
  },
  statusTitle: {
    fontSize: 12,
    color: theme.colors.textLight,
    marginBottom: 2,
  },
  statusText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: theme.colors.text,
  },
  mapPreviewContainer: {
    height: 150,
    borderRadius: theme.borderRadius.medium,
    overflow: 'hidden',
    marginBottom: theme.spacing.md,
  },
  mapPreview: {
    ...StyleSheet.absoluteFillObject,
  },
  deliveryMarker: {
    backgroundColor: theme.colors.primary,
    padding: 6,
    borderRadius: 14,
  },
  destinationMarker: {
    backgroundColor: theme.colors.error,
    padding: 6,
    borderRadius: 14,
  },
  viewMapButton: {
    position: 'absolute',
    bottom: theme.spacing.sm,
    right: theme.spacing.sm,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: theme.borderRadius.small,
  },
  viewMapButtonText: {
    fontSize: 12,
    color: theme.colors.primary,
    fontWeight: '500',
  },
  infoContainer: {
    borderTopWidth: 1,
    borderTopColor: theme.colors.lightGray,
    paddingTop: theme.spacing.md,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.sm,
  },
  infoText: {
    fontSize: 14,
    color: theme.colors.text,
    marginLeft: theme.spacing.sm,
  },
});

export default OrderTrackingCard; 
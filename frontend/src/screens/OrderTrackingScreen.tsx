import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Dimensions,
  Modal,
  Image,
  Platform,
  Linking,
} from 'react-native';
import { FontAwesome, MaterialCommunityIcons } from '@expo/vector-icons';
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from 'react-native-maps';

import { theme } from '../theme';
import { useNavigation, useRoute } from '../navigation/hooks';
import Card3D from '../components/Card3D';
import { LocationService, Coordinates } from '../services/LocationService';
import { OrderTrackingService, OrderTrackingData, OrderTrackingScreenParams } from '../services/OrderTrackingService';

const { width, height } = Dimensions.get('window');

const OrderTrackingScreen: React.FC = () => {
  const route = useRoute();
  const navigation = useNavigation();
  const { orderId } = route.params as OrderTrackingScreenParams;
  
  const [loading, setLoading] = useState(true);
  const [trackingData, setTrackingData] = useState<OrderTrackingData | null>(null);
  const [routeCoordinates, setRouteCoordinates] = useState<Coordinates[]>([]);
  const [eta, setEta] = useState<string | null>(null);
  const [distance, setDistance] = useState<string | null>(null);
  const [showDeliveryInfo, setShowDeliveryInfo] = useState(false);
  const mapRef = useRef<MapView>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [lastUpdateTime, setLastUpdateTime] = useState<Date | null>(null);
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  
  useEffect(() => {
    console.log("OrderTrackingScreen mounted with orderId:", orderId);
    loadTrackingData();
    
    // Set up polling as backup for socket updates (every 30 seconds)
    pollingIntervalRef.current = setInterval(() => {
      console.log("Polling for tracking updates...");
      loadTrackingData();
    }, 30000);
    
    // Subscribe to real-time updates
    const unsubscribe = OrderTrackingService.subscribeToOrderUpdates(
      orderId, 
      (data) => {
        console.log("Received live tracking update:", 
          data.tracking?.currentLocation ? 
          `Position: ${data.tracking.currentLocation.coordinates.join(',')}` : 
          "No location data"
        );
        setTrackingData(data);
        setLastUpdateTime(new Date());
        
        // If there's route information, decode and set it
        if (data.tracking?.route) {
          try {
            const decodedRoute = LocationService.decodePolyline(data.tracking.route);
            setRouteCoordinates(decodedRoute);
            
            // Center map on delivery vehicle when we get an update
            if (data.tracking.currentLocation && mapRef.current) {
              mapRef.current.animateToRegion({
                latitude: data.tracking.currentLocation.coordinates[1],
                longitude: data.tracking.currentLocation.coordinates[0],
                latitudeDelta: 0.01,
                longitudeDelta: 0.01
              }, 1000);
            }
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
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
      }
    };
  }, [orderId]);
  
  const loadTrackingData = async () => {
    try {
      setLoading(true);
      setLoadError(null);
      
      console.log("Loading tracking data for order:", orderId);
      
      // Get order tracking data
      const data = await OrderTrackingService.getOrderTracking(orderId);
      console.log("Received tracking data:", 
        data.tracking?.currentLocation ? 
        `Position: ${data.tracking.currentLocation.coordinates.join(',')}` : 
        "No location data"
      );
      
      setTrackingData(data);
      setLastUpdateTime(new Date());
      
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
          console.log("Getting directions for order...");
          const directionsData = await OrderTrackingService.getOrderDirections(data);
          setRouteCoordinates(directionsData.route);
          setDistance(LocationService.formatDistance(directionsData.distance));
          setEta(OrderTrackingService.formatETA(directionsData.duration));
        } catch (error) {
          console.error('Error getting directions:', error);
          setLoadError("Couldn't load route directions");
        }
      }
    } catch (error) {
      console.error('Error loading tracking data:', error);
      setLoadError("Couldn't load tracking data. Please try again.");
    } finally {
      setLoading(false);
    }
  };
  
  const handleGetDirections = () => {
    if (!trackingData?.shippingAddress?.location?.coordinates) return;
    
    const destination = {
      latitude: trackingData.shippingAddress.location.coordinates[1],
      longitude: trackingData.shippingAddress.location.coordinates[0],
    };
    
    const url = Platform.select({
      ios: `maps://app?daddr=${destination.latitude},${destination.longitude}`,
      android: `google.navigation:q=${destination.latitude},${destination.longitude}`,
    });
    
    if (url) {
      Linking.openURL(url).catch(err => 
        console.error('Error opening navigation app:', err)
      );
    }
  };
  
  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text style={styles.loadingText}>Loading tracking information...</Text>
      </View>
    );
  }
  
  if (!trackingData || !trackingData.tracking) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <FontAwesome name="arrow-left" size={24} color={theme.colors.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Order Tracking</Text>
          <View style={{ width: 24 }} />
        </View>
        
        <View style={styles.noTrackingContainer}>
          <MaterialCommunityIcons 
            name="map-marker-off" 
            size={64} 
            color={theme.colors.textLight} 
          />
          <Text style={styles.noTrackingText}>
            Tracking information is not available for this order yet
          </Text>
          <TouchableOpacity 
            style={styles.refreshButton}
            onPress={loadTrackingData}
          >
            <Text style={styles.refreshButtonText}>Refresh</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }
  
  const initialRegion = routeCoordinates.length > 0 
    ? {
        latitude: routeCoordinates[0].latitude,
        longitude: routeCoordinates[0].longitude,
        latitudeDelta: 0.05,
        longitudeDelta: 0.05,
      }
    : trackingData.tracking.currentLocation
      ? {
          latitude: trackingData.tracking.currentLocation.coordinates[1],
          longitude: trackingData.tracking.currentLocation.coordinates[0],
          latitudeDelta: 0.05,
          longitudeDelta: 0.05,
        }
      : undefined;
  
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <FontAwesome name="arrow-left" size={24} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Order Tracking</Text>
        <TouchableOpacity 
          style={styles.refreshButton}
          onPress={loadTrackingData}
        >
          <FontAwesome name="refresh" size={20} color={theme.colors.primary} />
        </TouchableOpacity>
      </View>
      
      {loadError && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{loadError}</Text>
        </View>
      )}
      
      {lastUpdateTime && (
        <Text style={styles.lastUpdateText}>
          Last updated: {lastUpdateTime.toLocaleTimeString()}
        </Text>
      )}
      
      {/* Main Map View */}
      <View style={styles.mapContainer}>
        <MapView
          ref={mapRef}
          provider={PROVIDER_GOOGLE}
          style={styles.map}
          region={initialRegion}
          showsUserLocation={true}
          showsCompass={true}
          showsScale={true}
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
                <FontAwesome name="truck" size={18} color={theme.colors.white} />
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
                <FontAwesome name="map-marker" size={18} color={theme.colors.white} />
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
      </View>
      
      {/* Bottom Tracking Information Card */}
      <Card3D style={styles.trackingInfoCard}>
        <View style={styles.trackingHeader}>
          <View style={styles.statusIconContainer}>
            <FontAwesome
              name={trackingData.tracking.status === 'preparing' ? 'cube' : 
                   trackingData.tracking.status === 'ready_for_pickup' ? 'shopping-bag' :
                   trackingData.tracking.status === 'in_transit' ? 'truck' : 
                   trackingData.tracking.status === 'delivered' ? 'check-circle' : 'clock-o'}
              size={24}
              color={theme.colors.white}
            />
          </View>
          <View style={styles.statusTextContainer}>
            <Text style={styles.statusTitle}>Status</Text>
            <Text style={styles.statusText}>
              {trackingData.tracking.status
                ? OrderTrackingService.getStatusMessage(trackingData.tracking.status)
                : "Tracking your order..."}
            </Text>
          </View>
        </View>
        
        <View style={styles.infoContainer}>
          {distance && (
            <View style={styles.infoItem}>
              <FontAwesome name="road" size={18} color={theme.colors.textLight} />
              <Text style={styles.infoText}>Distance: {distance}</Text>
            </View>
          )}
          
          {eta && (
            <View style={styles.infoItem}>
              <FontAwesome name="clock-o" size={18} color={theme.colors.textLight} />
              <Text style={styles.infoText}>Estimated Arrival: {eta}</Text>
            </View>
          )}
          
          {trackingData.tracking.lastUpdated && (
            <View style={styles.infoItem}>
              <FontAwesome name="refresh" size={18} color={theme.colors.textLight} />
              <Text style={styles.infoText}>
                Last Updated: {new Date(trackingData.tracking.lastUpdated).toLocaleTimeString()}
              </Text>
            </View>
          )}
        </View>
        
        <View style={styles.buttonContainer}>
          <TouchableOpacity 
            style={styles.directionsButton}
            onPress={handleGetDirections}
          >
            <FontAwesome name="location-arrow" size={18} color={theme.colors.white} />
            <Text style={styles.directionsButtonText}>Get Directions</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.deliveryInfoButton}
            onPress={() => setShowDeliveryInfo(true)}
          >
            <FontAwesome name="info-circle" size={18} color={theme.colors.primary} />
            <Text style={styles.deliveryInfoButtonText}>Delivery Info</Text>
          </TouchableOpacity>
        </View>
      </Card3D>
      
      {/* Delivery Info Modal */}
      <Modal
        visible={showDeliveryInfo}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowDeliveryInfo(false)}
      >
        <View style={styles.modalContainer}>
          <Card3D style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Delivery Information</Text>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => setShowDeliveryInfo(false)}
              >
                <FontAwesome name="times" size={20} color={theme.colors.textLight} />
              </TouchableOpacity>
            </View>
            
            <View style={styles.deliveryInfoSection}>
              <Text style={styles.deliveryInfoTitle}>Delivery Address</Text>
              <Text style={styles.deliveryInfoText}>
                {trackingData.shippingAddress.location ? (
                  `${trackingData.shippingAddress.location.coordinates[1]}, ${trackingData.shippingAddress.location.coordinates[0]}`
                ) : (
                  "Address information not available"
                )}
              </Text>
            </View>
            
            <View style={styles.deliveryInfoSection}>
              <Text style={styles.deliveryInfoTitle}>Order Status</Text>
              <Text style={styles.deliveryInfoText}>
                {trackingData.status.charAt(0).toUpperCase() + trackingData.status.slice(1)}
              </Text>
            </View>
            
            <View style={styles.deliveryInfoSection}>
              <Text style={styles.deliveryInfoTitle}>Tracking Updates</Text>
              <Text style={styles.deliveryInfoText}>
                You will receive real-time updates as your order progresses.
              </Text>
            </View>
            
            <TouchableOpacity 
              style={styles.closeModalButton}
              onPress={() => setShowDeliveryInfo(false)}
            >
              <Text style={styles.closeModalButtonText}>Close</Text>
            </TouchableOpacity>
          </Card3D>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 50,
    paddingBottom: 16,
    backgroundColor: theme.colors.white,
    ...Platform.select({
      ios: {
        shadowColor: theme.colors.dark,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 3,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: theme.colors.text,
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  refreshButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.colors.background,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: theme.colors.textLight,
  },
  noTrackingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  noTrackingText: {
    fontSize: 16,
    color: theme.colors.textLight,
    textAlign: 'center',
    marginTop: 16,
    marginBottom: 24,
  },
  refreshButtonText: {
    color: theme.colors.primary,
    fontSize: 16,
    fontWeight: 'bold',
  },
  mapContainer: {
    flex: 1,
  },
  map: {
    ...StyleSheet.absoluteFillObject,
  },
  deliveryMarker: {
    backgroundColor: theme.colors.primary,
    padding: 8,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: 'white',
  },
  destinationMarker: {
    backgroundColor: theme.colors.error,
    padding: 8,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: 'white',
  },
  trackingInfoCard: {
    position: 'absolute',
    bottom: 20,
    left: 20,
    right: 20,
    padding: 16,
    backgroundColor: theme.colors.white,
  },
  trackingHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  statusIconContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: theme.colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
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
    fontSize: 18,
    fontWeight: 'bold',
    color: theme.colors.text,
  },
  infoContainer: {
    marginBottom: 16,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  infoText: {
    fontSize: 14,
    color: theme.colors.text,
    marginLeft: 10,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  directionsButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.primary,
    padding: 12,
    borderRadius: 8,
    marginRight: 8,
  },
  directionsButtonText: {
    color: theme.colors.white,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  deliveryInfoButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.white,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: theme.colors.primary,
    marginLeft: 8,
  },
  deliveryInfoButtonText: {
    color: theme.colors.primary,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalContent: {
    padding: 20,
    backgroundColor: theme.colors.white,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: theme.colors.text,
  },
  closeButton: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: theme.colors.lightGray,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deliveryInfoSection: {
    marginBottom: 16,
  },
  deliveryInfoTitle: {
    fontSize: 14,
    color: theme.colors.textLight,
    marginBottom: 4,
  },
  deliveryInfoText: {
    fontSize: 16,
    color: theme.colors.text,
  },
  closeModalButton: {
    backgroundColor: theme.colors.primary,
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 16,
  },
  closeModalButtonText: {
    color: theme.colors.white,
    fontWeight: 'bold',
    fontSize: 16,
  },
  errorContainer: {
    backgroundColor: `${theme.colors.error}20`,
    padding: 8,
    marginHorizontal: 16,
    borderRadius: 8,
    marginTop: 8,
  },
  errorText: {
    color: theme.colors.error,
    textAlign: 'center',
    fontSize: 14,
  },
  lastUpdateText: {
    fontSize: 12,
    color: theme.colors.textLight,
    textAlign: 'center',
    marginTop: 4,
  }
});

export default OrderTrackingScreen; 
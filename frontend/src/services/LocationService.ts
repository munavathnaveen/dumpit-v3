import axios from 'axios';
import * as Location from 'expo-location';
import { getAuthHeader } from '../utils/auth';

// Get API_URL from environment or use default
const API_URL = process.env.API_URL || 'http://localhost:5000/api/v1';
// Get Google Maps API key from environment
const GOOGLE_MAPS_API_KEY = process.env.GOOGLE_MAPS_API_KEY || '';

export interface Coordinates {
  latitude: number;
  longitude: number;
}

export interface Address {
  village: string;
  street: string;
  district: string;
  state: string;
  pincode: string;
  phone: string;
}

export interface LocationType {
  type: string;
  coordinates: number[];
}

export interface DistanceMatrixResult {
  origin_addresses: string[];
  destination_addresses: string[];
  rows: {
    elements: {
      distance: {
        text: string;
        value: number;
      };
      duration: {
        text: string;
        value: number;
      };
      status: string;
    }[];
  }[];
  status: string;
}

export interface DirectionsResult {
  routes: {
    legs: {
      distance: {
        text: string;
        value: number;
      };
      duration: {
        text: string;
        value: number;
      };
      steps: {
        distance: {
          text: string;
          value: number;
        };
        duration: {
          text: string;
          value: number;
        };
        start_location: {
          lat: number;
          lng: number;
        };
        end_location: {
          lat: number;
          lng: number;
        };
        html_instructions: string;
        travel_mode: string;
        polyline: {
          points: string;
        };
      }[];
    }[];
    overview_polyline: {
      points: string;
    };
  }[];
}

export class LocationService {
  // Get current location coordinates
  static async getCurrentLocation(): Promise<Coordinates> {
    const { status } = await Location.requestForegroundPermissionsAsync();
    
    if (status !== 'granted') {
      throw new Error('Permission to access location was denied');
    }
    
    const location = await Location.getCurrentPositionAsync({});
    return {
      latitude: location.coords.latitude,
      longitude: location.coords.longitude,
    };
  }
  
  // Geocode an address to get coordinates
  static async geocodeAddress(address: Address): Promise<LocationType> {
    try {
      const response = await axios.post(
        `${API_URL}/location/geocode`,
        { address },
        { headers: await getAuthHeader() }
      );
      
      return response.data.data.location;
    } catch (error) {
      console.error('Error geocoding address:', error);
      throw new Error('Failed to geocode address');
    }
  }
  
  // Get coordinates from a string address (using Google Maps API directly)
  static async geocodeStringAddress(address: string): Promise<Coordinates> {
    try {
      const response = await axios.get(
        `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(
          address
        )}&key=${GOOGLE_MAPS_API_KEY}`
      );
      
      if (response.data.status !== 'OK') {
        throw new Error(`Geocoding failed: ${response.data.status}`);
      }
      
      const location = response.data.results[0].geometry.location;
      return {
        latitude: location.lat,
        longitude: location.lng,
      };
    } catch (error) {
      console.error('Error geocoding string address:', error);
      throw new Error('Failed to geocode address');
    }
  }
  
  // Calculate distance between two coordinates
  static async calculateDistance(
    origins: Coordinates | Coordinates[],
    destinations: Coordinates | Coordinates[]
  ): Promise<DistanceMatrixResult> {
    try {
      const response = await axios.post(
        `${API_URL}/location/distance`,
        { origins, destinations },
        { headers: await getAuthHeader() }
      );
      
      return response.data.data;
    } catch (error) {
      console.error('Error calculating distance:', error);
      throw new Error('Failed to calculate distance');
    }
  }
  
  // Calculate distance using Google Maps API directly
  static async getDistanceMatrix(
    origins: Coordinates | Coordinates[],
    destinations: Coordinates | Coordinates[]
  ): Promise<DistanceMatrixResult> {
    try {
      // Format origins and destinations
      const originsStr = Array.isArray(origins)
        ? origins.map(coord => `${coord.latitude},${coord.longitude}`).join('|')
        : `${origins.latitude},${origins.longitude}`;
        
      const destinationsStr = Array.isArray(destinations)
        ? destinations.map(coord => `${coord.latitude},${coord.longitude}`).join('|')
        : `${destinations.latitude},${destinations.longitude}`;
      
      const response = await axios.get(
        `https://maps.googleapis.com/maps/api/distancematrix/json?origins=${originsStr}&destinations=${destinationsStr}&key=${GOOGLE_MAPS_API_KEY}`
      );
      
      return response.data;
    } catch (error) {
      console.error('Error getting distance matrix:', error);
      throw new Error('Failed to get distance matrix');
    }
  }
  
  // Get directions between two points
  static async getDirections(
    origin: Coordinates,
    destination: Coordinates,
    waypoints?: Coordinates[]
  ): Promise<DirectionsResult> {
    try {
      // Format origin, destination and waypoints
      const originStr = `${origin.latitude},${origin.longitude}`;
      const destinationStr = `${destination.latitude},${destination.longitude}`;
      let waypointsStr = '';
      
      if (waypoints && waypoints.length > 0) {
        waypointsStr = waypoints
          .map(point => `${point.latitude},${point.longitude}`)
          .join('|');
      }
      
      const response = await axios.get(
        `${API_URL}/location/directions`,
        {
          params: {
            origin: originStr,
            destination: destinationStr,
            waypoints: waypointsStr || undefined,
          },
          headers: await getAuthHeader(),
        }
      );
      
      return response.data.data;
    } catch (error) {
      console.error('Error getting directions:', error);
      throw new Error('Failed to get directions');
    }
  }
  
  // Get nearby shops based on user location
  static async getNearbyShops(
    coordinates: Coordinates,
    distance: number = 10
  ): Promise<any> {
    try {
      const response = await axios.get(
        `${API_URL}/shops/nearby`,
        {
          params: {
            latitude: coordinates.latitude,
            longitude: coordinates.longitude,
            distance,
          },
        }
      );
      
      return response.data;
    } catch (error) {
      console.error('Error fetching nearby shops:', error);
      throw new Error('Failed to fetch nearby shops');
    }
  }
  
  // Update user's current location
  static async updateUserLocation(coordinates: Coordinates): Promise<any> {
    try {
      const response = await axios.put(
        `${API_URL}/location`,
        {
          latitude: coordinates.latitude,
          longitude: coordinates.longitude,
        },
        { headers: await getAuthHeader() }
      );
      
      return response.data;
    } catch (error) {
      console.error('Error updating user location:', error);
      throw new Error('Failed to update user location');
    }
  }
  
  // Track an order's location
  static async trackOrder(orderId: string): Promise<any> {
    try {
      const response = await axios.get(
        `${API_URL}/orders/${orderId}/tracking`,
        { headers: await getAuthHeader() }
      );
      
      return response.data;
    } catch (error) {
      console.error('Error tracking order:', error);
      throw new Error('Failed to track order');
    }
  }
  
  // For vendors: Update order tracking information
  static async updateOrderTracking(
    orderId: string,
    trackingData: {
      latitude: number;
      longitude: number;
      status?: string;
      eta?: Date;
      distance?: number;
      route?: string;
    }
  ): Promise<any> {
    try {
      const response = await axios.put(
        `${API_URL}/orders/${orderId}/tracking`,
        trackingData,
        { headers: await getAuthHeader() }
      );
      
      return response.data;
    } catch (error) {
      console.error('Error updating order tracking:', error);
      throw new Error('Failed to update order tracking');
    }
  }
  
  // Decode a polyline to coordinates array
  static decodePolyline(encoded: string): Coordinates[] {
    const points: Coordinates[] = [];
    let index = 0;
    const len = encoded.length;
    let lat = 0;
    let lng = 0;
  
    while (index < len) {
      let b;
      let shift = 0;
      let result = 0;
      do {
        b = encoded.charCodeAt(index++) - 63;
        result |= (b & 0x1f) << shift;
        shift += 5;
      } while (b >= 0x20);
      const dlat = (result & 1) !== 0 ? ~(result >> 1) : result >> 1;
      lat += dlat;
  
      shift = 0;
      result = 0;
      do {
        b = encoded.charCodeAt(index++) - 63;
        result |= (b & 0x1f) << shift;
        shift += 5;
      } while (b >= 0x20);
      const dlng = (result & 1) !== 0 ? ~(result >> 1) : result >> 1;
      lng += dlng;
  
      points.push({
        latitude: lat / 1e5,
        longitude: lng / 1e5,
      });
    }
  
    return points;
  }

  // Format distance for display
  static formatDistance(meters: number): string {
    if (meters < 1000) {
      return `${meters.toFixed(0)} m`;
    } else {
      return `${(meters / 1000).toFixed(1)} km`;
    }
  }
  
  // Format duration for display
  static formatDuration(seconds: number): string {
    if (seconds < 60) {
      return `${seconds} sec`;
    } else if (seconds < 3600) {
      return `${Math.floor(seconds / 60)} min`;
    } else {
      const hours = Math.floor(seconds / 3600);
      const minutes = Math.floor((seconds % 3600) / 60);
      return `${hours} hr ${minutes} min`;
    }
  }
} 
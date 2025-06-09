import React, { useRef, useEffect, useState } from "react";
import { View, StyleSheet, ActivityIndicator, Platform } from "react-native";
import MapView, { Marker, PROVIDER_GOOGLE, Region, Polyline } from "react-native-maps";
import * as Location from "expo-location";
import { theme } from "../theme";

interface Location {
    latitude: number;
    longitude: number;
}

interface Route {
    coords: Location[];
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
    const [hasError, setHasError] = useState(false);

    // Validate coordinates
    const isValidCoordinate = (coord: Location): boolean => {
        return (
            coord &&
            typeof coord.latitude === 'number' &&
            typeof coord.longitude === 'number' &&
            !isNaN(coord.latitude) &&
            !isNaN(coord.longitude) &&
            coord.latitude >= -90 &&
            coord.latitude <= 90 &&
            coord.longitude >= -180 &&
            coord.longitude <= 180
        );
    };

    // Get user's current location
    useEffect(() => {
        (async () => {
            try {
                const { status } = await Location.requestForegroundPermissionsAsync();
                if (status !== "granted") {
                    console.log("Permission to access location was denied");
                    setLoading(false);
                    return;
                }

                const location = await Location.getCurrentPositionAsync({});
                
                if (!location?.coords) {
                    throw new Error("Invalid location response");
                }

                const currentLocation = {
                    latitude: location.coords.latitude,
                    longitude: location.coords.longitude,
                };

                // Validate coordinates before using
                if (!isValidCoordinate(currentLocation)) {
                    throw new Error("Invalid coordinates received from location service");
                }

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
                console.error("Error getting location:", error);
                setHasError(true);
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
            try {
                const { status } = await Location.requestForegroundPermissionsAsync();
                if (status !== "granted") return;

                locationSubscription = await Location.watchPositionAsync(
                    {
                        accuracy: Location.Accuracy.High,
                        distanceInterval: 10, // Update every 10 meters
                    },
                    (location) => {
                        if (!location?.coords) {
                            console.error("Invalid location update received");
                            return;
                        }

                        const newLocation = {
                            latitude: location.coords.latitude,
                            longitude: location.coords.longitude,
                        };

                        // Validate coordinates before using
                        if (!isValidCoordinate(newLocation)) {
                            console.error("Invalid coordinates in location update");
                            return;
                        }

                        setUserLocation(newLocation);

                        if (onUserLocationChange) {
                            onUserLocationChange(newLocation);
                        }
                    }
                );
            } catch (error) {
                console.error("Error setting up location watching:", error);
            }
        })();

        return () => {
            if (locationSubscription) {
                locationSubscription.remove();
            }
        };
    }, [followsUserLocation]);

    // Fit all markers on the map
    const fitAllMarkers = () => {
        try {
            if (mapRef.current && markers.length > 0) {
                // Validate all marker coordinates before fitting
                const validMarkers = markers.filter(marker => 
                    marker && marker.coordinate && isValidCoordinate(marker.coordinate)
                );

                if (validMarkers.length > 0) {
                    mapRef.current.fitToSuppliedMarkers(
                        validMarkers.map((marker) => marker.id),
                        {
                            edgePadding: { top: 50, right: 50, bottom: 50, left: 50 },
                            animated: true,
                        }
                    );
                }
            }
        } catch (error) {
            console.error("Error fitting markers:", error);
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
        try {
            if (editable && onMapPress && event?.nativeEvent?.coordinate) {
                const coordinate = event.nativeEvent.coordinate;
                if (isValidCoordinate(coordinate)) {
                    onMapPress(coordinate);
                }
            }
        } catch (error) {
            console.error("Error handling map press:", error);
        }
    };

    // Handle region changes
    const handleRegionChange = (newRegion: Region) => {
        try {
            // Validate region before using
            if (newRegion && 
                typeof newRegion.latitude === 'number' &&
                typeof newRegion.longitude === 'number' &&
                !isNaN(newRegion.latitude) &&
                !isNaN(newRegion.longitude)) {
                
                setMapRegion(newRegion);
                if (onRegionChange) {
                    onRegionChange(newRegion);
                }
            }
        } catch (error) {
            console.error("Error handling region change:", error);
        }
    };

    if (loading) {
        return (
            <View style={[styles.container, style]}>
                <ActivityIndicator size="large" color={theme.colors.primary} />
            </View>
        );
    }

    if (hasError) {
        return (
            <View style={[styles.container, style, styles.errorContainer]}>
                {/* Could add error UI here */}
            </View>
        );
    }

    // Filter out invalid markers
    const validMarkers = markers.filter(marker => 
        marker && 
        marker.coordinate && 
        isValidCoordinate(marker.coordinate) &&
        marker.id
    );

    // Filter out invalid route coordinates
    const validRoute = route && route.coords ? {
        ...route,
        coords: route.coords.filter(coord => isValidCoordinate(coord))
    } : null;

    try {
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
                    {validMarkers.map((marker) => (
                        <Marker
                            key={marker.id}
                            identifier={marker.id}
                            coordinate={marker.coordinate}
                            title={marker.title || ""}
                            description={marker.description || ""}
                            pinColor={marker.pinColor}
                            onPress={() => {
                                try {
                                    if (onMarkerPress) {
                                        onMarkerPress(marker.id);
                                    }
                                } catch (error) {
                                    console.error("Error handling marker press:", error);
                                }
                            }}
                        />
                    ))}

                    {validRoute && validRoute.coords.length > 0 && (
                        <Polyline 
                            coordinates={validRoute.coords} 
                            strokeWidth={4} 
                            strokeColor={theme.colors.primary} 
                        />
                    )}
                </MapView>
            </View>
        );
    } catch (error) {
        console.error("Error rendering MapView:", error);
        return (
            <View style={[styles.container, style, styles.errorContainer]}>
                {/* Error fallback UI */}
            </View>
        );
    }
};

const styles = StyleSheet.create({
    container: {
        overflow: "hidden",
        justifyContent: "center",
        alignItems: "center",
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
        width: "100%",
        height: "100%",
    },
    errorContainer: {
        backgroundColor: theme.colors.lightGray,
    },
});

export default MapViewComponent;

import React, { useRef, useEffect, useState, useCallback, memo } from "react";
import {
    View,
    StyleSheet,
    ActivityIndicator,
    Platform,
    StyleProp,
    ViewStyle,
    Alert,
} from "react-native";
import MapView, {
    Marker,
    PROVIDER_GOOGLE,
    Region,
    Polyline,
    MapPressEvent,
    MapViewProps,
    MarkerPressEvent,
    UserLocationChangeEvent,
} from "react-native-maps";
import * as Location from "expo-location";
import { theme } from "../theme";

interface LocationType {
    latitude: number;
    longitude: number;
}

interface Route {
    coords: LocationType[];
}

interface MarkerData {
    id: string;
    coordinate: LocationType;
    title?: string;
    description?: string;
    pinColor?: string;
}

interface Props extends Omit<Partial<MapViewProps>, 'onMarkerPress' | 'onUserLocationChange'> {
    style?: StyleProp<ViewStyle>;
    initialRegion?: Region;
    markers?: MarkerData[];
    showsUserLocation?: boolean;
    followsUserLocation?: boolean;
    zoomEnabled?: boolean;
    onRegionChange?: (region: Region) => void;
    onUserLocationChange?: (location: LocationType) => void;
    onMarkerPress?: (markerId: string) => void;
    route?: Route;
    editable?: boolean;
    onMapPress?: (coordinate: LocationType) => void;
}

const DEFAULT_REGION: Region = {
    latitude: 12.9716,
    longitude: 77.5946,
    latitudeDelta: 0.0922,
    longitudeDelta: 0.0421,
};

const LOCATION_OPTIONS = {
    accuracy: Location.Accuracy.High,
    distanceInterval: 10,
    timeInterval: 5000,
};

const isValidCoordinate = ({ latitude, longitude }: LocationType): boolean =>
    !isNaN(latitude) &&
    !isNaN(longitude) &&
    latitude >= -90 &&
    latitude <= 90 &&
    longitude >= -180 &&
    longitude <= 180;

const handleLocationError = (error: any) => {
    console.error("Location Error:", error);
    Alert.alert(
        "Location Error",
        "Unable to access location. Please check your location settings and try again.",
        [{ text: "OK" }]
    );
};

const MapViewComponent: React.FC<Props> = memo(({
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
    ...mapProps
}) => {
    const mapRef = useRef<MapView>(null);
    const [loading, setLoading] = useState(true);
    const [userLocation, setUserLocation] = useState<LocationType | null>(null);
    const [mapRegion, setMapRegion] = useState(initialRegion || DEFAULT_REGION);
    const [locationPermission, setLocationPermission] = useState<boolean>(false);

    // Request location permission
    const requestLocationPermission = useCallback(async () => {
        try {
            const { status } = await Location.requestForegroundPermissionsAsync();
            setLocationPermission(status === "granted");
            return status === "granted";
        } catch (error) {
            handleLocationError(error);
            return false;
        }
    }, []);

    // Get current location
    const getCurrentLocation = useCallback(async () => {
        try {
            const hasPermission = await requestLocationPermission();
            if (!hasPermission) return;

            const { coords } = await Location.getCurrentPositionAsync({
                accuracy: Location.Accuracy.High,
            });

            const current: LocationType = {
                latitude: coords.latitude,
                longitude: coords.longitude,
            };

            if (!isValidCoordinate(current)) {
                throw new Error("Invalid coordinates");
            }

            setUserLocation(current);
            if (!initialRegion) {
                setMapRegion((prev) => ({ ...prev, ...current }));
            }
            onUserLocationChange?.(current);
        } catch (error) {
            handleLocationError(error);
        } finally {
            setLoading(false);
        }
    }, [initialRegion, onUserLocationChange, requestLocationPermission]);

    // Watch user location
    const watchUserLocation = useCallback(async () => {
        if (!followsUserLocation || !locationPermission) return;

        try {
            const subscription = await Location.watchPositionAsync(
                LOCATION_OPTIONS,
                ({ coords }) => {
                    const newLoc = {
                        latitude: coords.latitude,
                        longitude: coords.longitude,
                    };

                    if (isValidCoordinate(newLoc)) {
                        setUserLocation(newLoc);
                        onUserLocationChange?.(newLoc);
                    }
                }
            );

            return () => subscription.remove();
        } catch (error) {
            handleLocationError(error);
        }
    }, [followsUserLocation, locationPermission, onUserLocationChange]);

    // Initial setup
    useEffect(() => {
        getCurrentLocation();
    }, [getCurrentLocation]);

    // Watch location if needed
    useEffect(() => {
        const cleanup = watchUserLocation();
        return () => {
            cleanup?.then((remove) => remove?.());
        };
    }, [watchUserLocation]);

    // Fit markers into view
    useEffect(() => {
        if (mapRef.current && markers.length) {
            const validIds = markers
                .filter(({ coordinate }) => isValidCoordinate(coordinate))
                .map(({ id }) => id);

            if (validIds.length) {
                mapRef.current.fitToSuppliedMarkers(validIds, {
                    edgePadding: { top: 50, right: 50, bottom: 50, left: 50 },
                    animated: true,
                });
            }
        }
    }, [markers]);

    // Event handlers
    const handleMapPress = useCallback(
        (event: MapPressEvent) => {
            const { coordinate } = event.nativeEvent;
            if (editable && isValidCoordinate(coordinate)) {
                onMapPress?.(coordinate);
            }
        },
        [editable, onMapPress]
    );

    const handleRegionChange = useCallback((region: Region) => {
        if (isValidCoordinate(region)) {
            setMapRegion(region);
            onRegionChange?.(region);
        }
    }, [onRegionChange]);

    // Loading state
    if (loading) {
        return (
            <View style={[styles.container, style]}>
                <ActivityIndicator size="large" color={theme.colors.primary} />
            </View>
        );
    }

    // Filter valid markers and route coordinates
    const validMarkers = markers.filter(
        ({ coordinate, id }) => isValidCoordinate(coordinate) && id
    );

    const validRouteCoords = route?.coords?.filter(isValidCoordinate) || [];

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
                showsMyLocationButton
                showsCompass
                loadingEnabled
                onPress={handleMapPress}
                {...mapProps}
            >
                {validMarkers.map(({ id, coordinate, title, description, pinColor }) => (
                    <Marker
                        key={id}
                        identifier={id}
                        coordinate={coordinate}
                        title={title}
                        description={description}
                        pinColor={pinColor}
                        onPress={() => onMarkerPress?.(id)}
                    />
                ))}

                {validRouteCoords.length > 0 && (
                    <Polyline
                        coordinates={validRouteCoords}
                        strokeWidth={4}
                        strokeColor={theme.colors.primary}
                    />
                )}
            </MapView>
        </View>
    );
});

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
});

export default MapViewComponent;

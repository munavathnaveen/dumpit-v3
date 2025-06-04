import React, { useEffect, useState, useCallback, useRef } from "react";
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, Image, RefreshControl, Modal, ScrollView, Platform, Alert, SafeAreaView, Animated } from "react-native";
import { useSelector, useDispatch } from "react-redux";
import { FontAwesome, Ionicons, MaterialIcons } from "@expo/vector-icons";
import * as Location from "expo-location";
import debounce from "lodash.debounce";

import { RootState, AppDispatch } from "../store";
import { theme } from "../theme";
import { getShops, getNearbyShops, ShopsResponse, getShopCategories, searchShops, Shop as ApiShop, enhancedSearchShops } from "../api/shopApi";
import Card3D from "../components/Card3D";
import SearchBar from "../components/SearchBar";
import ScreenHeader from "../components/ScreenHeader";
import { useRoute, useNavigation } from "../navigation/hooks";
import alert from "../utils/alert";
import { LocationService, Coordinates } from "../services/LocationService";

// Define a flexible address type that can handle both string and object formats
type ShopAddress =
    | string
    | {
          village: string;
          district: string;
      };

// Update the Shop type to properly extend ApiShop
type Shop = Omit<ApiShop, "logo"> & {
    logo?: string;
    image?: string;
    distance?: number | string;
};

type ShopFilters = {
    category?: string;
    isOpen?: boolean;
    minRating?: number;
    sort?: string;
    nearby?: boolean;
};

const ShopsScreen: React.FC = () => {
    const navigation = useNavigation();
    const route = useRoute<"Shops">();
    const dispatch = useDispatch<AppDispatch>();
    const [shops, setShops] = useState<Shop[]>([]);
    const [filteredShops, setFilteredShops] = useState<Shop[]>([]);
    const [searchQuery, setSearchQuery] = useState<string>("");
    const [internalSearchQuery, setInternalSearchQuery] = useState<string>("");
    const [loading, setLoading] = useState(false);
    const [refreshing, setRefreshing] = useState(false);
    const [isSearching, setIsSearching] = useState(false);

    // Pagination states for infinite scroll
    const [currentPage, setCurrentPage] = useState(1);
    const [hasMoreShops, setHasMoreShops] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const [totalPages, setTotalPages] = useState(1);

    // Filter states
    const [filterModalVisible, setFilterModalVisible] = useState(false);
    const [shopCategories, setShopCategories] = useState<string[]>([]);
    const [selectedCategory, setSelectedCategory] = useState<string>("");
    const [onlyOpen, setOnlyOpen] = useState(false);
    const [minRating, setMinRating] = useState(0);
    const [sortBy, setSortBy] = useState("");
    const [showNearby, setShowNearby] = useState(false);
    const [loadingCategories, setLoadingCategories] = useState(false);

    // Add location state
    const [userLocation, setUserLocation] = useState<Coordinates | null>(null);
    const [locationPermissionDenied, setLocationPermissionDenied] = useState(false);
    const [shopDistances, setShopDistances] = useState<Record<string, string>>({});

    // Scroll detection for hiding/showing header and navbar
    const scrollY = useRef(new Animated.Value(0)).current;
    const [isScrolling, setIsScrolling] = useState(false);
    const [showNavigation, setShowNavigation] = useState(true);
    const scrollTimeout = useRef<NodeJS.Timeout | null>(null);

    // Create a properly implemented debounced search function with 1-second delay
    const debouncedSearch = useCallback(
        debounce((text: string) => {
            setSearchQuery(text);
            setIsSearching(!!text.trim());
        }, 1000), // 1000ms (1 second) delay
        []
    );

    // Handle search text changes
    const handleSearch = (text: string) => {
        setInternalSearchQuery(text); // Update local state for immediate UI feedback
        debouncedSearch(text); // Debounce the actual search query update
    };

    useEffect(() => {
        fetchShopCategories();

        // Reset pagination when the component mounts
        setCurrentPage(1);
        setHasMoreShops(true);

        // Initialize from route params
        if (route.params?.searchQuery) {
            const routeSearchQuery = route.params.searchQuery;
            setInternalSearchQuery(routeSearchQuery);
            setSearchQuery(routeSearchQuery);
            setIsSearching(!!routeSearchQuery.trim());
        }

        loadShops();
    }, []);

    useEffect(() => {
        // Update search query when route params change
        if (route.params?.searchQuery) {
            const routeSearchQuery = route.params.searchQuery;
            setInternalSearchQuery(routeSearchQuery);
            setSearchQuery(routeSearchQuery);
            setIsSearching(!!routeSearchQuery.trim());
        } else if (route.params && "searchQuery" in route.params && route.params.searchQuery === undefined) {
            // If searchQuery exists in route.params but is undefined, reset it
            setInternalSearchQuery("");
            setSearchQuery("");
            setIsSearching(false);
        }
    }, [route.params]);

    useEffect(() => {
        if (showNearby && !userLocation && !locationPermissionDenied) {
            getUserLocation();
        }
    }, [showNearby]);

    // Load shops when search query or filters change
    useEffect(() => {
        // Reset pagination when filters change
        setCurrentPage(1);
        setHasMoreShops(true);
        setFilteredShops([]);

        loadShops();
    }, [searchQuery, selectedCategory, onlyOpen, minRating, sortBy, showNearby, userLocation]);

    useEffect(() => {
        const calculateDistances = async () => {
            if (!userLocation || !filteredShops.length) {
                console.log("Missing user location or no shops - cannot calculate distances");
                return;
            }

            console.log("Calculating distances for", filteredShops.length, "shops");

            // Extract shops with valid location data
            const shopsWithLocation = filteredShops.filter(
                (shop) => shop.location && shop.location.coordinates && shop.location.coordinates.length === 2 && shop.location.coordinates[0] !== 0 && shop.location.coordinates[1] !== 0
            );

            if (!shopsWithLocation.length) {
                console.log("No shops with valid coordinates found");
                return;
            }

            console.log("Found", shopsWithLocation.length, "shops with valid coordinates");

            try {
                // Calculate distances in batches to avoid API limits
                const batchSize = 25;
                const distances: Record<string, string> = {};

                for (let i = 0; i < shopsWithLocation.length; i += batchSize) {
                    const batch = shopsWithLocation.slice(i, i + batchSize);

                    console.log(`Calculating distances for batch ${i / batchSize + 1} (${batch.length} shops)`);

                    // Handle single destination at a time since getDistanceMatrix returns simplified format
                    for (const shop of batch) {
                        try {
                            const distanceMatrix = await LocationService.getDistanceMatrix(userLocation, {
                                latitude: shop.location.coordinates[1],
                                longitude: shop.location.coordinates[0],
                            });

                            if (distanceMatrix && distanceMatrix.distance) {
                                distances[shop._id] = LocationService.formatDistance(distanceMatrix.distance);
                            } else {
                                console.log(`Distance calculation failed for shop ${shop.name} (${shop._id})`);
                            }
                        } catch (error) {
                            console.error(`Error calculating distance for shop ${shop.name}:`, error);
                        }
                    }
                }

                const distanceCount = Object.keys(distances).length;
                console.log(
                    `Successfully calculated distances for ${distanceCount}/${shopsWithLocation.length} shops:`,
                    Object.entries(distances)
                        .slice(0, 5)
                        .map(([id, dist]) => `${id}: ${dist}`)
                        .join(", ") + (distanceCount > 5 ? "..." : "")
                );

                setShopDistances(distances);
            } catch (error) {
                console.error("Error in distance calculation:", error);
            }
        };

        calculateDistances();
    }, [filteredShops, userLocation]);

    const fetchShopCategories = async () => {
        try {
            setLoadingCategories(true);

            // Fetch categories from API
            const response = await getShopCategories();
            if (response.success) {
                setShopCategories(response.data);
            } else {
                // Fallback to extracting from loaded shops if API fails
                const categoriesSet = new Set<string>();
                shops.forEach((shop) => {
                    if (shop.categories && shop.categories.length > 0) {
                        shop.categories.forEach((category) => categoriesSet.add(category));
                    }
                });

                setShopCategories(Array.from(categoriesSet).sort());
            }
        } catch (error) {
            console.error("Failed to fetch shop categories:", error);
            // Fallback to extracting from loaded shops
            const categoriesSet = new Set<string>();
            shops.forEach((shop) => {
                if (shop.categories && shop.categories.length > 0) {
                    shop.categories.forEach((category) => categoriesSet.add(category));
                }
            });

            setShopCategories(Array.from(categoriesSet).sort());
        } finally {
            setLoadingCategories(false);
        }

        // Add back the getUserLocation function after the fetchShopCategories function
        getUserLocation();
    };

    const getUserLocation = async () => {
        try {
            console.log("Requesting location permission...");
            const { status } = await Location.requestForegroundPermissionsAsync();
            if (status !== "granted") {
                console.log("Location permission denied:", status);
                setLocationPermissionDenied(true);
                alert("Permission Denied", "Please enable location services to find nearby shops.", [{ text: "OK" }]);
                return null;
            }

            setLocationPermissionDenied(false);
            console.log("Permission granted, getting current location...");

            // Try to get high accuracy location first
            try {
                const location = await Location.getCurrentPositionAsync({
                    accuracy: Location.Accuracy.High,
                });

                console.log("Got high accuracy location:", location.coords.latitude, location.coords.longitude);

                setUserLocation({
                    latitude: location.coords.latitude,
                    longitude: location.coords.longitude,
                });

                return location.coords;
            } catch (highAccuracyError) {
                console.warn("High accuracy location failed, falling back to low accuracy:", highAccuracyError);

                // Fallback to lower accuracy
                const location = await Location.getCurrentPositionAsync({});

                console.log("Got standard accuracy location:", location.coords.latitude, location.coords.longitude);

                setUserLocation({
                    latitude: location.coords.latitude,
                    longitude: location.coords.longitude,
                });

                return location.coords;
            }
        } catch (error) {
            console.error("Error getting location:", error);
            setLocationPermissionDenied(true);

            alert("Location Error", "Could not get your current location. Please check your device settings.", [{ text: "OK" }]);
            return null;
        }
    };

    const loadShops = async () => {
        try {
            if (currentPage === 1) {
                setLoading(true);
            } else {
                setLoadingMore(true);
            }

            console.log(`Loading shops page ${currentPage}`);

            // Build query string based on filters
            let queryParams = [];

            // Add pagination parameters
            queryParams.push(`page=${currentPage}`);
            queryParams.push(`limit=10`);

            // Add category filter if selected
            if (selectedCategory) {
                queryParams.push(`categories=${selectedCategory}`);
            }

            // Add rating filter if set
            if (minRating > 0) {
                queryParams.push(`rating[gte]=${minRating}`);
            }

            // Add sort parameter if set
            if (sortBy) {
                queryParams.push(`sort=${sortBy}`);
            }

            // Add isOpen filter if selected
            if (onlyOpen) {
                queryParams.push(`isOpen=true`);
            }

            const queryString = queryParams.join("&");
            console.log(`Query string: ${queryString}`);

            let response: ShopsResponse;

            if (searchQuery && searchQuery.trim() !== "") {
                // Use search API if search query is provided
                if (showNearby && userLocation) {
                    // Add location parameters for nearby search
                    const nearbyParams = `&latitude=${userLocation.latitude}&longitude=${userLocation.longitude}`;
                    response = await searchShops(searchQuery + nearbyParams);
                } else {
                    // Use enhanced search with pagination
                    response = await enhancedSearchShops(searchQuery, currentPage, 10);
                }
            } else if (showNearby && userLocation) {
                // Get nearby shops with location
                response = await getNearbyShops(userLocation, 10000);
            } else {
                // Get regular shops with filters
                response = await getShops(queryString);
            }

            // Extract pagination info
            if (response.pagination) {
                setTotalPages(response.pagination.pages || 1);
                setHasMoreShops(currentPage < (response.pagination.pages || 1));
            } else {
                setHasMoreShops(false);
            }

            // Process and update the shops list
            let shopsData = response.data;

            // Format shop addresses if needed (existing code)
            // ...

            // Apply additional client-side filters if needed
            shopsData = applyFiltersToShops(shopsData);

            // If loading the first page, replace the list
            // Otherwise append to the existing list
            if (currentPage === 1) {
                setFilteredShops(shopsData);
                // Keep a complete list for client-side filtering
                setShops(response.data);
            } else {
                setFilteredShops((prevShops) => [...prevShops, ...shopsData]);
                setShops((prevShops) => [...prevShops, ...response.data]);
            }

            console.log(`Loaded ${shopsData.length} shops. Total: ${response.count}`);
        } catch (error) {
            console.error("Error loading shops:", error);
            alert("Failed to load shops. Please try again.");
        } finally {
            setLoading(false);
            setLoadingMore(false);
        }
    };

    // Function to handle loading more when user reaches end of list
    const handleLoadMore = () => {
        if (!loading && !loadingMore && hasMoreShops) {
            console.log(`Loading more shops. Current page: ${currentPage}, Total pages: ${totalPages}`);
            setLoadingMore(true);
            setCurrentPage((prevPage) => prevPage + 1);
        }
    };

    // Watch for currentPage changes to load more data
    useEffect(() => {
        if (currentPage > 1) {
            loadShops();
        }
    }, [currentPage]);

    // Apply client-side filters to shops
    const applyFiltersToShops = (shopsData: Shop[]) => {
        let filtered = [...shopsData];

        // Apply category filter if not already applied in API call
        if (selectedCategory) {
            filtered = filtered.filter((shop) => shop.categories && shop.categories.includes(selectedCategory));
        }

        // Apply open filter if not already applied in API call
        if (onlyOpen) {
            filtered = filtered.filter((shop) => shop.isOpen);
        }

        // Apply rating filter if not already applied in API call
        if (minRating > 0) {
            filtered = filtered.filter((shop) => shop.rating >= minRating);
        }

        // Apply sorting if not already applied in API call
        if (sortBy === "rating") {
            filtered.sort((a, b) => b.rating - a.rating);
        } else if (sortBy === "name") {
            filtered.sort((a, b) => a.name.localeCompare(b.name));
        }

        return filtered;
    };

    const handleRefresh = async () => {
        // Reset to first page when refreshing
        setCurrentPage(1);
        setHasMoreShops(true);
        setRefreshing(true);
        await loadShops();
        setRefreshing(false);
    };

    const handleFilterPress = () => {
        setFilterModalVisible(true);
    };

    const applyFilters = () => {
        setFilterModalVisible(false);
        loadShops();
    };

    const resetFilters = () => {
        setSelectedCategory("");
        setOnlyOpen(false);
        setMinRating(0);
        setSortBy("");
        setShowNearby(false);

        if (!isSearching) {
            loadShops();
        }

        setFilterModalVisible(false);
    };

    const clearAllFiltersAndSearch = () => {
        setInternalSearchQuery("");
        setSearchQuery("");
        setIsSearching(false);
        resetFilters();
        loadShops();
    };

    // Shop item renderer
    const renderShopItem = ({ item }: { item: Shop }) => (
        <View style={styles.shopCardWrapper}>
            <Card3D style={styles.shopCard}>
                <TouchableOpacity onPress={() => navigation.navigate("ShopDetails", { shopId: item._id })} activeOpacity={0.9} style={styles.cardTouchable}>
                    <View style={styles.shopImageContainer}>
                        <Image source={{ uri: item.logo || item.image || "https://via.placeholder.com/150" }} style={styles.shopImage} resizeMode="cover" />
                        {item.isOpen ? (
                            <View style={styles.openBadge}>
                                <Text style={styles.openBadgeText}>Open</Text>
                            </View>
                        ) : (
                            <View style={[styles.openBadge, styles.closedBadge]}>
                                <Text style={styles.closedBadgeText}>Closed</Text>
                            </View>
                        )}
                    </View>

                    <View style={styles.shopInfo}>
                        <Text style={styles.shopName} numberOfLines={2}>
                            {item.name}
                        </Text>

                        <View style={styles.ratingContainer}>
                            <Ionicons name="star" size={14} color="#FFD700" />
                            <Text style={styles.ratingText}>{item.rating.toFixed(1)}</Text>
                            <Text style={styles.reviewCount}>({item.reviews?.length || 0})</Text>
                        </View>

                        {item.distance || shopDistances[item._id] ? (
                            <View style={styles.distanceContainer}>
                                <FontAwesome name="map-marker" size={12} color={theme.colors.primary} />
                                <Text style={styles.distanceText}>
                                    {typeof item.distance === "number" ? LocationService.formatDistance(item.distance) : item.distance || shopDistances[item._id]} away
                                </Text>
                            </View>
                        ) : null}

                        {item.categories && item.categories.length > 0 && (
                            <View style={styles.categoriesContainer}>
                                {item.categories.slice(0, 2).map((category, index) => (
                                    <TouchableOpacity
                                        key={index}
                                        style={styles.categoryTag}
                                        onPress={() => {
                                            setSelectedCategory(category);
                                            loadShops();
                                        }}
                                    >
                                        <Text style={styles.categoryTagText}>{category}</Text>
                                    </TouchableOpacity>
                                ))}
                                {item.categories.length > 2 && <Text style={styles.moreCategories}>+{item.categories.length - 2}</Text>}
                            </View>
                        )}
                    </View>
                </TouchableOpacity>
            </Card3D>
        </View>
    );

    // Render the filters modal
    const renderFiltersModal = () => (
        <Modal visible={filterModalVisible} transparent={true} animationType="slide" onRequestClose={() => setFilterModalVisible(false)}>
            <View style={styles.modalContainer}>
                <View style={styles.modalContent}>
                    <View style={styles.modalHeader}>
                        <Text style={styles.modalTitle}>Filter Shops</Text>
                        <TouchableOpacity onPress={() => setFilterModalVisible(false)}>
                            <Ionicons name="close" size={24} color={theme.colors.text} />
                        </TouchableOpacity>
                    </View>

                    <ScrollView showsVerticalScrollIndicator={false}>
                        {/* Categories filter */}
                        <View style={styles.filterSection}>
                            <Text style={styles.filterSectionTitle}>Categories</Text>
                            {loadingCategories ? (
                                <ActivityIndicator size="small" color={theme.colors.primary} />
                            ) : (
                                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoriesScrollContainer}>
                                    <TouchableOpacity style={[styles.categoryButton, selectedCategory === "" && styles.categoryButtonActive]} onPress={() => setSelectedCategory("")}>
                                        <Text style={[styles.categoryButtonText, selectedCategory === "" && styles.categoryButtonTextActive]}>All</Text>
                                    </TouchableOpacity>

                                    {shopCategories.map((category, index) => (
                                        <TouchableOpacity
                                            key={index}
                                            style={[styles.categoryButton, selectedCategory === category && styles.categoryButtonActive]}
                                            onPress={() => setSelectedCategory(category)}
                                        >
                                            <Text style={[styles.categoryButtonText, selectedCategory === category && styles.categoryButtonTextActive]}>{category}</Text>
                                        </TouchableOpacity>
                                    ))}
                                </ScrollView>
                            )}
                        </View>

                        {/* Open Only filter */}
                        <View style={styles.filterSection}>
                            <View style={styles.filterRow}>
                                <Text style={styles.filterSectionTitle}>Open Shops Only</Text>
                                <TouchableOpacity style={[styles.toggleButton, onlyOpen && styles.toggleButtonActive]} onPress={() => setOnlyOpen(!onlyOpen)}>
                                    {onlyOpen && <Ionicons name="checkmark" size={18} color="#fff" />}
                                </TouchableOpacity>
                            </View>
                        </View>

                        {/* Min Rating filter */}
                        <View style={styles.filterSection}>
                            <Text style={styles.filterSectionTitle}>Minimum Rating</Text>
                            <View style={styles.ratingButtonsContainer}>
                                {[0, 1, 2, 3, 4, 5].map((rating) => (
                                    <TouchableOpacity key={rating} style={[styles.ratingButton, minRating === rating && styles.ratingButtonActive]} onPress={() => setMinRating(rating)}>
                                        {rating > 0 ? (
                                            <View style={styles.ratingButtonContent}>
                                                <Text style={[styles.ratingButtonText, minRating === rating && styles.ratingButtonTextActive]}>{rating}</Text>
                                                <Ionicons name="star" size={12} color={minRating === rating ? "#fff" : "#FFD700"} />
                                            </View>
                                        ) : (
                                            <Text style={[styles.ratingButtonText, minRating === rating && styles.ratingButtonTextActive]}>Any</Text>
                                        )}
                                    </TouchableOpacity>
                                ))}
                            </View>
                        </View>

                        {/* Sort By filter */}
                        <View style={styles.filterSection}>
                            <Text style={styles.filterSectionTitle}>Sort By</Text>
                            <View style={styles.sortButtonsContainer}>
                                <TouchableOpacity style={[styles.sortButton, sortBy === "" && styles.sortButtonActive]} onPress={() => setSortBy("")}>
                                    <Text style={[styles.sortButtonText, sortBy === "" && styles.sortButtonTextActive]}>Default</Text>
                                </TouchableOpacity>

                                <TouchableOpacity style={[styles.sortButton, sortBy === "rating" && styles.sortButtonActive]} onPress={() => setSortBy("rating")}>
                                    <Text style={[styles.sortButtonText, sortBy === "rating" && styles.sortButtonTextActive]}>Rating</Text>
                                </TouchableOpacity>

                                <TouchableOpacity style={[styles.sortButton, sortBy === "name" && styles.sortButtonActive]} onPress={() => setSortBy("name")}>
                                    <Text style={[styles.sortButtonText, sortBy === "name" && styles.sortButtonTextActive]}>Name</Text>
                                </TouchableOpacity>
                            </View>
                        </View>

                        {/* Nearby filter */}
                        <View style={styles.filterSection}>
                            <View style={styles.filterRow}>
                                <Text style={styles.filterSectionTitle}>Show Nearby Shops</Text>
                                <TouchableOpacity style={[styles.toggleButton, showNearby && styles.toggleButtonActive]} onPress={() => setShowNearby(!showNearby)}>
                                    {showNearby && <Ionicons name="checkmark" size={18} color="#fff" />}
                                </TouchableOpacity>
                            </View>
                        </View>

                        <View style={styles.filterActions}>
                            <TouchableOpacity style={styles.resetButton} onPress={resetFilters}>
                                <Text style={styles.resetButtonText}>Reset</Text>
                            </TouchableOpacity>

                            <TouchableOpacity style={styles.applyButton} onPress={applyFilters}>
                                <Text style={styles.applyButtonText}>Apply</Text>
                            </TouchableOpacity>
                        </View>
                    </ScrollView>
                </View>
            </View>
        </Modal>
    );

    // Render a loading footer when loading more items
    const renderFooter = () => {
        if (!loadingMore) return null;

        return (
            <View style={styles.footerLoader}>
                <ActivityIndicator size="small" color={theme.colors.primary} />
                <Text style={styles.footerText}>Loading more shops...</Text>
            </View>
        );
    };

    // Scroll detection handler
    const handleScroll = Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], {
        useNativeDriver: false,
        listener: (event: any) => {
            const currentOffset = event.nativeEvent.contentOffset.y;
            const direction = currentOffset > 0 && currentOffset > (scrollY as any)._value;

            setIsScrolling(true);
            setShowNavigation(!direction);

            // Clear existing timeout
            if (scrollTimeout.current) {
                clearTimeout(scrollTimeout.current);
            }

            // Set new timeout to show navigation when scrolling stops
            scrollTimeout.current = setTimeout(() => {
                setIsScrolling(false);
                setShowNavigation(true);
            }, 1500);
        },
    });

    // Cleanup timeout on unmount
    useEffect(() => {
        return () => {
            if (scrollTimeout.current) {
                clearTimeout(scrollTimeout.current);
            }
        };
    }, []);

    return (
        <SafeAreaView style={styles.safeArea}>
            <View style={styles.container}>
                <Animated.View
                    style={[
                        styles.headerContainer,
                        {
                            transform: [
                                {
                                    translateY: showNavigation ? 0 : -100,
                                },
                            ],
                        },
                    ]}
                >
                    <ScreenHeader title="Shops" showBackButton={true} onNotificationPress={() => navigation.navigate("Notifications")} />
                </Animated.View>

                <View style={styles.contentContainer}>
                    <View style={styles.searchContainer}>
                        <SearchBar placeholder="Search shops..." onSearch={handleSearch} value={internalSearchQuery} style={styles.searchBar} />

                        <View style={styles.filterRow}>
                            <TouchableOpacity style={styles.filterButton} onPress={handleFilterPress}>
                                <FontAwesome name="filter" size={16} color={theme.colors.primary} />
                                <Text style={styles.filterButtonText}>Filters</Text>
                            </TouchableOpacity>

                            {/* Active filters display */}
                            <View style={styles.activeFiltersContainer}>
                                {(isSearching || selectedCategory || onlyOpen || minRating > 0 || sortBy || showNearby) && (
                                    <TouchableOpacity style={styles.clearFiltersButton} onPress={clearAllFiltersAndSearch}>
                                        <FontAwesome name="times-circle" size={14} color={theme.colors.error} />
                                        <Text style={styles.clearFiltersText}>Clear {isSearching ? "Search & Filters" : "Filters"}</Text>
                                    </TouchableOpacity>
                                )}
                            </View>
                        </View>
                    </View>

                    {loading && currentPage === 1 ? (
                        <View style={styles.loaderContainer}>
                            <ActivityIndicator size="large" color={theme.colors.primary} />
                        </View>
                    ) : (
                        <>
                            {filteredShops.length === 0 ? (
                                <View style={styles.emptyContainer}>
                                    <Text style={styles.emptyText}>No shops found</Text>
                                    {searchQuery || selectedCategory || minRating > 0 || onlyOpen ? (
                                        <TouchableOpacity style={styles.clearFiltersButton} onPress={clearAllFiltersAndSearch}>
                                            <Text style={styles.clearFiltersText}>Clear all filters</Text>
                                        </TouchableOpacity>
                                    ) : null}
                                </View>
                            ) : (
                                <FlatList
                                    data={filteredShops}
                                    keyExtractor={(item) => item._id}
                                    renderItem={renderShopItem}
                                    numColumns={2}
                                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
                                    ListFooterComponent={renderFooter}
                                    onEndReached={handleLoadMore}
                                    onEndReachedThreshold={0.5}
                                    contentContainerStyle={styles.shopList}
                                    showsVerticalScrollIndicator={false}
                                    onScroll={handleScroll}
                                    scrollEventThrottle={16}
                                />
                            )}
                        </>
                    )}
                </View>

                {renderFiltersModal()}
            </View>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    safeArea: {
        flex: 1,
        backgroundColor: theme.colors.background,
    },
    container: {
        flex: 1,
        backgroundColor: theme.colors.background,
    },
    headerContainer: {
        zIndex: 1000,
        backgroundColor: theme.colors.background,
    },
    contentContainer: {
        flex: 1,
        padding: theme.spacing.md,
    },
    searchContainer: {},
    searchBar: {
        marginBottom: theme.spacing.sm,
    },
    filterRow: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
    },
    filterButton: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: theme.colors.white,
        paddingHorizontal: theme.spacing.md,
        paddingVertical: theme.spacing.sm,
        borderRadius: theme.borderRadius.small,
        ...theme.shadow.small,
    },
    filterButtonText: {
        marginLeft: 8,
        color: theme.colors.primary,
        fontWeight: "600",
    },
    activeFiltersContainer: {
        flex: 1,
        alignItems: "flex-end",
    },
    clearFiltersButton: {
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: theme.spacing.sm,
        paddingVertical: 4,
    },
    clearFiltersText: {
        marginLeft: 4,
        color: theme.colors.error,
        fontSize: 12,
        fontWeight: "500",
    },
    loaderContainer: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
    },
    shopList: {
        paddingBottom: 120,
    },
    emptyContainer: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        padding: 20,
        marginTop: 40,
    },
    emptyText: {
        fontSize: 16,
        color: theme.colors.gray,
        textAlign: "center",
        marginTop: 16,
        marginBottom: 8,
    },
    shopCardWrapper: {
        width: "50%",
    },
    shopCard: {
        marginVertical: 5,
        marginHorizontal: 2,
        borderRadius: 12,
        overflow: "hidden",
        backgroundColor: theme.colors.white,
        shadowColor: theme.colors.dark,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        shadowRadius: 4,
        elevation: 3,
        aspectRatio: 0.8,
    },
    cardTouchable: {
        flex: 1,
    },
    shopImageContainer: {
        position: "relative",
        flex: 1,
        borderRadius: 50,
        aspectRatio: 1,
        justifyContent: "center",
        alignItems: "center",
        marginLeft: 15,
        backgroundColor: theme.colors.lightGray,
    },
    shopImage: {
        width: 80,
        height: 80,
        borderRadius: 50,
        borderWidth: 2,
        borderColor: theme.colors.white,
    },
    openBadge: {
        position: "absolute",
        top: 8,
        right: 8,
        backgroundColor: theme.colors.success,
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 10,
    },
    openBadgeText: {
        color: "#fff",
        fontSize: 9,
        fontWeight: "bold",
    },
    closedBadge: {
        backgroundColor: theme.colors.error,
    },
    closedBadgeText: {
        color: "#fff",
        fontSize: 9,
        fontWeight: "bold",
    },
    shopInfo: {
        padding: 12,
        flex: 1,
        justifyContent: "space-between",
    },
    shopName: {
        fontSize: 14,
        fontWeight: "600",
        color: theme.colors.text,
        marginBottom: 4,
        minHeight: 36,
    },
    ratingContainer: {
        flexDirection: "row",
        alignItems: "center",
        marginBottom: 6,
    },
    ratingText: {
        marginLeft: 4,
        color: theme.colors.text,
        fontWeight: "600",
        fontSize: 12,
    },
    reviewCount: {
        marginLeft: 4,
        color: theme.colors.textLight,
        fontSize: 10,
    },
    distanceContainer: {
        flexDirection: "row",
        alignItems: "center",
        marginBottom: 8,
    },
    distanceText: {
        fontSize: 10,
        color: theme.colors.primary,
        fontWeight: "500",
        marginLeft: 4,
    },
    categoriesContainer: {
        flexDirection: "row",
        flexWrap: "wrap",
        marginTop: 4,
    },
    categoryTag: {
        backgroundColor: theme.colors.accent,
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 10,
        marginRight: 4,
        marginBottom: 4,
    },
    categoryTagText: {
        fontSize: 9,
        color: theme.colors.white,
        fontWeight: "500",
    },
    moreCategories: {
        fontSize: 9,
        color: theme.colors.gray,
        fontWeight: "500",
    },
    modalContainer: {
        flex: 1,
        justifyContent: "flex-end",
        backgroundColor: "rgba(0, 0, 0, 0.5)",
    },
    modalContent: {
        backgroundColor: theme.colors.white,
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        padding: 16,
        maxHeight: "80%",
    },
    modalHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 16,
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: "bold",
        color: theme.colors.text,
    },
    filterSection: {
        marginBottom: 20,
    },
    filterSectionTitle: {
        fontSize: 16,
        fontWeight: "bold",
        color: theme.colors.text,
        marginBottom: 12,
    },
    categoriesScrollContainer: {
        paddingBottom: 8,
    },
    categoryButton: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
        backgroundColor: theme.colors.bgLight,
        marginRight: 8,
    },
    categoryButtonActive: {
        backgroundColor: theme.colors.primary,
    },
    categoryButtonText: {
        fontSize: 14,
        color: theme.colors.text,
    },
    categoryButtonTextActive: {
        color: theme.colors.white,
        fontWeight: "bold",
    },
    toggleButton: {
        width: 28,
        height: 28,
        borderRadius: 14,
        borderWidth: 2,
        borderColor: theme.colors.primary,
        justifyContent: "center",
        alignItems: "center",
    },
    toggleButtonActive: {
        backgroundColor: theme.colors.primary,
    },
    ratingButtonsContainer: {
        flexDirection: "row",
        justifyContent: "space-between",
    },
    ratingButton: {
        width: "15%",
        paddingVertical: 8,
        borderRadius: 20,
        backgroundColor: theme.colors.bgLight,
        justifyContent: "center",
        alignItems: "center",
    },
    ratingButtonActive: {
        backgroundColor: theme.colors.primary,
    },
    ratingButtonContent: {
        flexDirection: "row",
        alignItems: "center",
    },
    ratingButtonText: {
        fontSize: 14,
        color: theme.colors.text,
        marginRight: 2,
    },
    ratingButtonTextActive: {
        color: theme.colors.white,
        fontWeight: "bold",
    },
    sortButtonsContainer: {
        flexDirection: "row",
        justifyContent: "space-between",
    },
    sortButton: {
        width: "30%",
        paddingVertical: 8,
        borderRadius: 20,
        backgroundColor: theme.colors.bgLight,
        justifyContent: "center",
        alignItems: "center",
    },
    sortButtonActive: {
        backgroundColor: theme.colors.primary,
    },
    sortButtonText: {
        fontSize: 14,
        color: theme.colors.text,
    },
    sortButtonTextActive: {
        color: theme.colors.white,
        fontWeight: "bold",
    },
    filterActions: {
        flexDirection: "row",
        justifyContent: "space-between",
        marginTop: 20,
        marginBottom: 30,
    },
    resetButton: {
        width: "48%",
        paddingVertical: 12,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: theme.colors.primary,
        alignItems: "center",
    },
    resetButtonText: {
        color: theme.colors.primary,
        fontSize: 16,
        fontWeight: "bold",
    },
    applyButton: {
        width: "48%",
        paddingVertical: 12,
        borderRadius: 8,
        backgroundColor: theme.colors.primary,
        alignItems: "center",
    },
    applyButtonText: {
        color: theme.colors.white,
        fontSize: 16,
        fontWeight: "bold",
    },
    footerLoader: {
        alignItems: "center",
        justifyContent: "center",
        paddingVertical: 20,
        flexDirection: "row",
    },
    footerText: {
        marginLeft: 10,
        fontSize: 14,
        color: theme.colors.text,
    },
});

export default ShopsScreen;

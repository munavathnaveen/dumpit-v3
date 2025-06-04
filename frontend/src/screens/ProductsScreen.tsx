import React, { useEffect, useState, useCallback, useRef } from "react";
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, Image, RefreshControl, Modal, ScrollView, Switch, SafeAreaView, Platform, Animated } from "react-native";
import { useSelector, useDispatch } from "react-redux";
import { FontAwesome, Ionicons, MaterialIcons } from "@expo/vector-icons";
import Slider from "@react-native-community/slider";
import { RouteProp } from "@react-navigation/native";
import debounce from "lodash.debounce";
import Toast from "react-native-toast-message";

import { RootState, AppDispatch } from "../store";
import { theme } from "../theme";
import { addToCart } from "../store/cartSlice";
import { Product } from "../types/product";
import Card3D from "../components/Card3D";
import SearchBar from "../components/SearchBar";
import ScreenHeader from "../components/ScreenHeader";
import { useNavigation, useTabRoute } from "../navigation/hooks";
import { BottomTabParamList } from "../navigation/types";
import * as productApi from "../api/productApi";
import { LocationService, Coordinates } from "../services/LocationService";
import alert from "../utils/alert";

const sortOptions = [
    { label: "Price: Low to High", value: "price" },
    { label: "Price: High to Low", value: "-price" },
    { label: "Rating: High to Low", value: "-rating" },
    { label: "Newest First", value: "-createdAt" },
];

const ProductsScreen: React.FC = () => {
    const navigation = useNavigation();
    const route = useTabRoute<"ProductsTab">();
    const dispatch = useDispatch<AppDispatch>();
    const { products, error } = useSelector((state: RootState) => state.product);
    const [loading, setLoading] = useState(false);
    const [refreshing, setRefreshing] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const [internalSearchQuery, setInternalSearchQuery] = useState("");
    const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);

    // Pagination states for infinite scroll
    const [currentPage, setCurrentPage] = useState(1);
    const [hasMoreProducts, setHasMoreProducts] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const [totalPages, setTotalPages] = useState(1);

    // Filter states
    const [filterModalVisible, setFilterModalVisible] = useState(false);
    const [categories, setCategories] = useState<string[]>([]);
    const [productTypes, setProductTypes] = useState<string[]>([]);
    const [shops, setShops] = useState<{ _id: string; name: string }[]>([]);
    const [selectedCategory, setSelectedCategory] = useState<string>("");
    const [selectedType, setSelectedType] = useState<string>("");
    const [selectedShop, setSelectedShop] = useState<string>("");
    const [priceRange, setPriceRange] = useState<[number, number]>([0, 10000]);
    const [currentPriceRange, setCurrentPriceRange] = useState<[number, number]>([0, 10000]);
    const [sortBy, setSortBy] = useState<string>("");
    const [inStock, setInStock] = useState<boolean>(false);
    const [loadingCategories, setLoadingCategories] = useState(false);
    const [loadingTypes, setLoadingTypes] = useState(false);
    const [loadingShops, setLoadingShops] = useState(false);
    const [shopId, setShopId] = useState<string | undefined>(route.params?.shopId);
    const [isSearching, setIsSearching] = useState(false);
    const [userLocation, setUserLocation] = useState<Coordinates | null>(null);
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
        // Reset pagination when the component mounts or filter/search changes
        setCurrentPage(1);
        setHasMoreProducts(true);

        // Log navigation params for debugging
        console.log("Route params:", route.params);

        if (route.params?.searchQuery) {
            const routeSearchQuery = route.params.searchQuery;
            setInternalSearchQuery(routeSearchQuery);
            setSearchQuery(routeSearchQuery);
            setIsSearching(!!routeSearchQuery.trim());
        }

        if (route.params?.category) {
            setSelectedCategory(route.params.category);
        }

        if (route.params?.shopId) {
            setShopId(route.params.shopId);
            setSelectedShop(route.params.shopId);
        }

        loadProducts();
        fetchCategories();
        fetchProductTypes();
        fetchShops();
    }, []);

    useEffect(() => {
        // Update parameters when they change in the route
        if (route.params) {
            if (route.params.shopId) {
                setShopId(route.params.shopId);
                setSelectedShop(route.params.shopId);
            } else {
                setShopId(undefined);
                setSelectedShop("");
            }

            if (route.params.searchQuery) {
                const routeSearchQuery = route.params.searchQuery;
                setInternalSearchQuery(routeSearchQuery);
                setSearchQuery(routeSearchQuery);
                setIsSearching(!!routeSearchQuery.trim());
            }

            if (route.params.category) {
                setSelectedCategory(route.params.category);
            }
        }
    }, [route.params]);

    // Only load products when relevant search or filter parameters change
    useEffect(() => {
        // Reset pagination when filters change
        setCurrentPage(1);
        setHasMoreProducts(true);
        setFilteredProducts([]);

        loadProducts();
    }, [searchQuery, selectedCategory, selectedType, selectedShop, priceRange, sortBy, inStock, shopId]);

    // Get user location and calculate distances to shops
    useEffect(() => {
        const getUserLocation = async () => {
            try {
                const location = await LocationService.getCurrentLocation();
                setUserLocation(location);
                try {
                    await LocationService.updateUserLocation(location);
                } catch (error) {
                    // Silently fail if user is not logged in
                    console.log("Could not update user location in backend");
                }
            } catch (error) {
                alert(`Error getting user location`);
            }
        };

        getUserLocation();
    }, []);

    // Calculate distances to shops when products or user location change
    useEffect(() => {
        const calculateDistances = async () => {
            if (!userLocation || filteredProducts.length === 0) {
                console.log("Missing user location or empty product list - cannot calculate distances");
                return;
            }

            console.log("Calculating distances for", filteredProducts.length, "products");

            // Extract unique shops from products
            const uniqueShops = new Map();
            filteredProducts.forEach((product) => {
                if (product.shop && product.shop._id && product.shop.location && product.shop.location.coordinates && product.shop.location.coordinates.length === 2) {
                    // Validate coordinates
                    const [lng, lat] = product.shop.location.coordinates;
                    if (typeof lat === "number" && typeof lng === "number" && lat !== 0 && lng !== 0 && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
                        uniqueShops.set(product.shop._id, {
                            name: product.shop.name,
                            latitude: lat,
                            longitude: lng,
                        });
                    } else {
                        console.log(`Invalid coordinates for shop ${product.shop._id} (${product.shop.name}): [${lng}, ${lat}]`);
                    }
                }
            });

            if (uniqueShops.size === 0) {
                console.log("No shops with valid coordinates found");
                return;
            }

            console.log("Found", uniqueShops.size, "unique shops with valid coordinates");

            // Convert shops to array for distance calculation
            const shopCoordinates = Array.from(uniqueShops.entries()).map(([id, data]) => ({ id, ...data }));

            // Calculate distances in batches to avoid API limits
            const batchSize = 10; // Reduced batch size to minimize API errors
            const distances: Record<string, string> = {};
            let successCount = 0;
            let failureCount = 0;

            for (let i = 0; i < shopCoordinates.length; i += batchSize) {
                const batch = shopCoordinates.slice(i, i + batchSize);
                console.log(`Processing batch ${Math.floor(i / batchSize) + 1} of ${Math.ceil(shopCoordinates.length / batchSize)} (${batch.length} shops)`);

                // Process each shop individually to avoid batch failures
                for (const shop of batch) {
                    try {
                        // Add validation for user location
                        if (!userLocation.latitude || !userLocation.longitude) {
                            console.error("Invalid user location:", userLocation);
                            continue;
                        }

                        const distanceMatrix = await LocationService.getDistanceMatrix(userLocation, { latitude: shop.latitude, longitude: shop.longitude });

                        if (distanceMatrix?.distance && typeof distanceMatrix.distance === "number") {
                            distances[shop.id] = LocationService.formatDistance(distanceMatrix.distance);
                            successCount++;
                            console.log(`✅ Distance calculated for ${shop.name}: ${distances[shop.id]}`);
                        } else {
                            console.log(`⚠️ Invalid distance response for shop ${shop.name} (${shop.id})`);
                            failureCount++;
                        }
                    } catch (error) {
                        console.error(`❌ Error calculating distance for shop ${shop.name} (${shop.id}):`, error instanceof Error ? error.message : error);
                        failureCount++;

                        // Continue with next shop instead of breaking the entire process
                        continue;
                    }

                    // Add small delay between requests to avoid rate limiting
                    await new Promise((resolve) => setTimeout(resolve, 100));
                }

                // Add delay between batches
                if (i + batchSize < shopCoordinates.length) {
                    await new Promise((resolve) => setTimeout(resolve, 500));
                }
            }

            const totalShops = uniqueShops.size;
            console.log(`📊 Distance calculation summary: ${successCount}/${totalShops} successful, ${failureCount} failed`);

            if (successCount > 0) {
                console.log(
                    `✅ Successfully calculated distances for ${successCount} shops:`,
                    Object.entries(distances)
                        .slice(0, 3)
                        .map(([id, dist]) => `${id}: ${dist}`)
                        .join(", ") + (successCount > 3 ? "..." : "")
                );
                setShopDistances(distances);
            } else {
                console.log("⚠️ No distances were calculated successfully");
            }
        };

        // Add debounce to avoid excessive API calls
        const timeoutId = setTimeout(calculateDistances, 1000);
        return () => clearTimeout(timeoutId);
    }, [filteredProducts, userLocation]);

    const fetchCategories = async () => {
        try {
            setLoadingCategories(true);
            const response = await productApi.getProductCategories();
            setCategories(response.data);
        } catch (error) {
            console.error("Failed to fetch categories:", error);
        } finally {
            setLoadingCategories(false);
        }
    };

    const fetchProductTypes = async () => {
        try {
            setLoadingTypes(true);
            const response = await productApi.getProductTypes();
            setProductTypes(response.data);
        } catch (error) {
            console.error("Failed to fetch product types:", error);
        } finally {
            setLoadingTypes(false);
        }
    };

    const fetchShops = async () => {
        try {
            setLoadingShops(true);
            const response = await productApi.getShops();
            setShops(response.data);
        } catch (error) {
            console.error("Failed to fetch shops:", error);
        } finally {
            setLoadingShops(false);
        }
    };

    const loadProducts = async () => {
        try {
            setLoading(true);

            // Build the query string with all filters and pagination
            let queryParams = [];

            // Include page and limit parameters for pagination
            queryParams.push(`page=${currentPage}`);
            queryParams.push(`limit=10`);

            if (shopId) {
                queryParams.push(`shop=${shopId}`);
            }

            if (selectedCategory) {
                queryParams.push(`category=${selectedCategory}`);
            }

            if (selectedType) {
                queryParams.push(`type=${selectedType}`);
            }

            if (selectedShop && !shopId) {
                queryParams.push(`shop=${selectedShop}`);
            }

            if (priceRange[0] > 0 || priceRange[1] < 10000) {
                queryParams.push(`price[gte]=${priceRange[0]}`);
                queryParams.push(`price[lte]=${priceRange[1]}`);
            }

            if (sortBy) {
                queryParams.push(`sort=${sortBy}`);
            }

            if (inStock) {
                queryParams.push(`stock[gt]=0`);
            }

            // Add search query if present
            if (searchQuery) {
                queryParams.push(`search=${encodeURIComponent(searchQuery)}`);
            }

            const queryString = queryParams.join("&");
            console.log(`Loading products with query: ${queryString}`);

            // Use the appropriate API call
            let response;
            if (searchQuery && searchQuery.trim() !== "") {
                // If there's a search query, we might need to use a specialized search endpoint
                response = await productApi.enhancedSearchProducts(searchQuery, currentPage, 10);
            } else {
                // Otherwise use the standard products API
                response = await productApi.getProducts(queryString);
            }

            // Extract pagination info
            if (response.pagination) {
                setTotalPages(response.pagination.pages || 1);
                setHasMoreProducts(currentPage < (response.pagination.pages || 1));
            } else {
                setHasMoreProducts(false);
            }

            // Update products list
            const newProducts = response.data;

            // If loading the first page, replace the list
            // Otherwise append to the existing list
            if (currentPage === 1) {
                setFilteredProducts(newProducts);
            } else {
                setFilteredProducts((prevProducts) => [...prevProducts, ...newProducts]);
            }

            console.log(`Loaded ${newProducts.length} products. Total: ${response.count}`);
        } catch (error) {
            console.error("Error loading products:", error);
            alert("Failed to load products. Please try again.");
        } finally {
            setLoading(false);
            setLoadingMore(false);
        }
    };

    const handleRefresh = async () => {
        // Reset to first page when refreshing
        setCurrentPage(1);
        setHasMoreProducts(true);
        setRefreshing(true);
        await loadProducts();
        setRefreshing(false);
    };

    // Function to handle loading more when user reaches end of list
    const handleLoadMore = () => {
        if (!loading && !loadingMore && hasMoreProducts) {
            console.log(`Loading more products. Current page: ${currentPage}, Total pages: ${totalPages}`);
            setLoadingMore(true);
            setCurrentPage((prevPage) => prevPage + 1);
        }
    };

    // Watch for currentPage changes to load more data
    useEffect(() => {
        if (currentPage > 1) {
            loadProducts();
        }
    }, [currentPage]);

    const handleNotificationPress = () => {
        navigation.navigate("Notifications");
    };

    const handleAddToCart = async (productId: string) => {
        try {
            await dispatch(addToCart({ productId, quantity: 1 })).unwrap();
            Toast.show({
                type: "success",
                text1: "Added to Cart",
                text2: "Product has been added to your cart",
            });
        } catch (error) {
            Toast.show({
                type: "error",
                text1: "Error",
                text2: "Failed to add product to cart",
            });
        }
    };

    // Product item renderer with enhanced UI
    const renderProductItem = ({ item }: { item: Product }) => (
        <View style={styles.productCardWrapper}>
            <Card3D style={styles.productCard}>
                <TouchableOpacity onPress={() => navigation.navigate("ProductDetails", { productId: item._id })} activeOpacity={0.9} style={styles.cardTouchable}>
                    <View style={styles.imageContainer}>
                        <Image source={{ uri: item.image || "https://via.placeholder.com/150" }} style={styles.productImage} resizeMode="cover" />
                        {item.discount > 0 && (
                            <View style={styles.discountBadge}>
                                <Text style={styles.discountText}>{Math.round(item.discount)}% OFF</Text>
                            </View>
                        )}
                    </View>

                    <View style={styles.productContent}>
                        <View style={styles.productHeader}>
                            <Text style={styles.productName} numberOfLines={2}>
                                {item.name}
                            </Text>

                            {item.category && (
                                <View style={styles.categoryChip}>
                                    <Text style={styles.categoryChipText}>{item.category}</Text>
                                </View>
                            )}

                            <View style={styles.shopInfoContainer}>
                                <MaterialIcons name="store" size={10} color={theme.colors.textLight} />
                                <Text style={styles.shopName} numberOfLines={1}>
                                    {item.shop?.name || "Shop"}
                                </Text>
                                {shopDistances[item.shop?._id] && (
                                    <>
                                        <Text style={styles.distanceDot}>•</Text>
                                        <View style={styles.distanceRow}>
                                            <FontAwesome name="map-marker" size={8} color={theme.colors.primary} />
                                            <Text style={styles.distanceText}>{shopDistances[item.shop._id]}</Text>
                                        </View>
                                    </>
                                )}
                            </View>

                            {item.rating > 0 && (
                                <View style={styles.ratingContainer}>
                                    <Ionicons name="star" size={12} color="#FFD700" />
                                    <Text style={styles.ratingText}>{item.rating.toFixed(1)}</Text>
                                    <Text style={styles.reviewCount}>({item.reviews?.length || 0})</Text>
                                </View>
                            )}
                        </View>

                        <View style={styles.productBottom}>
                            <View style={styles.priceContainer}>
                                {item.discount > 0 ? (
                                    <View style={styles.priceWrapper}>
                                        <Text style={styles.discountedPrice}>₹{(item.price * (1 - item.discount / 100)).toFixed(2)}</Text>
                                        <Text style={styles.originalPrice}>₹{item.price.toFixed(2)}</Text>
                                    </View>
                                ) : (
                                    <Text style={styles.productPrice}>₹{item.price.toFixed(2)}</Text>
                                )}
                            </View>

                            <TouchableOpacity
                                style={[styles.addButton, item.stock <= 0 && styles.addButtonDisabled]}
                                onPress={() => item.stock > 0 && handleAddToCart(item._id)}
                                disabled={item.stock <= 0}
                                activeOpacity={0.8}
                            >
                                <Ionicons name={item.stock > 0 ? "add" : "close"} size={18} color={theme.colors.white} />
                            </TouchableOpacity>
                        </View>

                        {item.stock <= 0 && <Text style={styles.outOfStockText}>Out of Stock</Text>}
                    </View>
                </TouchableOpacity>
            </Card3D>
        </View>
    );

    const handleFilterPress = () => {
        setFilterModalVisible(true);
        setCurrentPriceRange(priceRange);
    };

    const applyFilters = () => {
        setPriceRange(currentPriceRange);
        setFilterModalVisible(false);
        loadProducts();
    };

    const resetFilters = () => {
        setSelectedCategory("");
        setSelectedType("");
        setSelectedShop("");
        setPriceRange([0, 10000]);
        setCurrentPriceRange([0, 10000]);
        setSortBy("");
        setInStock(false);

        // Don't clear search if we're currently searching
        if (!isSearching) {
            loadProducts();
        }
    };

    // Render a loading footer when loading more items
    const renderFooter = () => {
        if (!loadingMore) return null;

        return (
            <View style={styles.footerLoader}>
                <ActivityIndicator size="small" color={theme.colors.primary} />
                <Text style={styles.footerText}>Loading more products...</Text>
            </View>
        );
    };

    const renderFiltersModal = () => (
        <Modal visible={filterModalVisible} transparent={true} animationType="slide" onRequestClose={() => setFilterModalVisible(false)}>
            <View style={styles.modalContainer}>
                <View style={styles.modalContent}>
                    <View style={styles.modalHeader}>
                        <Text style={styles.modalTitle}>Filter Products</Text>
                        <TouchableOpacity onPress={() => setFilterModalVisible(false)}>
                            <Ionicons name="close" size={24} color={theme.colors.text} />
                        </TouchableOpacity>
                    </View>

                    <ScrollView showsVerticalScrollIndicator={false}>
                        {/* Category Filter */}
                        <View style={styles.filterSection}>
                            <Text style={styles.filterSectionTitle}>Categories</Text>
                            {loadingCategories ? (
                                <ActivityIndicator size="small" color={theme.colors.primary} />
                            ) : (
                                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoriesContainer}>
                                    <TouchableOpacity style={[styles.categoryButton, selectedCategory === "" && styles.categoryButtonActive]} onPress={() => setSelectedCategory("")}>
                                        <Text style={[styles.categoryButtonText, selectedCategory === "" && styles.categoryButtonTextActive]}>All</Text>
                                    </TouchableOpacity>

                                    {categories.map((category, index) => (
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

                        {/* Product Type Filter */}
                        <View style={styles.filterSection}>
                            <Text style={styles.filterSectionTitle}>Product Type</Text>
                            {loadingTypes ? (
                                <ActivityIndicator size="small" color={theme.colors.primary} />
                            ) : (
                                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.productTypesContainer}>
                                    <TouchableOpacity style={[styles.productTypeButton, selectedType === "" && styles.productTypeButtonActive]} onPress={() => setSelectedType("")}>
                                        <Text style={[styles.productTypeButtonText, selectedType === "" && styles.productTypeButtonTextActive]}>All</Text>
                                    </TouchableOpacity>

                                    {productTypes.map((type, index) => (
                                        <TouchableOpacity key={index} style={[styles.productTypeButton, selectedType === type && styles.productTypeButtonActive]} onPress={() => setSelectedType(type)}>
                                            <Text style={[styles.productTypeButtonText, selectedType === type && styles.productTypeButtonTextActive]}>{type}</Text>
                                        </TouchableOpacity>
                                    ))}
                                </ScrollView>
                            )}
                        </View>

                        {/* Shop Filter */}
                        <View style={styles.filterSection}>
                            <Text style={styles.filterSectionTitle}>Shop</Text>
                            {loadingShops ? (
                                <ActivityIndicator size="small" color={theme.colors.primary} />
                            ) : (
                                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.shopsContainer}>
                                    <TouchableOpacity style={[styles.shopButton, selectedShop === "" && styles.shopButtonActive]} onPress={() => setSelectedShop("")}>
                                        <Text style={[styles.shopButtonText, selectedShop === "" && styles.shopButtonTextActive]}>All</Text>
                                    </TouchableOpacity>

                                    {shops.map((shop, index) => (
                                        <TouchableOpacity key={index} style={[styles.shopButton, selectedShop === shop._id && styles.shopButtonActive]} onPress={() => setSelectedShop(shop._id)}>
                                            <Text style={[styles.shopButtonText, selectedShop === shop._id && styles.shopButtonTextActive]}>{shop.name}</Text>
                                        </TouchableOpacity>
                                    ))}
                                </ScrollView>
                            )}
                        </View>

                        {/* Price Range Filter */}
                        <View style={styles.filterSection}>
                            <Text style={styles.filterSectionTitle}>Price Range</Text>
                            <View style={styles.priceRangeContainer}>
                                <Text style={styles.priceRangeText}>₹{currentPriceRange[0]}</Text>
                                <Text style={styles.priceRangeText}>₹{currentPriceRange[1]}</Text>
                            </View>
                            <Slider
                                style={styles.slider}
                                minimumValue={0}
                                maximumValue={10000}
                                minimumTrackTintColor={theme.colors.primary}
                                maximumTrackTintColor={theme.colors.gray}
                                value={currentPriceRange[0]}
                                onValueChange={(value: number) => setCurrentPriceRange([value, currentPriceRange[1]])}
                            />
                            <Slider
                                style={styles.slider}
                                minimumValue={0}
                                maximumValue={10000}
                                minimumTrackTintColor={theme.colors.primary}
                                maximumTrackTintColor={theme.colors.gray}
                                value={currentPriceRange[1]}
                                onValueChange={(value: number) => setCurrentPriceRange([currentPriceRange[0], value])}
                            />
                        </View>

                        {/* Sort By */}
                        <View style={styles.filterSection}>
                            <Text style={styles.filterSectionTitle}>Sort By</Text>
                            {sortOptions.map((option, index) => (
                                <TouchableOpacity key={index} style={styles.sortOption} onPress={() => setSortBy(option.value)}>
                                    <Text style={styles.sortOptionText}>{option.label}</Text>
                                    {sortBy === option.value && <Ionicons name="checkmark" size={20} color={theme.colors.primary} />}
                                </TouchableOpacity>
                            ))}
                        </View>

                        {/* In Stock Only */}
                        <View style={styles.filterSection}>
                            <View style={styles.switchContainer}>
                                <Text style={styles.filterSectionTitle}>In Stock Only</Text>
                                <Switch value={inStock} onValueChange={setInStock} trackColor={{ false: theme.colors.gray, true: theme.colors.primary }} thumbColor={theme.colors.white} />
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

    if (loading && currentPage === 1 && products.length === 0) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={theme.colors.primary} />
            </View>
        );
    }

    if (error && currentPage === 1 && products.length === 0) {
        return (
            <View style={styles.errorContainer}>
                <Text style={styles.errorText}>{error}</Text>
                <TouchableOpacity style={styles.retryButton} onPress={loadProducts}>
                    <Text style={styles.retryButtonText}>Retry</Text>
                </TouchableOpacity>
            </View>
        );
    }

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
                    <ScreenHeader title={shopId ? "Shop Products" : "Products"} showBackButton={true} onNotificationPress={handleNotificationPress} />
                </Animated.View>

                <View style={styles.contentContainer}>
                    <View style={styles.searchContainer}>
                        <SearchBar placeholder="Search products..." onSearch={handleSearch} value={internalSearchQuery} style={styles.searchBar} />

                        <View style={styles.filterRow}>
                            <TouchableOpacity style={styles.filterButton} onPress={handleFilterPress}>
                                <FontAwesome name="filter" size={16} color={theme.colors.primary} />
                                <Text style={styles.filterButtonText}>Filters</Text>
                            </TouchableOpacity>

                            {/* Active filters display */}
                            <View style={styles.activeFiltersContainer}>
                                {(isSearching || selectedCategory || selectedType || selectedShop || priceRange[0] > 0 || priceRange[1] < 10000 || inStock) && (
                                    <TouchableOpacity
                                        style={styles.clearFiltersButton}
                                        onPress={() => {
                                            if (isSearching) {
                                                setInternalSearchQuery("");
                                                setSearchQuery("");
                                                setIsSearching(false);
                                            }
                                            resetFilters();
                                        }}
                                    >
                                        <FontAwesome name="times-circle" size={14} color={theme.colors.error} />
                                        <Text style={styles.clearFiltersText}>Clear {isSearching ? "Search & Filters" : "Filters"}</Text>
                                    </TouchableOpacity>
                                )}
                            </View>
                        </View>
                    </View>

                    {/* Sort options horizontal list */}
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.sortOptionsContainer}>
                        {sortOptions.map((option, index) => (
                            <TouchableOpacity key={index} style={[styles.sortOption, sortBy === option.value && styles.sortOptionActive]} onPress={() => setSortBy(option.value)}>
                                <Text style={[styles.sortOptionText, sortBy === option.value && styles.sortOptionTextActive]}>{option.label}</Text>
                            </TouchableOpacity>
                        ))}
                    </ScrollView>

                    {loading && currentPage === 1 ? (
                        <View style={styles.loaderContainer}>
                            <ActivityIndicator size="large" color={theme.colors.primary} />
                        </View>
                    ) : (
                        <>
                            {filteredProducts.length === 0 ? (
                                <View style={styles.emptyContainer}>
                                    <Text style={styles.emptyText}>No products found</Text>
                                </View>
                            ) : (
                                <FlatList
                                    data={filteredProducts}
                                    keyExtractor={(item, index) => `${item._id}-${index}`}
                                    renderItem={renderProductItem}
                                    numColumns={2}
                                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
                                    ListFooterComponent={renderFooter}
                                    onEndReached={handleLoadMore}
                                    onEndReachedThreshold={0.5}
                                    contentContainerStyle={styles.productList}
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
        paddingTop: Platform.OS === "android" ? 25 : 0,
    },
    headerContainer: {
        zIndex: 1000,
        backgroundColor: theme.colors.background,
    },
    contentContainer: {
        flex: 1,
        padding: theme.spacing.md,
        paddingBottom: 78,
    },
    searchContainer: {
        padding: theme.spacing.sm,
    },
    imageContainer: {
        width: "100%",
        height: 100,
        justifyContent: "center",
        alignItems: "center",
        padding: 10,
        backgroundColor: theme.colors.background,
        position: "relative",
    },
    searchBar: {
        marginBottom: theme.spacing.sm,
    },
    filterRow: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        marginBottom: theme.spacing.sm,
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
    sortOptionsContainer: {
        paddingHorizontal: theme.spacing.md,
        paddingBottom: theme.spacing.md,
        flexDirection: "row",
        marginBottom: theme.spacing.sm,
    },
    sortOption: {
        marginRight: theme.spacing.sm,
        backgroundColor: theme.colors.white,
        minWidth: 70,
        minHeight: 30,
        borderRadius: 10,
        padding: 3,
        alignItems: "center",
    },
    sortOptionActive: {
        backgroundColor: theme.colors.primary,
    },
    sortOptionText: {
        fontSize: 13,
        color: theme.colors.text,
        fontWeight: "500",
    },
    sortOptionTextActive: {
        color: theme.colors.white,
        fontWeight: "bold",
    },
    loadingContainer: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
    },
    errorContainer: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        padding: 20,
    },
    errorText: {
        color: theme.colors.error,
        fontSize: 16,
        textAlign: "center",
        marginBottom: 20,
    },
    retryButton: {
        backgroundColor: theme.colors.primary,
        paddingHorizontal: 20,
        paddingVertical: 10,
        borderRadius: 5,
    },
    retryButtonText: {
        color: theme.colors.white,
        fontSize: 16,
    },
    emptyContainer: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        padding: 20,
    },
    emptyTitle: {
        fontSize: 22,
        fontWeight: "bold",
        color: theme.colors.text,
        marginTop: 20,
        marginBottom: 10,
    },
    emptyText: {
        fontSize: 16,
        color: theme.colors.gray,
        textAlign: "center",
        marginBottom: 20,
    },
    resetButton: {
        paddingVertical: 12,
        paddingHorizontal: 24,
        backgroundColor: theme.colors.primary,
        borderRadius: 8,
        marginTop: 10,
    },
    resetButtonText: {
        color: theme.colors.white,
        fontSize: 16,
        fontWeight: "600",
    },
    productList: {
        paddingBottom: 20,
    },
    productCard: {
        flex: 1,
        marginVertical: 8,
        marginHorizontal: 4,
        borderRadius: 16,
        overflow: "hidden",
        backgroundColor: theme.colors.white,
        shadowColor: theme.colors.dark,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
        aspectRatio: 0.8,
    },
    productImage: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: theme.colors.lightGray,
    },
    productContent: {
        padding: 12,
        flex: 1,
        justifyContent: "space-between",
        alignItems: "center",
    },
    productName: {
        fontSize: 14,
        fontWeight: "600",
        color: theme.colors.text,
        marginBottom: 6,
        lineHeight: 18,
        textAlign: "center",
    },
    shopInfoContainer: {
        flexDirection: "row",
        alignItems: "center",
        marginBottom: 8,
        flexWrap: "wrap",
        justifyContent: "center",
    },
    shopName: {
        fontSize: 11,
        color: theme.colors.textLight,
        marginLeft: 4,
        textAlign: "center",
    },
    distanceRow: {
        flexDirection: "row",
        alignItems: "center",
        marginLeft: 4,
    },
    distanceText: {
        fontSize: 9,
        color: theme.colors.primary,
        marginLeft: 2,
    },
    categoryChip: {
        backgroundColor: theme.colors.accent,
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 12,
        alignSelf: "center",
        marginBottom: 8,
    },
    categoryChipText: {
        color: theme.colors.white,
        fontSize: 10,
        fontWeight: "500",
    },
    productBottom: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginTop: "auto",
        width: "100%",
    },
    productPrice: {
        fontSize: 14,
        fontWeight: "bold",
        color: theme.colors.primary,
    },
    addButton: {
        backgroundColor: theme.colors.primary,
        width: 32,
        height: 32,
        borderRadius: 16,
        justifyContent: "center",
        alignItems: "center",
        shadowColor: theme.colors.primary,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 4,
        elevation: 4,
    },
    addButtonDisabled: {
        backgroundColor: theme.colors.gray,
        shadowOpacity: 0,
        elevation: 0,
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
        maxHeight: "90%",
    },
    productHeader: {
        flex: 1,
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
        marginBottom: 24,
    },
    filterSectionTitle: {
        fontSize: 16,
        fontWeight: "bold",
        color: theme.colors.text,
        marginBottom: 12,
    },
    categoriesContainer: {
        paddingBottom: 8,
    },
    categoryButton: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
        backgroundColor: theme.colors.lightGray,
        marginRight: 8,
    },
    categoryButtonActive: {
        backgroundColor: theme.colors.primary,
    },
    categoryButtonText: {
        color: theme.colors.text,
    },
    categoryButtonTextActive: {
        color: theme.colors.white,
        fontWeight: "bold",
    },
    productTypesContainer: {
        paddingBottom: 8,
    },
    productTypeButton: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
        backgroundColor: theme.colors.lightGray,
        marginRight: 8,
    },
    productTypeButtonActive: {
        backgroundColor: theme.colors.primary,
    },
    productTypeButtonText: {
        color: theme.colors.text,
    },
    productTypeButtonTextActive: {
        color: theme.colors.white,
        fontWeight: "bold",
    },
    shopsContainer: {
        paddingBottom: 8,
    },
    shopButton: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
        backgroundColor: theme.colors.lightGray,
        marginRight: 8,
    },
    shopButtonActive: {
        backgroundColor: theme.colors.primary,
    },
    shopButtonText: {
        color: theme.colors.text,
    },
    shopButtonTextActive: {
        color: theme.colors.white,
        fontWeight: "bold",
    },
    priceRangeContainer: {
        flexDirection: "row",
        justifyContent: "space-between",
        marginBottom: 8,
    },
    priceRangeText: {
        color: theme.colors.text,
    },
    slider: {
        width: "100%",
        height: 40,
    },
    switchContainer: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
    },
    filterActions: {
        flexDirection: "row",
        justifyContent: "space-between",
        marginTop: 16,
        marginBottom: 32,
    },
    applyButton: {
        backgroundColor: theme.colors.primary,
        paddingVertical: 12,
        paddingHorizontal: 24,
        borderRadius: 8,
    },
    applyButtonText: {
        color: theme.colors.white,
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
    loaderContainer: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
    },
    productCardWrapper: {
        width: "50%",
        padding: 4,
    },
    cardTouchable: {
        flex: 1,
    },
    discountBadge: {
        position: "absolute",
        top: 5,
        right: 5,
        backgroundColor: theme.colors.error,
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 10,
        minWidth: 30,
        alignItems: "center",
    },
    discountText: {
        color: theme.colors.white,
        fontSize: 9,
        fontWeight: "bold",
    },
    priceContainer: {
        flexDirection: "row",
        alignItems: "center",
        flex: 1,
    },
    priceWrapper: {
        flexDirection: "column",
        alignItems: "flex-start",
    },
    discountedPrice: {
        fontSize: 14,
        fontWeight: "bold",
        color: theme.colors.primary,
    },
    originalPrice: {
        fontSize: 11,
        color: theme.colors.textLight,
        textDecorationLine: "line-through",
    },
    outOfStockText: {
        color: theme.colors.error,
        fontSize: 12,
        fontWeight: "bold",
        marginTop: 4,
    },
    distanceDot: {
        marginHorizontal: 2,
        color: theme.colors.primary,
    },
    ratingContainer: {
        flexDirection: "row",
        alignItems: "center",
        marginTop: 4,
    },
    ratingText: {
        fontSize: 12,
        color: theme.colors.text,
        fontWeight: "bold",
        marginLeft: 4,
    },
    reviewCount: {
        fontSize: 10,
        color: theme.colors.textLight,
        marginLeft: 4,
    },
});

export default ProductsScreen;

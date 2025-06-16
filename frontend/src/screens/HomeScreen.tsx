import React, { useEffect, useState, useCallback, useMemo, memo } from "react";
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Image, ActivityIndicator, Dimensions, ImageBackground, useWindowDimensions } from "react-native";
import { useSelector, useDispatch } from "react-redux";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import * as Location from "expo-location";
import axios from "axios";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import Header from "../components/Header";
import Card3D from "../components/Card3D";
import alert from "../utils/alert";
import { theme } from "../theme";
import { RootState, AppDispatch } from "../store";
import { logout } from "../store/authSlice";
import { MainStackParamList } from "../navigation/types";
import * as locationApi from "../api/locationApi";
import * as productApi from "../api/productApi";
import * as shopApi from "../api/shopApi";
import { GOOGLE_MAPS_API_KEY } from "../utils/config";
import { LocationService } from "../services/LocationService";
import { Shop as ApiShop } from "../api/shopApi";

const { width } = Dimensions.get("window");
const CARD_WIDTH = width * 0.7;
const SHOP_CARD_WIDTH = width * 0.8;

// Constants
const AD_ROTATION_INTERVAL = 5000;
const NEARBY_SHOPS_LIMIT = 5;
const FEATURED_PRODUCTS_LIMIT = 6;
const CATEGORIES_PER_ROW = 5;

type HomeScreenNavigationProp = NativeStackNavigationProp<MainStackParamList, "Home">;

// Product and Shop type definitions
interface Product {
    _id: string;
    name: string;
    description: string;
    rate: number;
    discount: number;
    images: string[];
    rating: number;
    shop: any;
}

// Updated Shop interface to match with shopApi
interface Shop {
    _id: string;
    name: string;
    description: string;
    logo: string;
    image: string;
    rating: number;
    numReviews: number;
    isOpen: boolean;
    address: {
        street: string;
        city: string;
        pincode: string;
        phone: string;
        village?: string;
        district?: string;
    };
    distance?: string | number;
    categories?: string[];
    reviews?: { length: number }[];
}

// Ad data structure
interface AdBanner {
    id: string;
    imageUrl: string;
    title: string;
    description: string;
    action: string;
}

// Placeholder ad data
const adBanners: AdBanner[] = [
    {
        id: "1",
        imageUrl: "https://i.ibb.co/QFXzk2Dg/image.png",
        title: "Summer Sale",
        description: "Up to 40% off on selected materials",
        action: "Shop Now",
    },
    {
        id: "2",
        imageUrl: "https://i.ibb.co/QFXzk2Dg/image.png",
        title: "New Arrivals",
        description: "Check out our latest tools collection",
        action: "Explore",
    },
];

// Memoized components
const ProductCard = memo(({ product, onPress, width }: { product: Product; onPress: () => void; width: number }) => {
    const imageUrl = product.images?.[0] || "https://via.placeholder.com/150";
    const originalPrice = product.rate || 0;
    const discountPercent = product.discount || 0;
    const discountedPrice = originalPrice - originalPrice * (discountPercent / 100);

    return (
        <TouchableOpacity style={[styles.productCard, { width }]} onPress={onPress} activeOpacity={0.8}>
            <Card3D style={styles.productCardContainer}>
                <View style={styles.productImageContainer}>
                    <Image source={{ uri: imageUrl }} style={styles.productImage} resizeMode="cover" />
                    {discountPercent > 0 && (
                        <View style={styles.discountBadge}>
                            <Text style={styles.discountText}>{Math.round(discountPercent)}%</Text>
                        </View>
                    )}
                </View>

                <View style={styles.productInfo}>
                    <Text style={styles.productName} numberOfLines={2}>
                        {product.name}
                    </Text>

                    {product.shop && (
                        <Text style={styles.shopName} numberOfLines={1}>
                            {product.shop.name}
                        </Text>
                    )}

                    <View style={styles.productPriceContainer}>
                        <Text style={styles.productPrice}>₹{discountedPrice.toFixed(0)}</Text>
                        {discountPercent > 0 && <Text style={styles.originalPrice}>₹{originalPrice.toFixed(0)}</Text>}
                    </View>

                    {product.rating > 0 && (
                        <View style={styles.ratingContainer}>
                            <Ionicons name="star" size={12} color="#FFD700" />
                            <Text style={styles.ratingText}>{product.rating.toFixed(1)}</Text>
                        </View>
                    )}
                </View>
            </Card3D>
        </TouchableOpacity>
    );
});

const ShopCard = memo(({ shop, onPress, width }: { shop: Shop; onPress: () => void; width: number }) => (
    <TouchableOpacity style={[styles.shopCardWrapper, { width }]} onPress={onPress} activeOpacity={0.8}>
        <Card3D style={styles.shopCard}>
            <LinearGradient colors={["#478DA8", "#7373D1"]} style={styles.shopCardGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
                <View style={styles.shopCardContent}>
                    <View style={styles.shopImageContainer}>
                        <View style={styles.shopImageWrapper}>
                            <Image
                                source={{
                                    uri: shop.image || "https://i.ibb.co/rskZwbK/shop-placeholder.jpg",
                                }}
                                style={styles.shopImage}
                                resizeMode="cover"
                            />
                            <View style={[styles.statusIndicator, { backgroundColor: shop.isOpen ? "#4ade80" : "#f87171" }]} />
                        </View>
                    </View>

                    <View style={styles.shopContent}>
                        <Text style={styles.shopCardName} numberOfLines={1}>
                            {shop.name}
                        </Text>

                        <View style={styles.shopRatingContainer}>
                            <Ionicons name="star" size={14} color="#FFD700" />
                            <Text style={styles.shopRating}>{shop.rating ? shop.rating.toFixed(1) : "0.0"}</Text>
                            <Text style={styles.shopRatingCount}>({shop.reviews ? shop.reviews.length : 0})</Text>
                        </View>

                        <View style={styles.shopDetailRow}>
                            <Ionicons name="location-outline" size={14} color="rgba(255,255,255,0.8)" />
                            <Text style={styles.shopAddress} numberOfLines={2}>
                                {shop.address ? `${shop.address.village || shop.address.city || ""}, ${shop.address.district || shop.address.street || ""}` : "Location not available"}
                            </Text>
                        </View>

                        {shop.categories && shop.categories.length > 0 && (
                            <View style={styles.shopCategoriesContainer}>
                                {shop.categories.slice(0, 2).map((category, index) => (
                                    <View key={`${shop._id}-category-${index}-${category}`} style={styles.categoryTag}>
                                        <Text style={styles.categoryTagText}>{category}</Text>
                                    </View>
                                ))}
                                {shop.categories.length > 2 && <Text style={styles.moreCategoriesText}>+{shop.categories.length - 2}</Text>}
                            </View>
                        )}

                        {shop.distance && (
                            <View style={styles.distanceContainer}>
                                <Ionicons name="navigate-outline" size={12} color="rgba(255,255,255,0.9)" />
                                <Text style={styles.distanceText}>{typeof shop.distance === "number" ? `${shop.distance.toFixed(1)} km` : shop.distance}</Text>
                            </View>
                        )}
                    </View>
                </View>
            </LinearGradient>
        </Card3D>
    </TouchableOpacity>
));

const CategoryItem = memo(({ category, index, onPress, width }: { category: string; index: number; onPress: () => void; width: number }) => {
    const colorSets = [
        { bg: "#FFE1D1", text: "#FF6B35", icon: "cube-outline" },
        { bg: "#E6F7FF", text: "#0CB0D3", icon: "construct-outline" },
        { bg: "#EEFBEF", text: "#53B175", icon: "layers-outline" },
        { bg: "#FFF6E6", text: "#FFA726", icon: "hammer-outline" },
        { bg: "#F4E8FF", text: "#9C27B0", icon: "grid-outline" },
        { bg: "#E8F5E9", text: "#4CAF50", icon: "analytics-outline" },
    ];

    const colorSet = colorSets[index % colorSets.length];

    return (
        <TouchableOpacity
            style={[
                styles.categoryCard,
                {
                    backgroundColor: colorSet.bg,
                    width,
                },
            ]}
            onPress={onPress}
        >
            <View style={styles.categoryIconContainer}>
                <Ionicons name={colorSet.icon as any} size={24} color={colorSet.text} />
            </View>
            <Text style={[styles.categoryName, { color: colorSet.text }]} numberOfLines={2}>
                {category}
            </Text>
        </TouchableOpacity>
    );
});

const HomeScreen: React.FC = () => {
    const navigation = useNavigation<HomeScreenNavigationProp>();
    const dispatch = useDispatch<AppDispatch>();
    const { user } = useSelector((state: RootState) => state.auth);
    const dimensions = useWindowDimensions(); // Get dynamic window dimensions
    const [location, setLocation] = useState<string>("Fetching location...");
    const [locationData, setLocationData] = useState<{ latitude: number; longitude: number } | null>(null);

    // State for products and shops
    const [Products, setProducts] = useState<Product[]>([]);
    const [nearbyShops, setNearbyShops] = useState<Shop[]>([]);
    const [categories, setCategories] = useState<string[]>([]);
    const [loading, setLoading] = useState({
        products: true,
        shops: true,
        categories: true,
        location: false,
    });
    const [currentAdIndex, setCurrentAdIndex] = useState(0);

    // Memoized values
    const cardWidth = useMemo(() => (dimensions.width < 380 ? dimensions.width * 0.85 : dimensions.width * 0.7), [dimensions.width]);

    const shopCardWidth = useMemo(() => (dimensions.width < 380 ? dimensions.width * 0.9 : dimensions.width * 0.8), [dimensions.width]);

    const productCardWidth = useMemo(() => dimensions.width * 0.45, [dimensions.width]);

    const categoryCardWidth = useMemo(() => (dimensions.width < 380 ? dimensions.width * 0.2 : dimensions.width * 0.18), [dimensions.width]);

    useEffect(() => {
        getLocation();
        fetchCategories();
        fetchNearbyShops();
        fetchProducts();

        // Auto rotate ads
        const adInterval = setInterval(() => {
            setCurrentAdIndex((prev) => (prev + 1) % adBanners.length);
        }, AD_ROTATION_INTERVAL);

        return () => clearInterval(adInterval);
    }, []);

    const fetchProducts = useCallback(async () => {
        try {
            setLoading((prev) => ({ ...prev, products: true }));
            // Use a more specific query to get featured products with limit
            const response = await productApi.getProducts("sort=-createdAt&limit=6");

            // Ensure we have valid data and handle potential API response structure issues
            if (response && response.data && Array.isArray(response.data)) {
                // Map API products to our local Product interface
                const mappedProducts: Product[] = response.data.map((item: any) => ({
                    _id: item._id,
                    name: item.name,
                    description: item.description || "",
                    rate: item.price || 0,
                    discount: item.discount || 0,
                    images: item.image ? [item.image] : [],
                    rating: item.rating || 0,
                    shop: item.shop || null,
                }));
                setProducts(mappedProducts);
            } else {
                console.warn("Invalid featured products data structure:", response);
                setProducts([]);
            }
        } catch (error) {
            console.error("Failed to fetch featured products:", error);
            setProducts([]);
        } finally {
            setLoading((prev) => ({ ...prev, products: false }));
        }
    }, []);

    const fetchNearbyShops = useCallback(async () => {
        try {
            setLoading((prev) => ({ ...prev, shops: true }));
            const location = await LocationService.getCurrentLocation();
            const { latitude, longitude } = location;
            setLocationData(location);

            try {
                const locationString = `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`;
                setLocation(locationString);
            } catch (error) {
                console.error("Error setting location:", error);
                setLocation("Location Not found");
            }

            const response = await LocationService.getNearbyShops(location);
            console.log("nearby shops", response);

            if (response.success && response.data) {
                // Limit the number of shops to reduce API calls and improve performance
                const limitedShops = response.data.slice(0, 5); // Only show first 5 shops

                // Calculate distances for limited shops only to avoid rate limiting
                const shopsWithDistances = await Promise.all(
                    limitedShops.map(async (shop: ApiShop, index: number) => {
                        // Add delay between requests to avoid rate limiting
                        if (index > 0) {
                            await new Promise((resolve) => setTimeout(resolve, 200)); // 200ms delay
                        }

                        if (shop.location?.coordinates?.length === 2) {
                            try {
                                const distanceMatrix = await LocationService.getDistanceMatrix(location, {
                                    latitude: shop.location.coordinates[1],
                                    longitude: shop.location.coordinates[0],
                                });
                                return {
                                    ...shop,
                                    distance: distanceMatrix.distance,
                                    duration: distanceMatrix.duration,
                                };
                            } catch (error) {
                                console.warn(`Error calculating distance for shop ${shop._id}:`, error);
                                // Return shop without distance instead of failing
                                return shop;
                            }
                        }
                        return shop;
                    })
                );
                console.log("shopsWithDistances", shopsWithDistances);
                setNearbyShops(shopsWithDistances);
            } else {
                console.error("Invalid response from getNearbyShops:", response);
                setNearbyShops([]);
            }
        } catch (error) {
            console.error("Error getting location or nearby shops:", error);
            setLocation("Error getting location");
            setNearbyShops([]);
        } finally {
            setLoading((prev) => ({ ...prev, shops: false }));
        }
    }, []);

    const fetchCategories = useCallback(async () => {
        try {
            setLoading((prev) => ({ ...prev, categories: true }));
            // Using productApi instead of categoryApi
            const response = await productApi.getProductCategories();
            setCategories(response.data);
        } catch (error) {
            console.error("Failed to fetch categories:", error);
        } finally {
            setLoading((prev) => ({ ...prev, categories: false }));
        }
    }, []);

    const getLocation = useCallback(async () => {
        try {
            const { status } = await Location.requestForegroundPermissionsAsync();
            if (status !== "granted") {
                setLocation("Permission denied");
                return;
            }

            // Use high accuracy and increase timeout for better location results
            const currentLocation = await Location.getCurrentPositionAsync({
                accuracy: Location.Accuracy.Highest,
                timeInterval: 1000,
                mayShowUserSettingsDialog: true,
            });

            const { latitude, longitude } = currentLocation.coords;
            setLocationData({ latitude, longitude });

            if (user?._id) {
                // Skip updating location in the backend when logging out
                const isLoggingOut = !user._id; // If user ID is missing, we're in logout process

                if (!isLoggingOut) {
                    try {
                        await locationApi.updateUserLocation({ latitude, longitude });
                    } catch (error) {
                        console.error("Failed to update location in backend:", error);
                    }
                }
            }

            try {
                const apiKey = GOOGLE_MAPS_API_KEY;
                if (!apiKey) {
                    setLocation("Location service unavailable");
                    return;
                }
                const response = await axios.get(`https://maps.googleapis.com/maps/api/geocode/json?latlng=${latitude},${longitude}&key=${apiKey}`);
                if (response.data.status === "OK" && response.data.results.length > 0) {
                    const addressComponents = response.data.results[0].address_components;
                    const city = addressComponents.find((component: any) => component.types.includes("sublocality"))?.long_name;
                    const region = addressComponents.find((component: any) => component.types.includes("administrative_area_level_1"))?.long_name;
                    const pinCode = addressComponents.find((component: any) => component.types.includes("postal_code"))?.long_name;
                    console.log(addressComponents);
                    const locationString = `${city || ""}, ${region || ""}, ${pinCode || ""}`;
                    setLocation(locationString || "Location Not found");
                } else {
                    setLocation("Location Not found");
                }
            } catch (error) {
                console.error("Error with Google Places API:", error);
                setLocation("Location Not found");
            }
        } catch (error) {
            console.error("Error getting location:", error);
            setLocation("Error getting location");
        }
    }, [user?._id]);

    const handleLogout = async () => {
        try {
            await dispatch(logout()).unwrap();
            // Navigation will happen automatically due to auth state change
        } catch (error: any) {
            alert("Error", error.message || "Failed to logout");
        }
    };

    const handleProfilePress = () => {
        navigation.navigate("Profile");
    };

    const handleNotificationPress = () => {
        navigation.navigate("Notifications");
    };

    // Memoized handlers
    const handleProductPress = useCallback(
        (productId: string) => {
            navigation.navigate("ProductDetails", { productId });
        },
        [navigation]
    );

    const handleShopPress = useCallback(
        (shopId: string) => {
            navigation.navigate("ShopDetails", { shopId });
        },
        [navigation]
    );

    const handleCategoryPress = useCallback(
        (category: string) => {
            navigation.navigate("ProductsTab", { category });
        },
        [navigation]
    );

    const handleRefreshLocation = useCallback(async () => {
        try {
            setLoading(prev => ({ ...prev, location: true }));
            const location = await LocationService.getCurrentLocation();
            if (location) {
                const locationString = `${location.latitude},${location.longitude}`;
                setLocation(locationString);
                // Refresh nearby shops and products with new location
                await fetchNearbyShops();
                await fetchProducts();
            }
        } catch (error) {
            console.error('Error refreshing location:', error);
            alert('Error', 'Failed to refresh location. Please try again.');
        } finally {
            setLoading(prev => ({ ...prev, location: false }));
        }
    }, []);

    const renderAdBanner = () => {
        const ad = adBanners[currentAdIndex];

        return (
            <Card3D style={styles.adBannerContainer} elevation="medium">
                <ImageBackground source={{ uri: ad.imageUrl }} style={styles.adBannerImage} imageStyle={{ borderRadius: 16, opacity: 0.85 }}>
                    <LinearGradient colors={["rgba(0,0,0,0.1)", "rgba(0,0,0,0.7)"]} style={styles.adGradient}>
                        <View style={styles.adTextContainer}>
                            <Text style={styles.adTitle}>{ad.title}</Text>
                            <Text style={styles.adDescription}>{ad.description}</Text>
                            <TouchableOpacity style={styles.adButton}>
                                <Text style={styles.adButtonText}>{ad.action}</Text>
                            </TouchableOpacity>
                        </View>
                    </LinearGradient>
                </ImageBackground>
                <View style={styles.adIndicators}>
                    {adBanners.map((_, index) => (
                        <View key={`ad-indicator-${index}`} style={[styles.adIndicator, index === currentAdIndex && styles.adIndicatorActive]} />
                    ))}
                </View>
            </Card3D>
        );
    };

    const renderAppInfoSection = () => {
        return (
            <Card3D style={styles.appInfoCard} elevation="large">
                <LinearGradient colors={["#667eea", "#764ba2"]} style={styles.appInfoGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
                    <View style={styles.appInfoHeader}>
                        <Ionicons name="information-circle-outline" size={32} color="#FFFFFF" />
                        <Text style={styles.appInfoTitle}>About Dumpit</Text>
                    </View>
                    <Text style={styles.appInfoText}>Your one-stop marketplace for construction materials. Connect with trusted vendors, discover quality products, and build with confidence.</Text>

                    <View style={styles.featureGrid}>
                        <View style={styles.featureItem}>
                            <View style={styles.featureIconContainer}>
                                <Ionicons name="shield-checkmark" size={20} color="#667eea" />
                            </View>
                            <Text style={styles.featureTitle}>Verified</Text>
                            <Text style={styles.featureDescription}>Trusted vendors</Text>
                        </View>

                        <View style={styles.featureItem}>
                            <View style={styles.featureIconContainer}>
                                <Ionicons name="flash" size={20} color="#667eea" />
                            </View>
                            <Text style={styles.featureTitle}>Fast</Text>
                            <Text style={styles.featureDescription}>Quick delivery</Text>
                        </View>

                        <View style={styles.featureItem}>
                            <View style={styles.featureIconContainer}>
                                <Ionicons name="wallet" size={20} color="#667eea" />
                            </View>
                            <Text style={styles.featureTitle}>Secure</Text>
                            <Text style={styles.featureDescription}>Safe payments</Text>
                        </View>

                        <View style={styles.featureItem}>
                            <View style={styles.featureIconContainer}>
                                <Ionicons name="star" size={20} color="#667eea" />
                            </View>
                            <Text style={styles.featureTitle}>Quality</Text>
                            <Text style={styles.featureDescription}>Premium materials</Text>
                        </View>
                    </View>
                </LinearGradient>
            </Card3D>
        );
    };

    return (
        <View style={styles.container}>
            <Header location={location.split(",")[0]} onProfilePress={handleProfilePress} onNotificationPress={handleNotificationPress} showLocation={true} />

            <View style={styles.searchContainer}>
                <TouchableOpacity style={styles.searchBar} onPress={() => navigation.navigate("ProductsTab")}>
                    <Ionicons name="search-outline" size={20} color={theme.colors.gray} />
                    <Text>Search for products</Text>
                </TouchableOpacity>
            </View>

            <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollViewContent} showsVerticalScrollIndicator={false}>
                <View style={styles.welcomeSection}>
                    <Text style={styles.welcomeText}>Welcome, {user?.name?.split(" ")[0] || "Guest"}!</Text>
                    <View style={styles.locationContainer}>
                        <Text style={styles.locationText}>
                            <Ionicons name="location" size={16} color={theme.colors.primary} />
                            {location}
                        </Text>
                        <TouchableOpacity 
                            style={styles.refreshButton} 
                            onPress={handleRefreshLocation}
                            disabled={loading.location}
                        >
                            <Ionicons 
                                name="refresh" 
                                size={16} 
                                color={theme.colors.primary} 
                                style={loading.location ? styles.refreshing : undefined} 
                            />
                        </TouchableOpacity>
                    </View>
                </View>

                {renderAdBanner()}

                <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                        <Text style={styles.sectionTitle}>Categories</Text>
                    </View>

                    {loading.categories ? (
                        <ActivityIndicator size="small" color={theme.colors.primary} />
                    ) : (
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoriesContainer}>
                            {categories.map((category, index) => (
                                <CategoryItem key={`category-${index}-${category}`} category={category} index={index} onPress={() => handleCategoryPress(category)} width={categoryCardWidth} />
                            ))}
                        </ScrollView>
                    )}
                </View>

                <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                        <Text style={styles.sectionTitle}>Nearby Shops</Text>
                        <TouchableOpacity onPress={() => navigation.navigate("ShopsTab")}>
                            <Text style={styles.viewAllText}>View All</Text>
                        </TouchableOpacity>
                    </View>

                    {loading.shops ? (
                        <ActivityIndicator size="small" color={theme.colors.primary} />
                    ) : nearbyShops.length > 0 ? (
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.productsContainer}>
                            {nearbyShops.map((shop) => (
                                <ShopCard key={`shop-${shop._id}`} shop={shop} onPress={() => handleShopPress(shop._id)} width={shopCardWidth} />
                            ))}
                        </ScrollView>
                    ) : (
                        <Text style={styles.noDataText}>No nearby shops available</Text>
                    )}
                </View>

                <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                        <Text style={styles.sectionTitle}>Products</Text>
                        <TouchableOpacity onPress={() => navigation.navigate("ProductsTab")}>
                            <Text style={styles.viewAllText}>View All</Text>
                        </TouchableOpacity>
                    </View>

                    {loading.products ? (
                        <ActivityIndicator size="small" color={theme.colors.primary} />
                    ) : Products.length > 0 ? (
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.productsHorizontalContainer}>
                            {Products.slice(0, FEATURED_PRODUCTS_LIMIT).map((product) => (
                                <ProductCard key={`product-${product._id}`} product={product} onPress={() => handleProductPress(product._id)} width={productCardWidth} />
                            ))}
                        </ScrollView>
                    ) : (
                        <Text style={styles.noDataText}>No products available</Text>
                    )}
                </View>

                {renderAppInfoSection()}
            </ScrollView>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: theme.colors.background,
    },
    scrollView: {
        flex: 1,
    },
    scrollViewContent: {
        paddingBottom: 120,
    },
    welcomeSection: {
        padding: theme.spacing.md,
    },
    welcomeText: {
        fontSize: 20,
        fontWeight: "bold",
        marginBottom: theme.spacing.md,
        marginLeft: theme.spacing.lg,
        color: theme.colors.text,
    },
    locationContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 4,
    },
    locationText: {
        fontSize: 14,
        color: theme.colors.gray,
        marginRight: 8,
    },
    refreshButton: {
        padding: 4,
    },
    refreshing: {
        transform: [{ rotate: '45deg' }],
    },
    adBannerContainer: {
        margin: theme.spacing.sm,
        backgroundColor: theme.colors.white,
        borderRadius: theme.borderRadius.large,
        ...theme.shadow.medium,
        elevation: 4,
        height: 180,
        padding: 0,
    },
    adBannerImage: {
        width: "100%",
        height: "100%",
        justifyContent: "flex-end",
    },
    adGradient: {
        position: "absolute",
        left: 0,
        right: 0,
        bottom: 0,
        height: "100%",
        justifyContent: "flex-end",
        borderRadius: theme.borderRadius.large,
    },
    adTextContainer: {
        padding: theme.spacing.lg,
    },
    adTitle: {
        fontSize: 24,
        fontWeight: "bold",
        color: "#FFFFFF",
        textShadowColor: "rgba(0, 0, 0, 0.75)",
        textShadowOffset: { width: 0, height: 1 },
        textShadowRadius: 2,
    },
    adDescription: {
        fontSize: 14,
        color: "#FFFFFF",
        marginTop: 4,
        textShadowColor: "rgba(0, 0, 0, 0.75)",
        textShadowOffset: { width: 0, height: 1 },
        textShadowRadius: 2,
    },
    adButton: {
        backgroundColor: theme.colors.primary,
        paddingVertical: 8,
        paddingHorizontal: 16,
        borderRadius: 20,
        alignSelf: "flex-start",
        marginTop: 12,
    },
    adButtonText: {
        color: "#FFFFFF",
        fontWeight: "bold",
        fontSize: 14,
    },
    adIndicators: {
        position: "absolute",
        bottom: 10,
        right: 15,
        flexDirection: "row",
    },
    adIndicator: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: "rgba(255, 255, 255, 0.4)",
        marginHorizontal: 4,
    },
    adIndicatorActive: {
        backgroundColor: "#FFFFFF",
        width: 16,
    },
    section: {
        marginBottom: theme.spacing.lg,
    },
    sectionHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        paddingHorizontal: theme.spacing.lg,
        marginBottom: theme.spacing.md,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: "bold",
        color: theme.colors.text,
    },
    viewAllText: {
        fontSize: 14,
        color: theme.colors.primary,
        fontWeight: "600",
    },
    productsContainer: {
        paddingLeft: theme.spacing.lg,
        paddingRight: theme.spacing.sm,
    },
    productCard: {
        marginRight: theme.spacing.sm,
        aspectRatio: 0.8,
        borderRadius: theme.borderRadius.medium,
        padding: theme.spacing.xs,
        maxWidth: 120,
    },
    productCardContainer: {
        flex: 1,
        backgroundColor: theme.colors.white,
        borderRadius: theme.borderRadius.large,
        padding: theme.spacing.sm,
        overflow: "hidden",
        ...theme.shadow.small,
    },
    productImageContainer: {
        height: 60,
        position: "relative",
        backgroundColor: theme.colors.lightGray,
        justifyContent: "center",
        alignItems: "center",
    },
    productImage: {
        width: 60,
        height: 60,
        borderRadius: 50,
    },
    discountBadge: {
        position: "absolute",
        top: 4,
        right: 4,
        backgroundColor: theme.colors.error,
        paddingHorizontal: 4,
        paddingVertical: 1,
        borderRadius: theme.borderRadius.small,
    },
    discountText: {
        color: "#FFFFFF",
        fontWeight: "bold",
        fontSize: 7,
    },
    productInfo: {
        padding: theme.spacing.xs,
        flex: 1,
        gap: theme.spacing.xs / 3,
    },
    productName: {
        fontSize: 12,
        fontWeight: "600",
        color: theme.colors.text,
        lineHeight: 14,
        textAlign: "center",
    },
    shopName: {
        fontSize: 10,
        color: theme.colors.textLight,
        textAlign: "center",
    },
    productPriceContainer: {
        flexDirection: "column",
        alignItems: "center",
    },
    productPrice: {
        fontSize: 13,
        fontWeight: "bold",
        color: theme.colors.primary,
    },
    originalPrice: {
        fontSize: 9,
        color: theme.colors.gray,
        textDecorationLine: "line-through",
    },
    ratingContainer: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 1,
    },
    ratingText: {
        fontSize: 10,
        color: theme.colors.text,
        fontWeight: "600",
    },
    shopCardWrapper: {
        marginRight: theme.spacing.sm,
    },
    shopCard: {
        padding: 0,
        overflow: "hidden",
        height: 140,
        borderRadius: theme.borderRadius.large,
        ...theme.shadow.medium,
    },
    shopCardGradient: {
        position: "absolute",
        left: 0,
        right: 0,
        top: 0,
        bottom: 0,
        borderRadius: theme.borderRadius.large,
    },
    shopCardContent: {
        flexDirection: "row",
        padding: theme.spacing.md,
        height: "100%",
        borderRadius: theme.borderRadius.large,
    },
    shopImageContainer: {
        width: 80,
        height: 80,
        borderRadius: theme.borderRadius.medium,
        overflow: "hidden",
        marginRight: theme.spacing.md,
        alignSelf: "center",
    },
    shopImageWrapper: {
        position: "relative",
        width: "100%",
        height: "100%",
        borderRadius: theme.borderRadius.medium,
        overflow: "hidden",
    },
    shopImage: {
        width: "100%",
        height: "100%",
        borderRadius: theme.borderRadius.medium,
    },
    shopContent: {
        flex: 1,
        justifyContent: "space-between",
        paddingVertical: 4,
    },
    shopCardName: {
        fontSize: 16,
        fontWeight: "bold",
        color: "#FFFFFF",
        marginBottom: 4,
        textShadowColor: "rgba(0, 0, 0, 0.3)",
        textShadowOffset: { width: 0, height: 1 },
        textShadowRadius: 2,
    },
    shopRatingContainer: {
        flexDirection: "row",
        alignItems: "center",
        marginBottom: 4,
    },
    shopRating: {
        fontSize: 13,
        color: "#FFFFFF",
        fontWeight: "600",
        marginLeft: 4,
    },
    shopRatingCount: {
        fontSize: 11,
        color: "rgba(255,255,255,0.8)",
        marginLeft: 4,
    },
    shopDetailRow: {
        flexDirection: "row",
        alignItems: "flex-start",
        marginBottom: 6,
        flex: 1,
    },
    shopAddress: {
        fontSize: 11,
        color: "rgba(255,255,255,0.9)",
        marginLeft: 6,
        flex: 1,
        lineHeight: 14,
    },
    shopCategoriesContainer: {
        flexDirection: "row",
        flexWrap: "wrap",
        marginBottom: 4,
    },
    categoryTag: {
        backgroundColor: "rgba(255, 255, 255, 0.25)",
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 12,
        marginRight: 6,
        marginBottom: 4,
    },
    categoryTagText: {
        fontSize: 9,
        color: "#FFFFFF",
        fontWeight: "600",
    },
    moreCategoriesText: {
        fontSize: 9,
        color: "rgba(255,255,255,0.8)",
        fontWeight: "500",
    },
    statusIndicator: {
        position: "absolute",
        top: 4,
        right: 4,
        width: 12,
        height: 12,
        borderRadius: 6,
        borderWidth: 2,
        borderColor: "#FFFFFF",
    },
    distanceContainer: {
        flexDirection: "row",
        alignItems: "center",
        marginTop: 4,
    },
    distanceText: {
        fontSize: 10,
        color: "rgba(255,255,255,0.9)",
        marginLeft: 4,
        fontWeight: "600",
    },
    loadingContainer: {
        height: 200,
        justifyContent: "center",
        alignItems: "center",
    },
    emptyStateContainer: {
        height: 200,
        width: width - theme.spacing.lg * 2,
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: "rgba(0, 0, 0, 0.05)",
        borderRadius: theme.borderRadius.large,
    },
    emptyStateText: {
        fontSize: 14,
        color: theme.colors.gray,
    },
    appInfoCard: {
        marginHorizontal: theme.spacing.lg,
        marginBottom: theme.spacing.lg,
        padding: 0,
        overflow: "hidden",
        borderRadius: theme.borderRadius.large,
        ...theme.shadow.medium,
    },
    appInfoGradient: {
        padding: theme.spacing.lg,
        borderRadius: theme.borderRadius.large,
    },
    appInfoHeader: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        marginBottom: 12,
    },
    appInfoTitle: {
        fontSize: 22,
        fontWeight: "bold",
        color: "#FFFFFF",
        marginLeft: 8,
        textAlign: "center",
    },
    appInfoText: {
        fontSize: 14,
        color: "rgba(255,255,255,0.9)",
        marginBottom: 20,
        textAlign: "center",
        lineHeight: 20,
    },
    featureGrid: {
        flexDirection: "row",
        flexWrap: "wrap",
        justifyContent: "space-between",
    },
    featureItem: {
        width: "48%",
        backgroundColor: "rgba(255, 255, 255, 0.15)",
        borderRadius: theme.borderRadius.medium,
        padding: 12,
        alignItems: "center",
        marginBottom: 12,
        borderWidth: 1,
        borderColor: "rgba(255, 255, 255, 0.2)",
    },
    featureIconContainer: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: "#FFFFFF",
        justifyContent: "center",
        alignItems: "center",
        marginBottom: 8,
        ...theme.shadow.small,
    },
    featureTitle: {
        fontSize: 13,
        fontWeight: "bold",
        color: "#FFFFFF",
        marginBottom: 4,
        textAlign: "center",
    },
    featureDescription: {
        fontSize: 11,
        color: "rgba(255, 255, 255, 0.8)",
        textAlign: "center",
        lineHeight: 14,
    },
    categoriesContainer: {
        paddingLeft: theme.spacing.lg,
        paddingRight: theme.spacing.sm,
        paddingVertical: theme.spacing.md,
    },
    categoryCard: {
        width: 60,
        height: 80,
        borderRadius: theme.borderRadius.large,
        padding: theme.spacing.sm,
        marginRight: theme.spacing.md,
        alignItems: "center",
        justifyContent: "center",
        ...theme.shadow.small,
    },
    gradientBackground: {
        borderRadius: 16,
        padding: 10,
    },
    categoryIconContainer: {
        width: 30,
        height: 30,
        borderRadius: 25,
        backgroundColor: "rgba(255, 255, 255, 0.8)",
        justifyContent: "center",
        alignItems: "center",
        marginBottom: 10,
    },
    categoryName: {
        fontSize: 10,
        fontWeight: "600",
        textAlign: "center",
    },
    noDataText: {
        fontSize: 14,
        color: theme.colors.gray,
        textAlign: "center",
    },
    searchContainer: {
        padding: theme.spacing.md,
        backgroundColor: theme.colors.white,
    },
    searchBar: {
        height: 48,
        display: "flex",
        gap: 5,
        backgroundColor: theme.colors.lightGray,
        borderRadius: 24,
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: theme.spacing.md,
    },
    productsHorizontalContainer: {
        paddingLeft: theme.spacing.lg,
        paddingRight: theme.spacing.sm,
        paddingVertical: theme.spacing.md,
    },
});

export default memo(HomeScreen);

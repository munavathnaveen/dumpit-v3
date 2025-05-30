import React, { useEffect, useState } from "react";
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
    });
    const [currentAdIndex, setCurrentAdIndex] = useState(0);

    // Responsive width calculations
    const cardWidth = dimensions.width < 380 ? dimensions.width * 0.85 : dimensions.width * 0.7;
    const shopCardWidth = dimensions.width < 380 ? dimensions.width * 0.9 : dimensions.width * 0.8;
    const productCardWidth = dimensions.width * 0.4; // For 2 columns of products
    const categoryCardWidth = dimensions.width < 380 ? dimensions.width * 0.2 : dimensions.width * 0.18; // Made categories smaller

    useEffect(() => {
        getLocation();
        fetchCategories();
        fetchNearbyShops();
        fetchProducts();

        // Auto rotate ads
        const adInterval = setInterval(() => {
            setCurrentAdIndex((prev) => (prev + 1) % adBanners.length);
        }, 5000);

        return () => clearInterval(adInterval);
    }, []);

    const fetchProducts = async () => {
        try {
            setLoading((prev) => ({ ...prev, products: true }));
            // Use a more specific query to get featured products with limit
            const response = await productApi.getProducts("sort=-createdAt");

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
    };

    const fetchNearbyShops = async () => {
        try {
            const location = await LocationService.getCurrentLocation();
            const { latitude, longitude } = location;
            setLocationData(location);

            try {
                const response = await LocationService.geocodeStringAddress(`${latitude},${longitude}`);
                console.log(response);
                const locationString = `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`;
                setLocation(locationString);
            } catch (error) {
                console.error("Error getting location name:", error);
                setLocation("Location Not found");
            }

            const response = await LocationService.getNearbyShops(location);
            console.log("nearby shops", response);
            if (response.success && response.data) {
                // Calculate distances for each shop
                const shopsWithDistances = await Promise.all(
                    response.data.map(async (shop: ApiShop) => {
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
                                console.error(`Error calculating distance for shop ${shop._id}:`, error);
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
    };

    const fetchCategories = async () => {
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
    };

    const getLocation = async () => {
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
    };

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

    const navigateToProductDetails = (productId: string) => {
        navigation.navigate("ProductDetails", { productId });
    };

    const navigateToShopDetails = (shopId: string) => {
        navigation.navigate("ShopDetails", { shopId });
    };

    const navigateToProductsByCategory = (category: string) => {
        navigation.navigate("ProductsTab", { category });
    };

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
                        <View key={index} style={[styles.adIndicator, index === currentAdIndex && styles.adIndicatorActive]} />
                    ))}
                </View>
            </Card3D>
        );
    };

    const renderProductCard = (product: Product) => {
        if (!product) return null;

        // Get image URL with fallback
        const imageUrl = product.images && product.images.length > 0 ? product.images[0] : "https://via.placeholder.com/150";

        // Calculate discounted price if applicable
        const originalPrice = product.rate || 0;
        const discountPercent = product.discount || 0;
        const discountedPrice = originalPrice - originalPrice * (discountPercent / 100);

        return (
            <TouchableOpacity key={product._id} style={[styles.productCard, { width: productCardWidth }]} onPress={() => navigateToProductDetails(product._id)} activeOpacity={0.8}>
                <Card3D style={styles.productCardContainer}>
                    <View style={styles.productImageContainer}>
                        <Image source={{ uri: imageUrl }} style={styles.productImage} resizeMode="cover" />
                        {discountPercent > 0 && (
                            <View style={styles.discountBadge}>
                                <Text style={styles.discountText}>{discountPercent}% OFF</Text>
                            </View>
                        )}
                    </View>

                    <View style={styles.productInfo}>
                        <Text style={styles.productName} numberOfLines={1}>
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
                    </View>
                </Card3D>
            </TouchableOpacity>
        );
    };

    const renderShopCard = (shop: Shop) => {
        return (
            <TouchableOpacity key={shop._id} style={[styles.shopCardWrapper, { width: shopCardWidth }]} onPress={() => navigateToShopDetails(shop._id)} activeOpacity={0.8}>
                <Card3D style={styles.shopCard}>
                    <LinearGradient colors={["rgba(255,107,53,0.8)", "rgba(14,47,88,0.9)"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.shopCardGradient}>
                        <View style={styles.shopImageContainer}>
                            <Image
                                source={{
                                    uri: shop.image || "https://i.ibb.co/rskZwbK/shop-placeholder.jpg",
                                }}
                                style={styles.shopImage}
                                resizeMode="cover"
                            />
                        </View>
                        <View style={styles.shopContent}>
                            <Text style={styles.shopName}>{shop.name}</Text>
                            <View style={styles.shopRatingContainer}>
                                <Ionicons name="star" size={16} color="#FFD700" />
                                <Text style={styles.shopRating}>{shop.rating ? shop.rating.toFixed(1) : "0.0"}</Text>
                                <Text style={styles.shopRatingCount}>({shop.reviews ? shop.reviews.length : 0} reviews)</Text>
                            </View>
                            <View style={styles.shopDetailRow}>
                                <Ionicons name="location-outline" size={16} color="#FFFFFF" />
                                <Text style={styles.shopAddress} numberOfLines={1}>
                                    {shop.address ? `${shop.address.village || shop.address.city || ""}, ${shop.address.district || shop.address.street || ""}` : "Location not available"}
                                </Text>
                            </View>
                            <View style={styles.shopCategoriesContainer}>
                                {shop.categories?.map((category: string, index: number) => (
                                    <View key={index} style={styles.categoryTag}>
                                        <Text style={styles.categoryTagText}>{category}</Text>
                                    </View>
                                ))}
                            </View>
                            <View style={styles.shopStatus}>
                                <View style={[styles.statusIndicator, { backgroundColor: shop.isOpen ? theme.colors.success : theme.colors.error }]} />
                                <Text style={styles.statusText}>{shop.isOpen ? "Open Now" : "Closed"}</Text>
                            </View>
                        </View>
                    </LinearGradient>
                </Card3D>
            </TouchableOpacity>
        );
    };

    const renderAppInfoSection = () => {
        return (
            <Card3D style={styles.appInfoCard} elevation="medium">
                <LinearGradient colors={["#1e3c72", "#2a5298"]} style={styles.appInfoGradient}>
                    <Text style={styles.appInfoTitle}>About Dumpit</Text>
                    <Text style={styles.appInfoText}>Your one-stop marketplace for construction materials. Connect with trusted vendors, discover quality products, and build with confidence.</Text>

                    <View style={styles.featureRow}>
                        <View style={styles.featureItem}>
                            <View style={styles.featureIconContainer}>
                                <Ionicons name="shield-checkmark" size={24} color="#FFFFFF" />
                            </View>
                            <Text style={styles.featureTitle}>Verified Vendors</Text>
                            <Text style={styles.featureDescription}>All vendors are verified for quality and reliability</Text>
                        </View>

                        <View style={styles.featureItem}>
                            <View style={styles.featureIconContainer}>
                                <Ionicons name="cash" size={24} color="#FFFFFF" />
                            </View>
                            <Text style={styles.featureTitle}>Secure Payments</Text>
                            <Text style={styles.featureDescription}>Multiple payment options with secure transactions</Text>
                        </View>
                    </View>

                    <View style={styles.featureRow}>
                        <View style={styles.featureItem}>
                            <View style={styles.featureIconContainer}>
                                <Ionicons name="time" size={24} color="#FFFFFF" />
                            </View>
                            <Text style={styles.featureTitle}>Fast Delivery</Text>
                            <Text style={styles.featureDescription}>Quick delivery to your construction site</Text>
                        </View>

                        <View style={styles.featureItem}>
                            <View style={styles.featureIconContainer}>
                                <Ionicons name="star" size={24} color="#FFFFFF" />
                            </View>
                            <Text style={styles.featureTitle}>Quality Materials</Text>
                            <Text style={styles.featureDescription}>Top quality construction materials for your projects</Text>
                        </View>
                    </View>
                </LinearGradient>
            </Card3D>
        );
    };

    // Render category item with modern design
    const renderCategoryItem = (category: string, index: number) => {
        // Define a set of colors to cycle through for visual variety
        const colorSets = [
            { bg: "#FFE1D1", text: "#FF6B35", icon: "cube-outline" },
            { bg: "#E6F7FF", text: "#0CB0D3", icon: "construct-outline" },
            { bg: "#EEFBEF", text: "#53B175", icon: "layers-outline" },
            { bg: "#FFF6E6", text: "#FFA726", icon: "hammer-outline" },
            { bg: "#F4E8FF", text: "#9C27B0", icon: "grid-outline" },
            { bg: "#E8F5E9", text: "#4CAF50", icon: "analytics-outline" },
        ];

        // Cycle through colors based on index
        const colorSet = colorSets[index % colorSets.length];

        return (
            <TouchableOpacity key={index} style={[styles.categoryCard, { backgroundColor: colorSet.bg, width: categoryCardWidth }]} onPress={() => navigateToProductsByCategory(category)}>
                <View style={styles.categoryIconContainer}>
                    <Ionicons name={colorSet.icon as any} size={24} color={colorSet.text} />
                </View>
                <Text style={[styles.categoryName, { color: colorSet.text }]} numberOfLines={2}>
                    {category}
                </Text>
            </TouchableOpacity>
        );
    };

    return (
        <View style={styles.container}>
            <Header location={location.split(",")[0]} onProfilePress={handleProfilePress} onNotificationPress={handleNotificationPress} showLocation={true} />

            {/* Search Bar */}
            <View style={styles.searchContainer}>
                <TouchableOpacity style={styles.searchBar} onPress={() => navigation.navigate("ProductsTab")}>
                    <Ionicons name="search-outline" size={20} color={theme.colors.gray} />
                    <Text>Search for products</Text>
                </TouchableOpacity>
            </View>

            <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollViewContent} showsVerticalScrollIndicator={false}>
                <>
                    {/* Welcome section */}
                    <View style={styles.welcomeSection}>
                        <Text style={styles.welcomeText}>Welcome, {user?.name?.split(" ")[0] || "Guest"}!</Text>
                        <Text style={styles.locationText}>
                            <Ionicons name="location" size={16} color={theme.colors.primary} />
                            {location}
                        </Text>
                    </View>

                    {/* Rest of the content */}
                    {renderAdBanner()}

                    {/* Categories section */}
                    <View style={styles.section}>
                        <View style={styles.sectionHeader}>
                            <Text style={styles.sectionTitle}>Categories</Text>
                        </View>

                        {loading.categories ? (
                            <ActivityIndicator size="small" color={theme.colors.primary} />
                        ) : (
                            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoriesContainer}>
                                {categories.map((category, index) => renderCategoryItem(category, index))}
                            </ScrollView>
                        )}
                    </View>

                    {/* Nearby Shops section */}
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
                                {nearbyShops.map((shop) => renderShopCard(shop))}
                            </ScrollView>
                        ) : (
                            <Text style={styles.noDataText}>No nearby shops available</Text>
                        )}
                    </View>

                    {/* Products section */}
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
                                {Products.slice(0, 6).map((product) => renderProductCard(product))}
                            </ScrollView>
                        ) : (
                            <Text style={styles.noDataText}>No products available</Text>
                        )}
                    </View>

                    {/* App info section */}
                    {renderAppInfoSection()}
                </>
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
    locationText: {
        fontSize: 14,
        color: theme.colors.primary,
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
        paddingVertical: theme.spacing.md,
    },
    productCard: {
        marginRight: theme.spacing.md,
        aspectRatio: 1,
        borderRadius: theme.borderRadius.large,
    },
    productCardContainer: {
        flex: 1,
        backgroundColor: theme.colors.white,
        borderRadius: theme.borderRadius.large,
        overflow: "hidden",
        ...theme.shadow.medium,
        elevation: 4,
    },
    productImageContainer: {
        flex: 1,
        aspectRatio: 1,
        position: "relative",
    },
    productImage: {
        width: "100%",
        height: "100%",
        borderTopLeftRadius: theme.borderRadius.large,
        borderTopRightRadius: theme.borderRadius.large,
    },
    discountBadge: {
        position: "absolute",
        top: 8,
        right: 8,
        backgroundColor: theme.colors.error,
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 8,
    },
    discountText: {
        color: "#FFFFFF",
        fontWeight: "bold",
        fontSize: 10,
    },
    productInfo: {
        padding: theme.spacing.sm,
        backgroundColor: theme.colors.white,
    },
    productName: {
        fontSize: 14,
        fontWeight: "600",
        color: theme.colors.text,
        marginBottom: 2,
    },
    shopInfo: {
        flexDirection: "row",
        alignItems: "center",
        marginBottom: 8,
    },
    shopName: {
        fontSize: 12,
        color: theme.colors.gray,
        marginBottom: 4,
    },
    productPriceContainer: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
    },
    productPrice: {
        fontSize: 14,
        fontWeight: "bold",
        color: theme.colors.primary,
    },
    originalPrice: {
        fontSize: 11,
        color: theme.colors.gray,
        textDecorationLine: "line-through",
    },
    shopCardWrapper: {
        marginRight: theme.spacing.md,
    },
    shopCard: {
        padding: 0,
        overflow: "hidden",
        height: 120,
    },
    shopCardGradient: {
        flexDirection: "row",
        padding: theme.spacing.md,
        height: "100%",
        borderRadius: theme.borderRadius.large,
    },
    shopImageContainer: {
        width: 100,
        height: "100%",
        borderRadius: theme.borderRadius.medium,
        overflow: "hidden",
        marginRight: theme.spacing.md,
    },
    shopImage: {
        width: 70,
        height: 70,
        borderRadius: 30,
    },
    shopContent: {
        flex: 1,
        justifyContent: "center",
    },
    shopRatingContainer: {
        flexDirection: "row",
        alignItems: "center",
        marginBottom: 8,
    },
    shopRating: {
        fontSize: 14,
        color: "#FFFFFF",
        marginLeft: 4,
        fontWeight: "600",
    },
    shopRatingCount: {
        fontSize: 12,
        color: "rgba(255, 255, 255, 0.7)",
        marginLeft: 4,
    },
    shopDetailRow: {
        flexDirection: "row",
        alignItems: "center",
        marginBottom: 8,
    },
    shopAddress: {
        fontSize: 13,
        color: "#FFFFFF",
        marginLeft: 6,
        flex: 1,
    },
    shopCategoriesContainer: {
        flexDirection: "row",
        flexWrap: "wrap",
        marginBottom: 8,
    },
    categoryTag: {
        backgroundColor: "rgba(255, 255, 255, 0.2)",
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 12,
        marginRight: 6,
        marginBottom: 6,
    },
    categoryTagText: {
        fontSize: 11,
        color: "#FFFFFF",
    },
    shopStatus: {
        flexDirection: "row",
        alignItems: "center",
    },
    statusIndicator: {
        width: 8,
        height: 8,
        borderRadius: 4,
        marginRight: 6,
    },
    statusText: {
        fontSize: 12,
        color: "#FFFFFF",
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
    },
    appInfoGradient: {
        padding: theme.spacing.lg,
        borderRadius: theme.borderRadius.large,
    },
    appInfoTitle: {
        fontSize: 22,
        fontWeight: "bold",
        color: "#FFFFFF",
        marginBottom: 8,
        textAlign: "center",
    },
    appInfoText: {
        fontSize: 14,
        color: "#FFFFFF",
        marginBottom: 20,
        textAlign: "center",
        lineHeight: 20,
    },
    featureRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        marginBottom: 16,
    },
    featureItem: {
        width: "48%",
        backgroundColor: "rgba(255, 255, 255, 0.1)",
        borderRadius: theme.borderRadius.medium,
        padding: 12,
        alignItems: "center",
    },
    featureIconContainer: {
        width: 50,
        height: 50,
        borderRadius: 25,
        backgroundColor: "rgba(255, 255, 255, 0.2)",
        justifyContent: "center",
        alignItems: "center",
        marginBottom: 8,
    },
    featureTitle: {
        fontSize: 14,
        fontWeight: "bold",
        color: "#FFFFFF",
        marginBottom: 4,
        textAlign: "center",
    },
    featureDescription: {
        fontSize: 12,
        color: "rgba(255, 255, 255, 0.8)",
        textAlign: "center",
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

export default HomeScreen;

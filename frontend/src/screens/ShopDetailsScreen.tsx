import React, { useEffect, useState, useCallback } from "react";
import { View, Text, StyleSheet, ScrollView, Image, TouchableOpacity, ActivityIndicator, FlatList, Alert, SafeAreaView, Dimensions, RefreshControl, StatusBar } from "react-native";
import { useRoute } from "@react-navigation/core";
import { useNavigation } from "@react-navigation/native";
import { Ionicons, FontAwesome, MaterialIcons, MaterialCommunityIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";

import { getShop, addShopReview } from "../api/shopApi";
import { getProductsByShop } from "../api/productApi";
import { Shop } from "../types/shop";
import { Product } from "../types/product";
import { theme } from "../theme";
import Card3D from "../components/Card3D";
import Button from "../components/Button";
import AddReviewModal from "../components/AddReviewModal";
import MapView from "../components/MapView";
import { LocationService } from "../services/LocationService";
import ScreenHeader from "../components/ScreenHeader";

const { width: screenWidth, height: screenHeight } = Dimensions.get("window");

type TabType = "info" | "products" | "reviews";

const ShopDetailsScreen: React.FC = () => {
    const route = useRoute<any>();
    const navigation = useNavigation<any>();
    const { shopId } = route.params;

    const [shop, setShop] = useState<Shop | null>(null);
    const [products, setProducts] = useState<Product[]>([]);
    const [loading, setLoading] = useState(true);
    const [loadingProducts, setLoadingProducts] = useState(true);
    const [showReviewModal, setShowReviewModal] = useState(false);
    const [distance, setDistance] = useState<string>("");
    const [calculatingDistance, setCalculatingDistance] = useState(false);
    const [refreshing, setRefreshing] = useState(false);
    const [activeTab, setActiveTab] = useState<TabType>("info");

    // Fetch shop details
    const fetchShop = useCallback(async () => {
        setLoading(true);
        try {
            const response = await getShop(shopId);
            setShop(response.data);
        } catch (error) {
            Alert.alert("Error", "Failed to load shop details.");
            navigation.goBack();
        } finally {
            setLoading(false);
        }
    }, [shopId, navigation]);

    // Fetch products for this shop
    const fetchProducts = useCallback(async () => {
        setLoadingProducts(true);
        try {
            const response = await getProductsByShop(shopId);
            setProducts(response.data || []);
        } catch (error) {
            setProducts([]);
        } finally {
            setLoadingProducts(false);
        }
    }, [shopId]);

    // Calculate distance from user to shop
    const calculateDistance = useCallback(async () => {
        if (!shop?.location?.coordinates || shop.location.coordinates.length !== 2) return;
        setCalculatingDistance(true);
        try {
            const userLocation = await LocationService.getCurrentLocation();
            const shopLocation = {
                latitude: shop.location.coordinates[1],
                longitude: shop.location.coordinates[0],
            };
            const result = await LocationService.calculateShopDistance(userLocation, shopLocation);
            setDistance(result?.distanceText || "");
        } catch (error) {
            setDistance("");
        } finally {
            setCalculatingDistance(false);
        }
    }, [shop]);

    useEffect(() => {
        fetchShop();
    }, [fetchShop]);

    useEffect(() => {
        if (shop) {
            fetchProducts();
            calculateDistance();
        }
    }, [shop, fetchProducts, calculateDistance]);

    const handleRefresh = async () => {
        setRefreshing(true);
        await fetchShop();
        setRefreshing(false);
    };

    const handleAddReview = async (rating: number, text: string) => {
        if (!shop) return;
        try {
            await addShopReview(shop._id, { rating, text });
            await fetchShop();
            setShowReviewModal(false);
        } catch (error) {
            Alert.alert("Error", "Failed to add review.");
        }
    };

    const handleAddToCart = async (productId: string) => {
        try {
            // Navigate to product details for now, can be enhanced later
            navigation.navigate("ProductDetails", { productId });
        } catch (error) {
            Alert.alert("Error", "Failed to add to cart.");
        }
    };

    const renderStars = (rating: number, size: number = 16) => {
        const stars = [];
        const fullStars = Math.floor(rating);
        const hasHalfStar = rating % 1 !== 0;

        for (let i = 0; i < 5; i++) {
            if (i < fullStars) {
                stars.push(<Ionicons key={i} name="star" size={size} color="#FFD700" />);
            } else if (i === fullStars && hasHalfStar) {
                stars.push(<Ionicons key={i} name="star-half" size={size} color="#FFD700" />);
            } else {
                stars.push(<Ionicons key={i} name="star-outline" size={size} color="#FFD700" />);
            }
        }
        return stars;
    };

    const renderProduct = ({ item }: { item: Product }) => (
        <View style={styles.productCardWrapper}>
            <Card3D style={styles.productCard}>
                <TouchableOpacity onPress={() => navigation.navigate("ProductDetails", { productId: item._id })} activeOpacity={0.9} style={styles.cardTouchable}>
                    <View style={styles.productHeader}>
                        <View style={styles.imageContainer}>
                            <Image source={{ uri: item.image || "https://via.placeholder.com/150" }} style={styles.productImage} resizeMode="cover" />
                            {item.discount > 0 && (
                                <View style={styles.discountBadge}>
                                    <Text style={styles.discountText}>{Math.round(item.discount)}%</Text>
                                </View>
                            )}
                            {item.stock <= 0 && (
                                <View style={styles.outOfStockOverlay}>
                                    <Text style={styles.outOfStockText}>Out of Stock</Text>
                                </View>
                            )}
                        </View>

                        <TouchableOpacity
                            style={[styles.addButton, item.stock <= 0 && styles.addButtonDisabled]}
                            onPress={() => item.stock > 0 && handleAddToCart(item._id)}
                            disabled={item.stock <= 0}
                            activeOpacity={0.8}
                        >
                            <Ionicons name={item.stock > 0 ? "cart" : "close"} size={14} color={theme.colors.white} />
                        </TouchableOpacity>
                    </View>

                    <View style={styles.productContent}>
                        <Text style={styles.productName} numberOfLines={1}>
                            {item.name}
                        </Text>

                        {item.category && (
                            <View style={styles.categoryChip}>
                                <Text style={styles.categoryChipText}>{item.category}</Text>
                            </View>
                        )}

                        {item.rating > 0 && (
                            <View style={styles.ratingContainer}>
                                {renderStars(item.rating || 0, 10)}
                                <Text style={styles.ratingText}>{item.rating?.toFixed(1) || "0.0"}</Text>
                            </View>
                        )}

                        <View style={styles.priceContainer}>
                            {item.discount > 0 ? (
                                <View style={styles.priceWrapper}>
                                    <Text style={styles.discountedPrice}>₹{(item.price * (1 - item.discount / 100)).toFixed(0)}</Text>
                                    <Text style={styles.originalPrice}>₹{item.price.toFixed(0)}</Text>
                                </View>
                            ) : (
                                <Text style={styles.productPrice}>₹{item.price.toFixed(0)}</Text>
                            )}
                        </View>
                    </View>
                </TouchableOpacity>
            </Card3D>
        </View>
    );

    const renderShopInfo = () => (
        <ScrollView style={styles.tabContent} showsVerticalScrollIndicator={false} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}>
            {/* Shop Header with Gradient */}
            <View style={styles.shopHeaderContainer}>
                <Image source={{ uri: shop?.image }} style={styles.shopHeaderImage} resizeMode="cover" />
                <LinearGradient colors={["transparent", "rgba(0,0,0,0.8)"]} style={styles.headerGradient}>
                    <View style={styles.shopHeaderContent}>
                        <View style={styles.shopHeaderTop}>
                            <View style={styles.shopHeaderInfo}>
                                <Text style={styles.shopHeaderName}>{shop?.name}</Text>
                                <View style={styles.shopHeaderMeta}>
                                    <View style={styles.ratingRow}>
                                        {renderStars(shop?.rating || 0, 18)}
                                        <Text style={styles.ratingText}>{shop?.rating?.toFixed(1) || "0.0"}</Text>
                                        <Text style={styles.reviewCount}>({shop?.reviews?.length || 0} reviews)</Text>
                                    </View>
                                    <View style={[styles.statusBadge, { backgroundColor: shop?.isOpen ? theme.colors.success : theme.colors.error }]}>
                                        <Ionicons name={shop?.isOpen ? "time-outline" : "close-circle-outline"} size={12} color={theme.colors.white} />
                                        <Text style={styles.statusText}>{shop?.isOpen ? "Open" : "Closed"}</Text>
                                    </View>
                                </View>
                            </View>
                        </View>
                    </View>
                </LinearGradient>
            </View>

            {/* Quick Info Cards */}
            <View style={styles.quickInfoContainer}>
                <Card3D style={styles.quickInfoCard}>
                    <MaterialIcons name="local-shipping" size={24} color={theme.colors.primary} />
                    <Text style={styles.quickInfoLabel}>Shipping</Text>
                    <Text style={styles.quickInfoValue}>{shop?.shippingFee === 0 ? "Free" : `₹${shop?.shippingFee}`}</Text>
                </Card3D>

                <Card3D style={styles.quickInfoCard}>
                    <MaterialIcons name="schedule" size={24} color={theme.colors.primary} />
                    <Text style={styles.quickInfoLabel}>Min Order</Text>
                    <Text style={styles.quickInfoValue}>₹{shop?.minimumOrderAmount || 0}</Text>
                </Card3D>

                <Card3D style={styles.quickInfoCard}>
                    <MaterialIcons name="location-on" size={24} color={theme.colors.primary} />
                    <Text style={styles.quickInfoLabel}>Distance</Text>
                    <Text style={styles.quickInfoValue}>{calculatingDistance ? "..." : distance || "N/A"}</Text>
                </Card3D>
            </View>

            {/* Shop Description */}
            <Card3D style={styles.infoCard}>
                <View style={styles.sectionHeader}>
                    <MaterialIcons name="info-outline" size={20} color={theme.colors.primary} />
                    <Text style={styles.sectionTitle}>About</Text>
                </View>
                <Text style={styles.shopDescription}>{shop?.description}</Text>
            </Card3D>

            {/* Contact & Location */}
            <Card3D style={styles.infoCard}>
                <View style={styles.sectionHeader}>
                    <MaterialIcons name="contact-phone" size={20} color={theme.colors.primary} />
                    <Text style={styles.sectionTitle}>Contact & Location</Text>
                </View>
                <View style={styles.contactItem}>
                    <Ionicons name="location-outline" size={20} color={theme.colors.primary} />
                    <View style={styles.contactText}>
                        <Text style={styles.contactLabel}>Address</Text>
                        <Text style={styles.contactValue}>
                            {shop?.address.village}, {shop?.address.district}, {shop?.address.state} - {shop?.address.pincode}
                        </Text>
                    </View>
                </View>
                <View style={styles.contactItem}>
                    <FontAwesome name="phone" size={18} color={theme.colors.primary} />
                    <View style={styles.contactText}>
                        <Text style={styles.contactLabel}>Phone</Text>
                        <Text style={styles.contactValue}>{shop?.address.phone}</Text>
                    </View>
                </View>
                {calculatingDistance ? (
                    <View style={styles.contactItem}>
                        <MaterialIcons name="directions" size={20} color={theme.colors.primary} />
                        <Text style={styles.contactValue}>Calculating distance...</Text>
                    </View>
                ) : distance ? (
                    <View style={styles.contactItem}>
                        <MaterialIcons name="directions" size={20} color={theme.colors.primary} />
                        <Text style={styles.contactValue}>Distance: {distance}</Text>
                    </View>
                ) : null}
            </Card3D>

            {/* Categories */}
            {shop?.categories && shop.categories.length > 0 && (
                <Card3D style={styles.infoCard}>
                    <View style={styles.sectionHeader}>
                        <MaterialIcons name="category" size={20} color={theme.colors.primary} />
                        <Text style={styles.sectionTitle}>Categories</Text>
                    </View>
                    <View style={styles.categoriesContainer}>
                        {shop.categories.map((category, index) => (
                            <View key={index} style={styles.categoryChip}>
                                <Text style={styles.categoryChipText}>{category}</Text>
                            </View>
                        ))}
                    </View>
                </Card3D>
            )}

            {/* Location Map */}
            <Card3D style={styles.infoCard}>
                <View style={styles.sectionHeader}>
                    <MaterialIcons name="map" size={20} color={theme.colors.primary} />
                    <Text style={styles.sectionTitle}>Location</Text>
                </View>
                <MapView
                    markers={
                        shop?.location?.coordinates && shop.location.coordinates.length === 2
                            ? [
                                  {
                                      id: shop._id,
                                      coordinate: {
                                          latitude: shop.location.coordinates[1],
                                          longitude: shop.location.coordinates[0],
                                      },
                                      title: shop.name,
                                  },
                              ]
                            : []
                    }
                    style={styles.map}
                    zoomEnabled={false}
                    showsUserLocation={false}
                />
            </Card3D>
        </ScrollView>
    );

    const renderProducts = () => (
        <View style={styles.tabContent}>
            {loadingProducts ? (
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={theme.colors.primary} />
                    <Text style={styles.loadingText}>Loading products...</Text>
                </View>
            ) : products.length === 0 ? (
                <View style={styles.emptyContainer}>
                    <MaterialCommunityIcons name="package-variant" size={64} color={theme.colors.gray} />
                    <Text style={styles.emptyTitle}>No Products Available</Text>
                    <Text style={styles.emptySubtitle}>This shop hasn't added any products yet.</Text>
                </View>
            ) : (
                <FlatList
                    data={products}
                    renderItem={renderProduct}
                    keyExtractor={(item) => item._id}
                    numColumns={2}
                    columnWrapperStyle={styles.productRow}
                    contentContainerStyle={styles.productsContainer}
                    showsVerticalScrollIndicator={false}
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
                />
            )}
        </View>
    );

    const renderReviews = () => {
        console.log("Shop Reviews", shop?.reviews);
        return (
            <ScrollView style={styles.tabContent} showsVerticalScrollIndicator={false} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}>
                <Card3D style={styles.reviewsCard}>
                    <View style={styles.reviewsHeader}>
                        <View style={styles.reviewsHeaderLeft}>
                            <Text style={styles.sectionTitle}>Reviews</Text>
                            <Text style={styles.reviewsCount}>({shop?.reviews?.length || 0} reviews)</Text>
                        </View>
                        <Button title="Add Review" onPress={() => setShowReviewModal(true)} style={styles.addReviewButton} textStyle={styles.addReviewButtonText} />
                    </View>
                    {shop?.reviews && shop.reviews.length > 0 ? (
                        shop.reviews.map((review, index) => (
                            <View key={index} style={styles.reviewItem}>
                                <View style={styles.reviewHeader}>
                                    <View style={styles.reviewUserInfo}>
                                        <View style={styles.reviewUserAvatar}>
                                            <Text style={styles.reviewUserInitial}>{review?.user?.name?.charAt(0).toUpperCase()}</Text>
                                        </View>
                                        <View style={styles.reviewUserDetails}>
                                            <Text style={styles.reviewUserName}>{review?.user?.name}</Text>
                                            <Text style={styles.reviewDate}>{new Date(review.createdAt).toLocaleDateString()}</Text>
                                        </View>
                                    </View>
                                    <View style={styles.reviewRating}>{renderStars(review.rating, 14)}</View>
                                </View>
                                <Text style={styles.reviewText}>{review.text}</Text>
                            </View>
                        ))
                    ) : (
                        <View style={styles.noReviewsContainer}>
                            <MaterialCommunityIcons name="star-outline" size={48} color={theme.colors.gray} />
                            <Text style={styles.noReviewsText}>No reviews yet</Text>
                            <Text style={styles.noReviewsSubtext}>Be the first to review this shop!</Text>
                        </View>
                    )}
                </Card3D>
            </ScrollView>
        );
    };

    if (loading || !shop) {
        return (
            <SafeAreaView style={styles.safeArea}>
                <StatusBar barStyle="dark-content" backgroundColor={theme.colors.background} />
                <ScreenHeader title="Shop Details" showBackButton />
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={theme.colors.primary} />
                    <Text style={styles.loadingText}>Loading shop details...</Text>
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.safeArea}>
            <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
            <ScreenHeader title="Shop Details" showBackButton onNotificationPress={() => navigation.navigate("Notifications")} />

            {/* Tab Navigation */}
            <View style={styles.tabContainer}>
                <TouchableOpacity style={[styles.tab, activeTab === "info" && styles.activeTab]} onPress={() => setActiveTab("info")}>
                    <Ionicons name="information-circle-outline" size={20} color={activeTab === "info" ? theme.colors.primary : theme.colors.gray} />
                    <Text style={[styles.tabText, activeTab === "info" && styles.activeTabText]}>Shop Info</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.tab, activeTab === "products" && styles.activeTab]} onPress={() => setActiveTab("products")}>
                    <Ionicons name="cube-outline" size={20} color={activeTab === "products" ? theme.colors.primary : theme.colors.gray} />
                    <Text style={[styles.tabText, activeTab === "products" && styles.activeTabText]}>Products ({products.length})</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.tab, activeTab === "reviews" && styles.activeTab]} onPress={() => setActiveTab("reviews")}>
                    <Ionicons name="star-outline" size={20} color={activeTab === "reviews" ? theme.colors.primary : theme.colors.gray} />
                    <Text style={[styles.tabText, activeTab === "reviews" && styles.activeTabText]}>Reviews</Text>
                </TouchableOpacity>
            </View>

            {/* Tab Content */}
            {activeTab === "info" && renderShopInfo()}
            {activeTab === "products" && renderProducts()}
            {activeTab === "reviews" && renderReviews()}

            <AddReviewModal visible={showReviewModal} onClose={() => setShowReviewModal(false)} onSubmit={handleAddReview} title="Add a Review" />
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    safeArea: {
        flex: 1,
        backgroundColor: theme.colors.background,
    },
    tabContainer: {
        flexDirection: "row",
        backgroundColor: theme.colors.white,
        marginHorizontal: 16,
        marginTop: 16,
        borderRadius: 16,
        padding: 6,
        ...theme.shadow.medium,
    },
    tab: {
        flex: 1,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        paddingVertical: 12,
        paddingHorizontal: 8,
        borderRadius: 12,
    },
    activeTab: {
        backgroundColor: theme.colors.primaryLight,
    },
    tabText: {
        marginLeft: 6,
        fontSize: 13,
        fontWeight: "600",
        color: theme.colors.gray,
    },
    activeTabText: {
        color: theme.colors.primary,
    },
    tabContent: {
        flex: 1,
        marginTop: 16,
    },

    // Shop Header Styles
    shopHeaderContainer: {
        height: 250,
        marginHorizontal: 16,
        marginBottom: 16,
        borderRadius: 20,
        overflow: "hidden",
        ...theme.shadow.large,
    },
    shopHeaderImage: {
        width: "100%",
        height: "100%",
    },
    headerGradient: {
        position: "absolute",
        bottom: 0,
        left: 0,
        right: 0,
        height: "60%",
        justifyContent: "flex-end",
    },
    shopHeaderContent: {
        padding: 20,
    },
    shopHeaderTop: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "flex-end",
    },
    shopHeaderInfo: {
        flex: 1,
    },
    shopHeaderName: {
        fontSize: 28,
        fontWeight: "bold",
        color: theme.colors.white,
        marginBottom: 8,
        textShadowColor: "rgba(0, 0, 0, 0.5)",
        textShadowOffset: { width: 0, height: 1 },
        textShadowRadius: 3,
    },
    shopHeaderMeta: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
    },
    ratingRow: {
        flexDirection: "row",
        alignItems: "center",
    },

    reviewCount: {
        marginLeft: 4,
        fontSize: 14,
        color: theme.colors.white,
        opacity: 0.9,
        textShadowColor: "rgba(0, 0, 0, 0.5)",
        textShadowOffset: { width: 0, height: 1 },
        textShadowRadius: 2,
    },
    statusBadge: {
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 16,
    },
    statusText: {
        color: theme.colors.white,
        fontSize: 12,
        fontWeight: "bold",
        marginLeft: 4,
    },

    // Quick Info Cards
    quickInfoContainer: {
        flexDirection: "row",
        marginHorizontal: 16,
        marginBottom: 16,
        gap: 12,
    },
    quickInfoCard: {
        flex: 1,
        alignItems: "center",
        padding: 16,
        borderRadius: 16,
        backgroundColor: theme.colors.white,
        ...theme.shadow.small,
    },
    quickInfoLabel: {
        fontSize: 12,
        color: theme.colors.gray,
        marginTop: 8,
        fontWeight: "500",
    },
    quickInfoValue: {
        fontSize: 14,
        fontWeight: "bold",
        color: theme.colors.text,
        marginTop: 4,
    },

    // Info Cards
    infoCard: {
        marginHorizontal: 16,
        marginBottom: 16,
        padding: 20,
        borderRadius: 16,
        backgroundColor: theme.colors.white,
        ...theme.shadow.small,
    },
    sectionHeader: {
        flexDirection: "row",
        alignItems: "center",
        marginBottom: 16,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: "bold",
        color: theme.colors.text,
        marginLeft: 8,
    },
    shopDescription: {
        fontSize: 16,
        lineHeight: 24,
        color: theme.colors.textLight,
    },
    contactItem: {
        flexDirection: "row",
        alignItems: "flex-start",
        marginBottom: 16,
    },
    contactText: {
        flex: 1,
        marginLeft: 12,
    },
    contactLabel: {
        fontSize: 14,
        fontWeight: "600",
        color: theme.colors.text,
        marginBottom: 2,
    },
    contactValue: {
        fontSize: 14,
        color: theme.colors.textLight,
        lineHeight: 20,
    },
    categoriesContainer: {
        flexDirection: "row",
        flexWrap: "wrap",
        gap: 8,
    },

    map: {
        width: "100%",
        height: 200,
        borderRadius: 12,
    },

    // Reviews Styles
    reviewsCard: {
        marginHorizontal: 16,
        marginBottom: 16,
        padding: 20,
        borderRadius: 16,
        backgroundColor: theme.colors.white,
        ...theme.shadow.small,
    },
    reviewsHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 20,
    },
    reviewsHeaderLeft: {
        flexDirection: "row",
        alignItems: "center",
    },
    reviewsCount: {
        fontSize: 14,
        color: theme.colors.gray,
        marginLeft: 8,
    },
    addReviewButton: {
        backgroundColor: theme.colors.primary,
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
    },
    addReviewButtonText: {
        color: theme.colors.white,
        fontSize: 12,
        fontWeight: "600",
    },
    reviewItem: {
        paddingVertical: 16,
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.lightGray,
    },
    reviewHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "flex-start",
        marginBottom: 12,
    },
    reviewUserInfo: {
        flexDirection: "row",
        alignItems: "center",
        flex: 1,
    },
    reviewUserAvatar: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: theme.colors.primaryLight,
        justifyContent: "center",
        alignItems: "center",
        marginRight: 12,
    },
    reviewUserInitial: {
        fontSize: 16,
        fontWeight: "bold",
        color: theme.colors.primary,
    },
    reviewUserDetails: {
        flex: 1,
    },
    reviewUserName: {
        fontSize: 14,
        fontWeight: "600",
        color: theme.colors.text,
        marginBottom: 2,
    },
    reviewDate: {
        fontSize: 12,
        color: theme.colors.gray,
    },
    reviewRating: {
        flexDirection: "row",
        alignItems: "center",
    },
    reviewText: {
        fontSize: 14,
        color: theme.colors.textLight,
        lineHeight: 20,
    },
    noReviewsContainer: {
        alignItems: "center",
        paddingVertical: 40,
    },
    noReviewsText: {
        fontSize: 16,
        fontWeight: "600",
        color: theme.colors.text,
        marginTop: 12,
        marginBottom: 4,
    },
    noReviewsSubtext: {
        fontSize: 14,
        color: theme.colors.gray,
        textAlign: "center",
    },

    // Loading and Empty States
    loadingContainer: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        paddingVertical: 40,
    },
    loadingText: {
        marginTop: 12,
        fontSize: 16,
        color: theme.colors.gray,
    },
    emptyContainer: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        paddingVertical: 60,
    },
    emptyTitle: {
        fontSize: 18,
        fontWeight: "bold",
        color: theme.colors.text,
        marginTop: 16,
        marginBottom: 8,
    },
    emptySubtitle: {
        fontSize: 14,
        color: theme.colors.gray,
        textAlign: "center",
        paddingHorizontal: 32,
    },

    // Product Styles
    productsContainer: {
        paddingHorizontal: 16,
        paddingBottom: 20,
    },
    productRow: {
        justifyContent: "space-between",
        marginBottom: 12,
    },
    productCardWrapper: {
        width: (screenWidth - 48) / 2,
        marginBottom: 12,
    },
    productCard: {
        borderRadius: 12,
        overflow: "hidden",
        backgroundColor: theme.colors.white,
        ...theme.shadow.small,
        height: 180,
    },
    cardTouchable: {
        flex: 1,
    },
    productHeader: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        padding: 8,
        paddingBottom: 4,
    },
    imageContainer: {
        position: "relative",
        width: 60,
        height: 60,
        borderRadius: 30,
        overflow: "hidden",
        backgroundColor: theme.colors.lightGray,
    },
    productImage: {
        width: "100%",
        height: "100%",
        borderRadius: 30,
    },
    productContent: {
        padding: 8,
        paddingTop: 0,
        flex: 1,
    },
    productName: {
        fontSize: 12,
        fontWeight: "600",
        color: theme.colors.text,
        marginBottom: 4,
        lineHeight: 14,
    },
    categoryChip: {
        backgroundColor: theme.colors.primaryLight,
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 8,
        alignSelf: "flex-start",
        marginBottom: 4,
    },
    categoryChipText: {
        color: "black",
        fontSize: 8,
        fontWeight: "600",
    },
    ratingContainer: {
        flexDirection: "row",
        alignItems: "center",
        marginBottom: 6,
    },
    ratingText: {
        marginLeft: 2,
        fontSize: 10,
        color: theme.colors.gray,
    },
    priceContainer: {
        alignItems: "flex-start",
    },
    priceWrapper: {
        flexDirection: "row",
        alignItems: "center",
        gap: 4,
    },
    productPrice: {
        fontSize: 14,
        fontWeight: "bold",
        color: theme.colors.primary,
    },
    originalPrice: {
        fontSize: 10,
        color: theme.colors.gray,
        textDecorationLine: "line-through",
    },
    discountedPrice: {
        fontSize: 14,
        fontWeight: "bold",
        color: theme.colors.primary,
    },
    discountBadge: {
        position: "absolute",
        top: 2,
        right: 2,
        backgroundColor: theme.colors.success,
        paddingHorizontal: 4,
        paddingVertical: 1,
        borderRadius: 6,
        minWidth: 20,
        alignItems: "center",
    },
    discountText: {
        color: theme.colors.white,
        fontSize: 8,
        fontWeight: "bold",
    },
    addButton: {
        backgroundColor: theme.colors.primary,
        padding: 6,
        borderRadius: 16,
        width: 28,
        height: 28,
        justifyContent: "center",
        alignItems: "center",
    },
    addButtonDisabled: {
        backgroundColor: theme.colors.lightGray,
    },
    outOfStockOverlay: {
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: "rgba(255, 255, 255, 0.9)",
        borderRadius: 30,
    },
    outOfStockText: {
        fontSize: 8,
        fontWeight: "bold",
        color: theme.colors.error,
        textAlign: "center",
    },
});

export default ShopDetailsScreen;

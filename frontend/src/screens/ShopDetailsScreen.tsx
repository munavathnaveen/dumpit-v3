import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, ScrollView, Image, TouchableOpacity, ActivityIndicator, FlatList, Dimensions, RefreshControl, TextInput, Alert, Linking } from "react-native";
import { FontAwesome } from "@expo/vector-icons";
import { useDispatch } from "react-redux";
import Toast from "react-native-toast-message";

import { AppDispatch } from "../store";
import { theme } from "../theme";
import { getShop, addShopReview } from "../api/shopApi";
import { getProductsByShop } from "../api/productApi";
import { addToCart } from "../store/cartSlice";
import { useNavigation, useRoute } from "../navigation/hooks";
import Card3D from "../components/Card3D";
import { Product } from "../types/product";
import { Shop } from "../api/shopApi";
import MapViewComponent from "../components/MapView";
import { LocationService, Coordinates } from "../services/LocationService";
import toast from "../utils/toast";

const { width } = Dimensions.get("window");

const ShopDetailsScreen: React.FC = () => {
    const route = useRoute<"ShopDetails">();
    const navigation = useNavigation<"ShopDetails">();
    const dispatch = useDispatch<AppDispatch>();

    const { shopId } = route.params;
    const [shop, setShop] = useState<Shop | null>(null);
    const [products, setProducts] = useState<Product[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [refreshing, setRefreshing] = useState(false);
    const [showReviewForm, setShowReviewForm] = useState(false);
    const [reviewText, setReviewText] = useState("");
    const [reviewRating, setReviewRating] = useState(5);
    const [submittingReview, setSubmittingReview] = useState(false);
    const [userLocation, setUserLocation] = useState<Coordinates | null>(null);
    const [distance, setDistance] = useState<string | null>(null);
    const [duration, setDuration] = useState<string | null>(null);

    useEffect(() => {
        loadShopDetails();
    }, [shopId]);

    useEffect(() => {
        const getUserLocationAndDistance = async () => {
            try {
                // Get user's current location
                const location = await LocationService.getCurrentLocation();
                setUserLocation(location);

                // If shop has location data, calculate distance
                if (shop && shop.location && shop.location.coordinates && shop.location.coordinates.length === 2 && shop.location.coordinates[0] !== 0 && shop.location.coordinates[1] !== 0) {
                    // Calculate distance to shop
                    const distanceMatrix = await LocationService.getDistanceMatrix(location, {
                        latitude: shop.location.coordinates[1],
                        longitude: shop.location.coordinates[0],
                    });

                    if (distanceMatrix && distanceMatrix.distance && distanceMatrix.duration) {
                        setDistance(LocationService.formatDistance(distanceMatrix.distance));
                        setDuration(distanceMatrix.duration);
                    }
                }
            } catch (error) {
                console.error("Error getting location or calculating distance:", error);
            }
        };

        if (shop) {
            getUserLocationAndDistance();
        }
    }, [shop]);

    const loadShopDetails = async () => {
        try {
            setLoading(true);
            const shopResponse = await getShop(shopId);
            setShop(shopResponse.data);

            const productsResponse = await getProductsByShop(shopId);
            setProducts(productsResponse.data);

            setLoading(false);
        } catch (err: any) {
            setError(err.message || "Failed to load shop details");
            setLoading(false);
        }
    };

    const handleRefresh = async () => {
        setRefreshing(true);
        try {
            await loadShopDetails();
        } finally {
            setRefreshing(false);
        }
    };

    const handleAddToCart = (productId: string) => {
        dispatch(addToCart({ productId, quantity: 1 }));
        toast.success("Added to Cart", "Product has been added to your cart");
    };

    const handleProductPress = (productId: string) => {
        navigation.navigate("ProductDetails", { productId });
    };

    const handleGoBack = () => {
        navigation.goBack();
    };

    const handleSubmitReview = async () => {
        if (!shop) return;

        if (!reviewText.trim()) {
            toast.error("Review Required", "Please enter review text");
            return;
        }

        try {
            setSubmittingReview(true);
            await addShopReview(shopId, {
                rating: reviewRating,
                text: reviewText,
            });

            // Refresh shop data to show the new review
            const shopResponse = await getShop(shopId);
            setShop(shopResponse.data);

            setShowReviewForm(false);
            setReviewText("");
            setReviewRating(5);
            toast.success("Review Submitted", "Your review has been added successfully");
        } catch (error) {
            console.error("Failed to submit review:", error);
            toast.error("Review Failed", "Failed to submit your review. Please try again.");
        } finally {
            setSubmittingReview(false);
        }
    };

    const renderStarRating = (rating: number, size: number, interactive: boolean = false) => {
        return (
            <View style={{ flexDirection: "row" }}>
                {[1, 2, 3, 4, 5].map((star) => (
                    <TouchableOpacity key={star} onPress={() => interactive && setReviewRating(star)} disabled={!interactive}>
                        <FontAwesome name={star <= rating ? "star" : "star-o"} size={size} color={star <= rating ? "#FFD700" : theme.colors.textLight} style={{ marginRight: 2 }} />
                    </TouchableOpacity>
                ))}
            </View>
        );
    };

    const renderProductItem = ({ item }: { item: Product }) => (
        <TouchableOpacity onPress={() => handleProductPress(item._id)} activeOpacity={0.8}>
            <Card3D style={styles.productCard}>
                <Image source={{ uri: item.image || "https://via.placeholder.com/150" }} style={styles.productImage} />
                <View style={styles.productInfo}>
                    <Text style={styles.productName} numberOfLines={1}>
                        {item.name}
                    </Text>
                    <Text style={styles.productPrice}>₹{item.price.toFixed(2)}</Text>
                    <View style={styles.productBottom}>
                        <View style={styles.ratingContainer}>
                            <FontAwesome name="star" size={12} color="#FFD700" />
                            <Text style={styles.ratingText}>{item.rating.toFixed(1)}</Text>
                        </View>
                        <TouchableOpacity style={styles.addButton} onPress={() => handleAddToCart(item._id)} disabled={item.stock <= 0}>
                            <FontAwesome name="plus" size={14} color={theme.colors.white} />
                        </TouchableOpacity>
                    </View>
                </View>
            </Card3D>
        </TouchableOpacity>
    );

    const renderShopMap = () => {
        if (!shop || !shop.location || !shop.location.coordinates || shop.location.coordinates.length !== 2 || shop.location.coordinates[0] === 0 || shop.location.coordinates[1] === 0) {
            return null;
        }

        const shopLocation = {
            latitude: shop.location.coordinates[1],
            longitude: shop.location.coordinates[0],
        };

        return (
            <View style={styles.mapContainer}>
                <Text style={styles.sectionTitle}>Shop Location</Text>

                {distance && duration && (
                    <View style={styles.distanceContainer}>
                        <View style={styles.distanceItem}>
                            <FontAwesome name="map-marker" size={16} color={theme.colors.primary} />
                            <Text style={styles.distanceText}>{distance} away</Text>
                        </View>
                        <View style={styles.distanceItem}>
                            <FontAwesome name="clock-o" size={16} color={theme.colors.primary} />
                            <Text style={styles.distanceText}>{duration} by car</Text>
                        </View>
                    </View>
                )}

                <MapViewComponent
                    style={styles.map}
                    initialRegion={{
                        latitude: shopLocation.latitude,
                        longitude: shopLocation.longitude,
                        latitudeDelta: 0.01,
                        longitudeDelta: 0.01,
                    }}
                    markers={[
                        {
                            id: "shop",
                            coordinate: shopLocation,
                            title: shop.name,
                            description: shop.address ? `${shop.address.street}, ${shop.address.village}` : "",
                            pinColor: theme.colors.primary,
                        },
                    ]}
                    showsUserLocation={true}
                />

                <View style={styles.mapButtonsContainer}>
                    <TouchableOpacity
                        style={styles.mapButton}
                        onPress={() => {
                            const url = `https://www.google.com/maps/dir/?api=1&destination=${shopLocation.latitude},${shopLocation.longitude}`;
                            Linking.openURL(url);
                        }}
                    >
                        <FontAwesome name="location-arrow" size={16} color={theme.colors.white} />
                        <Text style={styles.mapButtonText}>Directions</Text>
                    </TouchableOpacity>
                </View>
            </View>
        );
    };

    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={theme.colors.primary} />
            </View>
        );
    }

    if (error || !shop) {
        return (
            <View style={styles.errorContainer}>
                <Text style={styles.errorText}>{error || "Shop not found. Please try again."}</Text>
                <TouchableOpacity style={styles.backButton} onPress={handleGoBack}>
                    <Text style={styles.backButtonText}>Go Back</Text>
                </TouchableOpacity>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <TouchableOpacity style={styles.backIconButton} onPress={handleGoBack}>
                <FontAwesome name="arrow-left" size={20} color={theme.colors.dark} />
            </TouchableOpacity>

            <ScrollView showsVerticalScrollIndicator={false} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}>
                <Image source={{ uri: shop.image || "https://via.placeholder.com/400" }} style={styles.coverImage} resizeMode="cover" />

                <View style={styles.shopInfoContainer}>
                    <View style={styles.logoContainer}>
                        <Image source={{ uri: shop.image || "https://via.placeholder.com/100" }} style={styles.logoImage} resizeMode="cover" />
                    </View>

                    <View style={styles.shopHeader}>
                        <Text style={styles.shopName}>{shop.name}</Text>
                        <View style={styles.ratingRow}>
                            <FontAwesome name="star" size={16} color="#FFD700" />
                            <Text style={styles.ratingValue}>{shop.rating.toFixed(1)}</Text>
                            <Text style={styles.reviewCount}>({shop.reviews ? shop.reviews.length : 0} reviews)</Text>
                        </View>

                        <View
                            style={[
                                styles.statusBadge,
                                {
                                    backgroundColor: shop.isOpen ? `${theme.colors.success}20` : `${theme.colors.error}20`,
                                    borderColor: shop.isOpen ? theme.colors.success : theme.colors.error,
                                },
                            ]}
                        >
                            <View
                                style={[
                                    styles.statusDot,
                                    {
                                        backgroundColor: shop.isOpen ? theme.colors.success : theme.colors.error,
                                    },
                                ]}
                            />
                            <Text
                                style={[
                                    styles.statusText,
                                    {
                                        color: shop.isOpen ? theme.colors.success : theme.colors.error,
                                    },
                                ]}
                            >
                                {shop.isOpen ? "Open Now" : "Closed"}
                            </Text>
                        </View>
                    </View>
                </View>

                <View style={styles.detailsContainer}>
                    <Text style={styles.sectionTitle}>About</Text>
                    <Text style={styles.descriptionText}>{shop.description}</Text>

                    <View style={styles.divider} />

                    <Text style={styles.sectionTitle}>Contact</Text>
                    <View style={styles.contactItem}>
                        <FontAwesome name="map-marker" size={16} color={theme.colors.textLight} />
                        <Text style={styles.contactText}>
                            {shop.address.street}, {shop.address.village}
                            {"\n"}
                            {shop.address.district}, {shop.address.state} - {shop.address.pincode}
                            {"\n"}
                            Phone: {shop.address.phone}
                        </Text>
                    </View>

                    <View style={styles.divider} />

                    <Text style={styles.sectionTitle}>Categories</Text>
                    <View style={styles.categoriesContainer}>
                        {shop.categories.map((category, index) => (
                            <View key={index} style={styles.categoryChip}>
                                <Text style={styles.categoryText}>{category}</Text>
                            </View>
                        ))}
                    </View>

                    <View style={styles.divider} />

                    <Text style={styles.sectionTitle}>Reviews</Text>

                    {shop.reviews && shop.reviews.length > 0 ? (
                        shop.reviews.slice(0, 3).map((review, index) => (
                            <View key={index} style={styles.reviewItem}>
                                <View style={styles.reviewHeader}>
                                    <Text style={styles.reviewerName}>{review.user.name}</Text>
                                    <View style={styles.reviewRating}>{renderStarRating(review.rating, 14, false)}</View>
                                </View>
                                <Text style={styles.reviewText}>{review.text}</Text>
                                <Text style={styles.reviewDate}>{new Date(review.createdAt).toLocaleDateString()}</Text>
                            </View>
                        ))
                    ) : (
                        <Text style={styles.noReviewsText}>No reviews yet. Be the first to leave a review!</Text>
                    )}

                    {shop.reviews && shop.reviews.length > 3 && (
                        <TouchableOpacity style={styles.moreReviewsButton}>
                            <Text style={styles.moreReviewsText}>See all {shop.reviews.length} reviews</Text>
                        </TouchableOpacity>
                    )}

                    {!showReviewForm ? (
                        <TouchableOpacity style={styles.addReviewButton} onPress={() => setShowReviewForm(true)}>
                            <Text style={styles.addReviewText}>Add Review</Text>
                        </TouchableOpacity>
                    ) : (
                        <Card3D style={styles.reviewFormContainer} elevation="medium">
                            <Text style={styles.reviewFormTitle}>Write a Review</Text>

                            <Text style={styles.ratingLabel}>Rating:</Text>
                            <View style={styles.ratingSelector}>{renderStarRating(reviewRating, 24, true)}</View>

                            <TextInput style={styles.reviewInput} placeholder="Write your review here..." value={reviewText} onChangeText={setReviewText} multiline numberOfLines={4} maxLength={200} />

                            <View style={styles.reviewFormButtons}>
                                <TouchableOpacity
                                    style={[styles.reviewButton, styles.cancelButton]}
                                    onPress={() => {
                                        setShowReviewForm(false);
                                        setReviewText("");
                                        setReviewRating(5);
                                    }}
                                >
                                    <Text style={styles.cancelButtonText}>Cancel</Text>
                                </TouchableOpacity>

                                <TouchableOpacity
                                    style={[styles.reviewButton, styles.submitButton, submittingReview && styles.disabledButton]}
                                    onPress={handleSubmitReview}
                                    disabled={submittingReview}
                                >
                                    {submittingReview ? <ActivityIndicator size="small" color="#FFFFFF" /> : <Text style={styles.submitButtonText}>Submit</Text>}
                                </TouchableOpacity>
                            </View>
                        </Card3D>
                    )}

                    <Text style={styles.sectionTitle}>Products</Text>
                    {loading ? (
                        <ActivityIndicator size="small" color={theme.colors.primary} style={styles.productsLoading} />
                    ) : products.length > 0 ? (
                        <View>
                            <FlatList
                                data={products.slice(0, 4)}
                                keyExtractor={(item) => item._id}
                                renderItem={renderProductItem}
                                horizontal
                                showsHorizontalScrollIndicator={false}
                                contentContainerStyle={styles.productsList}
                            />

                            <TouchableOpacity
                                style={styles.viewAllButton}
                                onPress={() =>
                                    navigation.navigate("TabNavigator", {
                                        screen: "ProductsTab",
                                        params: { shopId },
                                    })
                                }
                            >
                                <Text style={styles.viewAllButtonText}>View All Products</Text>
                                <FontAwesome name="arrow-right" size={16} color={theme.colors.primary} />
                            </TouchableOpacity>
                        </View>
                    ) : (
                        <Text style={styles.noProductsText}>This shop doesn't have any products yet.</Text>
                    )}

                    <View style={styles.divider} />

                    {shop.reviews && shop.reviews.length > 0 && (
                        <>
                            <Text style={styles.sectionTitle}>Reviews</Text>
                            {shop.reviews.slice(0, 3).map((review, index) => (
                                <View key={index} style={styles.reviewItem}>
                                    <View style={styles.reviewHeader}>
                                        <Text style={styles.reviewerName}>{review.user.name}</Text>
                                        <View style={styles.reviewRating}>
                                            <FontAwesome name="star" size={14} color="#FFD700" />
                                            <Text style={styles.reviewRatingText}>{review.rating}</Text>
                                        </View>
                                    </View>
                                    <Text style={styles.reviewText}>{review.text}</Text>
                                    <Text style={styles.reviewDate}>{new Date(review.createdAt).toLocaleDateString()}</Text>
                                </View>
                            ))}
                            {shop.reviews.length > 3 && (
                                <TouchableOpacity style={styles.moreReviewsButton}>
                                    <Text style={styles.moreReviewsText}>See all {shop.reviews.length} reviews</Text>
                                </TouchableOpacity>
                            )}
                        </>
                    )}
                </View>

                <View style={styles.divider} />

                {renderShopMap()}
            </ScrollView>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: theme.colors.background,
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
        fontSize: 16,
        color: theme.colors.error,
        textAlign: "center",
        marginBottom: 20,
    },
    backButton: {
        backgroundColor: theme.colors.primary,
        paddingVertical: 12,
        paddingHorizontal: 24,
        borderRadius: 25,
    },
    backButtonText: {
        color: theme.colors.white,
        fontWeight: "bold",
    },
    backIconButton: {
        position: "absolute",
        top: 40,
        left: 20,
        zIndex: 10,
        backgroundColor: theme.colors.white,
        borderRadius: 20,
        width: 40,
        height: 40,
        justifyContent: "center",
        alignItems: "center",
        shadowColor: theme.colors.dark,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 3,
        elevation: 5,
    },
    coverImage: {
        width: width,
        height: width * 0.6,
    },
    shopInfoContainer: {
        flexDirection: "row",
        padding: 16,
        backgroundColor: theme.colors.cardBg,
        borderRadius: 12,
        marginTop: -40,
        marginHorizontal: 16,
        shadowColor: theme.colors.dark,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
        elevation: 5,
    },
    logoContainer: {
        marginRight: 16,
    },
    logoImage: {
        width: 80,
        height: 80,
        borderRadius: 40,
        borderWidth: 2,
        borderColor: theme.colors.white,
    },
    shopHeader: {
        flex: 1,
    },
    shopName: {
        fontSize: 24,
        fontWeight: "bold",
        color: theme.colors.text,
        marginBottom: 4,
    },
    ratingRow: {
        flexDirection: "row",
        alignItems: "center",
        marginBottom: 8,
    },
    ratingValue: {
        fontSize: 16,
        fontWeight: "bold",
        color: theme.colors.text,
        marginLeft: 4,
    },
    reviewCount: {
        fontSize: 14,
        color: theme.colors.textLight,
        marginLeft: 4,
    },
    statusBadge: {
        flexDirection: "row",
        alignItems: "center",
        paddingVertical: 4,
        paddingHorizontal: 8,
        borderRadius: 12,
        borderWidth: 1,
        alignSelf: "flex-start",
    },
    statusDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        marginRight: 4,
    },
    statusText: {
        fontSize: 12,
        fontWeight: "bold",
    },
    detailsContainer: {
        padding: 16,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: "bold",
        color: theme.colors.text,
        marginBottom: 8,
    },
    descriptionText: {
        fontSize: 16,
        color: theme.colors.text,
        lineHeight: 24,
    },
    divider: {
        height: 1,
        backgroundColor: theme.colors.border,
        marginVertical: 16,
    },
    contactItem: {
        flexDirection: "row",
        marginBottom: 12,
    },
    contactText: {
        fontSize: 16,
        color: theme.colors.text,
        marginLeft: 12,
        flex: 1,
        lineHeight: 22,
    },
    categoriesContainer: {
        flexDirection: "row",
        flexWrap: "wrap",
    },
    categoryChip: {
        backgroundColor: `${theme.colors.primary}15`,
        paddingVertical: 6,
        paddingHorizontal: 12,
        borderRadius: 16,
        marginRight: 8,
        marginBottom: 8,
    },
    categoryText: {
        fontSize: 14,
        color: theme.colors.primary,
    },
    productsList: {
        paddingRight: 16,
    },
    productCard: {
        width: 160,
        marginRight: 12,
        borderRadius: 12,
        backgroundColor: theme.colors.cardBg,
        overflow: "hidden",
    },
    productImage: {
        width: "100%",
        height: 120,
        borderTopLeftRadius: 12,
        borderTopRightRadius: 12,
    },
    productInfo: {
        padding: 10,
    },
    productName: {
        fontSize: 16,
        fontWeight: "bold",
        color: theme.colors.text,
        marginBottom: 4,
    },
    productPrice: {
        fontSize: 14,
        fontWeight: "bold",
        color: theme.colors.primary,
        marginBottom: 8,
    },
    productBottom: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
    },
    ratingContainer: {
        flexDirection: "row",
        alignItems: "center",
    },
    ratingText: {
        fontSize: 12,
        color: theme.colors.text,
        marginLeft: 4,
    },
    addButton: {
        width: 24,
        height: 24,
        borderRadius: 12,
        backgroundColor: theme.colors.primary,
        justifyContent: "center",
        alignItems: "center",
    },
    viewAllButton: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        padding: 12,
        marginTop: 16,
        borderWidth: 1,
        borderColor: theme.colors.primary,
        borderRadius: theme.borderRadius.medium,
        backgroundColor: "transparent",
    },
    viewAllButtonText: {
        fontSize: 16,
        color: theme.colors.primary,
        fontWeight: "bold",
        marginRight: 8,
    },
    noProductsText: {
        color: theme.colors.textLight,
        fontSize: 16,
        textAlign: "center",
        marginTop: 20,
    },
    productsLoading: {
        marginTop: 20,
    },
    reviewItem: {
        marginHorizontal: 16,
        marginBottom: 12,
        padding: 12,
        backgroundColor: theme.colors.cardBg,
        borderRadius: 8,
    },
    reviewHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        marginBottom: 8,
    },
    reviewerName: {
        fontSize: 16,
        fontWeight: "500",
        color: theme.colors.text,
    },
    reviewRating: {
        flexDirection: "row",
        alignItems: "center",
    },
    reviewRatingText: {
        marginLeft: 4,
        color: theme.colors.text,
    },
    reviewText: {
        fontSize: 14,
        color: theme.colors.text,
        marginBottom: 4,
    },
    reviewDate: {
        fontSize: 12,
        color: theme.colors.textLight,
    },
    noReviewsText: {
        textAlign: "center",
        marginHorizontal: 16,
        marginVertical: 12,
        color: theme.colors.textLight,
        fontStyle: "italic",
    },
    moreReviewsButton: {
        alignItems: "center",
        paddingVertical: 8,
    },
    moreReviewsText: {
        color: theme.colors.primary,
        fontSize: 14,
    },
    addReviewButton: {
        backgroundColor: theme.colors.primary,
        padding: 12,
        borderRadius: 8,
        marginHorizontal: 16,
        marginTop: 16,
        marginBottom: 16,
        alignItems: "center",
    },
    addReviewText: {
        color: theme.colors.white,
        fontWeight: "bold",
        fontSize: 16,
    },
    reviewFormContainer: {
        backgroundColor: theme.colors.cardBg,
        borderRadius: 8,
        padding: 16,
        marginHorizontal: 16,
        marginTop: 16,
        marginBottom: 16,
    },
    reviewFormTitle: {
        fontSize: 18,
        fontWeight: "bold",
        color: theme.colors.text,
        marginBottom: 12,
    },
    ratingLabel: {
        fontSize: 16,
        color: theme.colors.text,
        marginBottom: 8,
    },
    ratingSelector: {
        flexDirection: "row",
        marginBottom: 16,
    },
    reviewInput: {
        backgroundColor: theme.colors.background,
        borderRadius: 8,
        padding: 12,
        minHeight: 100,
        textAlignVertical: "top",
        marginBottom: 16,
        borderColor: theme.colors.border,
        borderWidth: 1,
    },
    reviewFormButtons: {
        flexDirection: "row",
        justifyContent: "space-between",
    },
    reviewButton: {
        padding: 12,
        borderRadius: 8,
        flex: 1,
        alignItems: "center",
    },
    cancelButton: {
        backgroundColor: theme.colors.lightGray,
        marginRight: 8,
    },
    cancelButtonText: {
        color: theme.colors.text,
        fontWeight: "bold",
    },
    submitButton: {
        backgroundColor: theme.colors.primary,
        marginLeft: 8,
    },
    submitButtonText: {
        color: theme.colors.white,
        fontWeight: "bold",
    },
    disabledButton: {
        opacity: 0.7,
    },
    mapContainer: {
        marginHorizontal: 16,
        marginVertical: 20,
        borderRadius: 12,
        overflow: "hidden",
        backgroundColor: theme.colors.cardBg,
        ...theme.shadow.small,
    },
    map: {
        height: 200,
        width: "100%",
        borderRadius: 12,
    },
    distanceContainer: {
        flexDirection: "row",
        marginVertical: 8,
        marginHorizontal: 16,
    },
    distanceItem: {
        flexDirection: "row",
        alignItems: "center",
        marginRight: 20,
    },
    distanceText: {
        marginLeft: 6,
        color: theme.colors.gray,
        fontSize: 14,
    },
    mapButtonsContainer: {
        flexDirection: "row",
        justifyContent: "flex-end",
        padding: 12,
    },
    mapButton: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: theme.colors.primary,
        paddingVertical: 8,
        paddingHorizontal: 12,
        borderRadius: 25,
        ...theme.shadow.small,
    },
    mapButtonText: {
        color: theme.colors.white,
        marginLeft: 6,
        fontWeight: "600",
    },
    sectionContainer: {
        padding: 16,
    },
});

export default ShopDetailsScreen;

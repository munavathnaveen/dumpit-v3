import React, { useEffect, useState, useCallback } from "react";
import { View, Text, StyleSheet, ScrollView, Image, TouchableOpacity, ActivityIndicator, Dimensions, RefreshControl, TextInput, Alert, Linking, Platform } from "react-native";
import { FontAwesome, MaterialIcons, Ionicons } from "@expo/vector-icons";
import { useSelector, useDispatch } from "react-redux";
import MapView, { Marker, PROVIDER_GOOGLE } from "react-native-maps";
import Toast from "react-native-toast-message";

import { RootState, AppDispatch } from "../store";
import { theme } from "../theme";
import { getProduct } from "../store/productSlice";
import { addToCart } from "../store/cartSlice";
import { useNavigation, useRoute } from "../navigation/hooks";
import Card3D from "../components/Card3D";
import * as productApi from "../api/productApi";
import { LocationService, Coordinates } from "../services/LocationService";
import toast from "../utils/toast";

const { width } = Dimensions.get("window");

const ProductDetailsScreen: React.FC = () => {
    const route = useRoute<"ProductDetails">();
    const navigation = useNavigation<"ProductDetails">();
    const dispatch = useDispatch<AppDispatch>();

    const { productId } = route.params;
    const [quantity, setQuantity] = useState(1);
    const [refreshing, setRefreshing] = useState(false);
    const [showReviewForm, setShowReviewForm] = useState(false);
    const [reviewText, setReviewText] = useState("");
    const [reviewRating, setReviewRating] = useState(5);
    const [submittingReview, setSubmittingReview] = useState(false);
    const [userLocation, setUserLocation] = useState<Coordinates | null>(null);
    const [localProduct, setLocalProduct] = useState<any>(null);
    const [distanceMatrix, setDistanceMatrix] = useState<any>(null);
    const [mapRegion, setMapRegion] = useState<any>(null);
    const [showFullMap, setShowFullMap] = useState(false);

    const { product, loading, error } = useSelector((state: RootState) => state.product);

    // Get user location
    useEffect(() => {
        const getUserLocation = async () => {
            try {
                console.log("Getting user location for product:", productId);
                const location = await LocationService.getCurrentLocation();
                setUserLocation(location);
                console.log("Successfully got user location:", location);

                // Once we have the location, fetch the product with distance
                if (location) {
                    try {
                        console.log("Fetching product with distance data...");
                        const response = await productApi.getProductWithDistance(productId, location);
                        console.log(
                            "Product with distance data:",
                            response.data?.shop?.distance
                                ? `Distance: ${typeof response.data.shop.distance === "number" ? LocationService.formatDistance(response.data.shop.distance) : response.data.shop.distance}`
                                : "No distance data"
                        );
                        setLocalProduct(response.data);

                        // If shop has coordinates, set up the map region
                        if (response.data?.shop?.location?.coordinates && 
                            Array.isArray(response.data.shop.location.coordinates) && 
                            response.data.shop.location.coordinates.length === 2) {
                            
                            const shopCoords = {
                                latitude: response.data.shop.location.coordinates[1],
                                longitude: response.data.shop.location.coordinates[0],
                            };

                            // Set map region
                            setMapRegion({
                                latitude: shopCoords.latitude,
                                longitude: shopCoords.longitude,
                                latitudeDelta: 0.02,
                                longitudeDelta: 0.02,
                            });

                            // Calculate distance matrix for more details
                            try {
                                const matrix = await LocationService.getDistanceMatrix(location, shopCoords);
                                setDistanceMatrix(matrix);
                            } catch (err) {
                                console.error("Error getting distance matrix:", err);
                            }
                        }
                    } catch (err) {
                        console.error("Error fetching product with distance:", err);
                    }
                }
            } catch (error) {
                console.error("Error getting user location:", error);
            }
        };

        getUserLocation();
    }, [productId]);

    // Fetch product from Redux store
    useEffect(() => {
        dispatch(getProduct(productId));
    }, [dispatch, productId]);

    const handleRefresh = async () => {
        setRefreshing(true);

        try {
            // Refresh standard product data
            await dispatch(getProduct(productId));

            // Also fetch with distance if location is available
            if (userLocation) {
                try {
                    console.log("Refreshing product with distance data...");
                    const response = await productApi.getProductWithDistance(productId, userLocation);
                    console.log(
                        "Refreshed product with distance data:",
                        response.data?.shop?.distance
                            ? `Distance: ${typeof response.data.shop.distance === "number" ? LocationService.formatDistance(response.data.shop.distance) : response.data.shop.distance}`
                            : "No distance data"
                    );
                    setLocalProduct(response.data);

                    // If shop has coordinates, refresh distance matrix
                    if (response.data?.shop?.location?.coordinates && 
                        Array.isArray(response.data.shop.location.coordinates) && 
                        response.data.shop.location.coordinates.length === 2 && 
                        userLocation) {
                        
                        const shopCoords = {
                            latitude: response.data.shop.location.coordinates[1],
                            longitude: response.data.shop.location.coordinates[0],
                        };

                        try {
                            const matrix = await LocationService.getDistanceMatrix(userLocation, shopCoords);
                            setDistanceMatrix(matrix);
                        } catch (err) {
                            console.error("Error refreshing distance matrix:", err);
                        }
                    }
                } catch (err) {
                    console.error("Error refreshing product with distance:", err);
                }
            }
        } catch (error) {
            console.error("Error refreshing product:", error);
        }

        setRefreshing(false);
    };

    // Use merged product data (preferring local product with distance info if available)
    const productData = localProduct || product;

    const handleAddToCart = async () => {
        if (!productData) {
            toast.error("Error", "Product data not available");
            return;
        }

        try {
            // Check if the product is in stock
            if ((productData.stock || 0) <= 0) {
                toast.error("Out of Stock", "This product is currently unavailable");
                return;
            }

            // Check if quantity is valid
            if (quantity <= 0 || quantity > (productData.stock || 0)) {
                toast.error("Invalid Quantity", `Please select a quantity between 1 and ${productData.stock || 0}`);
                return;
            }

            // Dispatch the add to cart action and await its result
            await dispatch(
                addToCart({
                    productId: productId,
                    quantity: quantity,
                })
            ).unwrap();

            // Show success message
            toast.success("Added to Cart", `${quantity} item(s) added to your cart`);

            // Optionally reset quantity to 1 after successful add
            setQuantity(1);
        } catch (error) {
            console.error("Error adding to cart:", error);
            toast.error("Add to Cart Failed", "Unable to add product to cart. Please try again.");
        }
    };

    const handleQuantityChange = (value: number) => {
        const newQuantity = quantity + value;
        if (newQuantity >= 1 && productData && newQuantity <= (productData.stock || 0)) {
            setQuantity(newQuantity);
        }
    };

    const handleGoBack = () => {
        try {
            navigation.goBack();
        } catch (error) {
            console.error("Error going back:", error);
            navigation.navigate("TabNavigator", { screen: "ProductsTab" });
        }
    };

    const handleSubmitReview = async () => {
        if (!productData) return;

        if (!reviewText.trim()) {
            toast.error("Review Required", "Please enter review text");
            return;
        }

        try {
            setSubmittingReview(true);
            await productApi.addProductReview(productId, {
                rating: reviewRating,
                text: reviewText,
            });

            // Refresh product data to show the new review
            dispatch(getProduct(productId));

            // Clear form and hide it
            setReviewText("");
            setReviewRating(5);
            setShowReviewForm(false);

            toast.success("Review Submitted", "Your review has been added successfully");
        } catch (error) {
            console.error("Error submitting review:", error);
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

    console.log(productData);
    
    const openGoogleMaps = () => {
        if (!productData?.shop?.location?.coordinates || 
            !Array.isArray(productData.shop.location.coordinates) || 
            productData.shop.location.coordinates.length !== 2 || 
            !userLocation) {
            toast.error("Error", "Location data not available");
            return;
        }

        try {
            const destination = `${productData.shop.location.coordinates[1]},${productData.shop.location.coordinates[0]}`;
            const origin = `${userLocation.latitude},${userLocation.longitude}`;
            const url = Platform.select({
                ios: `maps://app?saddr=${origin}&daddr=${destination}`,
                android: `google.navigation:q=${destination}&mode=d`,
            });

            if (url) {
                Linking.openURL(url).catch((err) => {
                    console.error("Error opening maps:", err);
                    Alert.alert("Error", "Could not open Google Maps");
                });
            }
        } catch (error) {
            console.error("Error creating maps URL:", error);
            toast.error("Error", "Could not open maps application");
        }
    };

    const toggleFullMap = () => {
        setShowFullMap(!showFullMap);
    };

    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={theme.colors.primary} />
            </View>
        );
    }

    if (error || !productData) {
        return (
            <View style={styles.errorContainer}>
                <Text style={styles.errorText}>{error || "Product not found. Please try again."}</Text>
                <TouchableOpacity style={styles.backButton} onPress={handleGoBack}>
                    <Text style={styles.backButtonText}>Go Back</Text>
                </TouchableOpacity>
            </View>
        );
    }

    // Calculate discounted price if there's a discount
    const discountedPrice = (productData.discount || 0) > 0 ? (productData.price || 0) - (productData.price || 0) * ((productData.discount || 0) / 100) : null;

    // Extract shop coordinates if available
    const shopCoordinates = productData.shop?.location?.coordinates && 
        Array.isArray(productData.shop.location.coordinates) && 
        productData.shop.location.coordinates.length === 2
        ? {
              latitude: productData.shop.location.coordinates[1],
              longitude: productData.shop.location.coordinates[0],
          }
        : null;

    // Get the distance information (either simple distance or from distance matrix)
    const distanceInfo = distanceMatrix;
    const distanceText = distanceInfo?.distance
        ? LocationService.formatDistance(distanceInfo.distance)
        : typeof productData.shop?.distance === "number"
        ? LocationService.formatDistance(productData.shop.distance)
        : productData.shop?.distance;
    const durationText = distanceInfo?.duration;

    return (
        <View style={styles.container}>
            <TouchableOpacity style={styles.backIconButton} onPress={handleGoBack}>
                <FontAwesome name="arrow-left" size={20} color={theme.colors.dark} />
            </TouchableOpacity>

            <ScrollView showsVerticalScrollIndicator={false} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}>
                <Image source={{ uri: productData.image || "https://via.placeholder.com/400" }} style={styles.productImage} resizeMode="cover" />

                <View style={styles.contentContainer}>
                    <Text style={styles.productName}>{productData.name || "Unknown Product"}</Text>

                    <View style={styles.categoryContainer}>
                        <Text style={styles.categoryText}>{productData.category || "General"}</Text>
                        <Text style={styles.typeText}>{productData.type || "Product"}</Text>
                    </View>

                    {/* Shop info and distance section */}
                    {productData.shop && (
                        <View style={styles.shopInfoContainer}>
                            <Text style={styles.shopTitle}>Sold by: {productData.shop.name || "Unknown Shop"}</Text>

                            {distanceText && (
                                <View style={styles.distanceContainer}>
                                    <MaterialIcons name="location-on" size={20} color={theme.colors.primary} />
                                    <Text style={styles.distanceText}>{distanceText} away</Text>
                                    {durationText && (
                                        <Text style={styles.durationText}>
                                            <MaterialIcons name="access-time" size={16} color={theme.colors.textLight} /> {durationText}
                                        </Text>
                                    )}
                                </View>
                            )}

                            {shopCoordinates && mapRegion && (
                                <View style={styles.mapContainer}>
                                    <MapView provider={PROVIDER_GOOGLE} style={[styles.map, showFullMap && styles.expandedMap]} region={mapRegion} zoomEnabled scrollEnabled={showFullMap}>
                                        <Marker coordinate={shopCoordinates} title={productData.shop.name || "Shop"} description={productData.name || "Product"} />
                                        {userLocation && <Marker coordinate={userLocation} title="Your Location" pinColor="blue" />}
                                    </MapView>

                                    <View style={styles.mapButtonsContainer}>
                                        <TouchableOpacity style={[styles.mapButton, styles.expandButton]} onPress={toggleFullMap}>
                                            <MaterialIcons name={showFullMap ? "fullscreen-exit" : "fullscreen"} size={18} color="#fff" />
                                        </TouchableOpacity>

                                        <TouchableOpacity style={[styles.mapButton, styles.directionsButton]} onPress={openGoogleMaps}>
                                            <MaterialIcons name="directions" size={18} color="#fff" />
                                            <Text style={styles.directionsText}>Directions</Text>
                                        </TouchableOpacity>
                                    </View>
                                </View>
                            )}

                            {/* Shop address if available */}
                            {productData.shop.address && (
                                <View style={styles.addressContainer}>
                                    <Text style={styles.addressLabel}>Address:</Text>
                                    <Text style={styles.addressText}>
                                        {productData.shop.address.street || ""}, {productData.shop.address.village || ""}
                                    </Text>
                                    <Text style={styles.addressText}>
                                        {productData.shop.address.district || ""}, {productData.shop.address.state || ""} - {productData.shop.address.pincode || ""}
                                    </Text>
                                    {productData.shop.address.phone && (
                                        <TouchableOpacity 
                                            style={styles.phoneContainer} 
                                            onPress={() => {
                                                try {
                                                    Linking.openURL(`tel:${productData.shop.address.phone}`).catch(err => {
                                                        console.error("Error opening phone:", err);
                                                        toast.error("Error", "Could not open phone application");
                                                    });
                                                } catch (error) {
                                                    console.error("Error creating phone URL:", error);
                                                    toast.error("Error", "Could not open phone application");
                                                }
                                            }}
                                        >
                                            <Ionicons name="call" size={16} color={theme.colors.primary} />
                                            <Text style={styles.phoneText}>{productData.shop.address.phone}</Text>
                                        </TouchableOpacity>
                                    )}
                                </View>
                            )}
                        </View>
                    )}

                    <View style={styles.priceContainer}>
                        {discountedPrice ? (
                            <>
                                <Text style={styles.priceLabel}>Price:</Text>
                                <Text style={[styles.priceValue, styles.strikethrough]}>₹{(productData.price || 0).toFixed(2)}</Text>
                                <Text style={styles.discountedPrice}>₹{discountedPrice.toFixed(2)}</Text>
                                <View style={styles.discountBadge}>
                                    <Text style={styles.discountText}>{productData.discount || 0}% OFF</Text>
                                </View>
                            </>
                        ) : (
                            <>
                                <Text style={styles.priceLabel}>Price:</Text>
                                <Text style={styles.priceValue}>₹{(productData.price || 0).toFixed(2)}</Text>
                            </>
                        )}

                        <Text style={styles.stockText}>
                            {(productData.stock || 0) > 0 ? `In Stock (${productData.stock || 0} ${productData.units || "units"})` : "Out of Stock"}
                        </Text>
                    </View>

                    {(productData.stock || 0) > 0 && (
                        <View style={styles.quantityContainer}>
                            <Text style={styles.quantityLabel}>Quantity:</Text>
                            <TouchableOpacity style={styles.quantityButton} onPress={() => handleQuantityChange(-1)} disabled={quantity <= 1}>
                                <Text style={styles.quantityButtonText}>-</Text>
                            </TouchableOpacity>
                            <Text style={styles.quantityValue}>{quantity}</Text>
                            <TouchableOpacity style={styles.quantityButton} onPress={() => handleQuantityChange(1)} disabled={quantity >= (productData.stock || 0)}>
                                <Text style={styles.quantityButtonText}>+</Text>
                            </TouchableOpacity>
                        </View>
                    )}

                    {(productData.stock || 0) > 0 && (
                        <TouchableOpacity style={styles.addToCartButton} onPress={handleAddToCart}>
                            <Text style={styles.addToCartButtonText}>Add to Cart</Text>
                        </TouchableOpacity>
                    )}

                    <View style={styles.descriptionContainer}>
                        <Text style={styles.sectionTitle}>Description</Text>
                        <Text style={styles.descriptionText}>{productData.description || "No description available"}</Text>
                    </View>

                    <View style={styles.reviewsContainer}>
                        <View style={styles.reviewsHeader}>
                            <Text style={styles.sectionTitle}>Reviews</Text>
                            <View style={styles.ratingContainer}>
                                {renderStarRating(productData.rating || 0, 16)}
                                <Text style={styles.ratingText}>{productData.rating ? productData.rating.toFixed(1) : "No ratings"}</Text>
                            </View>
                        </View>

                        {!showReviewForm ? (
                            <TouchableOpacity style={styles.writeReviewButton} onPress={() => setShowReviewForm(true)}>
                                <Text style={styles.writeReviewButtonText}>Write a Review</Text>
                            </TouchableOpacity>
                        ) : (
                            <View style={styles.reviewFormContainer}>
                                <Text style={styles.reviewFormLabel}>Your Rating:</Text>
                                {renderStarRating(reviewRating, 24, true)}

                                <Text style={[styles.reviewFormLabel, { marginTop: 10 }]}>Your Review:</Text>
                                <TextInput style={styles.reviewInput} placeholder="Write your review here..." value={reviewText} onChangeText={setReviewText} multiline />

                                <View style={styles.reviewFormButtons}>
                                    <TouchableOpacity style={[styles.reviewFormButton, styles.cancelButton]} onPress={() => setShowReviewForm(false)}>
                                        <Text style={styles.cancelButtonText}>Cancel</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity style={[styles.reviewFormButton, styles.submitButton]} onPress={handleSubmitReview} disabled={submittingReview}>
                                        {submittingReview ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.submitButtonText}>Submit</Text>}
                                    </TouchableOpacity>
                                </View>
                            </View>
                        )}

                        {productData.reviews && productData.reviews.length > 0 ? (
                            productData.reviews.map(
                                (
                                    review: {
                                        user: { _id: string; name: string; avatar_url?: string };
                                        rating: number;
                                        text: string;
                                        createdAt: string;
                                    },
                                    index: number
                                ) => (
                                    <View key={index} style={styles.reviewItem}>
                                        <View style={styles.reviewHeader}>
                                            <View style={styles.reviewUser}>
                                                <Text style={styles.reviewUserName}>{review.user?.name || "Anonymous"}</Text>
                                                <Text style={styles.reviewDate}>{review.createdAt ? new Date(review.createdAt).toLocaleDateString() : ""}</Text>
                                            </View>
                                            {renderStarRating(review.rating || 0, 14)}
                                        </View>
                                        <Text style={styles.reviewText}>{review.text || ""}</Text>
                                    </View>
                                )
                            )
                        ) : (
                            <Text style={styles.noReviewsText}>No reviews yet. Be the first to review!</Text>
                        )}
                    </View>
                </View>
            </ScrollView>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#fff",
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
        color: "red",
        textAlign: "center",
        marginBottom: 20,
    },
    backButton: {
        backgroundColor: theme.colors.primary,
        paddingVertical: 10,
        paddingHorizontal: 20,
        borderRadius: 5,
    },
    backButtonText: {
        color: "#fff",
        fontSize: 16,
        fontWeight: "bold",
    },
    backIconButton: {
        position: "absolute",
        top: 50,
        left: 15,
        zIndex: 10,
        backgroundColor: "rgba(255, 255, 255, 0.8)",
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: "center",
        alignItems: "center",
    },
    productImage: {
        width: "100%",
        height: 300,
    },
    contentContainer: {
        padding: 15,
    },
    productName: {
        fontSize: 24,
        fontWeight: "bold",
        color: theme.colors.text,
        marginBottom: 10,
    },
    categoryContainer: {
        flexDirection: "row",
        marginBottom: 15,
    },
    categoryText: {
        backgroundColor: theme.colors.secondary,
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 15,
        fontSize: 12,
        color: "#fff",
        marginRight: 10,
    },
    typeText: {
        backgroundColor: theme.colors.accent,
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 15,
        fontSize: 12,
        color: "#fff",
    },
    shopInfoContainer: {
        marginBottom: 15,
        padding: 12,
        backgroundColor: "#f9f9f9",
        borderRadius: 8,
        borderWidth: 1,
        borderColor: "#eee",
    },
    shopTitle: {
        fontSize: 16,
        fontWeight: "bold",
        marginBottom: 8,
        color: theme.colors.text,
    },
    distanceContainer: {
        flexDirection: "row",
        alignItems: "center",
        marginBottom: 10,
        flexWrap: "wrap",
    },
    distanceText: {
        fontSize: 14,
        color: theme.colors.text,
        marginLeft: 5,
        fontWeight: "bold",
    },
    durationText: {
        fontSize: 12,
        color: theme.colors.textLight,
        marginLeft: 10,
    },
    mapContainer: {
        height: 200,
        borderRadius: 8,
        overflow: "hidden",
        marginVertical: 10,
    },
    map: {
        width: "100%",
        height: 200,
    },
    expandedMap: {
        height: 400,
    },
    mapButtonsContainer: {
        position: "absolute",
        bottom: 10,
        right: 10,
        flexDirection: "row",
    },
    mapButton: {
        padding: 8,
        borderRadius: 4,
        marginLeft: 8,
        backgroundColor: theme.colors.primary,
        flexDirection: "row",
        alignItems: "center",
    },
    expandButton: {
        width: 34,
        height: 34,
        justifyContent: "center",
        alignItems: "center",
        padding: 0,
    },
    directionsButton: {
        paddingHorizontal: 12,
    },
    directionsText: {
        color: "#fff",
        fontSize: 12,
        marginLeft: 4,
    },
    addressContainer: {
        marginTop: 10,
    },
    addressLabel: {
        fontSize: 14,
        fontWeight: "bold",
        color: theme.colors.textLight,
    },
    addressText: {
        fontSize: 13,
        color: theme.colors.text,
        marginTop: 2,
    },
    phoneContainer: {
        flexDirection: "row",
        alignItems: "center",
        marginTop: 5,
    },
    phoneText: {
        fontSize: 13,
        color: theme.colors.primary,
        marginLeft: 4,
        textDecorationLine: "underline",
    },
    priceContainer: {
        flexDirection: "row",
        alignItems: "center",
        flexWrap: "wrap",
        marginBottom: 15,
        backgroundColor: "#f5f5f5",
        padding: 10,
        borderRadius: 8,
    },
    priceLabel: {
        fontSize: 16,
        color: theme.colors.textLight,
        marginRight: 5,
    },
    priceValue: {
        fontSize: 18,
        fontWeight: "bold",
        color: theme.colors.text,
    },
    strikethrough: {
        textDecorationLine: "line-through",
        color: theme.colors.textLight,
        marginRight: 10,
    },
    discountedPrice: {
        fontSize: 18,
        fontWeight: "bold",
        color: theme.colors.success,
        marginRight: 10,
    },
    discountBadge: {
        backgroundColor: theme.colors.success,
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 4,
    },
    discountText: {
        color: "#fff",
        fontSize: 12,
        fontWeight: "bold",
    },
    stockText: {
        fontSize: 14,
        color: theme.colors.textLight,
        marginLeft: "auto",
    },
    quantityContainer: {
        flexDirection: "row",
        alignItems: "center",
        marginBottom: 20,
    },
    quantityLabel: {
        fontSize: 16,
        marginRight: 10,
        color: theme.colors.text,
    },
    quantityButton: {
        width: 30,
        height: 30,
        backgroundColor: theme.colors.primary,
        borderRadius: 15,
        justifyContent: "center",
        alignItems: "center",
    },
    quantityButtonText: {
        color: "#fff",
        fontSize: 16,
        fontWeight: "bold",
    },
    quantityValue: {
        fontSize: 16,
        fontWeight: "bold",
        marginHorizontal: 15,
        width: 30,
        textAlign: "center",
    },
    addToCartButton: {
        backgroundColor: theme.colors.primary,
        paddingVertical: 15,
        borderRadius: 8,
        alignItems: "center",
        marginBottom: 20,
    },
    addToCartButtonText: {
        color: "#fff",
        fontSize: 16,
        fontWeight: "bold",
    },
    descriptionContainer: {
        marginBottom: 20,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: "bold",
        marginBottom: 10,
        color: theme.colors.text,
    },
    descriptionText: {
        fontSize: 14,
        lineHeight: 22,
        color: theme.colors.text,
    },
    reviewsContainer: {
        marginBottom: 20,
    },
    reviewsHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 15,
    },
    ratingContainer: {
        flexDirection: "row",
        alignItems: "center",
    },
    ratingText: {
        fontSize: 14,
        color: theme.colors.text,
        marginLeft: 5,
    },
    writeReviewButton: {
        backgroundColor: "#f0f0f0",
        paddingVertical: 10,
        paddingHorizontal: 15,
        borderRadius: 5,
        alignSelf: "flex-start",
        marginBottom: 15,
    },
    writeReviewButtonText: {
        color: theme.colors.text,
        fontSize: 14,
    },
    reviewFormContainer: {
        backgroundColor: "#f9f9f9",
        padding: 15,
        borderRadius: 8,
        marginBottom: 20,
    },
    reviewFormLabel: {
        fontSize: 14,
        fontWeight: "bold",
        marginBottom: 5,
        color: theme.colors.text,
    },
    reviewInput: {
        backgroundColor: "#fff",
        borderColor: "#ddd",
        borderWidth: 1,
        borderRadius: 5,
        padding: 10,
        height: 100,
        textAlignVertical: "top",
    },
    reviewFormButtons: {
        flexDirection: "row",
        justifyContent: "flex-end",
        marginTop: 10,
    },
    reviewFormButton: {
        padding: 10,
        borderRadius: 5,
        minWidth: 100,
        alignItems: "center",
    },
    cancelButton: {
        backgroundColor: "#f0f0f0",
        marginRight: 10,
    },
    cancelButtonText: {
        color: theme.colors.text,
    },
    submitButton: {
        backgroundColor: theme.colors.primary,
    },
    submitButtonText: {
        color: "#fff",
        fontWeight: "bold",
    },
    reviewItem: {
        padding: 15,
        backgroundColor: "#f9f9f9",
        borderRadius: 8,
        marginBottom: 10,
    },
    reviewHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "flex-start",
        marginBottom: 8,
    },
    reviewUser: {
        flex: 1,
    },
    reviewUserName: {
        fontSize: 14,
        fontWeight: "bold",
        color: theme.colors.text,
    },
    reviewDate: {
        fontSize: 12,
        color: theme.colors.textLight,
    },
    reviewText: {
        fontSize: 14,
        color: theme.colors.text,
    },
    noReviewsText: {
        fontStyle: "italic",
        color: theme.colors.textLight,
    },
});

export default ProductDetailsScreen;

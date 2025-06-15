import React, { useState, useEffect, useCallback } from "react";
import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, Image, Alert, ActivityIndicator, Platform, FlatList, Modal } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { KeyboardAwareScrollView } from "react-native-keyboard-aware-scroll-view";
import debounce from "lodash.debounce";

import { theme } from "../../theme";
import { MainStackNavigationProp } from "../../navigation/types";
import { createProduct, getProductImageByName, uploadProductImage, ProductFormData } from "../../api/productApi";
import ScreenHeader from "../../components/ScreenHeader";
import alert from "../../utils/alert";
import Card3D from "../../components/Card3D";
import SimpleDropdown from "../../components/SimpleDropdown";

// Categories and product types from the provided JSON
interface ProductCategoriesMap {
    [key: string]: string[];
}

const PRODUCT_CATEGORIES: ProductCategoriesMap = {
    "Construction Materials": ["Cement", "Steel", "Sand", "Aggregate"],
    "Interior Products": ["Plywood", "Laminates", "Hardware", "Edge Beeding", "Adhesive"],
    "Plumbing & Bathware": ["Upvc Pipes", "HDPE Pipes", "PVC Pipes", "Fixtures"],
    Electrical: ["Wires", "Lights", "Switches & Boards"],
    Paints: ["Putty", "Primers", "Internal Paints", "External Paints", "Enamel Paints"],
    "Tiles & Granites": ["Floor Tiles", "Bath room Dadoo", "Bath room Flooring", "Adhesives", "Granite", "Marbles"],
    "Man Power supply": ["Carpenters", "Painters", "Electrician", "Plumbers", "Masons", "Labour", "Tile labour"],
    "Machinery & Equipments": ["Machinery", "Equipments"],
    Other: ["Other"],
};

// Flattened categories array for display
const CATEGORIES = Object.keys(PRODUCT_CATEGORIES);

const VendorAddProductScreen: React.FC = () => {
    const navigation = useNavigation<MainStackNavigationProp<"VendorAddProduct">>();

    const [formData, setFormData] = useState<ProductFormData>({
        name: "",
        description: "",
        price: 0,
        type: "",
        category: "",
        units: "",
        stock: 0,
        discount: 0,
        image: "",
        isActive: true,
    });

    const [loading, setLoading] = useState(false);
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [productTypes, setProductTypes] = useState<string[]>([]);
    const [loadingImage, setLoadingImage] = useState(false);

    //Effect to update product types when category changes
    useEffect(() => {
        if (formData.category && PRODUCT_CATEGORIES[formData.category]) {
            setProductTypes(PRODUCT_CATEGORIES[formData.category]);
        } else {
            setProductTypes([]);
        }
    }, [formData.category]);

    const validateForm = (): boolean => {
        const newErrors: Record<string, string> = {};

        if (!formData.name.trim()) {
            newErrors.name = "Product name is required";
        }

        if (!formData.description.trim()) {
            newErrors.description = "Description is required";
        }

        if (!formData.type || formData.type.trim() === "") {
            newErrors.type = "Product type is required";
        }

        if (!formData.category || formData.category.trim() === "") {
            newErrors.category = "Product category is required";
        }

        if (!formData.price || formData.price <= 0) {
            newErrors.price = "Price must be greater than 0";
        }

        if (!formData.units || formData.units.trim() === "") {
            newErrors.units = "Units are required";
        }

        if (formData.stock === undefined || formData.stock < 0) {
            newErrors.stock = "Stock quantity cannot be negative";
        }

        if (formData.discount !== undefined && (formData.discount < 0 || formData.discount > 100)) {
            newErrors.discount = "Discount must be between 0 and 100%";
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const fetchImageForProduct = useCallback(
        debounce(async (name: string) => {
            if (!name.trim()) {
                handleImageChange("");
                setLoadingImage(false);
                return;
            }

            try {
                setLoadingImage(true);
                const response = await getProductImageByName(name);
                //console.log('Image fetch response:', response); // Debug log
                if (response && response.success && typeof response.imageUrl === "string") {
                    handleImageChange(response.imageUrl);
                } else {
                    handleImageChange("");
                    alert("Error", "Invalid image response from server");
                }
            } catch (error: any) {
                console.error("Failed to fetch image:", {
                    message: error.message,
                    status: error.response?.status,
                    data: error.response?.data,
                });
                let errorMessage = "Could not fetch image for this product name";
                if (error.response?.status === 401 || error.response?.status === 403) {
                    errorMessage = "Please log in as a vendor to fetch images";
                } else if (error.response?.status === 500) {
                    errorMessage = "Server error while fetching image. Please try again later.";
                }
                handleImageChange("");
                alert("Error", errorMessage);
            } finally {
                setLoadingImage(false);
            }
        }, 800),
        []
    );

    const handleInputChange = (field: keyof ProductFormData, value: any) => {
        setFormData((prevFormData) => ({
            ...prevFormData,
            [field]: value,
        }));

        if (errors[field]) {
            const newErrors = { ...errors };
            delete newErrors[field];
            setErrors(newErrors);
        }

        if (field === "name") {
            fetchImageForProduct(value);
        }
    };

    const handleCategorySelect = (category: string) => {
        console.log("Selected category:", category);
        handleInputChange("category", category);
    };

    const handleTypeSelect = (type: string) => {
        console.log("Selected type:", type);
        handleInputChange("type", type);
    };

    const handleImageChange = (url: string) => {
        setFormData((prevFormData) => ({
            ...prevFormData,
            image: url,
        }));

        // Clear any image error
        if (errors.image) {
            const newErrors = { ...errors };
            delete newErrors.image;
            setErrors(newErrors);
        }
    };

    const handleRemoveImage = () => {
        setFormData((prevFormData) => ({
            ...prevFormData,
            image: "",
        }));
    };

    const handleAddProduct = async () => {
        if (!validateForm()) {
            alert("Validation Error", "Please fix the errors in the form.");
            return;
        }

        setLoading(true);
        try {
            // Create product with basic data first
            const response = await createProduct({
                name: formData.name.trim(),
                description: formData.description.trim(),
                type: formData.type,
                category: formData.category,
                price: formData.price,
                units: formData.units,
                stock: formData.stock,
                discount: formData.discount,
                isActive: formData.isActive,
                image: formData.image,
            });

            if (response.success) {
                // If the product has an image URL and was created successfully, update the image
                alert("Success", "Product added successfully!", [
                    {
                        text: "OK",
                        onPress: () => navigation.navigate("VendorProducts"),
                    },
                ]);
            } else {
                alert("Error", "Failed to add product. Please try again.");
            }
        } catch (error) {
            console.error("Failed to add product:", error);
            alert("Error", "Failed to add product. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <View style={styles.container}>
                <ScreenHeader title="Add Product" showBackButton={true} />
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={theme.colors.primary} />
                    <Text style={styles.loadingText}>Creating your product...</Text>
                </View>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <ScreenHeader title="Add New Product" showBackButton={true} />

            <KeyboardAwareScrollView
                style={styles.scrollView}
                contentContainerStyle={styles.contentContainer}
                keyboardShouldPersistTaps="always"
                enableOnAndroid={true}
                enableResetScrollToCoords={false}
            >
                <Card3D>
                    <Text style={styles.formTitle}>Product Information</Text>

                    {/* Product Name */}
                    <View style={styles.formGroup}>
                        <Text style={styles.label}>Product Name*</Text>
                        <TextInput
                            style={styles.input}
                            value={formData.name}
                            onChangeText={(text) => handleInputChange("name", text)}
                            placeholder="Enter product name"
                            placeholderTextColor={theme.colors.gray}
                        />
                        {errors.name && <Text style={styles.errorText}>{errors.name}</Text>}
                    </View>

                    {/* Product Description */}
                    <View style={styles.formGroup}>
                        <Text style={styles.label}>Description*</Text>
                        <TextInput
                            style={[styles.input, styles.textArea]}
                            value={formData.description}
                            onChangeText={(text) => handleInputChange("description", text)}
                            placeholder="Enter product description"
                            placeholderTextColor={theme.colors.gray}
                            multiline
                            numberOfLines={4}
                        />
                        {errors.description && <Text style={styles.errorText}>{errors.description}</Text>}
                    </View>

                    {/* Product Category - Appears first now */}
                    <SimpleDropdown
                        label="Category"
                        options={CATEGORIES}
                        selectedValue={formData.category}
                        onSelect={handleCategorySelect}
                        error={errors.category}
                        placeholder="Select product category"
                        required={true}
                    />

                    {/* Product Type - Appears after category */}
                    <SimpleDropdown
                        label="Product Type"
                        options={productTypes}
                        selectedValue={formData.type}
                        onSelect={handleTypeSelect}
                        error={errors.type}
                        placeholder="Select product type"
                        required={true}
                        disabled={!formData.category}
                    />

                    {/* Price/Rate */}
                    <View style={styles.formGroup}>
                        <Text style={styles.label}>Price (₹)*</Text>
                        <TextInput
                            style={styles.input}
                            value={formData.price?.toString() || ""}
                            onChangeText={(text) => handleInputChange("price", parseFloat(text) || 0)}
                            placeholder="Enter product price"
                            placeholderTextColor={theme.colors.gray}
                            keyboardType="decimal-pad"
                        />
                        {errors.price && <Text style={styles.errorText}>{errors.price}</Text>}
                    </View>

                    {/* Units */}
                    <View style={styles.formGroup}>
                        <Text style={styles.label}>Units*</Text>
                        <TextInput
                            style={styles.input}
                            value={formData.units}
                            onChangeText={(text) => handleInputChange("units", text)}
                            placeholder="Enter units (e.g., kg, piece, dozen)"
                            placeholderTextColor={theme.colors.gray}
                        />
                        {errors.units && <Text style={styles.errorText}>{errors.units}</Text>}
                    </View>

                    {/* Stock Quantity */}
                    <View style={styles.formGroup}>
                        <Text style={styles.label}>Stock Quantity*</Text>
                        <TextInput
                            style={styles.input}
                            value={formData.stock?.toString() || ""}
                            onChangeText={(text) => handleInputChange("stock", parseInt(text) || 0)}
                            placeholder="Enter available stock"
                            placeholderTextColor={theme.colors.gray}
                            keyboardType="number-pad"
                        />
                        {errors.stock && <Text style={styles.errorText}>{errors.stock}</Text>}
                    </View>

                    {/* Discount */}
                    <View style={styles.formGroup}>
                        <Text style={styles.label}>Discount (%)</Text>
                        <TextInput
                            style={styles.input}
                            value={formData.discount?.toString() || ""}
                            onChangeText={(text) => handleInputChange("discount", parseFloat(text) || 0)}
                            placeholder="Enter discount percentage"
                            placeholderTextColor={theme.colors.gray}
                            keyboardType="decimal-pad"
                        />
                        {errors.discount && <Text style={styles.errorText}>{errors.discount}</Text>}
                    </View>

                    {/* Product Image */}
                    <View style={styles.formGroup}>
                        <Text style={styles.label}>Product Image (Optional)</Text>
                        {/* <View style={styles.formGroup}>
                            <Text style={styles.label}>Image URL</Text>
                            <TextInput
                                style={styles.input}
                                value={formData.image}
                                onChangeText={(text) => handleImageChange(text)}
                                placeholder="Enter image URL (optional)"
                                placeholderTextColor={theme.colors.gray}
                            />
                            {errors.image && <Text style={styles.errorText}>{errors.image}</Text>}

                            <Text style={styles.helperText}>If not provided, a similar product type image will be used if available.</Text>
                        </View> */}

                        {loadingImage ? (
                            <ActivityIndicator size="small" color={theme.colors.primary} style={styles.imageSection} />
                        ) : formData.image ? (
                            <View style={styles.imageSection}>
                                <Image
                                    source={{ uri: formData.image }}
                                    style={{
                                        width: 150,
                                        height: 150,
                                        borderRadius: theme.borderRadius.medium,
                                    }}
                                />
                                <TouchableOpacity onPress={handleRemoveImage} style={styles.removeImageButton}>
                                    <Ionicons name="trash-outline" size={20} color={theme.colors.error} />
                                    <Text style={styles.removeImageText}>Remove Image</Text>
                                </TouchableOpacity>
                            </View>
                        ) : (
                            <Text style={styles.helperText}>Type product name to auto-fetch an image or enter a URL above.</Text>
                        )}
                        <View style={styles.formGroup}>
                            <TextInput
                                style={styles.input}
                                value={formData.image}
                                onChangeText={(text) => handleImageChange(text)}
                                placeholder="Enter image URL (optional)"
                                placeholderTextColor={theme.colors.gray}
                            />
                            <Text style={styles.helperText}>Enter a manual URL above.</Text>
                            {errors.image && <Text style={styles.errorText}>{errors.image}</Text>}
                        </View>
                    </View>

                    {/* Submit Button */}
                    <TouchableOpacity style={styles.submitButton} onPress={handleAddProduct} disabled={loading}>
                        {loading ? <ActivityIndicator size="small" color={theme.colors.white} /> : <Text style={styles.submitButtonText}>Add Product</Text>}
                    </TouchableOpacity>
                </Card3D>
            </KeyboardAwareScrollView>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: theme.colors.background,
        paddingTop: Platform.OS === "android" ? 25 : 0,
    },
    scrollView: {
        flex: 1,
        paddingHorizontal: theme.spacing.md,
        paddingTop: theme.spacing.sm,
    },
    contentContainer: {
        paddingBottom: Platform.OS === "ios" ? 120 : 140,
    },
    formTitle: {
        fontSize: 20,
        fontWeight: "bold",
        color: theme.colors.dark,
        marginBottom: theme.spacing.md,
    },
    formGroup: {
        marginBottom: theme.spacing.md,
    },
    label: {
        fontSize: 16,
        fontWeight: "500",
        color: theme.colors.dark,
        marginBottom: theme.spacing.xs,
    },
    input: {
        backgroundColor: theme.colors.white,
        borderWidth: 1,
        borderColor: theme.colors.border,
        borderRadius: theme.borderRadius.medium,
        padding: theme.spacing.sm,
        fontSize: 16,
        color: theme.colors.dark,
    },
    textArea: {
        minHeight: 100,
        textAlignVertical: "top",
    },
    errorText: {
        color: theme.colors.error,
        fontSize: 14,
        marginTop: 4,
    },
    submitButton: {
        backgroundColor: theme.colors.primary,
        padding: theme.spacing.md,
        borderRadius: theme.borderRadius.medium,
        alignItems: "center",
        ...theme.shadow.small,
    },
    submitButtonText: {
        color: theme.colors.white,
        fontSize: 16,
        fontWeight: "bold",
    },

    removeImageButton: {
        flexDirection: "row",
        alignItems: "center",
        marginTop: theme.spacing.sm,
    },
    removeImageText: {
        color: theme.colors.error,
        fontSize: 14,
        marginLeft: theme.spacing.xs,
    },

    loadingContainer: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
    },
    loadingText: {
        marginTop: theme.spacing.md,
        fontSize: 16,
        fontWeight: "bold",
        color: theme.colors.dark,
    },
    imageSection: {
        alignItems: "center",
        marginVertical: theme.spacing.md,
    },
    placeholderContainer: {
        width: 150,
        height: 150,
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: theme.colors.lightGray,
        borderRadius: theme.borderRadius.medium,
        marginBottom: theme.spacing.sm,
    },
    placeholderText: {
        marginTop: theme.spacing.xs,
        fontSize: 14,
        color: theme.colors.gray,
    },
    helperText: {
        marginTop: theme.spacing.xs,
        fontSize: 12,
        color: theme.colors.gray,
        fontStyle: "italic",
    },
});

export default VendorAddProductScreen;

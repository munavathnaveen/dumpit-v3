import apiClient from "./apiClient";
import { Product } from "../types/product";

export interface ProductFormData {
    name: string;
    description: string;
    price?: number;
    discountPrice?: number;
    type?: string;
    category: string;
    units?: string;
    stock?: number;
    stockQuantity?: number;
    discount?: number;
    image?: string;
    tags?: string[];
    specs?: Record<string, string>;
    isAvailable?: boolean;
    isActive?: boolean;
}

type ProductsResponse = {
    success: boolean;
    count: number;
    pagination: {
        page: number;
        limit: number;
        total: number;
        pages: number;
    };
    data: Product[];
};

type SingleProductResponse = {
    success: boolean;
    data: Product;
};

export const getProducts = async (query: string = ""): Promise<ProductsResponse> => {
    const response = await apiClient.get(`/products${query ? `?${query}` : ""}`);
    return response.data;
};

export const getProduct = async (productId: string): Promise<SingleProductResponse> => {
    const response = await apiClient.get(`/products/${productId}`);
    return response.data;
};

export const getProductsByShop = async (shopId: string): Promise<ProductsResponse> => {
    const response = await apiClient.get(`/shops/${shopId}/products`);
    return response.data;
};

export const getProductsByCategory = async (category: string): Promise<ProductsResponse> => {
    const response = await apiClient.get(`/products?category=${category}`);
    return response.data;
};

export const getProductCategories = async (): Promise<{ success: boolean; count: number; data: string[] }> => {
    const response = await apiClient.get("/products/categories");
    return response.data;
};

export const searchProducts = async (searchTerm: string): Promise<ProductsResponse> => {
    // Use query parameter for better compatibility with backend search optimization
    const response = await apiClient.get(`/products?search=${encodeURIComponent(searchTerm)}`);
    return response.data;
};

// Enhanced client-side search that allows for fuzzy matching when backend search is too strict
export const enhancedSearchProducts = async (searchTerm: string, page = 1, limit = 10): Promise<ProductsResponse> => {
    try {
        // Check if we can use the backend search with pagination directly
        // This is more efficient than fetching all products for client-side filtering
        try {
            const backendSearchResponse = await apiClient.get(`/products?search=${encodeURIComponent(searchTerm)}&page=${page}&limit=${limit}`);
            return backendSearchResponse.data;
        } catch (error) {
            console.log("Backend search failed, falling back to client-side search:", error);
            // If the backend search fails, continue with client-side search
        }

        // Try to get all products (with a reasonable limit) to enable client-side fuzzy search
        // For infinite scroll, we need a larger batch to perform client-side pagination
        const response = await apiClient.get("/products?limit=100");
        const allProducts = response.data;

        // If no search term, just return all products with pagination
        if (!searchTerm || searchTerm.trim() === "") {
            return paginateProducts(allProducts.data, page, limit);
        }

        // Normalize the search term (lowercase for case-insensitive matching)
        const normalizedSearchTerm = searchTerm.toLowerCase().trim();

        // Filter products that match the search term in various fields
        const matchedProducts = allProducts.data.filter((product: any) => {
            // Check if any of the product fields contain the search term as a substring
            return (
                // Check product name
                (product.name && product.name.toLowerCase().includes(normalizedSearchTerm)) ||
                // Check product description
                (product.description && product.description.toLowerCase().includes(normalizedSearchTerm)) ||
                // Check product type
                (product.type && product.type.toLowerCase().includes(normalizedSearchTerm)) ||
                // Check product category
                (product.category && product.category.toLowerCase().includes(normalizedSearchTerm)) ||
                // Check shop name (if available)
                (product.shop && product.shop.name && product.shop.name.toLowerCase().includes(normalizedSearchTerm))
            );
        });

        return paginateProducts(matchedProducts, page, limit);
    } catch (error) {
        console.error("Enhanced search failed:", error);
        // Fallback to standard search if enhanced search fails
        return searchProducts(searchTerm);
    }
};

// Helper function to paginate products for client-side pagination
const paginateProducts = (products: any[], page: number, limit: number): ProductsResponse => {
    const totalProducts = products.length;
    const totalPages = Math.ceil(totalProducts / limit);
    const startIndex = (page - 1) * limit;
    const endIndex = Math.min(startIndex + limit, totalProducts);
    const paginatedProducts = products.slice(startIndex, endIndex);

    // Create pagination object
    const pagination = {
        page,
        limit,
        total: totalProducts,
        pages: totalPages,
    };

    // Return in the same format as the API response
    return {
        success: true,
        data: paginatedProducts,
        count: paginatedProducts.length,
        pagination,
    };
};

// Vendor-specific API functions

export const getVendorProducts = async (): Promise<Product[]> => {
    const response = await apiClient.get("/products/vendor");
    return response.data.data;
};

export const createProduct = async (productData: ProductFormData): Promise<SingleProductResponse> => {
    const response = await apiClient.post("/products", productData);
    console.log("ADD Product ", response, productData);
    return response.data;
};

export const updateProduct = async (productId: string, productData: Partial<ProductFormData>): Promise<SingleProductResponse> => {
    const response = await apiClient.put(`/products/${productId}`, productData);
    return response.data;
};

export const deleteProduct = async (productId: string): Promise<{ success: boolean }> => {
    const response = await apiClient.delete(`/products/${productId}`);
    return response.data;
};

export const uploadProductImage = async (
    productId: string,
    imageUrl: string
): Promise<{
    success: boolean;
    data: {
        image: string;
    };
}> => {
    const response = await apiClient.put(`/products/${productId}/image`, { image: imageUrl });
    return response.data;
};

export const getProductTypes = async (): Promise<{ success: boolean; count: number; data: string[] }> => {
    const response = await apiClient.get("/products/types");
    return response.data;
};

export const getShops = async (): Promise<{ success: boolean; count: number; data: { _id: string; name: string }[] }> => {
    const response = await apiClient.get("/shops?select=name");
    return response.data;
};

// Review related functions
export interface ProductReview {
    rating: number;
    text: string;
}

export const addProductReview = async (productId: string, reviewData: ProductReview): Promise<SingleProductResponse> => {
    const response = await apiClient.post(`/products/${productId}/reviews`, reviewData);
    return response.data;
};

// Add a new function to get products with distance calculations
export const getProductsWithDistance = async (location: { latitude: number; longitude: number }, query: string = ""): Promise<ProductsResponse> => {
    // Add the location coordinates to the query
    const locationQuery = `latitude=${location.latitude}&longitude=${location.longitude}`;
    const fullQuery = query ? `${query}&${locationQuery}` : locationQuery;

    const response = await apiClient.get(`/products?${fullQuery}`);
    return response.data;
};

// Add a function to get a single product with distance calculation
export const getProductWithDistance = async (productId: string, location: { latitude: number; longitude: number }): Promise<SingleProductResponse> => {
    const response = await apiClient.get(`/products/${productId}?latitude=${location.latitude}&longitude=${location.longitude}`);
    return response.data;
};

import { createSlice, createAsyncThunk, PayloadAction } from "@reduxjs/toolkit";
import * as cartApi from "../api/cartApi";

export interface CartProduct {
    _id: string;
    name: string;
    price: number;
    image: string;
    description: string;
    stock?: number;
}

export interface CartItem {
    _id?: string;
    product: CartProduct;
    quantity: number;
}

interface CartState {
    items: CartItem[];
    loading: boolean;
    currentRequest: string | null; // Track current operation type
    error: string | null;
    totalItems: number;
    totalAmount: number;
}

const initialState: CartState = {
    items: [],
    loading: false,
    currentRequest: null,
    error: null,
    totalItems: 0,
    totalAmount: 0,
};

// Calculate cart totals
const calculateCartTotals = (items: CartItem[]) => {
    const totalItems = items.reduce((sum, item) => sum + (item.quantity || 0), 0);

    const totalAmount = items.reduce((sum, item) => {
        if (!item.product || typeof item.product?.price !== "number") return sum;
        const price = item.product.price || 0;
        const quantity = item.quantity || 0;
        return sum + price * quantity;
    }, 0);

    return {
        totalItems,
        totalAmount: isNaN(totalAmount) ? 0 : totalAmount,
    };
};

// Async thunks
export const getCart = createAsyncThunk<CartItem[], void>("cart/getCart", async (_, { rejectWithValue }) => {
    try {
        console.log("API Call: getCart");
        const response = await cartApi.getCart();
        console.log("API Response (getCart):", response);
        return response.data;
    } catch (error: any) {
        console.error("API Error (getCart):", error);
        return rejectWithValue(error?.response?.data?.error || error?.message || "Failed to fetch cart");
    }
});

export const addToCart = createAsyncThunk<CartItem, { productId: string; quantity: number }>("cart/addToCart", async ({ productId, quantity }, { rejectWithValue }) => {
    try {
        console.log(`API Call: addToCart - productId: ${productId}, quantity: ${quantity}`);
        // Set a reasonable default quantity if not provided
        const safeQuantity = quantity || 1;

        const response = await cartApi.addToCart({
            productId,
            quantity: safeQuantity,
        });

        console.log("API Response (addToCart):", response);
        // Ensure we have a valid response
        if (!response.data) {
            throw new Error("Invalid response from server");
        }

        return response.data;
    } catch (error: any) {
        console.error("API Error (addToCart):", error);
        return rejectWithValue(error?.response?.data?.error || error?.message || "Failed to add item to cart");
    }
});

export const updateCartItem = createAsyncThunk<CartItem, { itemId: string; quantity: number }>("cart/updateCartItem", async ({ itemId, quantity }, { rejectWithValue }) => {
    try {
        console.log(`API Call: updateCartItem - itemId: ${itemId}, quantity: ${quantity}`);
        // Set a reasonable default quantity if not provided
        const safeQuantity = Math.max(1, quantity);

        const response = await cartApi.updateCartItem(itemId, safeQuantity);

        console.log("API Response (updateCartItem):", response);
        // Ensure we have a valid response
        if (!response.data) {
            throw new Error("Invalid response from server");
        }

        return response.data;
    } catch (error: any) {
        console.error("API Error (updateCartItem):", error);
        return rejectWithValue(error?.response?.data?.error || error?.message || "Failed to update cart item");
    }
});

export const removeFromCart = createAsyncThunk<string, string>("cart/removeFromCart", async (itemId, { rejectWithValue }) => {
    try {
        console.log(`API Call: removeFromCart - itemId: ${itemId}`);
        await cartApi.removeFromCart(itemId);
        console.log("API Response (removeFromCart): successful");
        // Return the itemId as the payload for the reducer to use
        return itemId;
    } catch (error: any) {
        console.error("API Error (removeFromCart):", error);
        return rejectWithValue(error?.response?.data?.error || error?.message || "Failed to remove item from cart");
    }
});

export const clearCart = createAsyncThunk<boolean, void>("cart/clearCart", async (_, { rejectWithValue }) => {
    try {
        console.log("API Call: clearCart");
        await cartApi.clearCart();
        console.log("API Response (clearCart): successful");
        return true;
    } catch (error: any) {
        console.error("API Error (clearCart):", error);
        return rejectWithValue(error?.response?.data?.error || error?.message || "Failed to clear cart");
    }
});

const cartSlice = createSlice({
    name: "cart",
    initialState,
    reducers: {
        clearCartState: (state) => {
            state.items = [];
            state.totalItems = 0;
            state.totalAmount = 0;
            state.error = null;
            state.loading = false;
            state.currentRequest = null;
        },
        clearCartError: (state) => {
            state.error = null;
        },
    },
    extraReducers: (builder) => {
        builder
            // Get Cart
            .addCase(getCart.pending, (state) => {
                state.loading = true;
                state.currentRequest = "getCart";
                state.error = null;
            })
            .addCase(getCart.fulfilled, (state, action) => {
                if (state.currentRequest === "getCart") {
                    state.loading = false;
                    state.currentRequest = null;
                }

                try {
                    // Ensure all items have required fields
                    const validItems = Array.isArray(action.payload) ? action.payload.filter((item) => item && item.product && typeof item.product === "object" && item.product._id) : [];

                    if (validItems.length < (action.payload?.length || 0)) {
                        console.warn(`Filtered out ${(action.payload?.length || 0) - validItems.length} invalid cart items`);
                    }

                    state.items = validItems;
                    const { totalItems, totalAmount } = calculateCartTotals(state.items);
                    state.totalItems = totalItems;
                    state.totalAmount = totalAmount;
                } catch (error) {
                    console.error("Error processing cart items:", error);
                    state.error = "Error processing cart data";
                }
            })
            .addCase(getCart.rejected, (state, action) => {
                if (state.currentRequest === "getCart") {
                    state.loading = false;
                    state.currentRequest = null;
                }
                state.error = action.payload as string;
                console.error("getCart rejected:", action.payload);
            })

            // Add to Cart
            .addCase(addToCart.pending, (state) => {
                state.loading = true;
                state.currentRequest = "addToCart";
                state.error = null;
            })
            .addCase(addToCart.fulfilled, (state, action) => {
                if (state.currentRequest === "addToCart") {
                    state.loading = false;
                    state.currentRequest = null;
                }

                // Debug response
                console.log("Processing addToCart response in reducer:", action.payload);

                try {
                    // Ensure we have a valid product in the response
                    if (!action.payload) {
                        console.error("Missing payload in addToCart response");
                        state.error = "Invalid product data received";
                        return;
                    }

                    if (!action.payload.product) {
                        console.error("Missing product in addToCart payload:", action.payload);
                        state.error = "Invalid product data received";
                        return;
                    }

                    if (!action.payload.product._id) {
                        console.error("Missing product._id in addToCart payload:", action.payload.product);
                        state.error = "Invalid product data received";
                        return;
                    }

                    // Find if the product already exists in the cart
                    const existingItemIndex = state.items.findIndex((item) => item.product && item.product._id === action.payload.product._id);

                    if (existingItemIndex >= 0) {
                        // Update the existing item with the new data from the server response
                        state.items[existingItemIndex] = action.payload;
                        console.log(`Updated existing cart item at index ${existingItemIndex}`);
                    } else {
                        // Add the new item to the cart
                        state.items.push(action.payload);
                        console.log("Added new item to cart");
                    }

                    // Recalculate cart totals
                    const { totalItems, totalAmount } = calculateCartTotals(state.items);
                    state.totalItems = totalItems;
                    state.totalAmount = totalAmount;
                    console.log(`Cart updated: ${totalItems} items, total amount: ${totalAmount}`);
                } catch (error) {
                    console.error("Error processing addToCart response:", error);
                    state.error = "Error processing cart update";
                }
            })
            .addCase(addToCart.rejected, (state, action) => {
                if (state.currentRequest === "addToCart") {
                    state.loading = false;
                    state.currentRequest = null;
                }
                state.error = action.payload as string;
            })

            // Update Cart Item
            .addCase(updateCartItem.pending, (state) => {
                state.loading = true;
                state.currentRequest = "updateCartItem";
                state.error = null;
            })
            .addCase(updateCartItem.fulfilled, (state, action) => {
                if (state.currentRequest === "updateCartItem") {
                    state.loading = false;
                    state.currentRequest = null;
                }

                // Debug response
                console.log("Processing updateCartItem response in reducer:", action.payload);

                try {
                    // Ensure we have a valid product in the response
                    if (!action.payload) {
                        console.error("Missing payload in updateCartItem response");
                        state.error = "Invalid product data received";
                        return;
                    }

                    if (!action.payload.product) {
                        console.error("Missing product in updateCartItem payload:", action.payload);
                        state.error = "Invalid product data received";
                        return;
                    }

                    if (!action.payload.product._id) {
                        console.error("Missing product._id in updateCartItem payload:", action.payload.product);
                        state.error = "Invalid product data received";
                        return;
                    }

                    // Find the item by product ID and update it
                    const itemIndex = state.items.findIndex((item) => item.product && item.product._id === action.payload.product._id);

                    if (itemIndex >= 0) {
                        // Update the item with the response data
                        state.items[itemIndex] = action.payload;
                        console.log(`Updated cart item at index ${itemIndex}`);
                    } else {
                        // If item not found (rare case), add it
                        console.log("Item not found in cart during update, adding it");
                        state.items.push(action.payload);
                    }

                    // Recalculate cart totals
                    const { totalItems, totalAmount } = calculateCartTotals(state.items);
                    state.totalItems = totalItems;
                    state.totalAmount = totalAmount;
                    console.log(`Cart updated: ${totalItems} items, total amount: ${totalAmount}`);
                } catch (error) {
                    console.error("Error processing updateCartItem response:", error);
                    state.error = "Error processing cart update";
                }
            })
            .addCase(updateCartItem.rejected, (state, action) => {
                if (state.currentRequest === "updateCartItem") {
                    state.loading = false;
                    state.currentRequest = null;
                }
                state.error = action.payload as string;
            })

            // Remove from Cart
            .addCase(removeFromCart.pending, (state) => {
                state.loading = true;
                state.currentRequest = "removeFromCart";
                state.error = null;
            })
            .addCase(removeFromCart.fulfilled, (state, action) => {
                if (state.currentRequest === "removeFromCart") {
                    state.loading = false;
                    state.currentRequest = null;
                }

                if (!action.payload) {
                    console.error("Invalid response from remove operation");
                    state.error = "Invalid response from remove operation";
                    return;
                }

                console.log(`Removing item with productId: ${action.payload}`);

                try {
                    // Create new array filtering out the removed item (safely handle potential undefined product._id)
                    state.items = state.items.filter((item) => {
                        if (!item.product || !item.product._id) {
                            console.warn("Found cart item with missing product._id during removal", item);
                            return true; // Keep items with missing IDs (they'll be handled elsewhere)
                        }
                        return item.product._id !== action.payload;
                    });

                    // Recalculate cart totals
                    const { totalItems, totalAmount } = calculateCartTotals(state.items);
                    state.totalItems = totalItems;
                    state.totalAmount = totalAmount;
                    console.log(`Cart updated after remove: ${totalItems} items, total amount: ${totalAmount}`);
                } catch (error) {
                    console.error("Error processing removeFromCart:", error);
                    state.error = "Error processing cart update";
                }
            })
            .addCase(removeFromCart.rejected, (state, action) => {
                if (state.currentRequest === "removeFromCart") {
                    state.loading = false;
                    state.currentRequest = null;
                }
                state.error = action.payload as string;
            })

            // Clear Cart
            .addCase(clearCart.pending, (state) => {
                state.loading = true;
                state.currentRequest = "clearCart";
                state.error = null;
            })
            .addCase(clearCart.fulfilled, (state) => {
                if (state.currentRequest === "clearCart") {
                    state.loading = false;
                    state.currentRequest = null;
                }
                state.items = [];
                state.totalItems = 0;
                state.totalAmount = 0;
            })
            .addCase(clearCart.rejected, (state, action) => {
                if (state.currentRequest === "clearCart") {
                    state.loading = false;
                    state.currentRequest = null;
                }
                state.error = action.payload as string;
            });
    },
});

export const { clearCartState, clearCartError } = cartSlice.actions;
export default cartSlice.reducer;

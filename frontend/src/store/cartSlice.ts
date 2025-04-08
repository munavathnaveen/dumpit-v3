import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import * as cartApi from '../api/cartApi';

export interface CartProduct {
  _id: string;
  name: string;
  price: number;
  images: string[];
  description: string;
  stock?: number;
}

export interface CartItem {
  _id: string;
  product: CartProduct;
  quantity: number;
}

interface CartState {
  items: CartItem[];
  loading: boolean;
  error: string | null;
  totalItems: number;
  totalAmount: number;
}

const initialState: CartState = {
  items: [],
  loading: false,
  error: null,
  totalItems: 0,
  totalAmount: 0,
};

// Calculate cart totals
const calculateCartTotals = (items: CartItem[]) => {
  const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);
  const totalAmount = items.reduce((sum, item) => {
    if (!item.product) return sum;
    return sum + (item.product.price * item.quantity);
  }, 0);
  return { totalItems, totalAmount };
};

// Async thunks
export const getCart = createAsyncThunk<CartItem[], void>(
  'cart/getCart',
  async (_, { rejectWithValue }) => {
    try {
      const response = await cartApi.getCart();
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.error || 'Failed to fetch cart');
    }
  }
);

export const addToCart = createAsyncThunk<CartItem, { productId: string; quantity: number }>(
  'cart/addToCart',
  async ({ productId, quantity }, { rejectWithValue }) => {
    try {
      const response = await cartApi.addToCart({ productId, quantity });
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.error || 'Failed to add item to cart');
    }
  }
);

export const updateCartItem = createAsyncThunk<CartItem, { itemId: string; quantity: number }>(
  'cart/updateCartItem',
  async ({ itemId, quantity }, { rejectWithValue }) => {
    try {
      const response = await cartApi.updateCartItem(itemId, quantity);
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.error || 'Failed to update cart item');
    }
  }
);

export const removeFromCart = createAsyncThunk<string, string>(
  'cart/removeFromCart',
  async (itemId, { rejectWithValue }) => {
    try {
      await cartApi.removeFromCart(itemId);
      return itemId;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.error || 'Failed to remove item from cart');
    }
  }
);

export const clearCart = createAsyncThunk<boolean, void>(
  'cart/clearCart',
  async (_, { rejectWithValue }) => {
    try {
      await cartApi.clearCart();
      return true;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.error || 'Failed to clear cart');
    }
  }
);

const cartSlice = createSlice({
  name: 'cart',
  initialState,
  reducers: {
    clearCartState: (state) => {
      state.items = [];
      state.totalItems = 0;
      state.totalAmount = 0;
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Get Cart
      .addCase(getCart.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(getCart.fulfilled, (state, action) => {
        state.loading = false;
        state.items = action.payload;
        const { totalItems, totalAmount } = calculateCartTotals(state.items);
        state.totalItems = totalItems;
        state.totalAmount = totalAmount;
      })
      .addCase(getCart.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })

      // Add to Cart
      .addCase(addToCart.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(addToCart.fulfilled, (state, action) => {
        state.loading = false;
        
        // Check if item already exists, if so update quantity
        const existingItemIndex = state.items.findIndex(
          item => item.product._id === action.payload.product._id
        );
        
        if (existingItemIndex !== -1) {
          // Update existing item
          state.items[existingItemIndex].quantity += action.payload.quantity;
        } else {
          // Add new item
          state.items.push(action.payload);
        }
        
        const { totalItems, totalAmount } = calculateCartTotals(state.items);
        state.totalItems = totalItems;
        state.totalAmount = totalAmount;
      })
      .addCase(addToCart.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })

      // Update Cart Item
      .addCase(updateCartItem.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updateCartItem.fulfilled, (state, action) => {
        state.loading = false;
        
        const index = state.items.findIndex(item => item._id === action.payload._id);
        if (index !== -1) {
          state.items[index] = action.payload;
        }
        
        const { totalItems, totalAmount } = calculateCartTotals(state.items);
        state.totalItems = totalItems;
        state.totalAmount = totalAmount;
      })
      .addCase(updateCartItem.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })

      // Remove from Cart
      .addCase(removeFromCart.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(removeFromCart.fulfilled, (state, action) => {
        state.loading = false;
        state.items = state.items.filter(item => item._id !== action.payload);
        
        const { totalItems, totalAmount } = calculateCartTotals(state.items);
        state.totalItems = totalItems;
        state.totalAmount = totalAmount;
      })
      .addCase(removeFromCart.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })

      // Clear Cart
      .addCase(clearCart.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(clearCart.fulfilled, (state) => {
        state.loading = false;
        state.items = [];
        state.totalItems = 0;
        state.totalAmount = 0;
      })
      .addCase(clearCart.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });
  },
});

export const { clearCartState } = cartSlice.actions;
export default cartSlice.reducer; 
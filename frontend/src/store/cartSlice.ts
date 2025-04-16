import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import * as cartApi from '../api/cartApi';

export interface CartProduct {
  _id: string;
  name: string;
  price: number;
  image: string;
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
  const totalItems = items.reduce((sum, item) => sum + (item.quantity || 0), 0);
  
  const totalAmount = items.reduce((sum, item) => {
    if (!item.product || typeof item.product.price !== 'number') return sum;
    const price = item.product.price || 0;
    const quantity = item.quantity || 0;
    return sum + (price * quantity);
  }, 0);
  
  return { 
    totalItems, 
    totalAmount: isNaN(totalAmount) ? 0 : totalAmount 
  };
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
        
        // Check if item already exists
        const existingItemIndex = state.items.findIndex(
          item => item.product._id === action.payload.product._id
        );
        
        if (existingItemIndex !== -1) {
          // Replace existing item with new one (set to exact quantity, not add to it)
          state.items[existingItemIndex] = action.payload;
        } else {
          // Add new item
          state.items.push(action.payload);
        }
        
        // Recalculate totals
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
        
        const index = state.items.findIndex(item => item.product._id === action.payload.product._id);
        if (index !== -1) {
          // Create a new array to ensure the state is properly updated
          state.items = state.items.map(item => 
            item.product._id === action.payload.product._id ? action.payload : item
          );
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
        // Create new array to trigger re-render, filtering by product ID
        state.items = state.items.filter(item => item.product._id !== action.payload);
        
        // Recalculate totals
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
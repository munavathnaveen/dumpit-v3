import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import * as productApi from '../api/productApi';
import { Product, ProductFilters } from '../types/product';

interface ProductState {
  products: Product[];
  product: Product | null;
  loading: boolean;
  error: string | null;
  totalCount: number;
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
  filters: ProductFilters;
}

const initialState: ProductState = {
  products: [],
  product: null,
  loading: false,
  error: null,
  totalCount: 0,
  pagination: {
    page: 1,
    limit: 10,
    total: 0,
    pages: 0,
  },
  filters: {},
};

export const getProducts = createAsyncThunk(
  'product/getProducts',
  async (filters: ProductFilters = {}, { rejectWithValue }) => {
    try {
      let queryString = '';
      if (Object.keys(filters).length > 0) {
        const params = new URLSearchParams();
        if (filters.category) params.append('category', filters.category);
        if (filters.minPrice) params.append('minPrice', filters.minPrice.toString());
        if (filters.maxPrice) params.append('maxPrice', filters.maxPrice.toString());
        if (filters.rating) params.append('rating', filters.rating.toString());
        if (filters.search) params.append('search', filters.search);
        if (filters.sort) params.append('sort', filters.sort);
        if (filters.page) params.append('page', filters.page.toString());
        if (filters.limit) params.append('limit', filters.limit.toString());
        queryString = params.toString();
      }
      const response = await productApi.getProducts(queryString);
      return response;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.error || 'Failed to fetch products');
    }
  }
);

export const getProduct = createAsyncThunk(
  'product/getProduct',
  async (productId: string, { rejectWithValue }) => {
    try {
      const response = await productApi.getProduct(productId);
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.error || 'Failed to fetch product');
    }
  }
);

export const getProductsByShop = createAsyncThunk(
  'product/getProductsByShop',
  async (shopId: string, { rejectWithValue }) => {
    try {
      const response = await productApi.getProductsByShop(shopId);
      return response;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.error || 'Failed to fetch shop products');
    }
  }
);

export const searchProducts = createAsyncThunk(
  'product/searchProducts',
  async (searchTerm: string, { rejectWithValue }) => {
    try {
      const response = await productApi.searchProducts(searchTerm);
      return response;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.error || 'Failed to search products');
    }
  }
);

const productSlice = createSlice({
  name: 'product',
  initialState,
  reducers: {
    setFilters: (state, action: PayloadAction<ProductFilters>) => {
      state.filters = action.payload;
    },
    clearFilters: (state) => {
      state.filters = {};
    },
    clearProductState: (state) => {
      state.product = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Get Products
      .addCase(getProducts.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(getProducts.fulfilled, (state, action) => {
        state.loading = false;
        state.products = action.payload.data;
        state.totalCount = action.payload.count;
        state.pagination = action.payload.pagination;
      })
      .addCase(getProducts.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      
      // Get Single Product
      .addCase(getProduct.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(getProduct.fulfilled, (state, action) => {
        state.loading = false;
        state.product = action.payload;
      })
      .addCase(getProduct.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      
      // Get Products By Shop
      .addCase(getProductsByShop.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(getProductsByShop.fulfilled, (state, action) => {
        state.loading = false;
        state.products = action.payload.data;
        state.totalCount = action.payload.count;
        state.pagination = action.payload.pagination;
      })
      .addCase(getProductsByShop.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      
      // Search Products
      .addCase(searchProducts.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(searchProducts.fulfilled, (state, action) => {
        state.loading = false;
        state.products = action.payload.data;
        state.totalCount = action.payload.count;
        state.pagination = action.payload.pagination;
      })
      .addCase(searchProducts.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });
  },
});

export const { setFilters, clearFilters, clearProductState } = productSlice.actions;
export default productSlice.reducer; 
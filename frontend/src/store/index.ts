import { configureStore } from '@reduxjs/toolkit';
import { useDispatch } from 'react-redux';
import authReducer from './authSlice';
import userReducer from './userSlice';
import productReducer from './productSlice';
import cartReducer from './cartSlice';

// Configure the Redux store
const store = configureStore({
  reducer: {
    auth: authReducer,
    user: userReducer,
    product: productReducer,
    cart: cartReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: false,
    }),
});

// Export store and hooks
export default store;

// Define RootState type to be used in selectors
export type RootState = ReturnType<typeof store.getState>;

// Define AppDispatch type to be used with dispatch
export type AppDispatch = typeof store.dispatch;
export const useAppDispatch = () => useDispatch<AppDispatch>(); 
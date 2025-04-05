import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import * as userApi from '../api/userApi';
import { Address, AddressRequest } from '../api/userApi';

// Types for the user slice
interface Notification {
  _id: string;
  message: string;
  read: boolean;
  createdAt: string;
}

interface NotificationSettings {
  email: boolean;
  push: boolean;
}

interface UserState {
  notifications: Notification[];
  notificationSettings: NotificationSettings;
  addresses: Address[];
  loading: boolean;
  error: string | null;
}

const initialState: UserState = {
  notifications: [],
  notificationSettings: {
    email: true,
    push: true,
  },
  addresses: [],
  loading: false,
  error: null,
};

// Async thunks for notifications
export const fetchNotifications = createAsyncThunk(
  'user/fetchNotifications',
  async (userId: string, { rejectWithValue }) => {
    try {
      const response = await userApi.getUserNotifications(userId);
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.error || 'Failed to fetch notifications');
    }
  }
);

export const markNotificationRead = createAsyncThunk(
  'user/markNotificationRead',
  async ({ userId, notificationId }: { userId: string; notificationId: string }, { rejectWithValue }) => {
    try {
      const response = await userApi.markNotificationAsRead(userId, notificationId);
      return { notificationId, data: response.data };
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.error || 'Failed to mark notification as read');
    }
  }
);

export const updateNotificationSettings = createAsyncThunk(
  'user/updateNotificationSettings',
  async (
    { userId, settings }: { userId: string; settings: { email?: boolean; push?: boolean } },
    { rejectWithValue }
  ) => {
    try {
      const response = await userApi.updateNotificationSettings(userId, settings);
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.error || 'Failed to update notification settings');
    }
  }
);

// Async thunks for addresses
export const fetchAddresses = createAsyncThunk('user/fetchAddresses', async (_, { rejectWithValue }) => {
  try {
    const response = await userApi.getUserAddresses();
    return response.data;
  } catch (error: any) {
    return rejectWithValue(error.response?.data?.error || 'Failed to fetch addresses');
  }
});

export const addAddress = createAsyncThunk(
  'user/addAddress',
  async (addressData: AddressRequest, { rejectWithValue }) => {
    try {
      console.log(addressData);
      const response = await userApi.createAddress(addressData);
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.error || 'Failed to add address');
    }
  }
);

export const updateAddress = createAsyncThunk(
  'user/updateAddress',
  async (
    { addressId, addressData }: { addressId: string; addressData: AddressRequest },
    { rejectWithValue }
  ) => {
    try {
      const response = await userApi.updateAddress(addressId, addressData);
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.error || 'Failed to update address');
    }
  }
);

export const removeAddress = createAsyncThunk(
  'user/removeAddress',
  async (addressId: string, { rejectWithValue }) => {
    try {
      await userApi.deleteAddress(addressId);
      return addressId;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.error || 'Failed to delete address');
    }
  }
);

// User slice
const userSlice = createSlice({
  name: 'user',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch notifications
      .addCase(fetchNotifications.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchNotifications.fulfilled, (state, action: PayloadAction<Notification[]>) => {
        state.loading = false;
        state.notifications = action.payload;
      })
      .addCase(fetchNotifications.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })

      // Mark notification as read
      .addCase(markNotificationRead.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(
        markNotificationRead.fulfilled,
        (state, action: PayloadAction<{ notificationId: string; data: Notification }>) => {
          state.loading = false;
          const index = state.notifications.findIndex(
            (notification) => notification._id === action.payload.notificationId
          );
          if (index !== -1) {
            state.notifications[index].read = true;
          }
        }
      )
      .addCase(markNotificationRead.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })

      // Update notification settings
      .addCase(updateNotificationSettings.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(
        updateNotificationSettings.fulfilled,
        (state, action: PayloadAction<NotificationSettings>) => {
          state.loading = false;
          state.notificationSettings = action.payload;
        }
      )
      .addCase(updateNotificationSettings.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })

      // Fetch addresses
      .addCase(fetchAddresses.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchAddresses.fulfilled, (state, action: PayloadAction<Address[]>) => {
        state.loading = false;
        state.addresses = action.payload;
      })
      .addCase(fetchAddresses.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })

      // Add address
      .addCase(addAddress.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(addAddress.fulfilled, (state, action: PayloadAction<Address>) => {
        state.loading = false;
        state.addresses.push(action.payload);
      })
      .addCase(addAddress.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })

      // Update address
      .addCase(updateAddress.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updateAddress.fulfilled, (state, action: PayloadAction<Address>) => {
        state.loading = false;
        const index = state.addresses.findIndex((address) => address._id === action.payload._id);
        if (index !== -1) {
          state.addresses[index] = action.payload;
        }
      })
      .addCase(updateAddress.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })

      // Remove address
      .addCase(removeAddress.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(removeAddress.fulfilled, (state, action: PayloadAction<string>) => {
        state.loading = false;
        state.addresses = state.addresses.filter((address) => address._id !== action.payload);
      })
      .addCase(removeAddress.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });
  },
});

// Export actions
export const { clearError } = userSlice.actions;

// Export reducer
export default userSlice.reducer; 
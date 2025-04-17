import apiClient from './apiClient';
import { CartItem } from '../store/cartSlice';

interface BackendResponse<T> {
  success: boolean;
  data: T;
  count?: number;
  error?: string;
}

export const getCart = async (): Promise<{ data: CartItem[] }> => {
  try {
    console.log('Making API request: GET /cart');
    const response = await apiClient.get<BackendResponse<CartItem[]>>('/cart');
    
    // Log the complete response for debugging
    console.log('GET /cart raw response:', JSON.stringify(response.data, null, 2));
    console.log('API response structure:', {
      success: response.data?.success,
      count: response.data?.count,
      hasData: !!response.data?.data,
      isArray: Array.isArray(response.data?.data),
      dataLength: Array.isArray(response.data?.data) ? response.data.data.length : 'Not an array'
    });
    
    // Ensure the response matches the expected format
    if (response.data && response.data.success && Array.isArray(response.data.data)) {
      // Filter out invalid items and log them
      const preFilterLength = response.data.data.length;
      const filteredData = response.data.data.filter(item => item && item.product);
      
      if (filteredData.length < preFilterLength) {
        console.warn(`Filtered out ${preFilterLength - filteredData.length} invalid items from cart response`);
      }
      
      // Additional validation for product fields
      const validatedData = filteredData.map(item => {
        // If product is missing required fields, log the issue
        if (!item.product._id) {
          console.warn('Cart item missing product._id:', item);
        }
        return item;
      });
      
      return { data: validatedData };
    }
    
    // Special handling for non-array responses that sometimes happen
    if (response.data && response.data.success && !Array.isArray(response.data.data) && typeof response.data.data === 'object') {
      console.warn('Backend returned object instead of array, converting to array');
      // It's an object, not an array - convert it to an array with proper type assertion
      const dataItem = response.data.data as unknown as CartItem;
      const dataArray = [dataItem];
      return { data: dataArray.filter(item => item && 'product' in item) };
    }
    
    // Handle unexpected response structure
    console.error('Unexpected cart data format:', response.data);
    return { data: [] };
  } catch (error) {
    console.error('Cart API error:', error);
    // Return empty array to avoid crashing the app
    return { data: [] };
  }
};

export const addToCart = async ({ productId, quantity }: { productId: string; quantity: number }): Promise<{ data: CartItem }> => {
  try {
    console.log(`Making API request: POST /cart/${productId} with quantity=${quantity}`);
    const response = await apiClient.post<BackendResponse<CartItem | CartItem[]>>(`/cart/${productId}`, { quantity });
    console.log('Add to cart response structure:', {
      success: response.data?.success,
      hasData: !!response.data?.data,
      isArray: Array.isArray(response.data?.data),
      dataLength: Array.isArray(response.data?.data) ? response.data.data.length : 'Not an array'
    });
    
    // Validate the response structure
    if (!response.data || !response.data.success || !response.data.data) {
      const errorMsg = response.data?.error || 'Invalid response from add to cart';
      console.error(errorMsg, response.data);
      throw new Error(errorMsg);
    }
    
    // Handle case where backend returns an array instead of a single item
    if (Array.isArray(response.data.data)) {
      console.log('Backend returned array instead of single item, extracting relevant item');
      // Find the item that matches the product ID we just added
      const relevantItem = response.data.data.find(item => 
        item.product && (item.product._id === productId || 
        (typeof item.product === 'string' && item.product === productId))
      );
      
      if (relevantItem) {
        return { data: relevantItem };
      } else if (response.data.data.length > 0) {
        // If we can't find the exact item, just use the first one
        console.log('Could not find exact item match, using first item from array');
        return { data: response.data.data[0] };
      }
      
      console.error('No valid items found in array response');
      throw new Error('No valid items found in response');
    }
    
    // If it's not an array, just return as is
    return { data: response.data.data };
  } catch (error) {
    console.error(`Error adding product ${productId} to cart:`, error);
    throw error;
  }
};

export const updateCartItem = async (itemId: string, quantity: number): Promise<{ data: CartItem }> => {
  try {
    console.log(`Making API request: PUT /cart/${itemId} with quantity=${quantity}`);
    const response = await apiClient.put<BackendResponse<CartItem | CartItem[]>>(`/cart/${itemId}`, { quantity });
    console.log('Update cart response structure:', {
      success: response.data?.success,
      hasData: !!response.data?.data,
      isArray: Array.isArray(response.data?.data),
      dataLength: Array.isArray(response.data?.data) ? response.data.data.length : 'Not an array'
    });
    
    // Validate the response structure
    if (!response.data || !response.data.success || !response.data.data) {
      const errorMsg = response.data?.error || 'Invalid response from update cart';
      console.error(errorMsg, response.data);
      throw new Error(errorMsg);
    }
    
    // Handle case where backend returns an array instead of a single item
    if (Array.isArray(response.data.data)) {
      console.log('Backend returned array instead of single item, extracting relevant item');
      // Find the item that matches the product ID we just updated
      const relevantItem = response.data.data.find(item => 
        item.product && (item.product._id === itemId || 
        (typeof item.product === 'string' && item.product === itemId))
      );
      
      if (relevantItem) {
        return { data: relevantItem };
      } else if (response.data.data.length > 0) {
        // If we can't find the exact item, just use the first one
        console.log('Could not find exact item match, using first item from array');
        return { data: response.data.data[0] };
      }
      
      console.error('No valid items found in array response');
      throw new Error('No valid items found in response');
    }
    
    // If it's not an array, just return as is
    return { data: response.data.data };
  } catch (error) {
    console.error(`Error updating cart item ${itemId}:`, error);
    throw error;
  }
};

export const removeFromCart = async (itemId: string): Promise<void> => {
  try {
    console.log(`Making API request: DELETE /cart/${itemId}`);
    const response = await apiClient.delete<BackendResponse<string>>(`/cart/${itemId}`);
    console.log('Remove from cart response:', {
      success: response.data?.success,
      data: response.data?.data
    });
    
    // Validate the response
    if (!response.data || !response.data.success) {
      const errorMsg = response.data?.error || 'Failed to remove item from cart';
      console.error(errorMsg, response.data);
      throw new Error(errorMsg);
    }
  } catch (error) {
    console.error(`Error removing item ${itemId} from cart:`, error);
    throw error;
  }
};

export const clearCart = async (): Promise<void> => {
  try {
    console.log('Making API request: DELETE /cart');
    const response = await apiClient.delete<BackendResponse<any>>('/cart');
    console.log('Clear cart response:', {
      success: response.data?.success
    });
    
    // Validate the response
    if (!response.data || !response.data.success) {
      const errorMsg = response.data?.error || 'Failed to clear cart';
      console.error(errorMsg, response.data);
      throw new Error(errorMsg);
    }
  } catch (error) {
    console.error('Error clearing cart:', error);
    throw error;
  }
}; 
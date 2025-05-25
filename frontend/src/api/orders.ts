import apiClient from "./apiClient";

// Order Item interface
export interface OrderItem {
    product: string;
    quantity: number;
    price: number;
    shop: string;
    name?: string;
    image?: string;
}

// Order interface
export interface Order {
    _id: string;
    orderNumber: string;
    user:
        | string
        | {
              _id: string;
              name: string;
              email: string;
              phone: string;
          };
    items: OrderItem[];
    shippingAddress:
        | string
        | {
              _id: string;
              name: string;
              street: string;
              city: string;
              state: string;
              country: string;
              pincode: string;
              phone: string;
          };
    paymentMethod: string;
    paymentStatus: string;
    paymentDetails?: {
        id: string;
        method: string;
        amount: number;
        status: string;
        createdAt: string;
    };
    status: string;
    totalAmount: number;
    discount?: number;
    couponCode?: string;
    notes?: string;
    createdAt: string;
    updatedAt: string;
}

// Order creation params
export interface CreateOrderParams {
    shippingAddress: string;
    paymentMethod: string;
    couponCode?: string;
    notes?: string;
}

// Payment processing params
export interface ProcessPaymentParams {
    orderId: string;
    amount: number;
    currency: string;
    name: string;
    email: string;
    phone: string;
}

/**
 * Create a new order
 * @param orderData Order creation data
 * @returns Promise with the created order
 */
export const createOrder = async (orderData: CreateOrderParams): Promise<{ success: boolean; data: Order }> => {
    try {
        const response = await apiClient.post(`/orders`, orderData);
        return response.data;
    } catch (error: any) {
        throw error.response?.data || { message: "Failed to create order" };
    }
};

/**
 * Get all orders for the authenticated user
 * @param page Optional page number for pagination
 * @param limit Optional limit of results per page
 * @returns Promise with the list of orders
 */
export const getOrders = async (
    page = 1,
    limit = 10
): Promise<{
    success: boolean;
    data: Order[];
    count: number;
    pagination: {
        next?: { page: number; limit: number };
        prev?: { page: number; limit: number };
    };
}> => {
    try {
        const response = await apiClient.get(`/orders?page=${page}&limit=${limit}`);
        return response.data;
    } catch (error: any) {
        throw error.response?.data || { message: "Failed to fetch orders" };
    }
};

/**
 * Get a single order by ID
 * @param id Order ID
 * @returns Promise with the order details
 */
export const getOrderById = async (id: string): Promise<{ success: boolean; data: Order }> => {
    try {
        const response = await apiClient.get(`/orders/${id}`);
        return response.data;
    } catch (error: any) {
        throw error.response?.data || { message: "Failed to fetch order details" };
    }
};

/**
 * Cancel an order
 * @param id Order ID
 * @param reason Optional reason for cancellation
 * @returns Promise with the updated order
 */
export const cancelOrder = async (id: string, reason?: string): Promise<{ success: boolean; data: Order }> => {
    try {
        const response = await apiClient.patch(`/orders/${id}/cancel`, { reason });
        return response.data;
    } catch (error: any) {
        throw error.response?.data || { message: "Failed to cancel order" };
    }
};

/**
 * Process payment for an order using Razorpay
 * @param paymentData Payment processing data
 * @returns Promise with the payment result
 */
export const processPayment = async (
    paymentData: ProcessPaymentParams
): Promise<{
    success: boolean;
    data?: any;
    message?: string;
}> => {
    try {
        const response = await apiClient.post(`/orders/${paymentData.orderId}/payment`, paymentData);
        return response.data;
    } catch (error: any) {
        return {
            success: false,
            message: error.response?.data?.message || "Failed to process payment",
        };
    }
};

/**
 * Verify a payment after completion
 * @param orderId Order ID
 * @param paymentId Payment ID from payment gateway
 * @param signature Signature for verification
 * @returns Promise with verification result
 */
export const verifyPayment = async (orderId: string, paymentId: string, signature: string): Promise<{ success: boolean; data?: Order; message?: string }> => {
    try {
        const response = await apiClient.post(`/orders/${orderId}/verify-payment`, {
            paymentId,
            signature,
        });
        return response.data;
    } catch (error: any) {
        return {
            success: false,
            message: error.response?.data?.message || "Payment verification failed",
        };
    }
};

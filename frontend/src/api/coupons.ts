import axios from "axios";
import { API_URL } from "../utils/constants";

// Coupon interface
export interface Coupon {
    _id: string;
    code: string;
    description: string;
    discountType: "percentage" | "fixed";
    discountValue: number;
    minOrderValue: number;
    maxDiscount?: number;
    startDate: string;
    endDate: string;
    isActive: boolean;
    usageLimit?: number;
    usageCount: number;
}

// Verify coupon response interface
export interface VerifyCouponResponse {
    success: boolean;
    message?: string;
    data?: {
        coupon: Coupon;
        discountAmount: number;
    };
}

/**
 * Verify if a coupon code is valid for the current cart total
 * @param code The coupon code to verify
 * @param cartTotal The current cart total amount
 * @returns Promise with verification result
 */
export const verifyCoupon = async (code: string, cartTotal: number): Promise<VerifyCouponResponse> => {
    try {
        const response = await axios.post(`${API_URL}/coupons/verify`, {
            code,
            cartTotal,
        });
        return response.data;
    } catch (error: any) {
        return {
            success: false,
            message: error.response?.data?.message || "Failed to verify coupon",
        };
    }
};

/**
 * Apply a coupon code to the cart
 * @param code The coupon code to apply
 * @param cartTotal The current cart total amount
 * @returns Promise with the application result
 */
export const applyCoupon = async (code: string, cartTotal: number): Promise<VerifyCouponResponse> => {
    try {
        const response = await axios.post(`${API_URL}/coupons/apply`, {
            code,
            cartTotal,
        });
        return response.data;
    } catch (error: any) {
        return {
            success: false,
            message: error.response?.data?.message || "Failed to apply coupon",
        };
    }
};

/**
 * Get all available coupons
 * @returns Promise with the list of available coupons
 */
export const getAvailableCoupons = async (): Promise<{ success: boolean; data: Coupon[]; count: number }> => {
    try {
        const response = await axios.get(`${API_URL}/coupons/available`);
        return response.data;
    } catch (error: any) {
        throw error.response?.data || { message: "Failed to fetch available coupons" };
    }
};

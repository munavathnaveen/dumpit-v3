import { z } from "zod";

// Login schema
export const loginSchema = z.object({
    email: z.string().email("Please enter a valid email"),
    password: z.string().min(6, "Password must be at least 6 characters"),
});

export type LoginFormData = z.infer<typeof loginSchema>;

// Register schema
export const registerSchema = z.object({
    name: z.string().min(2, "Name must be at least 2 characters").max(50, "Name cannot be more than 50 characters"),
    email: z.string().email("Please enter a valid email"),
    password: z.string().min(6, "Password must be at least 6 characters"),
    phone: z.string().regex(/^[0-9]{10}$/, "Phone number must be a valid 10-digit number"),
});

// Vendor register schema with shop details
export const vendorRegisterSchema = registerSchema.extend({
    shopName: z.string().min(2, "Shop name must be at least 2 characters").max(50, "Shop name cannot be more than 50 characters"),
    shopDescription: z.string().min(10, "Description must be at least 10 characters").max(500, "Description cannot be more than 500 characters"),
    shopAddress: z.object({
        village: z.string().min(2, "Village name is required"),
        street: z.string().min(2, "Street name is required"),
        district: z.string().min(2, "District name is required"),
        state: z.string().min(2, "State name is required"),
        pincode: z.string().regex(/^[0-9]{6}$/, "Please enter a valid 6-digit pincode"),
        phone: z.string().regex(/^[0-9]{10}$/, "Please enter a valid 10-digit phone number"),
    }),
});

export type RegisterFormData = z.infer<typeof registerSchema>;
export type VendorRegisterFormData = z.infer<typeof vendorRegisterSchema>;

// Forgot password schema
export const forgotPasswordSchema = z.object({
    email: z.string().email("Please enter a valid email"),
});

export type ForgotPasswordFormData = z.infer<typeof forgotPasswordSchema>;

// Reset password schema
export const resetPasswordSchema = z
    .object({
        password: z.string().min(6, "Password must be at least 6 characters"),
        confirmPassword: z.string().min(6, "Password must be at least 6 characters"),
    })
    .refine((data) => data.password === data.confirmPassword, {
        message: "Passwords don't match",
        path: ["confirmPassword"],
    });

export type ResetPasswordFormData = z.infer<typeof resetPasswordSchema>;

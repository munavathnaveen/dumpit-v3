const Joi = require("joi");
const config = require("../config");

// Order validation schema
const orderSchema = Joi.object({
    shippingAddress: Joi.string().required().messages({
        "string.empty": "Shipping address is required",
    }),

    paymentMethod: Joi.string().valid("razorpay", "cash_on_delivery").required().messages({
        "string.empty": "Payment method is required",
        "any.only": "Payment method must be either razorpay or cash_on_delivery",
    }),

    couponCode: Joi.string().allow("", null),

    notes: Joi.string().allow("", null),
});

// Update order status validation schema
const updateOrderStatusSchema = Joi.object({
    status: Joi.string()
        .valid(...Object.values(config.constants.orderStatus))
        .required()
        .messages({
            "string.empty": "Status is required",
            "any.only": "Invalid status value",
        }),
});

// Update payment validation schema (Razorpay)
const updatePaymentSchema = Joi.object({
    razorpayPaymentId: Joi.string().required().messages({
        "string.empty": "Razorpay payment ID is required",
    }),

    razorpaySignature: Joi.string().required().messages({
        "string.empty": "Razorpay signature is required",
    }),
});

module.exports = {
    orderSchema,
    updateOrderStatusSchema,
    updatePaymentSchema,
};

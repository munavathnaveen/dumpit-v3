const mongoose = require("mongoose");
const config = require("../config");

const OrderSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
    },
    items: [
        {
            product: {
                type: mongoose.Schema.Types.ObjectId,
                ref: "Product",
                required: true,
            },
            quantity: {
                type: Number,
                required: true,
                min: [1, "Quantity must be at least 1"],
            },
            price: {
                type: Number,
                required: true,
            },
            shop: {
                type: mongoose.Schema.Types.ObjectId,
                ref: "Shop",
                required: true,
            },
        },
    ],
    shippingAddress: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Address",
        required: true,
    },
    totalPrice: {
        type: Number,
        required: true,
        min: [0, "Total price must be at least 0"],
    },
    status: {
        type: String,
        enum: [config.constants.orderStatus.PENDING, config.constants.orderStatus.PROCESSING, config.constants.orderStatus.COMPLETED, config.constants.orderStatus.CANCELLED],
        default: config.constants.orderStatus.PENDING,
    },
    payment: {
        method: {
            type: String,
            enum: ["razorpay", "cash_on_delivery"],
            required: true,
        },
        razorpayOrderId: String,
        razorpayPaymentId: String,
        status: {
            type: String,
            enum: [config.constants.paymentStatus.PENDING, config.constants.paymentStatus.COMPLETED, config.constants.paymentStatus.FAILED],
            default: config.constants.paymentStatus.PENDING,
        },
    },
    couponApplied: {
        type: String,
        default: null,
    },
    discountAmount: {
        type: Number,
        default: 0,
    },
    // Delivery and tracking information
    tracking: {
        currentLocation: {
            type: {
                type: String,
                enum: ["Point"],
                default: "Point",
            },
            coordinates: {
                type: [Number],
                default: [0, 0],
            },
        },
        status: {
            type: String,
            enum: ["preparing", "ready_for_pickup", "in_transit", "delivered"],
            default: "preparing",
        },
        eta: {
            type: Date,
        },
        distance: {
            type: Number,
            default: 0,
        },
        route: {
            type: String,
        },
        lastUpdated: {
            type: Date,
            default: Date.now,
        },
    },
    notes: {
        type: String,
    },
    createdAt: {
        type: Date,
        default: Date.now,
    },
    updatedAt: {
        type: Date,
        default: Date.now,
    },
});

// Update the updatedAt timestamp before save
OrderSchema.pre("save", function (next) {
    this.updatedAt = Date.now();
    next();
});

// Add indexes to improve query performance
OrderSchema.index({ user: 1 });
OrderSchema.index({ createdAt: -1 }); // For sorting by date, newest first
OrderSchema.index({ status: 1 }); // For filtering by status
OrderSchema.index({ "items.shop": 1 }); // For filtering by shop
OrderSchema.index({ "items.product": 1 }); // For filtering by product
OrderSchema.index({ "payment.status": 1 }); // For filtering by payment status
OrderSchema.index({ "payment.method": 1 }); // For filtering by payment method
OrderSchema.index({ totalPrice: 1 }); // For filtering/sorting by price
OrderSchema.index({ "tracking.currentLocation": "2dsphere" });

module.exports = mongoose.model("Order", OrderSchema);

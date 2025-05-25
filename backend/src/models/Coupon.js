const mongoose = require("mongoose");

const CouponSchema = new mongoose.Schema({
    code: {
        type: String,
        required: [true, "Please add a coupon code"],
        unique: true,
        trim: true,
        uppercase: true,
    },
    description: {
        type: String,
        required: [true, "Please add a description"],
    },
    discountType: {
        type: String,
        enum: ["percentage", "fixed"],
        required: [true, "Please specify the discount type"],
    },
    discountValue: {
        type: Number,
        required: [true, "Please add a discount value"],
        min: [0, "Discount value must be at least 0"],
    },
    minOrderValue: {
        type: Number,
        default: 0,
    },
    maxDiscountAmount: {
        type: Number,
        default: null,
    },
    validFrom: {
        type: Date,
        required: [true, "Please specify the validity start date"],
    },
    validUntil: {
        type: Date,
        required: [true, "Please specify the validity end date"],
    },
    usageLimit: {
        type: Number,
        default: null,
    },
    usedCount: {
        type: Number,
        default: 0,
    },
    isActive: {
        type: Boolean,
        default: true,
    },
    createdAt: {
        type: Date,
        default: Date.now,
    },
});

// Validate coupon is active and valid
CouponSchema.methods.isValid = function () {
    const now = new Date();
    return this.isActive && now >= this.validFrom && now <= this.validUntil && (this.usageLimit === null || this.usedCount < this.usageLimit);
};

// Calculate discount amount for an order
CouponSchema.methods.calculateDiscount = function (orderTotal) {
    // Check if order meets minimum value
    if (orderTotal < this.minOrderValue) {
        return 0;
    }

    let discount;

    if (this.discountType === "percentage") {
        discount = orderTotal * (this.discountValue / 100);

        // Apply max discount cap if exists
        if (this.maxDiscountAmount && discount > this.maxDiscountAmount) {
            discount = this.maxDiscountAmount;
        }
    } else {
        // Fixed discount
        discount = this.discountValue;
    }

    return discount;
};

module.exports = mongoose.model("Coupon", CouponSchema);

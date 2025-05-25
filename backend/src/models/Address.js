const mongoose = require("mongoose");

const AddressSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
    },
    name: {
        type: String,
        required: [true, "Please provide a name for this address"],
        trim: true,
    },
    village: {
        type: String,
        required: [true, "Please provide a village name"],
        trim: true,
    },
    street: {
        type: String,
        required: [true, "Please provide a street name"],
        trim: true,
    },
    district: {
        type: String,
        required: [true, "Please provide a district name"],
        trim: true,
    },
    state: {
        type: String,
        required: [true, "Please provide a state name"],
        trim: true,
    },
    pincode: {
        type: String,
        required: [true, "Please provide a pincode"],
        match: [/^[0-9]{6}$/, "Please enter a valid 6-digit pincode"],
    },
    phone: {
        type: String,
        required: [true, "Please provide a phone number"],
        match: [/^[0-9]{10}$/, "Please add a valid phone number"],
    },
    isDefault: {
        type: Boolean,
        default: false,
    },
    location: {
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
    createdAt: {
        type: Date,
        default: Date.now,
    },
});

// Index location
AddressSchema.index({ location: "2dsphere" });

module.exports = mongoose.model("Address", AddressSchema);

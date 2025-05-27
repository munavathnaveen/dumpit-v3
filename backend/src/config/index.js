const dotenv = require("dotenv");

dotenv.config();

module.exports = {
    // Server settings
    port: process.env.PORT || 5000,
    nodeEnv: process.env.NODE_ENV || "development",
    host: process.env.HOST || "0.0.0.0",
    // MongoDB settings
    mongoUri: process.env.MONGO_URI || "mongodb://localhost:27017/dumpit",

    // JWT settings
    jwt: {
        secret: process.env.JWT_SECRET || "dumpit_secret_key",
        expire: process.env.JWT_EXPIRE || "30d",
    },

    // Cloudinary settings
    cloudinary: {
        cloudName: process.env.CLOUDINARY_CLOUD_NAME,
        apiKey: process.env.CLOUDINARY_API_KEY,
        apiSecret: process.env.CLOUDINARY_API_SECRET,
    },

    // Email settings
    email: {
        service: process.env.EMAIL_SERVICE || "gmail",
        username: process.env.EMAIL_USERNAME,
        password: process.env.EMAIL_PASSWORD,
        from: process.env.EMAIL_FROM || "noreply@dumpit.com",
    },

    // Razorpay settings
    razorpay: {
        keyId: process.env.RAZORPAY_KEY_ID,
        keySecret: process.env.RAZORPAY_KEY_SECRET,
    },

    // App constants
    constants: {
        userRoles: {
            VENDOR: "vendor",
            CUSTOMER: "customer",
        },
        orderStatus: {
            PENDING: "pending",
            PROCESSING: "processing",
            COMPLETED: "completed",
            CANCELLED: "cancelled",
        },
        paymentStatus: {
            PENDING: "pending",
            COMPLETED: "completed",
            FAILED: "failed",
        },
    },
};

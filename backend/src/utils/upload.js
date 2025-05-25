// This file has been simplified to remove image upload functionality

const ErrorResponse = require("./errorResponse");

// Create dummy functions to maintain compatibility
const upload = {
    single: () => (req, res, next) => next(),
    array: () => (req, res, next) => next(),
};

// Function for compatibility - no actual upload happens
const uploadToCloudinary = async (file, folder) => {
    return {
        public_id: "no_upload",
        url: file?.path || "",
    };
};

// Function for compatibility - no actual deletion happens
const deleteFromCloudinary = async (publicId) => {
    return { result: "ok" };
};

module.exports = {
    upload,
    uploadToCloudinary,
    deleteFromCloudinary,
};

const Product = require("../models/Product");
const Shop = require("../models/Shop");
const ErrorResponse = require("../utils/errorResponse");
const { upload, uploadToCloudinary, deleteFromCloudinary } = require("../utils/upload");
const config = require("../config");
const cloudinary = require("cloudinary");

// @desc    Get all products
// @route   GET /api/v1/products
// @route   GET /api/v1/shops/:shopId/products
// @access  Public
exports.getProducts = async (req, res, next) => {
    try {
        // Copy req.query
        const reqQuery = { ...req.query };

        // Handle search query (improved search capability)
        let searchQuery = {};
        if (req.query.search) {
            const searchTerm = req.query.search;
            searchQuery = {
                $or: [
                    { name: { $regex: searchTerm, $options: "i" } },
                    { description: { $regex: searchTerm, $options: "i" } },
                    { category: { $regex: searchTerm, $options: "i" } },
                    { type: { $regex: searchTerm, $options: "i" } },
                ],
            };
            delete reqQuery.search;
        }

        // Fields to exclude
        const removeFields = ["select", "sort", "page", "limit", "search"];

        // Loop over removeFields and delete them from reqQuery
        removeFields.forEach((param) => delete reqQuery[param]);

        // Create query string
        let queryStr = JSON.stringify(reqQuery);

        // Create operators ($gt, $gte, etc)
        queryStr = queryStr.replace(/\b(gt|gte|lt|lte|in)\b/g, (match) => `$${match}`);

        let query;

        // If shopId is provided, get products for that shop
        if (req.params.shopId) {
            query = Product.find({
                shop: req.params.shopId,
                ...JSON.parse(queryStr),
                ...(Object.keys(searchQuery).length > 0 ? searchQuery : {}),
            });
        } else {
            // Otherwise, get all products
            query = Product.find({
                ...JSON.parse(queryStr),
                ...(Object.keys(searchQuery).length > 0 ? searchQuery : {}),
            });
        }

        // Select fields
        if (req.query.select) {
            const fields = req.query.select.split(",").join(" ");
            query = query.select(fields);
        }

        // Sort
        if (req.query.sort) {
            const sortBy = req.query.sort.split(",").join(" ");
            query = query.sort(sortBy);
        } else {
            query = query.sort("-createdAt");
        }

        // Count documents for pagination before applying skip/limit
        // Use the same filter criteria as the main query
        let countQuery;
        if (req.params.shopId) {
            countQuery = Product.countDocuments({
                shop: req.params.shopId,
                ...JSON.parse(queryStr),
                ...(Object.keys(searchQuery).length > 0 ? searchQuery : {}),
            });
        } else {
            countQuery = Product.countDocuments({
                ...JSON.parse(queryStr),
                ...(Object.keys(searchQuery).length > 0 ? searchQuery : {}),
            });
        }

        // Pagination with better defaults
        const page = parseInt(req.query.page, 10) || 1;
        const limit = parseInt(req.query.limit, 10) || 10;
        const startIndex = (page - 1) * limit;
        const endIndex = page * limit;
        const total = await countQuery;

        // Apply pagination to query
        query = query.skip(startIndex).limit(limit);

        // Populate with related data
        query = query.populate([
            { path: "vendor", select: "name email" },
            { path: "shop", select: "name description image location rating categories" },
        ]);

        // Executing query
        const products = await query;

        // Pagination result with more information
        const pagination = {
            page,
            limit,
            total,
            pages: Math.ceil(total / limit),
        };

        if (endIndex < total) {
            pagination.next = {
                page: page + 1,
                limit,
            };
        }

        if (startIndex > 0) {
            pagination.prev = {
                page: page - 1,
                limit,
            };
        }

        res.status(200).json({ success: true, count: products.length, pagination, data: products });
    } catch (err) {
        next(err);
    }
};

// @desc    Get single product
// @route   GET /api/v1/products/:id
// @access  Public
exports.getProduct = async (req, res, next) => {
    try {
        const product = await Product.findById(req.params.id).populate([{ path: "vendor" }, { path: "shop" }, { path: "reviews.user" }]);

        if (!product) {
            return next(new ErrorResponse(`Product not found with id of ${req.params.id}`, 404));
        }

        res.status(200).json({ success: true, data: product });
    } catch (err) {
        next(err);
    }
};

// @desc    Create new product
// @route   POST /api/v1/shops/:shopId/products
// @access  Private (Vendor only)
exports.createProduct = async (req, res, next) => {
    try {
        // Make sure user is a vendor
        if (req.user.role !== config.constants.userRoles.VENDOR) {
            return next(new ErrorResponse(`User role ${req.user.role} is not authorized to create a product`, 403));
        }

        // Add vendor and shop to req.body
        req.body.vendor = req.user.id;
        req.body.shop = req.user.shop_id;
        console.log(req.user);
        // Check if shop exists
        const shop = await Shop.findById(req.user.shop_id);

        if (!shop) {
            return next(new ErrorResponse(`Shop not found with id of ${req.params.shop_id}`, 404));
        }

        if (shop.owner.toString() !== req.user.id) {
            return next(new ErrorResponse(`User ${req.user.id} is not authorized to add a product to this shop`, 401));
        }
        if (!req.body.image) {
            return next(new ErrorResponse("Image Not Found"));
        }
        const product = await Product.create(req.body);

        res.status(201).json({ success: true, data: product });
    } catch (err) {
        next(err);
    }
};

// @desc    Update product
// @route   PUT /api/v1/products/:id
// @access  Private (Vendor only)
exports.updateProduct = async (req, res, next) => {
    try {
        let product = await Product.findById(req.params.id);

        if (!product) {
            return next(new ErrorResponse(`Product not found with id of ${req.params.id}`, 404));
        }

        // Make sure user is product vendor
        if (product.vendor.toString() !== req.user.id) {
            return next(new ErrorResponse(`User ${req.user.id} is not authorized to update this product`, 401));
        }

        product = await Product.findByIdAndUpdate(req.params.id, req.body, {
            new: true,
            runValidators: true,
        });

        res.status(200).json({ success: true, data: product });
    } catch (err) {
        next(err);
    }
};

// @desc    Delete product
// @route   DELETE /api/v1/products/:id
// @access  Private (Vendor only)
exports.deleteProduct = async (req, res, next) => {
    try {
        const product = await Product.findById(req.params.id);

        if (!product) {
            return next(new ErrorResponse(`Product not found with id of ${req.params.id}`, 404));
        }

        // Make sure user is product vendor
        if (product.vendor.toString() !== req.user.id) {
            return next(new ErrorResponse(`User ${req.user.id} is not authorized to delete this product`, 401));
        }

        await product.deleteOne();

        res.status(200).json({ success: true, data: {} });
    } catch (err) {
        next(err);
    }
};

// @desc    Upload product images
// @route   PUT /api/v1/products/:id/images
// @access  Private (Vendor only)
exports.uploadProductImage = async (req, res, next) => {
    try {
        // Find product by ID
        const product = await Product.findById(req.params.id);

        // Check if product exists
        if (!product) {
            return next(new ErrorResponse(`Product not found with id of ${req.params.id}`, 404));
        }

        // Check if user is product owner
        if (product.vendor.toString() !== req.user.id) {
            return next(new ErrorResponse(`User ${req.user.id} is not authorized to update this product`, 401));
        }

        // Check if req.body contains an image URL or base64 data
        if (!req.body.image) {
            return next(new ErrorResponse("Please provide an image URL or base64 data", 400));
        }

        // Update product image
        product.image = req.body.image;
        await product.save();

        res.status(200).json({ success: true, data: { image: product.image } });
    } catch (err) {
        console.error(err);
        return next(new ErrorResponse("Error updating product image", 500));
    }
};

// @desc    Add product review
// @route   POST /api/v1/products/:id/reviews
// @access  Private
exports.addProductReview = async (req, res, next) => {
    try {
        const product = await Product.findById(req.params.id);

        if (!product) {
            return next(new ErrorResponse(`Product not found with id of ${req.params.id}`, 404));
        }

        // Make sure user is not reviewing their own product
        if (product.vendor.toString() === req.user.id) {
            return next(new ErrorResponse(`You cannot review your own product`, 400));
        }

        // Check if user already submitted a review
        const alreadyReviewed = product.reviews.find((review) => review.user.toString() === req.user.id);

        if (alreadyReviewed) {
            return next(new ErrorResponse(`You have already reviewed this product`, 400));
        }

        const review = {
            user: req.user.id,
            rating: req.body.rating,
            text: req.body.text,
        };

        product.reviews.push(review);
        await product.updateRating();

        res.status(201).json({ success: true, data: product });
    } catch (err) {
        next(err);
    }
};

// @desc    Search products
// @route   GET /api/v1/products/search/:query
// @access  Public
exports.searchProducts = async (req, res, next) => {
    try {
        const { query } = req.params;

        // Use regex for pattern matching instead of exact text search
        const products = await Product.find({
            $or: [
                { name: { $regex: query, $options: "i" } },
                { description: { $regex: query, $options: "i" } },
                { category: { $regex: query, $options: "i" } },
                { type: { $regex: query, $options: "i" } },
            ],
        }).populate([
            { path: "vendor", select: "name" },
            { path: "shop", select: "name location address" },
        ]);

        res.status(200).json({ success: true, count: products.length, data: products });
    } catch (err) {
        next(err);
    }
};

// @desc    Get products for logged in vendor
// @route   GET /api/v1/products/vendor
// @access  Private (Vendor only)
exports.getVendorProducts = async (req, res, next) => {
    try {
        // Get products for the logged in vendor
        const products = await Product.find({ vendor: req.user.id })
            .populate([{ path: "shop", select: "name location address" }])
            .sort("-createdAt");

        res.status(200).json({ success: true, count: products.length, data: products });
    } catch (err) {
        next(err);
    }
};

// @desc    Get all product categories
// @route   GET /api/v1/products/categories
// @access  Public
exports.getProductCategories = async (req, res, next) => {
    try {
        // Find all distinct category values in Product collection
        const categories = await Product.distinct("category");

        res.status(200).json({ success: true, count: categories.length, data: categories.sort() });
    } catch (err) {
        next(err);
    }
};

// @desc    Get all product types
// @route   GET /api/v1/products/types
// @access  Public
exports.getProductTypes = async (req, res, next) => {
    try {
        // Find all distinct type values in Product collection
        const types = await Product.distinct("type");

        res.status(200).json({ success: true, count: types.length, data: types.sort() });
    } catch (err) {
        next(err);
    }
};

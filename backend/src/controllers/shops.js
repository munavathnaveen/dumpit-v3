const Shop = require("../models/Shop");
const User = require("../models/User");
const ErrorResponse = require("../utils/errorResponse");
const { upload, uploadToCloudinary, deleteFromCloudinary } = require("../utils/upload");
const config = require("../config");
const cloudinary = require("cloudinary");

// @desc    Get all shops
// @route   GET /api/v1/shops
// @access  Public
exports.getShops = async (req, res, next) => {
    try {
        // Copy req.query
        const reqQuery = { ...req.query };

        // Handle search query
        let searchQuery = {};
        if (req.query.search) {
            const searchTerm = req.query.search;
            searchQuery = {
                $or: [
                    { name: { $regex: searchTerm, $options: "i" } },
                    { description: { $regex: searchTerm, $options: "i" } },
                    { "address.village": { $regex: searchTerm, $options: "i" } },
                    { "address.district": { $regex: searchTerm, $options: "i" } },
                    { categories: { $regex: searchTerm, $options: "i" } },
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

        // Finding resource with combined filters
        let query = Shop.find({
            ...JSON.parse(queryStr),
            ...(Object.keys(searchQuery).length > 0 ? searchQuery : {}),
        }).populate("owner", "name email phone");

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
        const countQuery = Shop.countDocuments({
            ...JSON.parse(queryStr),
            ...(Object.keys(searchQuery).length > 0 ? searchQuery : {}),
        });

        // Pagination with better defaults
        const page = parseInt(req.query.page, 10) || 1;
        const limit = parseInt(req.query.limit, 10) || 10;
        const startIndex = (page - 1) * limit;
        const endIndex = page * limit;
        const total = await countQuery;

        // Apply pagination to query
        query = query.skip(startIndex).limit(limit);

        // Executing query
        const shops = await query;

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

        res.status(200).json({ success: true, count: shops.length, pagination, data: shops });
    } catch (err) {
        next(err);
    }
};

// @desc    Get single shop
// @route   GET /api/v1/shops/:id
// @access  Public
exports.getShop = async (req, res, next) => {
    try {
        let shop;

        // If user is authenticated and has a shop_id, they might be requesting their own shop
        if (req.user && req.user.shop_id && !req.params.id) {
            shop = await Shop.findById(req.user.shop_id).populate("reviews.user", "name email");
        } else {
            // For public access, use the shop ID from params
            shop = await Shop.findById(req.params.id).populate("reviews.user", "name email");
        }

        if (!shop) {
            return next(new ErrorResponse(`Shop not found with id of ${req.params.id}`, 404));
        }

        res.status(200).json({ success: true, data: shop });
    } catch (err) {
        next(err);
    }
};

// @desc    Create new shop
// @route   POST /api/v1/shops
// @access  Private (Vendor only)
exports.createShop = async (req, res, next) => {
    try {
        // Make sure user is a vendor
        if (req.user.role !== config.constants.userRoles.VENDOR) {
            return next(new ErrorResponse(`User role ${req.user.role} is not authorized to create a shop`, 403));
        }

        // Add owner to req.body
        req.body.owner = req.user.id;

        // Check for existing shop
        const existingShop = await Shop.findOne({ owner: req.user.id });

        // If the user is not an admin, they can only add one shop
        if (existingShop) {
            return next(new ErrorResponse(`The vendor with ID ${req.user.id} already has a shop`, 400));
        }

        // If location coordinates are not provided, attempt to geocode the address
        if (!req.body.location || !req.body.location.coordinates || (req.body.location.coordinates[0] === 0 && req.body.location.coordinates[1] === 0)) {
            // Make sure we have a complete address
            if (!req.body.address || !req.body.address.street || !req.body.address.village || !req.body.address.district || !req.body.address.state || !req.body.address.pincode) {
                return next(new ErrorResponse("Please provide a complete address for geocoding", 400));
            }

            try {
                // Format the address for geocoding
                const formattedAddress = `${req.body.address.street}, ${req.body.address.village}, ${req.body.address.district}, ${req.body.address.state}, ${req.body.address.pincode}`;

                // Make request to Google Maps Geocoding API
                const axios = require("axios");
                const geocodeUrl = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(formattedAddress)}&key=${process.env.GOOGLE_MAPS_API_KEY}`;

                const response = await axios.get(geocodeUrl);

                if (response.data.status === "OK") {
                    const location = response.data.results[0].geometry.location;

                    // Set the location in the request body
                    req.body.location = {
                        type: "Point",
                        coordinates: [location.lng, location.lat],
                    };
                } else {
                    console.log("Geocoding failed, using default coordinates");
                    // If geocoding fails, use default location structure
                    req.body.location = {
                        type: "Point",
                        coordinates: [0, 0],
                    };
                }
            } catch (error) {
                console.error("Error geocoding address:", error);
                // If there's an error, use default location structure
                req.body.location = {
                    type: "Point",
                    coordinates: [0, 0],
                };
            }
        }

        const shop = await Shop.create(req.body);

        // Update user with shop_id reference
        await User.findByIdAndUpdate(req.user.id, { shop_id: shop._id });
        console.log(User.findById(req.user.id));
        res.status(201).json({ success: true, data: shop });
    } catch (err) {
        next(err);
    }
};

// @desc    Update shop
// @route   PUT /api/v1/shops/:id
// @access  Private (Owner only)
exports.updateShop = async (req, res, next) => {
    try {
        let shop = await Shop.findById(req.params.id);

        if (!shop) {
            return next(new ErrorResponse(`Shop not found with id of ${req.params.id}`, 404));
        }

        // Make sure user is shop owner
        if (shop.owner.toString() !== req.user.id && req.user.role !== "admin") {
            return next(new ErrorResponse(`User ${req.user.id} is not authorized to update this shop`, 401));
        }

        shop = await Shop.findByIdAndUpdate(req.params.id, req.body, {
            new: true,
            runValidators: true,
        });

        res.status(200).json({ success: true, data: shop });
    } catch (err) {
        next(err);
    }
};

// @desc    Delete shop
// @route   DELETE /api/v1/shops/:id
// @access  Private (Owner only)
exports.deleteShop = async (req, res, next) => {
    try {
        const shop = await Shop.findById(req.params.id);

        if (!shop) {
            return next(new ErrorResponse(`Shop not found with id of ${req.params.id}`, 404));
        }

        // Make sure user is shop owner
        if (shop.owner.toString() !== req.user.id && req.user.role !== "admin") {
            return next(new ErrorResponse(`User ${req.user.id} is not authorized to delete this shop`, 401));
        }

        await shop.remove();

        res.status(200).json({ success: true, data: {} });
    } catch (err) {
        next(err);
    }
};

// @desc    Upload shop images
// @route   PUT /api/v1/shops/:id/images
// @access  Private (Shop owner only)
exports.uploadShopImage = async (req, res, next) => {
    try {
        // Find shop by ID
        const shop = await Shop.findById(req.params.id);

        // Check if shop exists
        if (!shop) {
            return next(new ErrorResponse(`Shop not found with id of ${req.params.id}`, 404));
        }

        // Check if user is shop owner
        if (shop.owner.toString() !== req.user.id) {
            return next(new ErrorResponse(`User ${req.user.id} is not authorized to update this shop`, 401));
        }

        // Check if req.body contains an image URL or base64 data
        if (!req.body.image) {
            return next(new ErrorResponse("Please provide an image URL or base64 data", 400));
        }

        // Update shop image
        shop.image = req.body.image;
        await shop.save();

        res.status(200).json({ success: true, data: { image: shop.image } });
    } catch (err) {
        console.error(err);
        return next(new ErrorResponse("Error updating shop image", 500));
    }
};

// @desc    Get shops within radius
// @route   GET /api/v1/shops/radius/:zipcode/:distance
// @access  Public
exports.getShopsInRadius = async (req, res, next) => {
    try {
        const { pincode, distance } = req.params;

        // Get lat/lng from geocoder
        // For now, we'll use a simple lookup for demonstration
        // In a real app, you'd use a geocoding service like Google Maps or Mapbox
        const lat = 12.9716;
        const lng = 77.5946;

        // Calc radius using radians
        // Divide dist by radius of Earth
        // Earth Radius = 3,963 mi / 6,378 km
        const radius = distance / 6378;

        const shops = await Shop.find({
            location: { $geoWithin: { $centerSphere: [[lng, lat], radius] } },
        });

        res.status(200).json({ success: true, count: shops.length, data: shops });
    } catch (err) {
        next(err);
    }
};

// @desc    Get nearby shops based on user's current location
// @route   GET /api/v1/shops/nearby
// @access  Public
exports.getNearbyShops = async (req, res, next) => {
    try {
        const latitude = parseFloat(req.query.latitude);
        const longitude = parseFloat(req.query.longitude);
        const distance = parseInt(req.query.distance) || 10000; // in meters
        const page = parseInt(req.query.page, 10) || 1;
        const limit = parseInt(req.query.limit, 10) || 10;
        const startIndex = (page - 1) * limit;

        if (isNaN(latitude) || isNaN(longitude)) {
            // Fallback when coordinates invalid or missing, return paginated shops normally
            const total = await Shop.countDocuments({ isActive: true });
            const shops = await Shop.find({ isActive: true }).populate("owner", "name").select("name description address location rating images categories isOpen").skip(startIndex).limit(limit);

            const pagination = {
                page,
                limit,
                total,
                pages: Math.ceil(total / limit),
            };

            if (startIndex + limit < total) pagination.next = { page: page + 1, limit };
            if (startIndex > 0) pagination.prev = { page: page - 1, limit };

            return res.status(200).json({ success: true, count: shops.length, pagination, data: shops, usingDefault: true });
        }

        // Use aggregation pipeline with $geoNear as first stage
        const pipeline = [
            {
                $geoNear: {
                    near: { type: "Point", coordinates: [longitude, latitude] },
                    distanceField: "distance",
                    maxDistance: distance,
                    spherical: true,
                    query: { isActive: true },
                },
            },
            { $skip: startIndex },
            { $limit: limit },
            {
                $lookup: {
                    from: "users", // or the collection name for 'owner'
                    localField: "owner",
                    foreignField: "_id",
                    as: "owner",
                },
            },
            {
                $unwind: "$owner",
            },
            {
                $project: {
                    name: 1,
                    description: 1,
                    address: 1,
                    location: 1,
                    rating: 1,
                    images: 1,
                    categories: 1,
                    isOpen: 1,
                    "owner.name": 1,
                    distance: 1,
                },
            },
        ];

        // Count total matching documents for pagination (without skip & limit)
        const totalAgg = [
            {
                $geoNear: {
                    near: { type: "Point", coordinates: [longitude, latitude] },
                    distanceField: "distance",
                    maxDistance: distance,
                    spherical: true,
                    query: { isActive: true },
                },
            },
            { $count: "total" },
        ];

        const [resultTotal] = await Shop.aggregate(totalAgg);
        const total = resultTotal ? resultTotal.total : 0;

        const shops = await Shop.aggregate(pipeline);

        const pagination = {
            page,
            limit,
            total,
            pages: Math.ceil(total / limit),
        };

        if (startIndex + limit < total) pagination.next = { page: page + 1, limit };
        if (startIndex > 0) pagination.prev = { page: page - 1, limit };

        return res.status(200).json({ success: true, count: shops.length, pagination, data: shops });
    } catch (err) {
        console.error("Error in getNearbyShops:", err);
        return next(err);
    }
};

// @desc    Get all shop categories
// @route   GET /api/v1/shops/categories
// @access  Public
exports.getShopCategories = async (req, res, next) => {
    try {
        // Find all distinct category values in Shop collection
        const categories = await Shop.distinct("categories");

        // Flatten and filter to get unique values
        const flatCategories = categories
            .filter((category) => category) // Remove null/undefined
            .flat();

        // Get unique values
        const uniqueCategories = [...new Set(flatCategories)].sort();

        res.status(200).json({ success: true, count: uniqueCategories.length, data: uniqueCategories });
    } catch (err) {
        next(err);
    }
};

// @desc    Add shop review
// @route   POST /api/v1/shops/:id/reviews
// @access  Private
exports.addShopReview = async (req, res, next) => {
    try {
        const shop = await Shop.findById(req.params.id);

        if (!shop) {
            return next(new ErrorResponse(`Shop not found with id of ${req.params.id}`, 404));
        }

        // Make sure user is not reviewing their own shop
        if (shop.owner.toString() === req.user.id) {
            return next(new ErrorResponse(`You cannot review your own shop`, 400));
        }

        // Check if user already submitted a review
        const alreadyReviewed = shop.reviews.find((review) => review.user.toString() === req.user.id);

        if (alreadyReviewed) {
            return next(new ErrorResponse(`You have already reviewed this shop`, 400));
        }

        const review = {
            user: req.user.id,
            rating: req.body.rating,
            text: req.body.text,
        };

        shop.reviews.push(review);
        await shop.updateRating();

        res.status(201).json({ success: true, data: shop });
    } catch (err) {
        next(err);
    }
};

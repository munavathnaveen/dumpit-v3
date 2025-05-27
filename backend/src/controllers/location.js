const ErrorResponse = require("../utils/errorResponse");
const asyncHandler = require("express-async-handler");
const Shop = require("../models/Shop");
const Address = require("../models/Address");
const Order = require("../models/Order");
const User = require("../models/User");
const axios = require("axios");
const config = require("../config");

/**
 * @desc    Geocode an address to coordinates
 * @route   POST /api/v1/location/geocode
 * @access  Private
 */
exports.geocodeAddress = async (req, res, next) => {
    const { address } = req.body;

    if (!address) {
        return next(new ErrorResponse("Please provide an address to geocode", 400));
    }

    try {
        const formattedAddress = `${address.street}, ${address.village}, ${address.district}, ${address.state}, ${address.pincode}`;
        const geocodeUrl = `https://geocode.googleapis.com/v4beta/geocode/address/${encodeURIComponent(formattedAddress)}?key=${process.env.GOOGLE_MAPS_API_KEY}`;

        const response = await axios.get(geocodeUrl);

        if (response.data.status !== "OK") {
            return next(new ErrorResponse(`Geocoding failed: ${response.data.status}`, 400));
        }

        const location = response.data.results[0].geometry.location;

        res.status(200).json({
            success: true,
            data: {
                location: {
                    type: "Point",
                    coordinates: [location.lng, location.lat],
                },
                formattedAddress: response.data.results[0].formatted_address,
            },
        });
    } catch (error) {
        console.error("Geocoding error:", error);
        return next(new ErrorResponse("Failed to geocode address", 500));
    }
};

/**
 * @desc    Calculate distance between two points
 * @route   POST /api/v1/location/distance
 * @access  Private
 */
exports.calculateDistance = async (req, res, next) => {
    const { origins, destinations } = req.body;

    if (!origins || !destinations) {
        return next(new ErrorResponse("Please provide origin and destination coordinates", 400));
    }

    try {
        const originsStr = Array.isArray(origins) ? origins.map((o) => `${o.lat},${o.lng}`).join("|") : `${origins.lat},${origins.lng}`;
        const destinationsStr = Array.isArray(destinations) ? destinations.map((d) => `${d.lat},${d.lng}`).join("|") : `${destinations.lat},${destinations.lng}`;

        const distanceUrl = `https://routespreferred.googleapis.com/v1:computeRoutes?origin=${originsStr}&destination=${destinationsStr}&key=${process.env.GOOGLE_MAPS_API_KEY}`;
        const response = await axios.post(distanceUrl);

        if (response.data.status !== "OK") {
            return next(new ErrorResponse(`Distance calculation failed: ${response.data.status}`, 400));
        }

        res.status(200).json({ success: true, data: response.data });
    } catch (error) {
        console.error("Distance calculation error:", error);
        return next(new ErrorResponse("Failed to calculate distance", 500));
    }
};

/**
 * @desc    Find shops near a specific location
 * @route   GET /api/v1/location/shops
 * @access  Public
 */
exports.findNearbyShops = async (req, res, next) => {
    const { longitude, latitude, distance = 10 } = req.query;

    if (!longitude || !latitude) {
        return next(new ErrorResponse("Please provide longitude and latitude coordinates", 400));
    }

    const radius = distance * 1000;

    try {
        const shops = await Shop.find({
            location: {
                $near: {
                    $geometry: {
                        type: "Point",
                        coordinates: [parseFloat(longitude), parseFloat(latitude)],
                    },
                    $maxDistance: radius,
                },
            },
            isActive: true,
        })
            .select("name description address location rating images")
            .lean();

        const shopsWithDistance = shops.map((shop) => {
            if (!shop.location || !shop.location.coordinates || shop.location.coordinates.length !== 2) {
                return shop;
            }

            const shopLng = shop.location.coordinates[0];
            const shopLat = shop.location.coordinates[1];
            const R = 6371000;
            const lat1 = (parseFloat(latitude) * Math.PI) / 180;
            const lat2 = (shopLat * Math.PI) / 180;
            const lng1 = (parseFloat(longitude) * Math.PI) / 180;
            const lng2 = (shopLng * Math.PI) / 180;
            const dLat = lat2 - lat1;
            const dLng = lng2 - lng1;
            const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
            const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
            const distanceInMeters = R * c;

            shop.distance = Math.round(distanceInMeters);
            return shop;
        });

        res.status(200).json({ success: true, count: shops.length, data: shopsWithDistance });
    } catch (error) {
        console.error("Error fetching nearby shops:", error);
        return next(new ErrorResponse("Failed to fetch nearby shops", 500));
    }
};

/**
 * @desc    Update user's current location
 * @route   PUT /api/v1/location
 * @access  Private
 */
exports.updateUserLocation = async (req, res, next) => {
    const { longitude, latitude } = req.body;

    if (!longitude || !latitude) {
        return next(new ErrorResponse("Please provide longitude and latitude coordinates", 400));
    }

    try {
        const user = await User.findByIdAndUpdate(
            req.user.id,
            {
                currentLocation: {
                    type: "Point",
                    coordinates: [parseFloat(longitude), parseFloat(latitude)],
                },
            },
            { new: true, runValidators: true }
        ).select("-password");

        res.status(200).json({ success: true, data: user });
    } catch (error) {
        console.error("Error updating user location:", error);
        return next(new ErrorResponse("Failed to update user location", 500));
    }
};

/**
 * @desc    Get orders by location (for vendors)
 * @route   GET /api/v1/location/orders
 * @access  Private/Vendor
 */
exports.getOrdersByLocation = asyncHandler(async (req, res, next) => {
    const { longitude, latitude, distance = 10 } = req.query;

    if (!longitude || !latitude) {
        return next(new ErrorResponse("Please provide longitude and latitude coordinates", 400));
    }

    const radius = distance * 1000;

    const shops = await Shop.find({ owner: req.user.id }).select("_id");
    const shopIds = shops.map((shop) => shop._id);

    const addresses = await Address.find({
        location: {
            $near: {
                $geometry: {
                    type: "Point",
                    coordinates: [parseFloat(longitude), parseFloat(latitude)],
                },
                $maxDistance: radius,
            },
        },
    }).select("_id");

    const addressIds = addresses.map((address) => address._id);

    const orders = await Order.find({
        shippingAddress: { $in: addressIds },
        "items.shop": { $in: shopIds },
    })
        .populate("user", "name email")
        .populate("items.product", "name")
        .populate("items.shop", "name")
        .populate("shippingAddress")
        .lean();

    res.status(200).json({ success: true, count: orders.length, data: orders });
});

/**
 * @desc    Get directions between two points
 * @route   GET /api/v1/location/directions
 * @access  Private
 */
exports.getDirections = asyncHandler(async (req, res, next) => {
    const { origin, destination, waypoints } = req.query;

    if (!origin || !destination) {
        return next(new ErrorResponse("Please provide origin and destination", 400));
    }

    try {
        const directionsUrl = `https://routes.googleapis.com/directions/v2:computeRoutes?key=${process.env.GOOGLE_MAPS_API_KEY}`;

        const requestBody = {
            origin: {
                location: {
                    latLng: {
                        latitude: parseFloat(origin.split(",")[0]),
                        longitude: parseFloat(origin.split(",")[1]),
                    },
                },
            },
            destination: {
                location: {
                    latLng: {
                        latitude: parseFloat(destination.split(",")[0]),
                        longitude: parseFloat(destination.split(",")[1]),
                    },
                },
            },
            ...(waypoints && {
                intermediates: waypoints.split("|").map((wp) => {
                    const [lat, lng] = wp.split(",");
                    return { location: { latLng: { latitude: parseFloat(lat), longitude: parseFloat(lng) } } };
                }),
            }),
            travelMode: "DRIVE",
        };

        const response = await axios.post(directionsUrl, requestBody, {
            headers: {
                "Content-Type": "application/json",
                "X-Goog-Api-Key": process.env.GOOGLE_MAPS_API_KEY,
                "X-Goog-FieldMask": "*",
            },
        });

        res.status(200).json({ success: true, data: response.data });
    } catch (error) {
        console.error("Directions error:", error.response?.data || error.message);
        return next(new ErrorResponse("Failed to get directions", 500));
    }
});

/**
 * @desc    Track order location
 * @route   GET /api/v1/location/orders/:id/track
 * @access  Private
 */
exports.trackOrderLocation = asyncHandler(async (req, res, next) => {
    const orderId = req.params.id;

    const order = await Order.findById(orderId).populate("shippingAddress").lean();

    if (!order) {
        return next(new ErrorResponse(`Order not found with id of ${orderId}`, 404));
    }

    if (order.user.toString() !== req.user.id && req.user.role !== "admin") {
        if (req.user.role === "vendor") {
            const shops = await Shop.find({ owner: req.user.id }).select("_id");
            const shopIds = shops.map((shop) => shop._id.toString());

            const hasShopInOrder = order.items.some((item) => shopIds.includes(item.shop.toString()));
            if (!hasShopInOrder) {
                return next(new ErrorResponse("Not authorized to track this order", 403));
            }
        } else {
            return next(new ErrorResponse("Not authorized to track this order", 403));
        }
    }

    const addressLocation = order.shippingAddress?.location;

    if (!addressLocation?.coordinates) {
        return next(new ErrorResponse("Location data not available for this order", 404));
    }

    res.status(200).json({
        success: true,
        data: {
            orderId: order._id,
            status: order.status,
            location: addressLocation,
            tracking: order.tracking || {},
            address: {
                street: order.shippingAddress.street,
                village: order.shippingAddress.village,
                district: order.shippingAddress.district,
                state: order.shippingAddress.state,
                pincode: order.shippingAddress.pincode,
            },
        },
    });
});

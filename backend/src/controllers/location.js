const ErrorResponse = require('../utils/errorResponse')
const asyncHandler = require('express-async-handler')
const Shop = require('../models/Shop')
const Address = require('../models/Address')
const Order = require('../models/Order')
const User = require('../models/User')
const axios = require('axios')
const config = require('../config')

/**
 * @desc    Geocode an address to coordinates
 * @route   POST /api/v1/location/geocode
 * @access  Private
 */
exports.geocodeAddress = asyncHandler(async (req, res, next) => {
  const { address } = req.body;

  if (!address) {
    return next(new ErrorResponse('Please provide an address to geocode', 400));
  }

  try {
    // Format the address for the API call
    const formattedAddress = `${address.street}, ${address.village}, ${address.district}, ${address.state}, ${address.pincode}`;
    
    // Make a request to the Google Maps Geocoding API
    const geocodeUrl = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(formattedAddress)}&key=${process.env.GOOGLE_MAPS_API_KEY}`;
    
    const response = await axios.get(geocodeUrl);
    
    if (response.data.status !== 'OK') {
      return next(new ErrorResponse(`Geocoding failed: ${response.data.status}`, 400));
    }
    
    const location = response.data.results[0].geometry.location;
    
    res.status(200).json({
      success: true,
      data: {
        location: {
          type: 'Point',
          coordinates: [location.lng, location.lat]
        },
        formattedAddress: response.data.results[0].formatted_address
      }
    });
  } catch (error) {
    console.error('Geocoding error:', error);
    return next(new ErrorResponse('Failed to geocode address', 500));
  }
});

/**
 * @desc    Calculate distance between two points
 * @route   POST /api/v1/location/distance
 * @access  Private
 */
exports.calculateDistance = asyncHandler(async (req, res, next) => {
  const { origins, destinations } = req.body;

  if (!origins || !destinations) {
    return next(new ErrorResponse('Please provide origin and destination coordinates', 400));
  }

  try {
    // Format the origin and destination for the API call
    const originsStr = Array.isArray(origins) 
      ? origins.map(origin => `${origin.lat},${origin.lng}`).join('|')
      : `${origins.lat},${origins.lng}`;
    
    const destinationsStr = Array.isArray(destinations)
      ? destinations.map(dest => `${dest.lat},${dest.lng}`).join('|')
      : `${destinations.lat},${destinations.lng}`;
    
    // Make a request to the Google Maps Distance Matrix API
    const distanceUrl = `https://maps.googleapis.com/maps/api/distancematrix/json?origins=${originsStr}&destinations=${destinationsStr}&key=${process.env.GOOGLE_MAPS_API_KEY}`;
    
    const response = await axios.get(distanceUrl);
    
    if (response.data.status !== 'OK') {
      return next(new ErrorResponse(`Distance calculation failed: ${response.data.status}`, 400));
    }
    
    // Return the distance and duration information
    res.status(200).json({
      success: true,
      data: response.data
    });
  } catch (error) {
    console.error('Distance calculation error:', error);
    return next(new ErrorResponse('Failed to calculate distance', 500));
  }
});

/**
 * @desc    Find shops near a specific location
 * @route   GET /api/v1/location/shops
 * @access  Public
 */
exports.findNearbyShops = asyncHandler(async (req, res, next) => {
  const {longitude, latitude, distance = 10} = req.query

  // Check if coordinates are provided
  if (!longitude || !latitude) {
    return next(new ErrorResponse('Please provide longitude and latitude coordinates', 400))
  }

  // Convert distance from kilometers to meters (for MongoDB)
  const radius = distance * 1000

  // Find shops near the specified location
  const shops = await Shop.find({
    location: {
      $near: {
        $geometry: {
          type: 'Point',
          coordinates: [parseFloat(longitude), parseFloat(latitude)],
        },
        $maxDistance: radius,
      },
    },
    isActive: true,
  })
    .select('name description address location rating images')
    .lean()

  res.status(200).json({
    success: true,
    count: shops.length,
    data: shops,
  })
})

/**
 * @desc    Update user's current location
 * @route   PUT /api/v1/location
 * @access  Private
 */
exports.updateUserLocation = asyncHandler(async (req, res, next) => {
  const {longitude, latitude} = req.body

  // Check if coordinates are provided
  if (!longitude || !latitude) {
    return next(new ErrorResponse('Please provide longitude and latitude coordinates', 400))
  }

  // Update user's current location
  const user = await User.findByIdAndUpdate(
    req.user.id,
    {
      currentLocation: {
        type: 'Point',
        coordinates: [parseFloat(longitude), parseFloat(latitude)],
      },
    },
    {new: true, runValidators: true}
  ).select('-password')

  res.status(200).json({
    success: true,
    data: user,
  })
})

/**
 * @desc    Get orders by location (for vendors)
 * @route   GET /api/v1/location/orders
 * @access  Private/Vendor
 */
exports.getOrdersByLocation = asyncHandler(async (req, res, next) => {
  const {longitude, latitude, distance = 10} = req.query

  // Check if coordinates are provided
  if (!longitude || !latitude) {
    return next(new ErrorResponse('Please provide longitude and latitude coordinates', 400))
  }

  // Convert distance from kilometers to meters (for MongoDB)
  const radius = distance * 1000

  // Get all shops owned by the vendor
  const shops = await Shop.find({owner: req.user.id})
  const shopIds = shops.map((shop) => shop._id)

  // Find addresses within the specified distance
  const addresses = await Address.find({
    location: {
      $near: {
        $geometry: {
          type: 'Point',
          coordinates: [parseFloat(longitude), parseFloat(latitude)],
        },
        $maxDistance: radius,
      },
    },
  })

  const addressIds = addresses.map((address) => address._id)

  // Find orders with these addresses and that contain items from the vendor's shops
  const orders = await Order.find({
    shippingAddress: {$in: addressIds},
    'items.shop': {$in: shopIds},
  })
    .populate('user', 'name email')
    .populate('items.product', 'name')
    .populate('items.shop', 'name')
    .populate('shippingAddress')
    .lean()

  res.status(200).json({
    success: true,
    count: orders.length,
    data: orders,
  })
})

/**
 * @desc    Get directions between two points
 * @route   GET /api/v1/location/directions
 * @access  Private
 */
exports.getDirections = asyncHandler(async (req, res, next) => {
  const { origin, destination, waypoints } = req.query;

  if (!origin || !destination) {
    return next(new ErrorResponse('Please provide origin and destination', 400));
  }

  try {
    // Build the directions API URL
    let directionsUrl = `https://maps.googleapis.com/maps/api/directions/json?origin=${origin}&destination=${destination}&key=${process.env.GOOGLE_MAPS_API_KEY}`;
    
    // Add waypoints if provided
    if (waypoints) {
      directionsUrl += `&waypoints=${waypoints}`;
    }
    
    const response = await axios.get(directionsUrl);
    
    if (response.data.status !== 'OK') {
      return next(new ErrorResponse(`Directions request failed: ${response.data.status}`, 400));
    }
    
    // Return the directions data
    res.status(200).json({
      success: true,
      data: response.data
    });
  } catch (error) {
    console.error('Directions error:', error);
    return next(new ErrorResponse('Failed to get directions', 500));
  }
});

/**
 * @desc    Track order location
 * @route   GET /api/v1/location/orders/:id/track
 * @access  Private
 */
exports.trackOrderLocation = asyncHandler(async (req, res, next) => {
  const orderId = req.params.id

  // Find the order
  const order = await Order.findById(orderId).populate('shippingAddress').lean()

  if (!order) {
    return next(new ErrorResponse(`Order not found with id of ${orderId}`, 404))
  }

  // Check if user is authorized to track this order
  if (order.user.toString() !== req.user.id && req.user.role !== 'admin') {
    // For vendors, check if they own any shop in the order
    if (req.user.role === 'vendor') {
      const shops = await Shop.find({owner: req.user.id})
      const shopIds = shops.map((shop) => shop._id.toString())

      const hasShopInOrder = order.items.some((item) => shopIds.includes(item.shop.toString()))

      if (!hasShopInOrder) {
        return next(new ErrorResponse('Not authorized to track this order', 403))
      }
    } else {
      return next(new ErrorResponse('Not authorized to track this order', 403))
    }
  }

  // Get the shipping address location
  const addressLocation = order.shippingAddress ? order.shippingAddress.location : null

  if (!addressLocation || !addressLocation.coordinates) {
    return next(new ErrorResponse('Location data not available for this order', 404))
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
  })
})

const Shop = require('../models/Shop')
const User = require('../models/User')
const ErrorResponse = require('../utils/errorResponse')
const {upload, uploadToCloudinary} = require('../utils/upload')
const config = require('../config')

// @desc    Get all shops
// @route   GET /api/v1/shops
// @access  Public
exports.getShops = async (req, res, next) => {
  try {
    // Copy req.query
    const reqQuery = {...req.query}

    // Fields to exclude
    const removeFields = ['select', 'sort', 'page', 'limit']

    // Loop over removeFields and delete them from reqQuery
    removeFields.forEach((param) => delete reqQuery[param])

    // Create query string
    let queryStr = JSON.stringify(reqQuery)

    // Create operators ($gt, $gte, etc)
    queryStr = queryStr.replace(/\b(gt|gte|lt|lte|in)\b/g, (match) => `$${match}`)

    // Finding resource
    let query = Shop.find(JSON.parse(queryStr)).populate('owner', 'name email phone')

    // Select fields
    if (req.query.select) {
      const fields = req.query.select.split(',').join(' ')
      query = query.select(fields)
    }

    // Sort
    if (req.query.sort) {
      const sortBy = req.query.sort.split(',').join(' ')
      query = query.sort(sortBy)
    } else {
      query = query.sort('-createdAt')
    }

    // Pagination
    const page = parseInt(req.query.page, 10) || 1
    const limit = parseInt(req.query.limit, 10) || 10
    const startIndex = (page - 1) * limit
    const endIndex = page * limit
    const total = await Shop.countDocuments()

    query = query.skip(startIndex).limit(limit)

    // Executing query
    const shops = await query

    // Pagination result
    const pagination = {}

    if (endIndex < total) {
      pagination.next = {
        page: page + 1,
        limit,
      }
    }

    if (startIndex > 0) {
      pagination.prev = {
        page: page - 1,
        limit,
      }
    }

    res.status(200).json({
      success: true,
      count: shops.length,
      pagination,
      data: shops,
    })
  } catch (err) {
    next(err)
  }
}

// @desc    Get single shop
// @route   GET /api/v1/shops/:id
// @access  Public
exports.getShop = async (req, res, next) => {
  try {
    const shop = await Shop.findById(req.user.shop_id) || await Shop.findById(req.params.id)

    if (!shop) {
      return next(new ErrorResponse(`Shop not found with id of ${req.params.id}`, 404))
    }

    res.status(200).json({
      success: true,
      data: shop,
    })
  } catch (err) {
    next(err)
  }
}

// @desc    Create new shop
// @route   POST /api/v1/shops
// @access  Private (Vendor only)
exports.createShop = async (req, res, next) => {
  try {
    // Make sure user is a vendor
    if (req.user.role !== config.constants.userRoles.VENDOR) {
      return next(new ErrorResponse(`User role ${req.user.role} is not authorized to create a shop`, 403))
    }

    // Add owner to req.body
    req.body.owner = req.user.id

    // Check for existing shop
    const existingShop = await Shop.findOne({owner: req.user.id})

    // If the user is not an admin, they can only add one shop
    if (existingShop) {
      return next(new ErrorResponse(`The vendor with ID ${req.user.id} already has a shop`, 400))
    }

    const shop = await Shop.create(req.body)

    // Update user with shop_id reference
    await User.findByIdAndUpdate(req.user.id, { shop_id: shop._id })
    console.log(User.findById(req.user.id));
    res.status(201).json({
      success: true,
      data: shop,
    })
  } catch (err) {
    next(err)
  }
}

// @desc    Update shop
// @route   PUT /api/v1/shops/:id
// @access  Private (Owner only)
exports.updateShop = async (req, res, next) => {
  try {
    let shop = await Shop.findById(req.params.id)

    if (!shop) {
      return next(new ErrorResponse(`Shop not found with id of ${req.params.id}`, 404))
    }

    // Make sure user is shop owner
    if (shop.owner.toString() !== req.user.id && req.user.role !== 'admin') {
      return next(new ErrorResponse(`User ${req.user.id} is not authorized to update this shop`, 401))
    }

    shop = await Shop.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    })

    res.status(200).json({
      success: true,
      data: shop,
    })
  } catch (err) {
    next(err)
  }
}

// @desc    Delete shop
// @route   DELETE /api/v1/shops/:id
// @access  Private (Owner only)
exports.deleteShop = async (req, res, next) => {
  try {
    const shop = await Shop.findById(req.params.id)

    if (!shop) {
      return next(new ErrorResponse(`Shop not found with id of ${req.params.id}`, 404))
    }

    // Make sure user is shop owner
    if (shop.owner.toString() !== req.user.id && req.user.role !== 'admin') {
      return next(new ErrorResponse(`User ${req.user.id} is not authorized to delete this shop`, 401))
    }

    await shop.remove()

    res.status(200).json({
      success: true,
      data: {},
    })
  } catch (err) {
    next(err)
  }
}

// @desc    Upload shop images
// @route   PUT /api/v1/shops/:id/images
// @access  Private (Owner only)
exports.uploadShopImages = async (req, res, next) => {
  try {
    const shop = await Shop.findById(req.params.id)

    if (!shop) {
      return next(new ErrorResponse(`Shop not found with id of ${req.params.id}`, 404))
    }

    // Make sure user is shop owner
    if (shop.owner.toString() !== req.user.id && req.user.role !== 'admin') {
      return next(new ErrorResponse(`User ${req.user.id} is not authorized to update this shop`, 401))
    }

    if (!req.files || req.files.length === 0) {
      return next(new ErrorResponse('Please upload at least one file', 400))
    }

    const imageUrls = []

    // Process each file
    for (const file of req.files) {
      const result = await uploadToCloudinary(file, 'shops')
      imageUrls.push(result.url)
    }

    // Add images to shop
    shop.images = [...shop.images, ...imageUrls]
    await shop.save()

    res.status(200).json({
      success: true,
      count: imageUrls.length,
      data: shop.images,
    })
  } catch (err) {
    next(err)
  }
}

// @desc    Get shops within radius
// @route   GET /api/v1/shops/radius/:zipcode/:distance
// @access  Public
exports.getShopsInRadius = async (req, res, next) => {
  try {
    const {pincode, distance} = req.params

    // Get lat/lng from geocoder
    // For now, we'll use a simple lookup for demonstration
    // In a real app, you'd use a geocoding service like Google Maps or Mapbox
    const lat = 12.9716
    const lng = 77.5946

    // Calc radius using radians
    // Divide dist by radius of Earth
    // Earth Radius = 3,963 mi / 6,378 km
    const radius = distance / 6378

    const shops = await Shop.find({
      location: {$geoWithin: {$centerSphere: [[lng, lat], radius]}},
    })

    res.status(200).json({
      success: true,
      count: shops.length,
      data: shops,
    })
  } catch (err) {
    next(err)
  }
}

// @desc    Get nearby shops based on user's current location
// @route   GET /api/v1/shops/nearby
// @access  Public
exports.getNearbyShops = async (req, res, next) => {
  try {
    // Get coordinates from query or use defaults
    const latitude = parseFloat(req.query.latitude) || 12.9716;
    const longitude = parseFloat(req.query.longitude) || 77.5946;
    const distance = parseInt(req.query.distance) || 10000; // Default 10km
    
    // Find shops near the specified location using geospatial query
    const shops = await Shop.find({
      location: {
        $near: {
          $geometry: {
            type: 'Point',
            coordinates: [longitude, latitude],
          },
          $maxDistance: distance,
        },
      },
      isActive: true,
    })
    .populate('owner', 'name')
    .select('name description address location rating images categories isOpen')
    .limit(10);
    
    res.status(200).json({
      success: true,
      count: shops.length,
      data: shops,
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Get all shop categories
// @route   GET /api/v1/shops/categories
// @access  Public
exports.getShopCategories = async (req, res, next) => {
  try {
    // Find all distinct category values in Shop collection
    const categories = await Shop.distinct('categories');
    
    // Flatten and filter to get unique values
    const flatCategories = categories
      .filter(category => category) // Remove null/undefined
      .flat();
    
    // Get unique values
    const uniqueCategories = [...new Set(flatCategories)].sort();
    
    res.status(200).json({
      success: true,
      count: uniqueCategories.length,
      data: uniqueCategories,
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Add shop review
// @route   POST /api/v1/shops/:id/reviews
// @access  Private
exports.addShopReview = async (req, res, next) => {
  try {
    const shop = await Shop.findById(req.params.id)

    if (!shop) {
      return next(new ErrorResponse(`Shop not found with id of ${req.params.id}`, 404))
    }

    // Make sure user is not reviewing their own shop
    if (shop.owner.toString() === req.user.id) {
      return next(new ErrorResponse(`You cannot review your own shop`, 400))
    }

    // Check if user already submitted a review
    const alreadyReviewed = shop.reviews.find((review) => review.user.toString() === req.user.id)

    if (alreadyReviewed) {
      return next(new ErrorResponse(`You have already reviewed this shop`, 400))
    }

    const review = {
      user: req.user.id,
      rating: req.body.rating,
      text: req.body.text,
    }

    shop.reviews.push(review)
    await shop.updateRating()

    res.status(201).json({
      success: true,
      data: shop,
    })
  } catch (err) {
    next(err)
  }
}

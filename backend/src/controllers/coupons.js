const Coupon = require('../models/Coupon')
const asyncHandler = require('../middleware/async')
const ErrorResponse = require('../utils/errorResponse')

/**
 * @desc    Get all coupons (paginated)
 * @route   GET /api/v1/coupons
 * @access  Private (Vendor/Admin)
 */
exports.getCoupons = asyncHandler(async (req, res, next) => {
  const page = parseInt(req.query.page, 10) || 1
  const limit = parseInt(req.query.limit, 10) || 10
  const startIndex = (page - 1) * limit
  const endIndex = page * limit

  const total = await Coupon.countDocuments()
  const coupons = await Coupon.find().sort({createdAt: -1}).skip(startIndex).limit(limit)

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
    count: coupons.length,
    pagination,
    data: coupons,
  })
})

/**
 * @desc    Get active coupons
 * @route   GET /api/v1/coupons/active
 * @access  Public
 */
exports.getActiveCoupons = asyncHandler(async (req, res, next) => {
  const currentDate = new Date()

  const coupons = await Coupon.find({
    isActive: true,
    validFrom: {$lte: currentDate},
    validUntil: {$gte: currentDate},
  })

  res.status(200).json({
    success: true,
    count: coupons.length,
    data: coupons,
  })
})

/**
 * @desc    Get single coupon
 * @route   GET /api/v1/coupons/:id
 * @access  Private (Vendor/Admin)
 */
exports.getCoupon = asyncHandler(async (req, res, next) => {
  const coupon = await Coupon.findById(req.params.id)

  if (!coupon) {
    return next(new ErrorResponse(`Coupon not found with id of ${req.params.id}`, 404))
  }

  res.status(200).json({
    success: true,
    data: coupon,
  })
})

/**
 * @desc    Create new coupon
 * @route   POST /api/v1/coupons
 * @access  Private (Vendor/Admin)
 */
exports.createCoupon = asyncHandler(async (req, res, next) => {
  // Transform request body to match model schema
  const couponData = {
    code: req.body.code,
    description: req.body.description || `Coupon ${req.body.code}`,
    discountType: req.body.type.toLowerCase(),
    discountValue: req.body.discount,
    minOrderValue: req.body.minAmount,
    maxDiscountAmount: req.body.maxDiscount,
    validFrom: req.body.startDate,
    validUntil: req.body.endDate,
    usageLimit: req.body.usageLimit,
    isActive: req.body.isActive,
  }

  // Check if coupon with same code already exists
  const existingCoupon = await Coupon.findOne({code: couponData.code})
  if (existingCoupon) {
    return next(new ErrorResponse(`Coupon with code ${couponData.code} already exists`, 400))
  }

  const coupon = await Coupon.create(couponData)

  res.status(201).json({
    success: true,
    data: coupon,
  })
})

/**
 * @desc    Update coupon
 * @route   PUT /api/v1/coupons/:id
 * @access  Private (Vendor/Admin)
 */
exports.updateCoupon = asyncHandler(async (req, res, next) => {
  let coupon = await Coupon.findById(req.params.id)

  if (!coupon) {
    return next(new ErrorResponse(`Coupon not found with id of ${req.params.id}`, 404))
  }

  // Transform request body to match model schema
  const couponData = {
    code: req.body.code,
    description: req.body.description || `Coupon ${req.body.code}`,
    discountType: req.body.type.toLowerCase(),
    discountValue: req.body.discount,
    minOrderValue: req.body.minAmount,
    maxDiscountAmount: req.body.maxDiscount,
    validFrom: req.body.startDate,
    validUntil: req.body.endDate,
    usageLimit: req.body.usageLimit,
    isActive: req.body.isActive,
  }

  // Check if coupon with same code already exists (except current coupon)
  if (coupon.code !== couponData.code) {
    const existingCoupon = await Coupon.findOne({code: couponData.code})
    if (existingCoupon) {
      return next(new ErrorResponse(`Coupon with code ${couponData.code} already exists`, 400))
    }
  }

  coupon = await Coupon.findByIdAndUpdate(req.params.id, couponData, {
    new: true,
    runValidators: true,
  })

  res.status(200).json({
    success: true,
    data: coupon,
  })
})

/**
 * @desc    Delete coupon
 * @route   DELETE /api/v1/coupons/:id
 * @access  Private (Vendor/Admin)
 */
exports.deleteCoupon = asyncHandler(async (req, res, next) => {
  const coupon = await Coupon.findById(req.params.id)

  if (!coupon) {
    return next(new ErrorResponse(`Coupon not found with id of ${req.params.id}`, 404))
  }

  await coupon.deleteOne()

  res.status(200).json({
    success: true,
    data: {},
  })
})

/**
 * @desc    Validate coupon
 * @route   POST /api/v1/coupons/validate
 * @access  Private (User)
 */
exports.validateCoupon = asyncHandler(async (req, res, next) => {
  const {code, orderAmount} = req.body

  const coupon = await Coupon.findOne({code: code.toUpperCase()})

  if (!coupon) {
    return next(new ErrorResponse(`Coupon code ${code} not found`, 404))
  }

  // Check if coupon is valid
  const currentDate = new Date()
  if (!coupon.isActive || currentDate < coupon.validFrom || currentDate > coupon.validUntil) {
    return next(new ErrorResponse('Coupon is expired or inactive', 400))
  }

  // Check usage limit
  if (coupon.usageLimit !== null && coupon.usedCount >= coupon.usageLimit) {
    return next(new ErrorResponse('Coupon usage limit reached', 400))
  }

  // Check minimum order amount
  if (orderAmount < coupon.minOrderValue) {
    return next(new ErrorResponse(`Minimum order amount of ${coupon.minOrderValue} required for this coupon`, 400))
  }

  // Calculate discount
  const discount = coupon.calculateDiscount(orderAmount)

  res.status(200).json({
    success: true,
    data: {
      coupon,
      appliedDiscount: discount,
      finalAmount: orderAmount - discount,
    },
  })
})

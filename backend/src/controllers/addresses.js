const Address = require('../models/Address')
const User = require('../models/User')
const ErrorResponse = require('../utils/errorResponse')

// @desc    Get all addresses for a user
// @route   GET /api/v1/addresses
// @route   GET /api/v1/users/:userId/addresses
// @access  Private
exports.getAddresses = async (req, res, next) => {
  try {
    let addresses

    if (req.params.userId) {
      // Check if user is authorized to view addresses
      if (req.params.userId !== req.user.id && req.user.role !== 'vendor') {
        return next(
          new ErrorResponse(
            `User ${req.user.id} is not authorized to view addresses for user ${req.params.userId}`,
            401
          )
        )
      }

      addresses = await Address.find({user: req.params.userId})
    } else {
      // If no userId provided, get current user's addresses
      addresses = await Address.find({user: req.user.id})
    }

    res.status(200).json({
      success: true,
      count: addresses.length,
      data: addresses,
    })
  } catch (err) {
    next(err)
  }
}

// @desc    Get single address
// @route   GET /api/v1/addresses/:id
// @access  Private
exports.getAddress = async (req, res, next) => {
  try {
    const address = await Address.findById(req.params.id)

    if (!address) {
      return next(new ErrorResponse(`Address not found with id of ${req.params.id}`, 404))
    }

    // Make sure user owns the address or is a vendor
    if (address.user.toString() !== req.user.id && req.user.role !== 'vendor') {
      return next(new ErrorResponse(`User ${req.user.id} is not authorized to view this address`, 401))
    }

    res.status(200).json({
      success: true,
      data: address,
    })
  } catch (err) {
    next(err)
  }
}

// @desc    Create address
// @route   POST /api/v1/addresses
// @route   POST /api/v1/users/:userId/addresses
// @access  Private
exports.createAddress = async (req, res, next) => {
  try {
    // Set user to the logged in user or the specified userId
    const userId = req.params.userId || req.user.id
    console.log(req.body, req.user);
    // Check if user is authorized to create address for another user
    if (userId !== req.user.id && req.user.role !== 'vendor') {
      return next(new ErrorResponse(`User ${req.user.id} is not authorized to create address for user ${userId}`, 401))
    }

    // Check if user exists
    const user = await User.findById(userId)
    if (!user) {
      return next(new ErrorResponse(`User not found with id of ${userId}`, 404))
    }

    // Set user ID in the request body
    req.body.user = userId

    // If it's a default address, remove default from other addresses
    if (req.body.isDefault) {
      await Address.updateMany({user: userId}, {isDefault: false})
    }

    // Create address
    const address = await Address.create(req.body)

    // Add address to user's addresses array
    user.addresses.push(address._id)
    await user.save()

    res.status(201).json({
      success: true,
      data: address,
    })
  } catch (err) {
    next(err)
  }
}

// @desc    Update address
// @route   PUT /api/v1/addresses/:id
// @access  Private
exports.updateAddress = async (req, res, next) => {
  try {
    let address = await Address.findById(req.params.id)

    if (!address) {
      return next(new ErrorResponse(`Address not found with id of ${req.params.id}`, 404))
    }

    // Make sure user owns the address or is a vendor
    if (address.user.toString() !== req.user.id && req.user.role !== 'vendor') {
      return next(new ErrorResponse(`User ${req.user.id} is not authorized to update this address`, 401))
    }

    // If setting as default, remove default from other addresses
    if (req.body.isDefault) {
      await Address.updateMany({user: address.user}, {isDefault: false})
    }

    // Update address
    address = await Address.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    })

    res.status(200).json({
      success: true,
      data: address,
    })
  } catch (err) {
    next(err)
  }
}

// @desc    Delete address
// @route   DELETE /api/v1/addresses/:id
// @access  Private
exports.deleteAddress = async (req, res, next) => {
  try {
    const address = await Address.findById(req.params.id)

    if (!address) {
      return next(new ErrorResponse(`Address not found with id of ${req.params.id}`, 404))
    }

    // Make sure user owns the address or is a vendor
    if (address.user.toString() !== req.user.id && req.user.role !== 'vendor') {
      return next(new ErrorResponse(`User ${req.user.id} is not authorized to delete this address`, 401))
    }

    // Remove address from user's addresses array
    const user = await User.findById(address.user)
    if (user) {
      user.addresses = user.addresses.filter((addressId) => addressId.toString() !== req.params.id)
      await user.save()
    }

    // Delete address using findByIdAndDelete instead of the deprecated remove() method
    await Address.findByIdAndDelete(req.params.id)

    res.status(200).json({
      success: true,
      data: {},
    })
  } catch (err) {
    next(err)
  }
}

const User = require('../models/User')
const Product = require('../models/Product')
const ErrorResponse = require('../utils/errorResponse')

// @desc    Get cart items
// @route   GET /api/v1/cart
// @access  Private
exports.getCartItems = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id).populate({
      path: 'cart.product'
    })

    res.status(200).json({
      success: true,
      count: user.cart.length,
      data: user.cart,
    })
  } catch (err) {
    next(err)
  }
}

// @desc    Add item to cart
// @route   POST /api/v1/cart/:productId
// @access  Private
exports.addCartItem = async (req, res, next) => {
  try {
    // Get product and check if it exists
    const product = await Product.findById(req.params.productId)

    if (!product) {
      return next(new ErrorResponse(`Product not found with id of ${req.params.productId}`, 404))
    }

    // Check if product is in stock
    if (product.stock <= 0) {
      return next(new ErrorResponse(`Product ${product.name} is out of stock`, 400))
    }

    // Get quantity from request body, default to 1
    const quantity = req.body.quantity || 1

    // Check if requested quantity is available
    if (quantity > product.stock) {
      return next(new ErrorResponse(`Requested quantity (${quantity}) exceeds available stock (${product.stock})`, 400))
    }

    // Get user
    const user = await User.findById(req.user.id)

    // Check if product is already in cart
    const cartItem = user.cart.find((item) => item.product.toString() === req.params.productId)

    if (cartItem) {
      // If product is already in cart, update quantity
      cartItem.quantity = req.body.quantity || cartItem.quantity + 1

      // Make sure updated quantity doesn't exceed stock
      if (cartItem.quantity > product.stock) {
        return next(
          new ErrorResponse(`Requested quantity (${cartItem.quantity}) exceeds available stock (${product.stock})`, 400)
        )
      }
    } else {
      // If product is not in cart, add it
      user.cart.push({
        product: req.params.productId,
        quantity,
      })
    }

    await user.save()

    // Return updated cart
    res.status(200).json({
      success: true,
      data: user.cart,
    })
  } catch (err) {
    next(err)
  }
}

// @desc    Update cart item quantity
// @route   PUT /api/v1/cart/:productId
// @access  Private
exports.updateCartItem = async (req, res, next) => {
  try {
    // Get product and check if it exists
    const product = await Product.findById(req.params.productId)

    if (!product) {
      return next(new ErrorResponse(`Product not found with id of ${req.params.productId}`, 404))
    }

    // Check if quantity was provided
    if (!req.body.quantity) {
      return next(new ErrorResponse('Please provide a quantity', 400))
    }

    // Check if requested quantity is available
    if (req.body.quantity > product.stock) {
      return next(
        new ErrorResponse(`Requested quantity (${req.body.quantity}) exceeds available stock (${product.stock})`, 400)
      )
    }

    // Get user
    const user = await User.findById(req.user.id)

    // Find the cart item
    const cartItemIndex = user.cart.findIndex((item) => item.product.toString() === req.params.productId)

    if (cartItemIndex === -1) {
      return next(new ErrorResponse(`Product not found in cart`, 404))
    }

    // Update quantity
    user.cart[cartItemIndex].quantity = req.body.quantity

    await user.save()

    // Return updated cart
    res.status(200).json({
      success: true,
      data: user.cart,
    })
  } catch (err) {
    next(err)
  }
}

// @desc    Remove item from cart
// @route   DELETE /api/v1/cart/:productId
// @access  Private
exports.removeCartItem = async (req, res, next) => {
  try {
    // Get user
    const user = await User.findById(req.user.id)

    // Filter out the product to remove
    user.cart = user.cart.filter((item) => item.product.toString() !== req.params.productId)

    await user.save()

    // Return updated cart
    res.status(200).json({
      success: true,
      data: user.cart,
    })
  } catch (err) {
    next(err)
  }
}

// @desc    Clear cart
// @route   DELETE /api/v1/cart
// @access  Private
exports.clearCart = async (req, res, next) => {
  try {
    // Get user
    const user = await User.findById(req.user.id)

    // Clear cart
    user.cart = []

    await user.save()

    // Return empty cart
    res.status(200).json({
      success: true,
      data: [],
    })
  } catch (err) {
    next(err)
  }
}

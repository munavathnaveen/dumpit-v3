const User = require("../models/User");
const Product = require("../models/Product");
const ErrorResponse = require("../utils/errorResponse");

// @desc    Get cart items
// @route   GET /api/v1/cart
// @access  Private
exports.getCartItems = async (req, res, next) => {
    try {
        const user = await User.findById(req.user.id).populate({
            path: "cart.product",
        });
        res.status(200).json({ success: true, count: user.cart.length, data: user.cart });
    } catch (err) {
        next(err);
    }
};

// @desc    Add item to cart
// @route   POST /api/v1/cart/:productId
// @access  Private
exports.addCartItem = async (req, res, next) => {
    try {
        // Get product and check if it exists
        const product = await Product.findById(req.params.productId);

        if (!product) {
            return next(new ErrorResponse(`Product not found with id of ${req.params.productId}`, 404));
        }

        // Check if product is in stock
        if (product.stock <= 0) {
            return next(new ErrorResponse(`Product ${product.name} is out of stock`, 400));
        }

        // Get quantity from request body, default to 1
        const quantity = parseInt(req.body.quantity) || 1;

        // Validate quantity is positive
        if (quantity <= 0) {
            return next(new ErrorResponse("Quantity must be a positive number", 400));
        }

        // Get user
        const user = await User.findById(req.user.id);

        // Check if product is already in cart
        const cartItemIndex = user.cart.findIndex((item) => item.product.toString() === req.params.productId);

        if (cartItemIndex >= 0) {
            // If product is already in cart, increment the quantity
            const newQuantity = user.cart[cartItemIndex].quantity + quantity;

            // Make sure updated quantity doesn't exceed stock
            if (newQuantity > product.stock) {
                return next(new ErrorResponse(`Requested quantity (${newQuantity}) exceeds available stock (${product.stock})`, 400));
            }

            // Update quantity
            user.cart[cartItemIndex].quantity = newQuantity;
        } else {
            // Make sure requested quantity doesn't exceed stock
            if (quantity > product.stock) {
                return next(new ErrorResponse(`Requested quantity (${quantity}) exceeds available stock (${product.stock})`, 400));
            }

            // If product is not in cart, add it
            user.cart.push({
                product: req.params.productId,
                quantity,
            });
        }

        await user.save();

        // Get the updated user with populated cart
        const updatedUser = await User.findById(req.user.id).populate({
            path: "cart.product",
        });

        // Find the updated or added cart item to return
        const updatedCartItem = updatedUser.cart.find((item) => item.product._id.toString() === req.params.productId);

        if (!updatedCartItem) {
            return next(new ErrorResponse("Cart item not found after update", 500));
        }

        // Return the updated cart item
        res.status(200).json({ success: true, data: updatedCartItem });
    } catch (err) {
        console.error("Error adding to cart:", err);
        next(err);
    }
};

// @desc    Update cart item quantity
// @route   PUT /api/v1/cart/:productId
// @access  Private
exports.updateCartItem = async (req, res, next) => {
    try {
        // Get product and check if it exists
        const product = await Product.findById(req.params.productId);

        if (!product) {
            return next(new ErrorResponse(`Product not found with id of ${req.params.productId}`, 404));
        }

        // Parse and validate quantity
        const quantity = parseInt(req.body.quantity);

        // Check if quantity was provided and is a valid number
        if (isNaN(quantity) || quantity <= 0) {
            return next(new ErrorResponse("Please provide a valid positive quantity", 400));
        }

        // Check if requested quantity is available
        if (quantity > product.stock) {
            return next(new ErrorResponse(`Requested quantity (${quantity}) exceeds available stock (${product.stock})`, 400));
        }

        // Get user
        const user = await User.findById(req.user.id);

        // Find the cart item
        const cartItemIndex = user.cart.findIndex((item) => item.product.toString() === req.params.productId);

        if (cartItemIndex === -1) {
            return next(new ErrorResponse(`Product not found in cart`, 404));
        }

        // Update quantity
        user.cart[cartItemIndex].quantity = quantity;

        await user.save();

        // Get the updated user with populated cart
        const updatedUser = await User.findById(req.user.id).populate({
            path: "cart.product",
        });

        // Get the updated cart item
        const updatedCartItem = updatedUser.cart.find((item) => item.product._id.toString() === req.params.productId);

        if (!updatedCartItem) {
            return next(new ErrorResponse("Cart item not found after update", 500));
        }

        res.status(200).json({ success: true, data: updatedCartItem });
    } catch (err) {
        console.error("Error updating cart item:", err);
        next(err);
    }
};

// @desc    Remove item from cart
// @route   DELETE /api/v1/cart/:productId
// @access  Private
exports.removeCartItem = async (req, res, next) => {
    try {
        // Validate that product exists (optional but helps provide better error messages)
        const product = await Product.findById(req.params.productId);

        if (!product) {
            return next(new ErrorResponse(`Product not found with id of ${req.params.productId}`, 404));
        }

        // Get user
        const user = await User.findById(req.user.id);

        // Check if the product exists in the cart
        const itemExists = user.cart.some((item) => item.product.toString() === req.params.productId);

        if (!itemExists) {
            return next(new ErrorResponse(`Product not found in cart`, 404));
        }

        // Filter out the product to remove
        user.cart = user.cart.filter((item) => item.product.toString() !== req.params.productId);

        await user.save();

        res.status(200).json({ success: true, data: req.params.productId });
    } catch (err) {
        console.error("Error removing cart item:", err);
        next(err);
    }
};

// @desc    Clear cart
// @route   DELETE /api/v1/cart
// @access  Private
exports.clearCart = async (req, res, next) => {
    try {
        // Get user
        const user = await User.findById(req.user.id);

        // Clear cart
        user.cart = [];

        await user.save();

        res.status(200).json({ success: true, data: [] });
    } catch (err) {
        next(err);
    }
};

const express = require('express')
const {getCartItems, addCartItem, updateCartItem, removeCartItem, clearCart} = require('../controllers/cart')

const {protect} = require('../middleware/auth')
const validateRequest = require('../middleware/validator')
const {cartItemSchema} = require('../validations/cart')

const router = express.Router()

// Protect all routes
router.use(protect)

// Get cart items
router.get('/', getCartItems)

// Clear cart
router.delete('/', clearCart)

// Add item to cart
router.post('/:productId', validateRequest(cartItemSchema), addCartItem)

// Update cart item
router.put('/:productId', validateRequest(cartItemSchema), updateCartItem)

// Remove cart item
router.delete('/:productId', removeCartItem)

module.exports = router

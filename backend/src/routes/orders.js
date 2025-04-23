const express = require('express')
const {
  getOrders,
  getOrder,
  createOrder,
  updateOrderStatus,
  updatePayment,
  getOrdersPending,
  cancelOrder,
  getVendorOrders,
  getVendorOrder,
  getVendorOrderStats,
  updateOrderTracking,
  getOrderTracking,
  vendorOrderAction
} = require('../controllers/orders')

const {protect, authorize} = require('../middleware/auth')
const validateRequest = require('../middleware/validator')
const {orderSchema, updateOrderStatusSchema, updatePaymentSchema} = require('../validations/order')
const config = require('../config')
const Joi = require('joi')

const router = express.Router()

// Protect all routes
router.use(protect)

// Vendor specific routes
router.get('/vendor', authorize(config.constants.userRoles.VENDOR), getVendorOrders)
router.get('/vendor/stats', authorize(config.constants.userRoles.VENDOR), getVendorOrderStats)
router.get('/vendor/:id', authorize(config.constants.userRoles.VENDOR), getVendorOrder)

// Get all orders
router.get('/', getOrders)

// Get pending orders
router.get('/pending', getOrdersPending)

// Create order
router.post('/', validateRequest(orderSchema), createOrder)

// Get single order
router.get('/:id', getOrder)

// Order tracking routes
router.get('/:id/tracking', getOrderTracking)
router.put('/:id/tracking', authorize(config.constants.userRoles.VENDOR), updateOrderTracking)

// Update order status
router.put('/:id/status', updateOrderStatus)

// Vendor accept/reject order (for COD)
router.put('/:id/vendor-action', authorize(config.constants.userRoles.VENDOR), validateRequest(Joi.object({
  action: Joi.string().valid('accept', 'reject').required().messages({
    'string.empty': 'Action is required',
    'any.only': 'Action must be either accept or reject',
  }),
})), vendorOrderAction)

// Payment update route
router.put('/:id/payment', validateRequest(updatePaymentSchema), updatePayment)

// Cancel order routes - one for general users, one specifically for vendors
router.put('/:id/cancel', cancelOrder)
router.put('/:id/vendor-cancel', authorize(config.constants.userRoles.VENDOR), cancelOrder)

module.exports = router

const express = require('express')
const {
  getOrders,
  getOrder,
  createOrder,
  updateOrderStatus,
  updatePayment,
  cancelOrder,
  getVendorOrders,
  getVendorOrder,
  getVendorOrderStats
} = require('../controllers/orders')

const {protect, authorize} = require('../middleware/auth')
const validateRequest = require('../middleware/validator')
const {orderSchema, updateOrderStatusSchema, updatePaymentSchema} = require('../validations/order')
const config = require('../config')

const router = express.Router()

// Protect all routes
router.use(protect)

// Vendor specific routes
router.get('/vendor', authorize(config.constants.userRoles.VENDOR), getVendorOrders)
router.get('/vendor/stats', authorize(config.constants.userRoles.VENDOR), getVendorOrderStats)
router.get('/vendor/:id', authorize(config.constants.userRoles.VENDOR), getVendorOrder)

// Get all orders
router.get('/', getOrders)

// Create order
router.post('/', validateRequest(orderSchema), createOrder)

// Get single order
router.get('/:id', getOrder)

// Update order status
router.put(
  '/:id',
  authorize(config.constants.userRoles.VENDOR),
  validateRequest(updateOrderStatusSchema),
  updateOrderStatus
)

// Payment update route
router.put('/:id/payment', validateRequest(updatePaymentSchema), updatePayment)

// Cancel order route
router.put('/:id/cancel', cancelOrder)

module.exports = router

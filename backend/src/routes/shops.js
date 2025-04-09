const express = require('express')
const {
  getShops,
  getShop,
  createShop,
  updateShop,
  deleteShop,
  getShopsByDistance,
  getShopsByVendor,
  getShopCategories,
  uploadShopImage,
  addShopReview,
  getShopsInRadius,
  getNearbyShops,
} = require('../controllers/shops')

// Include product routes
const productRouter = require('./products')

const {protect, authorize} = require('../middleware/auth')
const {upload} = require('../utils/upload')
const config = require('../config')

const router = express.Router()

// Re-route into other resource routers
router.use('/:shopId/products', productRouter)

// Get shops within radius
router.get('/radius/:pincode/:distance', getShopsInRadius)

// Get nearby shops
router.get('/nearby', getNearbyShops)

// Get all shop categories
router.get('/categories', getShopCategories)

// Shop review route
router.post('/:id/reviews', protect, addShopReview)

// Shop image upload route
router.put(
  '/:id/image',
  protect,
  authorize(config.constants.userRoles.VENDOR),
  uploadShopImage
)

// Get all shops
router.get('/', getShops)

// Create a shop
router.post('/', protect, authorize(config.constants.userRoles.VENDOR), createShop)

// Get single shop
router.get('/:id',protect, getShop)

// Update shop
router.put('/:id', protect, updateShop)

// Delete shop
router.delete('/:id', protect, deleteShop)

module.exports = router

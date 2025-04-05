const express = require('express')
const {
  getShops,
  getShop,
  createShop,
  updateShop,
  deleteShop,
  uploadShopImages,
  getShopsInRadius,
  addShopReview,
  getNearbyShops,
  getShopCategories,
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
router.put('/:id/images', protect, upload.array('images', 5), uploadShopImages)

// Get all shops
router.get('/', getShops)

// Create a shop
router.post('/', protect, authorize(config.constants.userRoles.VENDOR), createShop)

// Get single shop
router.get('/:id', getShop)

// Update shop
router.put('/:id', protect, updateShop)

// Delete shop
router.delete('/:id', protect, deleteShop)

module.exports = router

const express = require('express')
const {
  getProducts,
  getProduct,
  createProduct,
  updateProduct,
  deleteProduct,
  uploadProductImages,
  addProductReview,
  searchProducts,
} = require('../controllers/products')

const {protect, authorize} = require('../middleware/auth')
const {upload} = require('../utils/upload')
const validateRequest = require('../middleware/validator')
const {productSchema, productReviewSchema} = require('../validations/product')
const config = require('../config')

const router = express.Router({mergeParams: true})

// Search route
router.get('/search/:query', searchProducts)

// Product review route
router.post('/:id/reviews', protect, validateRequest(productReviewSchema), addProductReview)

// Product image upload route
router.put(
  '/:id/images',
  protect,
  authorize(config.constants.userRoles.VENDOR),
  upload.array('images', 5),
  uploadProductImages
)

// Get all products
router.get('/', getProducts)

// Create a product
router.post('/', protect, authorize(config.constants.userRoles.VENDOR), validateRequest(productSchema), createProduct)

// Get single product
router.get('/:id', getProduct)

// Update product
router.put('/:id', protect, authorize(config.constants.userRoles.VENDOR), validateRequest(productSchema), updateProduct)

// Delete product
router.delete('/:id', protect, authorize(config.constants.userRoles.VENDOR), deleteProduct)

module.exports = router

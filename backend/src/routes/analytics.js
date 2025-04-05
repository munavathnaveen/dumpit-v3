const express = require('express')
const {exportProducts, exportOrders, importProducts, downloadCSV, upload} = require('../controllers/analytics')

const {protect, authorize} = require('../middleware/auth')
const config = require('../config')

const router = express.Router()

// Download route - accessible to authenticated users
router.get('/download/:filename', protect, downloadCSV)

// Export routes
router.get(
  '/export/products',
  protect,
  authorize(config.constants.userRoles.VENDOR, config.constants.userRoles.ADMIN),
  exportProducts
)

router.get(
  '/export/orders',
  protect,
  authorize(config.constants.userRoles.VENDOR, config.constants.userRoles.ADMIN),
  exportOrders
)

// Import routes
router.post(
  '/import/products',
  protect,
  authorize(config.constants.userRoles.VENDOR, config.constants.userRoles.ADMIN),
  upload.single('csv'),
  importProducts
)

module.exports = router

const express = require('express')
const {
  findNearbyShops,
  updateUserLocation,
  getOrdersByLocation,
  trackOrderLocation,
} = require('../controllers/location')

const {protect, authorize} = require('../middleware/auth')
const config = require('../config')

const router = express.Router()

// Public route for finding nearby shops
router.get('/shops', findNearbyShops)

// Protected routes
router.put('/', protect, updateUserLocation)

// Vendor only routes
router.get('/orders', protect, authorize(config.constants.userRoles.VENDOR), getOrdersByLocation)

// Track order by location
router.get('/orders/:id/track', protect, trackOrderLocation)

module.exports = router

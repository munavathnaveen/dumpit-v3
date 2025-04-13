const express = require('express')
const {
  findNearbyShops,
  updateUserLocation,
  getOrdersByLocation,
  trackOrderLocation,
  geocodeAddress,
  calculateDistance,
  getDirections
} = require('../controllers/location')

const {protect, authorize} = require('../middleware/auth')
const config = require('../config')

const router = express.Router()

// Public route for finding nearby shops
router.get('/shops', findNearbyShops)

// Protected routes
router.put('/', protect, updateUserLocation)

// Geocode address
router.post('/geocode', protect, geocodeAddress)

// Calculate distance
router.post('/distance', protect, calculateDistance)

// Get directions
router.get('/directions', protect, getDirections)

// Routes for vendors
router.get(
  '/orders',
  protect,
  authorize(config.constants.userRoles.VENDOR),
  getOrdersByLocation
)

// Order tracking
router.get('/orders/:id/track', protect, trackOrderLocation)

module.exports = router

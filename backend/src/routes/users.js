const express = require('express')
const {
  getUsers,
  getUser,
  createUser,
  updateUser,
  deleteUser,
  uploadAvatar,
  getUserNotifications,
  markNotificationAsRead,
  updateNotificationSettings,
} = require('../controllers/users')

const {protect, authorize} = require('../middleware/auth')
const {upload} = require('../utils/upload')
const config = require('../config')

const router = express.Router()

// Protect all routes in this router
router.use(protect)

// Get all users
router.get('/', authorize(config.constants.userRoles.VENDOR), getUsers)

// Create user
router.post('/', authorize(config.constants.userRoles.VENDOR), createUser)

// Get single user
router.get('/:id', getUser)

// Update user
router.put('/:id', updateUser)

// Delete user
router.delete('/:id', authorize(config.constants.userRoles.VENDOR), deleteUser)

// Avatar upload route
router.put('/:id/avatar', upload.single('avatar'), uploadAvatar)

// Get user notifications
router.get('/:id/notifications', getUserNotifications)

// Mark notification as read
router.put('/:id/notifications/:notificationId', markNotificationAsRead)

// Update notification settings
router.put('/:id/notification-settings', updateNotificationSettings)

module.exports = router

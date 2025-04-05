const jwt = require('jsonwebtoken')
const ErrorResponse = require('../utils/errorResponse')
const User = require('../models/User')
const config = require('../config')

// Middleware to protect routes
exports.protect = async (req, res, next) => {
  let token

  // Check if token exists in headers
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1]
  }
  // Check if token exists in cookies
  else if (req.cookies.token) {
    token = req.cookies.token
  }

  // Make sure token exists
  if (!token) {
    return next(new ErrorResponse('Not authorized to access this route', 401))
  }

  try {
    // Verify token
    const decoded = jwt.verify(token, config.jwt.secret)

    // Find user by id from decoded token
    req.user = await User.findById(decoded.id)

    if (!req.user) {
      return next(new ErrorResponse('User not found', 404))
    }

    next()
  } catch (err) {
    return next(new ErrorResponse('Not authorized to access this route', 401))
  }
}

// Middleware for role authorization
exports.authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return next(new ErrorResponse('User not authenticated', 401))
    }

    if (!roles.includes(req.user.role)) {
      return next(new ErrorResponse(`User role ${req.user.role} is not authorized to access this route`, 403))
    }

    next()
  }
}

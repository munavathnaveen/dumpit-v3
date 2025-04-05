const joi = require('joi')
const ErrorResponse = require('../utils/errorResponse')

// Middleware factory for request validation
const validateRequest = (schema) => {
  return (req, res, next) => {
    const options = {
      abortEarly: false, // Include all errors
      allowUnknown: true, // Ignore unknown props
      stripUnknown: true, // Remove unknown props
    }

    const {error, value} = schema.validate(req.body, options)

    if (error) {
      const errorMessage = error.details.map((detail) => detail.message).join(', ')
      return next(new ErrorResponse(errorMessage, 400))
    }

    // Replace request body with validated data
    req.body = value
    next()
  }
}

module.exports = validateRequest

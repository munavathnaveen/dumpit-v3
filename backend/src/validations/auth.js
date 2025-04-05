const Joi = require('joi')
const config = require('../config')

// Register user validation schema
const registerSchema = Joi.object({
  name: Joi.string().trim().max(50).required().messages({
    'string.empty': 'Name is required',
    'string.max': 'Name cannot be more than 50 characters',
  }),

  email: Joi.string().trim().email().required().messages({
    'string.empty': 'Email is required',
    'string.email': 'Please provide a valid email',
  }),

  password: Joi.string().min(6).required().messages({
    'string.empty': 'Password is required',
    'string.min': 'Password must be at least 6 characters',
  }),

  phone: Joi.string()
    .pattern(/^[0-9]{10}$/)
    .required()
    .messages({
      'string.empty': 'Phone number is required',
      'string.pattern.base': 'Phone number must be a valid 10-digit number',
    }),

  role: Joi.string()
    .valid(config.constants.userRoles.VENDOR, config.constants.userRoles.CUSTOMER)
    .default(config.constants.userRoles.CUSTOMER),
})

// Login validation schema
const loginSchema = Joi.object({
  email: Joi.string().trim().email().required().messages({
    'string.empty': 'Email is required',
    'string.email': 'Please provide a valid email',
  }),

  password: Joi.string().required().messages({
    'string.empty': 'Password is required',
  }),
})

// Update details validation schema
const updateDetailsSchema = Joi.object({
  name: Joi.string().trim().max(50).required().messages({
    'string.empty': 'Name is required',
    'string.max': 'Name cannot be more than 50 characters',
  }),

  phone: Joi.string()
    .pattern(/^[0-9]{10}$/)
    .required()
    .messages({
      'string.empty': 'Phone number is required',
      'string.pattern.base': 'Phone number must be a valid 10-digit number',
    }),
})

// Update password validation schema
const updatePasswordSchema = Joi.object({
  currentPassword: Joi.string().required().messages({
    'string.empty': 'Current password is required',
  }),

  newPassword: Joi.string().min(6).required().messages({
    'string.empty': 'New password is required',
    'string.min': 'New password must be at least 6 characters',
  }),
})

// Forgot password validation schema
const forgotPasswordSchema = Joi.object({
  email: Joi.string().trim().email().required().messages({
    'string.empty': 'Email is required',
    'string.email': 'Please provide a valid email',
  }),
})

// Reset password validation schema
const resetPasswordSchema = Joi.object({
  password: Joi.string().min(6).required().messages({
    'string.empty': 'Password is required',
    'string.min': 'Password must be at least 6 characters',
  }),
})

module.exports = {
  registerSchema,
  loginSchema,
  updateDetailsSchema,
  updatePasswordSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
}

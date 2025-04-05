const Joi = require('joi')

// Product validation schema
const productSchema = Joi.object({
  name: Joi.string().trim().max(100).required().messages({
    'string.empty': 'Product name is required',
    'string.max': 'Product name cannot be more than 100 characters',
  }),

  description: Joi.string().trim().max(500).required().messages({
    'string.empty': 'Description is required',
    'string.max': 'Description cannot be more than 500 characters',
  }),

  type: Joi.string().trim().required().messages({
    'string.empty': 'Product type is required',
  }),

  category: Joi.string().trim().required().messages({
    'string.empty': 'Product category is required',
  }),

  rate: Joi.number().min(0).required().messages({
    'number.base': 'Rate must be a number',
    'number.min': 'Rate must be at least 0',
    'any.required': 'Rate is required',
  }),

  units: Joi.string().trim().required().messages({
    'string.empty': 'Units are required',
  }),

  stock: Joi.number().integer().min(0).required().messages({
    'number.base': 'Stock must be a number',
    'number.min': 'Stock must be at least 0',
    'number.integer': 'Stock must be an integer',
    'any.required': 'Stock is required',
  }),

  discount: Joi.number().min(0).max(100).default(0).messages({
    'number.base': 'Discount must be a number',
    'number.min': 'Discount must be at least 0',
    'number.max': 'Discount cannot be more than 100%',
  }),

  featured: Joi.boolean().default(false),

  isActive: Joi.boolean().default(true),
})

// Product review validation schema
const productReviewSchema = Joi.object({
  rating: Joi.number().min(1).max(5).required().messages({
    'number.base': 'Rating must be a number',
    'number.min': 'Rating must be at least 1',
    'number.max': 'Rating cannot be more than 5',
    'any.required': 'Rating is required',
  }),

  text: Joi.string().trim().max(200).required().messages({
    'string.empty': 'Review text is required',
    'string.max': 'Review cannot be more than 200 characters',
  }),
})

module.exports = {
  productSchema,
  productReviewSchema,
}

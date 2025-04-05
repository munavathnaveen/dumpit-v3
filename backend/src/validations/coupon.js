const Joi = require('joi')

// Validation schema for coupon creation and updates
const couponSchema = Joi.object({
  code: Joi.string().required().trim().uppercase().min(3).max(20),
  discount: Joi.number().required().min(1).max(100),
  type: Joi.string().required().valid('PERCENTAGE', 'FIXED'),
  minAmount: Joi.number().required().min(0),
  maxDiscount: Joi.number().when('type', {
    is: 'PERCENTAGE',
    then: Joi.number().required().min(1),
    otherwise: Joi.optional(),
  }),
  startDate: Joi.date().required(),
  endDate: Joi.date().required().min(Joi.ref('startDate')),
  isActive: Joi.boolean().default(true),
  usageLimit: Joi.number().integer().min(1).default(null).allow(null),
  description: Joi.string().max(200).allow('').optional(),
})

// Validation schema for coupon validation
const couponValidationSchema = Joi.object({
  code: Joi.string().required().trim().uppercase(),
  orderAmount: Joi.number().required().min(0),
})

module.exports = {couponSchema, couponValidationSchema}

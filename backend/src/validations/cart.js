const Joi = require("joi");

// Cart item validation schema
const cartItemSchema = Joi.object({
    quantity: Joi.number().integer().min(1).default(1).messages({
        "number.base": "Quantity must be a number",
        "number.integer": "Quantity must be an integer",
        "number.min": "Quantity must be at least 1",
    }),
});

module.exports = {
    cartItemSchema,
};

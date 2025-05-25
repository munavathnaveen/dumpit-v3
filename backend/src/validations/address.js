const Joi = require("joi");

// Address validation schema
const addressSchema = Joi.object({
    name: Joi.string().trim().required().messages({
        "string.empty": "Address name is required",
    }),

    village: Joi.string().trim().required().messages({
        "string.empty": "Village name is required",
    }),

    street: Joi.string().trim().required().messages({
        "string.empty": "Street name is required",
    }),

    district: Joi.string().trim().required().messages({
        "string.empty": "District name is required",
    }),

    state: Joi.string().trim().required().messages({
        "string.empty": "State name is required",
    }),

    pincode: Joi.string()
        .pattern(/^[0-9]{6}$/)
        .required()
        .messages({
            "string.empty": "Pincode is required",
            "string.pattern.base": "Pincode must be a valid 6-digit number",
        }),

    phone: Joi.string()
        .pattern(/^[0-9]{10}$/)
        .required()
        .messages({
            "string.empty": "Phone number is required",
            "string.pattern.base": "Phone number must be a valid 10-digit number",
        }),

    isDefault: Joi.boolean().default(false),

    location: Joi.object({
        type: Joi.string().valid("Point").default("Point"),
        coordinates: Joi.array().items(Joi.number()).min(2).max(2).default([0, 0]),
    }).default({
        type: "Point",
        coordinates: [0, 0],
    }),
});

module.exports = {
    addressSchema,
};

const Joi = require("joi");

// Shop validation schema
const shopSchema = Joi.object({
    name: Joi.string().trim().max(50).required().messages({
        "string.empty": "Shop name is required",
        "string.max": "Shop name cannot be more than 50 characters",
    }),

    description: Joi.string().trim().max(500).required().messages({
        "string.empty": "Description is required",
        "string.max": "Description cannot be more than 500 characters",
    }),

    address: Joi.object({
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
    })
        .required()
        .messages({
            "object.base": "Address is required",
        }),

    location: Joi.object({
        type: Joi.string().valid("Point").default("Point"),
        coordinates: Joi.array().items(Joi.number()).min(2).max(2).default([0, 0]),
    }).default({
        type: "Point",
        coordinates: [0, 0],
    }),

    isActive: Joi.boolean().default(true),
});

// Shop review validation schema
const shopReviewSchema = Joi.object({
    rating: Joi.number().min(1).max(5).required().messages({
        "number.base": "Rating must be a number",
        "number.min": "Rating must be at least 1",
        "number.max": "Rating cannot be more than 5",
        "any.required": "Rating is required",
    }),

    text: Joi.string().trim().max(200).required().messages({
        "string.empty": "Review text is required",
        "string.max": "Review cannot be more than 200 characters",
    }),
});

module.exports = {
    shopSchema,
    shopReviewSchema,
};

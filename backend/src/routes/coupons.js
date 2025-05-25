const express = require("express");
const { getCoupons, getActiveCoupons, getCoupon, createCoupon, updateCoupon, deleteCoupon, validateCoupon } = require("../controllers/coupons");

const { protect, authorize } = require("../middleware/auth");
const validateRequest = require("../middleware/validator");
const { couponSchema, couponValidationSchema } = require("../validations/coupon");
const config = require("../config");

const router = express.Router();

// Get active coupons
router.get("/active", getActiveCoupons);

// Validate coupon
router.post("/validate", protect, validateRequest(couponValidationSchema), validateCoupon);

// Get all coupons
router.get("/", protect, authorize(config.constants.userRoles.VENDOR), getCoupons);

// Create coupon
router.post("/", protect, authorize(config.constants.userRoles.VENDOR), validateRequest(couponSchema), createCoupon);

// Get single coupon
router.get("/:id", protect, authorize(config.constants.userRoles.VENDOR), getCoupon);

// Update coupon
router.put("/:id", protect, authorize(config.constants.userRoles.VENDOR), validateRequest(couponSchema), updateCoupon);

// Delete coupon
router.delete("/:id", protect, authorize(config.constants.userRoles.VENDOR), deleteCoupon);

module.exports = router;

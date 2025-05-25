const express = require("express");
const { register, login, logout, getMe, forgotPassword, resetPassword, updateDetails, updatePassword } = require("../controllers/auth");

const validateRequest = require("../middleware/validator");
const { registerSchema, loginSchema, updateDetailsSchema, updatePasswordSchema, forgotPasswordSchema, resetPasswordSchema } = require("../validations/auth");

const router = express.Router();

const { protect } = require("../middleware/auth");

router.post("/register", validateRequest(registerSchema), register);
router.post("/login", validateRequest(loginSchema), login);
router.get("/logout", logout);
router.get("/me", protect, getMe);
router.put("/updatedetails", protect, validateRequest(updateDetailsSchema), updateDetails);
router.put("/updatepassword", protect, validateRequest(updatePasswordSchema), updatePassword);
router.post("/forgotpassword", validateRequest(forgotPasswordSchema), forgotPassword);
router.put("/resetpassword/:resettoken", validateRequest(resetPasswordSchema), resetPassword);

module.exports = router;

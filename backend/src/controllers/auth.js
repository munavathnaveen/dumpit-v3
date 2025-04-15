const crypto = require("crypto");
const User = require("../models/User");
const ErrorResponse = require("../utils/errorResponse");
const { sendEmail, emailTemplates } = require("../utils/email");
const config = require("../config");
const axios = require('axios');

// @desc    Register user
// @route   POST /api/v1/auth/register
// @access  Public
exports.register = async (req, res, next) => {
  try {
    const {
      name,
      email,
      password,
      phone,
      role,
      shopName,
      shopDescription,
      shopAddress,
    } = req.body;
    // Create user
    const user = await User.create({ name, email, password, phone, role });

    // If registering as a vendor, create a shop
    if (role === config.constants.userRoles.VENDOR) {
      const Shop = require("../models/Shop");
      if (!shopName || !shopDescription || !shopAddress) {
        await User.findByIdAndDelete(user._id);
        return next(
          new ErrorResponse(
            "Shop details are required for vendor registration",
            400
          )
        );
      }

      // Get coordinates from Google Maps API
      let coordinates = [0, 0]; // Default coordinates
      
      try {
        // Format the address for the API request
        const addressString = `${shopAddress.village}, ${shopAddress.street}, ${shopAddress.district}, ${shopAddress.state}, ${shopAddress.pincode}`;
        
        // Make request to Google Maps Geocoding API
        const response = await axios.get('https://maps.googleapis.com/maps/api/geocode/json', {
          params: {
            address: addressString,
            key: process.env.GOOGLE_MAPS_API_KEY
          }
        });
        
        // Extract coordinates from response
        if (response.data.status === 'OK' && response.data.results.length > 0) {
          const location = response.data.results[0].geometry.location;
          coordinates = [location.lng, location.lat]; // GeoJSON format is [longitude, latitude]
        }
      } catch (error) {
        console.error('Error fetching coordinates:', error);
        // Continue with default coordinates if geocoding fails
      }
      
      // Create shop associated with the vendor
      const shop = await Shop.create({
        name: shopName,
        description: shopDescription,
        owner: user._id,
        address: shopAddress,
        location: {
          type: 'Point',
          coordinates: coordinates
        }
      });
      
      const updatedUser = await User.findByIdAndUpdate(
        user._id,
        { shop_id: shop._id },
        { new: true }
      );
      console.log(updatedUser);
    }

    // Send welcome email
    try {
      await sendEmail({
        email: user.email,
        subject: "Welcome to Dumpit",
        message: emailTemplates.welcome(user.name),
      });
    } catch (err) {
      console.log("Email could not be sent", err);
    }

    sendTokenResponse(user, 201, res);
  } catch (err) {
    next(err);
  }
};

// @desc    Login user
// @route   POST /api/v1/auth/login
// @access  Public
exports.login = async (req, res, next) => {
  try {
    const { email, password, role } = req.body;

    // Validate email & password
    if (!email || !password) {
      return next(
        new ErrorResponse("Please provide an email and password", 400)
      );
    }

    // Check for user
    const user = await User.findOne({ email }).select("+password");

    if (!user) {
      return next(new ErrorResponse("Invalid credentials", 401));
    }

    // Check if password matches
    const isMatch = await user.matchPassword(password);

    if (!isMatch) {
      return next(new ErrorResponse("Invalid credentials", 401));
    }

    // Check if role matches
    if (role && user.role !== role) {
      return next(new ErrorResponse("Invalid role for this user", 401));
    }

    sendTokenResponse(user, 200, res);
  } catch (err) {
    next(err);
  }
};

// @desc    Log user out / clear cookie
// @route   GET /api/v1/auth/logout
// @access  Private
exports.logout = async (req, res, next) => {
  try {
    res.cookie("token", "none", {
      expires: new Date(Date.now() + 10 * 1000), // 10 seconds
      httpOnly: true,
    });

    res.status(200).json({
      success: true,
      data: {},
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Get current logged in user
// @route   GET /api/v1/auth/me
// @access  Private
exports.getMe = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);

    res.status(200).json({
      success: true,
      data: user,
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Update user details
// @route   PUT /api/v1/auth/updatedetails
// @access  Private
exports.updateDetails = async (req, res, next) => {
  try {
    const fieldsToUpdate = {
      name: req.body.name,
      phone: req.body.phone,
    };

    const user = await User.findByIdAndUpdate(req.user.id, fieldsToUpdate, {
      new: true,
      runValidators: true,
    });

    res.status(200).json({
      success: true,
      data: user,
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Update password
// @route   PUT /api/v1/auth/updatepassword
// @access  Private
exports.updatePassword = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id).select("+password");

    // Check current password
    if (!(await user.matchPassword(req.body.currentPassword))) {
      return next(new ErrorResponse("Password is incorrect", 401));
    }

    user.password = req.body.newPassword;
    await user.save();

    sendTokenResponse(user, 200, res);
  } catch (err) {
    next(err);
  }
};

// @desc    Forgot password
// @route   POST /api/v1/auth/forgotpassword
// @access  Public
exports.forgotPassword = async (req, res, next) => {
  try {
    const user = await User.findOne({ email: req.body.email });

    if (!user) {
      return next(new ErrorResponse("There is no user with that email", 404));
    }

    // Get reset token
    const resetToken = user.getResetPasswordToken();

    await user.save({ validateBeforeSave: false });

    const webUrl = `https://dumpit-password-reset.vercel.app/${resetToken}`;

    try {
      await sendEmail({
        email: user.email,
        subject: "Password reset token",
        message: emailTemplates.resetPassword(user.name, webUrl, resetToken),
      });

      res.status(200).json({ success: true, data: "Email sent" });
    } catch (err) {
      console.log(err);
      user.resetPasswordToken = undefined;
      user.resetPasswordExpire = undefined;

      await user.save({ validateBeforeSave: false });

      return next(new ErrorResponse("Email could not be sent", 500));
    }
  } catch (err) {
    next(err);
  }
};

// @desc    Reset password
// @route   PUT /api/v1/auth/resetpassword/:resettoken
// @access  Public
exports.resetPassword = async (req, res, next) => {
  try {
    // Get hashed token
    const token = req.params.resettoken || req.body.reset - token;
    const resetPasswordToken = crypto
      .createHash("sha256")
      .update(token)
      .digest("hex");

    const user = await User.findOne({
      resetPasswordToken,
      resetPasswordExpire: { $gt: Date.now() },
    });

    if (!user) {
      return next(new ErrorResponse("Invalid token", 400));
    }

    // Set new password
    user.password = req.body.password;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpire = undefined;
    await user.save();

    sendTokenResponse(user, 200, res);
  } catch (err) {
    next(err);
  }
};

// Helper function to get token from model, create cookie and send response
const sendTokenResponse = (user, statusCode, res) => {
  // Create token
  const token = user.getSignedJwtToken();

  // Parse the JWT expire time from config
  const jwtExpire = config.jwt.expire || "30d";
  let expireTime;

  if (jwtExpire.endsWith("d")) {
    // If expire time is in days, convert to milliseconds
    const days = parseInt(jwtExpire.replace("d", ""));
    expireTime = days * 24 * 60 * 60 * 1000;
  } else if (jwtExpire.endsWith("h")) {
    // If expire time is in hours, convert to milliseconds
    const hours = parseInt(jwtExpire.replace("h", ""));
    expireTime = hours * 60 * 60 * 1000;
  } else {
    // Default to 30 days if format is not recognized
    expireTime = 30 * 24 * 60 * 60 * 1000;
  }

  const options = {
    expires: new Date(Date.now() + expireTime),
    httpOnly: true,
  };

  if (config.nodeEnv === "production") {
    options.secure = true;
  }

  res.status(statusCode).cookie("token", token, options).json({
    success: true,
    token,
  });
};


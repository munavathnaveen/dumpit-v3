const User = require("../models/User");
const ErrorResponse = require("../utils/errorResponse");
const { upload, uploadToCloudinary, deleteFromCloudinary } = require("../utils/upload");
const config = require("../config");

// @desc    Get all users
// @route   GET /api/v1/users
// @access  Private (Admin/Vendor)
exports.getUsers = async (req, res, next) => {
    try {
        const users = await User.find();
        res.status(200).json({ success: true, count: users.length, data: users });
    } catch (err) {
        next(err);
    }
};

// @desc    Get single user
// @route   GET /api/v1/users/:id
// @access  Private (Admin/Vendor)
exports.getUser = async (req, res, next) => {
    try {
        const user = await User.findById(req.params.id);

        if (!user) {
            return next(new ErrorResponse(`User not found with id of ${req.params.id}`, 404));
        }

        res.status(200).json({ success: true, data: user });
    } catch (err) {
        next(err);
    }
};

// @desc    Create user
// @route   POST /api/v1/users
// @access  Private (Admin/Vendor)
exports.createUser = async (req, res, next) => {
    try {
        const user = await User.create(req.body);
        res.status(201).json({ success: true, data: user });
    } catch (err) {
        next(err);
    }
};

// @desc    Update user
// @route   PUT /api/v1/users/:id
// @access  Private (Admin/Vendor)
exports.updateUser = async (req, res, next) => {
    try {
        const user = await User.findByIdAndUpdate(req.params.id, req.body, {
            new: true,
            runValidators: true,
        });

        if (!user) {
            return next(new ErrorResponse(`User not found with id of ${req.params.id}`, 404));
        }

        res.status(200).json({ success: true, data: user });
    } catch (err) {
        next(err);
    }
};

// @desc    Delete user
// @route   DELETE /api/v1/users/:id
// @access  Private (Admin/Vendor)
exports.deleteUser = async (req, res, next) => {
    try {
        const user = await User.findByIdAndDelete(req.params.id);

        if (!user) {
            return next(new ErrorResponse(`User not found with id of ${req.params.id}`, 404));
        }

        res.status(200).json({ success: true, data: {} });
    } catch (err) {
        next(err);
    }
};

// @desc    Upload user avatar
// @route   PUT /api/v1/users/:id/avatar
// @access  Private
exports.uploadAvatar = async (req, res, next) => {
    try {
        if (!req.file) {
            return next(new ErrorResponse("No file uploaded", 400));
        }

        const user = await User.findById(req.params.id);
        if (!user) {
            return next(new ErrorResponse(`User not found with id of ${req.params.id}`, 404));
        }

        // Delete old avatar if exists
        if (user.avatar && user.avatar.publicId) {
            await deleteFromCloudinary(user.avatar.publicId);
        }

        // Upload new avatar
        const result = await uploadToCloudinary(req.file, "avatars");

        // Update user avatar
        user.avatar = {
            url: result.secure_url,
            publicId: result.public_id,
        };
        await user.save();

        res.status(200).json({ success: true, data: { url: result.secure_url } });
    } catch (err) {
        next(err);
    }
};

// @desc    Get user notifications
// @route   GET /api/v1/users/:id/notifications
// @access  Private
exports.getUserNotifications = async (req, res, next) => {
    try {
        const user = await User.findById(req.params.id);

        if (!user) {
            return next(new ErrorResponse(`User not found with id of ${req.params.id}`, 404));
        }

        // Check if user is the current logged in user
        if (req.user.id !== req.params.id) {
            return next(new ErrorResponse(`User ${req.user.id} is not authorized to access these notifications`, 401));
        }

        res.status(200).json({ success: true, count: user.notifications.length, data: user.notifications });
    } catch (err) {
        next(err);
    }
};

// @desc    Mark notification as read
// @route   PUT /api/v1/users/:id/notifications/:notificationId
// @access  Private
exports.markNotificationAsRead = async (req, res, next) => {
    try {
        const user = await User.findById(req.params.id);

        if (!user) {
            return next(new ErrorResponse(`User not found with id of ${req.params.id}`, 404));
        }

        // Check if user is the current logged in user
        if (req.user.id !== req.params.id) {
            return next(new ErrorResponse(`User ${req.user.id} is not authorized to update these notifications`, 401));
        }

        // Find notification
        const notification = user.notifications.id(req.params.notificationId);

        if (!notification) {
            return next(new ErrorResponse(`Notification not found with id of ${req.params.notificationId}`, 404));
        }

        // Mark as read
        notification.read = true;
        await user.save();

        res.status(200).json({ success: true, data: notification });
    } catch (err) {
        next(err);
    }
};

// @desc    Update notification settings
// @route   PUT /api/v1/users/:id/notification-settings
// @access  Private
exports.updateNotificationSettings = async (req, res, next) => {
    try {
        const user = await User.findById(req.params.id);

        if (!user) {
            return next(new ErrorResponse(`User not found with id of ${req.params.id}`, 404));
        }

        // Check if user is the current logged in user
        if (req.user.id !== req.params.id) {
            return next(new ErrorResponse(`User ${req.user.id} is not authorized to update these notification settings`, 401));
        }

        // Update settings
        user.notificationSettings = {
            email: req.body.email !== undefined ? req.body.email : user.notificationSettings.email,
            push: req.body.push !== undefined ? req.body.push : user.notificationSettings.push,
        };

        await user.save();

        res.status(200).json({ success: true, data: user.notificationSettings });
    } catch (err) {
        next(err);
    }
};

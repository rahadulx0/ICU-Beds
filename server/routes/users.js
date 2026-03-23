const express = require('express');
const User = require('../models/User');
const auth = require('../middleware/auth');
const checkRole = require('../middleware/role');
const asyncHandler = require('../utils/asyncHandler');

const router = express.Router();

// GET /api/users - Admin: list all users
router.get(
  '/',
  auth,
  checkRole(['admin']),
  asyncHandler(async (req, res) => {
    const { role, page = 1, limit = 50 } = req.query;
    const filter = {};
    if (role) filter.role = role;

    const users = await User.find(filter)
      .select('-password')
      .populate('assigned_hospitals', 'name')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit))
      .lean();

    const total = await User.countDocuments(filter);

    res.json({
      users,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit),
      },
    });
  })
);

// --- Static routes BEFORE parameterized /:id routes ---

// GET /api/users/drivers - Get online drivers
router.get(
  '/drivers',
  auth,
  asyncHandler(async (req, res) => {
    const drivers = await User.find({
      role: 'driver',
      is_online: true,
      is_active: true,
    })
      .select('name phone vehicle_details current_location is_online')
      .lean();

    res.json(drivers);
  })
);

// GET /api/users/stats - Admin: user statistics
router.get(
  '/stats',
  auth,
  checkRole(['admin']),
  asyncHandler(async (req, res) => {
    const stats = await User.aggregate([
      { $group: { _id: '$role', count: { $sum: 1 } } },
    ]);

    const total = await User.countDocuments();
    const activeDrivers = await User.countDocuments({
      role: 'driver',
      is_online: true,
    });

    res.json({ stats, total, activeDrivers });
  })
);

// PUT /api/users/profile - Update own profile
router.put(
  '/profile',
  auth,
  asyncHandler(async (req, res) => {
    const { name, phone } = req.body;
    const updates = {};
    if (name) updates.name = name;
    if (phone) updates.phone = phone;

    const user = await User.findByIdAndUpdate(req.user._id, updates, {
      new: true,
    }).select('-password');

    res.json(user);
  })
);

// PUT /api/users/driver/status - Driver: toggle online status
router.put(
  '/driver/status',
  auth,
  checkRole(['driver']),
  asyncHandler(async (req, res) => {
    const { is_online } = req.body;
    const updates = { is_online };

    // Clear location when going offline
    if (!is_online) {
      updates.current_location = undefined;
    }

    const user = await User.findByIdAndUpdate(req.user._id, updates, {
      new: true,
    }).select('-password');

    res.json(user);
  })
);

// PUT /api/users/change-password - Change own password
router.put(
  '/change-password',
  auth,
  asyncHandler(async (req, res) => {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res
        .status(400)
        .json({ message: 'Current and new password are required' });
    }

    if (newPassword.length < 6) {
      return res
        .status(400)
        .json({ message: 'New password must be at least 6 characters' });
    }

    const user = await User.findById(req.user._id).select('+password');
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) {
      return res
        .status(401)
        .json({ message: 'Current password is incorrect' });
    }

    user.password = newPassword;
    await user.save();

    res.json({ message: 'Password changed successfully' });
  })
);

// --- Parameterized /:id routes ---

// PUT /api/users/:id/role - Admin: update user role
router.put(
  '/:id/role',
  auth,
  checkRole(['admin']),
  asyncHandler(async (req, res) => {
    const { role } = req.body;
    if (
      !['admin', 'moderator', 'hospital_rep', 'user', 'driver'].includes(role)
    ) {
      return res.status(400).json({ message: 'Invalid role' });
    }

    const user = await User.findByIdAndUpdate(
      req.params.id,
      { role },
      { new: true }
    ).select('-password');

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json(user);
  })
);

// PUT /api/users/:id/status - Admin: activate/deactivate
router.put(
  '/:id/status',
  auth,
  checkRole(['admin']),
  asyncHandler(async (req, res) => {
    const { is_active } = req.body;
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { is_active },
      { new: true }
    ).select('-password');

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json(user);
  })
);

module.exports = router;

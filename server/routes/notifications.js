const express = require('express');
const Notification = require('../models/Notification');
const auth = require('../middleware/auth');
const asyncHandler = require('../utils/asyncHandler');

const router = express.Router();

// GET /api/notifications - List user's notifications
router.get(
  '/',
  auth,
  asyncHandler(async (req, res) => {
    const { page = 1, limit = 20 } = req.query;

    const notifications = await Notification.find({ user: req.user._id })
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit))
      .lean();

    const total = await Notification.countDocuments({ user: req.user._id });
    const unreadCount = await Notification.countDocuments({
      user: req.user._id,
      read: false,
    });

    res.json({
      notifications,
      unreadCount,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit),
      },
    });
  })
);

// GET /api/notifications/unread-count
router.get(
  '/unread-count',
  auth,
  asyncHandler(async (req, res) => {
    const count = await Notification.countDocuments({
      user: req.user._id,
      read: false,
    });
    res.json({ count });
  })
);

// --- Static routes BEFORE parameterized /:id routes ---

// PUT /api/notifications/read-all - Mark all as read
router.put(
  '/read-all',
  auth,
  asyncHandler(async (req, res) => {
    await Notification.updateMany(
      { user: req.user._id, read: false },
      { read: true }
    );
    res.json({ message: 'All notifications marked as read' });
  })
);

// PUT /api/notifications/:id/read - Mark single notification as read
router.put(
  '/:id/read',
  auth,
  asyncHandler(async (req, res) => {
    const notification = await Notification.findOneAndUpdate(
      { _id: req.params.id, user: req.user._id },
      { read: true },
      { new: true }
    );

    if (!notification) {
      return res.status(404).json({ message: 'Notification not found' });
    }

    res.json(notification);
  })
);

// DELETE /api/notifications/:id
router.delete(
  '/:id',
  auth,
  asyncHandler(async (req, res) => {
    const notification = await Notification.findOneAndDelete({
      _id: req.params.id,
      user: req.user._id,
    });

    if (!notification) {
      return res.status(404).json({ message: 'Notification not found' });
    }

    res.json({ message: 'Notification deleted' });
  })
);

module.exports = router;

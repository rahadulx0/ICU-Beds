const express = require('express');
const AuditLog = require('../models/AuditLog');
const auth = require('../middleware/auth');
const checkRole = require('../middleware/role');
const asyncHandler = require('../utils/asyncHandler');

const router = express.Router();

// GET /api/audit - Admin: list audit logs
router.get(
  '/',
  auth,
  checkRole(['admin']),
  asyncHandler(async (req, res) => {
    const { action, resource_type, page = 1, limit = 50 } = req.query;
    const filter = {};

    if (action) filter.action = action;
    if (resource_type) filter.resource_type = resource_type;

    const logs = await AuditLog.find(filter)
      .populate('actor', 'name email role')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit))
      .lean();

    const total = await AuditLog.countDocuments(filter);

    res.json({
      logs,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit),
      },
    });
  })
);

module.exports = router;

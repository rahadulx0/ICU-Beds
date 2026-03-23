const express = require('express');
const AmbulanceRequest = require('../models/AmbulanceRequest');
const User = require('../models/User');
const Notification = require('../models/Notification');
const AuditLog = require('../models/AuditLog');
const auth = require('../middleware/auth');
const checkRole = require('../middleware/role');
const validate = require('../middleware/validate');
const { ambulanceLimiter } = require('../middleware/rateLimiter');
const { createRequestSchema } = require('../schemas/ambulance');
const asyncHandler = require('../utils/asyncHandler');
const logger = require('../utils/logger');

const router = express.Router();

// POST /api/ambulance/request - User: create ambulance request
router.post(
  '/request',
  auth,
  checkRole(['user', 'admin']),
  ambulanceLimiter,
  validate(createRequestSchema),
  asyncHandler(async (req, res) => {
    const {
      hospital,
      longitude,
      latitude,
      pickup_address,
      emergency_type,
      notes,
    } = req.validatedBody;

    // Check for existing active request
    const activeRequest = await AmbulanceRequest.findOne({
      patient: req.user._id,
      status: { $in: ['pending', 'accepted', 'en-route'] },
    });

    if (activeRequest) {
      return res.status(400).json({
        message: 'You already have an active ambulance request',
      });
    }

    const request = await AmbulanceRequest.create({
      patient: req.user._id,
      hospital,
      pickup_location: {
        type: 'Point',
        coordinates: [longitude, latitude],
      },
      pickup_address,
      emergency_type,
      notes,
    });

    await request.populate([
      { path: 'patient', select: 'name phone' },
      { path: 'hospital', select: 'name address location' },
    ]);

    // Notify available drivers via Socket.io
    const io = req.app.get('io');
    if (io) {
      io.to('drivers').emit('new-request', request);
    }

    // Notify online drivers
    const onlineDrivers = await User.find({
      role: 'driver',
      is_online: true,
    })
      .select('_id')
      .lean();
    if (onlineDrivers.length > 0) {
      const driverNotifications = onlineDrivers.map((d) => ({
        user: d._id,
        type: 'new_ambulance_request',
        title: 'New Ambulance Request',
        message: `Emergency ${request.emergency_type} request near ${request.pickup_address}`,
        data: { requestId: request._id },
      }));
      Notification.insertMany(driverNotifications).catch(() => {});
    }

    AuditLog.create({
      actor: req.user._id,
      action: 'ambulance.request',
      resource_type: 'ambulance_request',
      resource_id: request._id,
      details: { hospital, emergency_type },
      ip_address: req.ip,
    }).catch(() => {});

    logger.info(
      `Ambulance request created by ${req.user.email} for hospital ${hospital}`
    );
    res.status(201).json(request);
  })
);

// GET /api/ambulance/requests - Get requests based on role
router.get(
  '/requests',
  auth,
  asyncHandler(async (req, res) => {
    const { status, page = 1, limit = 20 } = req.query;
    const filter = {};

    if (status) filter.status = status;

    // Filter based on role
    if (req.user.role === 'user') {
      filter.patient = req.user._id;
    } else if (req.user.role === 'driver') {
      if (status === 'pending') {
        // Drivers see all pending requests
      } else {
        filter.driver = req.user._id;
      }
    }

    const requests = await AmbulanceRequest.find(filter)
      .populate('patient', 'name phone')
      .populate('driver', 'name phone vehicle_details')
      .populate('hospital', 'name address location')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit))
      .lean();

    const total = await AmbulanceRequest.countDocuments(filter);

    res.json({
      requests,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit),
      },
    });
  })
);

// GET /api/ambulance/active - Get current active request
router.get(
  '/active',
  auth,
  asyncHandler(async (req, res) => {
    const filter = {
      status: { $in: ['pending', 'accepted', 'en-route'] },
    };

    if (req.user.role === 'user') {
      filter.patient = req.user._id;
    } else if (req.user.role === 'driver') {
      filter.driver = req.user._id;
    }

    const request = await AmbulanceRequest.findOne(filter)
      .populate('patient', 'name phone')
      .populate('driver', 'name phone vehicle_details current_location')
      .populate('hospital', 'name address location contact');

    res.json(request);
  })
);

// GET /api/ambulance/stats - Admin: request statistics (MUST be before /:id routes)
router.get(
  '/stats',
  auth,
  checkRole(['admin']),
  asyncHandler(async (req, res) => {
    const stats = await AmbulanceRequest.aggregate([
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]);

    const total = await AmbulanceRequest.countDocuments();
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayCount = await AmbulanceRequest.countDocuments({
      createdAt: { $gte: today },
    });

    res.json({ stats, total, todayCount });
  })
);

// PUT /api/ambulance/:id/accept - Driver: accept request
router.put(
  '/:id/accept',
  auth,
  checkRole(['driver']),
  asyncHandler(async (req, res) => {
    const request = await AmbulanceRequest.findOneAndUpdate(
      { _id: req.params.id, status: 'pending' },
      {
        driver: req.user._id,
        status: 'accepted',
        accepted_at: new Date(),
      },
      { new: true }
    )
      .populate('patient', 'name phone')
      .populate('driver', 'name phone vehicle_details')
      .populate('hospital', 'name address location');

    if (!request) {
      return res
        .status(404)
        .json({ message: 'Request not found or already accepted' });
    }

    // Create a private socket room
    const io = req.app.get('io');
    if (io) {
      const roomId = `ambulance-${request._id}`;
      io.to('drivers').emit('request-taken', { requestId: request._id });
      io.emit('request-accepted', { request, roomId });
    }

    // Notify the patient
    Notification.create({
      user: request.patient._id,
      type: 'request_status_change',
      title: 'Driver Assigned',
      message: `${request.driver.name} has accepted your ambulance request`,
      data: { requestId: request._id, status: 'accepted' },
    }).catch(() => {});

    if (io) {
      io.to(`user-${request.patient._id}`).emit('notification', {
        type: 'request_status_change',
        title: 'Driver Assigned',
        message: `${request.driver.name} has accepted your request`,
      });
    }

    AuditLog.create({
      actor: req.user._id,
      action: 'ambulance.accept',
      resource_type: 'ambulance_request',
      resource_id: request._id,
      ip_address: req.ip,
    }).catch(() => {});

    logger.info(
      `Request ${request._id} accepted by driver ${req.user.email}`
    );
    res.json(request);
  })
);

// PUT /api/ambulance/:id/status - Update request status
router.put(
  '/:id/status',
  auth,
  checkRole(['driver', 'admin']),
  asyncHandler(async (req, res) => {
    const { status } = req.body;
    const validTransitions = {
      accepted: ['en-route', 'cancelled'],
      'en-route': ['completed', 'cancelled'],
    };

    const request = await AmbulanceRequest.findById(req.params.id);
    if (!request) {
      return res.status(404).json({ message: 'Request not found' });
    }

    if (
      req.user.role === 'driver' &&
      request.driver?.toString() !== req.user._id.toString()
    ) {
      return res
        .status(403)
        .json({ message: 'Not your assigned request' });
    }

    const allowed = validTransitions[request.status];
    if (!allowed || !allowed.includes(status)) {
      return res.status(400).json({
        message: `Cannot transition from ${request.status} to ${status}`,
      });
    }

    const previousStatus = request.status;
    request.status = status;
    if (status === 'completed') {
      request.completed_at = new Date();
    }
    await request.save();

    const io = req.app.get('io');
    if (io) {
      const roomId = `ambulance-${request._id}`;
      io.to(roomId).emit('status-update', {
        requestId: request._id,
        status,
      });
    }

    await request.populate([
      { path: 'patient', select: 'name phone' },
      { path: 'driver', select: 'name phone vehicle_details' },
      { path: 'hospital', select: 'name address location' },
    ]);

    // Notify patient of status change
    const statusMessages = {
      'en-route': 'Ambulance is on the way',
      completed: 'Your ambulance trip has been completed',
      cancelled: 'Your ambulance request has been cancelled',
    };
    if (statusMessages[status]) {
      Notification.create({
        user: request.patient._id || request.patient,
        type: 'request_status_change',
        title: statusMessages[status],
        message: statusMessages[status],
        data: { requestId: request._id, status },
      }).catch(() => {});

      if (io) {
        io.to(`user-${request.patient._id || request.patient}`).emit(
          'notification',
          {
            type: 'request_status_change',
            title: statusMessages[status],
          }
        );
      }
    }

    AuditLog.create({
      actor: req.user._id,
      action: 'ambulance.status_change',
      resource_type: 'ambulance_request',
      resource_id: request._id,
      details: { from: previousStatus, to: status },
      ip_address: req.ip,
    }).catch(() => {});

    res.json(request);
  })
);

// PUT /api/ambulance/:id/cancel - User: cancel request
router.put(
  '/:id/cancel',
  auth,
  asyncHandler(async (req, res) => {
    const request = await AmbulanceRequest.findOne({
      _id: req.params.id,
      patient: req.user._id,
      status: { $in: ['pending', 'accepted'] },
    });

    if (!request) {
      return res
        .status(404)
        .json({ message: 'Request not found or cannot be cancelled' });
    }

    request.status = 'cancelled';
    await request.save();

    const io = req.app.get('io');
    if (io) {
      const roomId = `ambulance-${request._id}`;
      io.to(roomId).emit('request-cancelled', { requestId: request._id });
      io.to('drivers').emit('request-cancelled', { requestId: request._id });
    }

    res.json(request);
  })
);

module.exports = router;

const express = require('express');
const Hospital = require('../models/Hospital');
const AmbulanceRequest = require('../models/AmbulanceRequest');
const User = require('../models/User');
const Notification = require('../models/Notification');
const AuditLog = require('../models/AuditLog');
const BedHistory = require('../models/BedHistory');
const auth = require('../middleware/auth');
const checkRole = require('../middleware/role');
const validate = require('../middleware/validate');
const {
  createHospitalSchema,
  updateBedSchema,
  updateHospitalSchema,
  nearbyQuerySchema,
} = require('../schemas/hospital');
const { cacheGet, cacheSet, cacheInvalidate } = require('../config/redis');
const asyncHandler = require('../utils/asyncHandler');
const logger = require('../utils/logger');

const router = express.Router();

// GET /api/hospitals - Public: list all active hospitals
router.get(
  '/',
  asyncHandler(async (req, res) => {
    // Try cache first
    const cached = await cacheGet('hospitals:active:all');
    if (cached) return res.json(cached);

    const hospitals = await Hospital.find({ status: 'active' })
      .select('-managed_by -__v')
      .lean();

    await cacheSet('hospitals:active:all', hospitals, 60);
    res.json(hospitals);
  })
);

// GET /api/hospitals/nearby - Public: geospatial search
router.get(
  '/nearby',
  validate(nearbyQuerySchema, 'query'),
  asyncHandler(async (req, res) => {
    const { lng, lat, radius, beds } = req.validatedQuery;

    const query = {
      status: 'active',
      location: {
        $near: {
          $geometry: {
            type: 'Point',
            coordinates: [lng, lat],
          },
          $maxDistance: radius,
        },
      },
    };

    if (beds === 'true') {
      query.available_icu_beds = { $gt: 0 };
    }

    const hospitals = await Hospital.find(query)
      .select('-managed_by -__v')
      .lean();
    res.json(hospitals);
  })
);

// GET /api/hospitals/:id
router.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const hospital = await Hospital.findById(req.params.id)
      .populate('managed_by', 'name email role')
      .lean();

    if (!hospital) {
      return res.status(404).json({ message: 'Hospital not found' });
    }

    res.json(hospital);
  })
);

// POST /api/hospitals - Admin only
router.post(
  '/',
  auth,
  checkRole(['admin']),
  validate(createHospitalSchema),
  asyncHandler(async (req, res) => {
    const {
      name,
      address,
      longitude,
      latitude,
      total_icu_beds,
      available_icu_beds,
      contact,
    } = req.validatedBody;

    const hospital = await Hospital.create({
      name,
      address,
      location: {
        type: 'Point',
        coordinates: [longitude, latitude],
      },
      total_icu_beds,
      available_icu_beds: available_icu_beds ?? total_icu_beds,
      contact,
    });

    await cacheInvalidate('hospitals:*');

    AuditLog.create({
      actor: req.user._id,
      action: 'hospital.create',
      resource_type: 'hospital',
      resource_id: hospital._id,
      details: { name: hospital.name },
      ip_address: req.ip,
    }).catch(() => {});

    logger.info(`Hospital created: ${hospital.name} by ${req.user.email}`);
    res.status(201).json(hospital);
  })
);

// PUT /api/hospitals/:id - Admin/Moderator
router.put(
  '/:id',
  auth,
  checkRole(['admin', 'moderator']),
  validate(updateHospitalSchema),
  asyncHandler(async (req, res) => {
    const hospital = await Hospital.findById(req.params.id);
    if (!hospital) {
      return res.status(404).json({ message: 'Hospital not found' });
    }

    // Moderators can only manage assigned hospitals
    if (
      req.user.role === 'moderator' &&
      !req.user.assigned_hospitals.some(
        (id) => id.toString() === hospital._id.toString()
      )
    ) {
      return res
        .status(403)
        .json({ message: 'Not assigned to this hospital' });
    }

    const updates = req.validatedBody;
    if (updates.longitude !== undefined && updates.latitude !== undefined) {
      updates.location = {
        type: 'Point',
        coordinates: [updates.longitude, updates.latitude],
      };
      delete updates.longitude;
      delete updates.latitude;
    }

    Object.assign(hospital, updates);
    await hospital.save();

    await cacheInvalidate('hospitals:*');

    AuditLog.create({
      actor: req.user._id,
      action: 'hospital.update',
      resource_type: 'hospital',
      resource_id: hospital._id,
      details: { name: hospital.name, updates: Object.keys(updates) },
      ip_address: req.ip,
    }).catch(() => {});

    logger.info(`Hospital updated: ${hospital.name} by ${req.user.email}`);
    res.json(hospital);
  })
);

// PATCH /api/hospitals/:id/beds - Hospital Rep: update bed count with OCC
router.patch(
  '/:id/beds',
  auth,
  checkRole(['admin', 'moderator', 'hospital_rep']),
  validate(updateBedSchema),
  asyncHandler(async (req, res) => {
    const { available_icu_beds, version } = req.validatedBody;

    // Hospital reps can only update their assigned hospital
    if (
      req.user.role === 'hospital_rep' &&
      !req.user.assigned_hospitals.some(
        (id) => id.toString() === req.params.id
      )
    ) {
      return res
        .status(403)
        .json({ message: 'Not assigned to this hospital' });
    }

    // Validate bed count BEFORE writing to DB
    const existing = await Hospital.findById(req.params.id);
    if (!existing) {
      return res.status(404).json({ message: 'Hospital not found' });
    }

    if (available_icu_beds < 0) {
      return res
        .status(400)
        .json({ message: 'Available beds cannot be negative' });
    }

    if (available_icu_beds > existing.total_icu_beds) {
      return res.status(400).json({
        message: 'Available beds cannot exceed total beds',
      });
    }

    // Optimistic Concurrency Control
    const hospital = await Hospital.findOneAndUpdate(
      {
        _id: req.params.id,
        version: version,
      },
      {
        available_icu_beds,
        $inc: { version: 1 },
      },
      { new: true }
    );

    if (!hospital) {
      return res.status(409).json({
        message:
          'Conflict: data was modified by another user. Please refresh and try again.',
        currentVersion: existing.version,
        currentBeds: existing.available_icu_beds,
      });
    }

    await cacheInvalidate('hospitals:*');

    // Record bed history
    BedHistory.create({
      hospital: hospital._id,
      available_icu_beds: hospital.available_icu_beds,
      total_icu_beds: hospital.total_icu_beds,
      updated_by: req.user._id,
    }).catch(() => {});

    // Low bed alert notification to assigned managers
    if (
      hospital.available_icu_beds === 0 ||
      hospital.available_icu_beds / hospital.total_icu_beds <= 0.2
    ) {
      const managedBy = await Hospital.findById(hospital._id)
        .select('managed_by')
        .lean();
      if (managedBy?.managed_by?.length) {
        const notifications = managedBy.managed_by.map((userId) => ({
          user: userId,
          type: 'low_bed_alert',
          title: 'Low ICU Bed Alert',
          message: `${hospital.name} has ${hospital.available_icu_beds}/${hospital.total_icu_beds} ICU beds available`,
          data: { hospitalId: hospital._id },
        }));
        Notification.insertMany(notifications).catch(() => {});

        const io2 = req.app.get('io');
        if (io2) {
          managedBy.managed_by.forEach((userId) => {
            io2.to(`user-${userId}`).emit('notification', {
              type: 'low_bed_alert',
              title: 'Low ICU Bed Alert',
              message: `${hospital.name}: ${hospital.available_icu_beds}/${hospital.total_icu_beds} beds`,
            });
          });
        }
      }
    }

    AuditLog.create({
      actor: req.user._id,
      action: 'hospital.bed_update',
      resource_type: 'hospital',
      resource_id: hospital._id,
      details: { available_icu_beds, previous: existing.available_icu_beds },
      ip_address: req.ip,
    }).catch(() => {});

    logger.info(
      `Bed update: ${hospital.name} → ${available_icu_beds} beds by ${req.user.email}`
    );

    // Emit real-time update via Socket.io
    const io = req.app.get('io');
    if (io) {
      io.emit('bed-update', {
        hospitalId: hospital._id,
        available_icu_beds: hospital.available_icu_beds,
        total_icu_beds: hospital.total_icu_beds,
        version: hospital.version,
      });
    }

    res.json(hospital);
  })
);

// DELETE /api/hospitals/:id - Admin only
router.delete(
  '/:id',
  auth,
  checkRole(['admin']),
  asyncHandler(async (req, res) => {
    const hospital = await Hospital.findById(req.params.id);
    if (!hospital) {
      return res.status(404).json({ message: 'Hospital not found' });
    }

    // Check for active ambulance requests
    const activeRequests = await AmbulanceRequest.countDocuments({
      hospital: req.params.id,
      status: { $in: ['pending', 'accepted', 'en-route'] },
    });
    if (activeRequests > 0) {
      return res.status(409).json({
        message: `Cannot delete hospital with ${activeRequests} active ambulance request(s)`,
      });
    }

    await hospital.deleteOne();

    // Remove hospital from all users' assigned_hospitals
    await User.updateMany(
      { assigned_hospitals: hospital._id },
      { $pull: { assigned_hospitals: hospital._id } }
    );

    await cacheInvalidate('hospitals:*');

    AuditLog.create({
      actor: req.user._id,
      action: 'hospital.delete',
      resource_type: 'hospital',
      resource_id: hospital._id,
      details: { name: hospital.name },
      ip_address: req.ip,
    }).catch(() => {});

    logger.info(`Hospital deleted: ${hospital.name} by ${req.user.email}`);
    res.json({ message: 'Hospital deleted successfully' });
  })
);

// PUT /api/hospitals/:id/assign - Admin: assign reps/moderators
router.put(
  '/:id/assign',
  auth,
  checkRole(['admin']),
  asyncHandler(async (req, res) => {
    const { userId } = req.body;
    const hospital = await Hospital.findById(req.params.id);
    if (!hospital) {
      return res.status(404).json({ message: 'Hospital not found' });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    if (!['moderator', 'hospital_rep'].includes(user.role)) {
      return res
        .status(400)
        .json({ message: 'User must be a moderator or hospital rep' });
    }

    if (!hospital.managed_by.includes(userId)) {
      hospital.managed_by.push(userId);
      await hospital.save();
    }

    await User.findByIdAndUpdate(userId, {
      $addToSet: { assigned_hospitals: hospital._id },
    });

    const updated = await Hospital.findById(req.params.id).populate(
      'managed_by',
      'name email role'
    );
    res.json(updated);
  })
);

// PUT /api/hospitals/:id/unassign - Admin: unassign reps/moderators
router.put(
  '/:id/unassign',
  auth,
  checkRole(['admin']),
  asyncHandler(async (req, res) => {
    const { userId } = req.body;
    const hospital = await Hospital.findById(req.params.id);
    if (!hospital) {
      return res.status(404).json({ message: 'Hospital not found' });
    }

    hospital.managed_by = hospital.managed_by.filter(
      (id) => id.toString() !== userId
    );
    await hospital.save();

    await User.findByIdAndUpdate(userId, {
      $pull: { assigned_hospitals: hospital._id },
    });

    const updated = await Hospital.findById(req.params.id).populate(
      'managed_by',
      'name email role'
    );
    res.json(updated);
  })
);

module.exports = router;

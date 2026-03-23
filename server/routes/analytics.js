const express = require('express');
const AmbulanceRequest = require('../models/AmbulanceRequest');
const BedHistory = require('../models/BedHistory');
const Hospital = require('../models/Hospital');
const auth = require('../middleware/auth');
const asyncHandler = require('../utils/asyncHandler');

const router = express.Router();

// GET /api/analytics/bed-history/:hospitalId - Public
router.get(
  '/bed-history/:hospitalId',
  asyncHandler(async (req, res) => {
    const { period = '7d' } = req.query;
    const periodMap = { '24h': 1, '7d': 7, '30d': 30, '90d': 90 };
    const days = periodMap[period] || 7;
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const history = await BedHistory.find({
      hospital: req.params.hospitalId,
      createdAt: { $gte: since },
    })
      .sort({ createdAt: 1 })
      .select('available_icu_beds total_icu_beds createdAt')
      .lean();

    res.json(history);
  })
);

// GET /api/analytics/requests - Request stats (auth required)
router.get(
  '/requests',
  auth,
  asyncHandler(async (req, res) => {
    const { period = '7d' } = req.query;
    const periodMap = { '7d': 7, '30d': 30, '90d': 90 };
    const days = periodMap[period] || 7;
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const stats = await AmbulanceRequest.aggregate([
      { $match: { createdAt: { $gte: since } } },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          total: { $sum: 1 },
          completed: {
            $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] },
          },
          cancelled: {
            $sum: { $cond: [{ $eq: ['$status', 'cancelled'] }, 1, 0] },
          },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    res.json(stats);
  })
);

// GET /api/analytics/response-time
router.get(
  '/response-time',
  auth,
  asyncHandler(async (req, res) => {
    const { period = '7d' } = req.query;
    const periodMap = { '7d': 7, '30d': 30, '90d': 90 };
    const days = periodMap[period] || 7;
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const result = await AmbulanceRequest.aggregate([
      {
        $match: {
          createdAt: { $gte: since },
          status: { $in: ['completed', 'en-route', 'accepted'] },
          accepted_at: { $exists: true },
        },
      },
      {
        $group: {
          _id: null,
          avgAcceptTime: {
            $avg: { $subtract: ['$accepted_at', '$createdAt'] },
          },
          count: { $sum: 1 },
        },
      },
    ]);

    const avgMinutes =
      result.length > 0 ? Math.round(result[0].avgAcceptTime / 60000) : null;
    res.json({
      avgResponseMinutes: avgMinutes,
      sampleSize: result.length > 0 ? result[0].count : 0,
    });
  })
);

// GET /api/analytics/hospitals - Bed utilization overview
router.get(
  '/hospitals',
  auth,
  asyncHandler(async (req, res) => {
    const hospitals = await Hospital.find({ status: 'active' })
      .select('name total_icu_beds available_icu_beds')
      .lean();

    const stats = hospitals.map((h) => ({
      _id: h._id,
      name: h.name,
      total: h.total_icu_beds,
      available: h.available_icu_beds,
      occupied: h.total_icu_beds - h.available_icu_beds,
      utilization:
        h.total_icu_beds > 0
          ? Math.round(
              ((h.total_icu_beds - h.available_icu_beds) / h.total_icu_beds) *
                100
            )
          : 0,
    }));

    res.json(stats);
  })
);

module.exports = router;

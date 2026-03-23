const express = require('express');
const Review = require('../models/Review');
const AmbulanceRequest = require('../models/AmbulanceRequest');
const auth = require('../middleware/auth');
const validate = require('../middleware/validate');
const { createReviewSchema } = require('../schemas/review');
const asyncHandler = require('../utils/asyncHandler');

const router = express.Router();

// POST /api/reviews - Create a review for a completed trip
router.post(
  '/',
  auth,
  validate(createReviewSchema),
  asyncHandler(async (req, res) => {
    const { hospital, ambulance_request, rating, comment } = req.validatedBody;

    // Verify the request belongs to this user and is completed
    const request = await AmbulanceRequest.findOne({
      _id: ambulance_request,
      patient: req.user._id,
      status: 'completed',
    });

    if (!request) {
      return res.status(404).json({
        message: 'Completed ambulance request not found',
      });
    }

    // Check for existing review
    const existing = await Review.findOne({ ambulance_request });
    if (existing) {
      return res.status(409).json({ message: 'You have already reviewed this trip' });
    }

    const review = await Review.create({
      user: req.user._id,
      hospital,
      ambulance_request,
      rating,
      comment,
    });

    await review.populate('user', 'name');

    res.status(201).json(review);
  })
);

// GET /api/reviews/hospital/:hospitalId - Public: list reviews for a hospital
router.get(
  '/hospital/:hospitalId',
  asyncHandler(async (req, res) => {
    const { page = 1, limit = 10 } = req.query;

    const reviews = await Review.find({ hospital: req.params.hospitalId })
      .populate('user', 'name')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit))
      .lean();

    const total = await Review.countDocuments({ hospital: req.params.hospitalId });

    // Calculate average rating
    const avgResult = await Review.aggregate([
      { $match: { hospital: reviews.length > 0 ? reviews[0].hospital : null } },
      { $group: { _id: null, avg: { $avg: '$rating' }, count: { $sum: 1 } } },
    ]);

    const avgRating = avgResult.length > 0 ? Math.round(avgResult[0].avg * 10) / 10 : 0;
    const reviewCount = avgResult.length > 0 ? avgResult[0].count : 0;

    res.json({
      reviews,
      avgRating,
      reviewCount,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit),
      },
    });
  })
);

// GET /api/reviews/my - Get current user's reviews
router.get(
  '/my',
  auth,
  asyncHandler(async (req, res) => {
    const reviews = await Review.find({ user: req.user._id })
      .populate('hospital', 'name')
      .sort({ createdAt: -1 })
      .lean();

    res.json(reviews);
  })
);

// DELETE /api/reviews/:id - Delete own review (or admin can delete any)
router.delete(
  '/:id',
  auth,
  asyncHandler(async (req, res) => {
    const filter = { _id: req.params.id };
    if (req.user.role !== 'admin') {
      filter.user = req.user._id;
    }

    const review = await Review.findOneAndDelete(filter);
    if (!review) {
      return res.status(404).json({ message: 'Review not found' });
    }

    res.json({ message: 'Review deleted' });
  })
);

module.exports = router;

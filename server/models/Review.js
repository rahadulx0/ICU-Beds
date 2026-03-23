const mongoose = require('mongoose');

const reviewSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    hospital: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Hospital',
      required: true,
    },
    ambulance_request: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'AmbulanceRequest',
      required: true,
    },
    rating: {
      type: Number,
      required: true,
      min: 1,
      max: 5,
    },
    comment: {
      type: String,
      maxlength: 1000,
      trim: true,
    },
  },
  { timestamps: true }
);

reviewSchema.index({ hospital: 1, createdAt: -1 });
reviewSchema.index({ user: 1 });
reviewSchema.index({ ambulance_request: 1 }, { unique: true });

module.exports = mongoose.model('Review', reviewSchema);

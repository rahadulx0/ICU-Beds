const mongoose = require('mongoose');

const ambulanceRequestSchema = new mongoose.Schema(
  {
    patient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    driver: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    hospital: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Hospital',
      required: true,
    },
    pickup_location: {
      type: {
        type: String,
        enum: ['Point'],
        default: 'Point',
      },
      coordinates: {
        type: [Number],
        required: true,
      },
    },
    pickup_address: {
      type: String,
      required: true,
      trim: true,
    },
    status: {
      type: String,
      enum: ['pending', 'accepted', 'en-route', 'completed', 'cancelled'],
      default: 'pending',
    },
    emergency_type: {
      type: String,
      enum: ['critical', 'moderate', 'stable'],
      default: 'moderate',
    },
    notes: {
      type: String,
      maxlength: 500,
    },
    accepted_at: Date,
    completed_at: Date,
  },
  {
    timestamps: true,
  }
);

ambulanceRequestSchema.index({ pickup_location: '2dsphere' });
ambulanceRequestSchema.index({ status: 1 });
ambulanceRequestSchema.index({ patient: 1 });
ambulanceRequestSchema.index({ driver: 1 });

module.exports = mongoose.model('AmbulanceRequest', ambulanceRequestSchema);

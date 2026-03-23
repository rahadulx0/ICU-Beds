const mongoose = require('mongoose');

const hospitalSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200,
    },
    address: {
      type: String,
      required: true,
      trim: true,
    },
    location: {
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
    total_icu_beds: {
      type: Number,
      required: true,
      min: 0,
    },
    available_icu_beds: {
      type: Number,
      required: true,
      min: 0,
    },
    contact: {
      phone: String,
      email: String,
    },
    managed_by: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
    status: {
      type: String,
      enum: ['active', 'inactive', 'maintenance'],
      default: 'active',
    },
    version: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

hospitalSchema.index({ location: '2dsphere' });
hospitalSchema.index({ status: 1 });
hospitalSchema.index({ available_icu_beds: -1 });

module.exports = mongoose.model('Hospital', hospitalSchema);

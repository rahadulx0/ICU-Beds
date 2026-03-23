const mongoose = require('mongoose');

const bedHistorySchema = new mongoose.Schema(
  {
    hospital: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Hospital',
      required: true,
      index: true,
    },
    available_icu_beds: {
      type: Number,
      required: true,
    },
    total_icu_beds: {
      type: Number,
      required: true,
    },
    updated_by: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  {
    timestamps: true,
  }
);

bedHistorySchema.index({ hospital: 1, createdAt: -1 });
bedHistorySchema.index({ createdAt: 1 }, { expireAfterSeconds: 90 * 24 * 60 * 60 });

module.exports = mongoose.model('BedHistory', bedHistorySchema);

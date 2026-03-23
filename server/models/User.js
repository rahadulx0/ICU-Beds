const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      required: true,
      minlength: 6,
      select: false,
    },
    phone: {
      type: String,
      trim: true,
    },
    role: {
      type: String,
      enum: ['admin', 'moderator', 'hospital_rep', 'user', 'driver'],
      default: 'user',
    },
    assigned_hospitals: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Hospital',
      },
    ],
    // Driver-specific fields
    vehicle_details: {
      plate_number: String,
      vehicle_type: {
        type: String,
        enum: ['basic', 'advanced', 'icu_ambulance'],
      },
    },
    is_online: {
      type: Boolean,
      default: false,
    },
    current_location: {
      type: {
        type: String,
        enum: ['Point'],
      },
      coordinates: [Number],
    },
    is_active: {
      type: Boolean,
      default: true,
    },
    // Email verification
    email_verified: {
      type: Boolean,
      default: false,
    },
    verification_token: String,
    verification_expires: Date,
    // Password reset
    reset_token: String,
    reset_expires: Date,
    // Web push subscriptions
    push_subscriptions: [
      {
        endpoint: String,
        keys: {
          p256dh: String,
          auth: String,
        },
      },
    ],
  },
  {
    timestamps: true,
  }
);

userSchema.index({ current_location: '2dsphere' });
userSchema.index({ role: 1 });

userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

userSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

userSchema.methods.toJSON = function () {
  const obj = this.toObject();
  delete obj.password;
  return obj;
};

module.exports = mongoose.model('User', userSchema);

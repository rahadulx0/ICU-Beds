const express = require('express');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const auth = require('../middleware/auth');
const validate = require('../middleware/validate');
const { authLimiter } = require('../middleware/rateLimiter');
const { registerSchema, loginSchema } = require('../schemas/auth');
const { sendVerificationEmail, sendPasswordResetEmail } = require('../utils/email');
const asyncHandler = require('../utils/asyncHandler');

const router = express.Router();

const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: '7d' });
};

const setCookie = (res, token) => {
  res.cookie('token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });
};

// POST /api/auth/register
router.post(
  '/register',
  authLimiter,
  validate(registerSchema),
  asyncHandler(async (req, res) => {
    const { name, email, password, phone, role, vehicle_details } =
      req.validatedBody;

    // Defense in depth: only allow self-registration as user or driver
    if (role && !['user', 'driver'].includes(role)) {
      return res
        .status(403)
        .json({ message: 'Cannot self-register with this role' });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(409).json({ message: 'Email already registered' });
    }

    // Generate verification token
    const verificationToken = crypto.randomBytes(32).toString('hex');
    const hashedToken = crypto
      .createHash('sha256')
      .update(verificationToken)
      .digest('hex');

    const userData = {
      name,
      email,
      password,
      phone,
      role,
      verification_token: hashedToken,
      verification_expires: new Date(Date.now() + 24 * 60 * 60 * 1000),
    };
    if (role === 'driver' && vehicle_details) {
      userData.vehicle_details = vehicle_details;
    }

    const user = await User.create(userData);
    const token = generateToken(user._id);
    setCookie(res, token);

    // Send verification email (non-blocking)
    sendVerificationEmail(email, verificationToken).catch(() => {});

    res.status(201).json({
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        phone: user.phone,
        assigned_hospitals: user.assigned_hospitals,
        vehicle_details: user.vehicle_details,
        is_online: user.is_online,
        email_verified: user.email_verified,
      },
    });
  })
);

// POST /api/auth/login
router.post(
  '/login',
  authLimiter,
  validate(loginSchema),
  asyncHandler(async (req, res) => {
    const { email, password } = req.validatedBody;

    const user = await User.findOne({ email }).select('+password');
    if (!user || !(await user.comparePassword(password))) {
      return res
        .status(401)
        .json({ message: 'Invalid email or password' });
    }

    if (!user.is_active) {
      return res
        .status(403)
        .json({ message: 'Account has been deactivated' });
    }

    const token = generateToken(user._id);
    setCookie(res, token);

    res.json({
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        phone: user.phone,
        assigned_hospitals: user.assigned_hospitals,
        vehicle_details: user.vehicle_details,
        is_online: user.is_online,
        email_verified: user.email_verified,
      },
    });
  })
);

// POST /api/auth/logout
router.post('/logout', (_req, res) => {
  res.cookie('token', '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
    expires: new Date(0),
  });
  res.json({ message: 'Logged out successfully' });
});

// GET /api/auth/me
router.get('/me', auth, async (_req, res) => {
  res.json({
    user: {
      _id: _req.user._id,
      name: _req.user.name,
      email: _req.user.email,
      role: _req.user.role,
      phone: _req.user.phone,
      assigned_hospitals: _req.user.assigned_hospitals,
      vehicle_details: _req.user.vehicle_details,
      is_online: _req.user.is_online,
      email_verified: _req.user.email_verified,
    },
  });
});

// GET /api/auth/verify-email/:token
router.get(
  '/verify-email/:token',
  asyncHandler(async (req, res) => {
    const hashedToken = crypto
      .createHash('sha256')
      .update(req.params.token)
      .digest('hex');

    const user = await User.findOne({
      verification_token: hashedToken,
      verification_expires: { $gt: Date.now() },
    });

    if (!user) {
      return res
        .status(400)
        .json({ message: 'Invalid or expired verification link' });
    }

    user.email_verified = true;
    user.verification_token = undefined;
    user.verification_expires = undefined;
    await user.save();

    res.json({ message: 'Email verified successfully' });
  })
);

// POST /api/auth/resend-verification
router.post(
  '/resend-verification',
  auth,
  authLimiter,
  asyncHandler(async (req, res) => {
    if (req.user.email_verified) {
      return res
        .status(400)
        .json({ message: 'Email already verified' });
    }

    const verificationToken = crypto.randomBytes(32).toString('hex');
    const hashedToken = crypto
      .createHash('sha256')
      .update(verificationToken)
      .digest('hex');

    req.user.verification_token = hashedToken;
    req.user.verification_expires = new Date(
      Date.now() + 24 * 60 * 60 * 1000
    );
    await req.user.save();

    await sendVerificationEmail(req.user.email, verificationToken);

    res.json({ message: 'Verification email sent' });
  })
);

// POST /api/auth/forgot-password
router.post(
  '/forgot-password',
  authLimiter,
  asyncHandler(async (req, res) => {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ message: 'Email is required' });
    }

    const user = await User.findOne({ email: email.toLowerCase() });

    // Always return success to prevent email enumeration
    if (!user) {
      return res.json({
        message: 'If that email is registered, a reset link has been sent',
      });
    }

    const resetToken = crypto.randomBytes(32).toString('hex');
    const hashedToken = crypto
      .createHash('sha256')
      .update(resetToken)
      .digest('hex');

    user.reset_token = hashedToken;
    user.reset_expires = new Date(Date.now() + 60 * 60 * 1000);
    await user.save();

    await sendPasswordResetEmail(email, resetToken);

    res.json({
      message: 'If that email is registered, a reset link has been sent',
    });
  })
);

// POST /api/auth/reset-password/:token
router.post(
  '/reset-password/:token',
  asyncHandler(async (req, res) => {
    const { password } = req.body;
    if (!password || password.length < 6) {
      return res
        .status(400)
        .json({ message: 'Password must be at least 6 characters' });
    }

    const hashedToken = crypto
      .createHash('sha256')
      .update(req.params.token)
      .digest('hex');

    const user = await User.findOne({
      reset_token: hashedToken,
      reset_expires: { $gt: Date.now() },
    });

    if (!user) {
      return res
        .status(400)
        .json({ message: 'Invalid or expired reset link' });
    }

    user.password = password;
    user.reset_token = undefined;
    user.reset_expires = undefined;
    await user.save();

    res.json({ message: 'Password reset successfully' });
  })
);

module.exports = router;

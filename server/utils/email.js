const nodemailer = require('nodemailer');
const logger = require('./logger');

let transporter = null;

const initializeEmail = () => {
  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS } = process.env;

  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) {
    logger.warn('Email not configured. Set SMTP_HOST, SMTP_USER, SMTP_PASS in .env');
    return;
  }

  transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: parseInt(SMTP_PORT) || 587,
    secure: parseInt(SMTP_PORT) === 465,
    auth: {
      user: SMTP_USER,
      pass: SMTP_PASS,
    },
  });

  logger.info('Email transport initialized');
};

const sendEmail = async ({ to, subject, html }) => {
  if (!transporter) {
    logger.warn(`Email not sent (no transport configured): ${subject} -> ${to}`);
    return false;
  }

  try {
    await transporter.sendMail({
      from: process.env.SMTP_FROM || process.env.SMTP_USER,
      to,
      subject,
      html,
    });
    logger.info(`Email sent: ${subject} -> ${to}`);
    return true;
  } catch (error) {
    logger.error(`Email failed: ${error.message}`);
    return false;
  }
};

const sendVerificationEmail = async (email, token) => {
  const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';
  const verifyUrl = `${clientUrl}/verify-email/${token}`;

  return sendEmail({
    to: email,
    subject: 'Verify your email - ICU Beds',
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Email Verification</h2>
        <p>Click the button below to verify your email address:</p>
        <a href="${verifyUrl}" style="display: inline-block; padding: 12px 24px; background: #2563eb; color: white; text-decoration: none; border-radius: 8px; margin: 16px 0;">
          Verify Email
        </a>
        <p style="color: #666; font-size: 14px;">This link expires in 24 hours.</p>
        <p style="color: #666; font-size: 14px;">If you didn't create an account, ignore this email.</p>
      </div>
    `,
  });
};

const sendPasswordResetEmail = async (email, token) => {
  const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';
  const resetUrl = `${clientUrl}/reset-password/${token}`;

  return sendEmail({
    to: email,
    subject: 'Reset your password - ICU Beds',
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Password Reset</h2>
        <p>Click the button below to reset your password:</p>
        <a href="${resetUrl}" style="display: inline-block; padding: 12px 24px; background: #2563eb; color: white; text-decoration: none; border-radius: 8px; margin: 16px 0;">
          Reset Password
        </a>
        <p style="color: #666; font-size: 14px;">This link expires in 1 hour.</p>
        <p style="color: #666; font-size: 14px;">If you didn't request this, ignore this email.</p>
      </div>
    `,
  });
};

module.exports = { initializeEmail, sendEmail, sendVerificationEmail, sendPasswordResetEmail };

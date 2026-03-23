const logger = require('../utils/logger');

const requiredVars = ['MONGO_URI', 'JWT_SECRET'];

function validateEnv() {
  const missing = requiredVars.filter((v) => !process.env[v]);
  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }

  if (process.env.JWT_SECRET.length < 32) {
    logger.warn(
      'JWT_SECRET is shorter than 32 characters. Use a strong secret in production.'
    );
  }

  if (process.env.NODE_ENV === 'production' && !process.env.CLIENT_URL) {
    throw new Error('CLIENT_URL must be set in production');
  }

  logger.info('Environment validation passed');
}

module.exports = { validateEnv };

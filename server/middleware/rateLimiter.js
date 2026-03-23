const rateLimit = require('express-rate-limit');
const { getRedis } = require('../config/redis');

let RedisStore;
try {
  RedisStore = require('rate-limit-redis').RedisStore;
} catch {
  RedisStore = null;
}

function createLimiter(prefix, options) {
  // Skip rate limiting in test environment
  if (process.env.NODE_ENV === 'test') {
    return (_req, _res, next) => next();
  }

  let limiter = null;
  let lastRedisState = null;

  return (req, res, next) => {
    const redis = getRedis();
    const hasRedis = !!(redis && RedisStore);

    // Re-create limiter if Redis state changed or first call
    if (!limiter || hasRedis !== lastRedisState) {
      lastRedisState = hasRedis;
      const store = hasRedis
        ? new RedisStore({
            sendCommand: (...args) => redis.call(...args),
            prefix: `rl:${prefix}:`,
          })
        : undefined;

      limiter = rateLimit({ ...options, store, validate: false });
    }

    return limiter(req, res, next);
  };
}

const authLimiter = createLimiter('auth', {
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { message: 'Too many attempts, please try again after 15 minutes' },
  standardHeaders: true,
  legacyHeaders: false,
});

const ambulanceLimiter = createLimiter('ambulance', {
  windowMs: 10 * 60 * 1000,
  max: 5,
  message: { message: 'Too many ambulance requests, please try again later' },
  standardHeaders: true,
  legacyHeaders: false,
});

const apiLimiter = createLimiter('api', {
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: { message: 'Too many requests, please try again later' },
  standardHeaders: true,
  legacyHeaders: false,
});

module.exports = { authLimiter, ambulanceLimiter, apiLimiter };

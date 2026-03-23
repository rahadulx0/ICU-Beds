const logger = require('../utils/logger');

let redis = null;

const connectRedis = async () => {
  let client = null;
  try {
    const Redis = require('ioredis');
    const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
    client = new Redis(redisUrl, {
      maxRetriesPerRequest: 3,
      retryStrategy: (times) => {
        if (times > 3) return null;
        return Math.min(times * 200, 2000);
      },
      lazyConnect: true,
    });

    // Attach error handler BEFORE connect to prevent unhandled error events
    client.on('error', (err) => {
      logger.warn(`Redis error: ${err.message}`);
    });

    await client.connect();
    logger.info('Redis connected');
    redis = client;
    return redis;
  } catch (error) {
    logger.warn(`Redis not available: ${error.message}. Running without cache.`);
    // Disconnect client to stop retry attempts
    if (client) {
      try { client.disconnect(); } catch {}
    }
    redis = null;
    return null;
  }
};

const getRedis = () => redis;

const cacheGet = async (key) => {
  if (!redis) return null;
  try {
    const data = await redis.get(key);
    return data ? JSON.parse(data) : null;
  } catch {
    return null;
  }
};

const cacheSet = async (key, value, ttl = 60) => {
  if (!redis) return;
  try {
    await redis.setex(key, ttl, JSON.stringify(value));
  } catch {
    // Silently fail
  }
};

const cacheInvalidate = async (pattern) => {
  if (!redis) return;
  try {
    const keys = await redis.keys(pattern);
    if (keys.length > 0) {
      await redis.del(...keys);
    }
  } catch {
    // Silently fail
  }
};

module.exports = { connectRedis, getRedis, cacheGet, cacheSet, cacheInvalidate };

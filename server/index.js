require('dotenv').config();

const express = require('express');
const http = require('http');
const mongoose = require('mongoose');
const { Server } = require('socket.io');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const helmet = require('helmet');
const morgan = require('morgan');

const { validateEnv } = require('./config/env');
const connectDB = require('./config/db');
const { connectRedis, getRedis } = require('./config/redis');
const errorHandler = require('./middleware/errorHandler');
const { apiLimiter } = require('./middleware/rateLimiter');
const { mongoSanitize, sanitizeBody } = require('./middleware/sanitize');
const setupSocket = require('./socket');
const logger = require('./utils/logger');
const { initializeEmail } = require('./utils/email');

const authRoutes = require('./routes/auth');
const hospitalRoutes = require('./routes/hospitals');
const userRoutes = require('./routes/users');
const ambulanceRoutes = require('./routes/ambulance');
const notificationRoutes = require('./routes/notifications');
const analyticsRoutes = require('./routes/analytics');
const auditRoutes = require('./routes/audit');
const reviewRoutes = require('./routes/reviews');

const app = express();
const server = http.createServer(app);

const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:5173';

// Socket.io setup
const io = new Server(server, {
  cors: {
    origin: CLIENT_URL,
    credentials: true,
  },
});

app.set('io', io);

// Middleware
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
        fontSrc: ["'self'", 'https://fonts.gstatic.com'],
        imgSrc: [
          "'self'",
          'data:',
          'https://*.tile.openstreetmap.org',
          'https://*.basemaps.cartocdn.com',
          'https://cdnjs.cloudflare.com',
          'https://unpkg.com',
        ],
        connectSrc: [
          "'self'",
          'ws:',
          'wss:',
          'https://nominatim.openstreetmap.org',
        ],
      },
    },
  })
);
app.use(
  cors({
    origin: CLIENT_URL,
    credentials: true,
  })
);
app.use(express.json({ limit: '10kb' }));
app.use(cookieParser());
app.use(mongoSanitize());
app.use(sanitizeBody);
app.use(morgan('combined', { stream: { write: (msg) => logger.info(msg.trim()) } }));
app.use('/api', apiLimiter);

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/hospitals', hospitalRoutes);
app.use('/api/users', userRoutes);
app.use('/api/ambulance', ambulanceRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/audit', auditRoutes);
app.use('/api/reviews', reviewRoutes);

// Health check
app.get('/api/health', async (_req, res) => {
  const health = {
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    checks: {
      mongodb:
        mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
      redis: getRedis() ? 'connected' : 'unavailable',
    },
  };

  const httpStatus = health.checks.mongodb === 'connected' ? 200 : 503;
  health.status = httpStatus === 200 ? 'ok' : 'degraded';

  res.status(httpStatus).json(health);
});

// Error handler
app.use(errorHandler);

// Setup socket handlers
setupSocket(io);

// Initialize email transport
initializeEmail();

// Start server
const PORT = process.env.PORT || 5000;

const startServer = async () => {
  validateEnv();
  await connectDB();
  await connectRedis();

  server.listen(PORT, () => {
    logger.info(`Server running on port ${PORT}`);
  });
};

startServer();

// Graceful shutdown
const gracefulShutdown = async (signal) => {
  logger.info(`${signal} received. Starting graceful shutdown...`);

  server.close(() => {
    logger.info('HTTP server closed');
  });

  io.close(() => {
    logger.info('Socket.io server closed');
  });

  try {
    await mongoose.connection.close();
    logger.info('MongoDB connection closed');
  } catch (err) {
    logger.error(`Error closing MongoDB: ${err.message}`);
  }

  const redis = getRedis();
  if (redis) {
    try {
      await redis.quit();
      logger.info('Redis connection closed');
    } catch (err) {
      logger.error(`Error closing Redis: ${err.message}`);
    }
  }

  process.exit(0);
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

module.exports = { app, server };

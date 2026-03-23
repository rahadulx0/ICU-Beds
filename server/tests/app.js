const express = require('express');
const cookieParser = require('cookie-parser');
const errorHandler = require('../middleware/errorHandler');

const authRoutes = require('../routes/auth');
const hospitalRoutes = require('../routes/hospitals');
const userRoutes = require('../routes/users');
const ambulanceRoutes = require('../routes/ambulance');
const notificationRoutes = require('../routes/notifications');
const reviewRoutes = require('../routes/reviews');

function createApp() {
  const app = express();

  app.use(express.json({ limit: '10kb' }));
  app.use(cookieParser());

  // Mock io
  app.set('io', { to: () => ({ emit: () => {} }), emit: () => {} });

  app.use('/api/auth', authRoutes);
  app.use('/api/hospitals', hospitalRoutes);
  app.use('/api/users', userRoutes);
  app.use('/api/ambulance', ambulanceRoutes);
  app.use('/api/notifications', notificationRoutes);
  app.use('/api/reviews', reviewRoutes);

  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok' });
  });

  app.use(errorHandler);

  return app;
}

module.exports = createApp;

const mongoose = require('mongoose');
const logger = require('../utils/logger');

const MAX_RETRIES = 5;
const RETRY_DELAY_MS = 3000;

const connectDB = async () => {
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const conn = await mongoose.connect(process.env.MONGO_URI, {
        serverSelectionTimeoutMS: 5000,
      });
      logger.info(`MongoDB connected: ${conn.connection.host}`);

      mongoose.connection.on('disconnected', () => {
        logger.warn('MongoDB disconnected. Mongoose will auto-reconnect.');
      });

      mongoose.connection.on('error', (err) => {
        logger.error(`MongoDB connection error: ${err.message}`);
      });

      return;
    } catch (error) {
      logger.error(
        `MongoDB connection attempt ${attempt}/${MAX_RETRIES} failed: ${error.message}`
      );
      if (attempt === MAX_RETRIES) {
        logger.error('All MongoDB connection attempts failed. Exiting.');
        process.exit(1);
      }
      await new Promise((resolve) =>
        setTimeout(resolve, RETRY_DELAY_MS * attempt)
      );
    }
  }
};

module.exports = connectDB;

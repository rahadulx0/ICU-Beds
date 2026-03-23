const jwt = require('jsonwebtoken');
const User = require('../models/User');
const AmbulanceRequest = require('../models/AmbulanceRequest');
const logger = require('../utils/logger');
const { calculateETA } = require('../utils/geo');

const setupSocket = (io) => {
  // Authenticate socket connections
  io.use(async (socket, next) => {
    try {
      const token =
        socket.handshake.auth?.token ||
        socket.handshake.headers?.cookie
          ?.split('; ')
          .find((c) => c.startsWith('token='))
          ?.split('=')[1];

      if (!token) {
        socket.user = null;
        return next();
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.id);
      if (!user) return next(new Error('User not found'));

      socket.user = user;
      next();
    } catch (error) {
      socket.user = null;
      next();
    }
  });

  io.on('connection', (socket) => {
    const user = socket.user;

    if (user) {
      logger.debug(`Socket connected: ${user.email} (${user.role})`);

      // Join role-based rooms
      socket.join(user.role === 'driver' ? 'drivers' : 'users');
      socket.join(`user-${user._id}`);

      // Driver goes online
      if (user.role === 'driver') {
        User.findByIdAndUpdate(user._id, { is_online: true }).catch(() => {});

        let lastLocationUpdate = 0;

        socket.on('driver-location', async (data) => {
          // Rate limit: max 1 update per second
          const now = Date.now();
          if (now - lastLocationUpdate < 1000) return;
          lastLocationUpdate = now;

          const { latitude, longitude, requestId } = data;

          try {
            await User.findByIdAndUpdate(user._id, {
              current_location: {
                type: 'Point',
                coordinates: [longitude, latitude],
              },
            });

            // If tracking a specific request, emit to the room with ETA
            if (requestId) {
              const roomId = `ambulance-${requestId}`;
              let eta = null;

              try {
                const request = await AmbulanceRequest.findById(requestId)
                  .populate('hospital', 'location')
                  .lean();

                if (request?.hospital?.location?.coordinates) {
                  const [hospLng, hospLat] =
                    request.hospital.location.coordinates;

                  // ETA to pickup
                  if (request.pickup_location?.coordinates) {
                    const [pickupLng, pickupLat] =
                      request.pickup_location.coordinates;
                    const toPickup = calculateETA(
                      latitude,
                      longitude,
                      pickupLat,
                      pickupLng
                    );
                    eta = {
                      toPickup: toPickup,
                      toHospital: calculateETA(
                        pickupLat,
                        pickupLng,
                        hospLat,
                        hospLng
                      ),
                    };

                    // If en-route (already picked up), ETA is to hospital
                    if (request.status === 'en-route') {
                      eta.toHospital = calculateETA(
                        latitude,
                        longitude,
                        hospLat,
                        hospLng
                      );
                    }
                  }
                }
              } catch {
                // ETA calculation is non-critical
              }

              io.to(roomId).emit('driver-location-update', {
                requestId,
                driverId: user._id,
                latitude,
                longitude,
                eta,
                timestamp: new Date(),
              });
            }
          } catch (error) {
            logger.error(`Driver location update error: ${error.message}`);
          }
        });
      }

      // Join ambulance tracking room (with authorization)
      socket.on('join-tracking', async (requestId) => {
        try {
          const request = await AmbulanceRequest.findById(requestId)
            .select('patient driver')
            .lean();
          if (!request) return;

          const userId = user._id.toString();
          const isParticipant =
            request.patient?.toString() === userId ||
            request.driver?.toString() === userId ||
            user.role === 'admin';

          if (!isParticipant) return;

          const roomId = `ambulance-${requestId}`;
          socket.join(roomId);
          logger.debug(`${user.email} joined tracking room: ${roomId}`);
        } catch {
          // Non-critical
        }
      });

      socket.on('leave-tracking', (requestId) => {
        const roomId = `ambulance-${requestId}`;
        socket.leave(roomId);
      });

      // Handle disconnect
      socket.on('disconnect', async () => {
        if (user.role === 'driver') {
          await User.findByIdAndUpdate(user._id, {
            is_online: false,
          }).catch(() => {});
        }
        logger.debug(`Socket disconnected: ${user.email}`);
      });
    } else {
      // Unauthenticated user - can still receive public updates
      socket.join('public');

      socket.on('disconnect', () => {
        logger.debug('Anonymous socket disconnected');
      });
    }
  });

  return io;
};

module.exports = setupSocket;

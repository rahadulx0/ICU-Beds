/**
 * Haversine formula to calculate distance between two points on Earth
 * @param {number} lat1 - Latitude of point 1
 * @param {number} lon1 - Longitude of point 1
 * @param {number} lat2 - Latitude of point 2
 * @param {number} lon2 - Longitude of point 2
 * @returns {number} Distance in kilometers
 */
function haversineDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // Earth's radius in km
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRad(deg) {
  return (deg * Math.PI) / 180;
}

/**
 * Estimate ETA based on straight-line distance
 * @param {number} lat1 - Driver latitude
 * @param {number} lon1 - Driver longitude
 * @param {number} lat2 - Destination latitude
 * @param {number} lon2 - Destination longitude
 * @param {number} avgSpeedKmh - Average speed in km/h (default 30 for Dhaka)
 * @param {number} roadFactor - Multiplier for road distance vs straight line (default 1.3)
 * @returns {{ distanceKm: number, etaMinutes: number }}
 */
function calculateETA(lat1, lon1, lat2, lon2, avgSpeedKmh = 30, roadFactor = 1.3) {
  const straightDistance = haversineDistance(lat1, lon1, lat2, lon2);
  const roadDistance = straightDistance * roadFactor;
  const etaMinutes = (roadDistance / avgSpeedKmh) * 60;

  return {
    distanceKm: Math.round(roadDistance * 10) / 10,
    etaMinutes: Math.max(1, Math.round(etaMinutes)),
  };
}

module.exports = { haversineDistance, calculateETA };

const mongoSanitize = require('express-mongo-sanitize');

function escapeHtml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;');
}

function sanitizeStrings(obj) {
  if (typeof obj === 'string') return escapeHtml(obj);
  if (Array.isArray(obj)) return obj.map(sanitizeStrings);
  if (obj && typeof obj === 'object') {
    const result = {};
    for (const [key, val] of Object.entries(obj)) {
      result[key] = sanitizeStrings(val);
    }
    return result;
  }
  return obj;
}

const sanitizeBody = (req, _res, next) => {
  if (req.body) req.body = sanitizeStrings(req.body);
  next();
};

module.exports = { mongoSanitize, sanitizeBody };

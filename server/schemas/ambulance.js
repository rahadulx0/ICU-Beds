const { z } = require('zod');

const createRequestSchema = z.object({
  hospital: z.string().min(1),
  longitude: z.number().min(-180).max(180),
  latitude: z.number().min(-90).max(90),
  pickup_address: z.string().min(3).max(500).trim(),
  emergency_type: z.enum(['critical', 'moderate', 'stable']).default('moderate'),
  notes: z.string().max(500).optional(),
});

module.exports = { createRequestSchema };

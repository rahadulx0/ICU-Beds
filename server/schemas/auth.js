const { z } = require('zod');

const registerSchema = z.object({
  name: z.string().min(2).max(100).trim(),
  email: z.string().email().toLowerCase().trim(),
  password: z.string().min(6).max(128),
  phone: z.string().min(7).max(20).optional(),
  role: z.enum(['user', 'driver']).default('user'),
  vehicle_details: z
    .object({
      plate_number: z.string().min(2).max(20),
      vehicle_type: z.enum(['basic', 'advanced', 'icu_ambulance']),
    })
    .optional(),
});

const loginSchema = z.object({
  email: z.string().email().toLowerCase().trim(),
  password: z.string().min(1),
});

module.exports = { registerSchema, loginSchema };

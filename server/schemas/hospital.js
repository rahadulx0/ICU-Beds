const { z } = require('zod');

const createHospitalSchema = z.object({
  name: z.string().min(2).max(200).trim(),
  address: z.string().min(5).max(500).trim(),
  longitude: z.number().min(-180).max(180),
  latitude: z.number().min(-90).max(90),
  total_icu_beds: z.number().int().min(0),
  available_icu_beds: z.number().int().min(0),
  contact: z
    .object({
      phone: z.string().optional(),
      email: z.string().email().optional(),
    })
    .optional(),
});

const updateBedSchema = z.object({
  available_icu_beds: z.number().int().min(0),
  version: z.number().int().min(0),
});

const updateHospitalSchema = z.object({
  name: z.string().min(2).max(200).trim().optional(),
  address: z.string().min(5).max(500).trim().optional(),
  longitude: z.number().min(-180).max(180).optional(),
  latitude: z.number().min(-90).max(90).optional(),
  total_icu_beds: z.number().int().min(0).optional(),
  available_icu_beds: z.number().int().min(0).optional(),
  contact: z
    .object({
      phone: z.string().optional(),
      email: z.string().email().optional(),
    })
    .optional(),
  status: z.enum(['active', 'inactive', 'maintenance']).optional(),
});

const nearbyQuerySchema = z.object({
  lng: z.coerce.number().min(-180).max(180),
  lat: z.coerce.number().min(-90).max(90),
  radius: z.coerce.number().int().min(100).max(100000).default(10000),
  beds: z.enum(['true', 'false']).optional(),
});

module.exports = {
  createHospitalSchema,
  updateBedSchema,
  updateHospitalSchema,
  nearbyQuerySchema,
};

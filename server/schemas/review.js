const { z } = require('zod');

const createReviewSchema = z.object({
  hospital: z.string().min(1),
  ambulance_request: z.string().min(1),
  rating: z.number().int().min(1).max(5),
  comment: z.string().max(1000).trim().optional(),
});

module.exports = { createReviewSchema };

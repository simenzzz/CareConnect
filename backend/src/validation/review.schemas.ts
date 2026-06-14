import { z } from 'zod';

const id = z.coerce.number({ message: 'must be a positive id' }).int().positive();

export const reviewCreateSchema = z.looseObject({
  bookingId: id,
  rating: z.coerce.number().int().min(1).max(5),
  comment: z.string().trim().max(2000).optional(),
});

export const reviewUpdateSchema = z.looseObject({
  rating: z.coerce.number().int().min(1).max(5),
  comment: z.string().trim().max(2000).optional(),
});

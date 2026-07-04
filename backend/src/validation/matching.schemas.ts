import { z } from 'zod';

/**
 * Validation for the per-booking sitter-suggestions boundary
 * (`GET /api/bookings/suggestions`). All inputs arrive as query-string values,
 * so numbers are coerced. The customer is resolved from the verified token, never
 * from a query param.
 */

const dateString = z
  .string()
  .min(1)
  .refine((v) => !Number.isNaN(Date.parse(v)), { message: 'must be a valid date' });

// A single sitting fits comfortably in one day; cap the span so a caller can't pass
// a pathological multi-year window that excludes every sitter via the overlap check
// and bloats the candidate scan.
const MAX_WINDOW_MS = 24 * 60 * 60 * 1000;
// Dedupe after coercion: the recipient-ownership check downstream compares the
// requested-id count against the distinct rows the DB returns, so duplicate ids
// (e.g. "5,5") would otherwise fail that count check with a misleading ownership
// error. The min/max bounds still apply to the raw list before dedup.
const idList = z.preprocess((value) => {
  if (Array.isArray(value)) return value;
  if (typeof value === 'string') return value.split(',').filter(Boolean);
  return value;
}, z.array(z.coerce.number().int().positive()).min(1).max(20).transform((ids) => [...new Set(ids)]));

export const suggestionsQuerySchema = z
  .looseObject({
    typeOfBooking: z.enum(['PET', 'CHILD']),
    locationId: z.coerce.number({ message: 'locationId must be a positive id' }).int().positive(),
    bookingFrom: dateString,
    bookingTo: dateString,
    childrenIds: idList.optional(),
    petIds: idList.optional(),
    limit: z.coerce.number().int().min(1).max(50).default(10),
  })
  .superRefine((data, ctx) => {
    if (data.typeOfBooking === 'CHILD' && !data.childrenIds?.length) {
      ctx.addIssue({ code: 'custom', path: ['childrenIds'], message: 'childrenIds is required for CHILD suggestions' });
    }
    if (data.typeOfBooking === 'PET' && !data.petIds?.length) {
      ctx.addIssue({ code: 'custom', path: ['petIds'], message: 'petIds is required for PET suggestions' });
    }
  })
  .refine((data) => Date.parse(data.bookingFrom) < Date.parse(data.bookingTo), {
    message: 'bookingTo must be after bookingFrom',
    path: ['bookingTo'],
  })
  .refine((data) => Date.parse(data.bookingTo) - Date.parse(data.bookingFrom) <= MAX_WINDOW_MS, {
    message: 'booking window must not exceed 24 hours',
    path: ['bookingTo'],
  })
  .refine((data) => Date.parse(data.bookingTo) > Date.now(), {
    message: 'booking window must be in the future',
    path: ['bookingFrom'],
  });

export type SuggestionsQuery = z.infer<typeof suggestionsQuerySchema>;

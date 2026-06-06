import { z } from 'zod';

/**
 * Validation for booking write boundaries. Loose objects (see auth.schemas.ts
 * for rationale) — the create handler has back-compat logic that maps single
 * `childId`/`petId` + `typeOfBooking` into arrays, so we validate field shapes
 * and the security-relevant constraints (price, discount, date ordering) but
 * leave the "at least one child or pet" rule to the handler.
 */

const id = z.coerce.number({ message: 'must be a positive id' }).int().positive();
const idArray = z.array(id).optional();

// Keep dates as strings (pass them through unchanged to PostgreSQL) but reject
// anything that isn't a parseable date.
const dateString = z
  .string()
  .min(1)
  .refine((v) => !Number.isNaN(Date.parse(v)), { message: 'must be a valid date' });

const baseBookingFields = {
  sitterId: id,
  locationId: id,
  bookingFrom: dateString,
  bookingTo: dateString,
  priceUsd: z.coerce.number({ message: 'priceUsd must be a number' }).positive('priceUsd must be greater than 0'),
  discount: z.coerce.number().min(0, 'discount must be >= 0').max(100, 'discount must be <= 100').optional(),
  // Not injection vectors (parameterized) and the exact value set varies; keep
  // these length-bounded rather than strict enums to avoid breaking the client.
  paymentMethod: z.string().trim().max(50).optional(),
  typeOfBooking: z.string().trim().max(50).optional(),
  petId: id.optional(),
  childId: id.optional(),
  childrenIds: idArray,
  petIds: idArray,
  additionalNotes: z.string().trim().max(2000).optional(),
};

const endsAfterStart = (data: { bookingFrom?: string; bookingTo?: string }) => {
  if (!data.bookingFrom || !data.bookingTo) {
    return true;
  }
  return Date.parse(data.bookingFrom) < Date.parse(data.bookingTo);
};

const dateOrderIssue = {
  message: 'bookingTo must be after bookingFrom',
  path: ['bookingTo'],
};

export const bookingCreateSchema = z
  .looseObject(baseBookingFields)
  .refine(endsAfterStart, dateOrderIssue);

export const bookingUpdateSchema = z
  .looseObject({
    ...baseBookingFields,
    sitterId: id.optional(),
    locationId: id.optional(),
    bookingFrom: dateString.optional(),
    bookingTo: dateString.optional(),
    priceUsd: baseBookingFields.priceUsd.optional(),
    status: z.string().trim().max(50).optional(),
  })
  .refine(endsAfterStart, dateOrderIssue);

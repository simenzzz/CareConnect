import { z } from 'zod';

/**
 * Payment initiation only needs a valid bookingId; the amount is always computed
 * server-side from the booking (never trusted from the client), and ownership is
 * checked in the handler against the verified token.
 */
export const paymentInitiateSchema = z.looseObject({
  bookingId: z.coerce.number({ message: 'bookingId is required' }).int().positive(),
});

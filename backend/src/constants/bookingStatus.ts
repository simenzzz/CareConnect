/**
 * Canonical status strings for bookings and payments.
 *
 * Single source of truth: a spelling drift between the overlap query and the
 * update handler (`CANCELED` vs `CANCELLED`) previously caused a CRITICAL bug
 * where cancelled slots never freed up. Every status literal in the backend
 * should reference these constants rather than re-typing the string.
 *
 * NOTE: `migrations/init.sql` hardcodes `status <> 'CANCELED'` in the raw SQL
 * overlap constraint (it cannot import TypeScript). Keep that spelling in
 * lockstep with `BOOKING_STATUS.CANCELED` below.
 */

export const BOOKING_STATUS = {
  UPCOMING: 'UPCOMING',
  CONFIRMED: 'CONFIRMED',
  ONGOING: 'ONGOING',
  COMPLETED: 'COMPLETED',
  CANCELED: 'CANCELED',
} as const;

export type BookingStatus = (typeof BOOKING_STATUS)[keyof typeof BOOKING_STATUS];

/**
 * Statuses a client may set via `PUT /api/bookings/:id`. `CONFIRMED` is
 * intentionally excluded — it is written only by the verified Whish payment
 * callback, never by a client, so it must not be settable through the update
 * boundary.
 */
export const BOOKING_STATUS_UPDATABLE = [
  BOOKING_STATUS.CANCELED,
  BOOKING_STATUS.ONGOING,
  BOOKING_STATUS.COMPLETED,
  BOOKING_STATUS.UPCOMING,
] as const;

export const PAYMENT_STATUS = {
  PENDING: 'PENDING',
  COMPLETED: 'COMPLETED',
  FAILED: 'FAILED',
} as const;

export type PaymentStatus = (typeof PAYMENT_STATUS)[keyof typeof PAYMENT_STATUS];

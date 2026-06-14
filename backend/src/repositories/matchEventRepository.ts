import { randomUUID } from 'crypto';
import { query } from '../config/database';
import { logger } from '../utils/logger';
import type { BookingType, ScoredSitter } from '../services/matching';

/**
 * Match-event logging — the outcome data a future learning-to-rank model would
 * train on. Today nothing reads it at runtime; the matcher is deterministic.
 *
 * Logging is best-effort: a failure here must never fail the suggestions request,
 * so all errors are swallowed (and logged) internally — the caller can safely
 * await this without a failed INSERT propagating.
 */
export const logMatchImpressions = async (
  customerId: number,
  typeOfBooking: BookingType,
  locationId: number,
  bookingFrom: string,
  bookingTo: string,
  ranked: readonly ScoredSitter[],
): Promise<Map<number, number>> => {
  const bySitterId = new Map<number, number>();
  if (ranked.length === 0) {
    return bySitterId;
  }
  try {
    const requestGroup = randomUUID();
    const params: unknown[] = [];
    const tuples = ranked.map((entry, idx) => {
      const o = idx * 9;
      params.push(
        requestGroup,
        customerId,
        entry.sitter.id,
        locationId,
        typeOfBooking,
        bookingFrom,
        bookingTo,
        idx + 1,
        entry.score,
      );
      return `($${o + 1}, $${o + 2}, $${o + 3}, $${o + 4}, $${o + 5}, $${o + 6}, $${o + 7}, $${o + 8}, $${o + 9})`;
    });
    const result = await query(
      `INSERT INTO match_events
       (request_group, customer_id, sitter_id, location_id, type_of_booking, booking_from, booking_to, rank, score)
       VALUES ${tuples.join(', ')}
       RETURNING id, sitter_id`,
      params,
    );
    for (const row of result.rows) {
      bySitterId.set(row.sitter_id, row.id);
    }
  } catch (error) {
    logger.error('Failed to log match impressions:', error);
  }
  return bySitterId;
};

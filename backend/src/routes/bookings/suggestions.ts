import express from 'express';
import type { Response } from 'express';
import { logger } from '../../utils/logger';
import { query } from '../../config/database';
import { verifyToken } from '../../middleware/auth';
import type { AuthenticatedRequest } from '../../middleware/auth';
import { errorDetails } from '../../utils/errors';
import { validateQuery } from '../../middleware/validate';
import { suggestionsLimiter } from '../../middleware/rateLimit';
import { suggestionsQuerySchema } from '../../validation/matching.schemas';
import { BOOKING_STATUS } from '../../constants/bookingStatus';
import { getUserByFirebaseUid, getCustomerIdByUserId } from '../../repositories/userRepository';
import {
  SITTER_MATCH_COLUMNS,
  toCard,
  fetchSkillsBySitter,
  fetchAvailabilityBySitter,
  fetchCompletedBookingCounts,
  type SitterMatchRow,
} from '../../repositories/sitterRepository';
import { logMatchImpressions } from '../../repositories/matchEventRepository';
import { rankSitters, ELIGIBLE_SITTER_TYPES } from '../../services/matching';
import type { BookingType, MatchRequest, SitterCandidate } from '../../services/matching';
import { tokenize } from '../../services/matching/text';

const router = express.Router();

/** Parse a nullable Postgres numeric/decimal string into a number (or null). */
const parseNullableDecimal = (v: string | null): number | null =>
  v == null ? null : parseFloat(v);

class RecipientOwnershipError extends Error {
  constructor() {
    super('Some care recipients do not belong to this customer or are inactive');
    this.name = 'RecipientOwnershipError';
  }
}

// Bound the keyword set so a customer with many care recipients can't blow up the
// needs-fit comparison.
const MAX_NEED_KEYWORDS = 40;

/**
 * Build the normalized need-keyword set from the customer's active care recipients
 * of the requested type. Returns [] when there's nothing notable to match on.
 */
const fetchNeedKeywords = async (
  customerId: number,
  typeOfBooking: BookingType,
  entityIds: number[],
): Promise<string[]> => {
  const sql =
    typeOfBooking === 'CHILD'
      ? `SELECT special_needs, hobbies FROM children WHERE customer_id = $1 AND id = ANY($2) AND is_active = TRUE`
      : `SELECT special_needs, personality, care_instructions FROM pets WHERE customer_id = $1 AND id = ANY($2) AND is_active = TRUE`;
  const result = await query(sql, [customerId, entityIds]);
  if (result.rows.length !== entityIds.length) {
    throw new RecipientOwnershipError();
  }
  const tokens = new Set<string>();
  for (const row of result.rows) {
    for (const value of Object.values(row) as (string | null)[]) {
      for (const token of tokenize(value)) {
        tokens.add(token);
      }
    }
  }
  return [...tokens].slice(0, MAX_NEED_KEYWORDS);
};

/**
 * Load eligible candidate sitters: active + verified, service-type matches the
 * booking type, and NOT already booked for any time overlapping the requested
 * window (the hard double-booking guard; same overlap semantics as create).
 */
const loadCandidates = async (
  typeOfBooking: BookingType,
  bookingFrom: string,
  bookingTo: string,
): Promise<SitterCandidate[]> => {
  const result = await query(
    `SELECT ${SITTER_MATCH_COLUMNS}
     FROM sitters s
     WHERE s.is_active = true
       AND s.is_verified = true
       AND s.sitter_type = ANY($1)
       AND NOT EXISTS (
         SELECT 1 FROM bookings b
         WHERE b.sitter_id = s.id
           AND b.status <> $2
           AND b.booking_from < $4
           AND b.booking_to > $3
       )`,
    [ELIGIBLE_SITTER_TYPES[typeOfBooking], BOOKING_STATUS.CANCELED, bookingFrom, bookingTo],
  );

  const rows = result.rows as SitterMatchRow[];
  const ids = rows.map((r) => r.id);
  const [skillsById, availabilityById, completedById] = await Promise.all([
    fetchSkillsBySitter(ids),
    fetchAvailabilityBySitter(ids),
    fetchCompletedBookingCounts(ids),
  ]);

  return rows.map((r) => ({
    id: r.id,
    fullName: r.full_name,
    area: r.area,
    city: r.city,
    sitterType: r.sitter_type,
    description: r.description,
    experience: r.experience,
    hoursPerWeek: r.hours_per_week,
    rating: parseFloat(r.rating) || 0,
    reviewCount: r.review_count,
    latitude: parseNullableDecimal(r.latitude),
    longitude: parseNullableDecimal(r.longitude),
    skills: skillsById.get(r.id) ?? [],
    availability: availabilityById.get(r.id) ?? [],
    completedBookings: completedById.get(r.id) ?? 0,
    createdAt: r.created_at,
  }));
};

/**
 * GET /api/bookings/suggestions — ranked sitter shortlist for a specific request.
 * Customers only; the customer (and thus the location/needs they may reference) is
 * resolved from the verified token, never trusted from the query string.
 */
router.get(
  '/suggestions',
  suggestionsLimiter,
  verifyToken,
  validateQuery(suggestionsQuerySchema),
  async (req: AuthenticatedRequest, res: Response): Promise<express.Response> => {
    try {
      const { typeOfBooking, locationId, bookingFrom, bookingTo, limit, childrenIds, petIds } = res.locals.query as {
        typeOfBooking: BookingType;
        locationId: number;
        bookingFrom: string;
        bookingTo: string;
        childrenIds?: number[];
        petIds?: number[];
        limit: number;
      };
      const entityIds = typeOfBooking === 'CHILD' ? childrenIds ?? [] : petIds ?? [];

      const user = await getUserByFirebaseUid(req.user?.uid);
      if (!user) {
        return res.status(404).json({ success: false, error: 'User not found' });
      }
      if (user.user_type !== 'customer') {
        return res.status(403).json({ success: false, error: 'Only customers can request suggestions' });
      }

      const customerId = await getCustomerIdByUserId(user.id);
      if (customerId === null) {
        return res.status(404).json({ success: false, error: 'Customer profile not found' });
      }

      // The location must belong to the requesting customer (scoped by token).
      const locationResult = await query(
        `SELECT area, city, latitude, longitude
         FROM user_locations WHERE id = $1 AND customer_id = $2 AND is_active = TRUE`,
        [locationId, customerId],
      );
      if (locationResult.rows.length === 0) {
        return res.status(400).json({
          success: false,
          error: 'Location does not belong to this customer or is inactive',
        });
      }
      const location = locationResult.rows[0];

      const [needKeywords, candidates] = await Promise.all([
        fetchNeedKeywords(customerId, typeOfBooking, entityIds),
        loadCandidates(typeOfBooking, bookingFrom, bookingTo),
      ]);

      const matchRequest: MatchRequest = {
        typeOfBooking,
        location: {
          area: location.area,
          city: location.city,
          latitude: parseNullableDecimal(location.latitude),
          longitude: parseNullableDecimal(location.longitude),
        },
        bookingFrom: new Date(bookingFrom),
        bookingTo: new Date(bookingTo),
        needKeywords,
      };

      const ranked = rankSitters(matchRequest, candidates).slice(0, limit);

      // Best-effort impression logging for future learning-to-rank (Phase D).
      const matchEventIds = await logMatchImpressions(customerId, typeOfBooking, locationId, bookingFrom, bookingTo, ranked);

      const suggestions = ranked.map(({ sitter, score, reasons }) => ({
        ...toCardFromCandidate(sitter),
        matchScore: score,
        matchReasons: reasons,
        matchEventId: matchEventIds.get(sitter.id),
      }));

      return res.json({
        success: true,
        data: suggestions,
        meta: { typeOfBooking, count: suggestions.length },
      });
    } catch (error) {
      if (error instanceof RecipientOwnershipError) {
        return res.status(400).json({ success: false, error: error.message });
      }
      logger.error('Error generating sitter suggestions:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to generate suggestions',
        ...errorDetails(error),
      });
    }
  },
);

/** Map a scored candidate into the PII-safe client card shape. */
const toCardFromCandidate = (c: SitterCandidate) =>
  toCard(
    {
      id: c.id,
      full_name: c.fullName,
      area: c.area,
      city: c.city,
      hours_per_week: c.hoursPerWeek,
      sitter_type: c.sitterType,
      description: c.description,
      rating: String(c.rating),
      experience: c.experience,
      created_at: c.createdAt,
    },
    c.skills,
  );

export default router;

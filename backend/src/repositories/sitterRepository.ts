import { query } from '../config/database';
import { BOOKING_STATUS } from '../constants/bookingStatus';
import type { AvailabilitySlot } from '../services/matching';

/**
 * Sitter read helpers shared by the discovery (`/api/sitters`) and matching
 * (`/api/bookings/suggestions`) routes. Centralizes the PII-safe column set and
 * the batch (no N+1) lookups for skills, availability and completed-booking
 * counts.
 */

// Columns safe to return to clients. Contact PII (phone) is deliberately excluded.
export const SITTER_CARD_COLUMNS = `
  s.id,
  s.full_name,
  s.area,
  s.city,
  s.hours_per_week,
  s.sitter_type,
  s.description,
  s.profile_image_url,
  s.rating,
  s.experience,
  s.created_at`;

// Card columns plus the extra signals the matching engine scores on.
export const SITTER_MATCH_COLUMNS = `${SITTER_CARD_COLUMNS},
  s.latitude,
  s.longitude,
  s.review_count`;

export interface SitterCardRow {
  id: number;
  full_name: string;
  area: string;
  city: string;
  hours_per_week: number;
  sitter_type: 'B' | 'P' | 'T';
  description: string | null;
  profile_image_url: string;
  rating: string;
  experience: string | null;
  created_at: string;
}

export interface SitterMatchRow extends SitterCardRow {
  latitude: string | null;
  longitude: string | null;
  review_count: number;
}

export interface SitterCard {
  id: number;
  fullName: string;
  area: string;
  city: string;
  hoursPerWeek: number;
  sitterType: 'B' | 'P' | 'T';
  description: string | null;
  profileImageUrl: string;
  rating: number;
  experience: string | null;
  skills: string[];
  createdAt: string;
}

/** Map a sitter row + its skills into the client-facing card shape. */
export const toCard = (sitter: SitterCardRow, skills: string[]): SitterCard => ({
  id: sitter.id,
  fullName: sitter.full_name,
  area: sitter.area,
  city: sitter.city,
  hoursPerWeek: sitter.hours_per_week,
  sitterType: sitter.sitter_type, // 'B' = Baby, 'P' = Pet, 'T' = Both
  description: sitter.description,
  profileImageUrl: sitter.profile_image_url,
  rating: parseFloat(sitter.rating) || 0,
  experience: sitter.experience,
  skills,
  createdAt: sitter.created_at,
});

/** Fetch skills for many sitters in a SINGLE query, grouped by sitter id. */
export const fetchSkillsBySitter = async (sitterIds: number[]): Promise<Map<number, string[]>> => {
  const byId = new Map<number, string[]>();
  if (sitterIds.length === 0) {
    return byId;
  }
  const result = await query(
    'SELECT sitter_id, skill_name FROM sitter_skills WHERE sitter_id = ANY($1) ORDER BY created_at',
    [sitterIds],
  );
  for (const row of result.rows) {
    const list = byId.get(row.sitter_id) ?? [];
    list.push(row.skill_name);
    byId.set(row.sitter_id, list);
  }
  return byId;
};

/** Build client-facing cards for many sitter rows (batches the skills lookup). */
export const buildCards = async (rows: SitterCardRow[]): Promise<SitterCard[]> => {
  const skillsById = await fetchSkillsBySitter(rows.map((r) => r.id));
  return rows.map((sitter) => toCard(sitter, skillsById.get(sitter.id) ?? []));
};

const HH_MM_SS = /^(\d{2}):(\d{2})/;

/** Convert a Postgres TIME string ('HH:MM:SS') to minutes-from-midnight. */
const timeToMinutes = (time: string): number => {
  const match = HH_MM_SS.exec(time);
  if (!match) {
    return 0;
  }
  return Number(match[1]) * 60 + Number(match[2]);
};

/** Fetch recurring availability slots for many sitters, grouped by sitter id. */
export const fetchAvailabilityBySitter = async (
  sitterIds: number[],
): Promise<Map<number, AvailabilitySlot[]>> => {
  const byId = new Map<number, AvailabilitySlot[]>();
  if (sitterIds.length === 0) {
    return byId;
  }
  const result = await query(
    `SELECT sitter_id, day_of_week, start_time, end_time
     FROM sitter_availability WHERE sitter_id = ANY($1)`,
    [sitterIds],
  );
  for (const row of result.rows) {
    const list = byId.get(row.sitter_id) ?? [];
    list.push({
      dayOfWeek: row.day_of_week,
      startMinutes: timeToMinutes(row.start_time),
      endMinutes: timeToMinutes(row.end_time),
    });
    byId.set(row.sitter_id, list);
  }
  return byId;
};

/** Count COMPLETED bookings per sitter in a single query, grouped by sitter id. */
export const fetchCompletedBookingCounts = async (
  sitterIds: number[],
): Promise<Map<number, number>> => {
  const byId = new Map<number, number>();
  if (sitterIds.length === 0) {
    return byId;
  }
  const result = await query(
    `SELECT sitter_id, COUNT(*)::int AS count
     FROM bookings
     WHERE sitter_id = ANY($1) AND status = $2
     GROUP BY sitter_id`,
    [sitterIds, BOOKING_STATUS.COMPLETED],
  );
  for (const row of result.rows) {
    byId.set(row.sitter_id, row.count);
  }
  return byId;
};

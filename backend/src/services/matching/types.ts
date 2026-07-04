/**
 * Shared types for the deterministic sitter-matching engine.
 *
 * The engine is intentionally ML-free: it scores candidate sitters against a
 * single booking request with transparent, weighted sub-scores (see scoring.ts +
 * weights.ts). Everything here is plain data so the scoring functions stay pure
 * and table-testable.
 */

export type SitterType = 'B' | 'P' | 'T';
export type BookingType = 'PET' | 'CHILD';

/** One recurring weekly availability window, in local wall-clock minutes-from-midnight. */
export interface AvailabilitySlot {
  dayOfWeek: number; // 0 = Sunday … 6 = Saturday (ISO/JS getDay convention)
  startMinutes: number; // minutes from midnight, inclusive
  endMinutes: number; // minutes from midnight, exclusive
}

/** A candidate sitter with every signal the engine scores on. */
export interface SitterCandidate {
  id: number;
  fullName: string;
  area: string;
  city: string;
  sitterType: SitterType;
  description: string | null;
  profileImageUrl: string;
  experience: string | null;
  hoursPerWeek: number;
  rating: number; // stored average; 0 when there are no reviews yet
  reviewCount: number;
  latitude: number | null;
  longitude: number | null;
  skills: string[];
  availability: AvailabilitySlot[];
  completedBookings: number;
  createdAt: string;
}

export interface GeoPoint {
  latitude: number;
  longitude: number;
}

/** The booking request a parent is trying to fill. */
export interface MatchRequest {
  typeOfBooking: BookingType;
  location: {
    area: string | null;
    city: string | null;
    latitude: number | null;
    longitude: number | null;
  };
  bookingFrom: Date;
  bookingTo: Date;
  // Normalized keyword tokens drawn from the customer's care recipients
  // (special needs, hobbies, care instructions). Empty when nothing notable.
  needKeywords: string[];
}

/** A single normalized [0,1] sub-score with an optional human-readable reason. */
export interface SubScore {
  score: number;
  reason?: string;
}

/** A scored sitter ready to render, with the top "why this match" reasons. */
export interface ScoredSitter {
  sitter: SitterCandidate;
  score: number; // weighted total in [0,1]
  reasons: string[];
}

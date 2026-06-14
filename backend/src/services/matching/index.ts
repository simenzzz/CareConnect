/**
 * Deterministic sitter-matching engine — public entry point.
 *
 * Given a booking request and a pool of eligible candidate sitters (already
 * filtered in SQL for active/verified/service-type/no-overlap), this ranks them
 * by a transparent weighted sum of sub-scores and returns each with its top
 * "why this match" reasons. No ML, no shared state: the same inputs always yield
 * the same ordering.
 */

import type { MatchRequest, ScoredSitter, SitterCandidate, SubScore } from './types';
import {
  ratingScore,
  proximityScore,
  experienceScore,
  needsFitScore,
  availabilityScore,
} from './scoring';
import { haversineKm } from './geo';
import { WEIGHTS, MAX_RADIUS_KM, MAX_REASONS } from './weights';

export type {
  MatchRequest,
  ScoredSitter,
  SitterCandidate,
  AvailabilitySlot,
  BookingType,
  SitterType,
} from './types';
export { ELIGIBLE_SITTER_TYPES } from './weights';

const round4 = (n: number): number => Math.round(n * 10000) / 10000;

/**
 * Hard radius cap. Only excludes when BOTH the sitter and the booking location
 * have coordinates — missing data never excludes a candidate.
 */
const withinRadius = (sitter: SitterCandidate, request: MatchRequest): boolean => {
  const { latitude: sLat, longitude: sLng } = sitter;
  const loc = request.location;
  if (sLat == null || sLng == null || loc.latitude == null || loc.longitude == null) {
    return true;
  }
  return haversineKm(
    { latitude: sLat, longitude: sLng },
    { latitude: loc.latitude, longitude: loc.longitude },
  ) <= MAX_RADIUS_KM;
};

const scoreSitter = (request: MatchRequest, sitter: SitterCandidate): ScoredSitter => {
  const parts: Record<keyof typeof WEIGHTS, SubScore> = {
    proximity: proximityScore(sitter, request),
    rating: ratingScore(sitter.rating, sitter.reviewCount),
    experience: experienceScore(sitter.completedBookings),
    needsFit: needsFitScore(request.needKeywords, sitter),
    availability: availabilityScore(sitter, request),
  };

  const total = (Object.keys(WEIGHTS) as (keyof typeof WEIGHTS)[]).reduce(
    (sum, key) => sum + parts[key].score * WEIGHTS[key],
    0,
  );

  return { sitter, score: round4(total), reasons: pickTopReasons(parts) };
};

/** Reasons ordered by each part's weighted contribution, highest first. */
const pickTopReasons = (parts: Record<keyof typeof WEIGHTS, SubScore>): string[] =>
  (Object.keys(WEIGHTS) as (keyof typeof WEIGHTS)[])
    .map((key) => ({ key, contribution: parts[key].score * WEIGHTS[key], reason: parts[key].reason }))
    .filter((p): p is typeof p & { reason: string } => Boolean(p.reason))
    .sort((a, b) => b.contribution - a.contribution)
    .slice(0, MAX_REASONS)
    .map((p) => p.reason);

/**
 * Deterministic tie-break so equal scores never reorder run-to-run: by score,
 * then rating, then review count, then most recent, then id.
 */
const byRank = (a: ScoredSitter, b: ScoredSitter): number =>
  b.score - a.score ||
  b.sitter.rating - a.sitter.rating ||
  b.sitter.reviewCount - a.sitter.reviewCount ||
  b.sitter.createdAt.localeCompare(a.sitter.createdAt) ||
  a.sitter.id - b.sitter.id;

/** Rank candidate sitters for a request, best match first. Returns a new array. */
export const rankSitters = (
  request: MatchRequest,
  candidates: readonly SitterCandidate[],
): ScoredSitter[] =>
  candidates
    .filter((c) => withinRadius(c, request))
    .map((c) => scoreSitter(request, c))
    .sort(byRank);

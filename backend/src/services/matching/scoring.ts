/**
 * Pure sub-score functions. Each returns a normalized [0,1] score plus an
 * optional human-readable reason used for the "why this match" explanation.
 * None of these touch the database or any shared state — they are fully
 * deterministic given their inputs, which is what makes the engine table-testable.
 */

import type { MatchRequest, SitterCandidate, SubScore } from './types';
import { haversineKm, distanceDecay } from './geo';
import { isWindowCovered } from './availability';
import { tokenize, normalizeToken } from './text';
import {
  RATING_PRIOR_MEAN,
  RATING_PRIOR_COUNT,
  MAX_RATING,
  EXPERIENCE_SATURATION,
  CITY_MATCH_SCORE,
  AREA_MATCH_SCORE,
  NO_LOCATION_MATCH_SCORE,
  NEUTRAL_SCORE,
  MAX_NEEDS_IN_REASON,
} from './weights';

const clamp01 = (n: number): number => Math.max(0, Math.min(1, n));

const equalsCaseInsensitive = (a?: string | null, b?: string | null): boolean =>
  !!a && !!b && a.trim().toLowerCase() === b.trim().toLowerCase();

/**
 * Bayesian-smoothed rating, normalized to [0,1]. Few/zero reviews are pulled
 * toward the prior mean so sparse data can't dominate the ranking.
 */
export const ratingScore = (rating: number, reviewCount: number): SubScore => {
  const safeCount = Math.max(0, reviewCount);
  const bayesian =
    (RATING_PRIOR_COUNT * RATING_PRIOR_MEAN + safeCount * rating) /
    (RATING_PRIOR_COUNT + safeCount);
  const score = clamp01(bayesian / MAX_RATING);
  const reason =
    safeCount > 0
      ? `Rated ${rating.toFixed(1)}★ across ${safeCount} review${safeCount === 1 ? '' : 's'}`
      : undefined;
  return { score, reason };
};

/**
 * Proximity to the booking location. Uses real haversine distance when both the
 * sitter and the location have coordinates; otherwise falls back to city/area
 * string matching.
 */
export const proximityScore = (sitter: SitterCandidate, request: MatchRequest): SubScore => {
  const { latitude: sLat, longitude: sLng } = sitter;
  const loc = request.location;

  if (sLat != null && sLng != null && loc.latitude != null && loc.longitude != null) {
    const km = haversineKm(
      { latitude: sLat, longitude: sLng },
      { latitude: loc.latitude, longitude: loc.longitude },
    );
    return { score: clamp01(distanceDecay(km)), reason: `About ${km.toFixed(1)} km away` };
  }

  if (equalsCaseInsensitive(sitter.city, loc.city)) {
    return { score: CITY_MATCH_SCORE, reason: `Based in ${sitter.city}` };
  }
  if (equalsCaseInsensitive(sitter.area, loc.area)) {
    return { score: AREA_MATCH_SCORE, reason: `Based in ${sitter.area}` };
  }
  return { score: NO_LOCATION_MATCH_SCORE };
};

/** Reliability proxy: completed bookings, saturating to 1 at EXPERIENCE_SATURATION. */
export const experienceScore = (completedBookings: number): SubScore => {
  const count = Math.max(0, completedBookings);
  const score = clamp01(count / EXPERIENCE_SATURATION);
  const reason =
    count > 0 ? `${count} completed booking${count === 1 ? '' : 's'}` : undefined;
  return { score, reason };
};

/**
 * Keyword overlap between the care recipients' needs and the sitter's skills,
 * description and experience. Neutral when the request carries no notable needs
 * (a constant that affects every candidate equally, so ranking is unchanged).
 */
export const needsFitScore = (needKeywords: string[], sitter: SitterCandidate): SubScore => {
  if (needKeywords.length === 0) {
    return { score: NEUTRAL_SCORE };
  }
  // Compare on the canonical (stemmed + synonym-folded) form so variants match
  // (allergy/allergies, asd/autism), while keeping the surface word for the reason.
  const haystack = new Set<string>(
    [
      ...sitter.skills.flatMap(tokenize),
      ...tokenize(sitter.description),
      ...tokenize(sitter.experience),
    ].map(normalizeToken),
  );
  // Dedupe needs by canonical token (so 'allergy' + 'allergies' count once) and
  // keep the first surface form seen for display.
  const canonicalNeeds = new Map<string, string>();
  for (const keyword of needKeywords) {
    for (const token of tokenize(keyword)) {
      const canonical = normalizeToken(token);
      if (!canonicalNeeds.has(canonical)) {
        canonicalNeeds.set(canonical, token);
      }
    }
  }
  if (canonicalNeeds.size === 0) {
    return { score: NEUTRAL_SCORE };
  }
  const matched = [...canonicalNeeds].filter(([canonical]) => haystack.has(canonical));
  const score = clamp01(matched.length / canonicalNeeds.size);
  const reason =
    matched.length > 0
      ? `Matches needs: ${matched.slice(0, MAX_NEEDS_IN_REASON).map(([, surface]) => surface).join(', ')}`
      : undefined;
  return { score, reason };
};

/**
 * Whether the sitter's declared recurring availability covers the requested
 * window. Neutral when the sitter has declared no availability (unknown, not a
 * negative signal). Note: the hard double-booking guard lives in SQL — this is
 * the softer "do they generally work then" signal.
 *
 * Interaction with the hard availability filter (see availabilityExcludes): for
 * SAME-DAY windows a declared-but-uncovered sitter is already excluded upstream,
 * so this soft score only ever returns 1 (covered) or 0.5 (undeclared) — it
 * simply keeps confirmed-available ranked above unknown. The `score: 0` branch is
 * now reachable only for CROSS-MIDNIGHT windows (which the hard filter leaves in):
 * there, declaring availability the engine can't yet parse scores 0 while
 * declaring nothing scores 0.5. That overnight quirk is a known v1 limitation of
 * isWindowCovered, not a bug — revisit when overnight bookings are supported.
 */
export const availabilityScore = (sitter: SitterCandidate, request: MatchRequest): SubScore => {
  if (sitter.availability.length === 0) {
    return { score: NEUTRAL_SCORE };
  }
  const covered = isWindowCovered(sitter.availability, request.bookingFrom, request.bookingTo);
  return covered
    ? { score: 1, reason: 'Available at your requested time' }
    : { score: 0 };
};

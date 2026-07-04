/**
 * Tunable configuration for the matching engine — every magic number lives here,
 * not inline in the scoring code, so weights can be adjusted (and unit-tested)
 * in one place.
 */

import type { BookingType, SitterType } from './types';

/**
 * Soft-score weights. They MUST sum to 1 so the weighted total stays in [0,1].
 * Proximity dominates (a nearby sitter is the single biggest practical factor),
 * then trust (rating), then reliability (experience), fit, and availability.
 */
export const WEIGHTS = {
  proximity: 0.35,
  rating: 0.25,
  experience: 0.15,
  needsFit: 0.15,
  availability: 0.1,
} as const;

/**
 * Hard radius cap: candidates farther than this from the booking location are
 * dropped entirely — but only when BOTH the sitter and the location have
 * coordinates (we never penalize missing data into exclusion).
 */
export const MAX_RADIUS_KM = 25;

/** Distance (km) at which the proximity sub-score decays to ~0.37 (1/e). */
export const DISTANCE_DECAY_KM = 8;

/**
 * Bayesian rating prior. Sparse-review sitters are pulled toward the platform
 * mean so a lone 5★ cannot outrank a proven 4.7★, and a brand-new sitter with
 * zero reviews lands at the prior mean rather than 0. C is the prior's weight
 * expressed in "virtual reviews".
 */
export const RATING_PRIOR_MEAN = 3.5;
export const RATING_PRIOR_COUNT = 5;
export const MAX_RATING = 5;

/** Completed-booking count at which the experience sub-score saturates to 1. */
export const EXPERIENCE_SATURATION = 20;

/**
 * String-location fallback scores, used only when coordinates are unavailable.
 * `city` is the fine-grained locality (e.g. Hamra); `area` is the governorate
 * (e.g. Beirut). A same-city match is the strongest non-geo signal.
 */
export const CITY_MATCH_SCORE = 1;
export const AREA_MATCH_SCORE = 0.6;
export const NO_LOCATION_MATCH_SCORE = 0.2;

/**
 * Neutral score for a signal we simply don't know yet (no availability declared,
 * or no notable care needs to match). A constant affects every candidate equally,
 * so it never distorts the relative ranking — it just avoids rewarding/punishing
 * on absent data.
 */
export const NEUTRAL_SCORE = 0.5;

/** Maximum number of "why this match" reasons surfaced per sitter. */
export const MAX_REASONS = 3;

/** Maximum number of matched need terms listed in the needs-fit reason string. */
export const MAX_NEEDS_IN_REASON = 3;

/** sitter_type values eligible for a given booking type ('T' = does both). */
export const ELIGIBLE_SITTER_TYPES: Record<BookingType, readonly SitterType[]> = {
  CHILD: ['B', 'T'],
  PET: ['P', 'T'],
} as const;

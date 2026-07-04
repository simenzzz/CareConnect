/**
 * Shared synthetic fixtures for exercising the matching engine's *effectiveness*
 * (face-validity / calibration), as opposed to matching.engine.test.ts which
 * unit-tests each sub-score in isolation.
 *
 * The roster is a hand-crafted set of sitters that spans every axis a sub-score
 * reacts to — distance bands, rating × review-count, completed bookings,
 * needs-keyword overlap, availability windows, and the coordinate-less string
 * fallback — so that ranking behaviour can be asserted (Layer A: the scenario
 * test) and eyeballed (Layer B: scripts/rankReport.ts). Everything is plain data
 * fed straight into rankSitters(): no DB, no mocks, fully deterministic.
 *
 * NOTE on parity with production: sitter_type eligibility and the verified/active
 * flags are HARD SQL pre-filters in suggestions.ts, not part of rankSitters().
 * `filterEligible` below mirrors the type pre-filter so the offline harness sees
 * the same candidate pool the engine would in production. Radius exclusion, by
 * contrast, lives inside rankSitters() and needs no help here.
 */

import type {
  MatchRequest,
  SitterCandidate,
  AvailabilitySlot,
  BookingType,
} from '../../src/services/matching';
import { ELIGIBLE_SITTER_TYPES } from '../../src/services/matching';

/** Booking location anchor: central Beirut (Hamra). */
export const ANCHOR = { latitude: 33.8938, longitude: 35.5018 } as const;

/**
 * A Tuesday 13:00–16:00 *local* (Asia/Beirut) window. 2026-06-09 is a Tuesday
 * and Lebanon is UTC+3 in June, so 10:00Z–13:00Z maps to 13:00–16:00 local.
 */
export const TUESDAY_WINDOW = {
  bookingFrom: new Date('2026-06-09T10:00:00Z'),
  bookingTo: new Date('2026-06-09T13:00:00Z'),
} as const;

/** A recurring slot that fully covers TUESDAY_WINDOW (Tue 11:00–17:00 local). */
const COVERS_TUESDAY: AvailabilitySlot = { dayOfWeek: 2, startMinutes: 11 * 60, endMinutes: 17 * 60 };
/** Same hours but on Wednesday — misses the Tuesday window. */
const WRONG_DAY: AvailabilitySlot = { dayOfWeek: 3, startMinutes: 11 * 60, endMinutes: 17 * 60 };

let seq = 0;
const nextCreatedAt = (): string => {
  seq += 1;
  return `2025-01-${String(seq).padStart(2, '0')}T00:00:00Z`;
};

export const makeSitter = (overrides: Partial<SitterCandidate> = {}): SitterCandidate => ({
  id: 0,
  fullName: 'Sitter',
  area: 'Beirut',
  city: 'Hamra',
  sitterType: 'B',
  description: null,
  profileImageUrl: '',
  experience: null,
  hoursPerWeek: 30,
  rating: 0,
  reviewCount: 0,
  latitude: null,
  longitude: null,
  skills: [],
  availability: [COVERS_TUESDAY],
  completedBookings: 0,
  createdAt: nextCreatedAt(),
  ...overrides,
});

export const makeRequest = (overrides: Partial<MatchRequest> = {}): MatchRequest => ({
  typeOfBooking: 'CHILD',
  location: { area: 'Beirut', city: 'Hamra', ...ANCHOR },
  bookingFrom: TUESDAY_WINDOW.bookingFrom,
  bookingTo: TUESDAY_WINDOW.bookingTo,
  needKeywords: [],
  ...overrides,
});

/** Offset from ANCHOR by roughly `km` straight north (0.009° lat ≈ 1 km). */
const northOf = (km: number) => ({
  latitude: ANCHOR.latitude + km * 0.009,
  longitude: ANCHOR.longitude,
});

/**
 * The roster. Keys describe design intent; ids are stable so scenarios and
 * assertions can reference them. Comments state what each row is meant to probe.
 */
export const ROSTER = {
  // Distance band: next-door, and highly proven. Expected overall winner.
  nearProven: makeSitter({
    id: 1, fullName: 'Nadia (near + proven)', sitterType: 'T', ...northOf(0.5),
    rating: 4.7, reviewCount: 60, completedBookings: 30,
    skills: ['Toddlers', 'Homework help'], description: 'Calm, routine-focused care.',
  }),
  // Next-door but brand new (rating pinned to the 0.7 prior, experience 0).
  nearNew: makeSitter({
    id: 2, fullName: 'Rana (near + new)', ...northOf(0.6),
    rating: 0, reviewCount: 0, completedBookings: 0, skills: ['Bedtime routine'],
  }),
  // ~8 km away (the decay midpoint) but excellent — tests strong-but-far.
  far8Excellent: makeSitter({
    id: 3, fullName: 'Maya (~8km + excellent)', sitterType: 'T', ...northOf(8),
    rating: 4.9, reviewCount: 40, completedBookings: 25,
  }),
  // ~22 km — inside the 25 km cliff, flawless record. Should survive but sink.
  edge22Perfect: makeSitter({
    id: 4, fullName: 'Lea (~22km + flawless)', ...northOf(22),
    rating: 5.0, reviewCount: 100, completedBookings: 40,
  }),
  // ~30 km — beyond the hard radius. Must be excluded despite perfect stats.
  beyond30: makeSitter({
    id: 5, fullName: 'Zeina (~30km, out of radius)', ...northOf(30),
    rating: 5.0, reviewCount: 200, completedBookings: 50,
  }),
  // Pet-only sitter for a CHILD request — excluded by type eligibility (SQL).
  petOnly: makeSitter({
    id: 6, fullName: 'Karim (pet-only)', sitterType: 'P', ...northOf(0.4),
    rating: 4.9, reviewCount: 80, completedBookings: 40,
  }),
  // Coordinate-less, same city as the request → proximity fallback 1.0.
  coordlessSameCity: makeSitter({
    id: 7, fullName: 'Sara (coordless, same city)', city: 'Hamra', area: 'Beirut',
    latitude: null, longitude: null, rating: 4.0, reviewCount: 20, completedBookings: 12,
  }),
  // Coordinate-less, same governorate but different city → fallback 0.6.
  coordlessSameArea: makeSitter({
    id: 8, fullName: 'Hadi (coordless, same area)', city: 'Achrafieh', area: 'Beirut',
    latitude: null, longitude: null, rating: 4.0, reviewCount: 20, completedBookings: 12,
  }),
  // Coordinate-less, far locality but excellent → fallback 0.2 sinks it.
  coordlessFarArea: makeSitter({
    id: 9, fullName: 'Tala (coordless, far locality)', city: 'Tyre', area: 'South',
    latitude: null, longitude: null, rating: 4.8, reviewCount: 50, completedBookings: 30,
  }),
  // Skills/description overlap the special-needs keywords → needsFit 1.0.
  needsMatch: makeSitter({
    id: 10, fullName: 'Rami (needs match)', ...northOf(4),
    rating: 4.0, reviewCount: 15, completedBookings: 10,
    skills: ['Allergy management', 'Special needs care'],
    description: 'Experienced supporting children with autism and epilepsy.',
  }),
  // Higher rating but zero needs overlap → loses the needs scenario to id 10.
  needsNoMatch: makeSitter({
    id: 11, fullName: 'Jad (higher rating, no needs match)', ...northOf(4),
    rating: 4.5, reviewCount: 30, completedBookings: 18,
    skills: ['Arts and crafts', 'Cooking'], description: 'Fun and energetic days out.',
  }),
  // Declares NO availability → availability sub-score is the neutral 0.5.
  availUndeclared: makeSitter({
    id: 12, fullName: 'Dana (no availability declared)', ...northOf(0.5),
    rating: 4.6, reviewCount: 40, completedBookings: 20, availability: [],
  }),
  // Available, but only on the wrong day → availability sub-score 0.
  availWrongDay: makeSitter({
    id: 13, fullName: 'Omar (available wrong day)', ...northOf(0.5),
    rating: 4.6, reviewCount: 40, completedBookings: 20, availability: [WRONG_DAY],
  }),
  // Many reviews but a low average → Bayesian keeps the score honestly low.
  lowRatingHighVolume: makeSitter({
    id: 14, fullName: 'Farah (2.5★ over 80 reviews)', ...northOf(0.5),
    rating: 2.5, reviewCount: 80, completedBookings: 30,
  }),
  // Tie pair: identical scoring inputs, differing id → stable tie-break (lower id first).
  tieA: makeSitter({
    id: 15, fullName: 'Tie A', city: 'Zahle', area: 'Bekaa', latitude: null, longitude: null,
    rating: 4.0, reviewCount: 10, completedBookings: 5, availability: [],
    createdAt: '2025-06-06T00:00:00Z',
  }),
  tieB: makeSitter({
    id: 16, fullName: 'Tie B', city: 'Zahle', area: 'Bekaa', latitude: null, longitude: null,
    rating: 4.0, reviewCount: 10, completedBookings: 5, availability: [],
    createdAt: '2025-06-06T00:00:00Z',
  }),
} satisfies Record<string, SitterCandidate>;

export const ALL_SITTERS: SitterCandidate[] = Object.values(ROSTER);

/** Mirror the SQL type pre-filter (verified/active are assumed true for fixtures). */
export const filterEligible = (
  request: MatchRequest,
  candidates: readonly SitterCandidate[],
): SitterCandidate[] => {
  const eligible = ELIGIBLE_SITTER_TYPES[request.typeOfBooking];
  return candidates.filter((c) => eligible.includes(c.sitterType));
};

/** A named scenario: a request plus the candidate pool it should be ranked against. */
export interface Scenario {
  name: string;
  description: string;
  request: MatchRequest;
  candidates: SitterCandidate[];
}

export const SCENARIOS: Scenario[] = [
  {
    name: 'child-general',
    description: 'CHILD booking in Beirut, no special needs — full roster, type-filtered.',
    request: makeRequest(),
    candidates: filterEligible(makeRequest(), ALL_SITTERS),
  },
  {
    name: 'proximity-vs-quality',
    description: 'Does a next-door proven sitter beat an 8km-away excellent one and a next-door newcomer?',
    request: makeRequest(),
    candidates: [ROSTER.nearProven, ROSTER.far8Excellent, ROSTER.nearNew],
  },
  {
    name: 'special-needs',
    description: 'Allergy + autism + epilepsy needs — should a needs-matched sitter outrank a higher-rated one?',
    request: makeRequest({ needKeywords: ['allergy', 'autism', 'epilepsy'] }),
    candidates: [ROSTER.needsMatch, ROSTER.needsNoMatch],
  },
  {
    name: 'special-needs-variants',
    description: 'Variant vocabulary ("allergies", "asd") must still match via stemming + synonym folding → needsFit 1.0.',
    request: makeRequest({ needKeywords: ['allergies', 'asd'] }),
    candidates: [ROSTER.needsMatch, ROSTER.needsNoMatch],
  },
  {
    name: 'coordless-fallback',
    description: 'No sitter coordinates — exercise the same-city / same-area / far-locality string fallback.',
    request: makeRequest(),
    candidates: [ROSTER.coordlessSameCity, ROSTER.coordlessSameArea, ROSTER.coordlessFarArea],
  },
  {
    name: 'availability',
    description: 'Same-street sitters differing only in availability: covered vs undeclared (neutral) vs wrong-day.',
    request: makeRequest(),
    candidates: [ROSTER.nearProven, ROSTER.availUndeclared, ROSTER.availWrongDay],
  },
];

export type { MatchRequest, SitterCandidate, BookingType };

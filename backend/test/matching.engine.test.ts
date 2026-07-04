import { describe, it, expect } from 'vitest';
import {
  ratingScore,
  proximityScore,
  experienceScore,
  needsFitScore,
  availabilityScore,
} from '../src/services/matching/scoring';
import { haversineKm } from '../src/services/matching/geo';
import { availabilityExcludes } from '../src/services/matching/availability';
import { normalizeToken } from '../src/services/matching/text';
import { WEIGHTS } from '../src/services/matching/weights';
import { rankSitters } from '../src/services/matching';
import type {
  MatchRequest,
  SitterCandidate,
  AvailabilitySlot,
} from '../src/services/matching';

/**
 * Unit tests for the deterministic matching engine. Every sub-score is a pure
 * function, so these are plain table-driven assertions — no DB, no mocks.
 */

const makeSitter = (overrides: Partial<SitterCandidate> = {}): SitterCandidate => ({
  id: 1,
  fullName: 'Test Sitter',
  area: 'Beirut',
  city: 'Hamra',
  sitterType: 'B',
  description: null,
  experience: null,
  hoursPerWeek: 20,
  rating: 0,
  reviewCount: 0,
  latitude: null,
  longitude: null,
  skills: [],
  availability: [],
  completedBookings: 0,
  createdAt: '2026-01-01T00:00:00Z',
  ...overrides,
});

const makeRequest = (overrides: Partial<MatchRequest> = {}): MatchRequest => ({
  typeOfBooking: 'CHILD',
  location: { area: 'Beirut', city: 'Hamra', latitude: null, longitude: null },
  // 2026-06-09 is a Tuesday; Lebanon is UTC+3 in June, so 10:00Z–13:00Z is
  // 13:00–16:00 local, same local day.
  bookingFrom: new Date('2026-06-09T10:00:00Z'),
  bookingTo: new Date('2026-06-09T13:00:00Z'),
  needKeywords: [],
  ...overrides,
});

describe('WEIGHTS invariant', () => {
  it('sums to exactly 1 so the weighted total stays in [0,1]', () => {
    const sum = Object.values(WEIGHTS).reduce((a, b) => a + b, 0);
    expect(sum).toBeCloseTo(1, 10);
  });
});

describe('ratingScore (Bayesian)', () => {
  it('returns the prior mean for a sitter with zero reviews', () => {
    const { score, reason } = ratingScore(0, 0);
    expect(score).toBeCloseTo(0.7, 5); // prior mean 3.5 / 5
    expect(reason).toBeUndefined();
  });

  it('lets a proven 4.7★ outrank a single 5★ (sparse data is pulled to the prior)', () => {
    const proven = ratingScore(4.7, 50).score;
    const oneFiveStar = ratingScore(5, 1).score;
    expect(proven).toBeGreaterThan(oneFiveStar);
  });

  it('surfaces a reason only when there is at least one review', () => {
    expect(ratingScore(4.5, 3).reason).toMatch(/4\.5★ across 3 reviews/);
    expect(ratingScore(4.5, 1).reason).toMatch(/1 review\b/);
  });
});

describe('proximityScore', () => {
  it('scores 1.0 when sitter and location share coordinates', () => {
    const sitter = makeSitter({ latitude: 33.89, longitude: 35.5 });
    const request = makeRequest({
      location: { area: null, city: null, latitude: 33.89, longitude: 35.5 },
    });
    expect(proximityScore(sitter, request).score).toBeCloseTo(1, 5);
  });

  it('decays with distance', () => {
    const near = makeSitter({ latitude: 33.89, longitude: 35.5 });
    const far = makeSitter({ latitude: 34.45, longitude: 35.84 }); // ~70 km north
    const request = makeRequest({
      location: { area: null, city: null, latitude: 33.89, longitude: 35.5 },
    });
    expect(proximityScore(near, request).score).toBeGreaterThan(
      proximityScore(far, request).score,
    );
  });

  it('falls back to city, then area, then a low base when coordinates are missing', () => {
    const req = makeRequest();
    expect(proximityScore(makeSitter({ city: 'Hamra', area: 'Beirut' }), req).score).toBe(1);
    expect(proximityScore(makeSitter({ city: 'Jounieh', area: 'Beirut' }), req).score).toBe(0.6);
    expect(
      proximityScore(makeSitter({ city: 'Tyre', area: 'South Lebanon' }), req).score,
    ).toBe(0.2);
  });
});

describe('experienceScore', () => {
  it('is 0 with no completed bookings and saturates to 1', () => {
    expect(experienceScore(0).score).toBe(0);
    expect(experienceScore(10).score).toBeCloseTo(0.5, 5);
    expect(experienceScore(20).score).toBe(1);
    expect(experienceScore(100).score).toBe(1); // clamped
  });
});

describe('needsFitScore', () => {
  it('is neutral when the request has no notable needs', () => {
    expect(needsFitScore([], makeSitter()).score).toBe(0.5);
  });

  it('rewards keyword overlap across skills, description and experience', () => {
    const sitter = makeSitter({
      skills: ['Allergy management'],
      description: 'Experienced caring for children with autism.',
    });
    expect(needsFitScore(['allergy', 'autism'], sitter).score).toBe(1);
    expect(needsFitScore(['allergy', 'wheelchair'], sitter).score).toBe(0.5);
    expect(needsFitScore(['wheelchair'], sitter).score).toBe(0);
  });

  it('collapses morphological variants via stemming (allergy ↔ allergies)', () => {
    const sitter = makeSitter({ skills: ['Allergy management'], description: 'Loves walking dogs.' });
    // Recipient text says "allergies"; sitter skill says "Allergy" → still matches.
    expect(needsFitScore(['allergies'], sitter).score).toBe(1);
    // And the reverse direction, plus another stem pair (walking ↔ walks).
    expect(needsFitScore(['walks'], sitter).score).toBe(1);
  });

  it('folds curated care-domain synonyms (asd → autism, meds → medication)', () => {
    const autismSitter = makeSitter({ description: 'Ten years supporting children with autism.' });
    expect(needsFitScore(['asd'], autismSitter).score).toBe(1);

    const medsSitter = makeSitter({ skills: ['Medication reminders'] });
    expect(needsFitScore(['meds'], medsSitter).score).toBe(1);
  });

  it('dedupes needs by canonical form so a variant pair counts once', () => {
    const sitter = makeSitter({ skills: ['Cooking'] }); // no overlap
    // 'allergy' and 'allergies' collapse to one need; neither matches → 0, not a
    // denominator of 2 that could dilute the score.
    expect(needsFitScore(['allergy', 'allergies'], sitter).score).toBe(0);
  });

  it('keeps the human-readable surface form in the reason, not the stem', () => {
    const sitter = makeSitter({ skills: ['Allergy management'] });
    expect(needsFitScore(['allergies'], sitter).reason).toMatch(/allergies/);
  });
});

describe('normalizeToken', () => {
  it('is idempotent and folds variants onto a shared canonical token', () => {
    expect(normalizeToken('allergies')).toBe(normalizeToken('allergy'));
    expect(normalizeToken('asd')).toBe(normalizeToken('autism'));
    expect(normalizeToken(normalizeToken('allergies'))).toBe(normalizeToken('allergies'));
  });
});

describe('availabilityScore', () => {
  // Local window is Tuesday 13:00–16:00 (see makeRequest).
  const slot = (overrides: Partial<AvailabilitySlot> = {}): AvailabilitySlot => ({
    dayOfWeek: 2, // Tuesday
    startMinutes: 11 * 60, // 11:00 local
    endMinutes: 17 * 60, // 17:00 local
    ...overrides,
  });

  it('is neutral when the sitter has declared no availability', () => {
    expect(availabilityScore(makeSitter(), makeRequest()).score).toBe(0.5);
  });

  it('scores 1 when a slot covers the requested window', () => {
    const sitter = makeSitter({ availability: [slot()] });
    expect(availabilityScore(sitter, makeRequest()).score).toBe(1);
  });

  it('scores 0 when no slot covers the window', () => {
    const wrongDay = makeSitter({ availability: [slot({ dayOfWeek: 3 })] });
    const tooShort = makeSitter({ availability: [slot({ endMinutes: 15 * 60 })] }); // ends 15:00, window to 16:00
    expect(availabilityScore(wrongDay, makeRequest()).score).toBe(0);
    expect(availabilityScore(tooShort, makeRequest()).score).toBe(0);
  });
});

describe('availabilityExcludes (hard filter)', () => {
  const req = makeRequest(); // Tue 13:00–16:00 local
  const slot = (o: Partial<AvailabilitySlot> = {}): AvailabilitySlot => ({
    dayOfWeek: 2, startMinutes: 11 * 60, endMinutes: 17 * 60, ...o,
  });

  it('never excludes a sitter who declared no availability (unknown ≠ unavailable)', () => {
    expect(availabilityExcludes([], req.bookingFrom, req.bookingTo)).toBe(false);
  });

  it('does not exclude when a declared slot covers the window', () => {
    expect(availabilityExcludes([slot()], req.bookingFrom, req.bookingTo)).toBe(false);
  });

  it('excludes when declared availability positively misses the window', () => {
    expect(availabilityExcludes([slot({ dayOfWeek: 3 })], req.bookingFrom, req.bookingTo)).toBe(true);
    expect(availabilityExcludes([slot({ endMinutes: 15 * 60 })], req.bookingFrom, req.bookingTo)).toBe(true);
  });

  it('never excludes a cross-midnight window (v1 same-day limitation must not nuke sitters)', () => {
    // 20:00Z–23:00Z on 2026-06-09 → 23:00 Tue to 02:00 Wed local: spans two days.
    const from = new Date('2026-06-09T20:00:00Z');
    const to = new Date('2026-06-09T23:00:00Z');
    expect(availabilityExcludes([slot()], from, to)).toBe(false);
  });
});

describe('haversineKm', () => {
  it('is ~0 for identical points and grows with separation', () => {
    expect(haversineKm({ latitude: 33.89, longitude: 35.5 }, { latitude: 33.89, longitude: 35.5 })).toBeCloseTo(0, 5);
    const km = haversineKm({ latitude: 33.89, longitude: 35.5 }, { latitude: 34.45, longitude: 35.84 });
    expect(km).toBeGreaterThan(50);
    expect(km).toBeLessThan(90);
  });
});

describe('rankSitters', () => {
  it('ranks a closer, better-reviewed sitter above a distant unproven one', () => {
    const request = makeRequest({
      location: { area: 'Beirut', city: 'Hamra', latitude: 33.89, longitude: 35.5 },
    });
    const strong = makeSitter({ id: 1, latitude: 33.89, longitude: 35.5, rating: 4.8, reviewCount: 30, completedBookings: 25 });
    const weak = makeSitter({ id: 2, latitude: 33.92, longitude: 35.52, rating: 0, reviewCount: 0 }); // ~4 km, in range

    const ranked = rankSitters(request, [weak, strong]);
    expect(ranked.map((r) => r.sitter.id)).toEqual([1, 2]);
    expect(ranked[0].score).toBeGreaterThan(ranked[1].score);
    expect(ranked[0].reasons.length).toBeGreaterThan(0);
  });

  it('drops candidates beyond the hard radius when coordinates are known', () => {
    const request = makeRequest({
      location: { area: 'Beirut', city: 'Hamra', latitude: 33.89, longitude: 35.5 },
    });
    const near = makeSitter({ id: 1, latitude: 33.89, longitude: 35.5 });
    const farAway = makeSitter({ id: 2, latitude: 34.45, longitude: 36.4 }); // >25 km

    const ranked = rankSitters(request, [near, farAway]);
    expect(ranked.map((r) => r.sitter.id)).toEqual([1]);
  });

  it('keeps coordinate-less candidates (missing data never excludes)', () => {
    const request = makeRequest({
      location: { area: 'Beirut', city: 'Hamra', latitude: 33.89, longitude: 35.5 },
    });
    const noCoords = makeSitter({ id: 9, latitude: null, longitude: null });
    const ranked = rankSitters(request, [noCoords]);
    expect(ranked).toHaveLength(1);
  });

  it('is deterministic for tied scores via the stable tie-break', () => {
    const request = makeRequest();
    const a = makeSitter({ id: 5 });
    const b = makeSitter({ id: 3 });
    const first = rankSitters(request, [a, b]).map((r) => r.sitter.id);
    const second = rankSitters(request, [b, a]).map((r) => r.sitter.id);
    expect(first).toEqual(second);
    expect(first).toEqual([3, 5]); // equal score → lowest id wins
  });
});

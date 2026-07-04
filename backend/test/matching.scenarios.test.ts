import { describe, it, expect } from 'vitest';
import { rankSitters } from '../src/services/matching';
import {
  ROSTER,
  ALL_SITTERS,
  SCENARIOS,
  makeRequest,
  filterEligible,
} from './helpers/matchingFixtures';

/**
 * Layer A — scenario / face-validity tests. Where matching.engine.test.ts checks
 * each sub-score in isolation, these assert the *end-to-end ranking* over a varied
 * synthetic roster: that the weighted combination and hard filters produce the
 * ordering the product intends. These lock the current tuning against regressions.
 *
 * ids referenced here map to ROSTER in helpers/matchingFixtures.ts.
 */

const ids = (request = makeRequest(), pool = ALL_SITTERS) =>
  rankSitters(request, filterEligible(request, pool)).map((r) => r.sitter.id);

describe('hard filters', () => {
  it('drops sitters beyond the 25 km radius but keeps in-range distant ones', () => {
    const ranked = ids();
    expect(ranked).not.toContain(5); // ~30 km — excluded despite perfect stats
    expect(ranked).toContain(4); // ~22 km — inside the cliff, survives
  });

  it('excludes a pet-only sitter from a CHILD request via type eligibility', () => {
    expect(ids()).not.toContain(6);
  });

  it('excludes a sitter whose declared availability misses the requested day', () => {
    // id 13 declares availability only on the wrong day → hard-filtered out,
    // no longer merely down-ranked by the soft availability score.
    expect(ids()).not.toContain(13);
  });

  it('keeps a sitter who declares no availability (unknown ≠ unavailable)', () => {
    expect(ids()).toContain(12);
  });

  it('ranks every remaining eligible candidate exactly once', () => {
    // 16 sitters − 1 pet-only (type) − 1 out-of-radius − 1 wrong-day = 13.
    expect(ids()).toHaveLength(13);
  });
});

describe('proximity dominates but does not steamroll', () => {
  it('a next-door proven sitter tops an 8 km excellent one and a next-door newcomer', () => {
    const s = SCENARIOS.find((x) => x.name === 'proximity-vs-quality')!;
    expect(rankSitters(s.request, s.candidates).map((r) => r.sitter.id)).toEqual([1, 3, 2]);
  });

  it('a same-city sitter beats a far-locality one even when the far one is better rated', () => {
    const s = SCENARIOS.find((x) => x.name === 'coordless-fallback')!;
    expect(rankSitters(s.request, s.candidates).map((r) => r.sitter.id)).toEqual([7, 8, 9]);
  });
});

describe('special-needs fit can flip the order', () => {
  it('a needs-matched sitter outranks a higher-rated sitter with no overlap', () => {
    const s = SCENARIOS.find((x) => x.name === 'special-needs')!;
    const ranked = rankSitters(s.request, s.candidates).map((r) => r.sitter.id);
    expect(ranked).toEqual([10, 11]);
  });

  it('with no stated needs the same two sitters revert to rating order', () => {
    const ranked = rankSitters(makeRequest(), [ROSTER.needsMatch, ROSTER.needsNoMatch]).map(
      (r) => r.sitter.id,
    );
    expect(ranked).toEqual([11, 10]); // no needs signal → higher-rated id 11 wins
  });
});

describe('availability', () => {
  it('hard-drops wrong-day, keeps covered then undeclared (neutral)', () => {
    // id 13 (wrong-day) is now excluded entirely; only covered (1) and
    // undeclared (12) survive, with confirmed-available ranked above unknown.
    const s = SCENARIOS.find((x) => x.name === 'availability')!;
    expect(rankSitters(s.request, s.candidates).map((r) => r.sitter.id)).toEqual([1, 12]);
  });
});

describe('rating is Bayesian, not naive', () => {
  it('a 2.5★-over-80-reviews sitter ranks below a 4.7★ proven neighbour', () => {
    const ranked = rankSitters(makeRequest(), [ROSTER.lowRatingHighVolume, ROSTER.nearProven]).map(
      (r) => r.sitter.id,
    );
    expect(ranked).toEqual([1, 14]);
  });
});

describe('determinism', () => {
  it('produces identical ordering regardless of input order', () => {
    const forward = ids(makeRequest(), ALL_SITTERS);
    const reversed = ids(makeRequest(), [...ALL_SITTERS].reverse());
    expect(forward).toEqual(reversed);
  });

  it('breaks exact ties by lowest id', () => {
    const pair = [ROSTER.tieA, ROSTER.tieB];
    const a = rankSitters(makeRequest(), pair).map((r) => r.sitter.id);
    const b = rankSitters(makeRequest(), [...pair].reverse()).map((r) => r.sitter.id);
    expect(a).toEqual([15, 16]);
    expect(b).toEqual([15, 16]);
  });
});

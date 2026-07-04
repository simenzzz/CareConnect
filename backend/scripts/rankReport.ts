/**
 * Layer B — ranking-inspection report for calibrating the matching engine.
 *
 * A test asserts an ordering; this script shows *why* one sitter beat another so
 * the weights and decay constants can be tuned by eye. For each scenario in the
 * shared fixtures it prints the ranked table with every per-factor sub-score, the
 * weighted total, and the surfaced reasons, plus any candidates dropped by the
 * hard radius filter.
 *
 * Run (from backend/):  npm run matching:report
 * (uses `ts-node --files` so the local `stemmer` ambient declaration is loaded.)
 */

import { rankSitters } from '../src/services/matching';
import {
  proximityScore,
  ratingScore,
  experienceScore,
  needsFitScore,
  availabilityScore,
} from '../src/services/matching/scoring';
import { availabilityExcludes } from '../src/services/matching/availability';
import { WEIGHTS } from '../src/services/matching/weights';
import { SCENARIOS, filterEligible, type SitterCandidate, type MatchRequest } from '../test/helpers/matchingFixtures';

const weightsNote = (): string =>
  'weights → ' +
  (Object.keys(WEIGHTS) as (keyof typeof WEIGHTS)[]).map((k) => `${k} ${WEIGHTS[k]}`).join(', ') +
  '  |  hard filters: type eligibility + 25km radius + no double-booking';

const pad = (s: string | number, w: number) => String(s).padEnd(w);
const padL = (s: string | number, w: number) => String(s).padStart(w);
const f2 = (n: number) => n.toFixed(2);

const subScores = (sitter: SitterCandidate, request: MatchRequest) => ({
  proximity: proximityScore(sitter, request).score,
  rating: ratingScore(sitter.rating, sitter.reviewCount).score,
  experience: experienceScore(sitter.completedBookings).score,
  needsFit: needsFitScore(request.needKeywords, sitter).score,
  availability: availabilityScore(sitter, request).score,
});

const header = () =>
  '  ' +
  pad('#', 3) +
  pad('sitter', 34) +
  ['prox', 'rate', 'exp', 'need', 'avail'].map((h) => padL(h, 6)).join('') +
  padL('TOTAL', 8) +
  '   reasons';

const rule = '  ' + '-'.repeat(34 + 3 + 6 * 5 + 8 + 12);

function reportScenario(name: string, description: string, request: MatchRequest, candidates: SitterCandidate[]) {
  console.log(`\n\n=== ${name} ===`);
  console.log(description);

  const ranked = rankSitters(request, candidates);
  const rankedIds = new Set(ranked.map((r) => r.sitter.id));
  const dropped = candidates.filter((c) => !rankedIds.has(c.id));

  console.log(header());
  console.log(rule);
  ranked.forEach((r, i) => {
    const ss = subScores(r.sitter, request);
    const row =
      '  ' +
      pad(i + 1, 3) +
      pad(`[${r.sitter.id}] ${r.sitter.fullName}`, 34) +
      [ss.proximity, ss.rating, ss.experience, ss.needsFit, ss.availability]
        .map((v) => padL(f2(v), 6))
        .join('') +
      padL(f2(r.score), 8) +
      '   ' +
      (r.reasons.join(' · ') || '—');
    console.log(row);
  });

  if (dropped.length > 0) {
    console.log(rule);
    dropped.forEach((d) => {
      const reason = availabilityExcludes(d.availability, request.bookingFrom, request.bookingTo)
        ? 'declared availability misses the requested window'
        : 'outside the 25 km hard radius';
      console.log(`  dropped  [${d.id}] ${d.fullName}  — ${reason}`);
    });
  }
}

function main() {
  console.log('CareConnect matching — ranking report');
  console.log(weightsNote());

  for (const s of SCENARIOS) {
    // SCENARIOS already type-filter where relevant, but re-apply defensively so
    // the report always mirrors the SQL eligibility pre-filter.
    reportScenario(s.name, s.description, s.request, filterEligible(s.request, s.candidates));
  }
  console.log('\n');
}

main();

/**
 * Lightweight text normalization for the "needs fit" sub-score. This is a simple
 * keyword-overlap approach, deliberately not a taxonomy or embedding model — a
 * structured skills taxonomy is a documented future upgrade.
 *
 * `tokenize` produces human-readable surface tokens (used verbatim in the
 * "why this match" reasons and as the stored need keywords). Match comparison is
 * done on the *canonical* form via `normalizeToken`, which both sides run through
 * at compare-time (see needsFitScore) — keeping surface forms for display while
 * still collapsing variants for matching. `normalizeToken` applies two steps:
 *   1. Porter stemming, so morphological variants collapse (allergy/allergies,
 *      walk/walking) — the common source of missed matches.
 *   2. A small curated synonym map for the care domain, covering equivalences a
 *      stemmer can't reach (asd → autism, meds/medicine → medication). The care
 *      vocabulary is small and bounded, so a static map is sufficient and stays
 *      fully deterministic and in-process (no LLM / cache / network in the hot path).
 */

import stemmer from 'stemmer';

// Common words that carry no matching signal; dropped so overlap reflects
// substantive terms (e.g. "allergy", "autism", "medication") not filler.
const STOP_WORDS = new Set([
  'and', 'the', 'for', 'with', 'has', 'have', 'any', 'all', 'are', 'our',
  'his', 'her', 'she', 'him', 'who', 'can', 'will', 'needs', 'need', 'care',
  'special', 'requirements', 'requirement', 'please', 'note', 'notes',
]);

const MIN_TOKEN_LENGTH = 3;

/**
 * Curated care-domain synonyms → a canonical term, written in plain words for
 * readability. Compiled once at load into a stem→stem lookup so both keys and
 * canonical values are stem-normalized (matching how `normalizeToken` stems
 * inputs). Extend as real profile/needs vocabulary reveals gaps.
 */
const SYNONYMS: Record<string, string> = {
  asd: 'autism',
  autistic: 'autism',
  meds: 'medication',
  medicine: 'medication',
  medicines: 'medication',
  allergen: 'allergy',
  allergic: 'allergy',
  toddlers: 'toddler',
  infants: 'infant',
  babies: 'baby',
  newborn: 'infant',
  puppies: 'puppy',
  kittens: 'kitten',
  walks: 'walk',
  feeding: 'feed',
  grooming: 'groom',
  wheelchairs: 'wheelchair',
  epileptic: 'epilepsy',
  diabetic: 'diabetes',
};

const SYNONYM_STEMMED = new Map<string, string>(
  Object.entries(SYNONYMS).map(([variant, canonical]) => [stemmer(variant), stemmer(canonical)]),
);

/**
 * Normalize a single raw word to its canonical matching token: stem it, then
 * fold known synonyms onto their canonical stem. Idempotent — safe to apply to
 * an already-normalized token (Porter stemming is idempotent, and synonym values
 * are never themselves synonym keys).
 */
export const normalizeToken = (raw: string): string => {
  const stem = stemmer(raw);
  return SYNONYM_STEMMED.get(stem) ?? stem;
};

/**
 * Normalize free text into a deduplicated list of meaningful lowercase *surface*
 * tokens. Canonicalization for matching is applied separately via `normalizeToken`
 * so these tokens stay readable for display and as stored need keywords.
 */
export const tokenize = (text: string | null | undefined): string[] => {
  if (!text) {
    return [];
  }
  const tokens = text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((t) => t.length >= MIN_TOKEN_LENGTH && !STOP_WORDS.has(t));
  return [...new Set(tokens)];
};

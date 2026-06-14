/**
 * Lightweight text tokenization for the "needs fit" sub-score. This is a simple
 * keyword-overlap approach, deliberately not a taxonomy or embedding model — a
 * structured skills taxonomy is a documented future upgrade.
 */

// Common words that carry no matching signal; dropped so overlap reflects
// substantive terms (e.g. "allergy", "autism", "medication") not filler.
const STOP_WORDS = new Set([
  'and', 'the', 'for', 'with', 'has', 'have', 'any', 'all', 'are', 'our',
  'his', 'her', 'she', 'him', 'who', 'can', 'will', 'needs', 'need', 'care',
  'special', 'requirements', 'requirement', 'please', 'note', 'notes',
]);

const MIN_TOKEN_LENGTH = 3;

/** Normalize free text into a deduplicated list of meaningful lowercase tokens. */
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

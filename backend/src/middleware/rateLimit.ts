import rateLimit from 'express-rate-limit';

/**
 * General limiter for the whole `/api` surface — generous, just a backstop
 * against runaway clients and scraping.
 */
export const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many requests, please try again later.' },
});

/**
 * Strict limiter for sensitive surfaces (auth, payments) where brute force /
 * abuse is the real threat. Mounted ahead of the general limiter on those paths.
 */
export const strictLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many attempts, please wait a few minutes and try again.',
  },
});

/**
 * Limiter for the per-booking suggestions endpoint. It is read-only but markedly
 * more expensive than other GETs (full candidate scan + overlap subquery + three
 * fan-out lookups + a match_events write per call), and it is an enumeration
 * surface over the verified-sitter pool — so it gets its own tighter budget,
 * looser than auth/payments but well below the general 300.
 */
export const suggestionsLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many suggestion requests, please slow down.',
  },
});

export const reviewsLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many review requests, please slow down.',
  },
});

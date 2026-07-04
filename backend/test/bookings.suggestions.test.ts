import { describe, it, expect, vi, beforeEach } from 'vitest';
import express from 'express';
import request from 'supertest';

/**
 * Integration tests for GET /api/bookings/suggestions (the matching endpoint).
 *
 * The DB is mocked so we can assert the security-critical behaviours without a
 * database: customers-only access, token-scoped location ownership, ranking
 * order, and that no contact PII (phone) leaks into the response.
 */

const fakeEnv = { NODE_ENV: 'test' };
vi.mock('../src/config/env', () => ({ getEnv: () => fakeEnv, loadEnv: () => fakeEnv }));

// Inject an authenticated user; the test sets userType per case.
let userType: 'customer' | 'sitter' = 'customer';
vi.mock('../src/middleware/auth', () => ({
  verifyToken: (req: any, _res: any, next: any) => {
    req.user = { uid: 'test-uid' };
    next();
  },
}));

const queryMock = vi.fn();
vi.mock('../src/config/database', () => ({
  query: (...args: unknown[]) => queryMock(...args),
}));

import bookingsRouter from '../src/routes/bookings';

const makeApp = () => {
  const app = express();
  app.use(express.json());
  app.use('/api/bookings', bookingsRouter);
  return app;
};

// Two eligible candidates: #1 sits exactly on the location (best proximity) and is
// well-reviewed; #2 is a few km away and unproven. #1 must rank first.
const candidateRows = [
  {
    id: 2,
    full_name: 'Distant Unproven',
    area: 'Beirut',
    city: 'Hamra',
    hours_per_week: 20,
    sitter_type: 'B',
    description: null,
    rating: '0',
    experience: null,
    created_at: '2026-01-01T00:00:00Z',
    latitude: '33.9200000',
    longitude: '35.5200000',
    review_count: 0,
  },
  {
    id: 1,
    full_name: 'Nearby Proven',
    area: 'Beirut',
    city: 'Hamra',
    hours_per_week: 30,
    sitter_type: 'B',
    description: null,
    rating: '4.8',
    experience: null,
    created_at: '2026-01-01T00:00:00Z',
    latitude: '33.8900000',
    longitude: '35.5000000',
    review_count: 30,
  },
];

const locationRow = {
  area: 'Beirut',
  city: 'Hamra',
  latitude: '33.8900000',
  longitude: '35.5000000',
};

const installQuery = (opts: { locationFound?: boolean } = {}) => {
  const { locationFound = true } = opts;
  queryMock.mockImplementation((text: string) => {
    if (text.includes('INSERT INTO match_events')) return Promise.resolve({ rows: [] });
    if (text.includes('FROM users WHERE firebase_uid')) {
      return Promise.resolve({ rows: [{ id: 10, user_type: userType }] });
    }
    if (text.includes('FROM customers WHERE user_id')) return Promise.resolve({ rows: [{ id: 20 }] });
    if (text.includes('FROM user_locations WHERE id')) {
      return Promise.resolve({ rows: locationFound ? [locationRow] : [] });
    }
    if (text.includes('FROM children WHERE customer_id')) {
      return Promise.resolve({ rows: [{ special_needs: 'peanut allergy', hobbies: 'drawing' }] });
    }
    if (text.includes('FROM sitter_skills')) return Promise.resolve({ rows: [] });
    if (text.includes('FROM sitter_availability')) return Promise.resolve({ rows: [] });
    if (text.includes('FROM sitters s')) return Promise.resolve({ rows: candidateRows });
    if (text.includes('GROUP BY sitter_id')) return Promise.resolve({ rows: [] });
    return Promise.resolve({ rows: [] });
  });
};

// Build a valid future, ≤24h window relative to the real clock so the schema's
// future-window guard passes regardless of when the suite runs.
const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);
const bookingFrom = tomorrow.toISOString();
const bookingTo = new Date(tomorrow.getTime() + 3 * 60 * 60 * 1000).toISOString();
const url =
  `/api/bookings/suggestions?typeOfBooking=CHILD&locationId=1` +
  `&childrenIds=7` +
  `&bookingFrom=${encodeURIComponent(bookingFrom)}&bookingTo=${encodeURIComponent(bookingTo)}`;

describe('GET /api/bookings/suggestions', () => {
  beforeEach(() => {
    queryMock.mockReset();
    userType = 'customer';
  });

  it('returns sitters ranked best-match first', async () => {
    installQuery();
    const res = await request(makeApp()).get(url);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.map((s: any) => s.id)).toEqual([1, 2]);
    expect(res.body.data[0].matchScore).toBeGreaterThan(res.body.data[1].matchScore);
    expect(res.body.data[0].matchReasons.length).toBeGreaterThan(0);
  });

  it('never leaks contact PII (phone) in suggestions', async () => {
    installQuery();
    const res = await request(makeApp()).get(url);

    expect(res.status).toBe(200);
    for (const sitter of res.body.data) {
      expect(sitter).not.toHaveProperty('phone');
    }
  });

  it('rejects non-customers with 403', async () => {
    userType = 'sitter';
    installQuery();
    const res = await request(makeApp()).get(url);

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
  });

  it('rejects a location that does not belong to the customer with 400', async () => {
    installQuery({ locationFound: false });
    const res = await request(makeApp()).get(url);

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('validates the query (missing typeOfBooking) with 400', async () => {
    installQuery();
    const res = await request(makeApp()).get('/api/bookings/suggestions?locationId=1');

    expect(res.status).toBe(400);
  });

  it('dedupes duplicate recipient ids so a valid request is not rejected as unowned', async () => {
    // "childrenIds=7,7" coerces to [7,7]; the ownership check compares against the
    // single DB row for child 7. Without dedup the counts (2 vs 1) mismatch → 400.
    installQuery();
    const res = await request(makeApp()).get(url.replace('&childrenIds=7', '&childrenIds=7,7'));

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it('validates that selected children are supplied for child suggestions', async () => {
    installQuery();
    const res = await request(makeApp()).get(
      `/api/bookings/suggestions?typeOfBooking=CHILD&locationId=1&bookingFrom=${encodeURIComponent(bookingFrom)}&bookingTo=${encodeURIComponent(bookingTo)}`,
    );

    expect(res.status).toBe(400);
  });
});

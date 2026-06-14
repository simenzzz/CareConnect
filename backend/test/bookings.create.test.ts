import { describe, it, expect, vi, beforeEach } from 'vitest';
import express from 'express';
import request from 'supertest';

/**
 * Tests for booking creation data integrity (H4 transactional create, H5 double-booking).
 *
 * The pre-insert ownership checks go through the shared `query`; the atomic
 * insert + overlap check run inside `withTransaction`. Both are mocked here so we
 * can assert the conflict path (409) and the happy path (201) without a database.
 */

const fakeEnv = { NODE_ENV: 'test' };
vi.mock('../src/config/env', () => ({ getEnv: () => fakeEnv, loadEnv: () => fakeEnv }));

// Bypass real Firebase token verification; inject an authenticated customer.
vi.mock('../src/middleware/auth', () => ({
  verifyToken: (req: any, _res: any, next: any) => {
    req.user = { uid: 'test-uid' };
    next();
  },
}));

const queryMock = vi.fn();
const withTransactionMock = vi.fn();
vi.mock('../src/config/database', () => ({
  query: (...args: unknown[]) => queryMock(...args),
  withTransaction: (...args: unknown[]) => withTransactionMock(...args),
}));

import bookingsRouter from '../src/routes/bookings';

const makeApp = () => {
  const app = express();
  app.use(express.json());
  app.use('/api/bookings', bookingsRouter);
  return app;
};

// Make every pre-insert ownership/existence check pass for a CHILD booking.
const passAllPreChecks = (sitterType: 'B' | 'P' | 'T' = 'B') =>
  queryMock.mockImplementation((text: string) => {
    if (text.includes('FROM users WHERE firebase_uid')) {
      return Promise.resolve({ rows: [{ id: 10, user_type: 'customer' }] });
    }
    if (text.includes('FROM customers WHERE user_id')) {
      return Promise.resolve({ rows: [{ id: 20 }] });
    }
    if (text.includes('FROM sitters WHERE id = $1 AND is_active')) {
      return Promise.resolve({ rows: [{ id: 3, sitter_type: sitterType }] });
    }
    if (text.includes('FROM children WHERE id = ANY')) {
      return Promise.resolve({ rows: [{ count: '1' }] });
    }
    if (text.includes('FROM user_locations WHERE id')) {
      return Promise.resolve({ rows: [{ id: 1 }] });
    }
    return Promise.resolve({ rows: [] });
  });

const validBody = {
  sitterId: 3,
  locationId: 1,
  bookingFrom: '2026-07-01T10:00:00Z',
  bookingTo: '2026-07-01T14:00:00Z',
  priceUsd: 50,
  typeOfBooking: 'CHILD',
  childId: 1,
};

// Captures the SQL text the booking transaction runs, so tests can assert on it.
let capturedSql: string[] = [];

// A transaction whose overlap check returns `overlapRows` and whose INSERT returns a row.
const transactionWithOverlap = (overlapRows: unknown[]) =>
  withTransactionMock.mockImplementation(async (fn: (client: any) => Promise<unknown>) => {
    const client = {
      query: vi.fn((text: string) => {
        capturedSql.push(text);
        if (text.includes('FOR UPDATE')) {
          return Promise.resolve({ rows: [{ id: 3 }] });
        }
        if (text.includes('booking_from < $3')) {
          return Promise.resolve({ rows: overlapRows });
        }
        if (text.includes('FROM match_events')) {
          return Promise.resolve({ rows: [{ id: 77 }] });
        }
        if (text.includes('UPDATE match_events')) {
          return Promise.resolve({ rows: [] });
        }
        if (text.includes('INSERT INTO bookings')) {
          return Promise.resolve({
            rows: [
              {
                id: 1234,
                sitter_id: 3,
                customer_id: 20,
                location_id: 1,
                booking_from: validBody.bookingFrom,
                booking_to: validBody.bookingTo,
                payment_method: null,
                price_usd: '50',
                discount: '0',
                status: 'UPCOMING',
                type_of_booking: 'CHILD',
                additional_notes: null,
                created_at: '2026-06-07T00:00:00Z',
              },
            ],
          });
        }
        return Promise.resolve({ rows: [] });
      }),
    };
    return fn(client);
  });

describe('Booking creation integrity (H4/H5)', () => {
  beforeEach(() => {
    queryMock.mockReset();
    withTransactionMock.mockReset();
    capturedSql = [];
  });

  it('rejects an overlapping booking for the same sitter with 409', async () => {
    passAllPreChecks();
    transactionWithOverlap([{ id: 999 }]); // an existing booking overlaps

    const res = await request(makeApp()).post('/api/bookings').send(validBody);

    expect(res.status).toBe(409);
    expect(res.body.success).toBe(false);
    expect(res.body.error).toMatch(/overlap/i);
  });

  it('creates the booking atomically when there is no overlap', async () => {
    passAllPreChecks();
    transactionWithOverlap([]); // no overlap

    const res = await request(makeApp()).post('/api/bookings').send(validBody);

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.booking.id).toBe(1234);
    // The create must go through the transaction helper, not bare queries.
    expect(withTransactionMock).toHaveBeenCalledTimes(1);
  });

  it('rejects a sitter whose service type does not match the booking type', async () => {
    passAllPreChecks('P');
    transactionWithOverlap([]);

    const res = await request(makeApp()).post('/api/bookings').send(validBody);

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/booking type/i);
    expect(withTransactionMock).not.toHaveBeenCalled();
  });

  it('excludes CANCELED bookings from the overlap check using the canonical spelling', async () => {
    // Guards against status-spelling drift: the overlap query must use the same
    // 'CANCELED' (single L) the update handler writes, or cancelled slots never free up.
    passAllPreChecks();
    transactionWithOverlap([]);

    await request(makeApp()).post('/api/bookings').send(validBody);

    const overlapSql = capturedSql.find((sql) => sql.includes('booking_from <'));
    expect(overlapSql).toBeDefined();
    expect(overlapSql).toContain("status <> 'CANCELED'");
    expect(overlapSql).not.toContain("'CANCELLED'");
  });

  it('marks a selected match event when a suggested sitter is booked', async () => {
    passAllPreChecks();
    transactionWithOverlap([]);

    const res = await request(makeApp()).post('/api/bookings').send({ ...validBody, matchEventId: 77 });

    expect(res.status).toBe(201);
    const matchUpdate = capturedSql.find((sql) => sql.includes('UPDATE match_events'));
    expect(matchUpdate).toContain('was_selected = TRUE');
    expect(matchUpdate).toContain('booking_id = $1');
    const matchSelect = capturedSql.find((sql) => sql.includes('FROM match_events'));
    expect(matchSelect).toContain('location_id = $4');
    expect(matchSelect).toContain('booking_from = $6');
    expect(matchSelect).toContain('booking_to = $7');
  });
});

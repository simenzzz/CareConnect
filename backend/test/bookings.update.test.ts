import { describe, it, expect, vi, beforeEach } from 'vitest';
import express from 'express';
import request from 'supertest';

/**
 * Tests for the price-lock guard on PUT /api/bookings/:id (R4).
 *
 * The Whish callback re-verifies the charged amount against the (otherwise
 * mutable) booking, so once a payment has been initiated the owning customer
 * must NOT be able to lower price_usd/discount — doing so would let them pay
 * less than agreed and still pass verification.
 */

const fakeEnv = { NODE_ENV: 'test' };
vi.mock('../src/config/env', () => ({ getEnv: () => fakeEnv, loadEnv: () => fakeEnv }));

vi.mock('../src/middleware/auth', () => ({
  verifyToken: (req: any, _res: any, next: any) => {
    req.user = { uid: 'test-uid' };
    next();
  },
}));

const queryMock = vi.fn();
vi.mock('../src/config/database', () => ({
  query: (...args: unknown[]) => queryMock(...args),
  withTransaction: (...args: unknown[]) => Promise.resolve(),
}));

import bookingsRouter from '../src/routes/bookings';

const makeApp = () => {
  const app = express();
  app.use(express.json());
  app.use('/api/bookings', bookingsRouter);
  return app;
};

const BOOKING_ROW = {
  id: 1234,
  sitter_id: 3,
  customer_id: 20,
  location_id: 1,
  booking_from: '2026-07-01T10:00:00Z',
  booking_to: '2026-07-01T14:00:00Z',
  payment_method: null,
  price_usd: '50',
  discount: '0',
  status: 'UPCOMING',
  updated_at: '2026-06-07T00:00:00Z',
};

// Resolve an authenticated customer who owns booking 1234. `paymentExists`
// controls whether the price-lock SELECT finds a payments row.
const setupCustomer = (paymentExists: boolean) =>
  queryMock.mockImplementation((text: string) => {
    if (text.includes('FROM users WHERE firebase_uid')) {
      return Promise.resolve({ rows: [{ id: 10, user_type: 'customer' }] });
    }
    if (text.includes('FROM customers WHERE user_id')) {
      return Promise.resolve({ rows: [{ id: 20 }] });
    }
    if (text.includes('SELECT * FROM bookings WHERE id')) {
      return Promise.resolve({ rows: [BOOKING_ROW], rowCount: 1 });
    }
    if (text.includes('FROM payments')) {
      return Promise.resolve({ rows: paymentExists ? [{ '?column?': 1 }] : [] });
    }
    if (text.includes('UPDATE bookings')) {
      return Promise.resolve({ rows: [{ ...BOOKING_ROW, price_usd: '40' }] });
    }
    return Promise.resolve({ rows: [] });
  });

describe('Booking price lock (R4)', () => {
  beforeEach(() => {
    queryMock.mockReset();
  });

  it('rejects a customer price change once a payment row exists (403)', async () => {
    setupCustomer(true);

    const res = await request(makeApp()).put('/api/bookings/1234').send({ priceUsd: 40 });

    expect(res.status).toBe(403);
    expect(res.body.error).toMatch(/price cannot be changed/i);
    // The booking must NOT have been updated.
    const wroteBooking = queryMock.mock.calls.some(
      ([text]) => typeof text === 'string' && text.includes('UPDATE bookings'),
    );
    expect(wroteBooking).toBe(false);
  });

  it('allows a customer price change before any payment exists', async () => {
    setupCustomer(false);

    const res = await request(makeApp()).put('/api/bookings/1234').send({ priceUsd: 40 });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.booking.priceUsd).toBe(40);
  });
});

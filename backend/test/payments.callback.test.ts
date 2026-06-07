import { describe, it, expect, vi, beforeEach } from 'vitest';
import express from 'express';
import request from 'supertest';

/**
 * Regression tests for the forgeable-payment-callback vulnerability (C2).
 *
 * The `?status=success` query param on the Whish callback is attacker-controllable
 * and must NEVER, on its own, confirm a booking. The only source of truth is the
 * server-side re-verification with Whish (and an amount check). These tests pin
 * that behavior so the deleted test-mode bypass can't be reintroduced.
 */

const fakeEnv = {
  NODE_ENV: 'test',
  WHISH_API_URL: 'https://whish.test/api',
  WHISH_CHANNEL: 'real-channel',
  WHISH_SECRET: 'real-secret',
  WHISH_WEBSITE_URL: 'https://site.test',
  FRONTEND_URL: 'https://front.test',
  BACKEND_URL: 'https://back.test',
  PAYMENT_CURRENCY: 'USD',
};

vi.mock('../src/config/env', () => ({ getEnv: () => fakeEnv, loadEnv: () => fakeEnv }));
vi.mock('../src/config/firebase', () => ({ verifyIdToken: vi.fn() }));

const queryMock = vi.fn();
vi.mock('../src/config/database', () => ({
  query: (...args: unknown[]) => queryMock(...args),
  // Run the callback against a client whose query() delegates to the same mock,
  // so the two UPDATEs inside the callback's transaction are still observable.
  withTransaction: async (
    fn: (client: { query: (...a: unknown[]) => unknown }) => unknown,
  ) => fn({ query: (...args: unknown[]) => queryMock(...args) }),
}));

// Imported after the mocks are registered.
import paymentsRouter from '../src/routes/payments';

const BOOKING = { id: 123, price_usd: '100', discount: '0', status: 'PENDING' };

const makeApp = () => {
  const app = express();
  app.use(express.json());
  app.use('/api/payments', paymentsRouter);
  return app;
};

// Default: the booking exists and has a PENDING payment row (charged amount 100)
// to complete.
const onlyBookingSelect = () =>
  queryMock.mockImplementation((text: string) => {
    if (text.includes('SELECT * FROM bookings')) {
      return Promise.resolve({ rows: [BOOKING], rowCount: 1 });
    }
    // The amount actually charged is verified against this immutable row, not the
    // (mutable) booking price.
    if (text.includes('SELECT amount FROM payments')) {
      return Promise.resolve({ rows: [{ amount: '100' }], rowCount: 1 });
    }
    if (text.includes('UPDATE payments')) {
      return Promise.resolve({ rows: [], rowCount: 1 });
    }
    return Promise.resolve({ rows: [], rowCount: 0 });
  });

const bookingWasConfirmed = () =>
  queryMock.mock.calls.some(
    ([text, params]) =>
      typeof text === 'string' &&
      text.includes('UPDATE bookings') &&
      Array.isArray(params) &&
      params.includes('CONFIRMED'),
  );

describe('Whish callback cannot be forged (C2)', () => {
  beforeEach(() => {
    queryMock.mockReset();
  });

  it('does NOT confirm when Whish reports the payment is not successful', async () => {
    onlyBookingSelect();
    global.fetch = vi
      .fn()
      .mockResolvedValue({ json: async () => ({ status: true, data: { collectStatus: 'pending' } }) }) as never;

    const res = await request(makeApp()).get(
      '/api/payments/whish/callback?status=success&externalId=123',
    );

    expect(res.body.success).toBe(false);
    expect(bookingWasConfirmed()).toBe(false);
  });

  it('does NOT confirm and writes nothing when the Whish status check throws', async () => {
    onlyBookingSelect();
    global.fetch = vi.fn().mockRejectedValue(new Error('network down')) as never;

    const res = await request(makeApp()).get(
      '/api/payments/whish/callback?status=success&externalId=123',
    );

    expect(res.status).toBe(500);
    const wroteAnything = queryMock.mock.calls.some(
      ([text]) => typeof text === 'string' && text.includes('UPDATE'),
    );
    expect(wroteAnything).toBe(false);
  });

  it('does NOT confirm when Whish reports success but the amount is wrong', async () => {
    onlyBookingSelect();
    global.fetch = vi.fn().mockResolvedValue({
      json: async () => ({ status: true, data: { collectStatus: 'success', amount: 999 } }),
    }) as never;

    const res = await request(makeApp()).get(
      '/api/payments/whish/callback?status=success&externalId=123',
    );

    expect(res.body.success).toBe(false);
    expect(bookingWasConfirmed()).toBe(false);
  });

  it('does NOT confirm when Whish verifies success but no PENDING payment exists', async () => {
    // Booking exists but there is no PENDING payment row to complete (callback for an
    // externalId that was never initiated, or a replayed callback).
    queryMock.mockImplementation((text: string) => {
      if (text.includes('SELECT * FROM bookings')) {
        return Promise.resolve({ rows: [BOOKING], rowCount: 1 });
      }
      return Promise.resolve({ rows: [], rowCount: 0 });
    });
    global.fetch = vi.fn().mockResolvedValue({
      json: async () => ({ status: true, data: { collectStatus: 'success', amount: 100 } }),
    }) as never;

    const res = await request(makeApp()).get(
      '/api/payments/whish/callback?status=success&externalId=123',
    );

    expect(res.status).toBe(409);
    expect(res.body.success).toBe(false);
    expect(bookingWasConfirmed()).toBe(false);
  });

  it('does NOT report success if confirming the booking fails mid-transaction', async () => {
    // The payment UPDATE succeeds but the booking UPDATE throws. Because both run
    // in one transaction, the failure must propagate (500) rather than returning a
    // success while leaving the booking unconfirmed.
    queryMock.mockImplementation((text: string) => {
      if (text.includes('SELECT * FROM bookings')) {
        return Promise.resolve({ rows: [BOOKING], rowCount: 1 });
      }
      if (text.includes('UPDATE payments')) {
        return Promise.resolve({ rows: [], rowCount: 1 });
      }
      if (text.includes('UPDATE bookings')) {
        return Promise.reject(new Error('db write failed'));
      }
      return Promise.resolve({ rows: [], rowCount: 0 });
    });
    global.fetch = vi.fn().mockResolvedValue({
      json: async () => ({ status: true, data: { collectStatus: 'success', amount: 100 } }),
    }) as never;

    const res = await request(makeApp()).get(
      '/api/payments/whish/callback?status=success&externalId=123',
    );

    expect(res.status).toBe(500);
    expect(res.body.success).toBe(false);
  });

  it('DOES confirm when Whish verifies success with the correct amount', async () => {
    onlyBookingSelect();
    global.fetch = vi.fn().mockResolvedValue({
      json: async () => ({ status: true, data: { collectStatus: 'success', amount: 100 } }),
    }) as never;

    const res = await request(makeApp()).get(
      '/api/payments/whish/callback?status=success&externalId=123',
    );

    expect(res.body.success).toBe(true);
    expect(bookingWasConfirmed()).toBe(true);
  });
});

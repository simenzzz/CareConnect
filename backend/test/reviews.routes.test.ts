import { describe, it, expect, vi, beforeEach } from 'vitest';
import express from 'express';
import request from 'supertest';

const fakeEnv = { NODE_ENV: 'test' };
vi.mock('../src/config/env', () => ({ getEnv: () => fakeEnv, loadEnv: () => fakeEnv }));

let userType: 'customer' | 'sitter' = 'customer';
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

import reviewsRouter from '../src/routes/reviews';

const makeApp = () => {
  const app = express();
  app.use(express.json());
  app.use('/api/reviews', reviewsRouter);
  return app;
};

const wireCustomerAndBooking = (status = 'COMPLETED') => {
  queryMock.mockImplementation((text: string) => {
    if (text.includes('FROM users WHERE firebase_uid')) {
      return Promise.resolve({ rows: [{ id: 10, user_type: userType }] });
    }
    if (text.includes('FROM customers WHERE user_id')) {
      return Promise.resolve({ rows: [{ id: 20 }] });
    }
    if (text.includes('FROM bookings')) {
      return Promise.resolve({ rows: [{ id: 30, sitter_id: 40, customer_id: 20, status }] });
    }
    return Promise.resolve({ rows: [] });
  });
};

describe('reviews routes', () => {
  beforeEach(() => {
    queryMock.mockReset();
    withTransactionMock.mockReset();
    userType = 'customer';
  });

  it('creates a review only for a completed booking and recomputes sitter rating', async () => {
    wireCustomerAndBooking();
    const client = {
      query: vi.fn((text: string) => {
        if (text.includes('INSERT INTO reviews')) {
          return Promise.resolve({ rows: [{ id: 1, booking_id: 30, rating: 5 }] });
        }
        return Promise.resolve({ rows: [] });
      }),
    };
    withTransactionMock.mockImplementation((fn) => fn(client));

    const res = await request(makeApp()).post('/api/reviews').send({ bookingId: 30, rating: 5 });

    expect(res.status).toBe(201);
    expect(client.query.mock.calls.some(([sql]) => String(sql).includes('UPDATE sitters'))).toBe(true);
  });

  it('rejects reviews for non-completed bookings', async () => {
    wireCustomerAndBooking('UPCOMING');

    const res = await request(makeApp()).post('/api/reviews').send({ bookingId: 30, rating: 4 });

    expect(res.status).toBe(400);
    expect(withTransactionMock).not.toHaveBeenCalled();
  });

  it('rejects sitters writing reviews', async () => {
    userType = 'sitter';
    wireCustomerAndBooking();

    const res = await request(makeApp()).post('/api/reviews').send({ bookingId: 30, rating: 4 });

    expect(res.status).toBe(403);
  });
});

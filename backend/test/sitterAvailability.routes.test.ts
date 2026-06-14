import { describe, it, expect, vi, beforeEach } from 'vitest';
import express from 'express';
import request from 'supertest';

const fakeEnv = { NODE_ENV: 'test' };
vi.mock('../src/config/env', () => ({ getEnv: () => fakeEnv, loadEnv: () => fakeEnv }));

let userType: 'customer' | 'sitter' = 'sitter';
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

import authRouter from '../src/routes/auth';

const makeApp = () => {
  const app = express();
  app.use(express.json());
  app.use('/api/auth', authRouter);
  return app;
};

const wireSitter = () => {
  queryMock.mockImplementation((text: string) => {
    if (text.includes('FROM users WHERE firebase_uid')) {
      return Promise.resolve({ rows: [{ id: 10, user_type: userType }] });
    }
    if (text.includes('FROM sitters WHERE user_id')) {
      return Promise.resolve({ rows: [{ id: 20 }] });
    }
    if (text.includes('FROM sitter_availability')) {
      return Promise.resolve({ rows: [{ id: 1, day_of_week: 1, start_time: '09:00:00', end_time: '17:00:00' }] });
    }
    return Promise.resolve({ rows: [] });
  });
};

describe('sitter availability routes', () => {
  beforeEach(() => {
    queryMock.mockReset();
    withTransactionMock.mockReset();
    userType = 'sitter';
  });

  it('lists the authenticated sitter availability', async () => {
    wireSitter();

    const res = await request(makeApp()).get('/api/auth/sitter/availability');

    expect(res.status).toBe(200);
    expect(res.body.slots[0]).toMatchObject({ dayOfWeek: 1, startTime: '09:00', endTime: '17:00' });
  });

  it('replaces availability inside a transaction', async () => {
    wireSitter();
    const client = { query: vi.fn().mockResolvedValue({ rows: [] }) };
    withTransactionMock.mockImplementation((fn) => fn(client));

    const res = await request(makeApp()).put('/api/auth/sitter/availability').send({
      slots: [{ dayOfWeek: 2, startTime: '10:00', endTime: '14:00' }],
    });

    expect(res.status).toBe(200);
    expect(withTransactionMock).toHaveBeenCalledTimes(1);
    expect(client.query.mock.calls[0][0]).toContain('DELETE FROM sitter_availability');
    expect(client.query.mock.calls[1][0]).toContain('INSERT INTO sitter_availability');
  });

  it('rejects customers managing sitter availability', async () => {
    userType = 'customer';
    wireSitter();

    const res = await request(makeApp()).get('/api/auth/sitter/availability');

    expect(res.status).toBe(403);
  });
});

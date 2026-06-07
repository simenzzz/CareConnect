import { describe, it, expect, vi, beforeEach } from 'vitest';
import express from 'express';
import request from 'supertest';

/**
 * Tests for the auth router's login + ownership (IDOR) behavior. These pin the
 * security-critical contracts BEFORE auth.ts is split into modules (Step 6 / M1),
 * so the refactor can't silently change them.
 */

const fakeEnv = { NODE_ENV: 'test' };
vi.mock('../src/config/env', () => ({ getEnv: () => fakeEnv, loadEnv: () => fakeEnv }));

// verifyToken (the real middleware in auth.ts) calls verifyIdToken — stub it to
// resolve a fixed Firebase uid so requests authenticate as "user A".
vi.mock('../src/config/firebase', () => ({
  verifyIdToken: vi.fn(async () => ({ uid: 'user-A-uid' })),
}));

const queryMock = vi.fn();
vi.mock('../src/config/database', () => ({
  query: (...args: unknown[]) => queryMock(...args),
}));

// Match on the SQL text safely (the helper may receive non-string args in some paths).
const sql = (text: unknown): string => (typeof text === 'string' ? text : '');

import authRouter from '../src/routes/auth';

const makeApp = () => {
  const app = express();
  app.use(express.json());
  app.use('/api/auth', authRouter);
  return app;
};

const authed = (req: request.Test) => req.set('Authorization', 'Bearer fake-token');

describe('POST /api/auth/login', () => {
  beforeEach(() => queryMock.mockReset());

  it('returns the userType for a matching account', async () => {
    queryMock.mockImplementation((t: unknown) => { const text = sql(t);
      if (text.includes('FROM users WHERE firebase_uid')) {
        return Promise.resolve({ rows: [{ id: 1, user_type: 'customer', created_at: 'now' }] });
      }
      if (text.includes('FROM customers WHERE user_id')) {
        return Promise.resolve({ rows: [{ id: 42 }] });
      }
      return Promise.resolve({ rows: [] });
    });

    const res = await authed(request(makeApp()).post('/api/auth/login')).send({ expectedUserType: 'customer' });

    expect(res.status).toBe(200);
    expect(res.body.user.userType).toBe('customer');
  });

  it('rejects when the account type does not match expectedUserType', async () => {
    queryMock.mockImplementation((t: unknown) => { const text = sql(t);
      if (text.includes('FROM users WHERE firebase_uid')) {
        return Promise.resolve({ rows: [{ id: 1, user_type: 'sitter', created_at: 'now' }] });
      }
      return Promise.resolve({ rows: [] });
    });

    const res = await authed(request(makeApp()).post('/api/auth/login')).send({ expectedUserType: 'customer' });

    expect(res.status).toBe(403);
  });
});

describe('DELETE /api/auth/children/:id — ownership (IDOR)', () => {
  beforeEach(() => queryMock.mockReset());

  // Resolve user A -> customer id 42. The child id in the URL is attacker-controlled.
  const wireOwnershipLookups = (onDelete: () => Promise<{ rows: unknown[] }>) =>
    queryMock.mockImplementation((t: unknown) => { const text = sql(t);
      if (text.includes('FROM users WHERE firebase_uid')) {
        return Promise.resolve({ rows: [{ id: 1, user_type: 'customer' }] });
      }
      if (text.includes('FROM customers WHERE user_id')) {
        return Promise.resolve({ rows: [{ id: 42 }] });
      }
      if (text.includes('UPDATE children SET is_active = FALSE')) {
        return onDelete();
      }
      return Promise.resolve({ rows: [] });
    });

  it("scopes the delete by the token-derived customer id, not the URL", async () => {
    wireOwnershipLookups(() => Promise.resolve({ rows: [] })); // row not owned by customer 42

    const res = await authed(request(makeApp()).delete('/api/auth/children/999'));

    // Not owned -> 404, and the delete must be scoped by customer_id = 42 (from token).
    expect(res.status).toBe(404);
    const deleteCall = queryMock.mock.calls.find(
      ([text]) => typeof text === 'string' && text.includes('UPDATE children SET is_active = FALSE'),
    );
    expect(deleteCall).toBeDefined();
    expect(deleteCall![0]).toContain('customer_id = $2');
    expect(deleteCall![1]).toEqual([999, 42]);
  });

  it('deletes when the child belongs to the authenticated customer', async () => {
    wireOwnershipLookups(() => Promise.resolve({ rows: [{ id: 7 }] })); // owned

    const res = await authed(request(makeApp()).delete('/api/auth/children/7'));

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });
});

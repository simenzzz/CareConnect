import { describe, it, expect, vi, beforeEach } from 'vitest';
import express from 'express';
import request from 'supertest';

/**
 * Tests for the auth router's login + ownership (IDOR) behavior. These pin the
 * security-critical contracts BEFORE auth.ts is split into modules (Step 6 / M1),
 * so the refactor can't silently change them.
 */

const fakeEnv = { NODE_ENV: 'test', FIREBASE_STORAGE_BUCKET: 'careconnect.test' };
vi.mock('../src/config/env', () => ({ getEnv: () => fakeEnv, loadEnv: () => fakeEnv }));

// verifyToken (the real middleware in auth.ts) calls verifyIdToken — stub it to
// resolve a fixed Firebase uid so requests authenticate as "user A".
vi.mock('../src/config/firebase', () => ({
  verifyIdToken: vi.fn(async () => ({ uid: 'user-A-uid', email: 'user-a@example.test' })),
  getStorageFileMetadata: vi.fn(async () => ({ contentType: 'image/jpeg', size: 1024 })),
}));

const queryMock = vi.fn();
vi.mock('../src/config/database', () => ({
  query: (...args: unknown[]) => queryMock(...args),
}));

// Match on the SQL text safely (the helper may receive non-string args in some paths).
const sql = (text: unknown): string => (typeof text === 'string' ? text : '');

import authRouter from '../src/routes/auth';
import { getStorageFileMetadata } from '../src/config/firebase';

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

describe('POST /api/auth/register — sitter profile image', () => {
  beforeEach(() => {
    queryMock.mockReset();
    vi.mocked(getStorageFileMetadata).mockReset();
    vi.mocked(getStorageFileMetadata).mockResolvedValue({ contentType: 'image/jpeg', size: 1024 });
  });

  const validSitterProfile = {
    fullName: 'Nour Khoury',
    dateOfBirth: '1998-03-18',
    area: 'Achrafieh',
    city: 'Beirut',
    phone: '+961 71 210 110',
    hoursPerWeek: '32',
    sitterType: 'B',
    experience: 'Five years',
    description: 'Calm sitter',
    profileImageUrl:
      'https://firebasestorage.googleapis.com/v0/b/careconnect.test/o/sitter-profile-images%2Fuser-A-uid%2Fprofile-123.jpg?alt=media&token=test-token',
    profileImagePath: 'sitter-profile-images/user-A-uid/profile-123.jpg',
    cvUrl: 'https://example.test/cv.pdf',
    identityDocumentUrl: 'https://example.test/id.pdf',
    skills: [],
  };

  const wireRegister = () => {
    queryMock.mockImplementation((t: unknown) => {
      const text = sql(t);
      if (text.includes('SELECT id FROM users WHERE firebase_uid')) {
        return Promise.resolve({ rows: [] });
      }
      if (text === 'BEGIN' || text === 'COMMIT' || text === 'ROLLBACK') {
        return Promise.resolve({ rows: [] });
      }
      if (text.includes('INSERT INTO users')) {
        return Promise.resolve({ rows: [{ id: 10 }] });
      }
      if (text.includes('INSERT INTO sitters')) {
        return Promise.resolve({ rows: [{ id: 20 }] });
      }
      return Promise.resolve({ rows: [] });
    });
  };

  it('requires profile image fields for sitter registration', async () => {
    const res = await request(makeApp()).post('/api/auth/register').send({
      idToken: 'fake-token',
      userType: 'sitter',
      profileData: { ...validSitterProfile, profileImageUrl: undefined },
    });

    expect(res.status).toBe(400);
    expect(queryMock).not.toHaveBeenCalled();
  });

  it('rejects a profile image path outside the authenticated Firebase uid folder', async () => {
    wireRegister();

    const res = await request(makeApp()).post('/api/auth/register').send({
      idToken: 'fake-token',
      userType: 'sitter',
      profileData: {
        ...validSitterProfile,
        profileImagePath: 'sitter-profile-images/other-user/profile-123.jpg',
      },
    });

    expect(res.status).toBe(400);
    expect(queryMock.mock.calls.some(([text]) => text === 'ROLLBACK')).toBe(true);
  });

  it('rejects a profile image URL that does not point at the owned Storage path', async () => {
    wireRegister();

    const res = await request(makeApp()).post('/api/auth/register').send({
      idToken: 'fake-token',
      userType: 'sitter',
      profileData: {
        ...validSitterProfile,
        profileImageUrl: 'https://example.test/not-the-uploaded-file.jpg',
      },
    });

    expect(res.status).toBe(400);
    expect(queryMock.mock.calls.some(([text]) => text === 'ROLLBACK')).toBe(true);
  });

  it('rejects a profile image URL from the wrong Firebase Storage bucket', async () => {
    wireRegister();

    const res = await request(makeApp()).post('/api/auth/register').send({
      idToken: 'fake-token',
      userType: 'sitter',
      profileData: {
        ...validSitterProfile,
        profileImageUrl:
          'https://firebasestorage.googleapis.com/v0/b/other-bucket/o/sitter-profile-images%2Fuser-A-uid%2Fprofile-123.jpg?alt=media',
      },
    });

    expect(res.status).toBe(400);
    expect(queryMock.mock.calls.some(([text]) => text === 'ROLLBACK')).toBe(true);
  });

  it('rejects a profile image URL whose object name only prefixes the submitted path', async () => {
    wireRegister();

    const res = await request(makeApp()).post('/api/auth/register').send({
      idToken: 'fake-token',
      userType: 'sitter',
      profileData: {
        ...validSitterProfile,
        profileImageUrl:
          'https://firebasestorage.googleapis.com/v0/b/careconnect.test/o/sitter-profile-images%2Fuser-A-uid%2Fprofile-123.jpg-extra?alt=media',
      },
    });

    expect(res.status).toBe(400);
    expect(queryMock.mock.calls.some(([text]) => text === 'ROLLBACK')).toBe(true);
  });

  it('rejects an owned profile image object with invalid metadata', async () => {
    vi.mocked(getStorageFileMetadata).mockResolvedValueOnce({ contentType: 'application/pdf', size: 1024 });
    wireRegister();

    const res = await request(makeApp()).post('/api/auth/register').send({
      idToken: 'fake-token',
      userType: 'sitter',
      profileData: validSitterProfile,
    });

    expect(res.status).toBe(400);
    expect(queryMock.mock.calls.some(([text]) => text === 'ROLLBACK')).toBe(true);
  });

  it('rejects a profile image object that does not exist in Storage', async () => {
    vi.mocked(getStorageFileMetadata).mockRejectedValueOnce(new Error('not found'));
    wireRegister();

    const res = await request(makeApp()).post('/api/auth/register').send({
      idToken: 'fake-token',
      userType: 'sitter',
      profileData: validSitterProfile,
    });

    expect(res.status).toBe(400);
    expect(queryMock.mock.calls.some(([text]) => text === 'ROLLBACK')).toBe(true);
  });

  it('stores the profile image url and storage path on the sitter row', async () => {
    wireRegister();

    const res = await request(makeApp()).post('/api/auth/register').send({
      idToken: 'fake-token',
      userType: 'sitter',
      profileData: validSitterProfile,
    });

    expect(res.status).toBe(201);
    const sitterInsert = queryMock.mock.calls.find(
      ([text]) => typeof text === 'string' && text.includes('INSERT INTO sitters'),
    );
    expect(sitterInsert).toBeDefined();
    expect(sitterInsert![0]).toContain('profile_image_url');
    expect(sitterInsert![0]).toContain('profile_image_path');
    expect(sitterInsert![1]).toContain(validSitterProfile.profileImageUrl);
    expect(sitterInsert![1]).toContain(validSitterProfile.profileImagePath);
    expect(getStorageFileMetadata).toHaveBeenCalledWith(validSitterProfile.profileImagePath);
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

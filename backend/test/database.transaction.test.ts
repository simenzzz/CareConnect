import { describe, it, expect, vi, beforeEach } from 'vitest';

/**
 * Unit tests for the `withTransaction` helper — the core H4 atomicity guarantee.
 * Verifies it commits on success and ROLLBACKs (never COMMITs) on a thrown error,
 * always releasing the client.
 */

vi.mock('../src/config/env', () => ({
  getEnv: () => ({
    NODE_ENV: 'test',
    DB_USER: 'u',
    DB_HOST: 'h',
    DB_NAME: 'n',
    DB_PASSWORD: 'p',
    DB_PORT: 5432,
  }),
}));

const sql: string[] = [];
const release = vi.fn();
const fakeClient = {
  query: vi.fn((text: string) => {
    sql.push(text);
    return Promise.resolve({ rows: [] });
  }),
  release,
};

vi.mock('pg', () => ({
  Pool: class {
    connect() {
      return Promise.resolve(fakeClient);
    }
  },
}));

import { connectDatabase, withTransaction } from '../src/config/database';

connectDatabase();

describe('withTransaction', () => {
  beforeEach(() => {
    sql.length = 0;
    release.mockClear();
    fakeClient.query.mockClear();
  });

  it('commits and releases on success', async () => {
    const result = await withTransaction(async (client) => {
      await client.query('INSERT INTO bookings ...');
      return 'done';
    });

    expect(result).toBe('done');
    expect(sql).toEqual(['BEGIN', 'INSERT INTO bookings ...', 'COMMIT']);
    expect(sql).not.toContain('ROLLBACK');
    expect(release).toHaveBeenCalledTimes(1);
  });

  it('rolls back (never commits) and releases when the callback throws', async () => {
    await expect(
      withTransaction(async (client) => {
        await client.query('INSERT INTO bookings ...');
        throw new Error('boom');
      }),
    ).rejects.toThrow('boom');

    expect(sql).toContain('BEGIN');
    expect(sql).toContain('ROLLBACK');
    expect(sql).not.toContain('COMMIT');
    expect(release).toHaveBeenCalledTimes(1);
  });
});

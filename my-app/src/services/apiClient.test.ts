import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../config/env', () => ({ env: { apiBaseUrl: 'https://api.test' } }));

const getIdToken = vi.fn(async () => 'tok-123');
vi.mock('../config/firebase', () => ({
  auth: { get currentUser() { return { getIdToken }; } },
}));

import { apiRequest } from './apiClient';

describe('apiRequest', () => {
  beforeEach(() => {
    getIdToken.mockClear();
  });

  it('prepends the base URL and attaches the bearer token', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, text: async () => JSON.stringify({ hello: 'world' }) });
    global.fetch = fetchMock as never;

    const result = await apiRequest('/auth/profile');

    const [url, options] = fetchMock.mock.calls[0];
    expect(url).toBe('https://api.test/auth/profile');
    expect(options.headers.Authorization).toBe('Bearer tok-123');
    expect(result).toEqual({ hello: 'world' });
  });

  it('does not attach a token when auth:false', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, text: async () => '{}' });
    global.fetch = fetchMock as never;

    await apiRequest('/public', { auth: false });

    const [, options] = fetchMock.mock.calls[0];
    expect(options.headers.Authorization).toBeUndefined();
    expect(getIdToken).not.toHaveBeenCalled();
  });

  it('throws the backend error message on a non-ok response', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 400,
      text: async () => JSON.stringify({ error: 'Bad input' }),
    }) as never;

    await expect(apiRequest('/x', { auth: false })).rejects.toThrow('Bad input');
  });

  it('maps a network failure to a friendly message', async () => {
    global.fetch = vi.fn().mockRejectedValue(new TypeError('Failed to fetch')) as never;

    await expect(apiRequest('/x', { auth: false })).rejects.toThrow(/unable to connect/i);
  });
});

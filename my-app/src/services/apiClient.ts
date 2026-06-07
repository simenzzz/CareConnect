import { auth } from '../config/firebase';
import { env } from '../config/env';

/**
 * Single HTTP client for the backend API. Centralizes the base URL, Firebase
 * ID-token attachment, JSON encoding, and the uniform error-handling that all
 * service modules previously duplicated.
 */

export interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  body?: unknown;
  /** Attach the Firebase ID token (default true). Set false for public endpoints. */
  auth?: boolean;
  headers?: Record<string, string>;
}

async function getIdToken(): Promise<string> {
  const user = auth.currentUser;
  if (!user) {
    throw new Error('You must be signed in to perform this action.');
  }
  return user.getIdToken();
}

export async function apiRequest<T = unknown>(
  endpoint: string,
  options: RequestOptions = {},
): Promise<T> {
  const { method = 'GET', body, auth: needsAuth = true, headers = {} } = options;

  const finalHeaders: Record<string, string> = { ...headers };
  if (body !== undefined) {
    finalHeaders['Content-Type'] = 'application/json';
  }
  if (needsAuth) {
    finalHeaders['Authorization'] = `Bearer ${await getIdToken()}`;
  }

  let response: Response;
  try {
    response = await fetch(`${env.apiBaseUrl}${endpoint}`, {
      method,
      headers: finalHeaders,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new Error('Unable to connect to the server. Please check your connection and try again.');
  }

  // Parse the body once; tolerate empty responses.
  let result: unknown = null;
  const text = await response.text();
  if (text) {
    try {
      result = JSON.parse(text);
    } catch {
      result = text;
    }
  }

  if (!response.ok) {
    const payload = result as { error?: string; message?: string } | null;
    throw new Error(payload?.error || payload?.message || `Request failed (${response.status})`);
  }

  return result as T;
}

export const api = {
  get: <T = unknown>(endpoint: string, options?: Omit<RequestOptions, 'method' | 'body'>) =>
    apiRequest<T>(endpoint, { ...options, method: 'GET' }),
  post: <T = unknown>(endpoint: string, body?: unknown, options?: Omit<RequestOptions, 'method' | 'body'>) =>
    apiRequest<T>(endpoint, { ...options, method: 'POST', body }),
  put: <T = unknown>(endpoint: string, body?: unknown, options?: Omit<RequestOptions, 'method' | 'body'>) =>
    apiRequest<T>(endpoint, { ...options, method: 'PUT', body }),
  del: <T = unknown>(endpoint: string, options?: Omit<RequestOptions, 'method' | 'body'>) =>
    apiRequest<T>(endpoint, { ...options, method: 'DELETE' }),
};

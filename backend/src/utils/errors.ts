import type { Response } from 'express';
import { getEnv } from '../config/env';

/**
 * Thrown inside a booking transaction when the requested slot overlaps an
 * existing booking for the same sitter. Handlers map this to HTTP 409.
 */
export class BookingConflictError extends Error {
  constructor(message = 'Sitter is already booked for an overlapping time slot') {
    super(message);
    this.name = 'BookingConflictError';
  }
}

/**
 * Returns extra error detail ONLY in non-production environments. In production
 * this is an empty object, so `error.message`/stack detail never reaches clients.
 *
 * Usage:
 *   return res.status(500).json({ success: false, message: 'Failed to X', ...errorDetails(error) });
 */
export const errorDetails = (error: unknown): { details?: string } => {
  if (getEnv().NODE_ENV === 'production') {
    return {};
  }
  const message = error instanceof Error ? error.message : 'Unknown error';
  return { details: message };
};

/**
 * Convenience for the common `{ success: false, message, ...details }` shape.
 * Keeps the dev-only detail gating in one place.
 */
export const sendError = (
  res: Response,
  status: number,
  message: string,
  error?: unknown,
): Response =>
  res.status(status).json({
    success: false,
    message,
    ...(error === undefined ? {} : errorDetails(error)),
  });

import type { Request, Response, NextFunction } from 'express';
import { ZodError, type ZodType } from 'zod';

/**
 * Build a middleware that validates `req.body` against a zod schema. On success
 * it replaces `req.body` with the parsed (typed, unknown-key-stripped) value so
 * downstream handlers only ever see validated data. On failure it returns 400
 * with flattened field errors and never reaches the handler.
 */
export const validateBody =
  <T>(schema: ZodType<T>) =>
  (req: Request, res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: formatZodError(result.error),
      });
      return;
    }
    req.body = result.data;
    next();
  };

/**
 * Same as {@link validateBody} but validates `req.query`. The parsed result is
 * stashed on `res.locals.query` because Express 5's `req.query` is a getter-only
 * property and cannot be reassigned.
 */
export const validateQuery =
  <T>(schema: ZodType<T>) =>
  (req: Request, res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.query);
    if (!result.success) {
      res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: formatZodError(result.error),
      });
      return;
    }
    res.locals.query = result.data;
    next();
  };

const formatZodError = (error: ZodError): Record<string, string[]> => {
  const fieldErrors: Record<string, string[]> = {};
  for (const issue of error.issues) {
    const key = issue.path.join('.') || '(root)';
    (fieldErrors[key] ??= []).push(issue.message);
  }
  return fieldErrors;
};

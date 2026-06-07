import type { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';
import { verifyIdToken } from '../config/firebase';

/** Express request augmented with the verified Firebase user. */
export interface AuthenticatedRequest extends Request {
  user?: {
    uid: string;
    email?: string;
    [key: string]: unknown;
  };
}

/**
 * Verifies the `Authorization: Bearer <idToken>` header via Firebase Admin and
 * attaches the decoded token to `req.user`. This is the single identity gate for
 * the API — every authenticated route mounts it.
 */
export const verifyToken = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({ error: 'No token provided' });
      return;
    }

    const idToken = authHeader.split('Bearer ')[1];
    const decodedToken = await verifyIdToken(idToken);
    req.user = decodedToken as AuthenticatedRequest['user'];
    next();
  } catch (error) {
    logger.error('Token verification error:', error);
    res.status(401).json({ error: 'Invalid token' });
  }
};

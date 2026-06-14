import express from 'express';
import { logger } from '../utils/logger';
import type { Response } from 'express';
import { z } from 'zod';
import { query } from '../config/database';
import { verifyToken, AuthenticatedRequest } from '../middleware/auth';
import { validateQuery } from '../middleware/validate';
import { errorDetails } from '../utils/errors';
import { SITTER_CARD_COLUMNS, buildCards } from '../repositories/sitterRepository';

const router = express.Router();

// Pagination params (capped to protect the DB and limit scraping).
const paginationSchema = z.looseObject({
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),
});

const searchSchema = paginationSchema.extend({
  name: z.string().trim().min(1, 'Search name is required').max(100),
});

// Get all active and verified sitters (paginated). Requires authentication.
router.get(
  '/fetchSitters',
  verifyToken,
  validateQuery(paginationSchema),
  async (_req: AuthenticatedRequest, res: Response): Promise<express.Response> => {
    try {
      const { limit, offset } = res.locals.query as { limit: number; offset: number };

      const sittersResult = await query(
        `SELECT ${SITTER_CARD_COLUMNS}
         FROM sitters s
         WHERE s.is_active = true AND s.is_verified = true
         ORDER BY s.rating DESC, s.created_at DESC
         LIMIT $1 OFFSET $2`,
        [limit, offset],
      );

      const sittersWithSkills = await buildCards(sittersResult.rows);

      const petSitters = sittersWithSkills.filter((s) => s.sitterType === 'P' || s.sitterType === 'T');
      const babySitters = sittersWithSkills.filter((s) => s.sitterType === 'B' || s.sitterType === 'T');

      return res.json({
        success: true,
        data: {
          petSitters,
          babySitters,
          allSitters: sittersWithSkills,
        },
        pagination: { limit, offset, count: sittersWithSkills.length },
      });
    } catch (error) {
      logger.error('Error fetching sitters:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to fetch sitters',
        ...errorDetails(error),
      });
    }
  },
);

// Search sitters by name (paginated). Requires authentication.
router.get(
  '/searchByName',
  verifyToken,
  validateQuery(searchSchema),
  async (_req: AuthenticatedRequest, res: Response): Promise<express.Response> => {
    try {
      const { name, limit, offset } = res.locals.query as {
        name: string;
        limit: number;
        offset: number;
      };

      const sittersResult = await query(
        `SELECT ${SITTER_CARD_COLUMNS}
         FROM sitters s
         WHERE s.is_active = true
           AND s.is_verified = true
           AND s.full_name ILIKE $1
         ORDER BY s.rating DESC, s.created_at DESC
         LIMIT $2 OFFSET $3`,
        [`%${name}%`, limit, offset],
      );

      if (sittersResult.rows.length === 0) {
        return res.json({
          success: true,
          data: [],
          message: 'No sitters found matching your search',
        });
      }

      const sittersWithSkills = await buildCards(sittersResult.rows);

      return res.json({
        success: true,
        data: sittersWithSkills,
        pagination: { limit, offset, count: sittersWithSkills.length },
      });
    } catch (error) {
      logger.error('Error searching sitters:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to search sitters',
        ...errorDetails(error),
      });
    }
  },
);

export default router;

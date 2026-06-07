import express from 'express';
import { logger } from '../utils/logger';
import type { Response } from 'express';
import { z } from 'zod';
import { query } from '../config/database';
import { verifyToken, AuthenticatedRequest } from '../middleware/auth';
import { validateQuery } from '../middleware/validate';
import { errorDetails } from '../utils/errors';

const router = express.Router();

// Pagination params (capped to protect the DB and limit scraping).
const paginationSchema = z.looseObject({
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),
});

const searchSchema = paginationSchema.extend({
  name: z.string().trim().min(1, 'Search name is required').max(100),
});

// Columns returned to clients. Contact PII (phone) is deliberately NOT included —
// only authenticated users see cards, and contact details are gated separately.
const SITTER_CARD_COLUMNS = `
  s.id,
  s.full_name,
  s.area,
  s.city,
  s.hours_per_week,
  s.sitter_type,
  s.description,
  s.rating,
  s.experience,
  s.created_at`;

interface SitterRow {
  id: number;
  full_name: string;
  area: string;
  city: string;
  hours_per_week: string;
  sitter_type: 'B' | 'P' | 'T';
  description: string | null;
  rating: string;
  experience: string;
  created_at: string;
}

/**
 * Fetch skills for many sitters in a SINGLE query (no N+1), grouped by sitter id.
 */
const fetchSkillsBySitter = async (sitterIds: number[]): Promise<Map<number, string[]>> => {
  const byId = new Map<number, string[]>();
  if (sitterIds.length === 0) {
    return byId;
  }
  const skillsResult = await query(
    'SELECT sitter_id, skill_name FROM sitter_skills WHERE sitter_id = ANY($1) ORDER BY created_at',
    [sitterIds],
  );
  for (const row of skillsResult.rows) {
    const list = byId.get(row.sitter_id) ?? [];
    list.push(row.skill_name);
    byId.set(row.sitter_id, list);
  }
  return byId;
};

const toCard = (sitter: SitterRow, skills: string[]) => ({
  id: sitter.id,
  fullName: sitter.full_name,
  area: sitter.area,
  city: sitter.city,
  hoursPerWeek: sitter.hours_per_week,
  sitterType: sitter.sitter_type, // 'B' = Baby Sitter, 'P' = Pet Sitter, 'T' = Both
  description: sitter.description,
  rating: parseFloat(sitter.rating) || 0,
  experience: sitter.experience,
  skills,
  createdAt: sitter.created_at,
});

const buildCards = async (rows: SitterRow[]) => {
  const skillsById = await fetchSkillsBySitter(rows.map((r) => r.id));
  return rows.map((sitter) => toCard(sitter, skillsById.get(sitter.id) ?? []));
};

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

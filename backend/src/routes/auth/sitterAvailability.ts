import express from 'express';
import { logger } from '../../utils/logger';
import { query, withTransaction } from '../../config/database';
import { verifyToken, type AuthenticatedRequest } from '../../middleware/auth';
import { validateBody } from '../../middleware/validate';
import { sitterAvailabilitySchema } from '../../validation/auth.schemas';
import { errorDetails } from '../../utils/errors';
import { resolveSitterId } from './helpers';

const router = express.Router();

router.get('/sitter/availability', verifyToken, async (req: AuthenticatedRequest, res): Promise<express.Response> => {
  try {
    const sitterId = await resolveSitterId(req, res, 'availability');
    if (sitterId === null) return res as express.Response;

    const result = await query(
      `SELECT id, day_of_week, start_time, end_time
       FROM sitter_availability
       WHERE sitter_id = $1
       ORDER BY day_of_week ASC, start_time ASC`,
      [sitterId],
    );

    return res.json({
      success: true,
      slots: result.rows.map((row) => ({
        id: row.id,
        dayOfWeek: row.day_of_week,
        startTime: String(row.start_time).slice(0, 5),
        endTime: String(row.end_time).slice(0, 5),
      })),
    });
  } catch (error) {
    logger.error('Get sitter availability error:', error);
    return res.status(500).json({ error: 'Failed to fetch availability', ...errorDetails(error) });
  }
});

router.put(
  '/sitter/availability',
  verifyToken,
  validateBody(sitterAvailabilitySchema),
  async (req: AuthenticatedRequest, res): Promise<express.Response> => {
    try {
      const sitterId = await resolveSitterId(req, res, 'availability');
      if (sitterId === null) return res as express.Response;

      const { slots } = req.body as {
        slots: { dayOfWeek: number; startTime: string; endTime: string }[];
      };

      await withTransaction(async (client) => {
        await client.query('DELETE FROM sitter_availability WHERE sitter_id = $1', [sitterId]);
        if (slots.length === 0) {
          return;
        }
        const params: unknown[] = [];
        const values = slots.map((slot, index) => {
          const offset = index * 4;
          params.push(sitterId, slot.dayOfWeek, slot.startTime, slot.endTime);
          return `($${offset + 1}, $${offset + 2}, $${offset + 3}, $${offset + 4})`;
        });
        await client.query(
          `INSERT INTO sitter_availability (sitter_id, day_of_week, start_time, end_time)
           VALUES ${values.join(', ')}`,
          params,
        );
      });

      return res.json({ success: true, message: 'Availability updated successfully', slots });
    } catch (error) {
      logger.error('Update sitter availability error:', error);
      return res.status(500).json({ error: 'Failed to update availability', ...errorDetails(error) });
    }
  },
);

export default router;

import express from 'express';
import type { Response } from 'express';
import { logger } from '../utils/logger';
import { query, withTransaction } from '../config/database';
import { verifyToken, type AuthenticatedRequest } from '../middleware/auth';
import { validateBody } from '../middleware/validate';
import { reviewCreateSchema, reviewUpdateSchema } from '../validation/review.schemas';
import { BOOKING_STATUS } from '../constants/bookingStatus';
import { getUserByFirebaseUid, getCustomerIdByUserId } from '../repositories/userRepository';
import { errorDetails } from '../utils/errors';

const router = express.Router();

const resolveCustomer = async (req: AuthenticatedRequest, res: Response): Promise<number | null> => {
  const user = await getUserByFirebaseUid(req.user?.uid);
  if (!user) {
    res.status(404).json({ success: false, error: 'User not found' });
    return null;
  }
  if (user.user_type !== 'customer') {
    res.status(403).json({ success: false, error: 'Only customers can write reviews' });
    return null;
  }
  const customerId = await getCustomerIdByUserId(user.id);
  if (customerId === null) {
    res.status(404).json({ success: false, error: 'Customer profile not found' });
    return null;
  }
  return customerId;
};

const fetchReviewableBooking = async (bookingId: number, customerId: number) => {
  const result = await query(
    `SELECT id, sitter_id, customer_id, status
     FROM bookings
     WHERE id = $1 AND customer_id = $2`,
    [bookingId, customerId],
  );
  return result.rows[0] ?? null;
};

const recomputeSitterRating = async (client: { query: typeof query }, sitterId: number): Promise<void> => {
  await client.query(
    `UPDATE sitters
     SET rating = COALESCE(stats.avg_rating, 0),
         review_count = COALESCE(stats.review_count, 0),
         updated_at = CURRENT_TIMESTAMP
     FROM (
       SELECT AVG(rating)::decimal(3, 2) AS avg_rating, COUNT(*)::int AS review_count
       FROM reviews
       WHERE sitter_id = $1
     ) stats
     WHERE sitters.id = $1`,
    [sitterId],
  );
};

router.post('/', verifyToken, validateBody(reviewCreateSchema), async (req: AuthenticatedRequest, res): Promise<express.Response> => {
  try {
    const customerId = await resolveCustomer(req, res);
    if (customerId === null) return res as express.Response;

    const { bookingId, rating, comment } = req.body as { bookingId: number; rating: number; comment?: string };
    const booking = await fetchReviewableBooking(bookingId, customerId);
    if (!booking) {
      return res.status(404).json({ success: false, error: 'Booking not found' });
    }
    if (booking.status !== BOOKING_STATUS.COMPLETED) {
      return res.status(400).json({ success: false, error: 'Only completed bookings can be reviewed' });
    }

    const review = await withTransaction(async (client) => {
      const result = await client.query(
        `INSERT INTO reviews (booking_id, sitter_id, customer_id, rating, comment)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING *`,
        [bookingId, booking.sitter_id, customerId, rating, comment || null],
      );
      await recomputeSitterRating(client, booking.sitter_id);
      return result.rows[0];
    });

    return res.status(201).json({ success: true, review });
  } catch (error) {
    if ((error as { code?: string })?.code === '23505') {
      return res.status(409).json({ success: false, error: 'This booking has already been reviewed' });
    }
    logger.error('Create review error:', error);
    return res.status(500).json({ success: false, error: 'Failed to create review', ...errorDetails(error) });
  }
});

router.put('/:bookingId', verifyToken, validateBody(reviewUpdateSchema), async (req: AuthenticatedRequest, res): Promise<express.Response> => {
  try {
    const customerId = await resolveCustomer(req, res);
    if (customerId === null) return res as express.Response;

    const bookingId = Number(req.params.bookingId);
    if (!Number.isInteger(bookingId) || bookingId <= 0) {
      return res.status(400).json({ success: false, error: 'Invalid booking ID' });
    }

    const { rating, comment } = req.body as { rating: number; comment?: string };
    const booking = await fetchReviewableBooking(bookingId, customerId);
    if (!booking) {
      return res.status(404).json({ success: false, error: 'Booking not found' });
    }
    if (booking.status !== BOOKING_STATUS.COMPLETED) {
      return res.status(400).json({ success: false, error: 'Only completed bookings can be reviewed' });
    }

    const review = await withTransaction(async (client) => {
      const result = await client.query(
        `UPDATE reviews
         SET rating = $1, comment = $2, updated_at = CURRENT_TIMESTAMP
         WHERE booking_id = $3 AND customer_id = $4
         RETURNING *`,
        [rating, comment || null, bookingId, customerId],
      );
      if (result.rows.length === 0) {
        return null;
      }
      await recomputeSitterRating(client, booking.sitter_id);
      return result.rows[0];
    });

    if (!review) {
      return res.status(404).json({ success: false, error: 'Review not found' });
    }
    return res.json({ success: true, review });
  } catch (error) {
    logger.error('Update review error:', error);
    return res.status(500).json({ success: false, error: 'Failed to update review', ...errorDetails(error) });
  }
});

export default router;

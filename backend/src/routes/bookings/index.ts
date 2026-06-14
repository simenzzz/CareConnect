import express from 'express';
import { logger } from '../../utils/logger';
import type { Response } from 'express';
import { query, withTransaction } from '../../config/database';
import { verifyToken } from '../../middleware/auth';
import type { AuthenticatedRequest } from '../../middleware/auth';
import { errorDetails, BookingConflictError, BadRequestError } from '../../utils/errors';
import { validateBody } from '../../middleware/validate';
import { bookingCreateSchema, bookingUpdateSchema } from '../../validation/booking.schemas';
import { BOOKING_STATUS, BOOKING_STATUS_UPDATABLE, PAYMENT_STATUS } from '../../constants/bookingStatus';
import {
  getUserByFirebaseUid,
  getCustomerIdByUserId,
  getSitterIdByUserId,
} from '../../repositories/userRepository';
import listRouter from './list';
import suggestionsRouter from './suggestions';

const router = express.Router();

// Read-only matching suggestions (GET /api/bookings/suggestions). Mounted first so
// its literal path is resolved before any future parameterized routes.
router.use(suggestionsRouter);

// POST /api/bookings - Create a new booking (customers only)
router.post('/', verifyToken, validateBody(bookingCreateSchema), async (req: AuthenticatedRequest, res: Response): Promise<express.Response> => {
  try {
    const firebaseUid = req.user?.uid;
    const {
      sitterId,
      locationId,
      bookingFrom,
      bookingTo,
      paymentMethod,
      priceUsd,
      discount,
      typeOfBooking,
      petId,
      childId,
      additionalNotes,
      matchEventId,
      childrenIds,
      petIds
    } = req.body;
    
    if (!firebaseUid) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    
    // Convert single IDs to arrays for compatibility
    let childrenIdsArray = childrenIds || [];
    let petIdsArray = petIds || [];
    
    if (typeOfBooking === 'CHILD' && childId) {
      childrenIdsArray = [childId];
    }
    if (typeOfBooking === 'PET' && petId) {
      petIdsArray = [petId];
    }
    
    // Validate required fields
    if (!sitterId || !locationId || !bookingFrom || !bookingTo || !priceUsd) {
      return res.status(400).json({ 
        error: 'Missing required fields: sitterId, locationId, bookingFrom, bookingTo, priceUsd' 
      });
    }
    
    // Validate that at least one child or pet is provided
    if (childrenIdsArray.length === 0 && petIdsArray.length === 0) {
      return res.status(400).json({ 
        error: typeOfBooking === 'PET' ? 'petId is required for PET bookings' : 
               typeOfBooking === 'CHILD' ? 'childId is required for CHILD bookings' :
               'At least one child or pet must be included in the booking'
      });
    }
    
    // Get user info (must be customer)
    const user = await getUserByFirebaseUid(firebaseUid);

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (user.user_type !== 'customer') {
      return res.status(403).json({ error: 'Only customers can create bookings' });
    }

    // Get customer ID
    const customerId = await getCustomerIdByUserId(user.id);

    if (customerId === null) {
      return res.status(404).json({ error: 'Customer profile not found' });
    }
    
    // Validate sitter exists and is active
    const sitterResult = await query(
      'SELECT id, sitter_type FROM sitters WHERE id = $1 AND is_active = true AND is_verified = true',
      [sitterId]
    );
    
    if (sitterResult.rows.length === 0) {
      return res.status(404).json({ error: 'Sitter not found or not available' });
    }
    
    // Validate children belong to customer
    if (childrenIdsArray.length > 0) {
      const childrenCheck = await query(
        'SELECT COUNT(*) as count FROM children WHERE id = ANY($1) AND customer_id = $2 AND is_active = TRUE',
        [childrenIdsArray, customerId]
      );
      
      if (parseInt(childrenCheck.rows[0].count) !== childrenIdsArray.length) {
        return res.status(400).json({ error: 'Some children do not belong to this customer or are inactive' });
      }
    }
    
    // Validate pets belong to customer
    if (petIdsArray.length > 0) {
      const petsCheck = await query(
        'SELECT COUNT(*) as count FROM pets WHERE id = ANY($1) AND customer_id = $2 AND is_active = TRUE',
        [petIdsArray, customerId]
      );
      
      if (parseInt(petsCheck.rows[0].count) !== petIdsArray.length) {
        return res.status(400).json({ error: 'Some pets do not belong to this customer or are inactive' });
      }
    }
    
    // Validate location belongs to customer
    const locationCheck = await query(
      'SELECT id FROM user_locations WHERE id = $1 AND customer_id = $2 AND is_active = TRUE',
      [locationId, customerId]
    );
    
    if (locationCheck.rows.length === 0) {
      return res.status(400).json({ error: 'Location does not belong to this customer or is inactive' });
    }
    
    // Determine type of booking if not provided
    const bookingType = typeOfBooking || (petIdsArray.length > 0 ? 'PET' : 'CHILD');
    const sitterType = sitterResult.rows[0].sitter_type as 'B' | 'P' | 'T';
    const serviceMatches =
      (bookingType === 'CHILD' && (sitterType === 'B' || sitterType === 'T')) ||
      (bookingType === 'PET' && (sitterType === 'P' || sitterType === 'T'));
    if (!serviceMatches) {
      return res.status(400).json({ error: 'Sitter does not support this booking type' });
    }

    // Create the booking + junction rows atomically. The whole unit runs in one
    // transaction so a failure mid-way can never leave an orphaned booking, and the
    // sitter row is locked (FOR UPDATE) to serialize concurrent bookings for that
    // sitter — closing the double-booking race before the overlap check.
    const newBooking = await withTransaction(async (client) => {
      await client.query('SELECT id FROM sitters WHERE id = $1 FOR UPDATE', [sitterId]);

      // Reject overlapping bookings for the same sitter. Two intervals overlap iff
      // existing.from < new.to AND existing.to > new.from. CANCELED bookings don't count
      // (spelling must match the status written by the update handler — single 'L').
      const overlap = await client.query(
        `SELECT id FROM bookings
         WHERE sitter_id = $1
           AND status <> '${BOOKING_STATUS.CANCELED}'
           AND booking_from < $3
           AND booking_to > $2
         LIMIT 1`,
        [sitterId, bookingFrom, bookingTo]
      );

      if (overlap.rows.length > 0) {
        throw new BookingConflictError();
      }

      if (matchEventId) {
        const matchEvent = await client.query(
          `SELECT id FROM match_events
           WHERE id = $1
             AND customer_id = $2
             AND sitter_id = $3
             AND location_id = $4
             AND type_of_booking = $5
             AND booking_from = $6
             AND booking_to = $7
             AND was_selected = FALSE
           FOR UPDATE`,
          [matchEventId, customerId, sitterId, locationId, bookingType, bookingFrom, bookingTo],
        );
        if (matchEvent.rows.length === 0) {
          throw new BadRequestError('Invalid match event for this booking');
        }
      }

      const bookingResult = await client.query(
        `INSERT INTO bookings
         (sitter_id, customer_id, location_id, booking_from, booking_to, payment_method, price_usd, discount, status, type_of_booking, additional_notes)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
         RETURNING *`,
        [
          sitterId,
          customerId,
          locationId,
          bookingFrom,
          bookingTo,
          paymentMethod || null,
          priceUsd,
          discount || 0,
          BOOKING_STATUS.UPCOMING,
          bookingType,
          additionalNotes || null
        ]
      );

      const booking = bookingResult.rows[0];

      // Multi-row inserts into the junction tables (one statement each).
      if (childrenIdsArray.length > 0) {
        const placeholders = childrenIdsArray.map((_: number, i: number) => `($1, $${i + 2})`).join(', ');
        await client.query(
          `INSERT INTO booking_children (booking_id, child_id) VALUES ${placeholders}`,
          [booking.id, ...childrenIdsArray]
        );
      }

      if (petIdsArray.length > 0) {
        const placeholders = petIdsArray.map((_: number, i: number) => `($1, $${i + 2})`).join(', ');
        await client.query(
          `INSERT INTO booking_pets (booking_id, pet_id) VALUES ${placeholders}`,
          [booking.id, ...petIdsArray]
        );
      }

      if (matchEventId) {
        await client.query(
          `UPDATE match_events
           SET was_selected = TRUE, booking_id = $1
           WHERE id = $2 AND customer_id = $3 AND sitter_id = $4`,
          [booking.id, matchEventId, customerId, sitterId],
        );
      }

      return booking;
    });

    logger.info(`✅ Booking created: ID ${newBooking.id}, Type: ${bookingType}`);
    
    return res.status(201).json({
      success: true,
      message: 'Booking created successfully',
      booking: {
        id: newBooking.id,
        sitterId: newBooking.sitter_id,
        customerId: newBooking.customer_id,
        locationId: newBooking.location_id,
        bookingFrom: newBooking.booking_from,
        bookingTo: newBooking.booking_to,
        paymentMethod: newBooking.payment_method,
        priceUsd: parseFloat(newBooking.price_usd),
        discount: parseFloat(newBooking.discount),
        status: newBooking.status,
        typeOfBooking: newBooking.type_of_booking,
        additionalNotes: newBooking.additional_notes,
        createdAt: newBooking.created_at,
        childrenIds: childrenIdsArray,
        petIds: petIdsArray
      }
    });
    
  } catch (error) {
    // 23P01 = exclusion_violation: the DB-level overlap constraint (migrations/init.sql)
    // caught a double-booking that slipped past the app check under concurrency.
    if (error instanceof BadRequestError) {
      return res.status(400).json({ success: false, error: error.message });
    }
    if (error instanceof BookingConflictError || (error as { code?: string })?.code === '23P01') {
      return res.status(409).json({
        success: false,
        error: error instanceof BookingConflictError ? error.message : 'Sitter is already booked for an overlapping time slot'
      });
    }
    logger.error('❌ Error creating booking:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to create booking',
      ...errorDetails(error)
    });
  }
});

// PUT /api/bookings/:id - Update a booking
router.put('/:id', verifyToken, validateBody(bookingUpdateSchema), async (req: AuthenticatedRequest, res: Response): Promise<express.Response> => {
  try {
    const firebaseUid = req.user?.uid;
    const bookingId = parseInt(req.params.id);
    const {
      bookingFrom,
      bookingTo,
      paymentMethod,
      priceUsd,
      discount,
      status,
      childrenIds,
      petIds
    } = req.body;
    
    if (!firebaseUid) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    
    if (isNaN(bookingId)) {
      return res.status(400).json({ error: 'Invalid booking ID' });
    }
    
    // Get user info
    const user = await getUserByFirebaseUid(firebaseUid);

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Get booking and verify ownership
    let bookingCheck;
    let customerId: number | null = null;
    if (user.user_type === 'customer') {
      customerId = await getCustomerIdByUserId(user.id);

      if (customerId === null) {
        return res.status(404).json({ error: 'Customer profile not found' });
      }

      bookingCheck = await query(
        'SELECT * FROM bookings WHERE id = $1 AND customer_id = $2',
        [bookingId, customerId]
      );

    } else if (user.user_type === 'sitter') {
      const sitterId = await getSitterIdByUserId(user.id);

      if (sitterId === null) {
        return res.status(404).json({ error: 'Sitter profile not found' });
      }

      bookingCheck = await query(
        'SELECT * FROM bookings WHERE id = $1 AND sitter_id = $2',
        [bookingId, sitterId]
      );
      
    } else {
      return res.status(400).json({ error: 'Invalid user type' });
    }
    
    if (bookingCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Booking not found or access denied' });
    }
    
    const existingBooking = bookingCheck.rows[0];

    // Lock pricing once a live payment (pending or completed) exists for the
    // booking, so the stored record can't drift away from the amount actually
    // charged. The authoritative anti-bypass guard is the callback verifying the
    // charged amount against the immutable payment row (see payments.ts); this
    // 403 is the user-facing companion that stops the customer editing price mid-
    // payment. FAILED/abandoned payments are excluded so a customer can still
    // renegotiate before retrying.
    if (
      user.user_type === 'customer' &&
      (priceUsd !== undefined || discount !== undefined)
    ) {
      const livePayment = await query(
        `SELECT 1 FROM payments
         WHERE booking_id = $1 AND payment_status IN ($2, $3)
         LIMIT 1`,
        [bookingId, PAYMENT_STATUS.PENDING, PAYMENT_STATUS.COMPLETED]
      );
      if (livePayment.rows.length > 0) {
        return res.status(403).json({
          error: 'Price cannot be changed after payment has started'
        });
      }
    }

    // Build update query dynamically based on provided fields
    const updates: string[] = [];
    const values: any[] = [];
    let paramCount = 1;
    
    if (bookingFrom !== undefined) {
      updates.push(`booking_from = $${paramCount++}`);
      values.push(bookingFrom);
    }
    
    if (bookingTo !== undefined) {
      updates.push(`booking_to = $${paramCount++}`);
      values.push(bookingTo);
    }
    
    if (paymentMethod !== undefined) {
      updates.push(`payment_method = $${paramCount++}`);
      values.push(paymentMethod);
    }
    
    if (priceUsd !== undefined) {
      updates.push(`price_usd = $${paramCount++}`);
      values.push(priceUsd);
    }
    
    if (discount !== undefined) {
      updates.push(`discount = $${paramCount++}`);
      values.push(discount);
    }
    
    if (status !== undefined) {
      // Defense-in-depth: the zod schema already constrains `status` to this set
      // at the boundary (CONFIRMED is excluded — only the payment callback sets it).
      if (!BOOKING_STATUS_UPDATABLE.includes(status)) {
        return res.status(400).json({
          error: `Invalid status. Must be one of: ${BOOKING_STATUS_UPDATABLE.join(', ')}`
        });
      }
      updates.push(`status = $${paramCount++}`);
      values.push(status);
    }
    
    // Apply the booking update and any child/pet association changes atomically, so
    // a mid-way failure can never leave a booking with its old row updated but its
    // junction rows half-rewritten (or wiped). Junction changes also re-verify
    // ownership here — the same customer_id-scoped check the create path enforces —
    // so a customer can't attach another customer's child/pet to their booking.
    let updatedBooking = existingBooking;
    await withTransaction(async (client) => {
      if (updates.length > 0) {
        values.push(bookingId);
        const updateQuery = `
          UPDATE bookings
          SET ${updates.join(', ')}
          WHERE id = $${paramCount}
          RETURNING *
        `;

        const updateResult = await client.query(updateQuery, values);
        updatedBooking = updateResult.rows[0];
      }

      // Only customers can change child/pet associations.
      if (childrenIds !== undefined && user.user_type === 'customer') {
        if (childrenIds.length > 0) {
          const ownership = await client.query(
            'SELECT COUNT(*)::int AS count FROM children WHERE id = ANY($1) AND customer_id = $2 AND is_active = TRUE',
            [childrenIds, customerId]
          );
          if (ownership.rows[0].count !== childrenIds.length) {
            throw new BadRequestError('Some children do not belong to this customer or are inactive');
          }
        }
        await client.query('DELETE FROM booking_children WHERE booking_id = $1', [bookingId]);
        if (childrenIds.length > 0) {
          const placeholders = childrenIds.map((_: number, i: number) => `($1, $${i + 2})`).join(', ');
          await client.query(
            `INSERT INTO booking_children (booking_id, child_id) VALUES ${placeholders}`,
            [bookingId, ...childrenIds]
          );
        }
      }

      if (petIds !== undefined && user.user_type === 'customer') {
        if (petIds.length > 0) {
          const ownership = await client.query(
            'SELECT COUNT(*)::int AS count FROM pets WHERE id = ANY($1) AND customer_id = $2 AND is_active = TRUE',
            [petIds, customerId]
          );
          if (ownership.rows[0].count !== petIds.length) {
            throw new BadRequestError('Some pets do not belong to this customer or are inactive');
          }
        }
        await client.query('DELETE FROM booking_pets WHERE booking_id = $1', [bookingId]);
        if (petIds.length > 0) {
          const placeholders = petIds.map((_: number, i: number) => `($1, $${i + 2})`).join(', ');
          await client.query(
            `INSERT INTO booking_pets (booking_id, pet_id) VALUES ${placeholders}`,
            [bookingId, ...petIds]
          );
        }
      }
    });

    logger.info(`✅ Booking updated: ID ${bookingId}`);
    
    return res.json({
      success: true,
      message: 'Booking updated successfully',
      booking: {
        id: updatedBooking.id,
        sitterId: updatedBooking.sitter_id,
        customerId: updatedBooking.customer_id,
        bookingFrom: updatedBooking.booking_from,
        bookingTo: updatedBooking.booking_to,
        paymentMethod: updatedBooking.payment_method,
        priceUsd: parseFloat(updatedBooking.price_usd),
        discount: parseFloat(updatedBooking.discount),
        status: updatedBooking.status,
        updatedAt: updatedBooking.updated_at
      }
    });
    
  } catch (error) {
    if (error instanceof BadRequestError) {
      return res.status(400).json({ success: false, error: error.message });
    }
    // 23P01 = exclusion_violation: moving the time window collided with the
    // DB-level overlap constraint (a concurrent double-booking for this sitter).
    if ((error as { code?: string })?.code === '23P01') {
      return res.status(409).json({
        success: false,
        error: 'Sitter is already booked for an overlapping time slot'
      });
    }
    logger.error('❌ Error updating booking:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to update booking',
      ...errorDetails(error)
    });
  }
});

// DELETE /api/bookings/:id - Delete/cancel a booking
router.delete('/:id', verifyToken, async (req: AuthenticatedRequest, res: Response): Promise<express.Response> => {
  try {
    const firebaseUid = req.user?.uid;
    const bookingId = parseInt(req.params.id);
    
    if (!firebaseUid) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    
    if (isNaN(bookingId)) {
      return res.status(400).json({ error: 'Invalid booking ID' });
    }
    
    // Get user info
    const user = await getUserByFirebaseUid(firebaseUid);

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Verify ownership
    let bookingCheck;
    if (user.user_type === 'customer') {
      const customerId = await getCustomerIdByUserId(user.id);

      if (customerId === null) {
        return res.status(404).json({ error: 'Customer profile not found' });
      }

      bookingCheck = await query(
        'SELECT * FROM bookings WHERE id = $1 AND customer_id = $2',
        [bookingId, customerId]
      );

    } else if (user.user_type === 'sitter') {
      const sitterId = await getSitterIdByUserId(user.id);

      if (sitterId === null) {
        return res.status(404).json({ error: 'Sitter profile not found' });
      }

      bookingCheck = await query(
        'SELECT * FROM bookings WHERE id = $1 AND sitter_id = $2',
        [bookingId, sitterId]
      );
      
    } else {
      return res.status(400).json({ error: 'Invalid user type' });
    }
    
    if (bookingCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Booking not found or access denied' });
    }
    
    const booking = bookingCheck.rows[0];
    
    // Check if booking can be deleted (only UPCOMING bookings)
    if (booking.status !== BOOKING_STATUS.UPCOMING) {
      return res.status(400).json({ 
        error: `Cannot delete booking with status ${booking.status}. Only UPCOMING bookings can be deleted.` 
      });
    }
    
    // Check if booking_from is in the future
    const bookingFromDate = new Date(booking.booking_from);
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Set to start of day for comparison
    
    if (bookingFromDate < today) {
      return res.status(400).json({ 
        error: 'Cannot delete bookings that have already started or are in the past.' 
      });
    }
    
    // Delete booking (this will cascade to booking_children and booking_pets)
    await query('DELETE FROM bookings WHERE id = $1', [bookingId]);
    
    logger.info(`✅ Booking deleted: ID ${bookingId}`);
    
    return res.json({
      success: true,
      message: 'Booking deleted successfully'
    });
    
  } catch (error) {
    logger.error('❌ Error deleting booking:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to delete booking',
      ...errorDetails(error)
    });
  }
});

// Read endpoints (GET list / pets / children / :id)
router.use(listRouter);

export default router;

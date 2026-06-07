import express from 'express';
import type { Response } from 'express';
import { query, withTransaction } from '../../config/database';
import { verifyToken } from '../../middleware/auth';
import type { AuthenticatedRequest } from '../../middleware/auth';
import { errorDetails, BookingConflictError } from '../../utils/errors';
import { validateBody } from '../../middleware/validate';
import { bookingCreateSchema, bookingUpdateSchema } from '../../validation/booking.schemas';
import listRouter from './list';

const router = express.Router();

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
    const userResult = await query(
      'SELECT id, user_type FROM users WHERE firebase_uid = $1',
      [firebaseUid]
    );
    
    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    const user = userResult.rows[0];
    
    if (user.user_type !== 'customer') {
      return res.status(403).json({ error: 'Only customers can create bookings' });
    }
    
    // Get customer ID
    const customerResult = await query(
      'SELECT id FROM customers WHERE user_id = $1',
      [user.id]
    );
    
    if (customerResult.rows.length === 0) {
      return res.status(404).json({ error: 'Customer profile not found' });
    }
    
    const customerId = customerResult.rows[0].id;
    
    // Validate sitter exists and is active
    const sitterResult = await query(
      'SELECT id FROM sitters WHERE id = $1 AND is_active = true AND is_verified = true',
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
           AND status <> 'CANCELED'
           AND booking_from < $3
           AND booking_to > $2
         LIMIT 1`,
        [sitterId, bookingFrom, bookingTo]
      );

      if (overlap.rows.length > 0) {
        throw new BookingConflictError();
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
          'UPCOMING',
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

      return booking;
    });

    console.log(`✅ Booking created: ID ${newBooking.id}, Type: ${bookingType}`);
    
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
    // 23P01 = exclusion_violation: the DB-level overlap constraint (migration 004)
    // caught a double-booking that slipped past the app check under concurrency.
    if (error instanceof BookingConflictError || (error as { code?: string })?.code === '23P01') {
      return res.status(409).json({
        success: false,
        error: error instanceof BookingConflictError ? error.message : 'Sitter is already booked for an overlapping time slot'
      });
    }
    console.error('❌ Error creating booking:', error);
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
    const userResult = await query(
      'SELECT id, user_type FROM users WHERE firebase_uid = $1',
      [firebaseUid]
    );
    
    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    const user = userResult.rows[0];
    
    // Get booking and verify ownership
    let bookingCheck;
    if (user.user_type === 'customer') {
      const customerResult = await query(
        'SELECT id FROM customers WHERE user_id = $1',
        [user.id]
      );
      
      if (customerResult.rows.length === 0) {
        return res.status(404).json({ error: 'Customer profile not found' });
      }
      
      bookingCheck = await query(
        'SELECT * FROM bookings WHERE id = $1 AND customer_id = $2',
        [bookingId, customerResult.rows[0].id]
      );
      
    } else if (user.user_type === 'sitter') {
      const sitterResult = await query(
        'SELECT id FROM sitters WHERE user_id = $1',
        [user.id]
      );
      
      if (sitterResult.rows.length === 0) {
        return res.status(404).json({ error: 'Sitter profile not found' });
      }
      
      bookingCheck = await query(
        'SELECT * FROM bookings WHERE id = $1 AND sitter_id = $2',
        [bookingId, sitterResult.rows[0].id]
      );
      
    } else {
      return res.status(400).json({ error: 'Invalid user type' });
    }
    
    if (bookingCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Booking not found or access denied' });
    }
    
    const existingBooking = bookingCheck.rows[0];
    
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
      // Validate status
      const validStatuses = ['CANCELED', 'ONGOING', 'COMPLETED', 'UPCOMING'];
      if (!validStatuses.includes(status)) {
        return res.status(400).json({ 
          error: 'Invalid status. Must be one of: CANCELED, ONGOING, COMPLETED, UPCOMING' 
        });
      }
      updates.push(`status = $${paramCount++}`);
      values.push(status);
    }
    
    // Update booking if there are changes
    if (updates.length > 0) {
      values.push(bookingId);
      const updateQuery = `
        UPDATE bookings 
        SET ${updates.join(', ')}
        WHERE id = $${paramCount}
        RETURNING *
      `;
      
      const updateResult = await query(updateQuery, values);
      var updatedBooking = updateResult.rows[0];
    } else {
      var updatedBooking = existingBooking;
    }
    
    // Update children if provided (only customers can do this)
    if (childrenIds !== undefined && user.user_type === 'customer') {
      // Remove existing children associations
      await query('DELETE FROM booking_children WHERE booking_id = $1', [bookingId]);
      
      // Add new children associations
      if (childrenIds.length > 0) {
        for (const childId of childrenIds) {
          await query(
            'INSERT INTO booking_children (booking_id, child_id) VALUES ($1, $2)',
            [bookingId, childId]
          );
        }
      }
    }
    
    // Update pets if provided (only customers can do this)
    if (petIds !== undefined && user.user_type === 'customer') {
      // Remove existing pets associations
      await query('DELETE FROM booking_pets WHERE booking_id = $1', [bookingId]);
      
      // Add new pets associations
      if (petIds.length > 0) {
        for (const petId of petIds) {
          await query(
            'INSERT INTO booking_pets (booking_id, pet_id) VALUES ($1, $2)',
            [bookingId, petId]
          );
        }
      }
    }
    
    console.log(`✅ Booking updated: ID ${bookingId}`);
    
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
    console.error('❌ Error updating booking:', error);
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
    const userResult = await query(
      'SELECT id, user_type FROM users WHERE firebase_uid = $1',
      [firebaseUid]
    );
    
    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    const user = userResult.rows[0];
    
    // Verify ownership
    let bookingCheck;
    if (user.user_type === 'customer') {
      const customerResult = await query(
        'SELECT id FROM customers WHERE user_id = $1',
        [user.id]
      );
      
      if (customerResult.rows.length === 0) {
        return res.status(404).json({ error: 'Customer profile not found' });
      }
      
      bookingCheck = await query(
        'SELECT * FROM bookings WHERE id = $1 AND customer_id = $2',
        [bookingId, customerResult.rows[0].id]
      );
      
    } else if (user.user_type === 'sitter') {
      const sitterResult = await query(
        'SELECT id FROM sitters WHERE user_id = $1',
        [user.id]
      );
      
      if (sitterResult.rows.length === 0) {
        return res.status(404).json({ error: 'Sitter profile not found' });
      }
      
      bookingCheck = await query(
        'SELECT * FROM bookings WHERE id = $1 AND sitter_id = $2',
        [bookingId, sitterResult.rows[0].id]
      );
      
    } else {
      return res.status(400).json({ error: 'Invalid user type' });
    }
    
    if (bookingCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Booking not found or access denied' });
    }
    
    const booking = bookingCheck.rows[0];
    
    // Check if booking can be deleted (only UPCOMING bookings)
    if (booking.status !== 'UPCOMING') {
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
    
    console.log(`✅ Booking deleted: ID ${bookingId}`);
    
    return res.json({
      success: true,
      message: 'Booking deleted successfully'
    });
    
  } catch (error) {
    console.error('❌ Error deleting booking:', error);
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

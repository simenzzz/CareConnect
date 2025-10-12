import express from 'express';
import type { Request, Response } from 'express';
import { query } from '../config/database';
import { verifyToken } from './auth';
import type { AuthenticatedRequest } from './auth';

const router = express.Router();

// GET /api/bookings - Get all bookings for the authenticated user (customer or sitter)
router.get('/', verifyToken, async (req: AuthenticatedRequest, res: Response): Promise<express.Response> => {
  try {
    const firebaseUid = req.user?.uid;
    
    if (!firebaseUid) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    
    // Get user info to determine if customer or sitter
    const userResult = await query(
      'SELECT id, user_type FROM users WHERE firebase_uid = $1',
      [firebaseUid]
    );
    
    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    const user = userResult.rows[0];
    let bookings;
    
    if (user.user_type === 'customer') {
      // Get customer's bookings
      const customerResult = await query(
        'SELECT id FROM customers WHERE user_id = $1',
        [user.id]
      );
      
      if (customerResult.rows.length === 0) {
        return res.status(404).json({ error: 'Customer profile not found' });
      }
      
      const customerId = customerResult.rows[0].id;
      
      // Get all bookings for this customer with sitter details
      const bookingsResult = await query(
        `SELECT 
          b.id,
          b.sitter_id,
          b.customer_id,
          b.booking_from,
          b.booking_to,
          b.payment_method,
          b.price_usd,
          b.discount,
          b.status,
          b.created_at,
          b.updated_at,
          s.full_name as sitter_name,
          s.phone as sitter_phone,
          s.area as sitter_area,
          s.city as sitter_city
        FROM bookings b
        JOIN sitters s ON b.sitter_id = s.id
        WHERE b.customer_id = $1
        ORDER BY b.booking_from DESC`,
        [customerId]
      );
      
      bookings = bookingsResult.rows;
      
    } else if (user.user_type === 'sitter') {
      // Get sitter's bookings
      const sitterResult = await query(
        'SELECT id FROM sitters WHERE user_id = $1',
        [user.id]
      );
      
      if (sitterResult.rows.length === 0) {
        return res.status(404).json({ error: 'Sitter profile not found' });
      }
      
      const sitterId = sitterResult.rows[0].id;
      
      // Get all bookings for this sitter with customer details
      const bookingsResult = await query(
        `SELECT 
          b.id,
          b.sitter_id,
          b.customer_id,
          b.booking_from,
          b.booking_to,
          b.payment_method,
          b.price_usd,
          b.discount,
          b.status,
          b.created_at,
          b.updated_at,
          c.full_name as customer_name,
          c.phone as customer_phone,
          c.area as customer_area,
          c.city as customer_city
        FROM bookings b
        JOIN customers c ON b.customer_id = c.id
        WHERE b.sitter_id = $1
        ORDER BY b.booking_from DESC`,
        [sitterId]
      );
      
      bookings = bookingsResult.rows;
      
    } else {
      return res.status(400).json({ error: 'Invalid user type' });
    }
    
    // For each booking, get associated children and pets
    const bookingsWithDetails = await Promise.all(
      bookings.map(async (booking) => {
        // Get children for this booking
        const childrenResult = await query(
          `SELECT c.id, c.name as full_name, c.age, c.gender
           FROM booking_children bc
           JOIN children c ON bc.child_id = c.id
           WHERE bc.booking_id = $1`,
          [booking.id]
        );
        
        // Get pets for this booking
        const petsResult = await query(
          `SELECT p.id, p.name, p.type, p.breed, p.age
           FROM booking_pets bp
           JOIN pets p ON bp.pet_id = p.id
           WHERE bp.booking_id = $1`,
          [booking.id]
        );
        
        return {
          id: booking.id,
          sitterId: booking.sitter_id,
          customerId: booking.customer_id,
          bookingFrom: booking.booking_from,
          bookingTo: booking.booking_to,
          paymentMethod: booking.payment_method,
          priceUsd: parseFloat(booking.price_usd),
          discount: parseFloat(booking.discount),
          status: booking.status,
          createdAt: booking.created_at,
          updatedAt: booking.updated_at,
          // Include other party's details based on user type
          ...(user.user_type === 'customer' ? {
            sitter: {
              name: booking.sitter_name,
              phone: booking.sitter_phone,
              area: booking.sitter_area,
              city: booking.sitter_city
            }
          } : {
            customer: {
              name: booking.customer_name,
              phone: booking.customer_phone,
              area: booking.customer_area,
              city: booking.customer_city
            }
          }),
          children: childrenResult.rows.map(child => ({
            id: child.id,
            fullName: child.full_name,
            age: child.age,
            gender: child.gender
          })),
          pets: petsResult.rows.map(pet => ({
            id: pet.id,
            name: pet.name,
            type: pet.type,
            breed: pet.breed,
            age: pet.age
          }))
        };
      })
    );
    
    return res.json({
      success: true,
      userType: user.user_type,
      bookings: bookingsWithDetails
    });
    
  } catch (error) {
    console.error('❌ Error fetching bookings:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch bookings',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// GET /api/bookings/pets - Get all pet bookings for the authenticated user
router.get('/pets', verifyToken, async (req: AuthenticatedRequest, res: Response): Promise<express.Response> => {
  try {
    const firebaseUid = req.user?.uid;
    
    if (!firebaseUid) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    
    // Get user info to determine if customer or sitter
    const userResult = await query(
      'SELECT id, user_type FROM users WHERE firebase_uid = $1',
      [firebaseUid]
    );
    
    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    const user = userResult.rows[0];
    let bookings;
    
    if (user.user_type === 'customer') {
      const customerResult = await query(
        'SELECT id FROM customers WHERE user_id = $1',
        [user.id]
      );
      
      if (customerResult.rows.length === 0) {
        return res.status(404).json({ error: 'Customer profile not found' });
      }
      
      const customerId = customerResult.rows[0].id;
      
      // Get bookings that have pets
      const bookingsResult = await query(
        `SELECT DISTINCT
          b.id,
          b.sitter_id,
          b.customer_id,
          b.booking_from,
          b.booking_to,
          b.payment_method,
          b.price_usd,
          b.discount,
          b.status,
          b.created_at,
          b.updated_at,
          s.full_name as sitter_name,
          s.phone as sitter_phone,
          s.area as sitter_area,
          s.city as sitter_city,
          ul.location_name,
          ul.address_line,
          ul.area as location_area,
          ul.city as location_city
        FROM bookings b
        JOIN sitters s ON b.sitter_id = s.id
        JOIN booking_pets bp ON b.id = bp.booking_id
        LEFT JOIN user_locations ul ON b.location_id = ul.id
        WHERE b.customer_id = $1
        ORDER BY b.booking_from DESC`,
        [customerId]
      );
      
      bookings = bookingsResult.rows;
      
    } else if (user.user_type === 'sitter') {
      const sitterResult = await query(
        'SELECT id FROM sitters WHERE user_id = $1',
        [user.id]
      );
      
      if (sitterResult.rows.length === 0) {
        return res.status(404).json({ error: 'Sitter profile not found' });
      }
      
      const sitterId = sitterResult.rows[0].id;
      
      // Get bookings that have pets
      const bookingsResult = await query(
        `SELECT DISTINCT
          b.id,
          b.sitter_id,
          b.customer_id,
          b.booking_from,
          b.booking_to,
          b.payment_method,
          b.price_usd,
          b.discount,
          b.status,
          b.created_at,
          b.updated_at,
          c.full_name as customer_name,
          c.phone as customer_phone,
          c.area as customer_area,
          c.city as customer_city,
          ul.location_name,
          ul.address_line,
          ul.area as location_area,
          ul.city as location_city
        FROM bookings b
        JOIN customers c ON b.customer_id = c.id
        JOIN booking_pets bp ON b.id = bp.booking_id
        LEFT JOIN user_locations ul ON b.location_id = ul.id
        WHERE b.sitter_id = $1
        ORDER BY b.booking_from DESC`,
        [sitterId]
      );
      
      bookings = bookingsResult.rows;
      
    } else {
      return res.status(400).json({ error: 'Invalid user type' });
    }
    
    // Get pets for each booking
    const bookingsWithDetails = await Promise.all(
      bookings.map(async (booking) => {
        const petsResult = await query(
          `SELECT p.id, p.name, p.type, p.breed, p.age
           FROM booking_pets bp
           JOIN pets p ON bp.pet_id = p.id
           WHERE bp.booking_id = $1`,
          [booking.id]
        );
        
        return {
          id: booking.id,
          sitterId: booking.sitter_id,
          customerId: booking.customer_id,
          bookingFrom: booking.booking_from,
          bookingTo: booking.booking_to,
          paymentMethod: booking.payment_method,
          priceUsd: parseFloat(booking.price_usd),
          discount: parseFloat(booking.discount),
          status: booking.status,
          createdAt: booking.created_at,
          updatedAt: booking.updated_at,
          ...(user.user_type === 'customer' ? {
            sitter: {
              name: booking.sitter_name,
              phone: booking.sitter_phone,
              area: booking.sitter_area,
              city: booking.sitter_city
            }
          } : {
            customer: {
              name: booking.customer_name,
              phone: booking.customer_phone,
              area: booking.customer_area,
              city: booking.customer_city
            }
          }),
          location: {
            name: booking.location_name,
            addressLine: booking.address_line,
            area: booking.location_area,
            city: booking.location_city
          },
          pets: petsResult.rows.map(pet => ({
            id: pet.id,
            name: pet.name,
            type: pet.type,
            breed: pet.breed,
            age: pet.age
          }))
        };
      })
    );
    
    return res.json({
      success: true,
      userType: user.user_type,
      bookings: bookingsWithDetails
    });
    
  } catch (error) {
    console.error('❌ Error fetching pet bookings:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch pet bookings',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// GET /api/bookings/children - Get all child bookings for the authenticated user
router.get('/children', verifyToken, async (req: AuthenticatedRequest, res: Response): Promise<express.Response> => {
  try {
    const firebaseUid = req.user?.uid;
    
    if (!firebaseUid) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    
    // Get user info to determine if customer or sitter
    const userResult = await query(
      'SELECT id, user_type FROM users WHERE firebase_uid = $1',
      [firebaseUid]
    );
    
    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    const user = userResult.rows[0];
    let bookings;
    
    if (user.user_type === 'customer') {
      const customerResult = await query(
        'SELECT id FROM customers WHERE user_id = $1',
        [user.id]
      );
      
      if (customerResult.rows.length === 0) {
        return res.status(404).json({ error: 'Customer profile not found' });
      }
      
      const customerId = customerResult.rows[0].id;
      
      // Get bookings that have children
      const bookingsResult = await query(
        `SELECT DISTINCT
          b.id,
          b.sitter_id,
          b.customer_id,
          b.booking_from,
          b.booking_to,
          b.payment_method,
          b.price_usd,
          b.discount,
          b.status,
          b.created_at,
          b.updated_at,
          s.full_name as sitter_name,
          s.phone as sitter_phone,
          s.area as sitter_area,
          s.city as sitter_city,
          ul.location_name,
          ul.address_line,
          ul.area as location_area,
          ul.city as location_city
        FROM bookings b
        JOIN sitters s ON b.sitter_id = s.id
        JOIN booking_children bc ON b.id = bc.booking_id
        LEFT JOIN user_locations ul ON b.location_id = ul.id
        WHERE b.customer_id = $1
        ORDER BY b.booking_from DESC`,
        [customerId]
      );
      
      bookings = bookingsResult.rows;
      
    } else if (user.user_type === 'sitter') {
      const sitterResult = await query(
        'SELECT id FROM sitters WHERE user_id = $1',
        [user.id]
      );
      
      if (sitterResult.rows.length === 0) {
        return res.status(404).json({ error: 'Sitter profile not found' });
      }
      
      const sitterId = sitterResult.rows[0].id;
      
      // Get bookings that have children
      const bookingsResult = await query(
        `SELECT DISTINCT
          b.id,
          b.sitter_id,
          b.customer_id,
          b.booking_from,
          b.booking_to,
          b.payment_method,
          b.price_usd,
          b.discount,
          b.status,
          b.created_at,
          b.updated_at,
          c.full_name as customer_name,
          c.phone as customer_phone,
          c.area as customer_area,
          c.city as customer_city,
          ul.location_name,
          ul.address_line,
          ul.area as location_area,
          ul.city as location_city
        FROM bookings b
        JOIN customers c ON b.customer_id = c.id
        JOIN booking_children bc ON b.id = bc.booking_id
        LEFT JOIN user_locations ul ON b.location_id = ul.id
        WHERE b.sitter_id = $1
        ORDER BY b.booking_from DESC`,
        [sitterId]
      );
      
      bookings = bookingsResult.rows;
      
    } else {
      return res.status(400).json({ error: 'Invalid user type' });
    }
    
    // Get children for each booking
    const bookingsWithDetails = await Promise.all(
      bookings.map(async (booking) => {
        const childrenResult = await query(
          `SELECT c.id, c.name as full_name, c.age, c.gender
           FROM booking_children bc
           JOIN children c ON bc.child_id = c.id
           WHERE bc.booking_id = $1`,
          [booking.id]
        );
        
        return {
          id: booking.id,
          sitterId: booking.sitter_id,
          customerId: booking.customer_id,
          bookingFrom: booking.booking_from,
          bookingTo: booking.booking_to,
          paymentMethod: booking.payment_method,
          priceUsd: parseFloat(booking.price_usd),
          discount: parseFloat(booking.discount),
          status: booking.status,
          createdAt: booking.created_at,
          updatedAt: booking.updated_at,
          ...(user.user_type === 'customer' ? {
            sitter: {
              name: booking.sitter_name,
              phone: booking.sitter_phone,
              area: booking.sitter_area,
              city: booking.sitter_city
            }
          } : {
            customer: {
              name: booking.customer_name,
              phone: booking.customer_phone,
              area: booking.customer_area,
              city: booking.customer_city
            }
          }),
          location: {
            name: booking.location_name,
            addressLine: booking.address_line,
            area: booking.location_area,
            city: booking.location_city
          },
          children: childrenResult.rows.map(child => ({
            id: child.id,
            fullName: child.full_name,
            age: child.age,
            gender: child.gender
          }))
        };
      })
    );
    
    return res.json({
      success: true,
      userType: user.user_type,
      bookings: bookingsWithDetails
    });
    
  } catch (error) {
    console.error('❌ Error fetching child bookings:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch child bookings',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// GET /api/bookings/:id - Get a specific booking by ID
router.get('/:id', verifyToken, async (req: AuthenticatedRequest, res: Response): Promise<express.Response> => {
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
    
    // Get the booking with validation that user is part of this booking
    let bookingQuery;
    let queryParams;
    
    if (user.user_type === 'customer') {
      const customerResult = await query(
        'SELECT id FROM customers WHERE user_id = $1',
        [user.id]
      );
      
      if (customerResult.rows.length === 0) {
        return res.status(404).json({ error: 'Customer profile not found' });
      }
      
      bookingQuery = `
        SELECT 
          b.id,
          b.sitter_id,
          b.customer_id,
          b.booking_from,
          b.booking_to,
          b.payment_method,
          b.price_usd,
          b.discount,
          b.status,
          b.created_at,
          b.updated_at,
          s.full_name as sitter_name,
          s.phone as sitter_phone,
          s.area as sitter_area,
          s.city as sitter_city
        FROM bookings b
        JOIN sitters s ON b.sitter_id = s.id
        WHERE b.id = $1 AND b.customer_id = $2
      `;
      queryParams = [bookingId, customerResult.rows[0].id];
      
    } else if (user.user_type === 'sitter') {
      const sitterResult = await query(
        'SELECT id FROM sitters WHERE user_id = $1',
        [user.id]
      );
      
      if (sitterResult.rows.length === 0) {
        return res.status(404).json({ error: 'Sitter profile not found' });
      }
      
      bookingQuery = `
        SELECT 
          b.id,
          b.sitter_id,
          b.customer_id,
          b.booking_from,
          b.booking_to,
          b.payment_method,
          b.price_usd,
          b.discount,
          b.status,
          b.created_at,
          b.updated_at,
          c.full_name as customer_name,
          c.phone as customer_phone,
          c.area as customer_area,
          c.city as customer_city
        FROM bookings b
        JOIN customers c ON b.customer_id = c.id
        WHERE b.id = $1 AND b.sitter_id = $2
      `;
      queryParams = [bookingId, sitterResult.rows[0].id];
      
    } else {
      return res.status(400).json({ error: 'Invalid user type' });
    }
    
    const bookingResult = await query(bookingQuery, queryParams);
    
    if (bookingResult.rows.length === 0) {
      return res.status(404).json({ error: 'Booking not found or access denied' });
    }
    
    const booking = bookingResult.rows[0];
    
    // Get children for this booking
    const childrenResult = await query(
      `SELECT c.id, c.name as full_name, c.age, c.gender
       FROM booking_children bc
       JOIN children c ON bc.child_id = c.id
       WHERE bc.booking_id = $1`,
      [booking.id]
    );
    
    // Get pets for this booking
    const petsResult = await query(
      `SELECT p.id, p.name, p.type, p.breed, p.age
       FROM booking_pets bp
       JOIN pets p ON bp.pet_id = p.id
       WHERE bp.booking_id = $1`,
      [booking.id]
    );
    
    const bookingWithDetails = {
      id: booking.id,
      sitterId: booking.sitter_id,
      customerId: booking.customer_id,
      bookingFrom: booking.booking_from,
      bookingTo: booking.booking_to,
      paymentMethod: booking.payment_method,
      priceUsd: parseFloat(booking.price_usd),
      discount: parseFloat(booking.discount),
      status: booking.status,
      createdAt: booking.created_at,
      updatedAt: booking.updated_at,
      ...(user.user_type === 'customer' ? {
        sitter: {
          name: booking.sitter_name,
          phone: booking.sitter_phone,
          area: booking.sitter_area,
          city: booking.sitter_city
        }
      } : {
        customer: {
          name: booking.customer_name,
          phone: booking.customer_phone,
          area: booking.customer_area,
          city: booking.customer_city
        }
      }),
      children: childrenResult.rows.map(child => ({
        id: child.id,
        fullName: child.full_name,
        age: child.age,
        gender: child.gender
      })),
      pets: petsResult.rows.map(pet => ({
        id: pet.id,
        name: pet.name,
        type: pet.type,
        breed: pet.breed,
        age: pet.age
      }))
    };
    
    return res.json({
      success: true,
      booking: bookingWithDetails
    });
    
  } catch (error) {
    console.error('❌ Error fetching booking:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch booking',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// POST /api/bookings - Create a new booking (customers only)
router.post('/', verifyToken, async (req: AuthenticatedRequest, res: Response): Promise<express.Response> => {
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
    
    // Create the booking
    const bookingResult = await query(
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
    
    const newBooking = bookingResult.rows[0];
    
    // Add children to booking
    if (childrenIdsArray.length > 0) {
      for (const childId of childrenIdsArray) {
        await query(
          'INSERT INTO booking_children (booking_id, child_id) VALUES ($1, $2)',
          [newBooking.id, childId]
        );
      }
    }
    
    // Add pets to booking
    if (petIdsArray.length > 0) {
      for (const petId of petIdsArray) {
        await query(
          'INSERT INTO booking_pets (booking_id, pet_id) VALUES ($1, $2)',
          [newBooking.id, petId]
        );
      }
    }
    
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
    console.error('❌ Error creating booking:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to create booking',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// PUT /api/bookings/:id - Update a booking
router.put('/:id', verifyToken, async (req: AuthenticatedRequest, res: Response): Promise<express.Response> => {
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
      details: error instanceof Error ? error.message : 'Unknown error'
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
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;


import express from 'express';
import type { Response } from 'express';
import { query } from '../../config/database';
import { verifyToken } from '../../middleware/auth';
import type { AuthenticatedRequest } from '../../middleware/auth';
import { errorDetails } from '../../utils/errors';
import {
  getUserByFirebaseUid,
  getCustomerIdByUserId,
  getSitterIdByUserId,
} from '../../repositories/userRepository';

const router = express.Router();

// GET /api/bookings - Get all bookings for the authenticated user (customer or sitter)
router.get('/', verifyToken, async (req: AuthenticatedRequest, res: Response): Promise<express.Response> => {
  try {
    const firebaseUid = req.user?.uid;
    
    if (!firebaseUid) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    
    // Get user info to determine if customer or sitter
    const user = await getUserByFirebaseUid(firebaseUid);

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    let bookings;
    
    if (user.user_type === 'customer') {
      // Get customer's bookings
      const customerId = await getCustomerIdByUserId(user.id);

      if (customerId === null) {
        return res.status(404).json({ error: 'Customer profile not found' });
      }
      
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
      const sitterId = await getSitterIdByUserId(user.id);

      if (sitterId === null) {
        return res.status(404).json({ error: 'Sitter profile not found' });
      }
      
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
      ...errorDetails(error)
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
    const user = await getUserByFirebaseUid(firebaseUid);

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    let bookings;
    
    if (user.user_type === 'customer') {
      const customerId = await getCustomerIdByUserId(user.id);

      if (customerId === null) {
        return res.status(404).json({ error: 'Customer profile not found' });
      }
      
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
      const sitterId = await getSitterIdByUserId(user.id);

      if (sitterId === null) {
        return res.status(404).json({ error: 'Sitter profile not found' });
      }
      
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
      ...errorDetails(error)
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
    const user = await getUserByFirebaseUid(firebaseUid);

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    let bookings;
    
    if (user.user_type === 'customer') {
      const customerId = await getCustomerIdByUserId(user.id);

      if (customerId === null) {
        return res.status(404).json({ error: 'Customer profile not found' });
      }
      
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
      const sitterId = await getSitterIdByUserId(user.id);

      if (sitterId === null) {
        return res.status(404).json({ error: 'Sitter profile not found' });
      }
      
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
      ...errorDetails(error)
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
    const user = await getUserByFirebaseUid(firebaseUid);

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Get the booking with validation that user is part of this booking
    let bookingQuery;
    let queryParams;
    
    if (user.user_type === 'customer') {
      const customerId = await getCustomerIdByUserId(user.id);

      if (customerId === null) {
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
      queryParams = [bookingId, customerId];
      
    } else if (user.user_type === 'sitter') {
      const sitterId = await getSitterIdByUserId(user.id);

      if (sitterId === null) {
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
      queryParams = [bookingId, sitterId];
      
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
      ...errorDetails(error)
    });
  }
});

export default router;

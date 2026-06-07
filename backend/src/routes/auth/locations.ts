import express from 'express';
import { query } from '../../config/database';
import { verifyToken, type AuthenticatedRequest } from '../../middleware/auth';
import { validateBody } from '../../middleware/validate';
import { locationCreateSchema, locationUpdateSchema } from '../../validation/auth.schemas';
import { errorDetails } from '../../utils/errors';
import { resolveCustomerId } from './helpers';

const router = express.Router();

// GET /api/auth/locations - list active locations for the authenticated customer
router.get('/locations', verifyToken, async (req: AuthenticatedRequest, res): Promise<express.Response> => {
  try {
    const customerId = await resolveCustomerId(req, res, 'locations');
    if (customerId === null) return res as express.Response;

    const locationsResult = await query(
      'SELECT * FROM user_locations WHERE customer_id = $1 AND is_active = TRUE ORDER BY is_default DESC, created_at DESC',
      [customerId],
    );

    return res.json({ success: true, locations: locationsResult.rows });
  } catch (error) {
    console.error('Get locations error:', error);
    return res.status(500).json({ error: 'Failed to fetch locations', ...errorDetails(error) });
  }
});

// POST /api/auth/locations - add a location (first one becomes default)
router.post('/locations', verifyToken, validateBody(locationCreateSchema), async (req: AuthenticatedRequest, res): Promise<express.Response> => {
  try {
    const { locationName, addressName, streetName, buildingName, floor, addressLine, area, city, postalCode, latitude, longitude, isDefault } = req.body;

    if (!locationName || !area || !city || latitude === undefined || longitude === undefined) {
      return res.status(400).json({ error: 'Missing required fields: locationName, area, city, latitude, longitude' });
    }

    const customerId = await resolveCustomerId(req, res, 'locations');
    if (customerId === null) return res as express.Response;

    const existingLocationsResult = await query(
      'SELECT COUNT(*) as count FROM user_locations WHERE customer_id = $1 AND is_active = TRUE',
      [customerId],
    );
    const isFirstLocation = existingLocationsResult.rows[0].count === '0';
    const shouldBeDefault = isDefault || isFirstLocation;

    if (shouldBeDefault) {
      await query(
        'UPDATE user_locations SET is_default = FALSE WHERE customer_id = $1 AND is_active = TRUE',
        [customerId],
      );
    }

    const locationResult = await query(
      'INSERT INTO user_locations (customer_id, location_name, address_name, street_name, building_name, floor, address_line, area, city, postal_code, latitude, longitude, is_default) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13) RETURNING *',
      [customerId, locationName, addressName || null, streetName || null, buildingName || null, floor || null, addressLine || null, area, city, postalCode || null, latitude, longitude, shouldBeDefault],
    );

    return res.status(201).json({ success: true, message: 'Location added successfully', location: locationResult.rows[0] });
  } catch (error) {
    console.error('Add location error:', error);
    return res.status(500).json({ error: 'Failed to add location', ...errorDetails(error) });
  }
});

// PUT /api/auth/locations/:id - update a location (ownership-scoped)
router.put('/locations/:id', verifyToken, validateBody(locationUpdateSchema), async (req: AuthenticatedRequest, res): Promise<express.Response> => {
  try {
    const locationId = parseInt(req.params.id);
    const { locationName, addressName, streetName, buildingName, floor, addressLine, area, city, postalCode, latitude, longitude, isDefault } = req.body;

    if (isNaN(locationId)) {
      return res.status(400).json({ error: 'Invalid location ID' });
    }
    if (!locationName || !area || !city || latitude === undefined || longitude === undefined) {
      return res.status(400).json({ error: 'Missing required fields: locationName, area, city, latitude, longitude' });
    }

    const customerId = await resolveCustomerId(req, res, 'locations');
    if (customerId === null) return res as express.Response;

    if (isDefault) {
      await query(
        'UPDATE user_locations SET is_default = FALSE WHERE customer_id = $1 AND id != $2 AND is_active = TRUE',
        [customerId, locationId],
      );
    }

    const updateResult = await query(
      'UPDATE user_locations SET location_name = $1, address_name = $2, street_name = $3, building_name = $4, floor = $5, address_line = $6, area = $7, city = $8, postal_code = $9, latitude = $10, longitude = $11, is_default = $12, updated_at = CURRENT_TIMESTAMP WHERE id = $13 AND customer_id = $14 AND is_active = TRUE RETURNING *',
      [locationName, addressName || null, streetName || null, buildingName || null, floor || null, addressLine || null, area, city, postalCode || null, latitude, longitude, isDefault || false, locationId, customerId],
    );

    if (updateResult.rows.length === 0) {
      return res.status(404).json({ error: 'Location not found or access denied' });
    }

    return res.json({ success: true, message: 'Location updated successfully', location: updateResult.rows[0] });
  } catch (error) {
    console.error('Update location error:', error);
    return res.status(500).json({ error: 'Failed to update location', ...errorDetails(error) });
  }
});

// DELETE /api/auth/locations/:id - soft-delete a location, reassigning default if needed
router.delete('/locations/:id', verifyToken, async (req: AuthenticatedRequest, res): Promise<express.Response> => {
  try {
    const locationId = parseInt(req.params.id);
    if (isNaN(locationId)) {
      return res.status(400).json({ error: 'Invalid location ID' });
    }

    const customerId = await resolveCustomerId(req, res, 'locations');
    if (customerId === null) return res as express.Response;

    const locationToDeleteResult = await query(
      'SELECT is_default FROM user_locations WHERE id = $1 AND customer_id = $2 AND is_active = TRUE',
      [locationId, customerId],
    );

    if (locationToDeleteResult.rows.length === 0) {
      return res.status(404).json({ error: 'Location not found or access denied' });
    }

    const wasDefault = locationToDeleteResult.rows[0].is_default;

    await query(
      'UPDATE user_locations SET is_active = FALSE, is_default = FALSE, updated_at = CURRENT_TIMESTAMP WHERE id = $1 AND customer_id = $2',
      [locationId, customerId],
    );

    if (wasDefault) {
      const nextDefaultResult = await query(
        'SELECT id FROM user_locations WHERE customer_id = $1 AND is_active = TRUE ORDER BY created_at ASC LIMIT 1',
        [customerId],
      );
      if (nextDefaultResult.rows.length > 0) {
        await query('UPDATE user_locations SET is_default = TRUE WHERE id = $1', [nextDefaultResult.rows[0].id]);
      }
    }

    return res.json({ success: true, message: 'Location deleted successfully' });
  } catch (error) {
    console.error('Delete location error:', error);
    return res.status(500).json({ error: 'Failed to delete location', ...errorDetails(error) });
  }
});

export default router;

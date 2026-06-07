import express from 'express';
import { logger } from '../../utils/logger';
import { query } from '../../config/database';
import { verifyToken, type AuthenticatedRequest } from '../../middleware/auth';
import { validateBody } from '../../middleware/validate';
import { petCreateSchema, petUpdateSchema } from '../../validation/auth.schemas';
import { errorDetails } from '../../utils/errors';
import { resolveCustomerId } from './helpers';

const router = express.Router();

// GET /api/auth/pets - list active pets for the authenticated customer
router.get('/pets', verifyToken, async (req: AuthenticatedRequest, res): Promise<express.Response> => {
  try {
    const customerId = await resolveCustomerId(req, res, 'pets');
    if (customerId === null) return res as express.Response;

    const petsResult = await query(
      'SELECT * FROM pets WHERE customer_id = $1 AND is_active = TRUE ORDER BY created_at DESC',
      [customerId],
    );

    return res.json({ success: true, pets: petsResult.rows });
  } catch (error) {
    logger.error('Get pets error:', error);
    return res.status(500).json({ error: 'Failed to fetch pets', ...errorDetails(error) });
  }
});

// POST /api/auth/pets - add a pet
router.post('/pets', verifyToken, validateBody(petCreateSchema), async (req: AuthenticatedRequest, res): Promise<express.Response> => {
  try {
    const { name, age, type, breed, personality, careInstructions, specialNeeds } = req.body;

    if (!name || !type) {
      return res.status(400).json({ error: 'Missing required fields: name, type' });
    }

    const customerId = await resolveCustomerId(req, res, 'pets');
    if (customerId === null) return res as express.Response;

    let ageInt = null;
    if (age) {
      ageInt = parseInt(age);
      if (isNaN(ageInt)) {
        return res.status(400).json({ error: 'Invalid age value' });
      }
    }

    const petResult = await query(
      'INSERT INTO pets (customer_id, name, age, type, breed, personality, care_instructions, special_needs) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *',
      [customerId, name, ageInt, type, breed || '', personality || '', careInstructions || '', specialNeeds || ''],
    );

    return res.status(201).json({ success: true, message: 'Pet added successfully', pet: petResult.rows[0] });
  } catch (error) {
    logger.error('Add pet error:', error);
    return res.status(500).json({ error: 'Failed to add pet', ...errorDetails(error) });
  }
});

// PUT /api/auth/pets/:id - update a pet (ownership-scoped)
router.put('/pets/:id', verifyToken, validateBody(petUpdateSchema), async (req: AuthenticatedRequest, res): Promise<express.Response> => {
  try {
    const petId = parseInt(req.params.id);
    const { name, age, type, breed, personality, careInstructions, specialNeeds } = req.body;

    if (isNaN(petId)) {
      return res.status(400).json({ error: 'Invalid pet ID' });
    }
    if (!name || !type) {
      return res.status(400).json({ error: 'Missing required fields: name, type' });
    }

    const customerId = await resolveCustomerId(req, res, 'pets');
    if (customerId === null) return res as express.Response;

    let ageInt = null;
    if (age) {
      ageInt = parseInt(age);
      if (isNaN(ageInt)) {
        return res.status(400).json({ error: 'Invalid age value' });
      }
    }

    const updateResult = await query(
      'UPDATE pets SET name = $1, age = $2, type = $3, breed = $4, personality = $5, care_instructions = $6, special_needs = $7, updated_at = CURRENT_TIMESTAMP WHERE id = $8 AND customer_id = $9 RETURNING *',
      [name, ageInt, type, breed || '', personality || '', careInstructions || '', specialNeeds || '', petId, customerId],
    );

    if (updateResult.rows.length === 0) {
      return res.status(404).json({ error: 'Pet not found or access denied' });
    }

    return res.json({ success: true, message: 'Pet updated successfully', pet: updateResult.rows[0] });
  } catch (error) {
    logger.error('Update pet error:', error);
    return res.status(500).json({ error: 'Failed to update pet', ...errorDetails(error) });
  }
});

// DELETE /api/auth/pets/:id - soft-delete a pet (ownership-scoped)
router.delete('/pets/:id', verifyToken, async (req: AuthenticatedRequest, res): Promise<express.Response> => {
  try {
    const petId = parseInt(req.params.id);
    if (isNaN(petId)) {
      return res.status(400).json({ error: 'Invalid pet ID' });
    }

    const customerId = await resolveCustomerId(req, res, 'pets');
    if (customerId === null) return res as express.Response;

    const deleteResult = await query(
      'UPDATE pets SET is_active = FALSE, updated_at = CURRENT_TIMESTAMP WHERE id = $1 AND customer_id = $2 AND is_active = TRUE RETURNING id',
      [petId, customerId],
    );

    if (deleteResult.rows.length === 0) {
      return res.status(404).json({ error: 'Pet not found or access denied' });
    }

    return res.json({ success: true, message: 'Pet deleted successfully' });
  } catch (error) {
    logger.error('Delete pet error:', error);
    return res.status(500).json({ error: 'Failed to delete pet', ...errorDetails(error) });
  }
});

export default router;

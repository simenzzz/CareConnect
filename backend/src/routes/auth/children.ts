import express from 'express';
import { query } from '../../config/database';
import { verifyToken, type AuthenticatedRequest } from '../../middleware/auth';
import { validateBody } from '../../middleware/validate';
import { childCreateSchema, childUpdateSchema } from '../../validation/auth.schemas';
import { errorDetails } from '../../utils/errors';
import { resolveCustomerId } from './helpers';

const router = express.Router();

// GET /api/auth/children - list active children for the authenticated customer
router.get('/children', verifyToken, async (req: AuthenticatedRequest, res): Promise<express.Response> => {
  try {
    const customerId = await resolveCustomerId(req, res, 'children');
    if (customerId === null) return res as express.Response;

    const childrenResult = await query(
      'SELECT * FROM children WHERE customer_id = $1 AND is_active = TRUE ORDER BY created_at DESC',
      [customerId],
    );

    return res.json({ success: true, children: childrenResult.rows });
  } catch (error) {
    console.error('Get children error:', error);
    return res.status(500).json({ error: 'Failed to fetch children', ...errorDetails(error) });
  }
});

// POST /api/auth/children - add a child
router.post('/children', verifyToken, validateBody(childCreateSchema), async (req: AuthenticatedRequest, res): Promise<express.Response> => {
  try {
    const { name, age, hobbies, schoolType, specialNeeds } = req.body;

    if (!name || !age || !schoolType) {
      return res.status(400).json({ error: 'Missing required fields: name, age, schoolType' });
    }

    const customerId = await resolveCustomerId(req, res, 'children');
    if (customerId === null) return res as express.Response;

    const ageInt = parseInt(age);
    if (isNaN(ageInt)) {
      return res.status(400).json({ error: 'Invalid age value' });
    }

    const childResult = await query(
      'INSERT INTO children (customer_id, name, age, hobbies, school_type, special_needs) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
      [customerId, name, ageInt, hobbies || '', schoolType, specialNeeds || ''],
    );

    return res.status(201).json({ success: true, message: 'Child added successfully', child: childResult.rows[0] });
  } catch (error) {
    console.error('Add child error:', error);
    return res.status(500).json({ error: 'Failed to add child', ...errorDetails(error) });
  }
});

// PUT /api/auth/children/:id - update a child (ownership-scoped)
router.put('/children/:id', verifyToken, validateBody(childUpdateSchema), async (req: AuthenticatedRequest, res): Promise<express.Response> => {
  try {
    const childId = parseInt(req.params.id);
    const { name, age, hobbies, schoolType, specialNeeds } = req.body;

    if (isNaN(childId)) {
      return res.status(400).json({ error: 'Invalid child ID' });
    }
    if (!name || !age || !schoolType) {
      return res.status(400).json({ error: 'Missing required fields: name, age, schoolType' });
    }

    const customerId = await resolveCustomerId(req, res, 'children');
    if (customerId === null) return res as express.Response;

    const ageInt = parseInt(age);
    if (isNaN(ageInt)) {
      return res.status(400).json({ error: 'Invalid age value' });
    }

    const updateResult = await query(
      'UPDATE children SET name = $1, age = $2, hobbies = $3, school_type = $4, special_needs = $5, updated_at = CURRENT_TIMESTAMP WHERE id = $6 AND customer_id = $7 RETURNING *',
      [name, ageInt, hobbies || '', schoolType, specialNeeds || '', childId, customerId],
    );

    if (updateResult.rows.length === 0) {
      return res.status(404).json({ error: 'Child not found or access denied' });
    }

    return res.json({ success: true, message: 'Child updated successfully', child: updateResult.rows[0] });
  } catch (error) {
    console.error('Update child error:', error);
    return res.status(500).json({ error: 'Failed to update child', ...errorDetails(error) });
  }
});

// DELETE /api/auth/children/:id - soft-delete a child (ownership-scoped)
router.delete('/children/:id', verifyToken, async (req: AuthenticatedRequest, res): Promise<express.Response> => {
  try {
    const childId = parseInt(req.params.id);
    if (isNaN(childId)) {
      return res.status(400).json({ error: 'Invalid child ID' });
    }

    const customerId = await resolveCustomerId(req, res, 'children');
    if (customerId === null) return res as express.Response;

    const deleteResult = await query(
      'UPDATE children SET is_active = FALSE, updated_at = CURRENT_TIMESTAMP WHERE id = $1 AND customer_id = $2 AND is_active = TRUE RETURNING id',
      [childId, customerId],
    );

    if (deleteResult.rows.length === 0) {
      return res.status(404).json({ error: 'Child not found or access denied' });
    }

    return res.json({ success: true, message: 'Child deleted successfully' });
  } catch (error) {
    console.error('Delete child error:', error);
    return res.status(500).json({ error: 'Failed to delete child', ...errorDetails(error) });
  }
});

export default router;

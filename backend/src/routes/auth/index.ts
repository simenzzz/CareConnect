import express from 'express';
import { logger } from '../../utils/logger';
import { verifyIdToken } from '../../config/firebase';
import { query } from '../../config/database';
import { errorDetails } from '../../utils/errors';
import { validateBody } from '../../middleware/validate';
import { registerSchema, profileUpdateSchema } from '../../validation/auth.schemas';
import { verifyToken, type AuthenticatedRequest } from '../../middleware/auth';
import childrenRouter from './children';
import petsRouter from './pets';
import locationsRouter from './locations';

const router = express.Router();

// Register new user
router.post('/register', validateBody(registerSchema), async (req, res): Promise<express.Response> => {
  try {
    const { idToken, userType, profileData } = req.body;

    if (!idToken || !userType || !profileData) {
      return res.status(400).json({ error: 'Missing required fields: idToken, userType, profileData' });
    }

    if (!['customer', 'sitter'].includes(userType)) {
      return res.status(400).json({ error: 'Invalid userType. Must be "customer" or "sitter"' });
    }

    // Verify Firebase token
    const decodedToken = await verifyIdToken(idToken);
    const firebaseUid = decodedToken.uid;
    const email = decodedToken.email;

    if (!email) {
      return res.status(400).json({ error: 'Email not found in token' });
    }

    // Check if user already exists
    const existingUser = await query(
      'SELECT id FROM users WHERE firebase_uid = $1 OR email = $2',
      [firebaseUid, email],
    );

    if (existingUser.rows.length > 0) {
      return res.status(409).json({ error: 'This email address is already in use. Please use a different email or try logging in.' });
    }

    await query('BEGIN');

    try {
      const userResult = await query(
        'INSERT INTO users (firebase_uid, email, user_type) VALUES ($1, $2, $3) RETURNING id',
        [firebaseUid, email, userType],
      );
      const userId = userResult.rows[0].id;

      if (userType === 'customer') {
        const { fullName, dateOfBirth, area, city, phone, children, pets } = profileData;

        if (!fullName || !dateOfBirth || !area || !city || !phone) {
          throw new Error('Missing required customer fields: fullName, dateOfBirth, phone, area, city');
        }

        const customerResult = await query(
          'INSERT INTO customers (user_id, full_name, date_of_birth, phone, area, city) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id',
          [userId, fullName, dateOfBirth, phone, area, city],
        );
        const customerId = customerResult.rows[0].id;

        if (children && children.length > 0) {
          for (const child of children) {
            const ageInt = parseInt(child.age);
            if (isNaN(ageInt)) {
              throw new Error(`Invalid age for child ${child.name}`);
            }
            await query(
              'INSERT INTO children (customer_id, name, age, hobbies, school_type, special_needs) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id',
              [customerId, child.name, ageInt, child.hobbies || '', child.schoolType || '', child.specialNeeds || ''],
            );
          }
        }

        if (pets && pets.length > 0) {
          for (const pet of pets) {
            let ageInt = null;
            if (pet.age) {
              ageInt = parseInt(pet.age);
              if (isNaN(ageInt)) {
                ageInt = null;
              }
            }
            await query(
              'INSERT INTO pets (customer_id, name, age, type, breed, personality, care_instructions, special_needs) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id',
              [customerId, pet.name, ageInt, pet.type, pet.breed || '', pet.personality || '', pet.careInstructions || '', pet.specialNeeds || ''],
            );
          }
        }
      } else if (userType === 'sitter') {
        const { fullName, dateOfBirth, area, city, phone, hoursPerWeek, sitterType, experience, description, skills, cvUrl, identityDocumentUrl } = profileData;

        if (!fullName || !dateOfBirth || !area || !city || !phone || !hoursPerWeek || !sitterType) {
          throw new Error('Missing required sitter fields');
        }

        // sitterType should be 'B' (baby-sitter), 'P' (pet-sitter), or 'T' (both)
        const sitterResult = await query(
          `INSERT INTO sitters
          (user_id, full_name, date_of_birth, area, city, phone, hours_per_week, sitter_type, experience, description, cv_url, identity_document_url, cv_uploaded_at, identity_document_uploaded_at)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
          RETURNING id`,
          [
            userId, fullName, dateOfBirth, area, city, phone, hoursPerWeek, sitterType, experience,
            description || null, cvUrl || null, identityDocumentUrl || null,
            cvUrl ? new Date() : null, identityDocumentUrl ? new Date() : null,
          ],
        );
        const sitterId = sitterResult.rows[0].id;

        if (skills && Array.isArray(skills) && skills.length > 0) {
          for (const skill of skills) {
            if (skill && skill.trim()) {
              try {
                await query('INSERT INTO sitter_skills (sitter_id, skill_name) VALUES ($1, $2)', [sitterId, skill.trim()]);
              } catch (skillError) {
                // A single bad skill shouldn't abort registration.
                logger.error('Failed to add skill:', skillError);
              }
            }
          }
        }
      }

      await query('COMMIT');

      return res.status(201).json({ message: 'User registered successfully', userId, userType });
    } catch (error) {
      await query('ROLLBACK');
      throw error;
    }
  } catch (error) {
    logger.error('Registration error:', error);
    return res.status(500).json({ error: 'Registration failed', ...errorDetails(error) });
  }
});

// Login user (verify token and get profile)
router.post('/login', verifyToken, async (req: AuthenticatedRequest, res): Promise<express.Response> => {
  try {
    const firebaseUid = req.user?.uid;
    const email = req.user?.email;
    const { expectedUserType } = req.body;

    const userResult = await query('SELECT id, user_type, created_at FROM users WHERE firebase_uid = $1', [firebaseUid]);

    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = userResult.rows[0];

    if (expectedUserType && user.user_type !== expectedUserType) {
      return res.status(403).json({
        error: `This account is registered as a ${user.user_type}. Please use the ${user.user_type} login page.`,
      });
    }

    let profile = null;
    if (user.user_type === 'customer') {
      const customerResult = await query('SELECT * FROM customers WHERE user_id = $1', [user.id]);
      profile = customerResult.rows[0];
    } else if (user.user_type === 'sitter') {
      const sitterResult = await query('SELECT * FROM sitters WHERE user_id = $1', [user.id]);
      profile = sitterResult.rows[0];
    }

    return res.json({
      message: 'Login successful',
      user: { id: user.id, email, userType: user.user_type, createdAt: user.created_at },
      profile,
    });
  } catch (error) {
    logger.error('Login error:', error);
    return res.status(500).json({ error: 'Login failed', ...errorDetails(error) });
  }
});

// Get user profile
router.get('/profile', verifyToken, async (req: AuthenticatedRequest, res): Promise<express.Response> => {
  try {
    const firebaseUid = req.user?.uid;

    const userResult = await query('SELECT id, user_type, created_at FROM users WHERE firebase_uid = $1', [firebaseUid]);

    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = userResult.rows[0];
    let profile = null;

    if (user.user_type === 'customer') {
      const customerResult = await query('SELECT * FROM customers WHERE user_id = $1', [user.id]);
      profile = customerResult.rows[0];

      const childrenResult = await query('SELECT * FROM children WHERE customer_id = $1 AND is_active = TRUE', [profile?.id]);
      const petsResult = await query('SELECT * FROM pets WHERE customer_id = $1 AND is_active = TRUE', [profile?.id]);

      profile = { ...profile, children: childrenResult.rows, pets: petsResult.rows };
    } else if (user.user_type === 'sitter') {
      const sitterResult = await query('SELECT * FROM sitters WHERE user_id = $1', [user.id]);
      profile = sitterResult.rows[0];
    }

    return res.json({
      user: { id: user.id, email: req.user?.email, userType: user.user_type, createdAt: user.created_at },
      profile,
    });
  } catch (error) {
    logger.error('Profile fetch error:', error);
    return res.status(500).json({ error: 'Failed to fetch profile', ...errorDetails(error) });
  }
});

// Update user profile
router.put('/profile', verifyToken, validateBody(profileUpdateSchema), async (req: AuthenticatedRequest, res): Promise<express.Response> => {
  try {
    const firebaseUid = req.user?.uid;
    const { profileData } = req.body;

    if (!profileData) {
      return res.status(400).json({ error: 'Profile data is required' });
    }

    const userResult = await query('SELECT id, user_type FROM users WHERE firebase_uid = $1', [firebaseUid]);

    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = userResult.rows[0];

    if (user.user_type === 'customer') {
      // Support both camelCase and snake_case from the client
      const fullName = profileData.fullName || profileData.full_name;
      const phone = profileData.phone;
      const dateOfBirth = profileData.dateOfBirth || profileData.date_of_birth;
      const area = profileData.area;
      const city = profileData.city;

      await query(
        'UPDATE customers SET full_name = $1, phone = $2, date_of_birth = $3, area = $4, city = $5, updated_at = CURRENT_TIMESTAMP WHERE user_id = $6',
        [fullName, phone, dateOfBirth, area, city, user.id],
      );
    } else if (user.user_type === 'sitter') {
      const { full_name, fullName, age, date_of_birth, dateOfBirth, area, city, phone, hours_per_week, hoursPerWeek, sitter_type, sitterType, experience, description } = profileData;

      const finalFullName = full_name || fullName;
      const finalDateOfBirth = date_of_birth || dateOfBirth;
      const finalHoursPerWeek = hours_per_week || hoursPerWeek;
      const finalSitterType = sitter_type || sitterType;

      await query(
        'UPDATE sitters SET full_name = $1, age = $2, date_of_birth = $3, area = $4, city = $5, phone = $6, hours_per_week = $7, sitter_type = $8, experience = $9, description = $10, updated_at = CURRENT_TIMESTAMP WHERE user_id = $11',
        [finalFullName, age, finalDateOfBirth, area, city, phone, finalHoursPerWeek, finalSitterType, experience, description, user.id],
      );
    }

    return res.json({ message: 'Profile updated successfully' });
  } catch (error) {
    logger.error('Profile update error:', error);
    return res.status(500).json({ error: 'Failed to update profile', ...errorDetails(error) });
  }
});

// Update sitter documents (CV and Identity Document URLs)
router.put('/sitter/documents', verifyToken, async (req: AuthenticatedRequest, res): Promise<express.Response> => {
  try {
    const firebaseUid = req.user?.uid;
    const { cvUrl, identityDocumentUrl } = req.body;

    const userResult = await query('SELECT id, user_type FROM users WHERE firebase_uid = $1', [firebaseUid]);

    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = userResult.rows[0];

    if (user.user_type !== 'sitter') {
      return res.status(403).json({ error: 'Only sitters can update documents' });
    }

    await query(
      `UPDATE sitters
       SET cv_url = $1, identity_document_url = $2, cv_uploaded_at = $3, identity_document_uploaded_at = $4
       WHERE user_id = $5`,
      [cvUrl || null, identityDocumentUrl || null, cvUrl ? new Date() : null, identityDocumentUrl ? new Date() : null, user.id],
    );

    return res.json({ message: 'Documents updated successfully', cvUrl, identityDocumentUrl });
  } catch (error) {
    logger.error('Update documents error:', error);
    return res.status(500).json({ error: 'Failed to update documents', ...errorDetails(error) });
  }
});

// Customer-resource sub-routers (children / pets / locations)
router.use(childrenRouter);
router.use(petsRouter);
router.use(locationsRouter);

export default router;

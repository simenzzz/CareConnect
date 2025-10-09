import express from 'express';
import { verifyIdToken } from '../config/firebase';
import { query } from '../config/database';

const router = express.Router();

// Extend Express Request type to include user
interface AuthenticatedRequest extends express.Request {
  user?: {
    uid: string;
    email?: string;
    [key: string]: any;
  };
}

// Middleware to verify Firebase token
const verifyToken = async (req: AuthenticatedRequest, res: express.Response, next: express.NextFunction): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({ error: 'No token provided' });
      return;
    }
    
    const idToken = authHeader.split('Bearer ')[1];
    const decodedToken = await verifyIdToken(idToken);
    req.user = decodedToken;
    next();
  } catch (error) {
    console.error('Token verification error:', error);
    res.status(401).json({ error: 'Invalid token' });
  }
};

// Register new user
router.post('/register', async (req, res): Promise<express.Response> => {
  try {
    const { idToken, userType, profileData } = req.body;
    
    if (!idToken || !userType || !profileData) {
      return res.status(400).json({ 
        error: 'Missing required fields: idToken, userType, profileData' 
      });
    }
    
    if (!['customer', 'sitter'].includes(userType)) {
      return res.status(400).json({ 
        error: 'Invalid userType. Must be "customer" or "sitter"' 
      });
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
      [firebaseUid, email]
    );
    
    if (existingUser.rows.length > 0) {
      return res.status(409).json({ error: 'This email address is already in use. Please use a different email or try logging in.' });
    }
    
    // Start transaction
    await query('BEGIN');
    
    try {
      // Insert user
      const userResult = await query(
        'INSERT INTO users (firebase_uid, email, user_type) VALUES ($1, $2, $3) RETURNING id',
        [firebaseUid, email, userType]
      );
      
      const userId = userResult.rows[0].id;
      
      // Insert profile based on user type
      if (userType === 'customer') {
        const { fullName, dateOfBirth, area, city, children, pets } = profileData;
        
        console.log('📥 Received customer profile data:');
        console.log('  - Full Name:', fullName);
        console.log('  - Date of Birth:', dateOfBirth);
        console.log('  - Area:', area);
        console.log('  - City:', city);
        console.log('  - Children:', children ? `${children.length} children` : 'No children');
        console.log('  - Pets:', pets ? `${pets.length} pets` : 'No pets');
        
        if (children && children.length > 0) {
          console.log('👶 Children details:', JSON.stringify(children, null, 2));
        }
        
        if (pets && pets.length > 0) {
          console.log('🐕 Pets details:', JSON.stringify(pets, null, 2));
        }
        
        if (!fullName || !dateOfBirth || !area || !city) {
          throw new Error('Missing required customer fields: fullName, dateOfBirth, area, city');
        }
        
        // Insert customer
        const customerResult = await query(
          'INSERT INTO customers (user_id, full_name, date_of_birth, area, city) VALUES ($1, $2, $3, $4, $5) RETURNING id',
          [userId, fullName, dateOfBirth, area, city]
        );
        
        const customerId = customerResult.rows[0].id;
        
        // Insert children if provided
        if (children && children.length > 0) {
          console.log(`👶 Inserting ${children.length} children...`);
          for (const child of children) {
            try {
              console.log(`  - Inserting child: ${child.name}, age: ${child.age} (type: ${typeof child.age})`);
              
              // Convert age to integer
              const ageInt = parseInt(child.age);
              console.log(`  - Converted age to integer: ${ageInt}`);
              
              if (isNaN(ageInt)) {
                console.error(`  ❌ Invalid age for child ${child.name}: ${child.age}`);
                throw new Error(`Invalid age for child ${child.name}`);
              }
              
              const result = await query(
                'INSERT INTO children (customer_id, name, age, hobbies, school_type, special_needs) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id',
                [customerId, child.name, ageInt, child.hobbies || '', child.schoolType || '', child.specialNeeds || '']
              );
              console.log(`    ✅ Child inserted successfully with ID: ${result.rows[0].id}`);
            } catch (childError) {
              console.error(`  ❌ Error inserting child ${child.name}:`, childError);
              throw childError;
            }
          }
        } else {
          console.log('👶 No children to insert');
        }
        
        // Insert pets if provided
        if (pets && pets.length > 0) {
          console.log(`🐕 Inserting ${pets.length} pets...`);
          for (const pet of pets) {
            try {
              console.log(`  - Inserting pet: ${pet.name} (${pet.type}), age: ${pet.age || 'not specified'}`);
              
              // Convert age to integer if provided
              let ageInt = null;
              if (pet.age) {
                ageInt = parseInt(pet.age);
                if (isNaN(ageInt)) {
                  console.warn(`  ⚠️ Invalid age for pet ${pet.name}: ${pet.age}, skipping age`);
                  ageInt = null;
                }
              }
              
              const result = await query(
                'INSERT INTO pets (customer_id, name, age, type, breed, personality, care_instructions, special_needs) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id',
                [customerId, pet.name, ageInt, pet.type, pet.breed || '', pet.personality || '', pet.careInstructions || '', pet.specialNeeds || '']
              );
              console.log(`    ✅ Pet inserted successfully with ID: ${result.rows[0].id}`);
            } catch (petError) {
              console.error(`  ❌ Error inserting pet ${pet.name}:`, petError);
              throw petError;
            }
          }
        } else {
          console.log('🐕 No pets to insert');
        }
      } else if (userType === 'sitter') {
        const { 
          fullName, 
          dateOfBirth, 
          area, 
          city,
          phone,
          hoursPerWeek, 
          sitterType, 
          experience,
          description,
          skills,
          cvUrl,
          identityDocumentUrl
        } = profileData;
        
        if (!fullName || !dateOfBirth || !area || !city || !phone || !hoursPerWeek || !sitterType) {
          throw new Error('Missing required sitter fields');
        }
        
        // Insert sitter with optional document URLs and description
        // sitterType should be 'B' (baby-sitter), 'P' (pet-sitter), or 'T' (both)
        const sitterResult = await query(
          `INSERT INTO sitters 
          (user_id, full_name, date_of_birth, area, city, phone, hours_per_week, sitter_type, experience, description, cv_url, identity_document_url, cv_uploaded_at, identity_document_uploaded_at) 
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
          RETURNING id`,
          [
            userId, 
            fullName, 
            dateOfBirth, 
            area, 
            city,
            phone,
            hoursPerWeek, 
            sitterType, 
            experience,
            description || null,
            cvUrl || null,
            identityDocumentUrl || null,
            cvUrl ? new Date() : null,
            identityDocumentUrl ? new Date() : null
          ]
        );
        
        const sitterId = sitterResult.rows[0].id;
        console.log(`✅ Sitter profile created with ID: ${sitterId}`);
        
        // Insert skills if provided
        if (skills && Array.isArray(skills) && skills.length > 0) {
          console.log(`🎯 Inserting ${skills.length} skills...`);
          for (const skill of skills) {
            if (skill && skill.trim()) {
              try {
                await query(
                  'INSERT INTO sitter_skills (sitter_id, skill_name) VALUES ($1, $2)',
                  [sitterId, skill.trim()]
                );
                console.log(`  ✅ Skill added: ${skill.trim()}`);
              } catch (skillError: any) {
                console.error(`  ❌ Failed to add skill "${skill}":`, skillError.message);
              }
            }
          }
        }
        
        if (cvUrl || identityDocumentUrl) {
          console.log('📄 Sitter documents uploaded:');
          if (cvUrl) console.log('  ✅ CV:', cvUrl);
          if (identityDocumentUrl) console.log('  ✅ Identity Document:', identityDocumentUrl);
        }
      }
      
      await query('COMMIT');
      
    return res.status(201).json({
      message: 'User registered successfully',
      userId,
      userType
    });
      
    } catch (error) {
      await query('ROLLBACK');
      throw error;
    }
    
  } catch (error) {
    console.error('Registration error:', error);
    return res.status(500).json({ 
      error: 'Registration failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Login user (verify token and get profile)
router.post('/login', verifyToken, async (req: AuthenticatedRequest, res): Promise<express.Response> => {
  try {
    const firebaseUid = req.user?.uid;
    const email = req.user?.email;
    const { expectedUserType } = req.body;
    
    // Get user data
    const userResult = await query(
      'SELECT id, user_type, created_at FROM users WHERE firebase_uid = $1',
      [firebaseUid]
    );
    
    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    const user = userResult.rows[0];
    
    // Validate user type if expectedUserType is provided
    if (expectedUserType && user.user_type !== expectedUserType) {
      console.log(`❌ User type mismatch: Expected ${expectedUserType}, got ${user.user_type}`);
      return res.status(403).json({ 
        error: `This account is registered as a ${user.user_type}. Please use the ${user.user_type} login page.`
      });
    }
    
    let profile = null;
    
    // Get profile data based on user type
    if (user.user_type === 'customer') {
      const customerResult = await query(
        'SELECT * FROM customers WHERE user_id = $1',
        [user.id]
      );
      profile = customerResult.rows[0];
    } else if (user.user_type === 'sitter') {
      const sitterResult = await query(
        'SELECT * FROM sitters WHERE user_id = $1',
        [user.id]
      );
      profile = sitterResult.rows[0];
    }
    
    console.log(`✅ Login successful for ${user.user_type}: ${email}`);
    
    return res.json({
      message: 'Login successful',
      user: {
        id: user.id,
        email,
        userType: user.user_type,
        createdAt: user.created_at
      },
      profile
    });
    
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({ 
      error: 'Login failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Get user profile
router.get('/profile', verifyToken, async (req: AuthenticatedRequest, res): Promise<express.Response> => {
  try {
    const firebaseUid = req.user?.uid;
    
    // Get user data
    const userResult = await query(
      'SELECT id, user_type, created_at FROM users WHERE firebase_uid = $1',
      [firebaseUid]
    );
    
    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    const user = userResult.rows[0];
    let profile = null;
    
    // Get profile data based on user type
    if (user.user_type === 'customer') {
      const customerResult = await query(
        'SELECT * FROM customers WHERE user_id = $1',
        [user.id]
      );
      profile = customerResult.rows[0];
      
      // Get active children and pets if customer
      const childrenResult = await query(
        'SELECT * FROM children WHERE customer_id = $1 AND is_active = TRUE',
        [profile?.id]
      );
      
      const petsResult = await query(
        'SELECT * FROM pets WHERE customer_id = $1 AND is_active = TRUE',
        [profile?.id]
      );
      
      profile = {
        ...profile,
        children: childrenResult.rows,
        pets: petsResult.rows
      };
      
    } else if (user.user_type === 'sitter') {
      const sitterResult = await query(
        'SELECT * FROM sitters WHERE user_id = $1',
        [user.id]
      );
      profile = sitterResult.rows[0];
    }
    
    return res.json({
      user: {
        id: user.id,
        email: req.user?.email,
        userType: user.user_type,
        createdAt: user.created_at
      },
      profile
    });
    
  } catch (error) {
    console.error('Profile fetch error:', error);
    return res.status(500).json({ 
      error: 'Failed to fetch profile',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Update user profile
router.put('/profile', verifyToken, async (req: AuthenticatedRequest, res): Promise<express.Response> => {
  try {
    const firebaseUid = req.user?.uid;
    const { profileData } = req.body;
    
    if (!profileData) {
      return res.status(400).json({ error: 'Profile data is required' });
    }
    
    // Get user data
    const userResult = await query(
      'SELECT id, user_type FROM users WHERE firebase_uid = $1',
      [firebaseUid]
    );
    
    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    const user = userResult.rows[0];
    
    // Update profile based on user type
    if (user.user_type === 'customer') {
      const { fullName, dateOfBirth, area, city } = profileData;
      
      await query(
        'UPDATE customers SET full_name = $1, date_of_birth = $2, area = $3, city = $4, updated_at = CURRENT_TIMESTAMP WHERE user_id = $5',
        [fullName, dateOfBirth, area, city, user.id]
      );
      
    } else if (user.user_type === 'sitter') {
      const { 
        full_name,
        fullName, 
        age, 
        date_of_birth,
        dateOfBirth, 
        area, 
        city,
        phone,
        hours_per_week,
        hoursPerWeek, 
        sitter_type,
        sitterType, 
        experience,
        description
      } = profileData;
      
      // Handle both camelCase and snake_case for flexibility
      const finalFullName = full_name || fullName;
      const finalDateOfBirth = date_of_birth || dateOfBirth;
      const finalHoursPerWeek = hours_per_week || hoursPerWeek;
      const finalSitterType = sitter_type || sitterType;
      
      await query(
        'UPDATE sitters SET full_name = $1, age = $2, date_of_birth = $3, area = $4, city = $5, phone = $6, hours_per_week = $7, sitter_type = $8, experience = $9, description = $10, updated_at = CURRENT_TIMESTAMP WHERE user_id = $11',
        [finalFullName, age, finalDateOfBirth, area, city, phone, finalHoursPerWeek, finalSitterType, experience, description, user.id]
      );
    }
    
    return res.json({ message: 'Profile updated successfully' });
    
  } catch (error) {
    console.error('Profile update error:', error);
    return res.status(500).json({ 
      error: 'Failed to update profile',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Update sitter documents (CV and Identity Document URLs)
router.put('/sitter/documents', verifyToken, async (req: AuthenticatedRequest, res): Promise<express.Response> => {
  try {
    const firebaseUid = req.user?.uid;
    const { cvUrl, identityDocumentUrl } = req.body;
    
    // Get user ID from Firebase UID
    const userResult = await query(
      'SELECT id, user_type FROM users WHERE firebase_uid = $1',
      [firebaseUid]
    );
    
    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    const user = userResult.rows[0];
    
    if (user.user_type !== 'sitter') {
      return res.status(403).json({ error: 'Only sitters can update documents' });
    }
    
    // Update sitter documents
    await query(
      `UPDATE sitters 
       SET cv_url = $1, 
           identity_document_url = $2,
           cv_uploaded_at = $3,
           identity_document_uploaded_at = $4
       WHERE user_id = $5`,
      [
        cvUrl || null,
        identityDocumentUrl || null,
        cvUrl ? new Date() : null,
        identityDocumentUrl ? new Date() : null,
        user.id
      ]
    );
    
    console.log('✅ Sitter documents updated:', { cvUrl, identityDocumentUrl });
    
    return res.json({
      message: 'Documents updated successfully',
      cvUrl,
      identityDocumentUrl
    });
    
  } catch (error) {
    console.error('Update documents error:', error);
    return res.status(500).json({ 
      error: 'Failed to update documents',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// ==================== CHILDREN MANAGEMENT ====================

// GET /api/auth/children - Get all children for the authenticated customer
router.get('/children', verifyToken, async (req: AuthenticatedRequest, res): Promise<express.Response> => {
  try {
    const firebaseUid = req.user?.uid;
    
    // Get user and customer ID
    const userResult = await query(
      'SELECT id, user_type FROM users WHERE firebase_uid = $1',
      [firebaseUid]
    );
    
    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    const user = userResult.rows[0];
    
    if (user.user_type !== 'customer') {
      return res.status(403).json({ error: 'Only customers can manage children' });
    }
    
    const customerResult = await query(
      'SELECT id FROM customers WHERE user_id = $1',
      [user.id]
    );
    
    if (customerResult.rows.length === 0) {
      return res.status(404).json({ error: 'Customer profile not found' });
    }
    
    const customerId = customerResult.rows[0].id;
    
    // Get all active children
    const childrenResult = await query(
      'SELECT * FROM children WHERE customer_id = $1 AND is_active = TRUE ORDER BY created_at DESC',
      [customerId]
    );
    
    return res.json({
      success: true,
      children: childrenResult.rows
    });
    
  } catch (error) {
    console.error('Get children error:', error);
    return res.status(500).json({ 
      error: 'Failed to fetch children',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// POST /api/auth/children - Add a new child
router.post('/children', verifyToken, async (req: AuthenticatedRequest, res): Promise<express.Response> => {
  try {
    const firebaseUid = req.user?.uid;
    const { name, age, hobbies, schoolType, specialNeeds } = req.body;
    
    if (!name || !age || !schoolType) {
      return res.status(400).json({ 
        error: 'Missing required fields: name, age, schoolType' 
      });
    }
    
    // Get user and customer ID
    const userResult = await query(
      'SELECT id, user_type FROM users WHERE firebase_uid = $1',
      [firebaseUid]
    );
    
    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    const user = userResult.rows[0];
    
    if (user.user_type !== 'customer') {
      return res.status(403).json({ error: 'Only customers can manage children' });
    }
    
    const customerResult = await query(
      'SELECT id FROM customers WHERE user_id = $1',
      [user.id]
    );
    
    if (customerResult.rows.length === 0) {
      return res.status(404).json({ error: 'Customer profile not found' });
    }
    
    const customerId = customerResult.rows[0].id;
    
    // Convert age to integer
    const ageInt = parseInt(age);
    if (isNaN(ageInt)) {
      return res.status(400).json({ error: 'Invalid age value' });
    }
    
    // Insert new child
    const childResult = await query(
      'INSERT INTO children (customer_id, name, age, hobbies, school_type, special_needs) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
      [customerId, name, ageInt, hobbies || '', schoolType, specialNeeds || '']
    );
    
    return res.status(201).json({
      success: true,
      message: 'Child added successfully',
      child: childResult.rows[0]
    });
    
  } catch (error) {
    console.error('Add child error:', error);
    return res.status(500).json({ 
      error: 'Failed to add child',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// PUT /api/auth/children/:id - Update a child
router.put('/children/:id', verifyToken, async (req: AuthenticatedRequest, res): Promise<express.Response> => {
  try {
    const firebaseUid = req.user?.uid;
    const childId = parseInt(req.params.id);
    const { name, age, hobbies, schoolType, specialNeeds } = req.body;
    
    if (isNaN(childId)) {
      return res.status(400).json({ error: 'Invalid child ID' });
    }
    
    if (!name || !age || !schoolType) {
      return res.status(400).json({ 
        error: 'Missing required fields: name, age, schoolType' 
      });
    }
    
    // Get user and customer ID
    const userResult = await query(
      'SELECT id, user_type FROM users WHERE firebase_uid = $1',
      [firebaseUid]
    );
    
    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    const user = userResult.rows[0];
    
    if (user.user_type !== 'customer') {
      return res.status(403).json({ error: 'Only customers can manage children' });
    }
    
    const customerResult = await query(
      'SELECT id FROM customers WHERE user_id = $1',
      [user.id]
    );
    
    if (customerResult.rows.length === 0) {
      return res.status(404).json({ error: 'Customer profile not found' });
    }
    
    const customerId = customerResult.rows[0].id;
    
    // Convert age to integer
    const ageInt = parseInt(age);
    if (isNaN(ageInt)) {
      return res.status(400).json({ error: 'Invalid age value' });
    }
    
    // Update child (verify ownership)
    const updateResult = await query(
      'UPDATE children SET name = $1, age = $2, hobbies = $3, school_type = $4, special_needs = $5, updated_at = CURRENT_TIMESTAMP WHERE id = $6 AND customer_id = $7 RETURNING *',
      [name, ageInt, hobbies || '', schoolType, specialNeeds || '', childId, customerId]
    );
    
    if (updateResult.rows.length === 0) {
      return res.status(404).json({ error: 'Child not found or access denied' });
    }
    
    return res.json({
      success: true,
      message: 'Child updated successfully',
      child: updateResult.rows[0]
    });
    
  } catch (error) {
    console.error('Update child error:', error);
    return res.status(500).json({ 
      error: 'Failed to update child',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// DELETE /api/auth/children/:id - Delete a child
router.delete('/children/:id', verifyToken, async (req: AuthenticatedRequest, res): Promise<express.Response> => {
  try {
    const firebaseUid = req.user?.uid;
    const childId = parseInt(req.params.id);
    
    if (isNaN(childId)) {
      return res.status(400).json({ error: 'Invalid child ID' });
    }
    
    // Get user and customer ID
    const userResult = await query(
      'SELECT id, user_type FROM users WHERE firebase_uid = $1',
      [firebaseUid]
    );
    
    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    const user = userResult.rows[0];
    
    if (user.user_type !== 'customer') {
      return res.status(403).json({ error: 'Only customers can manage children' });
    }
    
    const customerResult = await query(
      'SELECT id FROM customers WHERE user_id = $1',
      [user.id]
    );
    
    if (customerResult.rows.length === 0) {
      return res.status(404).json({ error: 'Customer profile not found' });
    }
    
    const customerId = customerResult.rows[0].id;
    
    // Soft delete child by setting is_active = FALSE (verify ownership)
    const deleteResult = await query(
      'UPDATE children SET is_active = FALSE, updated_at = CURRENT_TIMESTAMP WHERE id = $1 AND customer_id = $2 AND is_active = TRUE RETURNING id',
      [childId, customerId]
    );
    
    if (deleteResult.rows.length === 0) {
      return res.status(404).json({ error: 'Child not found or access denied' });
    }
    
    return res.json({
      success: true,
      message: 'Child deleted successfully'
    });
    
  } catch (error) {
    console.error('Delete child error:', error);
    return res.status(500).json({ 
      error: 'Failed to delete child',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// ==================== PETS MANAGEMENT ====================

// GET /api/auth/pets - Get all pets for the authenticated customer
router.get('/pets', verifyToken, async (req: AuthenticatedRequest, res): Promise<express.Response> => {
  try {
    const firebaseUid = req.user?.uid;
    
    // Get user and customer ID
    const userResult = await query(
      'SELECT id, user_type FROM users WHERE firebase_uid = $1',
      [firebaseUid]
    );
    
    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    const user = userResult.rows[0];
    
    if (user.user_type !== 'customer') {
      return res.status(403).json({ error: 'Only customers can manage pets' });
    }
    
    const customerResult = await query(
      'SELECT id FROM customers WHERE user_id = $1',
      [user.id]
    );
    
    if (customerResult.rows.length === 0) {
      return res.status(404).json({ error: 'Customer profile not found' });
    }
    
    const customerId = customerResult.rows[0].id;
    
    // Get all active pets
    const petsResult = await query(
      'SELECT * FROM pets WHERE customer_id = $1 AND is_active = TRUE ORDER BY created_at DESC',
      [customerId]
    );
    
    return res.json({
      success: true,
      pets: petsResult.rows
    });
    
  } catch (error) {
    console.error('Get pets error:', error);
    return res.status(500).json({ 
      error: 'Failed to fetch pets',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// POST /api/auth/pets - Add a new pet
router.post('/pets', verifyToken, async (req: AuthenticatedRequest, res): Promise<express.Response> => {
  try {
    const firebaseUid = req.user?.uid;
    const { name, age, type, breed, personality, careInstructions, specialNeeds } = req.body;
    
    if (!name || !type) {
      return res.status(400).json({ 
        error: 'Missing required fields: name, type' 
      });
    }
    
    // Get user and customer ID
    const userResult = await query(
      'SELECT id, user_type FROM users WHERE firebase_uid = $1',
      [firebaseUid]
    );
    
    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    const user = userResult.rows[0];
    
    if (user.user_type !== 'customer') {
      return res.status(403).json({ error: 'Only customers can manage pets' });
    }
    
    const customerResult = await query(
      'SELECT id FROM customers WHERE user_id = $1',
      [user.id]
    );
    
    if (customerResult.rows.length === 0) {
      return res.status(404).json({ error: 'Customer profile not found' });
    }
    
    const customerId = customerResult.rows[0].id;
    
    // Convert age to integer if provided
    let ageInt = null;
    if (age) {
      ageInt = parseInt(age);
      if (isNaN(ageInt)) {
        return res.status(400).json({ error: 'Invalid age value' });
      }
    }
    
    // Insert new pet
    const petResult = await query(
      'INSERT INTO pets (customer_id, name, age, type, breed, personality, care_instructions, special_needs) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *',
      [customerId, name, ageInt, type, breed || '', personality || '', careInstructions || '', specialNeeds || '']
    );
    
    return res.status(201).json({
      success: true,
      message: 'Pet added successfully',
      pet: petResult.rows[0]
    });
    
  } catch (error) {
    console.error('Add pet error:', error);
    return res.status(500).json({ 
      error: 'Failed to add pet',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// PUT /api/auth/pets/:id - Update a pet
router.put('/pets/:id', verifyToken, async (req: AuthenticatedRequest, res): Promise<express.Response> => {
  try {
    const firebaseUid = req.user?.uid;
    const petId = parseInt(req.params.id);
    const { name, age, type, breed, personality, careInstructions, specialNeeds } = req.body;
    
    if (isNaN(petId)) {
      return res.status(400).json({ error: 'Invalid pet ID' });
    }
    
    if (!name || !type) {
      return res.status(400).json({ 
        error: 'Missing required fields: name, type' 
      });
    }
    
    // Get user and customer ID
    const userResult = await query(
      'SELECT id, user_type FROM users WHERE firebase_uid = $1',
      [firebaseUid]
    );
    
    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    const user = userResult.rows[0];
    
    if (user.user_type !== 'customer') {
      return res.status(403).json({ error: 'Only customers can manage pets' });
    }
    
    const customerResult = await query(
      'SELECT id FROM customers WHERE user_id = $1',
      [user.id]
    );
    
    if (customerResult.rows.length === 0) {
      return res.status(404).json({ error: 'Customer profile not found' });
    }
    
    const customerId = customerResult.rows[0].id;
    
    // Convert age to integer if provided
    let ageInt = null;
    if (age) {
      ageInt = parseInt(age);
      if (isNaN(ageInt)) {
        return res.status(400).json({ error: 'Invalid age value' });
      }
    }
    
    // Update pet (verify ownership)
    const updateResult = await query(
      'UPDATE pets SET name = $1, age = $2, type = $3, breed = $4, personality = $5, care_instructions = $6, special_needs = $7, updated_at = CURRENT_TIMESTAMP WHERE id = $8 AND customer_id = $9 RETURNING *',
      [name, ageInt, type, breed || '', personality || '', careInstructions || '', specialNeeds || '', petId, customerId]
    );
    
    if (updateResult.rows.length === 0) {
      return res.status(404).json({ error: 'Pet not found or access denied' });
    }
    
    return res.json({
      success: true,
      message: 'Pet updated successfully',
      pet: updateResult.rows[0]
    });
    
  } catch (error) {
    console.error('Update pet error:', error);
    return res.status(500).json({ 
      error: 'Failed to update pet',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// DELETE /api/auth/pets/:id - Delete a pet
router.delete('/pets/:id', verifyToken, async (req: AuthenticatedRequest, res): Promise<express.Response> => {
  try {
    const firebaseUid = req.user?.uid;
    const petId = parseInt(req.params.id);
    
    if (isNaN(petId)) {
      return res.status(400).json({ error: 'Invalid pet ID' });
    }
    
    // Get user and customer ID
    const userResult = await query(
      'SELECT id, user_type FROM users WHERE firebase_uid = $1',
      [firebaseUid]
    );
    
    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    const user = userResult.rows[0];
    
    if (user.user_type !== 'customer') {
      return res.status(403).json({ error: 'Only customers can manage pets' });
    }
    
    const customerResult = await query(
      'SELECT id FROM customers WHERE user_id = $1',
      [user.id]
    );
    
    if (customerResult.rows.length === 0) {
      return res.status(404).json({ error: 'Customer profile not found' });
    }
    
    const customerId = customerResult.rows[0].id;
    
    // Soft delete pet by setting is_active = FALSE (verify ownership)
    const deleteResult = await query(
      'UPDATE pets SET is_active = FALSE, updated_at = CURRENT_TIMESTAMP WHERE id = $1 AND customer_id = $2 AND is_active = TRUE RETURNING id',
      [petId, customerId]
    );
    
    if (deleteResult.rows.length === 0) {
      return res.status(404).json({ error: 'Pet not found or access denied' });
    }
    
    return res.json({
      success: true,
      message: 'Pet deleted successfully'
    });
    
  } catch (error) {
    console.error('Delete pet error:', error);
    return res.status(500).json({ 
      error: 'Failed to delete pet',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;
export { verifyToken };
export type { AuthenticatedRequest };
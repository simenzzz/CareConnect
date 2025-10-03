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
              console.log(`  - Inserting pet: ${pet.name} (${pet.type})`);
              const result = await query(
                'INSERT INTO pets (customer_id, name, type, breed, personality, care_instructions, special_needs) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id',
                [customerId, pet.name, pet.type, pet.breed || '', pet.personality || '', pet.careInstructions || '', pet.specialNeeds || '']
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
          hoursPerWeek, 
          sitterType, 
          experience 
        } = profileData;
        
        if (!fullName || !dateOfBirth || !area || !city || !hoursPerWeek || !sitterType) {
          throw new Error('Missing required sitter fields');
        }
        
        await query(
          'INSERT INTO sitters (user_id, full_name, date_of_birth, area, city, hours_per_week, sitter_type, experience) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)',
          [userId, fullName, dateOfBirth, area, city, hoursPerWeek, sitterType, experience]
        );
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
    } else if (user.user_type === 'sitter') {
      const sitterResult = await query(
        'SELECT * FROM sitters WHERE user_id = $1',
        [user.id]
      );
      profile = sitterResult.rows[0];
    }
    
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
      
      // Get children and pets if customer
      const childrenResult = await query(
        'SELECT * FROM children WHERE customer_id = $1',
        [profile?.id]
      );
      
      const petsResult = await query(
        'SELECT * FROM pets WHERE customer_id = $1',
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
        fullName, 
        age, 
        dateOfBirth, 
        area, 
        city, 
        hoursPerWeek, 
        sitterType, 
        experience 
      } = profileData;
      
      await query(
        'UPDATE sitters SET full_name = $1, age = $2, date_of_birth = $3, area = $4, city = $5, hours_per_week = $6, sitter_type = $7, experience = $8, updated_at = CURRENT_TIMESTAMP WHERE user_id = $9',
        [fullName, age, dateOfBirth, area, city, hoursPerWeek, sitterType, experience, user.id]
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

export default router;
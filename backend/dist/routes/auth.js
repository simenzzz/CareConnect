"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.verifyToken = void 0;
const express_1 = __importDefault(require("express"));
const firebase_1 = require("../config/firebase");
const database_1 = require("../config/database");
const router = express_1.default.Router();
const verifyToken = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            res.status(401).json({ error: 'No token provided' });
            return;
        }
        const idToken = authHeader.split('Bearer ')[1];
        const decodedToken = await (0, firebase_1.verifyIdToken)(idToken);
        req.user = decodedToken;
        next();
    }
    catch (error) {
        console.error('Token verification error:', error);
        res.status(401).json({ error: 'Invalid token' });
    }
};
exports.verifyToken = verifyToken;
router.post('/register', async (req, res) => {
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
        const decodedToken = await (0, firebase_1.verifyIdToken)(idToken);
        const firebaseUid = decodedToken.uid;
        const email = decodedToken.email;
        if (!email) {
            return res.status(400).json({ error: 'Email not found in token' });
        }
        const existingUser = await (0, database_1.query)('SELECT id FROM users WHERE firebase_uid = $1 OR email = $2', [firebaseUid, email]);
        if (existingUser.rows.length > 0) {
            return res.status(409).json({ error: 'This email address is already in use. Please use a different email or try logging in.' });
        }
        await (0, database_1.query)('BEGIN');
        try {
            const userResult = await (0, database_1.query)('INSERT INTO users (firebase_uid, email, user_type) VALUES ($1, $2, $3) RETURNING id', [firebaseUid, email, userType]);
            const userId = userResult.rows[0].id;
            if (userType === 'customer') {
                const { fullName, dateOfBirth, area, city, phone, children, pets } = profileData;
                console.log('📥 Received customer profile data:');
                console.log('  - Full Name:', fullName);
                console.log('  - Date of Birth:', dateOfBirth);
                console.log('  - Phone:', phone);
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
                if (!fullName || !dateOfBirth || !area || !city || !phone) {
                    throw new Error('Missing required customer fields: fullName, dateOfBirth, phone, area, city');
                }
                const customerResult = await (0, database_1.query)('INSERT INTO customers (user_id, full_name, date_of_birth, phone, area, city) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id', [userId, fullName, dateOfBirth, phone, area, city]);
                const customerId = customerResult.rows[0].id;
                if (children && children.length > 0) {
                    console.log(`👶 Inserting ${children.length} children...`);
                    for (const child of children) {
                        try {
                            console.log(`  - Inserting child: ${child.name}, age: ${child.age} (type: ${typeof child.age})`);
                            const ageInt = parseInt(child.age);
                            console.log(`  - Converted age to integer: ${ageInt}`);
                            if (isNaN(ageInt)) {
                                console.error(`  ❌ Invalid age for child ${child.name}: ${child.age}`);
                                throw new Error(`Invalid age for child ${child.name}`);
                            }
                            const result = await (0, database_1.query)('INSERT INTO children (customer_id, name, age, hobbies, school_type, special_needs) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id', [customerId, child.name, ageInt, child.hobbies || '', child.schoolType || '', child.specialNeeds || '']);
                            console.log(`    ✅ Child inserted successfully with ID: ${result.rows[0].id}`);
                        }
                        catch (childError) {
                            console.error(`  ❌ Error inserting child ${child.name}:`, childError);
                            throw childError;
                        }
                    }
                }
                else {
                    console.log('👶 No children to insert');
                }
                if (pets && pets.length > 0) {
                    console.log(`🐕 Inserting ${pets.length} pets...`);
                    for (const pet of pets) {
                        try {
                            console.log(`  - Inserting pet: ${pet.name} (${pet.type}), age: ${pet.age || 'not specified'}`);
                            let ageInt = null;
                            if (pet.age) {
                                ageInt = parseInt(pet.age);
                                if (isNaN(ageInt)) {
                                    console.warn(`  ⚠️ Invalid age for pet ${pet.name}: ${pet.age}, skipping age`);
                                    ageInt = null;
                                }
                            }
                            const result = await (0, database_1.query)('INSERT INTO pets (customer_id, name, age, type, breed, personality, care_instructions, special_needs) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id', [customerId, pet.name, ageInt, pet.type, pet.breed || '', pet.personality || '', pet.careInstructions || '', pet.specialNeeds || '']);
                            console.log(`    ✅ Pet inserted successfully with ID: ${result.rows[0].id}`);
                        }
                        catch (petError) {
                            console.error(`  ❌ Error inserting pet ${pet.name}:`, petError);
                            throw petError;
                        }
                    }
                }
                else {
                    console.log('🐕 No pets to insert');
                }
            }
            else if (userType === 'sitter') {
                const { fullName, dateOfBirth, area, city, phone, hoursPerWeek, sitterType, experience, description, skills, cvUrl, identityDocumentUrl } = profileData;
                if (!fullName || !dateOfBirth || !area || !city || !phone || !hoursPerWeek || !sitterType) {
                    throw new Error('Missing required sitter fields');
                }
                const sitterResult = await (0, database_1.query)(`INSERT INTO sitters 
          (user_id, full_name, date_of_birth, area, city, phone, hours_per_week, sitter_type, experience, description, cv_url, identity_document_url, cv_uploaded_at, identity_document_uploaded_at) 
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
          RETURNING id`, [
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
                ]);
                const sitterId = sitterResult.rows[0].id;
                console.log(`✅ Sitter profile created with ID: ${sitterId}`);
                if (skills && Array.isArray(skills) && skills.length > 0) {
                    console.log(`🎯 Inserting ${skills.length} skills...`);
                    for (const skill of skills) {
                        if (skill && skill.trim()) {
                            try {
                                await (0, database_1.query)('INSERT INTO sitter_skills (sitter_id, skill_name) VALUES ($1, $2)', [sitterId, skill.trim()]);
                                console.log(`  ✅ Skill added: ${skill.trim()}`);
                            }
                            catch (skillError) {
                                console.error(`  ❌ Failed to add skill "${skill}":`, skillError.message);
                            }
                        }
                    }
                }
                if (cvUrl || identityDocumentUrl) {
                    console.log('📄 Sitter documents uploaded:');
                    if (cvUrl)
                        console.log('  ✅ CV:', cvUrl);
                    if (identityDocumentUrl)
                        console.log('  ✅ Identity Document:', identityDocumentUrl);
                }
            }
            await (0, database_1.query)('COMMIT');
            return res.status(201).json({
                message: 'User registered successfully',
                userId,
                userType
            });
        }
        catch (error) {
            await (0, database_1.query)('ROLLBACK');
            throw error;
        }
    }
    catch (error) {
        console.error('Registration error:', error);
        return res.status(500).json({
            error: 'Registration failed',
            details: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
router.post('/login', verifyToken, async (req, res) => {
    try {
        const firebaseUid = req.user?.uid;
        const email = req.user?.email;
        const { expectedUserType } = req.body;
        const userResult = await (0, database_1.query)('SELECT id, user_type, created_at FROM users WHERE firebase_uid = $1', [firebaseUid]);
        if (userResult.rows.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }
        const user = userResult.rows[0];
        if (expectedUserType && user.user_type !== expectedUserType) {
            console.log(`❌ User type mismatch: Expected ${expectedUserType}, got ${user.user_type}`);
            return res.status(403).json({
                error: `This account is registered as a ${user.user_type}. Please use the ${user.user_type} login page.`
            });
        }
        let profile = null;
        if (user.user_type === 'customer') {
            const customerResult = await (0, database_1.query)('SELECT * FROM customers WHERE user_id = $1', [user.id]);
            profile = customerResult.rows[0];
        }
        else if (user.user_type === 'sitter') {
            const sitterResult = await (0, database_1.query)('SELECT * FROM sitters WHERE user_id = $1', [user.id]);
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
    }
    catch (error) {
        console.error('Login error:', error);
        return res.status(500).json({
            error: 'Login failed',
            details: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
router.get('/profile', verifyToken, async (req, res) => {
    try {
        const firebaseUid = req.user?.uid;
        const userResult = await (0, database_1.query)('SELECT id, user_type, created_at FROM users WHERE firebase_uid = $1', [firebaseUid]);
        if (userResult.rows.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }
        const user = userResult.rows[0];
        let profile = null;
        if (user.user_type === 'customer') {
            const customerResult = await (0, database_1.query)('SELECT * FROM customers WHERE user_id = $1', [user.id]);
            profile = customerResult.rows[0];
            const childrenResult = await (0, database_1.query)('SELECT * FROM children WHERE customer_id = $1 AND is_active = TRUE', [profile?.id]);
            const petsResult = await (0, database_1.query)('SELECT * FROM pets WHERE customer_id = $1 AND is_active = TRUE', [profile?.id]);
            profile = {
                ...profile,
                children: childrenResult.rows,
                pets: petsResult.rows
            };
        }
        else if (user.user_type === 'sitter') {
            const sitterResult = await (0, database_1.query)('SELECT * FROM sitters WHERE user_id = $1', [user.id]);
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
    }
    catch (error) {
        console.error('Profile fetch error:', error);
        return res.status(500).json({
            error: 'Failed to fetch profile',
            details: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
router.put('/profile', verifyToken, async (req, res) => {
    try {
        const firebaseUid = req.user?.uid;
        const { profileData } = req.body;
        if (!profileData) {
            return res.status(400).json({ error: 'Profile data is required' });
        }
        const userResult = await (0, database_1.query)('SELECT id, user_type FROM users WHERE firebase_uid = $1', [firebaseUid]);
        if (userResult.rows.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }
        const user = userResult.rows[0];
        if (user.user_type === 'customer') {
            const fullName = profileData.fullName || profileData.full_name;
            const phone = profileData.phone;
            const dateOfBirth = profileData.dateOfBirth || profileData.date_of_birth;
            const area = profileData.area;
            const city = profileData.city;
            await (0, database_1.query)('UPDATE customers SET full_name = $1, phone = $2, date_of_birth = $3, area = $4, city = $5, updated_at = CURRENT_TIMESTAMP WHERE user_id = $6', [fullName, phone, dateOfBirth, area, city, user.id]);
        }
        else if (user.user_type === 'sitter') {
            const { full_name, fullName, age, date_of_birth, dateOfBirth, area, city, phone, hours_per_week, hoursPerWeek, sitter_type, sitterType, experience, description } = profileData;
            const finalFullName = full_name || fullName;
            const finalDateOfBirth = date_of_birth || dateOfBirth;
            const finalHoursPerWeek = hours_per_week || hoursPerWeek;
            const finalSitterType = sitter_type || sitterType;
            await (0, database_1.query)('UPDATE sitters SET full_name = $1, age = $2, date_of_birth = $3, area = $4, city = $5, phone = $6, hours_per_week = $7, sitter_type = $8, experience = $9, description = $10, updated_at = CURRENT_TIMESTAMP WHERE user_id = $11', [finalFullName, age, finalDateOfBirth, area, city, phone, finalHoursPerWeek, finalSitterType, experience, description, user.id]);
        }
        return res.json({ message: 'Profile updated successfully' });
    }
    catch (error) {
        console.error('Profile update error:', error);
        return res.status(500).json({
            error: 'Failed to update profile',
            details: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
router.put('/sitter/documents', verifyToken, async (req, res) => {
    try {
        const firebaseUid = req.user?.uid;
        const { cvUrl, identityDocumentUrl } = req.body;
        const userResult = await (0, database_1.query)('SELECT id, user_type FROM users WHERE firebase_uid = $1', [firebaseUid]);
        if (userResult.rows.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }
        const user = userResult.rows[0];
        if (user.user_type !== 'sitter') {
            return res.status(403).json({ error: 'Only sitters can update documents' });
        }
        await (0, database_1.query)(`UPDATE sitters 
       SET cv_url = $1, 
           identity_document_url = $2,
           cv_uploaded_at = $3,
           identity_document_uploaded_at = $4
       WHERE user_id = $5`, [
            cvUrl || null,
            identityDocumentUrl || null,
            cvUrl ? new Date() : null,
            identityDocumentUrl ? new Date() : null,
            user.id
        ]);
        console.log('✅ Sitter documents updated:', { cvUrl, identityDocumentUrl });
        return res.json({
            message: 'Documents updated successfully',
            cvUrl,
            identityDocumentUrl
        });
    }
    catch (error) {
        console.error('Update documents error:', error);
        return res.status(500).json({
            error: 'Failed to update documents',
            details: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
router.get('/children', verifyToken, async (req, res) => {
    try {
        const firebaseUid = req.user?.uid;
        const userResult = await (0, database_1.query)('SELECT id, user_type FROM users WHERE firebase_uid = $1', [firebaseUid]);
        if (userResult.rows.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }
        const user = userResult.rows[0];
        if (user.user_type !== 'customer') {
            return res.status(403).json({ error: 'Only customers can manage children' });
        }
        const customerResult = await (0, database_1.query)('SELECT id FROM customers WHERE user_id = $1', [user.id]);
        if (customerResult.rows.length === 0) {
            return res.status(404).json({ error: 'Customer profile not found' });
        }
        const customerId = customerResult.rows[0].id;
        const childrenResult = await (0, database_1.query)('SELECT * FROM children WHERE customer_id = $1 AND is_active = TRUE ORDER BY created_at DESC', [customerId]);
        return res.json({
            success: true,
            children: childrenResult.rows
        });
    }
    catch (error) {
        console.error('Get children error:', error);
        return res.status(500).json({
            error: 'Failed to fetch children',
            details: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
router.post('/children', verifyToken, async (req, res) => {
    try {
        const firebaseUid = req.user?.uid;
        const { name, age, hobbies, schoolType, specialNeeds } = req.body;
        if (!name || !age || !schoolType) {
            return res.status(400).json({
                error: 'Missing required fields: name, age, schoolType'
            });
        }
        const userResult = await (0, database_1.query)('SELECT id, user_type FROM users WHERE firebase_uid = $1', [firebaseUid]);
        if (userResult.rows.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }
        const user = userResult.rows[0];
        if (user.user_type !== 'customer') {
            return res.status(403).json({ error: 'Only customers can manage children' });
        }
        const customerResult = await (0, database_1.query)('SELECT id FROM customers WHERE user_id = $1', [user.id]);
        if (customerResult.rows.length === 0) {
            return res.status(404).json({ error: 'Customer profile not found' });
        }
        const customerId = customerResult.rows[0].id;
        const ageInt = parseInt(age);
        if (isNaN(ageInt)) {
            return res.status(400).json({ error: 'Invalid age value' });
        }
        const childResult = await (0, database_1.query)('INSERT INTO children (customer_id, name, age, hobbies, school_type, special_needs) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *', [customerId, name, ageInt, hobbies || '', schoolType, specialNeeds || '']);
        return res.status(201).json({
            success: true,
            message: 'Child added successfully',
            child: childResult.rows[0]
        });
    }
    catch (error) {
        console.error('Add child error:', error);
        return res.status(500).json({
            error: 'Failed to add child',
            details: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
router.put('/children/:id', verifyToken, async (req, res) => {
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
        const userResult = await (0, database_1.query)('SELECT id, user_type FROM users WHERE firebase_uid = $1', [firebaseUid]);
        if (userResult.rows.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }
        const user = userResult.rows[0];
        if (user.user_type !== 'customer') {
            return res.status(403).json({ error: 'Only customers can manage children' });
        }
        const customerResult = await (0, database_1.query)('SELECT id FROM customers WHERE user_id = $1', [user.id]);
        if (customerResult.rows.length === 0) {
            return res.status(404).json({ error: 'Customer profile not found' });
        }
        const customerId = customerResult.rows[0].id;
        const ageInt = parseInt(age);
        if (isNaN(ageInt)) {
            return res.status(400).json({ error: 'Invalid age value' });
        }
        const updateResult = await (0, database_1.query)('UPDATE children SET name = $1, age = $2, hobbies = $3, school_type = $4, special_needs = $5, updated_at = CURRENT_TIMESTAMP WHERE id = $6 AND customer_id = $7 RETURNING *', [name, ageInt, hobbies || '', schoolType, specialNeeds || '', childId, customerId]);
        if (updateResult.rows.length === 0) {
            return res.status(404).json({ error: 'Child not found or access denied' });
        }
        return res.json({
            success: true,
            message: 'Child updated successfully',
            child: updateResult.rows[0]
        });
    }
    catch (error) {
        console.error('Update child error:', error);
        return res.status(500).json({
            error: 'Failed to update child',
            details: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
router.delete('/children/:id', verifyToken, async (req, res) => {
    try {
        const firebaseUid = req.user?.uid;
        const childId = parseInt(req.params.id);
        if (isNaN(childId)) {
            return res.status(400).json({ error: 'Invalid child ID' });
        }
        const userResult = await (0, database_1.query)('SELECT id, user_type FROM users WHERE firebase_uid = $1', [firebaseUid]);
        if (userResult.rows.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }
        const user = userResult.rows[0];
        if (user.user_type !== 'customer') {
            return res.status(403).json({ error: 'Only customers can manage children' });
        }
        const customerResult = await (0, database_1.query)('SELECT id FROM customers WHERE user_id = $1', [user.id]);
        if (customerResult.rows.length === 0) {
            return res.status(404).json({ error: 'Customer profile not found' });
        }
        const customerId = customerResult.rows[0].id;
        const deleteResult = await (0, database_1.query)('UPDATE children SET is_active = FALSE, updated_at = CURRENT_TIMESTAMP WHERE id = $1 AND customer_id = $2 AND is_active = TRUE RETURNING id', [childId, customerId]);
        if (deleteResult.rows.length === 0) {
            return res.status(404).json({ error: 'Child not found or access denied' });
        }
        return res.json({
            success: true,
            message: 'Child deleted successfully'
        });
    }
    catch (error) {
        console.error('Delete child error:', error);
        return res.status(500).json({
            error: 'Failed to delete child',
            details: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
router.get('/pets', verifyToken, async (req, res) => {
    try {
        const firebaseUid = req.user?.uid;
        const userResult = await (0, database_1.query)('SELECT id, user_type FROM users WHERE firebase_uid = $1', [firebaseUid]);
        if (userResult.rows.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }
        const user = userResult.rows[0];
        if (user.user_type !== 'customer') {
            return res.status(403).json({ error: 'Only customers can manage pets' });
        }
        const customerResult = await (0, database_1.query)('SELECT id FROM customers WHERE user_id = $1', [user.id]);
        if (customerResult.rows.length === 0) {
            return res.status(404).json({ error: 'Customer profile not found' });
        }
        const customerId = customerResult.rows[0].id;
        const petsResult = await (0, database_1.query)('SELECT * FROM pets WHERE customer_id = $1 AND is_active = TRUE ORDER BY created_at DESC', [customerId]);
        return res.json({
            success: true,
            pets: petsResult.rows
        });
    }
    catch (error) {
        console.error('Get pets error:', error);
        return res.status(500).json({
            error: 'Failed to fetch pets',
            details: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
router.post('/pets', verifyToken, async (req, res) => {
    try {
        const firebaseUid = req.user?.uid;
        const { name, age, type, breed, personality, careInstructions, specialNeeds } = req.body;
        if (!name || !type) {
            return res.status(400).json({
                error: 'Missing required fields: name, type'
            });
        }
        const userResult = await (0, database_1.query)('SELECT id, user_type FROM users WHERE firebase_uid = $1', [firebaseUid]);
        if (userResult.rows.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }
        const user = userResult.rows[0];
        if (user.user_type !== 'customer') {
            return res.status(403).json({ error: 'Only customers can manage pets' });
        }
        const customerResult = await (0, database_1.query)('SELECT id FROM customers WHERE user_id = $1', [user.id]);
        if (customerResult.rows.length === 0) {
            return res.status(404).json({ error: 'Customer profile not found' });
        }
        const customerId = customerResult.rows[0].id;
        let ageInt = null;
        if (age) {
            ageInt = parseInt(age);
            if (isNaN(ageInt)) {
                return res.status(400).json({ error: 'Invalid age value' });
            }
        }
        const petResult = await (0, database_1.query)('INSERT INTO pets (customer_id, name, age, type, breed, personality, care_instructions, special_needs) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *', [customerId, name, ageInt, type, breed || '', personality || '', careInstructions || '', specialNeeds || '']);
        return res.status(201).json({
            success: true,
            message: 'Pet added successfully',
            pet: petResult.rows[0]
        });
    }
    catch (error) {
        console.error('Add pet error:', error);
        return res.status(500).json({
            error: 'Failed to add pet',
            details: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
router.put('/pets/:id', verifyToken, async (req, res) => {
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
        const userResult = await (0, database_1.query)('SELECT id, user_type FROM users WHERE firebase_uid = $1', [firebaseUid]);
        if (userResult.rows.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }
        const user = userResult.rows[0];
        if (user.user_type !== 'customer') {
            return res.status(403).json({ error: 'Only customers can manage pets' });
        }
        const customerResult = await (0, database_1.query)('SELECT id FROM customers WHERE user_id = $1', [user.id]);
        if (customerResult.rows.length === 0) {
            return res.status(404).json({ error: 'Customer profile not found' });
        }
        const customerId = customerResult.rows[0].id;
        let ageInt = null;
        if (age) {
            ageInt = parseInt(age);
            if (isNaN(ageInt)) {
                return res.status(400).json({ error: 'Invalid age value' });
            }
        }
        const updateResult = await (0, database_1.query)('UPDATE pets SET name = $1, age = $2, type = $3, breed = $4, personality = $5, care_instructions = $6, special_needs = $7, updated_at = CURRENT_TIMESTAMP WHERE id = $8 AND customer_id = $9 RETURNING *', [name, ageInt, type, breed || '', personality || '', careInstructions || '', specialNeeds || '', petId, customerId]);
        if (updateResult.rows.length === 0) {
            return res.status(404).json({ error: 'Pet not found or access denied' });
        }
        return res.json({
            success: true,
            message: 'Pet updated successfully',
            pet: updateResult.rows[0]
        });
    }
    catch (error) {
        console.error('Update pet error:', error);
        return res.status(500).json({
            error: 'Failed to update pet',
            details: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
router.delete('/pets/:id', verifyToken, async (req, res) => {
    try {
        const firebaseUid = req.user?.uid;
        const petId = parseInt(req.params.id);
        if (isNaN(petId)) {
            return res.status(400).json({ error: 'Invalid pet ID' });
        }
        const userResult = await (0, database_1.query)('SELECT id, user_type FROM users WHERE firebase_uid = $1', [firebaseUid]);
        if (userResult.rows.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }
        const user = userResult.rows[0];
        if (user.user_type !== 'customer') {
            return res.status(403).json({ error: 'Only customers can manage pets' });
        }
        const customerResult = await (0, database_1.query)('SELECT id FROM customers WHERE user_id = $1', [user.id]);
        if (customerResult.rows.length === 0) {
            return res.status(404).json({ error: 'Customer profile not found' });
        }
        const customerId = customerResult.rows[0].id;
        const deleteResult = await (0, database_1.query)('UPDATE pets SET is_active = FALSE, updated_at = CURRENT_TIMESTAMP WHERE id = $1 AND customer_id = $2 AND is_active = TRUE RETURNING id', [petId, customerId]);
        if (deleteResult.rows.length === 0) {
            return res.status(404).json({ error: 'Pet not found or access denied' });
        }
        return res.json({
            success: true,
            message: 'Pet deleted successfully'
        });
    }
    catch (error) {
        console.error('Delete pet error:', error);
        return res.status(500).json({
            error: 'Failed to delete pet',
            details: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
router.get('/locations', verifyToken, async (req, res) => {
    try {
        const firebaseUid = req.user?.uid;
        const userResult = await (0, database_1.query)('SELECT id, user_type FROM users WHERE firebase_uid = $1', [firebaseUid]);
        if (userResult.rows.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }
        const user = userResult.rows[0];
        if (user.user_type !== 'customer') {
            return res.status(403).json({ error: 'Only customers can manage locations' });
        }
        const customerResult = await (0, database_1.query)('SELECT id FROM customers WHERE user_id = $1', [user.id]);
        if (customerResult.rows.length === 0) {
            return res.status(404).json({ error: 'Customer profile not found' });
        }
        const customerId = customerResult.rows[0].id;
        const locationsResult = await (0, database_1.query)('SELECT * FROM user_locations WHERE customer_id = $1 AND is_active = TRUE ORDER BY is_default DESC, created_at DESC', [customerId]);
        return res.json({
            success: true,
            locations: locationsResult.rows
        });
    }
    catch (error) {
        console.error('Get locations error:', error);
        return res.status(500).json({
            error: 'Failed to fetch locations',
            details: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
router.post('/locations', verifyToken, async (req, res) => {
    try {
        const firebaseUid = req.user?.uid;
        const { locationName, addressName, streetName, buildingName, floor, addressLine, area, city, postalCode, latitude, longitude, isDefault } = req.body;
        if (!locationName || !area || !city || latitude === undefined || longitude === undefined) {
            return res.status(400).json({
                error: 'Missing required fields: locationName, area, city, latitude, longitude'
            });
        }
        const userResult = await (0, database_1.query)('SELECT id, user_type FROM users WHERE firebase_uid = $1', [firebaseUid]);
        if (userResult.rows.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }
        const user = userResult.rows[0];
        if (user.user_type !== 'customer') {
            return res.status(403).json({ error: 'Only customers can manage locations' });
        }
        const customerResult = await (0, database_1.query)('SELECT id FROM customers WHERE user_id = $1', [user.id]);
        if (customerResult.rows.length === 0) {
            return res.status(404).json({ error: 'Customer profile not found' });
        }
        const customerId = customerResult.rows[0].id;
        const existingLocationsResult = await (0, database_1.query)('SELECT COUNT(*) as count FROM user_locations WHERE customer_id = $1 AND is_active = TRUE', [customerId]);
        const isFirstLocation = existingLocationsResult.rows[0].count === '0';
        let shouldBeDefault = isDefault || isFirstLocation;
        if (shouldBeDefault) {
            await (0, database_1.query)('UPDATE user_locations SET is_default = FALSE WHERE customer_id = $1 AND is_active = TRUE', [customerId]);
        }
        const locationResult = await (0, database_1.query)('INSERT INTO user_locations (customer_id, location_name, address_name, street_name, building_name, floor, address_line, area, city, postal_code, latitude, longitude, is_default) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13) RETURNING *', [customerId, locationName, addressName || null, streetName || null, buildingName || null, floor || null, addressLine, area, city, postalCode || null, latitude, longitude, shouldBeDefault]);
        return res.status(201).json({
            success: true,
            message: 'Location added successfully',
            location: locationResult.rows[0]
        });
    }
    catch (error) {
        console.error('Add location error:', error);
        return res.status(500).json({
            error: 'Failed to add location',
            details: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
router.put('/locations/:id', verifyToken, async (req, res) => {
    try {
        const firebaseUid = req.user?.uid;
        const locationId = parseInt(req.params.id);
        const { locationName, addressName, streetName, buildingName, floor, addressLine, area, city, postalCode, latitude, longitude, isDefault } = req.body;
        if (isNaN(locationId)) {
            return res.status(400).json({ error: 'Invalid location ID' });
        }
        if (!locationName || !area || !city || latitude === undefined || longitude === undefined) {
            return res.status(400).json({
                error: 'Missing required fields: locationName, area, city, latitude, longitude'
            });
        }
        const userResult = await (0, database_1.query)('SELECT id, user_type FROM users WHERE firebase_uid = $1', [firebaseUid]);
        if (userResult.rows.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }
        const user = userResult.rows[0];
        if (user.user_type !== 'customer') {
            return res.status(403).json({ error: 'Only customers can manage locations' });
        }
        const customerResult = await (0, database_1.query)('SELECT id FROM customers WHERE user_id = $1', [user.id]);
        if (customerResult.rows.length === 0) {
            return res.status(404).json({ error: 'Customer profile not found' });
        }
        const customerId = customerResult.rows[0].id;
        if (isDefault) {
            await (0, database_1.query)('UPDATE user_locations SET is_default = FALSE WHERE customer_id = $1 AND id != $2 AND is_active = TRUE', [customerId, locationId]);
        }
        const updateResult = await (0, database_1.query)('UPDATE user_locations SET location_name = $1, address_name = $2, street_name = $3, building_name = $4, floor = $5, address_line = $6, area = $7, city = $8, postal_code = $9, latitude = $10, longitude = $11, is_default = $12, updated_at = CURRENT_TIMESTAMP WHERE id = $13 AND customer_id = $14 AND is_active = TRUE RETURNING *', [locationName, addressName || null, streetName || null, buildingName || null, floor || null, addressLine, area, city, postalCode || null, latitude, longitude, isDefault || false, locationId, customerId]);
        if (updateResult.rows.length === 0) {
            return res.status(404).json({ error: 'Location not found or access denied' });
        }
        return res.json({
            success: true,
            message: 'Location updated successfully',
            location: updateResult.rows[0]
        });
    }
    catch (error) {
        console.error('Update location error:', error);
        return res.status(500).json({
            error: 'Failed to update location',
            details: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
router.delete('/locations/:id', verifyToken, async (req, res) => {
    try {
        const firebaseUid = req.user?.uid;
        const locationId = parseInt(req.params.id);
        if (isNaN(locationId)) {
            return res.status(400).json({ error: 'Invalid location ID' });
        }
        const userResult = await (0, database_1.query)('SELECT id, user_type FROM users WHERE firebase_uid = $1', [firebaseUid]);
        if (userResult.rows.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }
        const user = userResult.rows[0];
        if (user.user_type !== 'customer') {
            return res.status(403).json({ error: 'Only customers can manage locations' });
        }
        const customerResult = await (0, database_1.query)('SELECT id FROM customers WHERE user_id = $1', [user.id]);
        if (customerResult.rows.length === 0) {
            return res.status(404).json({ error: 'Customer profile not found' });
        }
        const customerId = customerResult.rows[0].id;
        const locationToDeleteResult = await (0, database_1.query)('SELECT is_default FROM user_locations WHERE id = $1 AND customer_id = $2 AND is_active = TRUE', [locationId, customerId]);
        if (locationToDeleteResult.rows.length === 0) {
            return res.status(404).json({ error: 'Location not found or access denied' });
        }
        const wasDefault = locationToDeleteResult.rows[0].is_default;
        await (0, database_1.query)('UPDATE user_locations SET is_active = FALSE, is_default = FALSE, updated_at = CURRENT_TIMESTAMP WHERE id = $1 AND customer_id = $2', [locationId, customerId]);
        if (wasDefault) {
            const nextDefaultResult = await (0, database_1.query)('SELECT id FROM user_locations WHERE customer_id = $1 AND is_active = TRUE ORDER BY created_at ASC LIMIT 1', [customerId]);
            if (nextDefaultResult.rows.length > 0) {
                const nextDefaultId = nextDefaultResult.rows[0].id;
                await (0, database_1.query)('UPDATE user_locations SET is_default = TRUE WHERE id = $1', [nextDefaultId]);
            }
        }
        return res.json({
            success: true,
            message: 'Location deleted successfully'
        });
    }
    catch (error) {
        console.error('Delete location error:', error);
        return res.status(500).json({
            error: 'Failed to delete location',
            details: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
exports.default = router;
//# sourceMappingURL=auth.js.map
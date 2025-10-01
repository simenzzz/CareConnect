"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
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
router.post('/register', verifyToken, async (req, res) => {
    try {
        const { user_type, ...userData } = req.body;
        const { uid, email } = req.user;
        const existingUser = await (0, database_1.query)('SELECT id FROM users WHERE firebase_uid = $1 OR email = $2', [uid, email]);
        if (existingUser.rows.length > 0) {
            res.status(400).json({ error: 'User already exists' });
            return;
        }
        const userResult = await (0, database_1.query)('INSERT INTO users (firebase_uid, email, user_type) VALUES ($1, $2, $3) RETURNING id', [uid, email, user_type]);
        const userId = userResult.rows[0].id;
        if (user_type === 'sitter') {
            const { full_name, age, date_of_birth, area, city, hours_per_week, sitter_type, experience } = userData;
            await (0, database_1.query)(`INSERT INTO sitters (user_id, full_name, age, date_of_birth, area, city, hours_per_week, sitter_type, experience)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`, [userId, full_name, age, date_of_birth, area, city, hours_per_week, sitter_type, experience]);
        }
        else if (user_type === 'customer') {
            const { full_name, date_of_birth, area, city } = userData;
            await (0, database_1.query)('INSERT INTO customers (user_id, full_name, date_of_birth, area, city) VALUES ($1, $2, $3, $4, $5)', [userId, full_name, date_of_birth, area, city]);
        }
        res.status(201).json({
            message: 'User registered successfully',
            user_id: userId,
            user_type
        });
    }
    catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({ error: 'Registration failed' });
    }
});
router.get('/profile', verifyToken, async (req, res) => {
    try {
        const { uid } = req.user;
        const userResult = await (0, database_1.query)('SELECT id, email, user_type, created_at FROM users WHERE firebase_uid = $1', [uid]);
        if (userResult.rows.length === 0) {
            res.status(404).json({ error: 'User not found' });
            return;
        }
        const user = userResult.rows[0];
        let profile = { ...user };
        if (user.user_type === 'sitter') {
            const sitterResult = await (0, database_1.query)('SELECT * FROM sitters WHERE user_id = $1', [user.id]);
            profile.sitter_data = sitterResult.rows[0];
        }
        else if (user.user_type === 'customer') {
            const customerResult = await (0, database_1.query)('SELECT * FROM customers WHERE user_id = $1', [user.id]);
            profile.customer_data = customerResult.rows[0];
            const childrenResult = await (0, database_1.query)('SELECT * FROM children WHERE customer_id = $1', [customerResult.rows[0].id]);
            const petsResult = await (0, database_1.query)('SELECT * FROM pets WHERE customer_id = $1', [customerResult.rows[0].id]);
            profile.children = childrenResult.rows;
            profile.pets = petsResult.rows;
        }
        res.json(profile);
    }
    catch (error) {
        console.error('Profile fetch error:', error);
        res.status(500).json({ error: 'Failed to fetch profile' });
    }
});
router.put('/profile', verifyToken, async (req, res) => {
    try {
        const { uid } = req.user;
        const updateData = req.body;
        const userResult = await (0, database_1.query)('SELECT id, user_type FROM users WHERE firebase_uid = $1', [uid]);
        if (userResult.rows.length === 0) {
            res.status(404).json({ error: 'User not found' });
            return;
        }
        const user = userResult.rows[0];
        if (user.user_type === 'sitter') {
            const { full_name, age, date_of_birth, area, city, hours_per_week, sitter_type, experience } = updateData;
            await (0, database_1.query)(`UPDATE sitters SET 
         full_name = $1, age = $2, date_of_birth = $3, area = $4, city = $5, 
         hours_per_week = $6, sitter_type = $7, experience = $8, updated_at = CURRENT_TIMESTAMP
         WHERE user_id = $9`, [full_name, age, date_of_birth, area, city, hours_per_week, sitter_type, experience, user.id]);
        }
        else if (user.user_type === 'customer') {
            const { full_name, date_of_birth, area, city } = updateData;
            await (0, database_1.query)(`UPDATE customers SET 
         full_name = $1, date_of_birth = $2, area = $3, city = $4, updated_at = CURRENT_TIMESTAMP
         WHERE user_id = $5`, [full_name, date_of_birth, area, city, user.id]);
        }
        res.json({ message: 'Profile updated successfully' });
    }
    catch (error) {
        console.error('Profile update error:', error);
        res.status(500).json({ error: 'Failed to update profile' });
    }
});
router.get('/verify', verifyToken, (req, res) => {
    res.json({
        valid: true,
        user: {
            uid: req.user.uid,
            email: req.user.email
        }
    });
});
exports.default = router;
//# sourceMappingURL=auth.js.map
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
router.post('/children', verifyToken, async (req, res) => {
    try {
        const { uid } = req.user;
        const { name, age, hobbies, school_type, special_needs } = req.body;
        const customerResult = await (0, database_1.query)('SELECT c.id FROM customers c JOIN users u ON c.user_id = u.id WHERE u.firebase_uid = $1', [uid]);
        if (customerResult.rows.length === 0) {
            res.status(404).json({ error: 'Customer not found' });
            return;
        }
        const customerId = customerResult.rows[0].id;
        const result = await (0, database_1.query)(`INSERT INTO children (customer_id, name, age, hobbies, school_type, special_needs)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`, [customerId, name, age, hobbies, school_type, special_needs]);
        res.status(201).json(result.rows[0]);
    }
    catch (error) {
        console.error('Add child error:', error);
        res.status(500).json({ error: 'Failed to add child' });
    }
});
router.put('/children/:id', verifyToken, async (req, res) => {
    try {
        const { uid } = req.user;
        const { id } = req.params;
        const { name, age, hobbies, school_type, special_needs } = req.body;
        const childResult = await (0, database_1.query)(`SELECT c.id FROM children ch
       JOIN customers c ON ch.customer_id = c.id
       JOIN users u ON c.user_id = u.id
       WHERE ch.id = $1 AND u.firebase_uid = $2`, [id, uid]);
        if (childResult.rows.length === 0) {
            res.status(404).json({ error: 'Child not found or access denied' });
            return;
        }
        const result = await (0, database_1.query)(`UPDATE children SET 
       name = $1, age = $2, hobbies = $3, school_type = $4, 
       special_needs = $5, updated_at = CURRENT_TIMESTAMP
       WHERE id = $6 RETURNING *`, [name, age, hobbies, school_type, special_needs, id]);
        res.json(result.rows[0]);
    }
    catch (error) {
        console.error('Update child error:', error);
        res.status(500).json({ error: 'Failed to update child' });
    }
});
router.delete('/children/:id', verifyToken, async (req, res) => {
    try {
        const { uid } = req.user;
        const { id } = req.params;
        const childResult = await (0, database_1.query)(`SELECT c.id FROM children ch
       JOIN customers c ON ch.customer_id = c.id
       JOIN users u ON c.user_id = u.id
       WHERE ch.id = $1 AND u.firebase_uid = $2`, [id, uid]);
        if (childResult.rows.length === 0) {
            res.status(404).json({ error: 'Child not found or access denied' });
            return;
        }
        await (0, database_1.query)('DELETE FROM children WHERE id = $1', [id]);
        res.json({ message: 'Child deleted successfully' });
    }
    catch (error) {
        console.error('Delete child error:', error);
        res.status(500).json({ error: 'Failed to delete child' });
    }
});
router.post('/pets', verifyToken, async (req, res) => {
    try {
        const { uid } = req.user;
        const { name, type, breed, size, personality, care_instructions, special_needs } = req.body;
        const customerResult = await (0, database_1.query)('SELECT c.id FROM customers c JOIN users u ON c.user_id = u.id WHERE u.firebase_uid = $1', [uid]);
        if (customerResult.rows.length === 0) {
            res.status(404).json({ error: 'Customer not found' });
            return;
        }
        const customerId = customerResult.rows[0].id;
        const result = await (0, database_1.query)(`INSERT INTO pets (customer_id, name, type, breed, size, personality, care_instructions, special_needs)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`, [customerId, name, type, breed, size, personality, care_instructions, special_needs]);
        res.status(201).json(result.rows[0]);
    }
    catch (error) {
        console.error('Add pet error:', error);
        res.status(500).json({ error: 'Failed to add pet' });
    }
});
router.put('/pets/:id', verifyToken, async (req, res) => {
    try {
        const { uid } = req.user;
        const { id } = req.params;
        const { name, type, breed, size, personality, care_instructions, special_needs } = req.body;
        const petResult = await (0, database_1.query)(`SELECT c.id FROM pets p
       JOIN customers c ON p.customer_id = c.id
       JOIN users u ON c.user_id = u.id
       WHERE p.id = $1 AND u.firebase_uid = $2`, [id, uid]);
        if (petResult.rows.length === 0) {
            res.status(404).json({ error: 'Pet not found or access denied' });
            return;
        }
        const result = await (0, database_1.query)(`UPDATE pets SET 
       name = $1, type = $2, breed = $3, size = $4, personality = $5, 
       care_instructions = $6, special_needs = $7, updated_at = CURRENT_TIMESTAMP
       WHERE id = $8 RETURNING *`, [name, type, breed, size, personality, care_instructions, special_needs, id]);
        res.json(result.rows[0]);
    }
    catch (error) {
        console.error('Update pet error:', error);
        res.status(500).json({ error: 'Failed to update pet' });
    }
});
router.delete('/pets/:id', verifyToken, async (req, res) => {
    try {
        const { uid } = req.user;
        const { id } = req.params;
        const petResult = await (0, database_1.query)(`SELECT c.id FROM pets p
       JOIN customers c ON p.customer_id = c.id
       JOIN users u ON c.user_id = u.id
       WHERE p.id = $1 AND u.firebase_uid = $2`, [id, uid]);
        if (petResult.rows.length === 0) {
            res.status(404).json({ error: 'Pet not found or access denied' });
            return;
        }
        await (0, database_1.query)('DELETE FROM pets WHERE id = $1', [id]);
        res.json({ message: 'Pet deleted successfully' });
    }
    catch (error) {
        console.error('Delete pet error:', error);
        res.status(500).json({ error: 'Failed to delete pet' });
    }
});
router.get('/profile', verifyToken, async (req, res) => {
    try {
        const { uid } = req.user;
        const customerResult = await (0, database_1.query)(`SELECT c.*, u.email, u.created_at as user_created_at
       FROM customers c
       JOIN users u ON c.user_id = u.id
       WHERE u.firebase_uid = $1`, [uid]);
        if (customerResult.rows.length === 0) {
            res.status(404).json({ error: 'Customer not found' });
            return;
        }
        const customer = customerResult.rows[0];
        const childrenResult = await (0, database_1.query)('SELECT * FROM children WHERE customer_id = $1 ORDER BY created_at DESC', [customer.id]);
        const petsResult = await (0, database_1.query)('SELECT * FROM pets WHERE customer_id = $1 ORDER BY created_at DESC', [customer.id]);
        res.json({
            ...customer,
            children: childrenResult.rows,
            pets: petsResult.rows
        });
    }
    catch (error) {
        console.error('Get customer profile error:', error);
        res.status(500).json({ error: 'Failed to fetch customer profile' });
    }
});
exports.default = router;
//# sourceMappingURL=customers.js.map
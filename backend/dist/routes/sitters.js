"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const database_1 = require("../config/database");
const router = express_1.default.Router();
router.get('/', async (req, res) => {
    try {
        const { area, city, sitter_type, limit = 20, offset = 0 } = req.query;
        let whereConditions = ['s.is_active = true'];
        let queryParams = [];
        let paramCount = 0;
        if (area) {
            paramCount++;
            whereConditions.push(`s.area = $${paramCount}`);
            queryParams.push(area);
        }
        if (city) {
            paramCount++;
            whereConditions.push(`s.city = $${paramCount}`);
            queryParams.push(city);
        }
        if (sitter_type) {
            paramCount++;
            whereConditions.push(`$${paramCount} = ANY(s.sitter_type)`);
            queryParams.push(sitter_type);
        }
        paramCount++;
        queryParams.push(parseInt(limit));
        paramCount++;
        queryParams.push(parseInt(offset));
        const sittersQuery = `
      SELECT 
        s.id,
        s.full_name,
        s.area,
        s.city,
        s.hours_per_week,
        s.sitter_type,
        s.experience,
        s.is_verified,
        u.email,
        s.created_at
      FROM sitters s
      JOIN users u ON s.user_id = u.id
      WHERE ${whereConditions.join(' AND ')}
      ORDER BY s.is_verified DESC, s.created_at DESC
      LIMIT $${paramCount - 1} OFFSET $${paramCount}
    `;
        const result = await (0, database_1.query)(sittersQuery, queryParams);
        const countQuery = `
      SELECT COUNT(*) as total
      FROM sitters s
      JOIN users u ON s.user_id = u.id
      WHERE ${whereConditions.join(' AND ')}
    `;
        const countResult = await (0, database_1.query)(countQuery, queryParams.slice(0, -2));
        const total = parseInt(countResult.rows[0].total);
        res.json({
            sitters: result.rows,
            pagination: {
                total,
                limit: parseInt(limit),
                offset: parseInt(offset),
                hasMore: (parseInt(offset) + parseInt(limit)) < total
            }
        });
    }
    catch (error) {
        console.error('Get sitters error:', error);
        res.status(500).json({ error: 'Failed to fetch sitters' });
    }
});
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const result = await (0, database_1.query)(`SELECT 
        s.*,
        u.email,
        u.created_at as user_created_at
       FROM sitters s
       JOIN users u ON s.user_id = u.id
       WHERE s.id = $1 AND s.is_active = true`, [id]);
        if (result.rows.length === 0) {
            res.status(404).json({ error: 'Sitter not found' });
            return;
        }
        res.json(result.rows[0]);
    }
    catch (error) {
        console.error('Get sitter error:', error);
        res.status(500).json({ error: 'Failed to fetch sitter' });
    }
});
router.get('/area/:area', async (req, res) => {
    try {
        const { area } = req.params;
        const { limit = 20, offset = 0 } = req.query;
        const result = await (0, database_1.query)(`SELECT 
        s.id,
        s.full_name,
        s.area,
        s.city,
        s.hours_per_week,
        s.sitter_type,
        s.experience,
        s.is_verified,
        u.email
       FROM sitters s
       JOIN users u ON s.user_id = u.id
       WHERE s.area = $1 AND s.is_active = true
       ORDER BY s.is_verified DESC, s.created_at DESC
       LIMIT $2 OFFSET $3`, [area, limit, offset]);
        res.json(result.rows);
    }
    catch (error) {
        console.error('Get sitters by area error:', error);
        res.status(500).json({ error: 'Failed to fetch sitters by area' });
    }
});
router.get('/type/:type', async (req, res) => {
    try {
        const { type } = req.params;
        const { limit = 20, offset = 0 } = req.query;
        const result = await (0, database_1.query)(`SELECT 
        s.id,
        s.full_name,
        s.area,
        s.city,
        s.hours_per_week,
        s.sitter_type,
        s.experience,
        s.is_verified,
        u.email
       FROM sitters s
       JOIN users u ON s.user_id = u.id
       WHERE $1 = ANY(s.sitter_type) AND s.is_active = true
       ORDER BY s.is_verified DESC, s.created_at DESC
       LIMIT $2 OFFSET $3`, [type, limit, offset]);
        res.json(result.rows);
    }
    catch (error) {
        console.error('Get sitters by type error:', error);
        res.status(500).json({ error: 'Failed to fetch sitters by type' });
    }
});
router.get('/search/:query', async (req, res) => {
    try {
        const { query: searchQuery } = req.params;
        const { limit = 20, offset = 0 } = req.query;
        const result = await (0, database_1.query)(`SELECT 
        s.id,
        s.full_name,
        s.area,
        s.city,
        s.hours_per_week,
        s.sitter_type,
        s.experience,
        s.is_verified,
        u.email
       FROM sitters s
       JOIN users u ON s.user_id = u.id
       WHERE s.is_active = true AND (
         s.full_name ILIKE $1 OR 
         s.area ILIKE $1 OR 
         s.city ILIKE $1 OR 
         s.experience ILIKE $1
       )
       ORDER BY s.is_verified DESC, s.created_at DESC
       LIMIT $2 OFFSET $3`, [`%${searchQuery}%`, limit, offset]);
        res.json(result.rows);
    }
    catch (error) {
        console.error('Search sitters error:', error);
        res.status(500).json({ error: 'Failed to search sitters' });
    }
});
router.get('/stats/overview', async (req, res) => {
    try {
        const statsQuery = `
      SELECT 
        COUNT(*) as total_sitters,
        COUNT(CASE WHEN is_verified = true THEN 1 END) as verified_sitters,
        COUNT(CASE WHEN 'pet-sitter' = ANY(sitter_type) THEN 1 END) as pet_sitters,
        COUNT(CASE WHEN 'baby-sitter' = ANY(sitter_type) THEN 1 END) as baby_sitters,
        COUNT(CASE WHEN area = 'Beirut' THEN 1 END) as beirut_sitters,
        COUNT(CASE WHEN area = 'Mount Lebanon' THEN 1 END) as mount_lebanon_sitters
      FROM sitters 
      WHERE is_active = true
    `;
        const result = await (0, database_1.query)(statsQuery);
        res.json(result.rows[0]);
    }
    catch (error) {
        console.error('Get sitter stats error:', error);
        res.status(500).json({ error: 'Failed to fetch sitter statistics' });
    }
});
exports.default = router;
//# sourceMappingURL=sitters.js.map
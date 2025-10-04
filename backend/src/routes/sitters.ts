import express from 'express';
import type { Request, Response } from 'express';
import { query } from '../config/database';

const router = express.Router();

// Get all sitters with their skills (only active and verified)
router.get('/fetchSitters', async (req: Request, res: Response): Promise<express.Response> => {
  try {
    console.log('📋 Fetching all active and verified sitters...');
    
    // Get all active and verified sitters with their basic info
    const sittersResult = await query(
      `SELECT 
        s.id,
        s.full_name,
        s.area,
        s.city,
        s.phone,
        s.hours_per_week,
        s.sitter_type,
        s.description,
        s.rating,
        s.experience,
        s.created_at
      FROM sitters s
      WHERE s.is_active = true AND s.is_verified = true
      ORDER BY s.rating DESC, s.created_at DESC`
    );
    
    const sitters = sittersResult.rows;
    console.log(`✅ Found ${sitters.length} sitters`);
    
    // Get skills for each sitter
    const sittersWithSkills = await Promise.all(
      sitters.map(async (sitter) => {
        const skillsResult = await query(
          'SELECT skill_name FROM sitter_skills WHERE sitter_id = $1 ORDER BY created_at',
          [sitter.id]
        );
        
        return {
          id: sitter.id,
          fullName: sitter.full_name,
          area: sitter.area,
          city: sitter.city,
          phone: sitter.phone,
          hoursPerWeek: sitter.hours_per_week,
          sitterType: sitter.sitter_type, // 'B' = Baby Sitter, 'P' = Pet Sitter, 'T' = Both
          description: sitter.description,
          rating: parseFloat(sitter.rating) || 0,
          experience: sitter.experience,
          skills: skillsResult.rows.map(row => row.skill_name),
          createdAt: sitter.created_at
        };
      })
    );
    
    // Separate sitters by type
    const petSitters = sittersWithSkills.filter(s => s.sitterType === 'P' || s.sitterType === 'T');
    const babySitters = sittersWithSkills.filter(s => s.sitterType === 'B' || s.sitterType === 'T');
    
    console.log(`🐕 Pet Sitters: ${petSitters.length}`);
    console.log(`👶 Baby Sitters: ${babySitters.length}`);
    
    return res.json({
      success: true,
      data: {
        petSitters,
        babySitters,
        allSitters: sittersWithSkills
      }
    });
    
  } catch (error) {
    console.error('❌ Error fetching sitters:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch sitters',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Search sitters by name (only active and verified)
router.get('/searchByName', async (req: Request, res: Response): Promise<express.Response> => {
  try {
    const searchName = req.query.name as string;
    
    if (!searchName || searchName.trim().length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Search name is required'
      });
    }
    
    console.log(`🔍 Searching for sitters with name: "${searchName}"...`);
    
    // Search for active and verified sitters with matching names
    const sittersResult = await query(
      `SELECT 
        s.id,
        s.full_name,
        s.area,
        s.city,
        s.phone,
        s.hours_per_week,
        s.sitter_type,
        s.description,
        s.rating,
        s.experience,
        s.created_at
      FROM sitters s
      WHERE s.is_active = true 
        AND s.is_verified = true
        AND s.full_name ILIKE $1
      ORDER BY s.rating DESC, s.created_at DESC`,
      [`%${searchName}%`]
    );
    
    if (sittersResult.rows.length === 0) {
      return res.json({
        success: true,
        data: [],
        message: 'No sitters found matching your search'
      });
    }
    
    console.log(`✅ Found ${sittersResult.rows.length} sitter(s)`);
    
    // Get skills for each sitter
    const sittersWithSkills = await Promise.all(
      sittersResult.rows.map(async (sitter) => {
        const skillsResult = await query(
          'SELECT skill_name FROM sitter_skills WHERE sitter_id = $1 ORDER BY created_at',
          [sitter.id]
        );
        
        return {
          id: sitter.id,
          fullName: sitter.full_name,
          area: sitter.area,
          city: sitter.city,
          phone: sitter.phone,
          hoursPerWeek: sitter.hours_per_week,
          sitterType: sitter.sitter_type,
          description: sitter.description,
          rating: parseFloat(sitter.rating) || 0,
          experience: sitter.experience,
          skills: skillsResult.rows.map(row => row.skill_name),
          createdAt: sitter.created_at
        };
      })
    );
    
    return res.json({
      success: true,
      data: sittersWithSkills
    });
    
  } catch (error) {
    console.error('❌ Error searching sitters:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to search sitters',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;

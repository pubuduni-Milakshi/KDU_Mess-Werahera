const express = require('express');
const router = express.Router();
const auth = require('../../middleware/auth.middleware');
const Menu = require('../models/Menu');

// TEST ROUTE - Remove after debugging
router.get('/test', async (req, res) => {
  try {
    console.log('🧪 Testing menu database connection...');
    
    const menuCount = await Menu.countDocuments();
    console.log(`📊 Total menus in database: ${menuCount}`);
    
    const menus = await Menu.find().limit(1);
    console.log('📋 Sample menu:', JSON.stringify(menus[0], null, 2));
    
    res.json({
      success: true,
      totalMenus: menuCount,
      sampleMenu: menus[0] || null,
      message: menuCount === 0 ? 'No menus found - create one in Menu Management first' : 'Database working!'
    });
  } catch (err) {
    console.error('❌ Test route error:', err);
    res.status(500).json({ 
      success: false, 
      error: err.message,
      stack: err.stack
    });
  }
});

// @route   GET /api/menu-history
// @desc    Get all historical menus (grouped by week)
// @access  Private (Admin only)
router.get('/', auth, async (req, res) => {
  try {
    console.log('📋 Fetching menu history...');
    console.log('👤 User role:', req.user.role);

    // Check if user is admin
    if (req.user.role !== 'Admin') {
      console.log('❌ Access denied - User is not Admin');
      return res.status(403).json({ msg: 'Access denied. Admin only.' });
    }

    console.log('✅ User is Admin - fetching menus...');

    // Get all menus, sorted by week start date (newest first)
    const menus = await Menu.find()
      .sort({ weekStartDate: -1 })
      .select('weekStartDate weekEndDate meals createdAt updatedAt');

    console.log(`📊 Found ${menus.length} menus in database`);

    // Group menus by week - Handle undefined meals array
    const menuHistory = menus.map(menu => {
      // Check if meals exists and is an array
      const mealsArray = Array.isArray(menu.meals) ? menu.meals : [];
      
      return {
        _id: menu._id,
        weekStartDate: menu.weekStartDate,
        weekEndDate: menu.weekEndDate,
        totalMeals: mealsArray.length,
        createdAt: menu.createdAt,
        updatedAt: menu.updatedAt,
        meals: mealsArray
      };
    });

    console.log('✅ Sending menu history to frontend');
    console.log(`📋 Returning ${menuHistory.length} menus`);
    res.json(menuHistory);
  } catch (err) {
    console.error('❌ Error fetching menu history:', err);
    console.error('Error stack:', err.stack);
    res.status(500).json({ 
      msg: 'Server error', 
      error: err.message,
      details: process.env.NODE_ENV === 'development' ? err.stack : undefined
    });
  }
});

// @route   GET /api/menu-history/:id
// @desc    Get detailed menu for a specific week
// @access  Private (Admin only)
router.get('/:id', auth, async (req, res) => {
  try {
    console.log(`📋 Fetching menu details for ID: ${req.params.id}`);

    // Check if user is admin
    if (req.user.role !== 'Admin') {
      return res.status(403).json({ msg: 'Access denied. Admin only.' });
    }

    const menu = await Menu.findById(req.params.id);

    if (!menu) {
      console.log('❌ Menu not found');
      return res.status(404).json({ msg: 'Menu not found' });
    }

    console.log('✅ Menu found, sending details');
    res.json(menu);
  } catch (err) {
    console.error('❌ Error fetching menu details:', err);
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ msg: 'Menu not found' });
    }
    res.status(500).json({ msg: 'Server error', error: err.message });
  }
});

// @route   DELETE /api/menu-history/:id
// @desc    Delete a historical menu
// @access  Private (Admin only)
router.delete('/:id', auth, async (req, res) => {
  try {
    console.log(`🗑️ Deleting menu with ID: ${req.params.id}`);

    // Check if user is admin
    if (req.user.role !== 'Admin') {
      return res.status(403).json({ msg: 'Access denied. Admin only.' });
    }

    const menu = await Menu.findById(req.params.id);

    if (!menu) {
      console.log('❌ Menu not found');
      return res.status(404).json({ msg: 'Menu not found' });
    }

    // Check if this is the current week's menu
    const today = new Date();
    const weekStart = new Date(menu.weekStartDate);
    const weekEnd = new Date(menu.weekEndDate);

    if (today >= weekStart && today <= weekEnd) {
      console.log('❌ Cannot delete current week menu');
      return res.status(400).json({ msg: 'Cannot delete current week\'s menu. Please use Menu Management instead.' });
    }

    await Menu.findByIdAndDelete(req.params.id);

    console.log('✅ Menu deleted successfully');
    res.json({ msg: 'Menu deleted successfully' });
  } catch (err) {
    console.error('❌ Error deleting menu:', err);
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ msg: 'Menu not found' });
    }
    res.status(500).json({ msg: 'Server error', error: err.message });
  }
});

module.exports = router;
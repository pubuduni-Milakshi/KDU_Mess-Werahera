const express = require('express');
const { body, validationResult } = require('express-validator');
const Menu = require('../models/Menu');
const authMiddleware = require('../../middleware/auth.middleware');

const router = express.Router();

// Middleware to check if user is Admin
const checkAdmin = async (req, res, next) => {
  try {
    if (req.user.role !== 'Admin') {
      return res.status(403).json({ 
        msg: 'Access denied. Only Admin can manage menu',
        userRole: req.user.role,
        requiredRole: 'Admin'
      });
    }
    next();
  } catch (err) {
    console.error('Authorization error:', err);
    res.status(500).json({ msg: 'Authorization error' });
  }
};

// PUBLISH/CREATE Menu (Admin only)
router.post('/publish', [
  authMiddleware,
  checkAdmin,
  body('weekStartDate').isISO8601().withMessage('Valid week start date is required'),
  body('menus').isArray({ min: 1 }).withMessage('Menus array is required'),
  body('menus.*.day').isIn(['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']),
  body('menus.*.breakfast').trim().notEmpty().withMessage('Breakfast menu is required'),
  body('menus.*.lunch').trim().notEmpty().withMessage('Lunch menu is required'),
  body('menus.*.dinner').trim().notEmpty().withMessage('Dinner menu is required')
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const { weekStartDate, menus } = req.body;
    const weekStart = new Date(weekStartDate);
    weekStart.setHours(0, 0, 0, 0);
    
    await Menu.deleteMany({
      weekStartDate: weekStart
    });

    const savedMenus = [];
    for (const menuData of menus) {
      const menu = new Menu({
        day: menuData.day,
        breakfast: menuData.breakfast,
        lunch: menuData.lunch,
        dinner: menuData.dinner,
        specialNotes: menuData.specialNotes || '',
        weekStartDate: weekStart,
        isPublished: true,
        publishedBy: req.user.userId,
        publishedAt: new Date()
      });
      
      const savedMenu = await menu.save();
      savedMenus.push(savedMenu);
    }

    res.json({
      msg: 'Menu published successfully',
      menus: savedMenus
    });
  } catch (err) {
    console.error('Error publishing menu:', err);
    res.status(500).json({ msg: 'Server error', error: err.message });
  }
});

// GET Current Week Menu (All authenticated users) - FIXED
router.get('/current-week', authMiddleware, async (req, res) => {
  try {
    const today = new Date();
    const dayOfWeek = today.getDay();
    const diff = today.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
    const weekStart = new Date(today);
    weekStart.setDate(diff);
    weekStart.setHours(0, 0, 0, 0);

    console.log('Today:', today.toISOString());
    console.log('Calculated weekStart:', weekStart.toISOString());

    // Query with date range to handle timezone issues
    const startRange = new Date(weekStart);
    startRange.setDate(startRange.getDate() - 1);
    
    const endRange = new Date(weekStart);
    endRange.setDate(endRange.getDate() + 1);

    console.log('Query range:', startRange.toISOString(), 'to', endRange.toISOString());

    const menus = await Menu.find({
      weekStartDate: {
        $gte: startRange,
        $lte: endRange
      },
      isPublished: true
    }).sort({ day: 1 });

    console.log('Found menus:', menus.length);

    res.json(menus);
  } catch (err) {
    console.error('Error fetching current week menu:', err);
    res.status(500).json({ msg: 'Server error' });
  }
});

// GET All Published Menus (for all users)
router.get('/', authMiddleware, async (req, res) => {
  try {
    const menus = await Menu.find({ isPublished: true })
      .sort({ weekStartDate: -1, day: 1 })
      .limit(50);
    
    res.json(menus);
  } catch (err) {
    console.error('Error fetching menus:', err);
    res.status(500).json({ msg: 'Server error' });
  }
});

// GET Menu by Specific Date (For dashboard - shows that day's menu)
router.get('/date/:date', authMiddleware, async (req, res) => {
  try {
    const requestedDate = new Date(req.params.date);
    requestedDate.setHours(0, 0, 0, 0);
    
    const dayOfWeek = requestedDate.getDay();
    const diff = requestedDate.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
    const weekStart = new Date(requestedDate);
    weekStart.setDate(diff);
    weekStart.setHours(0, 0, 0, 0);

    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const dayName = dayNames[requestedDate.getDay()];

    const startRange = new Date(weekStart);
    startRange.setDate(startRange.getDate() - 1);
    
    const endRange = new Date(weekStart);
    endRange.setDate(endRange.getDate() + 1);

    const menus = await Menu.find({
      weekStartDate: {
        $gte: startRange,
        $lte: endRange
      },
      day: dayName,
      isPublished: true
    });

    if (!menus || menus.length === 0) {
      return res.status(404).json({ msg: 'No menu found for this date' });
    }

    res.json({ menus: menus });
  } catch (err) {
    console.error('Error fetching date menu:', err);
    res.status(500).json({ msg: 'Server error' });
  }
});

// GET Menu by Week (Admin only - for management)
router.get('/week/:weekStartDate', authMiddleware, checkAdmin, async (req, res) => {
  try {
    const weekStart = new Date(req.params.weekStartDate);
    weekStart.setHours(0, 0, 0, 0);
    
    const startRange = new Date(weekStart);
    startRange.setDate(startRange.getDate() - 1);
    
    const endRange = new Date(weekStart);
    endRange.setDate(endRange.getDate() + 1);
    
    const menus = await Menu.find({
      weekStartDate: {
        $gte: startRange,
        $lte: endRange
      }
    }).sort({ day: 1 });

    res.json(menus);
  } catch (err) {
    console.error('Error fetching week menu:', err);
    res.status(500).json({ msg: 'Server error' });
  }
});

// GET Menu by Day
router.get('/day/:day', authMiddleware, async (req, res) => {
  try {
    const today = new Date();
    const dayOfWeek = today.getDay();
    const diff = today.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
    const weekStart = new Date(today);
    weekStart.setDate(diff);
    weekStart.setHours(0, 0, 0, 0);

    const startRange = new Date(weekStart);
    startRange.setDate(startRange.getDate() - 1);
    
    const endRange = new Date(weekStart);
    endRange.setDate(endRange.getDate() + 1);

    const menu = await Menu.findOne({
      day: req.params.day,
      weekStartDate: {
        $gte: startRange,
        $lte: endRange
      },
      isPublished: true
    });

    if (!menu) {
      return res.status(404).json({ msg: 'No menu found for this day' });
    }

    res.json(menu);
  } catch (err) {
    console.error('Error fetching day menu:', err);
    res.status(500).json({ msg: 'Server error' });
  }
});

// CREATE Single Menu (Admin only)
router.post('/create', [
  authMiddleware,
  checkAdmin,
  body('day').isIn(['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']),
  body('breakfast').trim().notEmpty().withMessage('Breakfast menu is required'),
  body('lunch').trim().notEmpty().withMessage('Lunch menu is required'),
  body('dinner').trim().notEmpty().withMessage('Dinner menu is required')
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const { day, breakfast, lunch, dinner, specialNotes, weekStartDate } = req.body;
    
    const today = new Date();
    const dayOfWeek = today.getDay();
    const diff = today.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
    const defaultWeekStart = new Date(today);
    defaultWeekStart.setDate(diff);
    defaultWeekStart.setHours(0, 0, 0, 0);

    const weekStart = weekStartDate ? new Date(weekStartDate) : defaultWeekStart;
    weekStart.setHours(0, 0, 0, 0);

    const existingMenu = await Menu.findOne({
      day: day,
      weekStartDate: weekStart
    });

    if (existingMenu) {
      return res.status(400).json({ msg: `Menu for ${day} already exists for this week` });
    }

    const menu = new Menu({
      day,
      breakfast,
      lunch,
      dinner,
      specialNotes: specialNotes || '',
      weekStartDate: weekStart,
      isPublished: true,
      publishedBy: req.user.userId,
      publishedAt: new Date()
    });

    const savedMenu = await menu.save();

    res.json({
      msg: 'Menu created successfully',
      menu: savedMenu
    });
  } catch (err) {
    console.error('Error creating menu:', err);
    res.status(500).json({ msg: 'Server error', error: err.message });
  }
});

// UPDATE Menu (Admin only)
router.put('/:id', [
  authMiddleware,
  checkAdmin,
  body('day').optional().isIn(['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']),
  body('breakfast').optional().trim().notEmpty().withMessage('Breakfast menu cannot be empty'),
  body('lunch').optional().trim().notEmpty().withMessage('Lunch menu cannot be empty'),
  body('dinner').optional().trim().notEmpty().withMessage('Dinner menu cannot be empty')
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const updateData = {
      ...req.body,
      publishedBy: req.user.userId,
      publishedAt: new Date()
    };

    const menu = await Menu.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true }
    );

    if (!menu) {
      return res.status(404).json({ msg: 'Menu not found' });
    }

    res.json({ 
      msg: 'Menu updated successfully', 
      menu 
    });
  } catch (err) {
    console.error('Error updating menu:', err);
    res.status(500).json({ msg: 'Server error', error: err.message });
  }
});

// DELETE Menu (Admin only)
router.delete('/:id', authMiddleware, checkAdmin, async (req, res) => {
  try {
    const menu = await Menu.findByIdAndDelete(req.params.id);
        
    if (!menu) {
      return res.status(404).json({ msg: 'Menu not found' });
    }

    res.json({ 
      msg: 'Menu deleted successfully',
      deletedMenu: {
        id: menu._id,
        day: menu.day,
        weekStartDate: menu.weekStartDate
      }
    });
  } catch (err) {
    console.error('Error deleting menu:', err);
    res.status(500).json({ msg: 'Server error', error: err.message });
  }
});

// GET All Menus (Admin only - for management overview)
router.get('/admin/all', authMiddleware, checkAdmin, async (req, res) => {
  try {
    const { page = 1, limit = 50, weekStartDate } = req.query;
    const query = {};
    
    if (weekStartDate) {
      const ws = new Date(weekStartDate);
      ws.setHours(0, 0, 0, 0);
      query.weekStartDate = ws;
    }

    const menus = await Menu.find(query)
      .sort({ weekStartDate: -1, day: 1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .populate('publishedBy', 'firstName lastName email');

    const totalMenus = await Menu.countDocuments(query);

    res.json({
      menus,
      totalPages: Math.ceil(totalMenus / limit),
      currentPage: page,
      totalMenus
    });
  } catch (err) {
    console.error('Error fetching all menus:', err);
    res.status(500).json({ msg: 'Server error' });
  }
});

// GET Menu Statistics (Admin only)
router.get('/admin/stats', authMiddleware, checkAdmin, async (req, res) => {
  try {
    const today = new Date();
    const dayOfWeek = today.getDay();
    const diff = today.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
    const weekStart = new Date(today);
    weekStart.setDate(diff);
    weekStart.setHours(0, 0, 0, 0);
    
    const startRange = new Date(weekStart);
    startRange.setDate(startRange.getDate() - 1);
    
    const endRange = new Date(weekStart);
    endRange.setDate(endRange.getDate() + 1);
    
    const thisWeekMenus = await Menu.countDocuments({
      weekStartDate: {
        $gte: startRange,
        $lte: endRange
      },
      isPublished: true
    });

    const totalPublishedMenus = await Menu.countDocuments({
      isPublished: true
    });

    const recentMenus = await Menu.find({
      isPublished: true
    })
    .sort({ publishedAt: -1 })
    .limit(5)
    .select('day breakfast lunch dinner publishedAt weekStartDate');

    res.json({
      thisWeekMenus,
      totalPublishedMenus,
      recentMenus,
      weekStart
    });
  } catch (err) {
    console.error('Error fetching menu stats:', err);
    res.status(500).json({ msg: 'Server error' });
  }
});

// DUPLICATE Menu from Previous Week (Admin only)
router.post('/duplicate-week', [
  authMiddleware,
  checkAdmin,
  body('sourceWeekStartDate').isISO8601().withMessage('Valid source week start date is required'),
  body('targetWeekStartDate').isISO8601().withMessage('Valid target week start date is required')
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const { sourceWeekStartDate, targetWeekStartDate } = req.body;
    
    const sourceStart = new Date(sourceWeekStartDate);
    sourceStart.setHours(0, 0, 0, 0);
    
    const sourceMenus = await Menu.find({
      weekStartDate: sourceStart,
      isPublished: true
    });

    if (sourceMenus.length === 0) {
      return res.status(404).json({ msg: 'No menus found for the source week' });
    }

    const targetStart = new Date(targetWeekStartDate);
    targetStart.setHours(0, 0, 0, 0);
    
    await Menu.deleteMany({
      weekStartDate: targetStart
    });

    const duplicatedMenus = [];
    for (const sourceMenu of sourceMenus) {
      const newMenu = new Menu({
        day: sourceMenu.day,
        breakfast: sourceMenu.breakfast,
        lunch: sourceMenu.lunch,
        dinner: sourceMenu.dinner,
        specialNotes: sourceMenu.specialNotes,
        weekStartDate: targetStart,
        isPublished: true,
        publishedBy: req.user.userId,
        publishedAt: new Date()
      });
      
      const savedMenu = await newMenu.save();
      duplicatedMenus.push(savedMenu);
    }

    res.json({
      msg: 'Menus duplicated successfully',
      duplicatedCount: duplicatedMenus.length,
      menus: duplicatedMenus
    });
  } catch (err) {
    console.error('Error duplicating menus:', err);
    res.status(500).json({ msg: 'Server error', error: err.message });
  }
});

module.exports = router;
const express = require('express');
const router = express.Router();
const authMiddleware = require('../../middleware/auth.middleware');

// Middleware to check if user is Mess Staff
const checkMessStaff = async (req, res, next) => {
  try {
    if (req.user.role !== 'Mess Staff') {
      return res.status(403).json({ 
        msg: 'Access denied. Only Mess Staff can access this resource'
      });
    }
    next();
  } catch (err) {
    console.error('Authorization error:', err);
    res.status(500).json({ msg: 'Authorization error' });
  }
};

// @route   GET /api/mess-staff/meal-stats
// @desc    Get meal preparation statistics
// @access  Private (Mess Staff only)
router.get('/meal-stats', authMiddleware, checkMessStaff, async (req, res) => {
  try {
    // For now, return mock data
    // You can later connect this to your actual booking/order system
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Mock statistics - replace with actual database queries when you have Order/Booking model
    const stats = {
      mealsPrepared: 150,
      mealsServed: 120,
      remainingMeals: 30
    };

    res.json(stats);
  } catch (err) {
    console.error('Error fetching meal stats:', err);
    res.status(500).json({ msg: 'Server error' });
  }
});

module.exports = router;
const express = require('express');
const router = express.Router();
const authMiddleware = require('../../middleware/auth.middleware');
const User = require('../models/User');
const Booking = require('../models/Order');

// Middleware to check if user is Admin
const checkAdmin = async (req, res, next) => {
  try {
    if (req.user.role !== 'Admin') {
      return res.status(403).json({ 
        msg: 'Access denied. Only Admin can access this resource'
      });
    }
    next();
  } catch (err) {
    console.error('Authorization error:', err);
    res.status(500).json({ msg: 'Authorization error' });
  }
};

// @route   GET /api/admin/dashboard-stats
// @desc    Get dashboard statistics
// @access  Private (Admin only)
router.get('/dashboard-stats', authMiddleware, checkAdmin, async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Total meals served today
    const totalMealsServed = await Booking.countDocuments({
      date: { $gte: today, $lt: tomorrow },
      status: 'Confirmed'
    });

    // Active orders (pending or confirmed for future dates)
    const activeOrders = await Booking.countDocuments({
      date: { $gte: today },
      status: { $in: ['Pending', 'Confirmed'] }
    });

    // Total users count
    const totalUsers = await User.countDocuments({ isActive: true });

    res.json({
      totalMealsServed,
      activeOrders,
      totalUsers
    });
  } catch (err) {
    console.error('Error fetching dashboard stats:', err);
    res.status(500).json({ msg: 'Server error' });
  }
});

// @route   GET /api/admin/recent-orders
// @desc    Get recent orders
// @access  Private (Admin only)
router.get('/recent-orders', authMiddleware, checkAdmin, async (req, res) => {
  try {
    const orders = await Booking.find()
      .sort({ createdAt: -1 })
      .limit(10)
      .populate('userId', 'roleId firstName lastName email');

    const formattedOrders = orders.map(order => ({
      _id: order._id,
      userId: order.userId?.roleId || order.userId?._id, // Show roleId (like DS001, OC001)
      userName: order.userId ? `${order.userId.firstName} ${order.userId.lastName}` : 'Unknown User',
      mealType: order.mealType,
      orderDate: order.date, // Map to orderDate
      date: order.date, // Keep for backward compatibility
      status: order.status,
      createdAt: order.createdAt
    }));

    res.json(formattedOrders);
  } catch (err) {
    console.error('Error fetching recent orders:', err);
    res.status(500).json({ msg: 'Server error' });
  }
});

module.exports = router;
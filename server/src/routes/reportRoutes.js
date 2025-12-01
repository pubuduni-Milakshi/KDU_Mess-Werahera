const express = require('express');
const router = express.Router();
const Order = require('../models/Order');
const User = require('../models/User');
const auth = require('../../middleware/auth.middleware');

// Middleware to check if user is Admin or Mess Staff
const staffAuth = (req, res, next) => {
  if (req.user.role !== 'Admin' && req.user.role !== 'Mess Staff') {
    return res.status(403).json({ msg: 'Access denied. Admin or Mess Staff only.' });
  }
  next();
};

// Daily Meal Report
router.get('/daily-meals', [auth, staffAuth], async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    const start = startDate ? new Date(startDate) : new Date();
    start.setHours(0, 0, 0, 0);
    
    const end = endDate ? new Date(endDate) : new Date();
    end.setHours(23, 59, 59, 999);

    console.log('📅 Fetching daily meals report:', { start, end });

    // Total meals by meal type - support both date and orderDate fields
    const mealsByType = await Order.aggregate([
      {
        $match: {
          $or: [
            { date: { $gte: start, $lte: end } },
            { orderDate: { $gte: start, $lte: end } }
          ],
          status: { $in: ['Booked', 'Confirmed', 'Served', 'Completed'] }
        }
      },
      {
        $group: {
          _id: '$mealType',
          count: { $sum: 1 }
        }
      },
      { $sort: { count: -1 } }
    ]);

    // Breakdown by user role
    const mealsByRole = await Order.aggregate([
      {
        $match: {
          $or: [
            { date: { $gte: start, $lte: end } },
            { orderDate: { $gte: start, $lte: end } }
          ],
          status: { $in: ['Booked', 'Confirmed', 'Served', 'Completed'] }
        }
      },
      {
        $lookup: {
          from: 'users',
          localField: 'userId',
          foreignField: '_id',
          as: 'user'
        }
      },
      { $unwind: '$user' },
      {
        $group: {
          _id: '$user.role',
          count: { $sum: 1 }
        }
      },
      { $sort: { count: -1 } }
    ]);

    // Tea/beverage requests - count all tea types
    const teaCount = await Order.countDocuments({
      $or: [
        { date: { $gte: start, $lte: end } },
        { orderDate: { $gte: start, $lte: end } }
      ],
      status: { $in: ['Booked', 'Confirmed', 'Served', 'Completed'] },
      mealType: { 
        $in: ['Morning Tea', 'Mid-Morning Tea', 'Evening Tea', 'Night Tea'] 
      }
    });

    console.log('📊 Daily meals report:', {
      mealsByTypeCount: mealsByType.length,
      mealsByRoleCount: mealsByRole.length,
      teaCount
    });

    res.json({
      mealsByType,
      mealsByRole,
      teaCount,
      dateRange: { start, end }
    });
  } catch (err) {
    console.error('❌ Error in daily-meals report:', err);
    res.status(500).json({ msg: 'Server error', error: err.message });
  }
});

// Weekly/Monthly Summary Report
router.get('/period-summary', [auth, staffAuth], async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    const start = new Date(startDate);
    start.setHours(0, 0, 0, 0);
    
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);

    console.log('📅 Fetching period summary report:', { start, end });

    const totalMeals = await Order.countDocuments({
      $or: [
        { date: { $gte: start, $lte: end } },
        { orderDate: { $gte: start, $lte: end } }
      ],
      status: { $in: ['Booked', 'Confirmed', 'Served', 'Completed'] }
    });

    // Calculate average meals per day
    const daysDiff = Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1;
    const avgMealsPerDay = (totalMeals / daysDiff).toFixed(2);

    // Daily breakdown
    const dailyBreakdown = await Order.aggregate([
      {
        $match: {
          $or: [
            { date: { $gte: start, $lte: end } },
            { orderDate: { $gte: start, $lte: end } }
          ],
          status: { $in: ['Booked', 'Confirmed', 'Served', 'Completed'] }
        }
      },
      {
        $addFields: {
          effectiveDate: { $ifNull: ['$date', '$orderDate'] }
        }
      },
      {
        $group: {
          _id: {
            $dateToString: { format: '%Y-%m-%d', date: '$effectiveDate' }
          },
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    console.log('📊 Period summary report:', {
      totalMeals,
      avgMealsPerDay,
      daysDiff,
      dailyBreakdownCount: dailyBreakdown.length
    });

    res.json({
      totalMeals,
      avgMealsPerDay,
      daysDiff,
      dailyBreakdown,
      dateRange: { start, end }
    });
  } catch (err) {
    console.error('❌ Error in period-summary report:', err);
    res.status(500).json({ msg: 'Server error', error: err.message });
  }
});

// Financial Report
router.get('/financial', [auth, staffAuth], async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    const start = new Date(startDate);
    const end = new Date(endDate);

    console.log('📅 Fetching financial report:', { start, end });

    // Define meal prices
    const MEAL_PRICES = {
      'Breakfast': 250,
      'Lunch': 400,
      'Dinner': 250,
      'Morning Tea': 100,
      'Mid-Morning Tea': 100,
      'Evening Tea': 100,
      'Night Tea': 100
    };

    // Get all orders in the date range
    const orders = await Order.find({
      $or: [
        { date: { $gte: start, $lte: end } },
        { orderDate: { $gte: start, $lte: end } }
      ],
      status: { $in: ['Booked', 'Confirmed', 'Served', 'Completed'] }
    }).populate('userId', 'role');

    // Calculate revenue by meal type
    const revenueByMealType = {};
    orders.forEach(order => {
      const mealType = order.mealType;
      const price = MEAL_PRICES[mealType] || 0;
      
      if (!revenueByMealType[mealType]) {
        revenueByMealType[mealType] = {
          count: 0,
          revenue: 0
        };
      }
      
      revenueByMealType[mealType].count += 1;
      revenueByMealType[mealType].revenue += price;
    });

    const revenueByMealTypeArray = Object.keys(revenueByMealType).map(key => ({
      _id: key,
      count: revenueByMealType[key].count,
      revenue: revenueByMealType[key].revenue
    }));

    // Calculate revenue by user type
    const revenueByUserType = {};
    orders.forEach(order => {
      const userRole = order.userId?.role || 'Unknown';
      const price = MEAL_PRICES[order.mealType] || 0;
      
      if (!revenueByUserType[userRole]) {
        revenueByUserType[userRole] = {
          count: 0,
          revenue: 0
        };
      }
      
      revenueByUserType[userRole].count += 1;
      revenueByUserType[userRole].revenue += price;
    });

    const revenueByUserTypeArray = Object.keys(revenueByUserType).map(key => ({
      _id: key,
      count: revenueByUserType[key].count,
      revenue: revenueByUserType[key].revenue
    }));

    const totalRevenue = revenueByMealTypeArray.reduce((sum, item) => sum + item.revenue, 0);

    console.log('📊 Financial report:', {
      totalRevenue,
      mealTypeCount: revenueByMealTypeArray.length,
      userTypeCount: revenueByUserTypeArray.length
    });

    res.json({
      revenueByMealType: revenueByMealTypeArray,
      revenueByUserType: revenueByUserTypeArray,
      totalRevenue,
      isPricingConfigured: true,
      dateRange: { start, end }
    });
  } catch (err) {
    console.error('❌ Error in financial report:', err);
    res.status(500).json({ msg: 'Server error', error: err.message });
  }
});

// Order Status Report
router.get('/order-status', [auth, staffAuth], async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    const start = new Date(startDate);
    start.setHours(0, 0, 0, 0);
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);

    console.log('📅 Fetching order status report:', { start, end });

    const statusBreakdown = await Order.aggregate([
      {
        $match: {
          $or: [
            { date: { $gte: start, $lte: end } },
            { orderDate: { $gte: start, $lte: end } }
          ]
        }
      },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      },
      { $sort: { count: -1 } }
    ]);

    const totalOrders = statusBreakdown.reduce((sum, item) => sum + item.count, 0);

    // Daily breakdown by meal type (including tea)
    const dailyMealTypeBreakdown = await Order.aggregate([
      {
        $match: {
          $or: [
            { date: { $gte: start, $lte: end } },
            { orderDate: { $gte: start, $lte: end } }
          ]
        }
      },
      {
        $addFields: {
          effectiveDate: { $ifNull: ['$date', '$orderDate'] }
        }
      },
      {
        $group: {
          _id: {
            date: { $dateToString: { format: '%Y-%m-%d', date: '$effectiveDate' } },
            mealType: '$mealType'
          },
          // Use quantity to reflect actual portions ordered
          count: { $sum: '$quantity' }
        }
      },
      { $sort: { '_id.date': 1, '_id.mealType': 1 } }
    ]);

    console.log('📊 Order status report:', {
      totalOrders,
      statusCount: statusBreakdown.length,
      dailyMealTypeBreakdownCount: dailyMealTypeBreakdown.length
    });

    res.json({
      statusBreakdown,
      totalOrders,
      dailyMealTypeBreakdown,
      dateRange: { start, end }
    });
  } catch (err) {
    console.error('❌ Error in order-status report:', err);
    res.status(500).json({ msg: 'Server error', error: err.message });
  }
});

module.exports = router;
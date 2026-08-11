const express = require('express');
const { body, validationResult } = require('express-validator');
const Order = require('../models/Order');
const User = require('../models/User');
const Menu = require('../models/Menu');
const authMiddleware = require('../../middleware/auth.middleware');

const router = express.Router();

// Middleware to check user role (Student only)
const checkStudent = async (req, res, next) => {
  const user = await User.findById(req.body.userId);
  if (!user) return res.status(404).json({ msg: 'User not found' });
  if (user.role !== 'Day Scholar' && user.role !== 'Officer Cadet')
    return res.status(403).json({ msg: 'Only students can place orders' });
  next();
};

// Middleware to check if user is Mess Staff or Admin
const checkMessStaffOrAdmin = async (req, res, next) => {
  try {
    if (req.user.role !== 'Mess Staff' && req.user.role !== 'Admin') {
      return res.status(403).json({ 
        msg: 'Access denied. Only Mess Staff and Admin can access orders'
      });
    }
    next();
  } catch (err) {
    console.error('Authorization error:', err);
    res.status(500).json({ msg: 'Authorization error' });
  }
};

// ---------- PLACE ORDER ----------
router.post('/',
  [
    body('userId').notEmpty(),
    body('menuId').notEmpty(),
    body('mealType').isIn(['Breakfast','Lunch','Dinner']),
    body('category').isIn(['Vegetarian','Non-Veg']),
    body('quantity').isInt({ min: 1 }),
    body('orderDate').notEmpty()
  ],
  checkStudent,
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const { userId, menuId, mealType, category, quantity, orderDate, notes, price, includeTea } = req.body;

    // calculate cutoffTime (e.g., 8 PM previous day)
    const cutoffTime = new Date(orderDate);
    cutoffTime.setDate(cutoffTime.getDate() - 1);
    cutoffTime.setHours(20,0,0,0); // 8 PM previous day

    if (new Date() > cutoffTime) return res.status(400).json({ msg: 'Order cutoff time passed' });

    try {
      const order = new Order({
        userId, 
        menuId, 
        mealType, 
        category, 
        quantity,
        orderDate, 
        cutoffTime, 
        notes, 
        price,
        includeTea: includeTea || false,
        status: 'Pending'
      });
      await order.save();
      res.json({ msg: 'Order placed successfully', order });
    } catch (err) {
      console.error(err);
      res.status(500).json({ msg: 'Server error', error: err.message });
    }
  }
);

// ---------- CANCEL ORDER ----------
router.patch('/:id/cancel', async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ msg: 'Order not found' });

    if (new Date() > order.cutoffTime) return res.status(400).json({ msg: 'Cannot cancel after cutoff time' });

    order.status = 'Cancelled';
    await order.save();
    res.json({ msg: 'Order cancelled successfully', order });
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: 'Server error', error: err.message });
  }
});

// ---------- GET STUDENT ORDER HISTORY ----------
router.get('/history/:userId', async (req, res) => {
  try {
    const orders = await Order.find({ userId: req.params.userId })
      .populate('menuId', 'day mealType category description price')
      .sort({ orderDate: -1 });
    res.json(orders);
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: 'Server error', error: err.message });
  }
});

// ---------- GET ALL ORDERS (For Mess Staff & Admin) ----------
router.get('/all', authMiddleware, checkMessStaffOrAdmin, async (req, res) => {
  try {
    const orders = await Order.find()
      .populate('userId', 'roleId firstName lastName')
      .populate('menuId', 'day mealType')
      .sort({ orderDate: -1, createdAt: -1 });

    // Format orders for frontend
    const formattedOrders = orders.map(order => ({
      _id: order._id,
      studentId: order.userId?.roleId || 'N/A',
      studentName: order.userId ? `${order.userId.firstName} ${order.userId.lastName}` : 'Unknown',
      mealType: order.mealType,
      foodType: order.category,
      includeTea: order.includeTea || false,
      date: order.orderDate,
      status: order.status,
      quantity: order.quantity,
      price: order.price,
      notes: order.notes
    }));

    res.json(formattedOrders);
  } catch (err) {
    console.error('Error fetching orders:', err);
    res.status(500).json({ msg: 'Server error' });
  }
});

// ---------- UPDATE ORDER STATUS (For Mess Staff only) ----------
router.put('/:id/status', authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== 'Mess Staff') {
      return res.status(403).json({ 
        msg: 'Access denied. Only Mess Staff can update order status'
      });
    }

    const { status } = req.body;
    
    // Validate status
    if (!['Pending', 'Prepared', 'Served', 'Cancelled'].includes(status)) {
      return res.status(400).json({ msg: 'Invalid status' });
    }

    const order = await Order.findById(req.params.id);
    if (!order) {
      return res.status(404).json({ msg: 'Order not found' });
    }

    // NEW: Check if marking as "Served" - only allow on the order date
    if (status === 'Served') {
      const orderDate = order.orderDate || order.date;
      if (!orderDate) {
        return res.status(400).json({ msg: 'Order date not found' });
      }

      // Get today's date (without time)
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      // Get order date (without time)
      const mealDate = new Date(orderDate);
      mealDate.setHours(0, 0, 0, 0);

      // Compare dates
      if (mealDate.getTime() !== today.getTime()) {
        const orderDateStr = mealDate.toLocaleDateString('en-GB');
        const todayStr = today.toLocaleDateString('en-GB');
        return res.status(400).json({ 
          msg: `Cannot mark as served. This meal is for ${orderDateStr}, but today is ${todayStr}. You can only mark meals as served on the same day they were ordered.` 
        });
      }
    }

    order.status = status;
    await order.save();
    
    res.json({ 
      msg: 'Order status updated successfully',
      order: {
        _id: order._id,
        status: order.status
      }
    });
  } catch (err) {
    console.error('Error updating order status:', err);
    res.status(500).json({ msg: 'Server error' });
  }
});

module.exports = router;
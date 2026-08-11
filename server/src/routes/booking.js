const express = require('express');
const router = express.Router();
const Order = require('../models/Order');
const User = require('../models/User');
const Menu = require('../models/Menu');
const auth = require('../../middleware/auth.middleware');

// Get available dates for booking (next 7 days)
router.get('/available-dates', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    const dates = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // For Day Scholars, start from tomorrow (24-hour advance booking required)
    // For Officer Cadets, start from today (they can see today's meals)
    const startDay = user?.role === 'Day Scholar' ? 1 : 0;
    
    for (let i = startDay; i <= 7; i++) {
      const date = new Date(today);
      date.setDate(date.getDate() + i);
      date.setHours(0, 0, 0, 0);
      
      // Only include dates that are today or in the future
      if (date >= today) {
        // Format date as YYYY-MM-DD using local time to avoid timezone issues
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const dateString = `${year}-${month}-${day}`;
        
        dates.push({
          date: dateString,
          dayName: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][date.getDay()]
        });
      }
    }
    
    res.json(dates);
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: 'Server error' });
  }
});

// Create booking (for meals and tea)
router.post('/create', auth, async (req, res) => {
  try {
    const { date, mealType, category, specialRequests } = req.body;
    
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ msg: 'User not found' });
    }

    const teaTypes = ['Morning Tea', 'Mid-Morning Tea', 'Evening Tea', 'Night Tea'];
    const isTea = teaTypes.includes(mealType);

    // For regular meals, only Day Scholars can book (Cadets get auto-enrolled)
    if (!isTea && user.role === 'Officer Cadet') {
      return res.status(403).json({ msg: 'Officer Cadets have automatic meal enrollment. You cannot manually book meals.' });
    }

    // Check if already booked (and not cancelled)
    const existingOrder = await Order.findOne({
      userId: user._id,
      orderDate: new Date(date),
      mealType: mealType,
      status: { $ne: 'Cancelled' }
    });

    if (existingOrder) {
      return res.status(400).json({ msg: `You already have a booking for ${mealType} on this date` });
    }

    // Set price based on meal type and user role
    let price = 0;
    if (user.role === 'Day Scholar') {
      if (isTea) {
        price = 100;
      } else if (mealType === 'Breakfast') {
        price = 250;
      } else if (mealType === 'Lunch') {
        price = 400;
      } else if (mealType === 'Dinner') {
        price = 250;
      }
    } else if (user.role === 'Officer Cadet' && isTea) {
      price = 100;
    }

    // Set cutoff time based on meal/tea type
    const orderDate = new Date(date);
    const cutoffTime = new Date(orderDate);
    
    if (mealType === 'Breakfast') cutoffTime.setHours(1, 0, 0, 0);
    else if (mealType === 'Lunch') cutoffTime.setHours(6, 0, 0, 0);
    else if (mealType === 'Dinner') cutoffTime.setHours(13, 0, 0, 0);
    else if (mealType === 'Morning Tea') cutoffTime.setHours(4, 0, 0, 0);
    else if (mealType === 'Mid-Morning Tea') cutoffTime.setHours(9, 0, 0, 0);
    else if (mealType === 'Evening Tea') cutoffTime.setHours(16, 0, 0, 0);
    else if (mealType === 'Night Tea') cutoffTime.setHours(20, 0, 0, 0);

    // For Day Scholars: Check if booking is at least 24 hours before the meal time
    // For Officer Cadets: Check if tea booking is at least 24 hours before the tea time
    if (user.role === 'Day Scholar' || (user.role === 'Officer Cadet' && isTea)) {
      const now = new Date();
      const bookingDeadline = new Date(cutoffTime);
      bookingDeadline.setHours(bookingDeadline.getHours() - 24); // 24 hours before cutoff time
      
      if (now >= bookingDeadline) {
        return res.status(400).json({ 
          msg: `Cannot book ${mealType}. Bookings must be made at least 24 hours in advance. The deadline for this meal has passed.` 
        });
      }
    }

    const order = new Order({
      userId: user._id,
      menuId: isTea ? null : undefined,
      mealType,
      category: isTea ? 'Beverage' : (category || 'Vegetarian'),
      quantity: 1,
      orderDate: orderDate,
      cutoffTime: cutoffTime,
      price: price,
      status: 'Confirmed',
      isAutoBooked: false,
      canCancel: true,
      cancelledAfterDeadline: false,
      specialRequests: specialRequests || ''
    });

    await order.save();

    res.json({ 
      msg: `${mealType} booked successfully`,
      order 
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: 'Server error' });
  }
});

// Auto-enroll Cadets for all meals (Admin triggers daily)
router.post('/auto-enroll-cadets', auth, async (req, res) => {
  try {
    const { date } = req.body;
    
    const admin = await User.findById(req.user.id);
    if (admin.role !== 'Admin') {
      return res.status(403).json({ msg: 'Only Admin can auto-enroll cadets' });
    }

    const cadets = await User.find({ role: 'Officer Cadet', status: 'Active' });
    const orderDate = new Date(date);
    orderDate.setHours(0, 0, 0, 0);
    
    let enrolled = 0;
    const mealTypes = ['Breakfast', 'Lunch', 'Dinner'];

    for (const cadet of cadets) {
      for (const mealType of mealTypes) {
        const existing = await Order.findOne({
          userId: cadet._id,
          orderDate: orderDate,
          mealType: mealType
        });

        if (!existing) {
          const cutoffTime = new Date(orderDate);
          if (mealType === 'Breakfast') cutoffTime.setHours(1, 0, 0, 0);
          else if (mealType === 'Lunch') cutoffTime.setHours(6, 0, 0, 0);
          else if (mealType === 'Dinner') cutoffTime.setHours(13, 0, 0, 0);

          await Order.create({
            userId: cadet._id,
            mealType,
            category: 'Vegetarian',
            quantity: 1,
            orderDate: orderDate,
            cutoffTime: cutoffTime,
            price: 0,
            status: 'Confirmed',
            isAutoBooked: true,
            canCancel: false,
            cancelledAfterDeadline: false
          });
          
          enrolled++;
        }
      }
    }

    res.json({ 
      msg: `Successfully enrolled ${enrolled} meals for ${cadets.length} cadets`,
      date: orderDate
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: 'Server error' });
  }
});

// Get Officer Cadet Dashboard Data
router.get('/officer-dashboard', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    
    if (!user || user.role !== 'Officer Cadet') {
      return res.status(403).json({ msg: 'Access denied. Only for Officer Cadets.' });
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayEnd = new Date(today);
    todayEnd.setHours(23, 59, 59, 999);

    const currentTime = new Date();
    const currentHour = currentTime.getHours();

    const todayMeals = {
      breakfast: {
        served: currentHour >= 9,
        time: '7:00 - 9:00 AM'
      },
      lunch: {
        served: currentHour >= 14,
        time: '12:00 - 2:00 PM'
      },
      dinner: {
        served: currentHour >= 21,
        time: '7:00 - 9:00 PM'
      }
    };

    const upcomingTeaBookings = await Order.find({
      userId: req.user.id,
      orderDate: { $gte: today },
      mealType: { 
        $in: ['Morning Tea', 'Mid-Morning Tea', 'Evening Tea', 'Night Tea'] 
      },
      status: { $in: ['Confirmed', 'Booked', 'Pending'] }
    })
    .sort({ orderDate: 1 })
    .limit(8);

    res.json({
      todayMeals,
      upcomingTeaBookings
    });

  } catch (err) {
    console.error('Error fetching officer dashboard data:', err);
    res.status(500).json({ msg: 'Server error', error: err.message });
  }
});

// Get my bookings
router.get('/my-bookings', auth, async (req, res) => {
  try {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    sevenDaysAgo.setHours(0, 0, 0, 0);

    const orders = await Order.find({
      userId: req.user.id,
      orderDate: { $gte: sevenDaysAgo }
    })
    .sort({ orderDate: 1, mealType: 1 })
    .populate('userId', 'firstName lastName roleId');

    const formattedOrders = orders.map(order => ({
      _id: order._id,
      mealType: order.mealType,
      date: order.orderDate,
      orderDate: order.orderDate,
      status: order.status,
      category: order.category,
      quantity: order.quantity,
      price: order.price || 0,
      specialRequests: order.specialRequests,
      canCancel: order.canCancel,
      isAutoBooked: order.isAutoBooked,
      cutoffTime: order.cutoffTime,
      cancelledAt: order.cancelledAt,
      items: order.items || [],
      user: order.userId
    }));

    res.json(formattedOrders);
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: 'Server error' });
  }
});

// Get booking history (including cancelled) - UPDATED FOR OFFICER CADETS
router.get('/history', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ msg: 'User not found' });
    }

    // Get all bookings from database
    let orders = await Order.find({
      userId: req.user.id
    })
    .sort({ orderDate: -1 })
    .populate('userId', 'firstName lastName roleId role');

    // If Officer Cadet, generate auto-enrolled meals for last 30 days
    if (user.role === 'Officer Cadet') {
      const today = new Date();
      today.setHours(23, 59, 59, 999);
      
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(today.getDate() - 30);
      thirtyDaysAgo.setHours(0, 0, 0, 0);

      // Generate daily meals for the last 30 days
      const dailyMeals = [];
      const mealTypes = ['Breakfast', 'Lunch', 'Dinner'];
      
      for (let d = new Date(thirtyDaysAgo); d <= today; d.setDate(d.getDate() + 1)) {
        const currentDate = new Date(d);
        currentDate.setHours(0, 0, 0, 0);
        
        for (const mealType of mealTypes) {
          // Check if this meal already exists in database (manually created)
          const existsInDB = orders.find(order => 
            order.mealType === mealType &&
            new Date(order.orderDate).toDateString() === currentDate.toDateString()
          );
          
          // Only add if not in database
          if (!existsInDB) {
            const now = new Date();
            const isPast = currentDate < new Date(now.getFullYear(), now.getMonth(), now.getDate());
            
            dailyMeals.push({
              _id: `auto-${mealType.toLowerCase().replace(' ', '-')}-${currentDate.toISOString().split('T')[0]}`,
              userId: user,
              mealType: mealType,
              orderDate: new Date(currentDate),
              status: isPast ? 'Served' : 'Confirmed',
              price: 0,
              category: 'Officer Quota',
              quantity: 1,
              isAutoBooked: true,
              canCancel: false
            });
          }
        }
      }

      // Combine database orders with generated meals
      orders = [...orders, ...dailyMeals];
      
      // Sort by date descending
      orders.sort((a, b) => {
        const dateA = new Date(a.orderDate);
        const dateB = new Date(b.orderDate);
        return dateB - dateA;
      });
    }

    // Filter based on user role
    if (user.role === 'Day Scholar') {
      // Day Scholars: Exclude orders cancelled before deadline
      orders = orders.filter(order => {
        if (order.status === 'Cancelled' && !order.cancelledAfterDeadline) {
          return false;
        }
        return true;
      });
    }

    res.json(orders);
  } catch (err) {
    console.error('Error fetching history:', err);
    res.status(500).json({ msg: 'Server error' });
  }
});

// PRIMARY CANCEL ENDPOINT (DELETE method)
router.delete('/cancel/:orderId', auth, async (req, res) => {
  try {
    const order = await Order.findById(req.params.orderId);
    
    if (!order) {
      return res.status(404).json({ msg: 'Order not found' });
    }

    if (order.userId.toString() !== req.user.id) {
      return res.status(403).json({ msg: 'Unauthorized' });
    }

    if (order.status === 'Cancelled') {
      return res.status(400).json({ msg: 'Booking is already cancelled' });
    }

    if (!order.canCancel) {
      return res.status(403).json({ msg: 'This is a compulsory meal and cannot be cancelled.' });
    }

    const user = await User.findById(req.user.id);
    const now = new Date();
    
    // Check if this is a tea booking
    const teaTypes = ['Morning Tea', 'Mid-Morning Tea', 'Evening Tea', 'Night Tea'];
    const isTea = teaTypes.includes(order.mealType);
    
    // For Day Scholars: Check if cancellation is at least 24 hours before the meal time
    // For Officer Cadets: Check if cancellation is at least 24 hours before the tea time (for tea bookings only)
    if (user && (user.role === 'Day Scholar' || (user.role === 'Officer Cadet' && isTea))) {
      const cancellationDeadline = new Date(order.cutoffTime);
      cancellationDeadline.setHours(cancellationDeadline.getHours() - 24); // 24 hours before cutoff time
      
      if (now >= cancellationDeadline) {
        order.cancelledAfterDeadline = true;
        await order.save();
        return res.status(400).json({ 
          msg: 'Cannot cancel - bookings must be cancelled at least 24 hours in advance. The deadline has passed. You will be charged for this booking.' 
        });
      }
    } else if (now > order.cutoffTime) {
      // For other roles/cases, use the original cutoff time check
      order.cancelledAfterDeadline = true;
      await order.save();
      return res.status(400).json({ 
        msg: 'Cannot cancel - deadline has passed. You will be charged for this booking.' 
      });
    }

    order.status = 'Cancelled';
    order.cancelledAt = new Date();
    order.cancelledAfterDeadline = false;
    await order.save();

    res.json({ 
      msg: 'Booking cancelled successfully',
      order 
    });
  } catch (err) {
    console.error('Error cancelling booking:', err);
    res.status(500).json({ msg: 'Server error' });
  }
});

// Alternative PUT endpoint for backward compatibility
router.put('/:id/cancel', auth, async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    
    if (!order) {
      return res.status(404).json({ msg: 'Booking not found' });
    }

    if (order.userId.toString() !== req.user.id) {
      return res.status(403).json({ msg: 'Not authorized to cancel this booking' });
    }

    if (order.status === 'Cancelled') {
      return res.status(400).json({ msg: 'Booking is already cancelled' });
    }

    if (!order.canCancel) {
      return res.status(403).json({ msg: 'This is a compulsory meal and cannot be cancelled.' });
    }

    const user = await User.findById(req.user.id);
    const now = new Date();
    
    // Check if this is a tea booking
    const teaTypes = ['Morning Tea', 'Mid-Morning Tea', 'Evening Tea', 'Night Tea'];
    const isTea = teaTypes.includes(order.mealType);
    
    // For Day Scholars: Check if cancellation is at least 24 hours before the meal time
    // For Officer Cadets: Check if cancellation is at least 24 hours before the tea time (for tea bookings only)
    if (user && (user.role === 'Day Scholar' || (user.role === 'Officer Cadet' && isTea))) {
      const cancellationDeadline = new Date(order.cutoffTime);
      cancellationDeadline.setHours(cancellationDeadline.getHours() - 24); // 24 hours before cutoff time
      
      if (now >= cancellationDeadline) {
        order.cancelledAfterDeadline = true;
        await order.save();
        return res.status(400).json({ 
          msg: 'Cannot cancel - bookings must be cancelled at least 24 hours in advance. The deadline has passed. You will be charged for this booking.' 
        });
      }
    } else if (now > order.cutoffTime) {
      // For other roles/cases, use the original cutoff time check
      order.cancelledAfterDeadline = true;
      await order.save();
      return res.status(400).json({ 
        msg: 'Cannot cancel - deadline has passed. You will be charged for this booking.' 
      });
    }

    order.status = 'Cancelled';
    order.cancelledAt = new Date();
    order.cancelledAfterDeadline = false;
    await order.save();

    res.json({ msg: 'Booking cancelled successfully', order });
  } catch (err) {
    console.error('Error cancelling booking:', err);
    res.status(500).json({ msg: 'Server error' });
  }
});

// Get all bookings (Admin/Mess Staff)
router.get('/all', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    
    if (user.role !== 'Admin' && user.role !== 'Mess Staff') {
      return res.status(403).json({ msg: 'Access denied' });
    }

    const orders = await Order.find()
      .sort({ orderDate: -1 })
      .populate('userId', 'firstName lastName roleId email role');

    res.json(orders);
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: 'Server error' });
  }
});

// Get all bookings with user info (for Order Management page)
router.get('/all-bookings', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    
    if (user.role !== 'Admin' && user.role !== 'Mess Staff') {
      return res.status(403).json({ msg: 'Access denied' });
    }

    const bookings = await Order.find()
      .populate('userId', 'firstName lastName roleId email role')
      .sort({ orderDate: -1 });
    
    const formattedBookings = bookings.map(booking => ({
      _id: booking._id,
      user: booking.userId,
      userId: booking.userId?._id,
      mealType: booking.mealType,
      category: booking.category,
      date: booking.orderDate,
      orderDate: booking.orderDate,
      status: booking.status,
      price: booking.price || 0,
      quantity: booking.quantity || 1,
      canCancel: booking.canCancel,
      isAutoBooked: booking.isAutoBooked
    }));
    
    res.json(formattedBookings);
  } catch (err) {
    console.error('Error fetching all bookings:', err);
    res.status(500).json({ msg: 'Server error' });
  }
});

// Update booking status (for Mess Staff to mark Prepared/Served)
router.put('/update-status/:id', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    
    if (user.role !== 'Admin' && user.role !== 'Mess Staff') {
      return res.status(403).json({ msg: 'Access denied. Only Mess Staff and Admin can update status' });
    }

    const { status } = req.body;
    const bookingId = req.params.id;

    if (!['Confirmed', 'Pending', 'Prepared', 'Served', 'Completed', 'Cancelled'].includes(status)) {
      return res.status(400).json({ msg: 'Invalid status value' });
    }
    
    const booking = await Order.findById(bookingId);
    
    if (!booking) {
      return res.status(404).json({ msg: 'Booking not found' });
    }

    // ✅ NEW: Check if marking as "Served" - only allow on the order date (for Mess Staff only)
    if (status === 'Served' && user.role === 'Mess Staff') {
      const orderDate = booking.orderDate || booking.date;
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
    
    booking.status = status;
    await booking.save();
    
    const updatedBooking = await Order.findById(bookingId)
      .populate('userId', 'firstName lastName roleId');
    
    res.json({ 
      msg: `Status updated to ${status} successfully`, 
      booking: updatedBooking 
    });
  } catch (err) {
    console.error('Error updating booking status:', err);
    res.status(500).json({ msg: 'Server error' });
  }
});

// Update booking status (backward compatibility)
router.put('/:id/status', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    
    if (user.role !== 'Admin' && user.role !== 'Mess Staff') {
      return res.status(403).json({ msg: 'Access denied. Only Admin and Mess Staff can update status' });
    }

    const { status } = req.body;
    
    if (!['Booked', 'Confirmed', 'Prepared', 'Served', 'Cancelled'].includes(status)) {
      return res.status(400).json({ msg: 'Invalid status' });
    }

    const order = await Order.findById(req.params.id);
    if (!order) {
      return res.status(404).json({ msg: 'Order not found' });
    }

    // ✅ NEW: Check if marking as "Served" - only allow on the order date (for Mess Staff only)
    if (status === 'Served' && user.role === 'Mess Staff') {
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
      msg: 'Booking status updated successfully',
      order
    });
  } catch (err) {
    console.error('Error updating booking status:', err);
    res.status(500).json({ msg: 'Server error' });
  }
});

module.exports = router;
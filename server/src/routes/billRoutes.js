const express = require('express');
const router = express.Router();
const Order = require('../models/Order');
const User = require('../models/User');
const Settings = require('../models/Settings');
const auth = require('../../middleware/auth.middleware');
const adminAuth = require('../../middleware/adminAuth');

// Define the same prices as frontend - SOURCE OF TRUTH
const MEAL_PRICES = {
  'Breakfast': 250,
  'Lunch': 400,
  'Dinner': 250,
  'Morning Tea': 100,
  'Mid-Morning Tea': 100,
  'Evening Tea': 100,
  'Night Tea': 100
};

// Default monthly allowance for Officer Cadets (fallback)
const DEFAULT_MONTHLY_ALLOWANCE = 36000;

// Helper: get current monthly allowance from settings (with fallback)
async function getMonthlyAllowance() {
  try {
    const setting = await Settings.findOne({ key: 'officerCadetMonthlyAllowance' });
    if (setting && typeof setting.value === 'number') {
      return setting.value;
    }
    return DEFAULT_MONTHLY_ALLOWANCE;
  } catch (err) {
    console.error('❌ Error fetching monthly allowance setting:', err);
    return DEFAULT_MONTHLY_ALLOWANCE;
  }
}

// Helper function to check if a meal should be charged
function isMealCharged(mealDate, mealType) {
  const currentDate = new Date();
  const mealEndTime = new Date(mealDate);
  
  // Set the charging time based on meal type
  switch (mealType) {
    case 'Breakfast':
      mealEndTime.setHours(9, 0, 0, 0); // Charged after 9:00 AM
      break;
    case 'Lunch':
      mealEndTime.setHours(14, 0, 0, 0); // Charged after 2:00 PM
      break;
    case 'Dinner':
      mealEndTime.setHours(23, 59, 59, 999); // Charged at end of day
      break;
    case 'Morning Tea':
      mealEndTime.setHours(11, 0, 0, 0); // Charged after 11:00 AM
      break;
    case 'Mid-Morning Tea':
      mealEndTime.setHours(12, 0, 0, 0); // Charged after 12:00 PM
      break;
    case 'Evening Tea':
      mealEndTime.setHours(17, 0, 0, 0); // Charged after 5:00 PM
      break;
    case 'Night Tea':
      mealEndTime.setHours(23, 0, 0, 0); // Charged after 11:00 PM
      break;
    default:
      return false;
  }
  
  // Return true if current time has passed the charging time
  return currentDate >= mealEndTime;
}

// Get monthly bill for Day Scholar or Officer Cadet
router.get('/monthly/:month', auth, async (req, res) => {
  try {
    const { month } = req.params; // Format: YYYY-MM
    const [year, monthNum] = month.split('-');
    
    const user = await User.findById(req.user.id);
    
    if (!user) {
      return res.status(404).json({ msg: 'User not found' });
    }

    if (user.role !== 'Day Scholar' && user.role !== 'Officer Cadet') {
      return res.status(403).json({ msg: 'Access denied' });
    }

    // Get start and end of month
    const startDate = new Date(parseInt(year), parseInt(monthNum) - 1, 1);
    const endDate = new Date(parseInt(year), parseInt(monthNum), 0, 23, 59, 59, 999);
    const currentDate = new Date();

    console.log('📅 Fetching orders for:', { 
      userId: req.user.id, 
      startDate, 
      endDate,
      currentDate,
      role: user.role 
    });

    // Fetch orders - support both orderDate and date fields
    const orders = await Order.find({
      userId: req.user.id,
      $or: [
        { orderDate: { $gte: startDate, $lte: endDate } },
        { date: { $gte: startDate, $lte: endDate } }
      ],
      status: { $in: ['Booked', 'Confirmed', 'Served', 'Completed'] }
    }).sort({ orderDate: 1, date: 1 });

    console.log('📦 Found orders:', orders.length);

    if (user.role === 'Day Scholar') {
      // ========== DAY SCHOLAR BILL ==========
      const itemSummary = {};
      
      orders.forEach(order => {
        const mealType = order.mealType;
        const price = MEAL_PRICES[mealType] || 0;
        
        console.log(`💰 Day Scholar - ${mealType}: Rs. ${price}`);
        
        if (!itemSummary[mealType]) {
          itemSummary[mealType] = {
            quantity: 0,
            cost: 0
          };
        }
        
        itemSummary[mealType].quantity += 1;
        itemSummary[mealType].cost += price;
      });

      const items = Object.keys(itemSummary).map(key => ({
        item: key,
        quantity: itemSummary[key].quantity,
        cost: itemSummary[key].cost
      }));

      const totalAmount = items.reduce((sum, item) => sum + item.cost, 0);

      console.log('📊 Day Scholar Bill:', { 
        itemCount: items.length, 
        totalAmount 
      });

      res.json({
        month,
        items,
        totalAmount,
        role: 'Day Scholar'
      });
      
    } else if (user.role === 'Officer Cadet') {
      // ========== OFFICER CADET ALLOWANCE SUMMARY ==========
      const mealHistory = [];
      let totalSpent = 0;

      // ⭐ NEW: AUTO-ENROLL DAILY MEALS (Breakfast, Lunch, Dinner)
      const daysInMonth = new Date(parseInt(year), parseInt(monthNum), 0).getDate();
      
      for (let day = 1; day <= daysInMonth; day++) {
        const mealDate = new Date(parseInt(year), parseInt(monthNum) - 1, day);
        
        // Only include dates up to current date if it's the current month
        if (parseInt(year) === currentDate.getFullYear() && 
            parseInt(monthNum) - 1 === currentDate.getMonth() && 
            day > currentDate.getDate()) {
          break;
        }

        // Add Breakfast
        const isBreakfastCharged = isMealCharged(mealDate, 'Breakfast');
        if (isBreakfastCharged) {
          totalSpent += MEAL_PRICES['Breakfast'];
        }
        mealHistory.push({
          date: mealDate,
          mealType: 'Breakfast',
          deduction: MEAL_PRICES['Breakfast'],
          charged: isBreakfastCharged
        });
        console.log(`🍳 Auto-enrolled Breakfast (${mealDate.toDateString()}): Rs. ${MEAL_PRICES['Breakfast']} - ${isBreakfastCharged ? 'CHARGED' : 'PENDING'}`);

        // Add Lunch
        const isLunchCharged = isMealCharged(mealDate, 'Lunch');
        if (isLunchCharged) {
          totalSpent += MEAL_PRICES['Lunch'];
        }
        mealHistory.push({
          date: mealDate,
          mealType: 'Lunch',
          deduction: MEAL_PRICES['Lunch'],
          charged: isLunchCharged
        });
        console.log(`🍛 Auto-enrolled Lunch (${mealDate.toDateString()}): Rs. ${MEAL_PRICES['Lunch']} - ${isLunchCharged ? 'CHARGED' : 'PENDING'}`);

        // Add Dinner
        const isDinnerCharged = isMealCharged(mealDate, 'Dinner');
        if (isDinnerCharged) {
          totalSpent += MEAL_PRICES['Dinner'];
        }
        mealHistory.push({
          date: mealDate,
          mealType: 'Dinner',
          deduction: MEAL_PRICES['Dinner'],
          charged: isDinnerCharged
        });
        console.log(`🍽️ Auto-enrolled Dinner (${mealDate.toDateString()}): Rs. ${MEAL_PRICES['Dinner']} - ${isDinnerCharged ? 'CHARGED' : 'PENDING'}`);
      }

      // Add tea bookings from orders
      orders.forEach(order => {
        const mealType = order.mealType;
        const orderDate = new Date(order.orderDate || order.date);
        
        // Only add if it's a tea type (not a main meal)
        if (mealType.includes('Tea')) {
          const deduction = MEAL_PRICES[mealType] || 0;
          const charged = isMealCharged(orderDate, mealType);
          
          if (charged && deduction > 0) {
            totalSpent += deduction;
            console.log(`☕ ${mealType} (${orderDate.toDateString()}): Rs. ${deduction} - CHARGED`);
          } else if (deduction > 0) {
            console.log(`⏳ ${mealType} (${orderDate.toDateString()}): Rs. ${deduction} - PENDING`);
          }

          mealHistory.push({
            date: order.orderDate || order.date,
            mealType: mealType,
            deduction: deduction,
            charged: charged
          });
        }
      });

      // Sort meal history by date
      mealHistory.sort((a, b) => new Date(a.date) - new Date(b.date));

      // Get current allowance from settings
      const monthlyAllowance = await getMonthlyAllowance();

      // Calculate remaining balance
      const remainingBalance = monthlyAllowance - totalSpent;

      console.log('📊 Officer Cadet Allowance Summary:', { 
        mealHistoryCount: mealHistory.length,
      monthlyAllowance,
        totalSpent,
        remainingBalance
      });

      res.json({
        month,
        mealHistory,
        monthlyAllowance,
        totalSpent,
        remainingBalance,
        role: 'Officer Cadet'
      });
    }
  } catch (err) {
    console.error('❌ Error fetching monthly bill:', err);
    res.status(500).json({ 
      msg: 'Server error', 
      error: err.message 
    });
  }
});

// ========== ADMIN: GET CURRENT ALLOWANCE SETTING ==========
router.get('/settings/allowance', auth, adminAuth, async (req, res) => {
  try {
    const setting = await Settings.findOne({ key: 'officerCadetMonthlyAllowance' });
    const value = setting && typeof setting.value === 'number'
      ? setting.value
      : DEFAULT_MONTHLY_ALLOWANCE;

    res.json({
      key: 'officerCadetMonthlyAllowance',
      value,
      defaultValue: DEFAULT_MONTHLY_ALLOWANCE
    });
  } catch (err) {
    console.error('❌ Error fetching allowance setting:', err);
    res.status(500).json({ msg: 'Server error', error: err.message });
  }
});

// ========== ADMIN: UPDATE ALLOWANCE SETTING ==========
router.put('/settings/allowance', auth, adminAuth, async (req, res) => {
  try {
    const { value } = req.body;

    if (value === undefined || value === null) {
      return res.status(400).json({ msg: 'Allowance value is required' });
    }

    const numericValue = Number(value);

    if (Number.isNaN(numericValue) || numericValue <= 0) {
      return res.status(400).json({ msg: 'Allowance must be a positive number' });
    }

    if (numericValue > 1000000) {
      return res.status(400).json({ msg: 'Allowance value is too large' });
    }

    const setting = await Settings.findOneAndUpdate(
      { key: 'officerCadetMonthlyAllowance' },
      { 
        $set: { 
          value: numericValue,
          description: 'Monthly allowance for Officer Cadets (set by Admin)'
        } 
      },
      { upsert: true, new: true }
    );

    console.log('✅ Updated officer cadet monthly allowance:', numericValue);

    res.json({
      msg: 'Monthly allowance updated successfully',
      key: setting.key,
      value: setting.value
    });
  } catch (err) {
    console.error('❌ Error updating allowance setting:', err);
    res.status(500).json({ msg: 'Server error', error: err.message });
  }
});

module.exports = router;
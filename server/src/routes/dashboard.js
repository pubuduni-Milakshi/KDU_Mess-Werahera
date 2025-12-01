const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const Booking = require('../models/Booking');

// @route   GET /api/dashboard/my-bookings
// @desc    Get current user's upcoming bookings
// @access  Private (Students only)
router.get('/my-bookings', auth, async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const bookings = await Booking.find({
      userId: req.user.id,
      date: { $gte: today },
      status: { $in: ['Confirmed', 'Pending'] }
    })
    .sort({ date: 1 })
    .limit(10);

    res.json(bookings);
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: 'Server error' });
  }
});

module.exports = router;
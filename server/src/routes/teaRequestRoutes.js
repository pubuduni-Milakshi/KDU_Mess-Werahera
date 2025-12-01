const express = require('express');
const router = express.Router();
const authMiddleware = require('../../middleware/auth.middleware');

// Tea Request Model
const mongoose = require('mongoose');

const teaRequestSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  teaType: {
    type: String,
    enum: ['Morning Tea', 'Evening Tea'],
    required: true
  },
  date: {
    type: Date,
    required: true
  },
  timeSlot: {
    type: String,
    required: true
  },
  quantity: {
    type: Number,
    required: true,
    min: 1,
    max: 5
  },
  specialRequests: {
    type: String,
    default: ''
  },
  status: {
    type: String,
    enum: ['Pending', 'Confirmed', 'Cancelled'],
    default: 'Pending'
  }
}, {
  timestamps: true
});

const TeaRequest = mongoose.model('TeaRequest', teaRequestSchema);

// @route   POST /api/tea-requests
// @desc    Create a new tea request
// @access  Private
router.post('/', authMiddleware, async (req, res) => {
  try {
    const { teaType, date, timeSlot, quantity, specialRequests } = req.body;

    // Validate that the date is in the future
    const requestDate = new Date(date);
    const now = new Date();
    
    if (requestDate < now) {
      return res.status(400).json({ msg: 'Cannot request tea for past dates' });
    }

    const teaRequest = new TeaRequest({
      userId: req.user.id,
      teaType,
      date: requestDate,
      timeSlot,
      quantity,
      specialRequests
    });

    await teaRequest.save();
    res.json(teaRequest);
  } catch (err) {
    console.error('Error creating tea request:', err);
    res.status(500).json({ msg: 'Server error' });
  }
});

// @route   GET /api/tea-requests/my-requests
// @desc    Get all tea requests for logged-in user
// @access  Private
router.get('/my-requests', authMiddleware, async (req, res) => {
  try {
    const teaRequests = await TeaRequest.find({ userId: req.user.id })
      .sort({ date: -1 })
      .populate('userId', 'firstName lastName roleId');

    res.json(teaRequests);
  } catch (err) {
    console.error('Error fetching tea requests:', err);
    res.status(500).json({ msg: 'Server error' });
  }
});

// @route   PUT /api/tea-requests/:id/cancel
// @desc    Cancel a tea request
// @access  Private
router.put('/:id/cancel', authMiddleware, async (req, res) => {
  try {
    const teaRequest = await TeaRequest.findById(req.params.id);

    if (!teaRequest) {
      return res.status(404).json({ msg: 'Tea request not found' });
    }

    // Check if user owns this request
    if (teaRequest.userId.toString() !== req.user.id) {
      return res.status(403).json({ msg: 'Not authorized to cancel this request' });
    }

    // Check if already cancelled
    if (teaRequest.status === 'Cancelled') {
      return res.status(400).json({ msg: 'Request is already cancelled' });
    }

    // Check cancellation deadline (6 hours before)
    const requestDateTime = new Date(teaRequest.date);
    const [hours, minutes] = teaRequest.timeSlot.split(':');
    const isPM = teaRequest.timeSlot.includes('PM');
    let hour = parseInt(hours);
    if (isPM && hour !== 12) hour += 12;
    if (!isPM && hour === 12) hour = 0;
    
    requestDateTime.setHours(hour, parseInt(minutes), 0, 0);
    
    const now = new Date();
    const hoursUntilRequest = (requestDateTime - now) / (1000 * 60 * 60);

    if (hoursUntilRequest < 6) {
      return res.status(400).json({ 
        msg: 'Cannot cancel tea request less than 6 hours before scheduled time' 
      });
    }

    teaRequest.status = 'Cancelled';
    await teaRequest.save();

    res.json({ msg: 'Tea request cancelled successfully', teaRequest });
  } catch (err) {
    console.error('Error cancelling tea request:', err);
    res.status(500).json({ msg: 'Server error' });
  }
});

// @route   GET /api/tea-requests/all (Admin only)
// @desc    Get all tea requests
// @access  Private (Admin)
router.get('/all', authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== 'Admin') {
      return res.status(403).json({ msg: 'Access denied' });
    }

    const teaRequests = await TeaRequest.find()
      .sort({ date: -1 })
      .populate('userId', 'firstName lastName roleId email');

    res.json(teaRequests);
  } catch (err) {
    console.error('Error fetching all tea requests:', err);
    res.status(500).json({ msg: 'Server error' });
  }
});

module.exports = router;
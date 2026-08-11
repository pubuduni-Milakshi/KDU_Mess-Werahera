const express = require('express');
const router = express.Router();
const Feedback = require('../models/Feedback');
const User = require('../models/User');
const auth = require('../../middleware/auth.middleware');

// Submit feedback (Day Scholars & Officer Cadets only)
router.post('/', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    
    if (user.role !== 'Day Scholar' && user.role !== 'Officer Cadet') {
      return res.status(403).json({ msg: 'Only Day Scholars and Officer Cadets can submit feedback' });
    }

    const { item, rating, comments } = req.body;

    if (!item || !rating) {
      return res.status(400).json({ msg: 'Item and rating are required' });
    }

    if (rating < 1 || rating > 5) {
      return res.status(400).json({ msg: 'Rating must be between 1 and 5' });
    }

    const feedback = new Feedback({
      userId: req.user.id,
      item,
      rating,
      comments: comments || ''
    });

    await feedback.save();

    res.json({ 
      msg: 'Feedback submitted successfully',
      feedback 
    });
  } catch (err) {
    console.error('Error submitting feedback:', err);
    res.status(500).json({ msg: 'Server error' });
  }
});

// Get my feedback (for students) - Shows own name
router.get('/my-feedback', auth, async (req, res) => {
  try {
    const feedback = await Feedback.find({ userId: req.user.id })
      .sort({ createdAt: -1 })
      .populate('userId', 'firstName lastName roleId');

    res.json(feedback);
  } catch (err) {
    console.error('Error fetching feedback:', err);
    res.status(500).json({ msg: 'Server error' });
  }
});

// Get all feedback (Admin & Mess Staff only) - ANONYMOUS VERSION
router.get('/all', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    
    if (user.role !== 'Admin' && user.role !== 'Mess Staff') {
      return res.status(403).json({ msg: 'Access denied' });
    }

    const { item, startDate, endDate } = req.query;
    const query = {};

    if (item && item !== 'All') {
      query.item = item;
    }

    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate);
    }

    const feedbackList = await Feedback.find(query)
      .sort({ createdAt: -1 })
      .lean();

    // Fetch only role information (keep identity anonymous)
    const transformedFeedback = await Promise.all(
      feedbackList.map(async (fb) => {
        let userRole = 'Unknown';
        let repliedByRole = null;
        
        if (fb.userId) {
          try {
            const userData = await User.findById(fb.userId)
              .select('role')
              .lean();
            
            if (userData && userData.role) {
              userRole = userData.role;
            }
          } catch (err) {
            console.error('Error fetching user role:', fb.userId, err);
          }
        }

        // Fetch role of person who replied
        if (fb.repliedBy) {
          try {
            const repliedByUser = await User.findById(fb.repliedBy)
              .select('role')
              .lean();
            
            if (repliedByUser && repliedByUser.role) {
              repliedByRole = repliedByUser.role;
            }
          } catch (err) {
            console.error('Error fetching repliedBy role:', fb.repliedBy, err);
          }
        }

        return {
          _id: fb._id,
          item: fb.item,
          rating: fb.rating,
          comments: fb.comments || '',
          reply: fb.reply || '',
          repliedBy: fb.repliedBy,
          repliedByRole: repliedByRole,
          repliedAt: fb.repliedAt,
          createdAt: fb.createdAt,
          updatedAt: fb.updatedAt,
          // Anonymous user info - only show role
          user: {
            role: userRole,
            displayName: userRole === 'Day Scholar' ? 'Anonymous Day Scholar' : 
                        userRole === 'Officer Cadet' ? 'Anonymous Officer Cadet' : 
                        'Anonymous User'
          }
        };
      })
    );

    console.log('📊 Total anonymous feedback returned:', transformedFeedback.length);

    res.json(transformedFeedback);
  } catch (err) {
    console.error('Error fetching all feedback:', err);
    res.status(500).json({ msg: 'Server error' });
  }
});

// Reply to feedback (Admin & Mess Staff only)
router.post('/:id/reply', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    
    if (user.role !== 'Admin' && user.role !== 'Mess Staff') {
      return res.status(403).json({ msg: 'Access denied. Only Admin and Mess Staff can reply to feedback' });
    }

    const { reply } = req.body;

    if (!reply || reply.trim() === '') {
      return res.status(400).json({ msg: 'Reply cannot be empty' });
    }

    const feedback = await Feedback.findById(req.params.id);

    if (!feedback) {
      return res.status(404).json({ msg: 'Feedback not found' });
    }

    feedback.reply = reply;
    feedback.repliedBy = req.user.id;
    feedback.repliedAt = new Date();

    await feedback.save();

    // Fetch user role only (anonymous)
    let userRole = 'Unknown';
    try {
      const userData = await User.findById(feedback.userId)
        .select('role')
        .lean();
      
      if (userData && userData.role) {
        userRole = userData.role;
      }
    } catch (err) {
      console.error('Error fetching user role:', err);
    }

    // Get role of person who replied (current user)
    const repliedByRole = user.role;

    res.json({ 
      msg: 'Reply sent successfully',
      feedback: {
        _id: feedback._id,
        item: feedback.item,
        rating: feedback.rating,
        comments: feedback.comments,
        reply: feedback.reply,
        repliedBy: feedback.repliedBy,
        repliedByRole: repliedByRole,
        repliedAt: feedback.repliedAt,
        createdAt: feedback.createdAt,
        updatedAt: feedback.updatedAt,
        user: {
          role: userRole,
          displayName: userRole === 'Day Scholar' ? 'Anonymous Day Scholar' : 
                      userRole === 'Officer Cadet' ? 'Anonymous Officer Cadet' : 
                      'Anonymous User'
        }
      }
    });
  } catch (err) {
    console.error('Error replying to feedback:', err);
    res.status(500).json({ msg: 'Server error' });
  }
});

// Get feedback statistics (Admin & Mess Staff only)
router.get('/stats', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    
    if (user.role !== 'Admin' && user.role !== 'Mess Staff') {
      return res.status(403).json({ msg: 'Access denied' });
    }

    const stats = await Feedback.aggregate([
      {
        $group: {
          _id: '$item',
          averageRating: { $avg: '$rating' },
          totalFeedback: { $sum: 1 }
        }
      },
      {
        $sort: { _id: 1 }
      }
    ]);

    res.json(stats);
  } catch (err) {
    console.error('Error fetching feedback stats:', err);
    res.status(500).json({ msg: 'Server error' });
  }
});

module.exports = router;
const express = require('express');
const router = express.Router();
const User = require('../models/User');
const bcrypt = require('bcryptjs');
const auth = require('../../middleware/auth.middleware');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, '../../uploads/profiles');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
  console.log('✅ Created uploads/profiles directory');
}

// Configure multer for profile picture upload
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/profiles/')
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'profile-' + req.user.id + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const fileFilter = (req, file, cb) => {
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('Only image files are allowed!'), false);
  }
};

const upload = multer({ 
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: fileFilter
});

// Get user profile
router.get('/profile', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    if (!user) {
      return res.status(404).json({ msg: 'User not found' });
    }
    res.json(user);
  } catch (err) {
    console.error('Error fetching profile:', err);
    res.status(500).json({ msg: 'Server error' });
  }
});

// Update user profile (ONLY mobile number editable)
router.put('/profile', auth, async (req, res) => {
  try {
    let { contact } = req.body;
    
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ msg: 'User not found' });
    }

    if (contact !== undefined && contact !== null) {
      contact = contact.toString().replace(/^\+94/, '').replace(/[\s\-()]/g, '');
      
      if (!/^\d{10}$/.test(contact)) {
        return res.status(400).json({ msg: 'Contact number must be exactly 10 digits' });
      }
      
      user.contact = contact;
    }

    await user.save();
    
    const updatedUser = await User.findById(req.user.id).select('-password');
    res.json({ msg: 'Profile updated successfully', user: updatedUser });
  } catch (err) {
    console.error('Error updating profile:', err);
    res.status(500).json({ msg: 'Server error', error: err.message });
  }
});

// Upload profile picture - SIMPLIFIED VERSION
router.post('/profile-picture', auth, upload.single('profilePicture'), async (req, res) => {
  try {
    console.log('='.repeat(50));
    console.log('📸 PROFILE PICTURE UPLOAD STARTED');
    console.log('User ID:', req.user.id);
    console.log('File info:', req.file ? req.file.filename : 'NO FILE');
    
    if (!req.file) {
      console.log('❌ No file in request');
      return res.status(400).json({ msg: 'Please upload an image' });
    }

    const profilePicturePath = `/uploads/profiles/${req.file.filename}`;
    console.log('Profile picture path:', profilePicturePath);

    // Direct database update without validation
    const result = await User.updateOne(
      { _id: req.user.id },
      { $set: { profilePicture: profilePicturePath } }
    );

    console.log('Update result:', result);

    if (result.matchedCount === 0) {
      console.log('❌ User not found');
      return res.status(404).json({ msg: 'User not found' });
    }

    console.log('✅ Profile picture updated successfully');

    const updatedUser = await User.findById(req.user.id).select('-password');
    console.log('Updated user profilePicture:', updatedUser.profilePicture);
    console.log('='.repeat(50));

    res.json({ 
      msg: 'Profile picture uploaded successfully', 
      user: updatedUser,
      profilePicture: profilePicturePath
    });

  } catch (err) {
    console.error('='.repeat(50));
    console.error('❌ PROFILE PICTURE UPLOAD ERROR');
    console.error('Error message:', err.message);
    console.error('Error name:', err.name);
    console.error('Full error:', err);
    console.error('='.repeat(50));
    
    res.status(500).json({ 
      msg: 'Server error', 
      error: err.message,
      stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
    });
  }
});

// Change password
router.put('/change-password', auth, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ msg: 'Please provide current and new password' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ msg: 'New password must be at least 6 characters' });
    }

    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ msg: 'User not found' });
    }

    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      return res.status(400).json({ msg: 'Current password is incorrect' });
    }

    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(newPassword, salt);
    await user.save();

    res.json({ msg: 'Password changed successfully' });
  } catch (err) {
    console.error('Error changing password:', err);
    res.status(500).json({ msg: 'Server error', error: err.message });
  }
});

// Get notification preferences
router.get('/notifications', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('notificationPreferences');
    
    const defaultPreferences = {
      emailNotifications: true,
      bookingConfirmations: true,
      menuUpdates: true,
      billNotifications: true
    };

    res.json(user?.notificationPreferences || defaultPreferences);
  } catch (err) {
    console.error('Error fetching notifications:', err);
    res.status(500).json({ msg: 'Server error' });
  }
});

// Update notification preferences
router.put('/notifications', auth, async (req, res) => {
  try {
    const { emailNotifications, bookingConfirmations, menuUpdates, billNotifications } = req.body;

    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ msg: 'User not found' });
    }

    user.notificationPreferences = {
      emailNotifications: emailNotifications !== undefined ? emailNotifications : true,
      bookingConfirmations: bookingConfirmations !== undefined ? bookingConfirmations : true,
      menuUpdates: menuUpdates !== undefined ? menuUpdates : true,
      billNotifications: billNotifications !== undefined ? billNotifications : true
    };

    await user.save();
    res.json({ msg: 'Notification preferences updated successfully', preferences: user.notificationPreferences });
  } catch (err) {
    console.error('Error updating notifications:', err);
    res.status(500).json({ msg: 'Server error' });
  }
});

// Submit support ticket
router.post('/support', auth, async (req, res) => {
  try {
    const { subject, message, category } = req.body;

    if (!subject || !message) {
      return res.status(400).json({ msg: 'Please provide subject and message' });
    }

    const user = await User.findById(req.user.id).select('-password');

    const ticket = {
      ticketId: `TICKET-${Date.now()}`,
      userId: user._id,
      userName: `${user.firstName} ${user.lastName}`,
      userEmail: user.email,
      subject,
      message,
      category: category || 'General',
      status: 'Open',
      createdAt: new Date()
    };

    console.log('Support Ticket Created:', ticket);

    res.json({ 
      msg: 'Support ticket submitted successfully. We will contact you soon.',
      ticketId: ticket.ticketId 
    });
  } catch (err) {
    console.error('Error submitting support ticket:', err);
    res.status(500).json({ msg: 'Server error' });
  }
});

module.exports = router;

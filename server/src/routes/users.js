console.log('✅ Users routes file loaded successfully');

const express = require('express');
const { body, validationResult } = require('express-validator');
const User = require('../models/User');
const jwt = require('jsonwebtoken');

const router = express.Router();

// ========== MIDDLEWARE: Verify JWT Token ==========
const authenticate = async (req, res, next) => {
  try {
    // ⭐ FIXED: Accept both Authorization Bearer and x-auth-token
    let token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      token = req.header('x-auth-token'); // ⭐ ADD THIS LINE
    }
    
    if (!token) {
      return res.status(401).json({ msg: 'No token, authorization denied' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = await User.findById(decoded.id).select('-password');
    
    if (!req.user) {
      return res.status(401).json({ msg: 'Token is not valid' });
    }
    
    next();
  } catch (err) {
    res.status(401).json({ msg: 'Token is not valid' });
  }
};

// ========== MIDDLEWARE: Check if user is Admin ==========
const isAdmin = (req, res, next) => {
  if (req.user.role !== 'Admin') {
    return res.status(403).json({ msg: 'Access denied. Admin only.' });
  }
  next();
};

// ⭐ ADDED: GET ALL USERS - Simple version for User Management page
router.get('/all', authenticate, isAdmin, async (req, res) => {
  try {
    const users = await User.find()
      .select('-password -emailVerificationToken -resetPasswordToken')
      .sort({ createdAt: -1 });
    
    console.log(`✅ Found ${users.length} users for User Management`);
    res.json(users);
  } catch (err) {
    console.error('❌ Get all users error:', err);
    res.status(500).json({ msg: 'Server error', error: err.message });
  }
});

// ⭐ ADDED: GET STATISTICS - For User Management statistics cards
router.get('/statistics', authenticate, isAdmin, async (req, res) => {
  try {
    const totalUsers = await User.countDocuments();
    const activeUsers = await User.countDocuments({ status: 'Active' });
    
    const usersByRole = await User.aggregate([
      { $group: { _id: '$role', count: { $sum: 1 } } }
    ]);
    
    const recentUsers = await User.find()
      .select('-password -emailVerificationToken -resetPasswordToken')
      .sort({ createdAt: -1 })
      .limit(5);
    
    console.log('📊 Statistics:', { totalUsers, activeUsers, roleCount: usersByRole.length });
    
    res.json({
      totalUsers,
      activeUsers,
      usersByRole,
      recentUsers
    });
  } catch (err) {
    console.error('❌ Get statistics error:', err);
    res.status(500).json({ msg: 'Server error', error: err.message });
  }
});

// ⭐ ADDED: UPDATE USER STATUS - For toggle active/inactive
router.put('/:id/status', authenticate, isAdmin, async (req, res) => {
  try {
    const { status } = req.body;
    
    if (!['Active', 'Inactive'].includes(status)) {
      return res.status(400).json({ msg: 'Invalid status. Must be Active or Inactive.' });
    }
    
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ msg: 'User not found' });
    }
    
    user.status = status;
    await user.save();
    
    console.log(`✅ User ${user.roleId} status updated to ${status}`);
    res.json({ msg: 'User status updated successfully', user });
  } catch (err) {
    console.error('❌ Update status error:', err);
    res.status(500).json({ msg: 'Server error', error: err.message });
  }
});

// ⭐ MODIFIED: DELETE USER - Changed to prevent deleting Students and Admins
router.delete('/:id', authenticate, isAdmin, async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    
    if (!user) {
      return res.status(404).json({ msg: 'User not found' });
    }
    
    // ⭐ ADDED: Prevent deleting Students and Admins
    if (user.role === 'Student' || user.role === 'Admin') {
      return res.status(403).json({ 
        msg: `Cannot delete ${user.role}s from the system` 
      });
    }
    
    // Soft delete
    await User.findByIdAndUpdate(
      req.params.id,
      { 
        $set: { 
          isActive: false,
          status: 'Inactive'
        } 
      },
      { new: true }
    );
    
    console.log(`🗑️ User ${user.roleId} soft deleted`);
    res.json({ msg: 'User deleted successfully' });
  } catch (err) {
    console.error('❌ Delete user error:', err);
    res.status(500).json({ msg: 'Server error', error: err.message });
  }
});

// ========== EXISTING ROUTES BELOW (Keep as is) ==========

// ========== GET ALL USERS (Admin only) - with pagination ==========
router.get('/', authenticate, isAdmin, async (req, res) => {
  try {
    const { role, status, search, page = 1, limit = 10 } = req.query;
    
    const query = {};
    
    if (role) {
      query.role = role;
    }
    
    if (status) {
      query.status = status;
    }
    
    if (search) {
      const regex = new RegExp(search, 'i');
      query.$or = [
        { firstName: regex },
        { lastName: regex },
        { email: regex },
        { roleId: regex }
      ];
    }
    
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    const users = await User.find(query)
      .select('-password -emailVerificationToken -resetPasswordToken')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));
    
    const total = await User.countDocuments(query);
    
    res.json({
      users,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (err) {
    console.error('❌ Get users error:', err);
    res.status(500).json({ msg: 'Server error' });
  }
});

// ========== GET USER BY ID ==========
router.get('/:id', authenticate, async (req, res) => {
  try {
    if (req.user.role !== 'Admin' && req.user._id.toString() !== req.params.id) {
      return res.status(403).json({ msg: 'Access denied' });
    }
    
    const user = await User.findById(req.params.id)
      .select('-password -emailVerificationToken -resetPasswordToken');
    
    if (!user) {
      return res.status(404).json({ msg: 'User not found' });
    }
    
    res.json(user);
  } catch (err) {
    console.error('❌ Get user by ID error:', err);
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ msg: 'User not found' });
    }
    res.status(500).json({ msg: 'Server error' });
  }
});

// ========== GET CURRENT USER PROFILE ==========
router.get('/me/profile', authenticate, async (req, res) => {
  try {
    const user = await User.findById(req.user._id)
      .select('-password -emailVerificationToken -resetPasswordToken');
    
    res.json(user);
  } catch (err) {
    console.error('❌ Get profile error:', err);
    res.status(500).json({ msg: 'Server error' });
  }
});

// ========== UPDATE USER PROFILE ==========
router.put('/:id', authenticate, [
  body('firstName').optional().trim().notEmpty().matches(/^[a-zA-Z\s]+$/),
  body('lastName').optional().trim().notEmpty().matches(/^[a-zA-Z\s]+$/),
  body('contact').optional().matches(/^[0-9]{10}$/),
  body('email').optional().isEmail(),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  
  try {
    if (req.user.role !== 'Admin' && req.user._id.toString() !== req.params.id) {
      return res.status(403).json({ msg: 'Access denied' });
    }
    
    const { firstName, lastName, contact, email, intake, faculty, roomNo, gender } = req.body;
    
    const updateFields = {};
    if (firstName) updateFields.firstName = firstName;
    if (lastName) updateFields.lastName = lastName;
    if (contact) updateFields.contact = contact;
    if (email) updateFields.email = email.toLowerCase();
    if (intake) updateFields.intake = intake;
    if (faculty) updateFields.faculty = faculty;
    if (roomNo) updateFields.roomNo = roomNo;
    if (gender) updateFields.gender = gender;
    
    if (email) {
      const existingUser = await User.findOne({ 
        email: email.toLowerCase(),
        _id: { $ne: req.params.id }
      });
      
      if (existingUser) {
        return res.status(400).json({ msg: 'Email already in use' });
      }
    }
    
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { $set: updateFields },
      { new: true, runValidators: true }
    ).select('-password -emailVerificationToken -resetPasswordToken');
    
    if (!user) {
      return res.status(404).json({ msg: 'User not found' });
    }
    
    res.json({ 
      msg: 'Profile updated successfully',
      user 
    });
  } catch (err) {
    console.error('❌ Update user error:', err);
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ msg: 'User not found' });
    }
    res.status(500).json({ msg: 'Server error' });
  }
});

// ========== UPDATE USER STATUS (Admin only) - PATCH version ==========
router.patch('/:id/status', authenticate, isAdmin, async (req, res) => {
  try {
    const { status, isActive } = req.body;
    
    if (!status && isActive === undefined) {
      return res.status(400).json({ msg: 'Status or isActive field required' });
    }
    
    const updateFields = {};
    if (status) updateFields.status = status;
    if (isActive !== undefined) updateFields.isActive = isActive;
    
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { $set: updateFields },
      { new: true }
    ).select('-password -emailVerificationToken -resetPasswordToken');
    
    if (!user) {
      return res.status(404).json({ msg: 'User not found' });
    }
    
    res.json({ 
      msg: 'User status updated successfully',
      user 
    });
  } catch (err) {
    console.error('❌ Update status error:', err);
    res.status(500).json({ msg: 'Server error' });
  }
});

// ========== UPDATE USER ROLE (Admin only) ==========
router.patch('/:id/role', authenticate, isAdmin, [
  body('role').isIn(['Day Scholar', 'Officer Cadet', 'Mess Staff', 'Admin'])
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  
  try {
    const { role } = req.body;
    
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { $set: { role } },
      { new: true }
    ).select('-password -emailVerificationToken -resetPasswordToken');
    
    if (!user) {
      return res.status(404).json({ msg: 'User not found' });
    }
    
    res.json({ 
      msg: 'User role updated successfully',
      user 
    });
  } catch (err) {
    console.error('❌ Update role error:', err);
    res.status(500).json({ msg: 'Server error' });
  }
});

// ========== PERMANENTLY DELETE USER (Admin only) ==========
router.delete('/:id/permanent', authenticate, isAdmin, async (req, res) => {
  try {
    const user = await User.findByIdAndDelete(req.params.id);
    
    if (!user) {
      return res.status(404).json({ msg: 'User not found' });
    }
    
    res.json({ 
      msg: 'User permanently deleted',
      deletedUser: {
        id: user._id,
        email: user.email,
        roleId: user.roleId
      }
    });
  } catch (err) {
    console.error('❌ Permanent delete error:', err);
    res.status(500).json({ msg: 'Server error' });
  }
});

// ========== GET USERS BY ROLE ==========
router.get('/role/:role', authenticate, async (req, res) => {
  try {
    const { role } = req.params;
    
    const users = await User.find({ 
      role: role,
      isActive: true 
    }).select('-password -emailVerificationToken -resetPasswordToken');
    
    res.json(users);
  } catch (err) {
    console.error('❌ Get users by role error:', err);
    res.status(500).json({ msg: 'Server error' });
  }
});

// ========== SEARCH USERS ==========
router.get('/search/:term', authenticate, async (req, res) => {
  try {
    const { term } = req.params;
    const regex = new RegExp(term, 'i');
    
    const users = await User.find({
      $or: [
        { firstName: regex },
        { lastName: regex },
        { email: regex },
        { roleId: regex }
      ],
      isActive: true
    }).select('-password -emailVerificationToken -resetPasswordToken')
      .limit(20);
    
    res.json(users);
  } catch (err) {
    console.error('❌ Search users error:', err);
    res.status(500).json({ msg: 'Server error' });
  }
});

// ========== UPDATE NOTIFICATION PREFERENCES ==========
router.patch('/:id/notifications', authenticate, async (req, res) => {
  try {
    if (req.user.role !== 'Admin' && req.user._id.toString() !== req.params.id) {
      return res.status(403).json({ msg: 'Access denied' });
    }
    
    const { emailNotifications, bookingConfirmations, menuUpdates, billNotifications } = req.body;
    
    const updateFields = {};
    if (emailNotifications !== undefined) 
      updateFields['notificationPreferences.emailNotifications'] = emailNotifications;
    if (bookingConfirmations !== undefined) 
      updateFields['notificationPreferences.bookingConfirmations'] = bookingConfirmations;
    if (menuUpdates !== undefined) 
      updateFields['notificationPreferences.menuUpdates'] = menuUpdates;
    if (billNotifications !== undefined) 
      updateFields['notificationPreferences.billNotifications'] = billNotifications;
    
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { $set: updateFields },
      { new: true }
    ).select('-password -emailVerificationToken -resetPasswordToken');
    
    if (!user) {
      return res.status(404).json({ msg: 'User not found' });
    }
    
    res.json({ 
      msg: 'Notification preferences updated',
      notificationPreferences: user.notificationPreferences
    });
  } catch (err) {
    console.error('❌ Update notifications error:', err);
    res.status(500).json({ msg: 'Server error' });
  }
});

// ========== GET USER STATISTICS (Admin only) ==========
router.get('/stats/overview', authenticate, isAdmin, async (req, res) => {
  try {
    const totalUsers = await User.countDocuments();
    const activeUsers = await User.countDocuments({ isActive: true });
    const inactiveUsers = await User.countDocuments({ isActive: false });
    
    const usersByRole = await User.aggregate([
      { $group: { _id: '$role', count: { $sum: 1 } } }
    ]);
    
    const usersByStatus = await User.aggregate([
      { $group: { _id: '$status', count: { $sum: 1 } } }
    ]);
    
    const verifiedUsers = await User.countDocuments({ isEmailVerified: true });
    const unverifiedUsers = await User.countDocuments({ isEmailVerified: false });
    
    res.json({
      totalUsers,
      activeUsers,
      inactiveUsers,
      verifiedUsers,
      unverifiedUsers,
      usersByRole,
      usersByStatus
    });
  } catch (err) {
    console.error('❌ Get stats error:', err);
    res.status(500).json({ msg: 'Server error' });
  }
});

module.exports = router;
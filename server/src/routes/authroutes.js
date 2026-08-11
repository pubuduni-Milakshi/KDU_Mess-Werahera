console.log('✅ Auth routes file loaded successfully');

const express = require('express');
const { body, validationResult } = require('express-validator');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const emailService = require('../utils/emailService');

const router = express.Router();

//  VALIDATION HELPER FUNCTIONS 
const validateEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

const validateRoleId = (roleId) => {
  const roleIdRegex = /^[a-zA-Z0-9\-/]+$/;
  return roleIdRegex.test(roleId);
};

const validateStrongPassword = (password) => {
  const strongPasswordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
  return strongPasswordRegex.test(password);
};

const validateName = (name) => {
  const nameRegex = /^[a-zA-Z\s]+$/;
  return nameRegex.test(name);
};

// Generate 6-digit OTP
const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// ========== REGISTER ROUTE (Step 1 - Send OTP) ==========
router.post('/register', [
  body('role').isIn(['Day Scholar', 'Officer Cadet', 'Mess Staff']),
  body('roleId').trim().notEmpty(),
  body('firstName').trim().notEmpty(),
  body('lastName').trim().notEmpty(),
  body('email').isEmail(),
  body('contact').optional().isMobilePhone('any'),
  body('password').isLength({ min: 6 }),
  body('confirmPassword').custom((value, { req }) => value === req.body.password),
  body('gender').isIn(['Male', 'Female']),
  body('intake').custom((value, { req }) => {
    if ((req.body.role === 'Officer Cadet' || req.body.role === 'Day Scholar') && !value) {
      throw new Error('Intake is required');
    }
    return true;
  }),
  body('faculty').custom((value, { req }) => {
    if ((req.body.role === 'Officer Cadet' || req.body.role === 'Day Scholar') && !value) {
      throw new Error('Faculty is required for Officer Cadets and Day Scholars');
    }
    return true;
  }),
  body('roomNo').custom((value, { req }) => {
    if ((req.body.role === 'Officer Cadet' || req.body.role === 'Day Scholar') && !value) {
      throw new Error('Room number is required');
    }
    return true;
  }),
], async (req, res) => {
  // ========== EXPRESS-VALIDATOR ERRORS ==========
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { role, roleId, firstName, lastName, email, contact, password, confirmPassword, gender, intake, faculty, roomNo } = req.body;

  try {
    // ========== TEST CASE VALIDATIONS ==========

    // TEST CASE REG-04: Check if all required fields are provided
    if (!roleId || !firstName || !lastName || !email || !password || !confirmPassword || !gender) {
      return res.status(400).json({ 
        msg: 'All fields are required',
        testCase: 'REG-04'
      });
    }

    // TEST CASE REG-09: Email field validation
    if (!email || email.trim() === '') {
      return res.status(400).json({ 
        msg: 'Email is required',
        testCase: 'REG-09'
      });
    }

    // TEST CASE REG-10: Password field validation
    if (!password || password.trim() === '') {
      return res.status(400).json({ 
        msg: 'Password is required',
        testCase: 'REG-10'
      });
    }

    // TEST CASE REG-03: Invalid email format
    if (!validateEmail(email)) {
      return res.status(400).json({ 
        msg: 'Invalid email format. Please enter a valid email address',
        testCase: 'REG-03'
      });
    }

    // TEST CASE REG-08: Invalid roleId format
    if (!validateRoleId(roleId)) {
      return res.status(400).json({ 
        msg: 'Role ID can only contain letters, numbers, hyphens, and slashes',
        testCase: 'REG-08'
      });
    }

    // TEST CASE REG-11: Special characters in name
    if (!validateName(firstName) || !validateName(lastName)) {
      return res.status(400).json({ 
        msg: 'First name and last name can only contain letters and spaces',
        testCase: 'REG-11'
      });
    }

    // TEST CASE REG-12: Max length validation
    const MAX_LENGTH = 255;
    if (roleId.length > MAX_LENGTH || email.length > MAX_LENGTH || 
        firstName.length > MAX_LENGTH || lastName.length > MAX_LENGTH) {
      return res.status(400).json({ 
        msg: 'Input fields cannot exceed 255 characters',
        testCase: 'REG-12'
      });
    }

    // TEST CASE REG-06: Password too short
    if (password.length < 8) {
      return res.status(400).json({ 
        msg: 'Password must be at least 8 characters long',
        testCase: 'REG-06'
      });
    }

    // TEST CASE REG-05: Password and confirm password mismatch
    if (password !== confirmPassword) {
      return res.status(400).json({ 
        msg: 'Passwords do not match',
        testCase: 'REG-05'
      });
    }

    // TEST CASE REG-07: Weak password
    if (!validateStrongPassword(password)) {
      return res.status(400).json({ 
        msg: 'Password too weak. Must contain at least 8 characters, one uppercase letter, one lowercase letter, one number, and one special character',
        testCase: 'REG-07'
      });
    }

    // ========== EXISTING VALIDATIONS ==========

    // Block Admin registration
    if (role === 'Admin') {
      return res.status(403).json({ 
        msg: 'Cannot register as Admin. Only system administrator exists.' 
      });
    }

    // TEST CASE REG-02 & REG-14: Check if email or roleId already exists
    const existingUser = await User.findOne({ 
      $or: [
        { email: email.toLowerCase() }, 
        { roleId: roleId }
      ] 
    });
    
    if (existingUser) {
      // TEST CASE REG-02: Email already exists
      if (existingUser.email === email.toLowerCase()) {
        return res.status(400).json({ 
          msg: 'Email already exists',
          testCase: 'REG-02'
        });
      }
      // TEST CASE REG-14: RoleId already exists
      if (existingUser.roleId === roleId) {
        return res.status(400).json({ 
          msg: 'Role ID already exists. Please use a different Role ID',
          testCase: 'REG-14'
        });
      }
    }

    //  GENERATE OTP 
    const otp = generateOTP();
    const otpExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // CREATE USER (NOT VERIFIED YET) 
    const userData = { 
      role, 
      roleId, 
      firstName, 
      lastName, 
      email: email.toLowerCase(),
      contact, 
      password, 
      gender,
      isEmailVerified: false,
      verificationOTP: otp,
      otpExpires: otpExpires
    };

    // Add conditional fields based on role
    if (role === 'Officer Cadet' || role === 'Day Scholar') {
      userData.intake = intake;
      userData.faculty = faculty;
      userData.roomNo = roomNo;
    }

    const user = new User(userData);
    await user.save();

    // ✅ Send OTP email
    try {
      const emailResult = await emailService.sendOTPVerificationEmail(user, otp);
      
      if (!emailResult.success) {
        console.error('Failed to send OTP email:', emailResult.error);
        // Delete user if email fails
        await User.findByIdAndDelete(user._id);
        return res.status(500).json({ msg: 'Failed to send verification email. Please try again.' });
      }
      
      console.log('✅ OTP sent to:', user.email);
    } catch (emailError) {
      console.error('⚠️ Failed to send OTP email:', emailError.message);
      // Delete user if email fails
      await User.findByIdAndDelete(user._id);
      return res.status(500).json({ msg: 'Failed to send verification email. Please try again.' });
    }
    
    res.json({ 
      msg: 'Registration initiated! Please check your email for the 6-digit OTP verification code.',
      email: user.email,
      userName: `${user.firstName} ${user.lastName}`,
      testCase: 'REG-01'
    });

  } catch (err) {
    console.error('❌ Registration error:', err);
    res.status(500).json({ msg: 'Server error' });
  }
});

// ========== VERIFY OTP (Step 2 - Complete Registration) ==========
router.post('/verify-otp', async (req, res) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      return res.status(400).json({ msg: 'Email and OTP are required' });
    }

    // Find user
    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      return res.status(404).json({ msg: 'User not found' });
    }

    // Check if already verified
    if (user.isEmailVerified) {
      return res.status(400).json({ msg: 'Email is already verified' });
    }

    // Check OTP expiration
    if (user.otpExpires < new Date()) {
      return res.status(400).json({ msg: 'OTP has expired. Please request a new one.' });
    }

    // Verify OTP
    if (user.verificationOTP !== otp) {
      return res.status(400).json({ msg: 'Invalid OTP. Please check and try again.' });
    }

    // Mark as verified
    user.isEmailVerified = true;
    user.verificationOTP = undefined;
    user.otpExpires = undefined;
    user.status = 'Active';
    await user.save();

    // Send welcome email
    try {
      await emailService.sendWelcomeEmail(user);
      console.log('✅ Welcome email sent to:', user.email);
    } catch (emailError) {
      console.error('⚠️ Failed to send welcome email:', emailError.message);
      // Don't fail verification if welcome email fails
    }

    // Generate token
    const token = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '7d' }
    );

    const userResponse = {
      id: user._id,
      role: user.role,
      roleId: user.roleId,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      gender: user.gender
    };

    if (user.intake) userResponse.intake = user.intake;
    if (user.faculty) userResponse.faculty = user.faculty;
    if (user.roomNo) userResponse.roomNo = user.roomNo;
    if (user.contact) userResponse.contact = user.contact;

    res.json({
      msg: '🎉 Email verified successfully! Your account is now active.',
      token,
      user: userResponse
    });

  } catch (err) {
    console.error('❌ OTP verification error:', err);
    res.status(500).json({ msg: 'Server error' });
  }
});

// ========== RESEND OTP ==========
router.post('/resend-otp', async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ msg: 'Email is required' });
    }

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      return res.status(404).json({ msg: 'User not found' });
    }

    if (user.isEmailVerified) {
      return res.status(400).json({ msg: 'Email is already verified' });
    }

    // Generate new OTP
    const otp = generateOTP();
    const otpExpires = new Date(Date.now() + 10 * 60 * 1000);

    user.verificationOTP = otp;
    user.otpExpires = otpExpires;
    await user.save();

    // Send OTP email
    const emailResult = await emailService.sendOTPVerificationEmail(user, otp);
    
    if (!emailResult.success) {
      return res.status(500).json({ msg: 'Failed to send verification email' });
    }

    console.log('✅ OTP resent to:', user.email);
    res.json({ msg: 'New OTP sent to your email successfully' });

  } catch (err) {
    console.error('❌ Resend OTP error:', err);
    res.status(500).json({ msg: 'Server error' });
  }
});

// ========== LOGIN ==========
router.post('/login', [
  body('email').isEmail(),
  body('password').notEmpty()
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    console.log('❌ Validation errors:', errors.array());
    return res.status(400).json({ errors: errors.array() });
  }

  const { email, password } = req.body;
  console.log('🔍 Login attempt:', { 
    email: `"${email}"`, 
    emailLength: email.length,
    passwordProvided: !!password 
  });

  try {
    const user = await User.findOne({ email: email.toLowerCase(), isActive: true });
    if (!user) {
      console.log('❌ User not found or inactive:', email);
      return res.status(400).json({ msg: 'Invalid credentials' });
    }

    console.log('✅ User found:', user.email, 'Role:', user.role);

    // Check if email is verified
    if (!user.isEmailVerified) {
      console.log('⚠️ Email not verified:', user.email);
      return res.status(403).json({ 
        msg: 'Please verify your email before logging in. Check your inbox for the OTP.',
        emailNotVerified: true,
        email: user.email
      });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      console.log('❌ Password mismatch');
      return res.status(400).json({ msg: 'Invalid credentials' });
    }

    console.log('✅ Password match - Login successful');

    const token = jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET || 'your-secret-key', { expiresIn: '7d' });

    const userResponse = {
      id: user._id,
      role: user.role,
      roleId: user.roleId,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      gender: user.gender
    };

    if (user.intake) userResponse.intake = user.intake;
    if (user.faculty) userResponse.faculty = user.faculty;
    if (user.roomNo) userResponse.roomNo = user.roomNo;
    if (user.contact) userResponse.contact = user.contact;

    res.json({ token, user: userResponse });
  } catch (err) {
    console.error('❌ Login error:', err);
    res.status(500).json({ msg: 'Server error' });
  }
});

// ========== FORGOT PASSWORD ==========
router.post('/forgot-password', [
  body('email').isEmail()
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const { email } = req.body;
    console.log('🔐 Password reset requested for:', email);
    
    const user = await User.findOne({ email: email.toLowerCase() });

    if (!user) {
      return res.status(404).json({ msg: 'User not found with this email' });
    }

    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetTokenHash = crypto.createHash('sha256').update(resetToken).digest('hex');

    user.resetPasswordToken = resetTokenHash;
    user.resetPasswordExpire = Date.now() + 10 * 60 * 1000; // 10 minutes
    await user.save();

    // ✅ Send password reset email
    try {
      const emailResult = await emailService.sendPasswordResetEmail(user, resetToken);
      
      if (!emailResult.success) {
        console.error('❌ Failed to send reset email:', emailResult.error);
        return res.status(500).json({ 
          msg: 'Failed to send reset email. Please try again later.' 
        });
      }

      console.log('✅ Password reset email sent successfully to:', user.email);
      
      res.json({ 
        msg: 'Password reset link sent to your email',
        email: user.email
      });
    } catch (emailError) {
      console.error('❌ Email sending error:', emailError);
      return res.status(500).json({ 
        msg: 'Failed to send reset email. Please try again later.' 
      });
    }
  } catch (err) {
    console.error('❌ Forgot password error:', err);
    res.status(500).json({ msg: 'Server error' });
  }
});

// ========== RESET PASSWORD ==========
router.post('/reset-password/:token', [
  body('password').isLength({ min: 8 }),
  body('confirmPassword').custom((value, { req }) => value === req.body.password)
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const resetTokenHash = crypto.createHash('sha256').update(req.params.token).digest('hex');

    const user = await User.findOne({
      resetPasswordToken: resetTokenHash,
      resetPasswordExpire: { $gt: Date.now() }
    });

    if (!user) {
      return res.status(400).json({ msg: 'Invalid or expired reset token' });
    }

    // Validate strong password for reset too
    if (!validateStrongPassword(req.body.password)) {
      return res.status(400).json({ 
        msg: 'Password too weak. Must contain at least 8 characters, one uppercase letter, one lowercase letter, one number, and one special character'
      });
    }

    user.password = req.body.password;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpire = undefined;
    await user.save();

    // ✅ Send password reset confirmation email
    try {
      await emailService.sendPasswordResetConfirmation(user);
      console.log('✅ Password reset confirmation sent to:', user.email);
    } catch (emailError) {
      console.error('⚠️ Failed to send confirmation email:', emailError.message);
      // Don't fail password reset if email fails
    }

    res.json({ 
      msg: 'Password reset successful',
      email: user.email,
      userName: `${user.firstName} ${user.lastName}`
    });
  } catch (err) {
    console.error('❌ Reset password error:', err);
    res.status(500).json({ msg: 'Server error' });
  }
});

module.exports = router;
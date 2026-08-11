const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  role: {
    type: String,
    required: true,
    enum: ['Day Scholar', 'Officer Cadet', 'Mess Staff', 'Admin']
  },
  roleId: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    maxlength: [255, 'Role ID cannot exceed 255 characters'],
    validate: {
      validator: function(v) {
        return /^[a-zA-Z0-9\-/]+$/.test(v);
      },
      message: 'Role ID can only contain letters, numbers, hyphens, and slashes'
    }
  },
  firstName: {
    type: String,
    required: true,
    trim: true,
    maxlength: [255, 'First name cannot exceed 255 characters'],
    validate: {
      validator: function(v) {
        return /^[a-zA-Z\s]+$/.test(v);
      },
      message: 'First name can only contain letters and spaces'
    }
  },
  lastName: {
    type: String,
    required: true,
    trim: true,
    maxlength: [255, 'Last name cannot exceed 255 characters'],
    validate: {
      validator: function(v) {
        return /^[a-zA-Z\s]+$/.test(v);
      },
      message: 'Last name can only contain letters and spaces'
    }
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    trim: true,
    maxlength: [255, 'Email cannot exceed 255 characters'],
    validate: {
      validator: function(v) {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
      },
      message: 'Invalid email format. Please enter a valid email address'
    }
  },
  contact: {
    type: String,
    required: [true, 'Contact number is required'],
    trim: true,
    validate: {
      validator: function(v) {
        return /^[0-9]{10}$/.test(v);
      },
      message: 'Contact number must be exactly 10 digits'
    }
  },
  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: [8, 'Password must be at least 8 characters long'],
    validate: {
      validator: function(v) {
        if (this.isModified('password')) {
          return /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/.test(v);
        }
        return true;
      },
      message: 'Password too weak. Must contain at least 8 characters, one uppercase letter, one lowercase letter, one number, and one special character'
    }
  },
  gender: {
    type: String,
    required: true,
    enum: ['Male', 'Female']
  },
  
  // ========== ROLE-SPECIFIC FIELDS ==========
  intake: {
    type: String,
    required: function() {
      return this.role === 'Officer Cadet' || this.role === 'Day Scholar';
    },
    trim: true,
    default: undefined
  },
  
  faculty: {
    type: String,
    required: function() {
      return this.role === 'Officer Cadet' || this.role === 'Day Scholar';
    },
    enum: {
      values: [
        'Faculty of Defence & Strategic Studies',
        'Faculty of Computing',
        'Faculty of Engineering',
        'Faculty of Medicine',
        'Faculty of Allied Health Sciences',
        'Faculty of Law'
      ],
      message: '{VALUE} is not a valid faculty'
    },
    default: undefined
  },
  
  roomNo: {
    type: String,
    required: function() {
      return this.role === 'Officer Cadet' || this.role === 'Day Scholar';
    },
    trim: true,
    default: undefined
  },
  
  // ========== STATUS FIELDS ==========
  status: {
    type: String,
    enum: ['Active', 'Inactive'],
    default: 'Active'
  },
  
  isActive: {
    type: Boolean,
    default: true
  },
  
  // ========== NOTIFICATION PREFERENCES ==========
  notificationPreferences: {
    emailNotifications: {
      type: Boolean,
      default: true
    },
    bookingConfirmations: {
      type: Boolean,
      default: true
    },
    menuUpdates: {
      type: Boolean,
      default: true
    },
    billNotifications: {
      type: Boolean,
      default: true
    }
  },

  // ========== PROFILE PICTURE ==========
  profilePicture: {
    type: String,
    default: ''
  },

  // ========== EMAIL VERIFICATION FIELDS ==========
  isEmailVerified: {
    type: Boolean,
    default: false
  },
  emailVerificationToken: {
    type: String
  },
  emailVerificationExpires: {
    type: Date
  },
  verificationOTP: {
    type: String
  },
  otpExpires: {
    type: Date
  },
  
  // ========== PASSWORD RESET FIELDS ==========
  resetPasswordToken: {
    type: String,
    default: null
  },
  resetPasswordExpire: {
    type: Date,
    default: null
  },
  
  // ========== TIMESTAMPS ==========
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// ========== PRE-SAVE MIDDLEWARE: Hash Password ==========
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) {
    this.updatedAt = Date.now();
    return next();
  }
  
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  this.updatedAt = Date.now();
  next();
});

// ========== PRE-SAVE MIDDLEWARE: Check Duplicate Email ==========
userSchema.pre('save', async function(next) {
  if (this.isNew || this.isModified('email')) {
    const existingUser = await this.constructor.findOne({ 
      email: this.email,
      _id: { $ne: this._id } 
    });
    if (existingUser) {
      const error = new Error('Email already exists');
      error.code = 'REG-02';
      return next(error);
    }
  }
  next();
});

// ========== PRE-SAVE MIDDLEWARE: Check Duplicate RoleID ==========
userSchema.pre('save', async function(next) {
  if (this.isNew || this.isModified('roleId')) {
    const existingUser = await this.constructor.findOne({ 
      roleId: this.roleId,
      _id: { $ne: this._id } 
    });
    if (existingUser) {
      const error = new Error('Role ID already exists. Please use a different Role ID');
      error.code = 'REG-14';
      return next(error);
    }
  }
  next();
});

// INSTANCE METHOD: Compare Password 
userSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

// INSTANCE METHOD: Get Full Name 
userSchema.methods.getFullName = function() {
  return `${this.firstName} ${this.lastName}`;
};

//  INSTANCE METHOD: Get Role-Specific Info 
userSchema.methods.getRoleInfo = function() {
  const info = {
    role: this.role,
    roleId: this.roleId,
    fullName: this.getFullName()
  };
  
  if (this.role === 'Officer Cadet' || this.role === 'Day Scholar') {
    info.intake = this.intake;
    info.faculty = this.faculty;
    info.roomNo = this.roomNo;
  }
  
  return info;
};

//  STATIC METHOD: Find Users by Role 
userSchema.statics.findByRole = function(role) {
  return this.find({ role: role, isActive: true });
};

//  STATIC METHOD: Search Users 
userSchema.statics.searchUsers = function(searchTerm) {
  const regex = new RegExp(searchTerm, 'i');
  return this.find({
    $or: [
      { firstName: regex },
      { lastName: regex },
      { email: regex },
      { roleId: regex }
    ],
    isActive: true
  });
};

//  INDEXES FOR PERFORMANCE 
userSchema.index({ role: 1, isActive: 1 });
userSchema.index({ role: 1, status: 1 });
userSchema.index({ email: 1 });
userSchema.index({ roleId: 1 });
userSchema.index({ emailVerificationToken: 1 });
userSchema.index({ resetPasswordToken: 1 });

//  EXPORT MODEL (only define once) 
module.exports = mongoose.models.User || mongoose.model('User', userSchema);
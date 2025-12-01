const mongoose = require('mongoose');
const bcrypt = require('bcryptjs'); // ⚠️ MISSING - You need to hash the password
const User = require('../src/models/User');
require('dotenv').config();

async function createAdmin() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('🔗 Connected to MongoDB');
    
    // Check if admin already exists
    const existingAdmin = await User.findOne({ email: 'admin@kdu.ac.lk' });
    
    if (existingAdmin) {
      console.log('❌ Admin already exists');
      console.log('📧 Email:', existingAdmin.email);
      console.log('👤 Role:', existingAdmin.role);
      console.log('🆔 Role ID:', existingAdmin.roleId);
      await mongoose.connection.close();
      process.exit(0);
    }

    // ✅ NOTE: Your User model has pre-save hook that hashes password automatically
    // So we can pass plain text password and it will be hashed by the model

    // Create admin user - matching your User model fields exactly
    const admin = new User({
      role: 'Admin',
      roleId: 'ADMIN001',
      firstName: 'System',
      lastName: 'Admin',
      email: 'admin@kdu.ac.lk',
      contact: '+94771234567', // ✅ CORRECT: Using 'contact' as per your User model
      password: 'Admin@123', // ✅ Will be auto-hashed by pre-save hook
      gender: 'Male',
      isActive: true,
      isEmailVerified: true // ✅ Admin email is pre-verified so they can use forgot password
      // ✅ NOTE: intake, faculty, roomNo not required for Admin role
    });

    await admin.save();
    console.log('✅ Admin created successfully!');
    console.log('📧 Email: admin@kdu.ac.lk');
    console.log('🔐 Password: Admin@123');
    console.log('👤 Role: Admin');
    console.log('🆔 Role ID: ADMIN001');
    console.log('📱 Contact: +94771234567');
    console.log('⚠️  IMPORTANT: Please change the password after first login!');
    
    await mongoose.connection.close();
    process.exit(0);
  } catch (err) {
    console.error('❌ Error creating admin:', err);
    
    // More detailed error logging
    if (err.name === 'ValidationError') {
      console.error('📝 Validation Errors:');
      Object.keys(err.errors).forEach(key => {
        console.error(`   - ${key}: ${err.errors[key].message}`);
      });
    }
    
    await mongoose.connection.close();
    process.exit(1);
  }
}

createAdmin();
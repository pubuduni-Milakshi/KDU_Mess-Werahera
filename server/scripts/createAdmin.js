const mongoose = require('mongoose');
const bcrypt = require('bcryptjs'); // ⚠️ MISSING - You need to hash the password
const User = require('../src/models/User');
require('dotenv').config();

async function createAdmin() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('🔗 Connected to MongoDB');
    
    const adminEmail = 'kdumessw@gmail.com';
    const adminRoleId = 'ADMIN001';
    
    // Check if admin already exists by email
    let existingAdmin = await User.findOne({ email: adminEmail });
    
    if (existingAdmin) {
      console.log('📋 Admin found with email:', adminEmail);
      console.log('📧 Email:', existingAdmin.email);
      console.log('👤 Role:', existingAdmin.role);
      console.log('🆔 Role ID:', existingAdmin.roleId);
      console.log('✅ isActive:', existingAdmin.isActive);
      console.log('✅ isEmailVerified:', existingAdmin.isEmailVerified);
      
      // Update admin to ensure it's active and verified
      existingAdmin.isActive = true;
      existingAdmin.isEmailVerified = true;
      existingAdmin.password = 'Admin@123'; // Reset password
      await existingAdmin.save();
      
      console.log('✅ Admin updated successfully!');
      console.log('🔐 Password reset to: Admin@123');
      console.log('⚠️  IMPORTANT: Please change the password after first login!');
      await mongoose.connection.close();
      process.exit(0);
    }
    
    // Check if ADMIN001 exists (might be different email)
    existingAdmin = await User.findOne({ roleId: adminRoleId });
    
    if (existingAdmin) {
      console.log('⚠️  User with Role ID ADMIN001 already exists with different email:', existingAdmin.email);
      console.log('📝 Updating to use email:', adminEmail);
      
      // Update existing admin
      existingAdmin.email = adminEmail;
      existingAdmin.isActive = true;
      existingAdmin.isEmailVerified = true;
      existingAdmin.password = 'Admin@123';
      existingAdmin.contact = '9477123456'; // Ensure contact is valid
      await existingAdmin.save();
      
      console.log('✅ Admin updated successfully!');
      console.log('📧 Email:', adminEmail);
      console.log('🔐 Password reset to: Admin@123');
      console.log('⚠️  IMPORTANT: Please change the password after first login!');
      await mongoose.connection.close();
      process.exit(0);
    }

   
    //  we can pass plain text password and it will be hashed by the model

    // Create new admin user - matching your User model fields exactly
    const admin = new User({
      role: 'Admin',
      roleId: adminRoleId,
      firstName: 'System',
      lastName: 'Admin',
      email: adminEmail,
      contact: '9477123456', //  Must be exactly 10 digits (no + or country code)
      password: 'Admin@123', //  Will be auto-hashed by pre-save hook
      gender: 'Male',
      isActive: true,
      isEmailVerified: true // Admin email is pre-verified so they can use forgot password
      // intake, faculty, roomNo not required for Admin role
    });

    await admin.save();
    console.log('✅ Admin created successfully!');
    console.log('📧 Email: kdumessw@gmail.com');
    console.log('🔐 Password: Admin@123');
    console.log('👤 Role: Admin');
    console.log('🆔 Role ID: ADMIN001');
    console.log('📱 Contact: 9477123456');
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
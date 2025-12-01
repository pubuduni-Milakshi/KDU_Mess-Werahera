const mongoose = require('mongoose');
const User = require('../src/models/User');
require('dotenv').config();

/**
 * Emergency Admin Password Reset Script
 * 
 * Use this script if the admin forgets their password and:
 * - Email service is not configured/working
 * - Need immediate access without waiting for email
 * 
 * Usage: node server/scripts/resetAdminPassword.js
 * 
 * This will reset the admin password to the default: Admin@123
 * IMPORTANT: Change the password immediately after logging in!
 */

async function resetAdminPassword() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('🔗 Connected to MongoDB');
    
    // Find admin user
    const admin = await User.findOne({ 
      email: 'admin@kdu.ac.lk',
      role: 'Admin'
    });
    
    if (!admin) {
      console.log('❌ Admin account not found!');
      console.log('💡 Run "node server/scripts/createAdmin.js" first to create the admin account.');
      await mongoose.connection.close();
      process.exit(1);
    }

    // Reset password to default
    const defaultPassword = 'Admin@123';
    admin.password = defaultPassword;
    admin.resetPasswordToken = undefined;
    admin.resetPasswordExpire = undefined;
    await admin.save();

    console.log('✅ Admin password reset successfully!');
    console.log('📧 Email: admin@kdu.ac.lk');
    console.log('🔐 New Password: Admin@123');
    console.log('⚠️  IMPORTANT: Please change the password immediately after logging in!');
    console.log('⚠️  IMPORTANT: This is a temporary password for emergency access only!');
    
    await mongoose.connection.close();
    process.exit(0);
  } catch (err) {
    console.error('❌ Error resetting admin password:', err);
    
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

resetAdminPassword();


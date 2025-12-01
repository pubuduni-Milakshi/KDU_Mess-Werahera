const nodemailer = require('nodemailer');

// Read email credentials from environment variables for security
const EMAIL_USER = process.env.EMAIL_USER || '';
const EMAIL_PASS = process.env.EMAIL_PASS || '';
const FROM_EMAIL = process.env.FROM_EMAIL || EMAIL_USER;
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';

// Configure your email transport
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: EMAIL_USER,
    pass: EMAIL_PASS
  }
});

// Verify transporter configuration early
transporter.verify().then(() => {
  console.log(`✅ Email transporter is ready (using ${EMAIL_USER || 'no-email-user-configured'})`);
}).catch(err => {
  console.warn('⚠️ Email transporter verification failed:', err && err.message ? err.message : err);
});

// Helper to send mail and return a consistent result object
const sendMail = async (mailOptions) => {
  try {
    const info = await transporter.sendMail(mailOptions);
    return { success: true, response: info, messageId: info.messageId };
  } catch (err) {
    return { success: false, error: err.message || err.toString() };
  }
};

// ========== SEND OTP VERIFICATION EMAIL (NEW) ==========
exports.sendOTPVerificationEmail = async (user, otp) => {
  const mailOptions = {
    from: `"KDU Mess Management" <${FROM_EMAIL}>`,
    replyTo: EMAIL_USER,
    to: user.email,
    subject: 'Email Verification OTP - KDU Mess Management System',
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { 
            font-family: Arial, sans-serif; 
            line-height: 1.6; 
            color: #333; 
            background-color: #f4f4f4;
            margin: 0;
            padding: 0;
          }
          .container { 
            max-width: 600px; 
            margin: 30px auto; 
            padding: 0;
            background-color: #ffffff;
            border-radius: 8px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
          }
          .header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 30px;
            text-align: center;
            border-radius: 8px 8px 0 0;
          }
          .header h1 {
            margin: 0;
            font-size: 24px;
          }
          .content {
            padding: 40px 30px;
          }
          .otp-box {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 30px;
            text-align: center;
            border-radius: 10px;
            margin: 30px 0;
            box-shadow: 0 4px 6px rgba(0,0,0,0.1);
          }
          .otp-code {
            font-size: 48px;
            font-weight: bold;
            letter-spacing: 10px;
            margin: 10px 0;
            font-family: 'Courier New', monospace;
          }
          .footer { 
            margin-top: 30px; 
            padding: 20px 30px;
            font-size: 12px; 
            color: #666; 
            background-color: #f9f9f9;
            border-radius: 0 0 8px 8px;
            text-align: center;
          }
          .warning {
            color: #856404;
            background-color: #fff3cd;
            border: 1px solid #ffeeba;
            padding: 12px;
            border-radius: 5px;
            margin: 20px 0;
            text-align: center;
          }
          .info-box {
            background-color: #d1ecf1;
            border: 1px solid #bee5eb;
            color: #0c5460;
            padding: 15px;
            border-radius: 5px;
            margin: 20px 0;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🎓 KDU Mess Management</h1>
          </div>
          <div class="content">
            <h2>Hello ${user.firstName} ${user.lastName},</h2>
            <p>Thank you for registering with KDU Mess Management System!</p>
            <p>To complete your registration, please use the following One-Time Password (OTP):</p>
            
            <div class="otp-box">
              <p style="margin: 0; font-size: 16px;">Your Verification Code</p>
              <div class="otp-code">${otp}</div>
              <p style="margin: 0; font-size: 14px;">Enter this code to verify your email</p>
            </div>
            
            <div class="info-box">
              <strong>📋 Instructions:</strong>
              <ul style="margin: 10px 0; padding-left: 20px; text-align: left;">
                <li>Go to the verification page</li>
                <li>Enter your email address</li>
                <li>Enter the 6-digit OTP code shown above</li>
                <li>Click "Verify Email" to complete registration</li>
              </ul>
            </div>
            
            <div class="warning">
              <strong>⏰ Important:</strong> This OTP will expire in <strong>10 minutes</strong>.
            </div>
            
            <p style="text-align: center; margin-top: 20px;">
              <strong>Security Tip:</strong> Never share this OTP with anyone. KDU Mess staff will never ask for your OTP.
            </p>
            
            <p>If you did not request this verification, please ignore this email and no account will be created.</p>
          </div>
          <div class="footer">
            <p><strong>Best regards,</strong><br>KDU Mess Management System Team</p>
            <p style="margin-top: 15px; color: #999;">
              This is an automated email. Please do not reply to this message.
            </p>
          </div>
        </div>
      </body>
      </html>
    `
  };
  
  return await sendMail(mailOptions);
};

// ========== SEND VERIFICATION LINK EMAIL (ALTERNATIVE) ==========
exports.sendVerificationEmail = async (user, verificationToken) => {
  const verificationUrl = `${FRONTEND_URL}/verify-email/${verificationToken}`;
  
  const mailOptions = {
    from: `"KDU Mess Management" <${FROM_EMAIL}>`,
    replyTo: EMAIL_USER,
    to: user.email,
    subject: 'Email Verification - KDU Mess Management System',
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { 
            font-family: Arial, sans-serif; 
            line-height: 1.6; 
            color: #333; 
            background-color: #f4f4f4;
            margin: 0;
            padding: 0;
          }
          .container { 
            max-width: 600px; 
            margin: 30px auto; 
            padding: 0;
            background-color: #ffffff;
            border-radius: 8px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
          }
          .header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 30px;
            text-align: center;
            border-radius: 8px 8px 0 0;
          }
          .header h1 {
            margin: 0;
            font-size: 24px;
          }
          .content {
            padding: 40px 30px;
          }
          .button { 
            display: inline-block; 
            padding: 14px 32px; 
            background-color: #667eea; 
            color: white !important; 
            text-decoration: none; 
            border-radius: 5px; 
            margin: 20px 0;
            font-weight: bold;
            text-align: center;
          }
          .button:hover {
            background-color: #5568d3;
          }
          .footer { 
            margin-top: 30px; 
            padding: 20px 30px;
            font-size: 12px; 
            color: #666; 
            background-color: #f9f9f9;
            border-radius: 0 0 8px 8px;
            text-align: center;
          }
          .link-box {
            background-color: #f8f9fa;
            padding: 15px;
            border-radius: 5px;
            margin: 20px 0;
            word-break: break-all;
          }
          .warning {
            color: #856404;
            background-color: #fff3cd;
            border: 1px solid #ffeeba;
            padding: 12px;
            border-radius: 5px;
            margin: 20px 0;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🎓 KDU Mess Management</h1>
          </div>
          <div class="content">
            <h2>Hello ${user.firstName} ${user.lastName},</h2>
            <p>Thank you for registering with KDU Mess Management System!</p>
            <p>Please verify your email address by clicking the button below:</p>
            
            <div style="text-align: center;">
              <a href="${verificationUrl}" class="button">✅ Verify Email Address</a>
            </div>
            
            <p>Or copy and paste this link into your browser:</p>
            <div class="link-box">
              <a href="${verificationUrl}" style="color: #667eea; word-break: break-all;">${verificationUrl}</a>
            </div>
            
            <div class="warning">
              <strong>⏰ Important:</strong> This verification link will expire in 24 hours.
            </div>
            
            <p>If you did not create an account, please ignore this email and no account will be created.</p>
          </div>
          <div class="footer">
            <p><strong>Best regards,</strong><br>KDU Mess Management System Team</p>
            <p style="margin-top: 15px; color: #999;">
              This is an automated email. Please do not reply to this message.
            </p>
          </div>
        </div>
      </body>
      </html>
    `
  };
  
  return await sendMail(mailOptions);
};

// Send welcome email after successful verification
exports.sendWelcomeEmail = async (user) => {
  const mailOptions = {
    from: `"KDU Mess Management" <${FROM_EMAIL}>`,
    replyTo: EMAIL_USER,
    to: user.email,
    subject: '🎉 Welcome to KDU Mess Management System',
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { 
            font-family: Arial, sans-serif; 
            line-height: 1.6; 
            color: #333; 
            background-color: #f4f4f4;
            margin: 0;
            padding: 0;
          }
          .container { 
            max-width: 600px; 
            margin: 30px auto; 
            padding: 0;
            background-color: #ffffff;
            border-radius: 8px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
          }
          .header {
            background: linear-gradient(135deg, #11998e 0%, #38ef7d 100%);
            color: white;
            padding: 30px;
            text-align: center;
            border-radius: 8px 8px 0 0;
          }
          .header h1 {
            margin: 0;
            font-size: 24px;
          }
          .content {
            padding: 40px 30px;
          }
          .button { 
            display: inline-block; 
            padding: 14px 32px; 
            background-color: #11998e; 
            color: white !important; 
            text-decoration: none; 
            border-radius: 5px; 
            margin: 20px 0;
            font-weight: bold;
          }
          .footer { 
            margin-top: 30px; 
            padding: 20px 30px;
            font-size: 12px; 
            color: #666; 
            background-color: #f9f9f9;
            border-radius: 0 0 8px 8px;
            text-align: center;
          }
          .info-card {
            background-color: #e7f3ff;
            border-left: 4px solid #2196F3;
            padding: 15px;
            margin: 20px 0;
            border-radius: 5px;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🎉 Welcome to KDU Mess!</h1>
          </div>
          <div class="content">
            <h2>Hello ${user.firstName} ${user.lastName},</h2>
            <p>Your account has been successfully verified and activated! 🎊</p>
            
            <div class="info-card">
              <strong>📧 Email:</strong> ${user.email}<br>
              <strong>👤 Role:</strong> ${user.role}<br>
              <strong>🆔 User ID:</strong> ${user.roleId || 'N/A'}
            </div>
            
            <p>You can now access all features of the KDU Mess Management System:</p>
            <ul>
              <li>📅 Book meals and tea</li>
              <li>📋 View daily menus</li>
              <li>📊 Track your order history</li>
              <li>💰 View monthly bills</li>
              <li>💬 Provide feedback</li>
            </ul>
            
            <div style="text-align: center;">
              <a href="${FRONTEND_URL}/login" class="button">🔐 Login to Your Account</a>
            </div>
            
            <p style="margin-top: 30px;">If you have any questions or need assistance, please don't hesitate to contact our support team.</p>
          </div>
          <div class="footer">
            <p><strong>Best regards,</strong><br>KDU Mess Management System Team</p>
            <p style="margin-top: 15px; color: #999;">
              This is an automated email. Please do not reply to this message.
            </p>
          </div>
        </div>
      </body>
      </html>
    `
  };
  
  return await sendMail(mailOptions);
};

// Send registration email (kept for backward compatibility)
exports.sendRegistrationEmail = async (user) => {
  return await exports.sendWelcomeEmail(user);
};

// Send password reset email
exports.sendPasswordResetEmail = async (user, resetToken) => {
  const resetUrl = `${FRONTEND_URL}/reset-password/${resetToken}`;
  
  const mailOptions = {
    from: `"KDU Mess Management" <${FROM_EMAIL}>`,
    replyTo: EMAIL_USER,
    to: user.email,
    subject: 'Password Reset Request - KDU Mess Management',
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { 
            font-family: Arial, sans-serif; 
            line-height: 1.6; 
            color: #333; 
            background-color: #f4f4f4;
            margin: 0;
            padding: 0;
          }
          .container { 
            max-width: 600px; 
            margin: 30px auto; 
            padding: 0;
            background-color: #ffffff;
            border-radius: 8px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
          }
          .header {
            background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
            color: white;
            padding: 30px;
            text-align: center;
            border-radius: 8px 8px 0 0;
          }
          .header h1 {
            margin: 0;
            font-size: 24px;
          }
          .content {
            padding: 40px 30px;
          }
          .button { 
            display: inline-block; 
            padding: 14px 32px; 
            background-color: #f5576c; 
            color: white !important; 
            text-decoration: none; 
            border-radius: 5px; 
            margin: 20px 0;
            font-weight: bold;
          }
          .button:hover {
            background-color: #e0445b;
          }
          .footer { 
            margin-top: 30px; 
            padding: 20px 30px;
            font-size: 12px; 
            color: #666; 
            background-color: #f9f9f9;
            border-radius: 0 0 8px 8px;
            text-align: center;
          }
          .link-box {
            background-color: #f8f9fa;
            padding: 15px;
            border-radius: 5px;
            margin: 20px 0;
            word-break: break-all;
          }
          .warning {
            color: #721c24;
            background-color: #f8d7da;
            border: 1px solid #f5c6cb;
            padding: 12px;
            border-radius: 5px;
            margin: 20px 0;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🔐 Password Reset Request</h1>
          </div>
          <div class="content">
            <h2>Hello ${user.firstName} ${user.lastName},</h2>
            <p>You have requested to reset your password for KDU Mess Management System.</p>
            <p>Click the button below to reset your password:</p>
            
            <div style="text-align: center;">
              <a href="${resetUrl}" class="button">🔑 Reset Password</a>
            </div>
            
            <p>Or copy and paste this link into your browser:</p>
            <div class="link-box">
              <a href="${resetUrl}" style="color: #f5576c; word-break: break-all;">${resetUrl}</a>
            </div>
            
            <div class="warning">
              <strong>⏰ Important:</strong> This link will expire in 10 minutes for security reasons.
            </div>
            
            <p>If you did not request this password reset, please ignore this email and your password will remain unchanged.</p>
            <p>For security reasons, we recommend that you change your password regularly and use a strong, unique password.</p>
          </div>
          <div class="footer">
            <p><strong>Best regards,</strong><br>KDU Mess Management System Team</p>
            <p style="margin-top: 15px; color: #999;">
              This is an automated email. Please do not reply to this message.
            </p>
          </div>
        </div>
      </body>
      </html>
    `
  };
  
  return await sendMail(mailOptions);
};

// Send password reset confirmation email
exports.sendPasswordResetConfirmation = async (user) => {
  const mailOptions = {
    from: `"KDU Mess Management" <${FROM_EMAIL}>`,
    replyTo: EMAIL_USER,
    to: user.email,
    subject: 'Password Successfully Reset - KDU Mess Management',
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { 
            font-family: Arial, sans-serif; 
            line-height: 1.6; 
            color: #333; 
            background-color: #f4f4f4;
            margin: 0;
            padding: 0;
          }
          .container { 
            max-width: 600px; 
            margin: 30px auto; 
            padding: 0;
            background-color: #ffffff;
            border-radius: 8px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
          }
          .header {
            background: linear-gradient(135deg, #11998e 0%, #38ef7d 100%);
            color: white;
            padding: 30px;
            text-align: center;
            border-radius: 8px 8px 0 0;
          }
          .header h1 {
            margin: 0;
            font-size: 24px;
          }
          .content {
            padding: 40px 30px;
          }
          .button { 
            display: inline-block; 
            padding: 14px 32px; 
            background-color: #11998e; 
            color: white !important; 
            text-decoration: none; 
            border-radius: 5px; 
            margin: 20px 0;
            font-weight: bold;
          }
          .footer { 
            margin-top: 30px; 
            padding: 20px 30px;
            font-size: 12px; 
            color: #666; 
            background-color: #f9f9f9;
            border-radius: 0 0 8px 8px;
            text-align: center;
          }
          .success-box {
            background-color: #d4edda;
            border: 1px solid #c3e6cb;
            color: #155724;
            padding: 15px;
            border-radius: 5px;
            margin: 20px 0;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>✅ Password Reset Successful</h1>
          </div>
          <div class="content">
            <h2>Hello ${user.firstName} ${user.lastName},</h2>
            
            <div class="success-box">
              <strong>✓ Success!</strong> Your password has been successfully reset.
            </div>
            
            <p>You can now log in to your account using your new password.</p>
            
            <div style="text-align: center;">
              <a href="${FRONTEND_URL}/login" class="button">🔐 Login to Your Account</a>
            </div>
            
            <p><strong>If you did not make this change:</strong></p>
            <p>Please contact our support team immediately to secure your account.</p>
          </div>
          <div class="footer">
            <p><strong>Best regards,</strong><br>KDU Mess Management System Team</p>
            <p style="margin-top: 15px; color: #999;">
              This is an automated email. Please do not reply to this message.
            </p>
          </div>
        </div>
      </body>
      </html>
    `
  };
  
  return await sendMail(mailOptions);
};
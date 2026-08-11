import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

/**
 * Send verification email to newly registered user
 * @param {Object} userData - User data object containing firstName, lastName, email
 * @param {String} verificationToken - JWT token for email verification
 * @returns {Object} - { success: boolean, error?: string }
 */
export const sendVerificationEmail = async (userData, verificationToken) => {
  try {
    // ✅ CRITICAL: Validate inputs before proceeding
    if (!userData) {
      console.error('❌ sendVerificationEmail: userData is undefined or null');
      return { 
        success: false, 
        error: 'User data is required' 
      };
    }

    if (!userData.email) {
      console.error('❌ sendVerificationEmail: email is missing from userData');
      return { 
        success: false, 
        error: 'User email is required' 
      };
    }

    if (!userData.firstName) {
      console.error('❌ sendVerificationEmail: firstName is missing from userData');
      return { 
        success: false, 
        error: 'User firstName is required' 
      };
    }

    if (!verificationToken) {
      console.error('❌ sendVerificationEmail: verificationToken is missing');
      return { 
        success: false, 
        error: 'Verification token is required' 
      };
    }

    //  All validations passed, proceed with email sending
    console.log('📧 Sending verification email to:', userData.email);
    console.log('👤 User name:', userData.firstName, userData.lastName);

    const emailData = {
      to: userData.email,
      subject: 'Verify Your KDU Mess Account',
      firstName: userData.firstName,
      lastName: userData.lastName || '',
      verificationToken: verificationToken
    };

    // Send email via backend API
    const response = await axios.post(`${API_URL}/email/send-verification`, emailData);

    if (response.data.success) {
      console.log('✅ Verification email sent successfully to:', userData.email);
      return { success: true };
    } else {
      console.error('❌ Email API returned failure:', response.data);
      return { 
        success: false, 
        error: response.data.message || 'Email sending failed' 
      };
    }

  } catch (error) {
    console.error('❌ Verification email failed:', error);
    
    // Log detailed error information
    if (error.response) {
      console.error('Response error:', error.response.data);
      console.error('Status:', error.response.status);
    } else if (error.request) {
      console.error('No response received:', error.request);
    } else {
      console.error('Error message:', error.message);
    }

    return { 
      success: false, 
      error: error.response?.data?.message || error.message || 'Failed to send verification email' 
    };
  }
};

/**
 * Resend verification email to user
 * @param {String} email - User email address
 * @returns {Object} - { success: boolean, error?: string }
 */
export const resendVerificationEmail = async (email) => {
  try {
    if (!email) {
      return { 
        success: false, 
        error: 'Email is required' 
      };
    }

    console.log('📧 Resending verification email to:', email);

    const response = await axios.post(`${API_URL}/email/resend-verification`, { email });

    if (response.data.success) {
      console.log('✅ Verification email resent successfully');
      return { success: true };
    } else {
      return { 
        success: false, 
        error: response.data.message || 'Failed to resend email' 
      };
    }

  } catch (error) {
    console.error('❌ Resend verification email failed:', error);
    return { 
      success: false, 
      error: error.response?.data?.message || error.message || 'Failed to resend verification email' 
    };
  }
};

const emailService = {
  sendVerificationEmail,
  resendVerificationEmail
};

export default emailService;
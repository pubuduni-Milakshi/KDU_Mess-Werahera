import React, { useState } from 'react';
import { Eye, EyeOff, Lock, Mail, AlertCircle } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import axios from '../api/axios';
import loginBg from '../images/logbg.jpg';
import logo from '../images/logo.png';

const Login = () => {
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [emailNotVerified, setEmailNotVerified] = useState(false); // ✅ NEW
  const navigate = useNavigate();

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
    setEmailNotVerified(false); // ✅ Reset email verification warning
  };

  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.email) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Email is invalid';
    }
    
    if (!formData.password) {
      newErrors.password = 'Password is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    setLoading(true);
    setErrors({});
    setEmailNotVerified(false);

    try {
      console.log('🔐 Attempting login with:', formData.email);

      const response = await axios.post('/auth/login', {
        email: formData.email.trim(), // ✅ Trim whitespace
        password: formData.password
      });

      if (response.data) {
        console.log('✅ Login successful:', response.data.user.role);
        
        localStorage.setItem('token', response.data.token);
        localStorage.setItem('user', JSON.stringify(response.data.user));
        
        const userRole = response.data.user.role;
        
        // ✅ Role-based navigation
        if (userRole === 'Admin') {
          navigate('/admin-dashboard');
        } else if (userRole === 'Day Scholar') {
          navigate('/day-scholar-dashboard');
        } else if (userRole === 'Officer Cadet') {
          navigate('/officer-cadet-dashboard'); 
        } else if (userRole === 'Mess Staff') {
          navigate('/mess-staff-dashboard'); 
        } else {
          navigate('/view-menu');
        }
      }
    } catch (error) {
      console.error('❌ Login error:', error);
      console.error('❌ Error response:', error.response?.data);
      console.error('❌ Error status:', error.response?.status);

      if (error.response) {
        const { status, data } = error.response;
        
        // ✅ Handle 403 - Email not verified
        if (status === 403 && data.emailNotVerified) {
          setEmailNotVerified(true);
          setErrors({ 
            submit: data.msg || 'Please verify your email before logging in. Check your inbox for the verification link.' 
          });
        }
        // ✅ Handle 400 - Invalid credentials
        else if (status === 400) {
          setErrors({ 
            submit: data.msg || 'Invalid email or password. Please try again.' 
          });
        }
        // ✅ Handle other errors
        else {
          setErrors({ 
            submit: data.msg || 'Login failed. Please try again.' 
          });
        }
      } else if (error.request) {
        // ✅ Network error
        setErrors({ 
          submit: 'Cannot connect to server. Please check your internet connection.' 
        });
      } else {
        setErrors({ 
          submit: 'An unexpected error occurred. Please try again.' 
        });
      }
    } finally {
      setLoading(false);
    }
  };

  // ✅ NEW: Handle resend verification email
  const handleResendVerification = async () => {
    try {
      setLoading(true);
      await axios.post('/auth/resend-verification', {
        email: formData.email.trim()
      });
      setErrors({ 
        submit: '✅ Verification email sent! Please check your inbox.' 
      });
    } catch (error) {
      setErrors({ 
        submit: error.response?.data?.msg || 'Failed to resend verification email.' 
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div 
      className="min-h-screen flex items-center justify-center p-4 bg-cover bg-center bg-no-repeat relative"
      style={{
        backgroundImage: `url(${loginBg})`
      }}
    >
      {/* Dark Overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-blue-950/80 via-blue-900/75 to-blue-800/80"></div>
      
      {/* Login Card */}
      <div className="relative z-10 bg-white/95 backdrop-blur-sm rounded-2xl shadow-2xl w-full max-w-md p-8">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <img 
              src={logo} 
              alt="KDU Logo" 
              className="w-20 h-20 object-contain"
            />
          </div>
          <h1 className="text-3xl font-bold text-blue-950">KDU Mess</h1>
          <p className="text-gray-600 mt-2">General Sir John Kotelawala Defence University</p>
          <p className="text-lg font-semibold text-blue-700 mt-4">Sign In</p>
        </div>

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Email */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Mail className="inline w-4 h-4 mr-2 text-blue-700" />
              Email Address *
            </label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleInputChange}
              placeholder="Enter your email"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors bg-white"
            />
            {errors.email && <p className="text-red-500 text-sm mt-1">{errors.email}</p>}
          </div>

          {/* Password */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Lock className="inline w-4 h-4 mr-2 text-blue-700" />
              Password *
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                name="password"
                value={formData.password}
                onChange={handleInputChange}
                placeholder="Enter your password"
                className="w-full px-4 py-3 pr-12 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors bg-white"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-blue-700"
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
            {errors.password && <p className="text-red-500 text-sm mt-1">{errors.password}</p>}
          </div>

          {/* Forgot Password Link */}
          <div className="text-right">
            <Link 
              to="/forgot-password" 
              className="text-sm text-blue-700 hover:text-blue-800 font-medium"
            >
              Forgot Password?
            </Link>
          </div>

          {/* Error Message */}
          {errors.submit && (
            <div className={`border px-4 py-3 rounded-lg flex items-start ${
              errors.submit.includes('✅') 
                ? 'bg-green-50 border-green-200 text-green-700' 
                : 'bg-red-50 border-red-200 text-red-700'
            }`}>
              <AlertCircle className="w-5 h-5 mr-2 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p>{errors.submit}</p>
                {/* ✅ Show resend verification button if email not verified */}
                {emailNotVerified && (
                  <button
                    type="button"
                    onClick={handleResendVerification}
                    disabled={loading}
                    className="mt-2 text-sm text-blue-700 hover:text-blue-800 font-medium underline"
                  >
                    Resend Verification Email
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-blue-900 to-amber-500 text-white py-3 px-4 rounded-lg font-semibold hover:from-blue-950 hover:to-amber-600 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-md"
          >
            {loading ? 'Signing In...' : 'Sign In'}
          </button>

          {/* Register Link */}
          <div className="text-center">
            <p className="text-gray-600">
              Don't have an account?{' '}
              <Link 
                to="/register" 
                className="text-blue-700 hover:text-blue-800 font-semibold"
              >
                Register here
              </Link>
            </p>
          </div>
        </form>

        {/* Footer */}
        <div className="mt-8 text-center text-sm text-gray-600">
          <p className="font-medium text-blue-950">© 2025 KDU Mess Management System</p>
          <p className="mt-1">Developed for General Sir John Kotelawala Defence University</p>
        </div>
      </div>
    </div>
  );
};

export default Login;
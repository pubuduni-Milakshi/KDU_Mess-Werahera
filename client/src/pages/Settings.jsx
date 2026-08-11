import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  User,
  Save,
  Mail,
  Phone,
  Home,
  Calendar,
  UtensilsCrossed,
  BookOpen,
  History,
  MessageSquare,
  Settings as SettingsIcon,
  FileText,
  LogOut,
  Clock,
  Users as UsersIcon,
  ClipboardList,
  Camera
} from 'lucide-react';
import axios from '../api/axios';

export default function Settings() {
  const navigate = useNavigate();
  const location = useLocation();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('profile');
  const [profilePicturePreview, setProfilePicturePreview] = useState(null);

  // Profile states
  const [profileData, setProfileData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    contact: '',
    roomNo: '',
    roleId: '',
    role: '',
    profilePicture: ''
  });


  // Admin: Officer Cadet allowance
  const [allowanceValue, setAllowanceValue] = useState('');
  const [allowanceLoading, setAllowanceLoading] = useState(false);

  useEffect(() => {
    const userData = JSON.parse(localStorage.getItem('user'));
    if (!userData) {
      alert('Please login first');
      navigate('/login');
      return;
    }
    setUser(userData);
    fetchUserProfile();

    if (userData?.role === 'Admin') {
      fetchAllowanceSetting();
    }
  }, [navigate]);


  const fetchUserProfile = async () => {
    try {
      const response = await axios.get('/settings/profile');
      setProfileData({
        firstName: response.data.firstName || '',
        lastName: response.data.lastName || '',
        email: response.data.email || '',
        contact: response.data.contact || '',
        roomNo: response.data.roomNo || '',
        roleId: response.data.roleId || '',
        role: response.data.role || '',
        profilePicture: response.data.profilePicture || ''
      });
      
      // IMPORTANT: Set the preview from the server response
      if (response.data.profilePicture) {
        const imageUrl = `http://localhost:5000${response.data.profilePicture}`;
        console.log('Loading profile picture:', imageUrl);
        setProfilePicturePreview(imageUrl);
      } else {
        console.log('No profile picture found in response');
        setProfilePicturePreview(null);
      }
    } catch (err) {
      console.error('Error fetching profile:', err);
    }
  };

  const handleProfilePictureChange = async (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        alert('File size must be less than 5MB');
        return;
      }
      if (!file.type.startsWith('image/')) {
        alert('Please upload an image file');
        return;
      }
      
      // Upload immediately (DON'T show temp preview first)
      setLoading(true);
      const formData = new FormData();
      formData.append('profilePicture', file);

      try {
        const response = await axios.post('/settings/profile-picture', formData, {
          headers: {
            'Content-Type': 'multipart/form-data'
          }
        });
        
        console.log('Upload response:', response.data);
        
        // CRITICAL: Set the permanent server URL FIRST
        if (response.data.profilePicture) {
          const serverImageUrl = `http://localhost:5000${response.data.profilePicture}`;
          console.log('Setting server image URL:', serverImageUrl);
          
          // Update BOTH states with server URL
          setProfilePicturePreview(serverImageUrl);
          setProfileData(prev => ({
            ...prev,
            profilePicture: response.data.profilePicture
          }));
          
          // Wait a moment for state to update
          await new Promise(resolve => setTimeout(resolve, 100));
        }
        
        // Refresh profile data from server to ensure sync
        await fetchUserProfile();
        
        // Show success message AFTER everything is set
        alert('Profile picture uploaded successfully!');
        
      } catch (err) {
        console.error('Upload error:', err);
        alert(err.response?.data?.msg || 'Failed to upload profile picture');
        
        // Restore old picture on error
        if (profileData.profilePicture) {
          setProfilePicturePreview(`http://localhost:5000${profileData.profilePicture}`);
        } else {
          setProfilePicturePreview(null);
        }
      }
      setLoading(false);
    }
  };

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    
    // Validate contact number before sending
    const contact = profileData.contact?.trim() || '';
    
    if (!contact) {
      alert('Please enter a contact number');
      return;
    }
    
    // Clean contact number (remove +94, spaces, dashes, parentheses)
    const cleanedContact = contact.replace(/^\+94/, '').replace(/[\s\-()]/g, '');
    
    // Validate: must be exactly 10 digits
    if (!/^\d{10}$/.test(cleanedContact)) {
      alert('Contact number must be exactly 10 digits (numbers only). Example: 0712345678');
      return;
    }
    
    setLoading(true);
    try {
      // Send cleaned contact number
      await axios.put('/settings/profile', {
        contact: cleanedContact
      });
      
      alert('Contact number updated successfully!');
      
      // Update local storage with the cleaned contact
      const updatedUser = { ...user, contact: cleanedContact };
      localStorage.setItem('user', JSON.stringify(updatedUser));
      setUser(updatedUser);
      
      // Update profileData with cleaned contact
      setProfileData(prev => ({ ...prev, contact: cleanedContact }));
      
      // Refresh profile data from server to ensure sync
      await fetchUserProfile();
    } catch (err) {
      console.error('Error updating profile:', err);
      console.error('Error response:', err.response?.data);
      
      // Extract error message from response
      let errorMsg = 'Failed to update contact number';
      if (err.response?.data) {
        if (err.response.data.errors && Array.isArray(err.response.data.errors)) {
          errorMsg = err.response.data.errors.join(', ');
        } else if (err.response.data.msg) {
          errorMsg = err.response.data.msg;
        } else if (err.response.data.error) {
          errorMsg = err.response.data.error;
        }
      } else if (err.message) {
        errorMsg = err.message;
      }
      
      alert(errorMsg);
    }
    setLoading(false);
  };


  const fetchAllowanceSetting = async () => {
    try {
      const response = await axios.get('/bills/settings/allowance');
      setAllowanceValue(response.data.value?.toString() || '');
    } catch (err) {
      console.error('Error fetching allowance setting:', err);
    }
  };

  const handleUpdateAllowance = async (e) => {
    e.preventDefault();
    if (!allowanceValue) {
      alert('Please enter an allowance amount.');
      return;
    }

    const numeric = Number(allowanceValue);
    if (Number.isNaN(numeric) || numeric <= 0) {
      alert('Allowance must be a positive number.');
      return;
    }

    setAllowanceLoading(true);
    try {
      const response = await axios.put('/bills/settings/allowance', { value: numeric });
      setAllowanceValue(response.data.value?.toString() || allowanceValue);
      alert('Monthly allowance updated successfully.');
    } catch (err) {
      console.error('Error updating allowance setting:', err);
      alert(err.response?.data?.msg || 'Failed to update allowance.');
    }
    setAllowanceLoading(false);
  };

  const handleLogout = () => {
    localStorage.removeItem('user');
    localStorage.removeItem('token');
    navigate('/login');
  };

  const isAdmin = user?.role === 'Admin';

  // Sidebar navigation based on role
  const getNavigationItems = () => {
    if (user?.role === 'Admin') {
      return [
        { icon: Calendar, label: 'Dashboard', path: '/admin-dashboard' },
        { icon: BookOpen, label: 'View Menu', path: '/view-menu' },
        { icon: UtensilsCrossed, label: 'Menu Management', path: '/menu-management' },
        { icon: ClipboardList, label: 'Orders Management', path: '/orders-management' },
        { icon: UsersIcon, label: 'User Management', path: '/user-management' },
        { icon: FileText, label: 'Reports', path: '/reports' },
        { icon: MessageSquare, label: 'Feedback', path: '/feedback' },
        { icon: SettingsIcon, label: 'Settings', path: '/settings' }
      ];
    } else if (user?.role === 'Mess Staff') {
      return [
        { icon: Calendar, label: 'Dashboard', path: '/mess-staff-dashboard' },
        { icon: BookOpen, label: 'View Menu', path: '/view-menu' },
        { icon: UtensilsCrossed, label: 'Menu Management', path: '/menu-management' },
        { icon: ClipboardList, label: 'Orders Management', path: '/orders-management' },
        { icon: FileText, label: 'Reports', path: '/reports' },
        { icon: MessageSquare, label: 'Feedback', path: '/feedback' },
        { icon: SettingsIcon, label: 'Settings', path: '/settings' }
      ];
    } else if (user?.role === 'Day Scholar') {
      return [
        { icon: Calendar, label: 'Dashboard', path: '/day-scholar-dashboard' },
        { icon: UtensilsCrossed, label: 'Menu Page', path: '/view-menu' },
        { icon: BookOpen, label: 'Booking', path: '/booking' },
        { icon: Clock, label: 'Cancellation', path: '/cancel-booking' },
        { icon: History, label: 'Order History', path: '/order-history' },
        { icon: MessageSquare, label: 'Feedback', path: '/feedback' },
        { icon: SettingsIcon, label: 'Settings', path: '/settings' },
        { icon: FileText, label: 'Monthly Bill', path: '/monthly-bill' }
      ];
    } else if (user?.role === 'Officer Cadet') {
      return [
        { icon: Calendar, label: 'Dashboard', path: '/officer-cadet-dashboard' },
        { icon: UtensilsCrossed, label: 'Menu Page', path: '/view-menu' },
        { icon: BookOpen, label: 'Booking', path: '/booking' },
        { icon: History, label: 'Order History', path: '/order-history' },
        { icon: FileText, label: 'Monthly Bill', path: '/monthly-bill' },
        { icon: SettingsIcon, label: 'Settings', path: '/settings' }
      ];
    }
    return [];
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-950 via-blue-900 to-blue-800">
      <div className="flex">
        {/* Sidebar */}
        <div className="w-64 bg-white min-h-screen shadow-xl flex flex-col">
          <div className="p-6">
            <h1 className="text-2xl font-bold text-blue-950">KDU Mess</h1>
            <p className="text-sm text-gray-600 mt-1">{user?.role} Portal</p>
          </div>

          <nav className="px-4 space-y-2 flex-1">
            {getNavigationItems().map((item, index) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;
              return (
                <button
                  key={index}
                  onClick={() => navigate(item.path)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg font-medium transition-colors ${
                    isActive
                      ? 'bg-blue-50 text-blue-700'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  <Icon className="w-5 h-5 flex-shrink-0" />
                  <span className="whitespace-nowrap">{item.label}</span>
                </button>
              );
            })}
          </nav>

          <div className="p-4">
            <button
              onClick={handleLogout}
              className="w-full flex items-center justify-center gap-3 px-4 py-3 text-red-600 hover:bg-red-50 rounded-lg font-medium transition-colors"
            >
              <LogOut className="w-5 h-5" />
              <span>Logout</span>
            </button>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 p-8 overflow-y-auto">
          <div className="max-w-full mx-auto px-4">
            {/* Header */}
            <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
              <h1 className="text-3xl font-bold text-blue-950">Settings</h1>
              <p className="text-gray-600 mt-1">Manage your account settings and preferences</p>
            </div>

            {/* Tabs */}
            <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
              <div className="flex gap-4 border-b border-gray-200">
                <button
                  onClick={() => setActiveTab('profile')}
                  className={`pb-3 px-4 font-medium transition-all ${
                    activeTab === 'profile' 
                      ? 'text-blue-700 border-b-2 border-blue-700' 
                      : 'text-gray-600'
                  }`}
                >
                  <User className="inline w-4 h-4 mr-2" />
                  Profile
                </button>
                {isAdmin && (
                  <button
                    onClick={() => setActiveTab('allowance')}
                    className={`pb-3 px-4 font-medium transition-all ${
                      activeTab === 'allowance' 
                        ? 'text-blue-700 border-b-2 border-blue-700' 
                        : 'text-gray-600'
                    }`}
                  >
                    <FileText className="inline w-4 h-4 mr-2" />
                    Cadet Allowance
                  </button>
                )}
              </div>
            </div>

            {/* Profile Tab */}
            {activeTab === 'profile' && (
              <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
                <h2 className="text-xl font-bold mb-6 text-blue-950">Profile Information</h2>
                
                {/* Profile Picture Section */}
                <div className="mb-8 flex items-center gap-6 pb-6 border-b border-gray-200">
                  <div className="relative">
                    <div className="w-32 h-32 rounded-full overflow-hidden bg-gray-200 flex items-center justify-center border-4 border-white shadow-lg">
                      {profilePicturePreview ? (
                        <img src={profilePicturePreview} alt="Profile" className="w-full h-full object-cover" />
                      ) : (
                        <User className="w-16 h-16 text-gray-400" />
                      )}
                    </div>
                    <label className={`absolute bottom-0 right-0 bg-blue-900 text-white p-2 rounded-full cursor-pointer hover:bg-blue-950 transition-colors ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}>
                      <Camera className="w-5 h-5" />
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleProfilePictureChange}
                        className="hidden"
                        disabled={loading}
                      />
                    </label>
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-800 mb-2">Profile Picture</h3>
                    <p className="text-sm text-gray-600 mb-1">Click the camera icon to upload (Max 5MB)</p>
                    <p className="text-xs text-green-600 font-medium">✓ Uploads automatically when you select a file</p>
                  </div>
                </div>

                <form onSubmit={handleUpdateProfile}>
                  <div className="grid grid-cols-2 gap-6">
                    {/* Read-only fields */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        User ID
                      </label>
                      <input
                        type="text"
                        value={profileData.roleId}
                        disabled
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-100 text-gray-600 cursor-not-allowed"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Role
                      </label>
                      <input
                        type="text"
                        value={profileData.role}
                        disabled
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-100 text-gray-600 cursor-not-allowed"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        First Name
                      </label>
                      <input
                        type="text"
                        value={profileData.firstName}
                        disabled
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-100 text-gray-600 cursor-not-allowed"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Last Name
                      </label>
                      <input
                        type="text"
                        value={profileData.lastName}
                        disabled
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-100 text-gray-600 cursor-not-allowed"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        <Mail className="inline w-4 h-4 mr-2" />
                        Email
                      </label>
                      <input
                        type="email"
                        value={profileData.email}
                        disabled
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-100 text-gray-600 cursor-not-allowed"
                      />
                    </div>
                    
                    {/* Editable field - Contact Number */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        <Phone className="inline w-4 h-4 mr-2" />
                        Contact Number <span className="text-green-600">(Editable)</span>
                      </label>
                      <input
                        type="tel"
                        value={profileData.contact}
                        onChange={(e) => setProfileData({...profileData, contact: e.target.value})}
                        className="w-full px-4 py-2 border-2 border-green-500 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                        placeholder="Enter your mobile number"
                      />
                    </div>

                    {/* Read-only Room Number */}
                    {profileData.roomNo && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          <Home className="inline w-4 h-4 mr-2" />
                          Room Number
                        </label>
                        <input
                          type="text"
                          value={profileData.roomNo}
                          disabled
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-100 text-gray-600 cursor-not-allowed"
                        />
                      </div>
                    )}
                  </div>

                  <div className="mt-6 bg-blue-50 border-l-4 border-blue-900 p-4 rounded-lg">
                    <p className="text-sm text-blue-900">
                      <strong>Note:</strong> Only your contact number can be updated. To change other information, please contact the administrator.
                    </p>
                  </div>
                  
                  <div className="mt-6 flex justify-end">
                    <button
                      type="submit"
                      disabled={loading}
                      className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-900 to-amber-500 text-white rounded-lg font-semibold hover:from-blue-950 hover:to-amber-600 transition-all disabled:opacity-50"
                    >
                      <Save className="w-5 h-5" />
                      {loading ? 'Saving...' : 'Save Changes'}
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* Admin: Allowance Tab */}
            {activeTab === 'allowance' && isAdmin && (
              <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
                <h2 className="text-xl font-bold mb-4 text-blue-950">Officer Cadet Monthly Allowance</h2>
                <p className="text-sm text-gray-600 mb-6">
                  Set the monthly mess allowance (Rs.) for Officer Cadets. This value is used when calculating their remaining balance in the Monthly Bill.
                </p>
                <form onSubmit={handleUpdateAllowance} className="space-y-4 max-w-md">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Allowance Amount (Rs.)
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="1"
                      value={allowanceValue}
                      onChange={(e) => setAllowanceValue(e.target.value)}
                      className="w-full px-4 py-2 border-2 border-blue-500 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-600"
                      placeholder="Enter monthly allowance, e.g. 36000"
                    />
                  </div>

                  <div className="bg-blue-50 border-l-4 border-blue-900 p-4 rounded-lg text-sm text-blue-900">
                    Changes apply to new monthly bill calculations immediately. Existing historical bills are not modified.
                  </div>

                  <div className="mt-4 flex justify-end">
                    <button
                      type="submit"
                      disabled={allowanceLoading}
                      className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-900 to-amber-500 text-white rounded-lg font-semibold hover:from-blue-950 hover:to-amber-600 transition-all disabled:opacity-50"
                    >
                      <Save className="w-5 h-5" />
                      {allowanceLoading ? 'Saving...' : 'Save Allowance'}
                    </button>
                  </div>
                </form>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
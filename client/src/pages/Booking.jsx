import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Coffee,
  Sun,
  Moon,
  Check,
  Clock,
  UtensilsCrossed,
  BookOpen,
  History,
  Settings,
  FileText,
  LogOut,
  LayoutDashboard,
  Ban,
  Calendar
} from 'lucide-react';
import axios from '../api/axios';

//  MEAL IMAGES 
const MEAL_IMAGES = {
  Breakfast: 'https://images.unsplash.com/photo-1533089860892-a7c6f0a88666?w=400',
  Lunch: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400',
  Dinner: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=400',
  'Morning Tea': 'https://images.unsplash.com/photo-1556679343-c7306c1976bc?w=400',
  'Mid-Morning Tea': 'https://images.unsplash.com/photo-1556679343-c7306c1976bc?w=400',
  'Evening Tea': 'https://images.unsplash.com/photo-1556679343-c7306c1976bc?w=400',
  'Night Tea': 'https://images.unsplash.com/photo-1556679343-c7306c1976bc?w=400',
  default: 'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=400'
};

const MEAL_PRICES = {
  Breakfast: 250,
  Lunch: 400,
  Dinner: 250,
  'Morning Tea': 100,
  'Mid-Morning Tea': 100,
  'Evening Tea': 100,
  'Night Tea': 100
};

// Helper function to get meal image
const getMealImage = (mealType) => {
  return MEAL_IMAGES[mealType] || MEAL_IMAGES.default;
};

export default function Booking() {
  const navigate = useNavigate();
  const location = useLocation();
  const [user, setUser] = useState(null);
  const [availableDates, setAvailableDates] = useState([]);
  const [myBookings, setMyBookings] = useState([]);
  const [loading, setLoading] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [selectedDate, setSelectedDate] = useState('');

  const fetchAvailableDates = useCallback(async () => {
    try {
      const response = await axios.get('/bookings/available-dates');
      const allDates = response.data || [];
      
      // Filter to only show today and future dates
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const filteredDates = allDates.filter(dateInfo => {
        const date = new Date(dateInfo.date);
        date.setHours(0, 0, 0, 0);
        return date >= today;
      });
      
      setAvailableDates(filteredDates);
      
      // Set default selected date to today if available
      if (filteredDates.length > 0 && !selectedDate) {
        const todayStr = today.toISOString().split('T')[0];
        const todayDateInfo = filteredDates.find(d => d.date === todayStr);
        if (todayDateInfo) {
          setSelectedDate(todayStr);
        } else {
          setSelectedDate(filteredDates[0].date);
        }
      }
    } catch (err) {
      console.error('Error fetching dates:', err);
    }
  }, [selectedDate]);

  const fetchMyBookings = useCallback(async () => {
    try {
      const response = await axios.get('/bookings/my-bookings');
      console.log('📋 Fetched bookings:', response.data);
      
      const allBookings = response.data || [];
      
      // Filter out cancelled bookings that have been re-booked
      // A cancelled booking is considered re-booked if there's a confirmed booking
      // for the same date and meal type
      const filteredBookings = allBookings.filter(booking => {
        // If booking is cancelled, check if it has been re-booked
        if (booking.status === 'Cancelled') {
          const bookingDate = normalizeDate(booking.orderDate || booking.date);
          if (!bookingDate) return true; // Keep if date is invalid
          
          const isRebooked = allBookings.some(otherBooking => {
            if (otherBooking._id === booking._id) return false; // Skip self
            if (otherBooking.status === 'Cancelled') return false; // Only check confirmed bookings
            
            const otherDate = normalizeDate(otherBooking.orderDate || otherBooking.date);
            return otherDate === bookingDate && 
                   otherBooking.mealType === booking.mealType &&
                   (otherBooking.status === 'Confirmed' || otherBooking.status === 'Pending' || otherBooking.status === 'Booked');
          });
          
          // Remove cancelled booking if it has been re-booked
          return !isRebooked;
        }
        
        // Keep all non-cancelled bookings
        return true;
      });
      
      const cancelledBookings = filteredBookings.filter(b => b.status === 'Cancelled');
      if (cancelledBookings.length > 0) {
        console.log('❌ Cancelled bookings found:', cancelledBookings);
      }
      
      setMyBookings(filteredBookings);
    } catch (err) {
      console.error('Error fetching bookings:', err);
      setMyBookings([]);
    }
  }, []);

  useEffect(() => {
    const userData = JSON.parse(localStorage.getItem('user'));
    if (!userData) {
      alert('Please login first');
      navigate('/login');
      return;
    }
    setUser(userData);
    fetchAvailableDates();
    fetchMyBookings();

    // Listen for booking updates from other pages
    const handleBookingUpdate = () => {
      fetchMyBookings();
      fetchAvailableDates();
    };
    window.addEventListener('bookingUpdated', handleBookingUpdate);

    return () => {
      window.removeEventListener('bookingUpdated', handleBookingUpdate);
    };
  }, [navigate, fetchMyBookings, fetchAvailableDates]);

  const handleBooking = async (date, mealType) => {
    setLoading(true);
    try {
      await axios.post('/bookings/create', {
        date,
        mealType,
        category: mealType.includes('Tea') ? 'Beverage' : 'Vegetarian'
      });
      alert(`${mealType} booked successfully!`);
      await fetchMyBookings();
    } catch (err) {
      alert(err.response?.data?.msg || 'Failed to book');
    }
    setLoading(false);
  };

  const handleCancelBooking = async (orderId, mealType) => {
    if (!window.confirm(`Are you sure you want to cancel ${mealType}?`)) {
      return;
    }

    setLoading(true);
    try {
      console.log('🗑️ Cancelling booking:', orderId);
      const response = await axios.delete(`/bookings/cancel/${orderId}`);
      console.log('✅ Cancel response:', response.data);
      
      await new Promise(resolve => setTimeout(resolve, 500));
      await fetchMyBookings();
      setRefreshKey(prev => prev + 1);
      
      alert('Booking cancelled successfully!');
    } catch (err) {
      console.error('❌ Cancel error:', err);
      alert(err.response?.data?.msg || 'Failed to cancel booking');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('user');
    localStorage.removeItem('token');
    navigate('/login');
  };

  const normalizeDate = (dateValue) => {
    if (!dateValue) return null;
    try {
      if (typeof dateValue === 'string') {
        return dateValue.split('T')[0];
      }
      return new Date(dateValue).toISOString().split('T')[0];
    } catch (e) {
      console.error('Date normalization error:', e);
      return null;
    }
  };

  const isBooked = (date, mealType) => {
    const booking = myBookings.find(b => {
      const bookingDate = normalizeDate(b.orderDate || b.date);
      const matches = bookingDate === date && b.mealType === mealType;
      
      if (matches) {
        console.log(`🔍 Found booking for ${mealType} on ${date}:`, {
          status: b.status,
          bookingId: b._id,
          isBooked: b.status !== 'Cancelled'
        });
      }
      
      return matches;
    });
    
    const result = booking && booking.status !== 'Cancelled';
    
    if (booking && booking.status === 'Cancelled') {
      console.log(`✅ Booking ${booking._id} is cancelled - showing as available`);
    }
    
    return result;
  };

  const getBooking = (date, mealType) => {
    return myBookings.find(b => {
      const bookingDate = normalizeDate(b.orderDate || b.date);
      return bookingDate === date && b.mealType === mealType && b.status !== 'Cancelled';
    });
  };

  const getMealIcon = (mealType) => {
    if (mealType === 'Breakfast') return <Coffee className="w-6 h-6 text-amber-500" />;
    if (mealType === 'Lunch') return <Sun className="w-6 h-6 text-amber-500" />;
    if (mealType === 'Dinner') return <Moon className="w-6 h-6 text-blue-900" />;
    return <Coffee className="w-5 h-5 text-gray-600" />;
  };

  const getTeaTime = (teaType) => {
    const times = {
      'Morning Tea': '5:30 AM',
      'Mid-Morning Tea': '11:00 AM',
      'Evening Tea': '6:00 PM',
      'Night Tea': '10:00 PM'
    };
    return times[teaType];
  };

  const getMealTime = (mealType) => {
    const times = {
      'Breakfast': '7:00 - 9:00 AM',
      'Lunch': '12:00 - 2:00 PM',
      'Dinner': '7:00 - 9:00 PM'
    };
    return times[mealType] || getTeaTime(mealType);
  };

  // Check if booking/cancellation is allowed (24 hours in advance for Day Scholars and Officer Cadets for tea)
  const isBookingAllowed = (date, mealType) => {
    const orderDate = new Date(date);
    const cutoffTime = new Date(orderDate);
    
    // Set cutoff time based on meal/tea type (same as backend)
    if (mealType === 'Breakfast') cutoffTime.setHours(1, 0, 0, 0);
    else if (mealType === 'Lunch') cutoffTime.setHours(6, 0, 0, 0);
    else if (mealType === 'Dinner') cutoffTime.setHours(13, 0, 0, 0);
    else if (mealType === 'Morning Tea') cutoffTime.setHours(4, 0, 0, 0);
    else if (mealType === 'Mid-Morning Tea') cutoffTime.setHours(9, 0, 0, 0);
    else if (mealType === 'Evening Tea') cutoffTime.setHours(16, 0, 0, 0);
    else if (mealType === 'Night Tea') cutoffTime.setHours(20, 0, 0, 0);

    // Check if current time is at least 24 hours before the cutoff time
    const now = new Date();
    const bookingDeadline = new Date(cutoffTime);
    bookingDeadline.setHours(bookingDeadline.getHours() - 24);
    
    return now < bookingDeadline;
  };

  // Check if tea cancellation is allowed for Officer Cadets (24 hours before)
  const isTeaCancellationAllowed = (date, mealType) => {
    if (user?.role !== 'Officer Cadet') {
      return false;
    }

    const teaTypes = ['Morning Tea', 'Mid-Morning Tea', 'Evening Tea', 'Night Tea'];
    if (!teaTypes.includes(mealType)) {
      return false;
    }

    return isBookingAllowed(date, mealType);
  };

  const getNavigationItems = () => {
    if (user?.role === 'Day Scholar') {
      return [
        { icon: LayoutDashboard, label: 'Dashboard', path: '/day-scholar-dashboard' },
        { icon: UtensilsCrossed, label: 'Menu Page', path: '/view-menu' },
        { icon: BookOpen, label: 'Booking', path: '/booking' },
        { icon: Clock, label: 'Cancellation', path: '/cancel-booking' },
        { icon: History, label: 'Order History', path: '/order-history' },
        { icon: Settings, label: 'Settings', path: '/settings' },
        { icon: FileText, label: 'Monthly Bill', path: '/monthly-bill' }
      ];
    } else if (user?.role === 'Officer Cadet') {
      return [
        { icon: LayoutDashboard, label: 'Dashboard', path: '/officer-cadet-dashboard' },
        { icon: UtensilsCrossed, label: 'Menu Page', path: '/view-menu' },
        { icon: BookOpen, label: 'Booking', path: '/booking' },
        { icon: History, label: 'Order History', path: '/order-history' },
        { icon: FileText, label: 'Monthly Bill', path: '/monthly-bill' },
        { icon: Settings, label: 'Settings', path: '/settings' }
      ];
    }
    return [];
  };

  // ========== RENDER MEAL CARD (FOR DAY SCHOLARS) ==========
  const renderMealCard = (mealType, date, isMainMeal = true) => {
    const booked = isBooked(date, mealType);
    const booking = getBooking(date, mealType);
    
    const cancelledBooking = myBookings.find(b => {
      const bookingDate = normalizeDate(b.orderDate || b.date);
      return bookingDate === date && b.mealType === mealType && b.status === 'Cancelled';
    });
    
    const imageUrl = getMealImage(mealType);
    const price = MEAL_PRICES[mealType] || 0;
    const timeRange = getMealTime(mealType);

    if (isMainMeal) {
      return (
        <div key={mealType} className={`bg-white rounded-xl shadow-md overflow-hidden hover:shadow-xl transition-shadow ${
          booked ? 'ring-2 ring-green-500' : cancelledBooking ? 'ring-2 ring-red-300' : ''
        }`}>
          <div className="relative h-48 overflow-hidden">
            <img 
              src={imageUrl}
              alt={mealType}
              className="w-full h-full object-cover"
              onError={(e) => {
                e.target.src = MEAL_IMAGES.default;
              }}
            />
            <div className="absolute top-3 right-3 bg-white px-4 py-2 rounded-full shadow-lg">
              <span className="text-blue-900 font-bold text-base">Rs. {price}</span>
            </div>
            {booked && (
              <div className="absolute top-3 left-3 bg-green-500 px-4 py-2 rounded-full shadow-lg">
                <span className="text-white font-bold text-base flex items-center gap-1">
                  <Check className="w-5 h-5" />
                  Booked
                </span>
              </div>
            )}
            {!booked && cancelledBooking && (
              <div className="absolute top-3 left-3 bg-red-500 px-4 py-2 rounded-full shadow-lg">
                <span className="text-white font-bold text-base flex items-center gap-1">
                  <Ban className="w-5 h-5" />
                  Cancelled
                </span>
              </div>
            )}
          </div>

          <div className="p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                {getMealIcon(mealType)}
                <h3 className="text-xl font-bold text-gray-800">{mealType}</h3>
              </div>
            </div>

            <div className="flex items-center gap-2 mb-4 text-gray-600 text-base">
              <Clock className="w-5 h-5" />
              <span className="font-medium">{timeRange}</span>
            </div>

            {!booked && cancelledBooking && (
              <div className="p-4 bg-red-50 border-2 border-red-200 rounded-lg">
                <p className="text-base text-red-700 font-bold text-center">
                  This meal has been cancelled
                </p>
              </div>
            )}

            {!cancelledBooking && !booked && (
              <>
                {!isBookingAllowed(date, mealType) && user?.role === 'Day Scholar' ? (
                  <div className="w-full py-3 bg-gray-300 text-gray-700 rounded-lg font-bold text-base text-center cursor-not-allowed">
                    Booking Closed
                  </div>
                ) : (
                  <button
                    onClick={() => handleBooking(date, mealType)}
                    disabled={loading || !isBookingAllowed(date, mealType)}
                    className="w-full py-3 bg-gradient-to-r from-blue-900 to-amber-500 text-white rounded-lg font-bold text-base hover:from-blue-950 hover:to-amber-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md"
                  >
                    Book {mealType}
                  </button>
                )}
              </>
            )}
            
            {booked && (
              <>
                {!isBookingAllowed(date, mealType) && user?.role === 'Day Scholar' ? (
                  <div className="w-full py-3 bg-gray-300 text-gray-700 rounded-lg font-bold text-base text-center cursor-not-allowed">
                    Cancellation Closed
                  </div>
                ) : (
                  <button
                    onClick={() => handleCancelBooking(booking._id, mealType)}
                    disabled={loading || !isBookingAllowed(date, mealType)}
                    className="w-full py-3 bg-red-600 text-white rounded-lg font-bold text-base hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md"
                  >
                    Cancel Booking
                  </button>
                )}
              </>
            )}
          </div>
        </div>
      );
    } else {
      // Tea card for Day Scholars - CAN CANCEL
      return (
        <div key={mealType} className={`p-4 rounded-xl border-2 ${
          booked ? 'border-green-500 bg-green-50' : cancelledBooking ? 'border-red-300 bg-red-50' : 'border-gray-200 bg-white'
        } hover:shadow-md transition-shadow`}>
          <div className="flex items-center gap-2 mb-2">
            <Coffee className="w-5 h-5 text-gray-600" />
            <span className="text-base font-bold text-gray-800">
              {mealType.replace(' Tea', '')}
            </span>
          </div>
          <div className="flex items-center gap-2 mb-3">
            <Clock className="w-4 h-4 text-gray-500" />
            <span className="text-sm text-gray-600 font-medium">{timeRange}</span>
          </div>
          <div className="text-sm font-bold text-blue-900 mb-3">Rs. {price}</div>
          
          {!booked && cancelledBooking && (
            <div className="p-3 bg-red-50 border-2 border-red-200 rounded-lg">
              <p className="text-sm text-center text-red-700 font-bold">Tea request cancelled</p>
            </div>
          )}
          
          {!cancelledBooking && !booked && (
            <>
              {!isBookingAllowed(date, mealType) && user?.role === 'Day Scholar' ? (
                <div className="w-full py-2 bg-gray-300 text-gray-700 rounded-lg text-sm font-bold text-center cursor-not-allowed">
                  Booking Closed
                </div>
              ) : (
                <button
                  onClick={() => handleBooking(date, mealType)}
                  disabled={loading || !isBookingAllowed(date, mealType)}
                  className="w-full py-2 bg-gradient-to-r from-blue-900 to-amber-500 text-white rounded-lg text-sm font-bold hover:from-blue-950 hover:to-amber-600 disabled:opacity-50 disabled:cursor-not-allowed shadow-md"
                >
                  Request Tea
                </button>
              )}
            </>
          )}
          
          {booked && (
            <div className="space-y-2">
              <p className="text-sm text-center text-green-600 font-bold">✓ Requested</p>
              {!isBookingAllowed(date, mealType) && user?.role === 'Day Scholar' ? (
                <div className="w-full py-2 bg-gray-300 text-gray-700 rounded-lg text-sm font-bold text-center cursor-not-allowed">
                  Cancellation Closed
                </div>
              ) : (
                <button
                  onClick={() => handleCancelBooking(booking._id, mealType)}
                  disabled={loading || !isBookingAllowed(date, mealType)}
                  className="w-full py-2 bg-red-600 text-white rounded-lg text-sm font-bold hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-md"
                >
                  Cancel
                </button>
              )}
            </div>
          )}
        </div>
      );
    }
  };

  // ========== NEW: RENDER TEA CARD FOR OFFICER CADETS (CAN CANCEL WITHIN 24 HOURS) ==========
  const renderOfficerCadetTeaCard = (mealType, date) => {
    const booked = isBooked(date, mealType);
    const booking = getBooking(date, mealType);
    
    const cancelledBooking = myBookings.find(b => {
      const bookingDate = normalizeDate(b.orderDate || b.date);
      return bookingDate === date && b.mealType === mealType && b.status === 'Cancelled';
    });
    
    const price = MEAL_PRICES[mealType] || 0;
    const timeRange = getMealTime(mealType);

    return (
      <div key={mealType} className={`p-4 rounded-xl border-2 ${
        booked ? 'border-green-500 bg-green-50' : cancelledBooking ? 'border-red-300 bg-red-50' : 'border-gray-200 bg-white'
      } hover:shadow-md transition-shadow`}>
        <div className="flex items-center gap-2 mb-2">
          <Coffee className="w-5 h-5 text-gray-600" />
          <span className="text-base font-bold text-gray-800">
            {mealType.replace(' Tea', '')}
          </span>
        </div>
        <div className="flex items-center gap-2 mb-3">
          <Clock className="w-4 h-4 text-gray-500" />
          <span className="text-sm text-gray-600 font-medium">{timeRange}</span>
        </div>
        <div className="text-sm font-bold text-blue-900 mb-3">Rs. {price}</div>
        
        {!booked && cancelledBooking && (
          <div className="p-3 bg-red-50 border-2 border-red-200 rounded-lg">
            <p className="text-sm text-center text-red-700 font-bold">Tea request cancelled</p>
          </div>
        )}
        
        {!cancelledBooking && !booked && (
          <>
            {isBookingAllowed(date, mealType) ? (
              <button
                onClick={() => handleBooking(date, mealType)}
                disabled={loading}
                className="w-full py-2 bg-gradient-to-r from-blue-900 to-amber-500 text-white rounded-lg text-sm font-bold hover:from-blue-950 hover:to-amber-600 disabled:opacity-50 shadow-md"
              >
                Request Tea
              </button>
            ) : (
              <div className="w-full py-2 bg-gray-300 text-gray-700 rounded-lg text-sm font-bold text-center cursor-not-allowed">
                Booking Closed
              </div>
            )}
          </>
        )}
        
        {/* Officer Cadets can cancel tea if within 24 hours */}
        {booked && booking && (
          <div className="space-y-2">
            <div className="flex items-center justify-center gap-2 p-3 bg-green-100 border-2 border-green-500 rounded-lg">
              <Check className="w-5 h-5 text-green-600" />
              <p className="text-sm text-center text-green-700 font-bold">Tea Requested</p>
            </div>
            {isTeaCancellationAllowed(date, mealType) ? (
              <button
                onClick={() => handleCancelBooking(booking._id, mealType)}
                disabled={loading}
                className="w-full py-2 bg-red-600 text-white rounded-lg text-sm font-bold hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-md"
              >
                Cancel Tea
              </button>
            ) : (
              <div className="p-2 bg-gray-50 border border-gray-300 rounded-lg">
                <p className="text-xs text-center text-gray-600 font-medium">
                  ⓘ Cancellation deadline passed (must cancel 24 hours before)
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  const meals = ['Breakfast', 'Lunch', 'Dinner'];
  const teas = ['Morning Tea', 'Mid-Morning Tea', 'Evening Tea', 'Night Tea'];

  // ========== OFFICER CADET VIEW ==========
  if (user?.role === 'Officer Cadet') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-950 via-blue-900 to-blue-800">
        <div className="flex">
          <div className="w-64 bg-white shadow-xl fixed left-0 top-0 h-screen flex flex-col z-50">
            <div className="p-6 border-b border-gray-200">
              <h1 className="text-3xl font-bold text-blue-950">KDU Mess</h1>
              <p className="text-base text-gray-600 mt-1">Officer Cadet Portal</p>
            </div>

            <nav className="px-4 py-4 space-y-2 flex-1 overflow-y-auto scrollbar-thin">
              {getNavigationItems().map((item, index) => {
                const Icon = item.icon;
                const isActive = location.pathname === item.path;
                return (
                  <button
                    key={index}
                    onClick={() => navigate(item.path)}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg font-semibold text-base transition-colors ${
                      isActive
                        ? 'bg-blue-50 text-blue-700'
                        : 'text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    <Icon className="w-6 h-6 flex-shrink-0" />
                    <span className="whitespace-nowrap">{item.label}</span>
                  </button>
                );
              })}
            </nav>

            <div className="p-4 border-t border-gray-200 bg-white">
              <button
                onClick={handleLogout}
                className="w-full flex items-center justify-center gap-3 px-4 py-3 text-red-600 hover:bg-red-50 rounded-lg font-semibold text-base transition-colors"
              >
                <LogOut className="w-6 h-6" />
                <span>Logout</span>
              </button>
            </div>
          </div>

          <div className="ml-64 flex-1 p-8 overflow-y-auto">
            <div className="max-w-7xl mx-auto">
              <div className="bg-white rounded-xl shadow-lg p-8 mb-6">
                <h1 className="text-4xl font-bold text-blue-950">My Meal & Tea Schedule</h1>
                <p className="text-gray-600 mt-2 text-lg">
                  All meals are automatically enrolled. You can request tea at any time.
                </p>
              </div>

              <div className="bg-blue-100 border-l-4 border-blue-900 p-6 mb-6 rounded-xl">
                <p className="font-bold text-blue-900 text-lg">
                  Officer Cadets: 3 meals daily (compulsory) + Optional tea (can cancel up to 24 hours before)
                </p>
              </div>

              {/* Date Selector */}
              <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
                <label className="block text-base font-bold text-gray-700 mb-3">
                  <Calendar className="inline w-5 h-5 mr-2" />
                  Select Date
                </label>
                <select
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="w-full md:w-auto px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-base font-medium"
                >
                  {availableDates.map((dateInfo) => {
                    const dateParts = dateInfo.date.split('-');
                    const dateObj = new Date(parseInt(dateParts[0]), parseInt(dateParts[1]) - 1, parseInt(dateParts[2]));
                    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
                    const dayName = dayNames[dateObj.getDay()];
                    const formattedDate = new Date(dateInfo.date + 'T00:00:00').toLocaleDateString('en-GB', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric'
                    });
                    return (
                      <option key={dateInfo.date} value={dateInfo.date}>
                        {dayName} - {formattedDate}
                      </option>
                    );
                  })}
                </select>
              </div>

              {selectedDate && (() => {
                const dateInfo = availableDates.find(d => d.date === selectedDate);
                if (!dateInfo) return null;
                // Calculate day name from the date string to avoid timezone issues
                const dateParts = dateInfo.date.split('-');
                const dateObj = new Date(parseInt(dateParts[0]), parseInt(dateParts[1]) - 1, parseInt(dateParts[2]));
                const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
                const correctDayName = dayNames[dateObj.getDay()];
                
                return (
                <div key={dateInfo.date} className="bg-white rounded-xl shadow-lg p-8">
                  <h2 className="text-2xl font-bold text-blue-950 mb-6">
                    {correctDayName} - {new Date(dateInfo.date + 'T00:00:00').toLocaleDateString('en-GB', { 
                      day: 'numeric',
                      month: 'numeric',
                      year: 'numeric'
                    })}
                  </h2>

                  <h3 className="text-xl font-bold text-gray-800 mb-4">Meals (Compulsory)</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                    {meals.map((mealType) => {
                      const imageUrl = getMealImage(mealType);
                      const timeRange = getMealTime(mealType);
                      const price = MEAL_PRICES[mealType] || 0;

                      return (
                        <div key={mealType} className="bg-white rounded-xl shadow-md overflow-hidden opacity-95 border-2 border-gray-200">
                          <div className="relative h-48 overflow-hidden">
                            <img 
                              src={imageUrl}
                              alt={mealType}
                              className="w-full h-full object-cover filter brightness-90"
                              onError={(e) => {
                                e.target.src = MEAL_IMAGES.default;
                              }}
                            />
                            <div className="absolute top-3 right-3 bg-white px-4 py-2 rounded-full shadow-lg">
                              <span className="text-blue-900 font-bold text-base">Rs. {price}</span>
                            </div>
                            <div className="absolute top-3 left-3 bg-green-500 px-4 py-2 rounded-full shadow-lg">
                              <span className="text-white font-bold text-base flex items-center gap-1">
                                <Check className="w-5 h-5" />
                                Enrolled
                              </span>
                            </div>
                          </div>

                          <div className="p-5 bg-gray-50">
                            <div className="flex items-center justify-between mb-3">
                              <div className="flex items-center gap-2">
                                {getMealIcon(mealType)}
                                <h3 className="text-xl font-bold text-gray-800">{mealType}</h3>
                              </div>
                            </div>

                            <div className="flex items-center gap-2 mb-4 text-gray-600 text-base">
                              <Clock className="w-5 h-5" />
                              <span className="font-medium">{timeRange}</span>
                            </div>

                            <div className="w-full py-3 bg-gray-300 text-gray-700 rounded-lg font-bold text-base text-center cursor-not-allowed flex items-center justify-center gap-2">
                              <Ban className="w-5 h-5" />
                              Cannot Cancel
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* ✅ FIXED: Use renderOfficerCadetTeaCard instead of renderMealCard */}
                  <h3 className="text-xl font-bold text-gray-800 mb-4">Tea (Optional - Can Cancel Up to 24 Hours Before)</h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                    {teas.map((teaType) => renderOfficerCadetTeaCard(teaType, dateInfo.date))}
                  </div>
                </div>
                );
              })()}
            </div>
          </div>
        </div>
      </div>
    );
  }


  // ========== DAY SCHOLAR VIEW ==========
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-950 via-blue-900 to-blue-800">
      <div className="flex">
        {/* Fixed Sidebar */}
        <div className="w-64 bg-white shadow-xl fixed left-0 top-0 h-screen flex flex-col z-50">
          <div className="p-6 border-b border-gray-200">
            <h1 className="text-3xl font-bold text-blue-950">KDU Mess</h1>
            <p className="text-base text-gray-600 mt-1">Day Scholar Portal</p>
          </div>

          <nav className="px-4 py-4 space-y-2 flex-1 overflow-y-auto scrollbar-thin">
            {getNavigationItems().map((item, index) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;
              return (
                <button
                  key={index}
                  onClick={() => navigate(item.path)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg font-semibold text-base transition-colors ${
                    isActive
                      ? 'bg-blue-50 text-blue-700'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  <Icon className="w-6 h-6 flex-shrink-0" />
                  <span className="whitespace-nowrap">{item.label}</span>
                </button>
              );
            })}
          </nav>

          <div className="p-4 border-t border-gray-200 bg-white">
            <button
              onClick={handleLogout}
              className="w-full flex items-center justify-center gap-3 px-4 py-3 text-red-600 hover:bg-red-50 rounded-lg font-semibold text-base transition-colors"
            >
              <LogOut className="w-6 h-6" />
              <span>Logout</span>
            </button>
          </div>
        </div>

        {/* Main Content with Left Margin */}
        <div className="ml-64 flex-1 p-8 overflow-y-auto">
          <div className="max-w-7xl mx-auto">
            <div className="bg-white rounded-xl shadow-lg p-8 mb-6">
              <h1 className="text-4xl font-bold text-blue-950">Book Meals & Tea</h1>
              <p className="text-gray-600 mt-2 text-lg">
                Select the meals and tea times you want
              </p>
            </div>

            <div className="bg-amber-100 border-l-4 border-amber-500 p-6 mb-6 rounded-xl">
              <p className="font-bold text-amber-700 text-lg mb-2">
                Day Scholars: All meals and tea times are optional
              </p>
              <p className="text-amber-800 text-base">
                ⚠️ Important: Bookings and cancellations must be made at least 24 hours in advance. Today's meals cannot be booked or cancelled.
              </p>
            </div>

            {/* Date Selector */}
            <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
              <label className="block text-base font-bold text-gray-700 mb-3">
                <Calendar className="inline w-5 h-5 mr-2" />
                Select Date
              </label>
              <select
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="w-full md:w-auto px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-base font-medium"
              >
                {availableDates.map((dateInfo) => {
                  const dateParts = dateInfo.date.split('-');
                  const dateObj = new Date(parseInt(dateParts[0]), parseInt(dateParts[1]) - 1, parseInt(dateParts[2]));
                  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
                  const dayName = dayNames[dateObj.getDay()];
                  const formattedDate = new Date(dateInfo.date + 'T00:00:00').toLocaleDateString('en-GB', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric'
                  });
                  return (
                    <option key={dateInfo.date} value={dateInfo.date}>
                      {dayName} - {formattedDate}
                    </option>
                  );
                })}
              </select>
            </div>

            {selectedDate && (() => {
              const dateInfo = availableDates.find(d => d.date === selectedDate);
              if (!dateInfo) return null;
              // Calculate day name from the date string to avoid timezone issues
              const dateParts = dateInfo.date.split('-');
              const dateObj = new Date(parseInt(dateParts[0]), parseInt(dateParts[1]) - 1, parseInt(dateParts[2]));
              const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
              const correctDayName = dayNames[dateObj.getDay()];
              
              return (
              <div key={`${dateInfo.date}-${refreshKey}`} className="bg-white rounded-xl shadow-lg p-8">
                <h2 className="text-2xl font-bold text-blue-950 mb-6">
                  {correctDayName} - {new Date(dateInfo.date + 'T00:00:00').toLocaleDateString('en-GB', { 
                    day: 'numeric',
                    month: 'numeric',
                    year: 'numeric'
                  })}
                </h2>

                {/* Meals Section */}
                <h3 className="text-xl font-bold text-gray-800 mb-4">Meals</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                  {meals.map((mealType) => renderMealCard(mealType, dateInfo.date, true))}
                </div>

                {/* Tea Section */}
                <h3 className="text-xl font-bold text-gray-800 mb-4">Tea Times</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                  {teas.map((teaType) => renderMealCard(teaType, dateInfo.date, false))}
                </div>
              </div>
              );
            })()}
          </div>
        </div>
      </div>
    </div>
  );
}
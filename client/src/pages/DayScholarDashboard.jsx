import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Calendar, 
  Clock, 
  UtensilsCrossed, 
  BookOpen, 
  History, 
  Settings, 
  FileText,
  LogOut,
  User,
  Mail,
  X,
  Leaf,
  Drumstick
} from 'lucide-react';
import axios from '../api/axios';

// ========== MEAL IMAGES ==========
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

const getMealImage = (mealType) => {
  return MEAL_IMAGES[mealType] || MEAL_IMAGES.default;
};

export default function DayScholarDashboard() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [currentBookings, setCurrentBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [menuItems, setMenuItems] = useState([]);
  const [loadingMenu, setLoadingMenu] = useState(false);

  const fetchDashboardData = useCallback(async () => {
    setLoading(true);
    try {
      try {
        const bookingsResponse = await axios.get('/bookings/my-bookings');
        const allBookings = bookingsResponse.data || [];
        
        // Filter out cancelled bookings that have been re-booked
        // A cancelled booking is considered re-booked if there's a confirmed booking
        // for the same date and meal type
        let filteredBookings = allBookings.filter(booking => {
          // If booking is cancelled, check if it has been re-booked
          if (booking.status === 'Cancelled') {
            const bookingDate = new Date(booking.date || booking.orderDate).toISOString().split('T')[0];
            const isRebooked = allBookings.some(otherBooking => {
              if (otherBooking._id === booking._id) return false; // Skip self
              if (otherBooking.status === 'Cancelled') return false; // Only check confirmed bookings
              
              const otherDate = new Date(otherBooking.date || otherBooking.orderDate).toISOString().split('T')[0];
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

        // Filter to show only one booking per date + meal type combination
        // Priority: Confirmed > Pending > Booked > Cancelled (most recent)
        const seenMeals = new Map(); // key: "date_mealType", value: booking

        filteredBookings.forEach(booking => {
          const orderDate = booking.date || booking.orderDate;
          if (!orderDate) return;

          const bookingDate = new Date(orderDate).toISOString().split('T')[0];
          const key = `${bookingDate}_${booking.mealType}`;

          if (!seenMeals.has(key)) {
            // First occurrence, add it
            seenMeals.set(key, booking);
          } else {
            // Already have one for this meal, decide which to keep
            const existing = seenMeals.get(key);
            
            // Priority: Confirmed > Pending > Booked > Cancelled
            const statusPriority = {
              'Confirmed': 4,
              'Pending': 3,
              'Booked': 2,
              'Cancelled': 1
            };
            
            const existingPriority = statusPriority[existing.status] || 0;
            const currentPriority = statusPriority[booking.status] || 0;

            if (currentPriority > existingPriority) {
              // Current has higher priority, replace
              seenMeals.set(key, booking);
            } else if (currentPriority === existingPriority) {
              // Same priority, apply specific rules
              if (booking.status === 'Cancelled' && existing.status === 'Cancelled') {
                // Both cancelled, keep the most recently cancelled one
                const existingCancelledAt = existing.cancelledAt ? new Date(existing.cancelledAt) : null;
                const currentCancelledAt = booking.cancelledAt ? new Date(booking.cancelledAt) : null;

                if (currentCancelledAt && existingCancelledAt) {
                  if (currentCancelledAt > existingCancelledAt) {
                    seenMeals.set(key, booking);
                  }
                } else if (currentCancelledAt && !existingCancelledAt) {
                  seenMeals.set(key, booking);
                } else if (!currentCancelledAt && existingCancelledAt) {
                  // Keep existing
                } else {
                  // Neither has cancelledAt, compare by _id
                  if ((booking._id || '') > (existing._id || '')) {
                    seenMeals.set(key, booking);
                  }
                }
              } else {
                // Same priority but not both cancelled, keep the first one (existing)
                // or compare by date/orderDate
                const existingDate = new Date(existing.date || existing.orderDate);
                const currentDate = new Date(booking.date || booking.orderDate);
                if (currentDate > existingDate) {
                  seenMeals.set(key, booking);
                }
              }
            }
            // If existing has higher priority, keep it (no change needed)
          }
        });

        // Convert map values to array
        const uniqueBookings = Array.from(seenMeals.values());
        
        setCurrentBookings(uniqueBookings);
      } catch (bookingErr) {
        console.error('Error fetching bookings:', bookingErr);
        setCurrentBookings([]);
      }
    } catch (err) {
      console.error('Error fetching dashboard data:', err);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    const userData = JSON.parse(localStorage.getItem('user'));
    if (!userData || userData.role !== 'Day Scholar') {
      alert('Access denied. This dashboard is only for Day Scholars.');
      navigate('/login');
      return;
    }
    console.log('User data from localStorage:', userData);
    setUser(userData);
    fetchDashboardData();

    // Listen for booking updates from other pages
    const handleBookingUpdate = () => {
      fetchDashboardData();
    };
    window.addEventListener('bookingUpdated', handleBookingUpdate);

    return () => {
      window.removeEventListener('bookingUpdated', handleBookingUpdate);
    };
  }, [navigate, fetchDashboardData]);

  const handleLogout = () => {
    localStorage.removeItem('user');
    localStorage.removeItem('token');
    navigate('/login');
  };

  const fetchMenuItems = async (date, mealType) => {
    setLoadingMenu(true);
    try {
      // Check if it's a tea booking - tea doesn't have menu items
      const teaTypes = ['Morning Tea', 'Mid-Morning Tea', 'Evening Tea', 'Night Tea'];
      if (teaTypes.includes(mealType)) {
        setMenuItems([]);
        setLoadingMenu(false);
        return;
      }

      const dateStr = new Date(date).toISOString().split('T')[0];
      const response = await axios.get(`/menu/date/${dateStr}`);
      
      if (response.data && response.data.menus && response.data.menus.length > 0) {
        const menu = response.data.menus[0];
        
        // Map meal types to menu fields
        const mealTypeMap = {
          'Breakfast': 'breakfast',
          'Lunch': 'lunch',
          'Dinner': 'dinner'
        };
        
        const mealKey = mealTypeMap[mealType];
        if (mealKey && menu[mealKey]) {
          const mealContent = menu[mealKey];
          // Parse menu items
          const items = parseMenuItems(mealContent);
          setMenuItems(items);
        } else {
          setMenuItems([]);
        }
      } else {
        setMenuItems([]);
      }
    } catch (err) {
      console.error('Error fetching menu items:', err);
      setMenuItems([]);
    }
    setLoadingMenu(false);
  };

  const parseMenuItems = (content) => {
    if (!content) return [];
    // Split by comma or semicolon, and also handle newlines
    return content
      .split(/[,;\n]/)
      .map(item => item.trim())
      .filter(item => item.length > 0 && item !== ',');
  };

  const getItemCategory = (item) => {
    if (item.includes('(Non-Veg)')) return 'non-veg';
    if (item.includes('(Beverage)')) return 'beverage';
    if (item.includes('(Dessert)')) return 'dessert';
    return 'veg';
  };

  const cleanItemName = (item) => {
    let cleaned = item
      .replace(/\(Non-Veg\)/gi, '')
      .replace(/\(Vegetarian\)/gi, '')
      .replace(/\(Beverage\)/gi, '')
      .replace(/\(Dessert\)/gi, '')
      .trim();
    
    cleaned = cleaned.replace(/\([0-9]+\.?[0-9]*\s*(?:g|kg|ml|l|pieces?|pcs?|nos?|units?)\)/gi, '');
    cleaned = cleaned.replace(/[0-9]+\.?[0-9]*\s*(?:g|kg|ml|l|pieces?|pcs?|nos?|units?)\b/gi, '');
    cleaned = cleaned.replace(/\b[0-9]+\b/g, '');
    cleaned = cleaned.replace(/\([^)]*\)/g, '');
    
    cleaned = cleaned
      .replace(/\s+/g, ' ')
      .replace(/,\s*,/g, ',')
      .replace(/,\s*$/g, '')
      .replace(/^\s*,/g, '')
      .trim();
    
    return cleaned;
  };

  const handleViewDetails = async (booking) => {
    setSelectedBooking(booking);
    const bookingDate = booking.date || booking.orderDate;
    await fetchMenuItems(bookingDate, booking.mealType);
  };

  const closeModal = () => {
    setSelectedBooking(null);
    setMenuItems([]);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-950 via-blue-900 to-blue-800 flex items-center justify-center">
        <div className="text-white text-2xl font-semibold">Loading Dashboard...</div>
      </div>
    );
  }

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
            <button
              onClick={() => navigate('/day-scholar-dashboard')}
              className="w-full flex items-center gap-3 px-4 py-3 bg-blue-50 text-blue-700 rounded-lg font-semibold text-base transition-colors"
            >
              <Calendar className="w-6 h-6 flex-shrink-0" />
              <span className="whitespace-nowrap">Dashboard</span>
            </button>
            <button
              onClick={() => navigate('/view-menu')}
              className="w-full flex items-center gap-3 px-4 py-3 text-gray-700 hover:bg-gray-100 rounded-lg font-semibold text-base transition-colors"
            >
              <UtensilsCrossed className="w-6 h-6 flex-shrink-0" />
              <span className="whitespace-nowrap">Menu Page</span>
            </button>
            <button
              onClick={() => navigate('/booking')}
              className="w-full flex items-center gap-3 px-4 py-3 text-gray-700 hover:bg-gray-100 rounded-lg font-semibold text-base transition-colors"
            >
              <BookOpen className="w-6 h-6 flex-shrink-0" />
              <span className="whitespace-nowrap">Booking</span>
            </button>
            <button
              onClick={() => navigate('/cancel-booking')}
              className="w-full flex items-center gap-3 px-4 py-3 text-gray-700 hover:bg-gray-100 rounded-lg font-semibold text-base transition-colors"
            >
              <Clock className="w-6 h-6 flex-shrink-0" />
              <span className="whitespace-nowrap">Cancellation</span>
            </button>
            <button
              onClick={() => navigate('/order-history')}
              className="w-full flex items-center gap-3 px-4 py-3 text-gray-700 hover:bg-gray-100 rounded-lg font-semibold text-base transition-colors"
            >
              <History className="w-6 h-6 flex-shrink-0" />
              <span className="whitespace-nowrap">Order History</span>
            </button>
            <button
              onClick={() => navigate('/settings')}
              className="w-full flex items-center gap-3 px-4 py-3 text-gray-700 hover:bg-gray-100 rounded-lg font-semibold text-base transition-colors"
            >
              <Settings className="w-6 h-6 flex-shrink-0" />
              <span className="whitespace-nowrap">Settings</span>
            </button>
            <button
              onClick={() => navigate('/monthly-bill')}
              className="w-full flex items-center gap-3 px-4 py-3 text-gray-700 hover:bg-gray-100 rounded-lg font-semibold text-base transition-colors"
            >
              <FileText className="w-6 h-6 flex-shrink-0" />
              <span className="whitespace-nowrap">Monthly Bill</span>
            </button>
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
          {/* Welcome Header - Single Row Layout */}
          <div className="bg-white rounded-xl shadow-lg p-8 mb-6">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <h1 className="text-4xl font-bold text-blue-950 mb-4">
                  Welcome, {user?.firstName} {user?.lastName}
                </h1>
                
                <div className="flex flex-wrap items-center gap-6 text-gray-600">
                  <div className="flex items-center gap-2">
                    <User className="w-5 h-5 text-blue-600" />
                    <span className="font-semibold text-base">{user?.role || 'N/A'}</span>
                  </div>
                  
                  <div className="h-6 w-px bg-gray-300"></div>
                  
                  <div className="flex items-center gap-2">
                    <Mail className="w-5 h-5 text-blue-600" />
                    <span className="text-base">{user?.email || 'N/A'}</span>
                  </div>
                  
                  <div className="h-6 w-px bg-gray-300"></div>
                  
                  <div className="flex items-center gap-2">
                    <BookOpen className="w-5 h-5 text-blue-600" />
                    <span className="text-base">{user?.faculty || 'N/A'}</span>
                  </div>
                  
                  <div className="h-6 w-px bg-gray-300"></div>
                  
                  <div className="flex items-center gap-2">
                    <Calendar className="w-5 h-5 text-blue-600" />
                    <span className="text-base">
                      {user?.intake ? `Intake ${user.intake}` : 'N/A'}
                    </span>
                  </div>
                  
                  <div className="h-6 w-px bg-gray-300"></div>
                </div>
              </div>
              
              <div className="bg-gradient-to-br from-blue-900 to-amber-500 text-white px-6 py-3 rounded-lg ml-4 flex-shrink-0">
                <p className="text-base font-semibold">Day Scholar ID</p>
                <p className="text-2xl font-bold">{user?.roleId || 'N/A'}</p>
              </div>
            </div>
          </div>

          {/* Current Bookings Section with Images */}
          <div className="bg-white rounded-xl shadow-lg p-8">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-3xl font-bold text-blue-950">My Bookings</h2>
              <button
                onClick={() => navigate('/order-history')}
                className="text-blue-600 hover:text-blue-800 font-semibold text-base"
              >
                View All History →
              </button>
            </div>
            
            {currentBookings.length === 0 ? (
              <div className="text-center py-12 bg-gray-50 rounded-lg">
                <BookOpen className="w-20 h-20 mx-auto mb-4 text-gray-300" />
                <h3 className="text-2xl font-bold text-gray-700 mb-3">No Active Bookings</h3>
                <p className="text-gray-500 text-lg mb-6">
                  You haven't made any bookings for upcoming meals.
                  <br />
                  Browse the menu and book your meals now!
                </p>
                <button
                  onClick={() => navigate('/booking')}
                  className="bg-gradient-to-r from-blue-900 to-amber-500 text-white px-10 py-4 rounded-lg font-bold text-lg hover:from-blue-950 hover:to-amber-600 transition-all"
                >
                  Book a Meal
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {currentBookings.map((booking) => {
                  const imageUrl = getMealImage(booking.mealType);
                  const price = MEAL_PRICES[booking.mealType] || 0;

                  return (
                    <div key={booking._id} className="bg-white rounded-xl shadow-md overflow-hidden hover:shadow-2xl transition-shadow border border-gray-100">
                      {/* Image Section */}
                      <div className="relative h-48 overflow-hidden">
                        <img 
                          src={imageUrl}
                          alt={booking.mealType}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            e.target.src = MEAL_IMAGES.default;
                          }}
                        />
                        {/* Status Badge */}
                        <div className="absolute top-3 right-3">
                          <span className={`px-4 py-2 rounded-full text-sm font-bold shadow-lg ${
                            booking.status === 'Confirmed' ? 'bg-green-500 text-white' :
                            booking.status === 'Pending' ? 'bg-yellow-500 text-white' :
                            'bg-red-500 text-white'
                          }`}>
                            {booking.status}
                          </span>
                        </div>
                        {/* Price Badge */}
                        <div className="absolute bottom-3 left-3 bg-white px-4 py-2 rounded-full shadow-lg">
                          <span className="text-blue-900 font-bold text-lg">Rs. {price}</span>
                        </div>
                      </div>

                      {/* Booking Details */}
                      <div className="p-5">
                        <h3 className="text-2xl font-bold text-blue-950 mb-3">{booking.mealType}</h3>
                        <div className="flex items-center gap-2 text-base text-gray-600 mb-4">
                          <Calendar className="w-5 h-5" />
                          <span className="font-medium">
                            {new Date(booking.date || booking.orderDate).toLocaleDateString('en-GB', { 
                              weekday: 'long', 
                              day: 'numeric',
                              month: 'short',
                              year: 'numeric'
                            })}
                          </span>
                        </div>

                        {/* Items List */}
                        {booking.items && booking.items.length > 0 && (
                          <div className="mb-4 bg-gray-50 p-3 rounded-lg">
                            <p className="text-sm font-bold text-gray-700 mb-2">Items Booked:</p>
                            <div className="space-y-1">
                              {booking.items.slice(0, 2).map((item, idx) => (
                                <div key={idx} className="text-sm text-gray-600 flex items-start gap-2">
                                  <span className="text-blue-600 font-bold">•</span>
                                  <span>{item.name || item}</span>
                                </div>
                              ))}
                              {booking.items.length > 2 && (
                                <p className="text-sm text-gray-500 ml-4 font-medium">
                                  +{booking.items.length - 2} more items
                                </p>
                              )}
                            </div>
                          </div>
                        )}

                        {/* Action Buttons */}
                        <div className="flex gap-3">
                          <button
                            onClick={() => handleViewDetails(booking)}
                            className="flex-1 text-blue-600 hover:bg-blue-50 border-2 border-blue-600 px-4 py-3 rounded-lg text-base font-bold transition-colors"
                          >
                            View Details
                          </button>
                          {booking.status === 'Confirmed' && (
                            <button
                              onClick={() => navigate('/cancel-booking')}
                              className="flex-1 text-red-600 hover:bg-red-50 border-2 border-red-600 px-4 py-3 rounded-lg text-base font-bold transition-colors"
                            >
                              Cancel
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
            
            {currentBookings.length > 6 && (
              <div className="text-center mt-8">
                <button
                  onClick={() => navigate('/order-history')}
                  className="text-blue-600 hover:text-blue-800 font-bold text-lg"
                >
                  View {currentBookings.length - 6} more bookings
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Menu Items Modal */}
      {selectedBooking && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
          onClick={closeModal}
        >
          <div 
            className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="sticky top-0 bg-white border-b border-gray-200 p-6 flex items-center justify-between z-10">
              <div>
                <h2 className="text-3xl font-bold text-blue-950">
                  {selectedBooking.mealType}
                </h2>
                <p className="text-gray-600 mt-1">
                  {new Date(selectedBooking.date || selectedBooking.orderDate).toLocaleDateString('en-GB', { 
                    weekday: 'long', 
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric'
                  })}
                </p>
              </div>
              <button
                onClick={closeModal}
                className="text-gray-500 hover:text-gray-700 transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6">
              {loadingMenu ? (
                <div className="text-center py-12">
                  <div className="text-gray-500 text-lg">Loading menu items...</div>
                </div>
              ) : (() => {
                const teaTypes = ['Morning Tea', 'Mid-Morning Tea', 'Evening Tea', 'Night Tea'];
                const isTea = teaTypes.includes(selectedBooking.mealType);
                
                if (isTea) {
                  return (
                    <div className="text-center py-12">
                      <Clock className="w-16 h-16 mx-auto mb-4 text-blue-500" />
                      <p className="text-gray-600 text-lg font-semibold mb-2">Tea Service</p>
                      <p className="text-gray-500">
                        Tea bookings don't have specific menu items. This is a beverage service.
                      </p>
                    </div>
                  );
                }
                
                return menuItems.length > 0 ? (
                <div>
                  <h3 className="text-xl font-bold text-blue-950 mb-4">Menu Items</h3>
                  <div className="space-y-3">
                    {menuItems.map((item, index) => {
                      const category = getItemCategory(item);
                      const cleanedItem = cleanItemName(item);
                      
                      if (!cleanedItem) return null;
                      
                      return (
                        <div key={index} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                          {category === 'non-veg' ? (
                            <Drumstick className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
                          ) : category === 'beverage' ? (
                            <Clock className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                          ) : (
                            <Leaf className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
                          )}
                          <span className="text-base text-gray-800 font-medium">{cleanedItem}</span>
                        </div>
                      );
                    })}
                  </div>

                  {/* Category Tags */}
                  <div className="flex gap-2 mt-6 pt-6 border-t border-gray-200">
                    {menuItems.some(item => getItemCategory(item) === 'veg') && (
                      <span className="px-4 py-2 bg-green-100 text-green-700 rounded-full text-sm font-bold flex items-center gap-2">
                        <Leaf className="w-4 h-4" />
                        Vegetarian
                      </span>
                    )}
                    {menuItems.some(item => getItemCategory(item) === 'non-veg') && (
                      <span className="px-4 py-2 bg-red-100 text-red-700 rounded-full text-sm font-bold flex items-center gap-2">
                        <Drumstick className="w-4 h-4" />
                        Non-Veg
                      </span>
                    )}
                    {menuItems.some(item => getItemCategory(item) === 'beverage') && (
                      <span className="px-4 py-2 bg-blue-100 text-blue-700 rounded-full text-sm font-bold flex items-center gap-2">
                        <Clock className="w-4 h-4" />
                        Beverage
                      </span>
                    )}
                  </div>
                </div>
                ) : (
                  <div className="text-center py-12">
                    <UtensilsCrossed className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                    <p className="text-gray-500 text-lg">No menu items available for this meal</p>
                  </div>
                );
              })()}

              {/* Booking Info */}
              <div className="mt-6 pt-6 border-t border-gray-200">
                <div className="bg-blue-50 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-semibold text-gray-600">Status:</span>
                    <span className={`px-3 py-1 rounded-full text-sm font-bold ${
                      selectedBooking.status === 'Confirmed' ? 'bg-green-100 text-green-700' :
                      selectedBooking.status === 'Pending' ? 'bg-yellow-100 text-yellow-700' :
                      'bg-red-100 text-red-700'
                    }`}>
                      {selectedBooking.status}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-gray-600">Price:</span>
                    <span className="text-lg font-bold text-blue-950">
                      Rs. {MEAL_PRICES[selectedBooking.mealType] || 0}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="sticky bottom-0 bg-gray-50 border-t border-gray-200 p-6 flex justify-end gap-3">
              <button
                onClick={closeModal}
                className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg font-bold hover:bg-gray-300 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
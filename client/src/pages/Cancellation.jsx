import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { 
  Clock,
  UtensilsCrossed,
  AlertCircle,
  CheckCircle,
  XCircle,
  History as HistoryIcon,
  BookOpen,
  Settings,
  FileText,
  LogOut,
  LayoutDashboard,
  RotateCw
} from 'lucide-react';
import axios from '../api/axios';

export default function CancellationPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [user, setUser] = useState(null);
  const [cancelledBookings, setCancelledBookings] = useState([]);
  const [activeBookings, setActiveBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [notification, setNotification] = useState({ show: false, type: '', message: '' });
  const [rebooking, setRebooking] = useState({});

  const showNotification = useCallback((type, message) => {
    setNotification({ show: true, type, message });
    setTimeout(() => {
      setNotification({ show: false, type: '', message: '' });
    }, 4000);
  }, []);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const bookingsRes = await axios.get('/bookings/my-bookings', {
        headers: { 'x-auth-token': token }
      });
      const allBookings = bookingsRes.data || [];

      const cancelled = allBookings.filter(
        booking => booking.status === 'Cancelled'
      );

      // Filter to show only one cancelled booking per date + meal type combination
      // Keep the most recently cancelled one
      const seenMeals = new Map(); // key: "date_mealType", value: booking

      cancelled.forEach(booking => {
        const orderDate = booking.date || booking.orderDate;
        if (!orderDate) return;

        const bookingDate = new Date(orderDate).toISOString().split('T')[0];
        const key = `${bookingDate}_${booking.mealType}`;

        if (!seenMeals.has(key)) {
          // First occurrence, add it
          seenMeals.set(key, booking);
        } else {
          // Already have one for this meal, compare and keep the most recent
          const existing = seenMeals.get(key);
          const existingCancelledAt = existing.cancelledAt ? new Date(existing.cancelledAt) : null;
          const currentCancelledAt = booking.cancelledAt ? new Date(booking.cancelledAt) : null;

          if (currentCancelledAt && existingCancelledAt) {
            // Both have cancelledAt, keep the more recent one
            if (currentCancelledAt > existingCancelledAt) {
              seenMeals.set(key, booking);
            }
          } else if (currentCancelledAt && !existingCancelledAt) {
            // Current has cancelledAt but existing doesn't, prefer current
            seenMeals.set(key, booking);
          } else if (!currentCancelledAt && existingCancelledAt) {
            // Existing has cancelledAt but current doesn't, keep existing
            // (no change needed)
          } else {
            // Neither has cancelledAt, compare by _id (keep the one that comes later alphabetically)
            if ((booking._id || '') > (existing._id || '')) {
              seenMeals.set(key, booking);
            }
          }
        }
      });

      // Convert map values to array
      const filteredCancelled = Array.from(seenMeals.values());

      // Get active bookings (Confirmed, Pending, etc.) to check if cancelled bookings have been re-booked
      const active = allBookings.filter(
        booking => booking.status !== 'Cancelled'
      );

      setCancelledBookings(filteredCancelled);
      setActiveBookings(active);
    } catch (err) {
      console.error('Error fetching data:', err);
      showNotification('error', 'Failed to load cancellation history');
    }
    setLoading(false);
  }, [showNotification]);

  useEffect(() => {
    const userData = JSON.parse(localStorage.getItem('user'));
    if (!userData) {
      navigate('/login');
      return;
    }
    
    // Redirect Officer Cadets away from cancellation page
    if (userData.role === 'Officer Cadet') {
      alert('Cancellation is not available for Officer Cadets. As military personnel, all meals and tea are compulsory.');
      navigate('/officer-cadet-dashboard');
      return;
    }
    
    if (userData.role !== 'Day Scholar') {
      alert('Access denied.');
      navigate('/login');
      return;
    }
    
    setUser(userData);
    fetchData();
  }, [navigate, fetchData]);

  const handleLogout = () => {
    localStorage.removeItem('user');
    localStorage.removeItem('token');
    navigate('/login');
  };

  // Sidebar navigation - Only Day Scholar
  const getNavigationItems = () => {
    return [
      { icon: LayoutDashboard, label: 'Dashboard', path: '/day-scholar-dashboard' },
      { icon: UtensilsCrossed, label: 'Menu Page', path: '/view-menu' },
      { icon: BookOpen, label: 'Booking', path: '/booking' },
      { icon: Clock, label: 'Cancellation', path: '/cancel-booking' },
      { icon: HistoryIcon, label: 'Order History', path: '/order-history' },
      { icon: Settings, label: 'Settings', path: '/settings' },
      { icon: FileText, label: 'Monthly Bill', path: '/monthly-bill' }
    ];
  };

  // Cancellation policy for Day Scholar only
  const getCancellationPolicy = () => {
    return [
      'Meal bookings must be cancelled at least 24 hours before the scheduled meal time',
      'Tea requests must be cancelled at least 1 day before the scheduled date',
      'Refunds for cancelled meals will be processed within 3-5 business days',
      'Late cancellations will not be eligible for refunds'
    ];
  };

  // Calculate cutoff time based on meal type and order date
  const calculateCutoffTime = (orderDate, mealType) => {
    const date = new Date(orderDate);
    const cutoffTime = new Date(date);
    
    if (mealType === 'Breakfast') cutoffTime.setHours(1, 0, 0, 0);
    else if (mealType === 'Lunch') cutoffTime.setHours(6, 0, 0, 0);
    else if (mealType === 'Dinner') cutoffTime.setHours(13, 0, 0, 0);
    else if (mealType === 'Morning Tea') cutoffTime.setHours(4, 0, 0, 0);
    else if (mealType === 'Mid-Morning Tea') cutoffTime.setHours(9, 0, 0, 0);
    else if (mealType === 'Evening Tea') cutoffTime.setHours(16, 0, 0, 0);
    else if (mealType === 'Night Tea') cutoffTime.setHours(20, 0, 0, 0);
    
    return cutoffTime;
  };

  // Check if a cancelled booking has already been re-booked
  const isRebooked = (booking) => {
    const orderDate = booking.date || booking.orderDate;
    if (!orderDate) return false;

    // Check if there's an active booking for the same date and meal type
    const bookingDate = new Date(orderDate).toISOString().split('T')[0];
    return activeBookings.some(activeBooking => {
      const activeDate = new Date(activeBooking.date || activeBooking.orderDate).toISOString().split('T')[0];
      return activeDate === bookingDate && 
             activeBooking.mealType === booking.mealType &&
             activeBooking.status !== 'Cancelled';
    });
  };

  // Check if this is the first eligible cancelled booking for the same meal (date + meal type)
  const isFirstEligibleForRebook = (booking) => {
    const orderDate = booking.date || booking.orderDate;
    if (!orderDate) return false;

    const bookingDate = new Date(orderDate).toISOString().split('T')[0];
    
    // Find all cancelled bookings for the same date and meal type
    const sameMealCancelled = cancelledBookings.filter(b => {
      const bDate = new Date(b.date || b.orderDate).toISOString().split('T')[0];
      return bDate === bookingDate && b.mealType === booking.mealType;
    });

    // If there's only one, it's eligible
    if (sameMealCancelled.length === 1) return true;

    // If multiple, check if this one is eligible for re-booking (24 hours check)
    const cutoffTime = booking.cutoffTime 
      ? new Date(booking.cutoffTime)
      : calculateCutoffTime(orderDate, booking.mealType);
    
    const now = new Date();
    const bookingDeadline = new Date(cutoffTime);
    bookingDeadline.setHours(bookingDeadline.getHours() - 24);
    
    if (now >= bookingDeadline) return false; // Deadline passed

    // Sort by cancelledAt (most recent first) or by _id if cancelledAt is not available
    const sorted = sameMealCancelled.sort((a, b) => {
      if (a.cancelledAt && b.cancelledAt) {
        return new Date(b.cancelledAt) - new Date(a.cancelledAt);
      }
      return (b._id || '').localeCompare(a._id || '');
    });

    // Check if this booking is the first one in the sorted list that's eligible
    for (const b of sorted) {
      const bCutoffTime = b.cutoffTime 
        ? new Date(b.cutoffTime)
        : calculateCutoffTime(new Date(b.date || b.orderDate), b.mealType);
      const bDeadline = new Date(bCutoffTime);
      bDeadline.setHours(bDeadline.getHours() - 24);
      
      if (now < bDeadline && !isRebooked(b)) {
        // This is the first eligible one
        return b._id === booking._id;
      }
    }

    return false;
  };

  // Check if a cancelled booking can be re-booked (must be at least 24 hours before meal time)
  const canRebook = (booking) => {
    // First check if already re-booked
    if (isRebooked(booking)) {
      return false;
    }

    // Check if this is the first eligible booking for the same meal
    if (!isFirstEligibleForRebook(booking)) {
      return false;
    }

    const orderDate = booking.date || booking.orderDate;
    if (!orderDate) return false;

    // Use cutoffTime from booking if available, otherwise calculate it
    const cutoffTime = booking.cutoffTime 
      ? new Date(booking.cutoffTime)
      : calculateCutoffTime(orderDate, booking.mealType);
    
    const now = new Date();
    const bookingDeadline = new Date(cutoffTime);
    bookingDeadline.setHours(bookingDeadline.getHours() - 24); // 24 hours before cutoff time
    
    return now < bookingDeadline;
  };

  // Handle re-booking a cancelled meal
  const handleRebook = async (booking) => {
    if (!canRebook(booking)) {
      showNotification('error', 'Cannot re-book. Re-booking must be done at least 24 hours before the meal time.');
      return;
    }

    if (!window.confirm(`Are you sure you want to re-book ${booking.mealType} for ${new Date(booking.date || booking.orderDate).toLocaleDateString('en-GB')}?`)) {
      return;
    }

    setRebooking(prev => ({ ...prev, [booking._id]: true }));
    
    try {
      const token = localStorage.getItem('token');
      const orderDate = booking.date || booking.orderDate;
      const dateStr = new Date(orderDate).toISOString().split('T')[0];
      
      await axios.post('/bookings/create', {
        date: dateStr,
        mealType: booking.mealType,
        category: booking.mealType.includes('Tea') ? 'Beverage' : (booking.category || 'Vegetarian'),
        specialRequests: booking.specialRequests || ''
      }, {
        headers: { 'x-auth-token': token }
      });

      showNotification('success', `${booking.mealType} re-booked successfully!`);
      await fetchData(); // Refresh the list
      
      // Notify other pages to refresh their data
      window.dispatchEvent(new CustomEvent('bookingUpdated'));
    } catch (err) {
      const errorMsg = err.response?.data?.msg || 'Failed to re-book';
      showNotification('error', errorMsg);
    } finally {
      setRebooking(prev => ({ ...prev, [booking._id]: false }));
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-950 via-blue-900 to-blue-800 flex items-center justify-center">
        <div className="text-white text-2xl font-semibold">Loading...</div>
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
            <p className="text-base text-gray-600 mt-1">{user?.role} Portal</p>
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
            {notification.show && (
              <div className={`fixed top-6 right-6 z-50 flex items-center gap-3 px-6 py-4 rounded-lg shadow-lg ${
                notification.type === 'success' ? 'bg-green-500' : 'bg-red-500'
              } text-white`}>
                {notification.type === 'success' ? (
                  <CheckCircle className="w-6 h-6" />
                ) : (
                  <XCircle className="w-6 h-6" />
                )}
                <span className="font-bold text-base">{notification.message}</span>
              </div>
            )}

            {/* Header */}
            <div className="bg-white rounded-xl shadow-lg p-8 mb-6">
              <h1 className="text-4xl font-bold text-blue-950 text-center">Cancellation History</h1>
              <p className="text-gray-600 mt-2 text-lg text-center">View all your cancelled bookings</p>
            </div>

            {/* Cancellation Policy - Center Aligned */}
            <div className="bg-red-100 border-l-4 border-red-600 rounded-xl p-6 mb-6">
              <div className="flex flex-col items-center text-center">
                <div className="flex items-center gap-3 mb-4">
                  <AlertCircle className="w-7 h-7 text-red-700 flex-shrink-0" />
                  <h3 className="font-bold text-red-900 text-2xl">Cancellation Policy</h3>
                </div>
                <ul className="text-base text-red-800 space-y-2 inline-block text-left">
                  {getCancellationPolicy().map((policy, index) => (
                    <li key={index} className="font-medium">• {policy}</li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Cancellation History */}
            <div className="bg-white rounded-xl shadow-lg p-8">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-3xl font-bold text-blue-950">Cancelled Bookings</h2>
                <span className="text-lg font-semibold text-gray-600">
                  Total: {cancelledBookings.length}
                </span>
              </div>
              
              {cancelledBookings.length === 0 ? (
                <div className="text-center py-16 bg-gray-50 rounded-xl">
                  <HistoryIcon className="w-24 h-24 mx-auto mb-4 text-gray-300" />
                  <p className="text-gray-500 font-bold text-2xl mb-2">No Cancellation History</p>
                  <p className="text-lg text-gray-400">Your cancelled bookings will appear here</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {cancelledBookings.map((booking) => (
                    <div
                      key={booking._id}
                      className="border-2 border-red-200 rounded-xl p-6 bg-red-50 hover:shadow-lg transition-shadow"
                    >
                      <div className="flex justify-between items-start mb-4">
                        <div className="flex-1">
                          <h3 className="font-bold text-xl text-gray-800 mb-2">{booking.mealType}</h3>
                          <p className="text-base text-gray-600">
                            {new Date(booking.date || booking.orderDate).toLocaleDateString('en-GB', {
                              weekday: 'long',
                              day: 'numeric',
                              month: 'short',
                              year: 'numeric'
                            })}
                          </p>
                        </div>
                        <span className="px-4 py-2 rounded-full text-sm font-bold bg-red-500 text-white shadow-md">
                          Cancelled
                        </span>
                      </div>

                      {booking.specialRequests && (
                        <div className="mb-4 bg-white p-3 rounded-lg border border-red-200">
                          <p className="text-sm text-gray-600">
                            <span className="font-bold">Special Requests:</span>{' '}
                            {booking.specialRequests}
                          </p>
                        </div>
                      )}

                      {booking.cancelledAt && (
                        <div className="pt-4 border-t border-red-300 mb-4">
                          <p className="text-sm text-gray-600 flex items-center gap-2">
                            <Clock className="w-4 h-4 text-gray-500" />
                            <span className="font-medium">Cancelled on:</span>
                          </p>
                          <p className="text-sm text-gray-700 font-bold mt-1 ml-6">
                            {new Date(booking.cancelledAt).toLocaleDateString('en-GB', {
                              day: 'numeric',
                              month: 'short',
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </p>
                        </div>
                      )}

                      {/* Re-book Button */}
                      <div className="pt-4 border-t border-red-300">
                        {isRebooked(booking) ? (
                          <div className="w-full px-4 py-2 bg-green-100 border-2 border-green-500 text-green-700 font-semibold rounded-lg text-center text-sm">
                            ✓ Already Re-booked
                          </div>
                        ) : canRebook(booking) ? (
                          <button
                            onClick={() => handleRebook(booking)}
                            disabled={rebooking[booking._id]}
                            className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white font-semibold rounded-lg transition-colors shadow-md"
                          >
                            <RotateCw className={`w-4 h-4 ${rebooking[booking._id] ? 'animate-spin' : ''}`} />
                            <span>{rebooking[booking._id] ? 'Re-booking...' : 'Re-book Meal'}</span>
                          </button>
                        ) : (() => {
                          // Check if there are other cancelled bookings for the same meal that can be re-booked
                          const orderDate = booking.date || booking.orderDate;
                          if (!orderDate) {
                            return (
                              <div className="w-full px-4 py-2 bg-gray-200 text-gray-600 font-semibold rounded-lg text-center text-sm">
                                Re-booking deadline passed
                              </div>
                            );
                          }
                          
                          const bookingDate = new Date(orderDate).toISOString().split('T')[0];
                          const sameMealCancelled = cancelledBookings.filter(b => {
                            const bDate = new Date(b.date || b.orderDate).toISOString().split('T')[0];
                            return bDate === bookingDate && 
                                   b.mealType === booking.mealType &&
                                   b._id !== booking._id;
                          });
                          
                          // Check if any other cancelled booking for the same meal is eligible (without the "first" check)
                          const hasOtherEligible = sameMealCancelled.some(b => {
                            if (isRebooked(b)) return false;
                            const bOrderDate = b.date || b.orderDate;
                            if (!bOrderDate) return false;
                            const bCutoffTime = b.cutoffTime 
                              ? new Date(b.cutoffTime)
                              : calculateCutoffTime(bOrderDate, b.mealType);
                            const now = new Date();
                            const bDeadline = new Date(bCutoffTime);
                            bDeadline.setHours(bDeadline.getHours() - 24);
                            return now < bDeadline;
                          });
                          
                          if (hasOtherEligible) {
                            return (
                              <div className="w-full px-4 py-2 bg-blue-100 border-2 border-blue-400 text-blue-700 font-semibold rounded-lg text-center text-sm">
                                Another cancellation for this meal can be re-booked
                              </div>
                            );
                          }
                          
                          return (
                            <div className="w-full px-4 py-2 bg-gray-200 text-gray-600 font-semibold rounded-lg text-center text-sm">
                              Re-booking deadline passed
                            </div>
                          );
                        })()}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
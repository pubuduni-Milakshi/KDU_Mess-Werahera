import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Calendar, 
  UtensilsCrossed, 
  BookOpen, 
  History, 
  Settings, 
  FileText,
  LogOut,
  User,
  MapPin,
  LayoutDashboard,
  CheckCircle2,
  Coffee
} from 'lucide-react';
import axios from '../api/axios';

export default function OfficerCadetDashboard() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [todayMeals, setTodayMeals] = useState({
    breakfast: { served: false, time: '7:00 - 9:00 AM' },
    lunch: { served: false, time: '12:00 - 2:00 PM' },
    dinner: { served: false, time: '7:00 - 9:00 PM' }
  });
  const [teaBookings, setTeaBookings] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchDashboardData = useCallback(async () => {
    setLoading(true);
    try {
      // Fetch today's meal status and upcoming tea bookings
      try {
        const token = localStorage.getItem('token');
        const dashboardResponse = await axios.get('/bookings/officer-dashboard', {
          headers: { 'x-auth-token': token }
        });
        
        if (dashboardResponse.data) {
          // Use functional update to avoid dependency on todayMeals
          setTodayMeals(prevMeals => dashboardResponse.data.todayMeals || prevMeals);
          setTeaBookings(dashboardResponse.data.upcomingTeaBookings || []);
        }
      } catch (dashboardErr) {
        console.error('Error fetching dashboard data:', dashboardErr);
      }
    } catch (err) {
      console.error('Error fetching dashboard data:', err);
    }
    setLoading(false);
  }, []); // Empty dependency array since it doesn't depend on any props or state

  useEffect(() => {
    const userData = JSON.parse(localStorage.getItem('user'));
    if (!userData || userData.role !== 'Officer Cadet') {
      alert('Access denied. This dashboard is only for Officer Cadets.');
      navigate('/login');
      return;
    }
    setUser(userData);
    fetchDashboardData();
  }, [navigate, fetchDashboardData]); // Added fetchDashboardData to dependencies

  const getTeaImage = (teaType) => {
    const teaImages = {
      'Morning Tea': 'https://images.unsplash.com/photo-1556679343-c7306c1976bc?w=400&h=300&fit=crop',
      'Mid-Morning Tea': 'https://images.unsplash.com/photo-1556679343-c7306c1976bc?w=400&h=300&fit=crop',
      'Evening Tea': 'https://images.unsplash.com/photo-1594631661960-9158ca1e4b97?w=400&h=300&fit=crop',
      'Night Tea': 'https://images.unsplash.com/photo-1576092768241-dec231879fc3?w=400&h=300&fit=crop'
    };
    return teaImages[teaType] || 'https://images.unsplash.com/photo-1556679343-c7306c1976bc?w=400&h=300&fit=crop';
  };

  const handleLogout = () => {
    localStorage.removeItem('user');
    localStorage.removeItem('token');
    navigate('/login');
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
            <p className="text-base text-gray-600 mt-1">Officer Cadet Portal</p>
          </div>

          <nav className="px-4 py-4 space-y-2 flex-1 overflow-y-auto scrollbar-thin">
            <button
              onClick={() => navigate('/officer-cadet-dashboard')}
              className="w-full flex items-center gap-3 px-4 py-3 bg-blue-50 text-blue-700 rounded-lg font-semibold text-base transition-colors"
            >
              <LayoutDashboard className="w-6 h-6 flex-shrink-0" />
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
          {/* Welcome Header */}
          <div className="bg-white rounded-xl shadow-lg p-8 mb-6">
            <div className="flex items-start justify-between">
              <div>
                <h1 className="text-4xl font-bold text-blue-950">
                  Welcome, {user?.firstName} {user?.lastName}
                </h1>
                <div className="flex items-center gap-6 mt-4 text-gray-600">
                  <div className="flex items-center gap-2">
                    <User className="w-5 h-5" />
                    <span className="font-semibold text-lg">{user?.role}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <BookOpen className="w-5 h-5" />
                    <span className="text-lg">{user?.faculty}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Calendar className="w-5 h-5" />
                    <span className="text-lg">Intake {user?.intake}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <MapPin className="w-5 h-5" />
                    <span className="text-lg">Room {user?.roomNo}</span>
                  </div>
                </div>
              </div>
              <div className="bg-gradient-to-br from-blue-900 to-amber-500 text-white px-6 py-3 rounded-lg">
                <p className="text-base font-semibold">Cadet ID</p>
                <p className="text-2xl font-bold">{user?.roleId}</p>
              </div>
            </div>
          </div>

          {/* Today's Meals Status */}
          <div className="bg-white rounded-xl shadow-lg p-8 mb-6">
            <h2 className="text-3xl font-bold text-blue-950 mb-6">Today's Meals (Auto-Enrolled)</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Breakfast Status */}
              <div className={`rounded-xl overflow-hidden border-2 transition-all ${
                todayMeals.breakfast.served 
                  ? 'border-green-500 shadow-lg' 
                  : 'border-gray-300'
              }`}>
                <div className="relative h-48 overflow-hidden">
                  <img 
                    src="https://images.unsplash.com/photo-1533089860892-a7c6f0a88666?w=400" 
                    alt="Breakfast"
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute top-3 right-3 bg-white px-4 py-2 rounded-full shadow-lg">
                    <span className="text-blue-900 font-bold text-sm">Included</span>
                  </div>
                  {todayMeals.breakfast.served && (
                    <div className="absolute inset-0 bg-green-500 bg-opacity-20 flex items-center justify-center">
                      <div className="bg-white rounded-full p-3 shadow-xl">
                        <CheckCircle2 className="w-12 h-12 text-green-600" />
                      </div>
                    </div>
                  )}
                </div>
                <div className={`p-6 ${
                  todayMeals.breakfast.served ? 'bg-green-50' : 'bg-gray-50'
                }`}>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-2xl font-bold text-gray-800">Breakfast</h3>
                  </div>
                  <div className="flex items-center gap-2 text-gray-600 mb-2">
                    <Calendar className="w-4 h-4" />
                    <span className="text-sm">{todayMeals.breakfast.time}</span>
                  </div>
                  <p className={`font-semibold text-lg ${
                    todayMeals.breakfast.served ? 'text-green-700' : 'text-gray-600'
                  }`}>
                    {todayMeals.breakfast.served ? '✓ Served' : 'Pending'}
                  </p>
                </div>
              </div>

              {/* Lunch Status */}
              <div className={`rounded-xl overflow-hidden border-2 transition-all ${
                todayMeals.lunch.served 
                  ? 'border-green-500 shadow-lg' 
                  : 'border-gray-300'
              }`}>
                <div className="relative h-48 overflow-hidden">
                  <img 
                    src="https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400" 
                    alt="Lunch"
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute top-3 right-3 bg-white px-4 py-2 rounded-full shadow-lg">
                    <span className="text-blue-900 font-bold text-sm">Included</span>
                  </div>
                  {todayMeals.lunch.served && (
                    <div className="absolute inset-0 bg-green-500 bg-opacity-20 flex items-center justify-center">
                      <div className="bg-white rounded-full p-3 shadow-xl">
                        <CheckCircle2 className="w-12 h-12 text-green-600" />
                      </div>
                    </div>
                  )}
                </div>
                <div className={`p-6 ${
                  todayMeals.lunch.served ? 'bg-green-50' : 'bg-gray-50'
                }`}>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-2xl font-bold text-gray-800">Lunch</h3>
                  </div>
                  <div className="flex items-center gap-2 text-gray-600 mb-2">
                    <Calendar className="w-4 h-4" />
                    <span className="text-sm">{todayMeals.lunch.time}</span>
                  </div>
                  <p className={`font-semibold text-lg ${
                    todayMeals.lunch.served ? 'text-green-700' : 'text-gray-600'
                  }`}>
                    {todayMeals.lunch.served ? '✓ Served' : 'Pending'}
                  </p>
                </div>
              </div>

              {/* Dinner Status */}
              <div className={`rounded-xl overflow-hidden border-2 transition-all ${
                todayMeals.dinner.served 
                  ? 'border-green-500 shadow-lg' 
                  : 'border-gray-300'
              }`}>
                <div className="relative h-48 overflow-hidden">
                  <img 
                    src="https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=400" 
                    alt="Dinner"
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute top-3 right-3 bg-white px-4 py-2 rounded-full shadow-lg">
                    <span className="text-blue-900 font-bold text-sm">Included</span>
                  </div>
                  {todayMeals.dinner.served && (
                    <div className="absolute inset-0 bg-green-500 bg-opacity-20 flex items-center justify-center">
                      <div className="bg-white rounded-full p-3 shadow-xl">
                        <CheckCircle2 className="w-12 h-12 text-green-600" />
                      </div>
                    </div>
                  )}
                </div>
                <div className={`p-6 ${
                  todayMeals.dinner.served ? 'bg-green-50' : 'bg-gray-50'
                }`}>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-2xl font-bold text-gray-800">Dinner</h3>
                  </div>
                  <div className="flex items-center gap-2 text-gray-600 mb-2">
                    <Calendar className="w-4 h-4" />
                    <span className="text-sm">{todayMeals.dinner.time}</span>
                  </div>
                  <p className={`font-semibold text-lg ${
                    todayMeals.dinner.served ? 'text-green-700' : 'text-gray-600'
                  }`}>
                    {todayMeals.dinner.served ? '✓ Served' : 'Pending'}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Upcoming Tea Bookings */}
          <div className="bg-white rounded-xl shadow-lg p-8 mb-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-3xl font-bold text-blue-950">My Tea Bookings</h2>
              <button
                onClick={() => navigate('/booking')}
                className="text-blue-600 hover:text-blue-800 font-semibold text-base"
              >
                Book Tea →
              </button>
            </div>
            
            {teaBookings.length === 0 ? (
              <div className="text-center py-12 bg-gray-50 rounded-lg">
                <Coffee className="w-20 h-20 mx-auto mb-4 text-gray-300" />
                <h3 className="text-2xl font-bold text-gray-700 mb-3">No Tea Bookings</h3>
                <p className="text-gray-500 text-lg mb-6">
                  You haven't booked any tea yet.
                  <br />
                  Book your tea now!
                </p>
                <button
                  onClick={() => navigate('/booking')}
                  className="bg-gradient-to-r from-blue-900 to-amber-500 text-white px-10 py-4 rounded-lg font-bold text-lg hover:from-blue-950 hover:to-amber-600 transition-all shadow-md"
                >
                  Book Tea
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {teaBookings.map((booking) => (
                  <div key={booking._id} className="bg-white rounded-xl shadow-md overflow-hidden hover:shadow-xl transition-shadow border border-gray-100">
                    <div className="relative h-40 overflow-hidden bg-gray-100">
                      <img 
                        src={getTeaImage(booking.mealType)} 
                        alt={booking.mealType}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          e.target.onerror = null;
                          e.target.src = 'https://images.unsplash.com/photo-1556679343-c7306c1976bc?w=400&h=300&fit=crop';
                        }}
                      />
                      <div className="absolute top-2 right-2 bg-white px-3 py-1 rounded-full shadow-lg">
                        <span className="text-blue-900 font-bold text-xs">Rs. 100</span>
                      </div>
                    </div>
                    <div className="p-4">
                      <h3 className="font-bold text-gray-800 text-lg mb-1">{booking.mealType}</h3>
                      <p className="text-sm text-gray-600 mb-2">
                        {new Date(booking.date || booking.orderDate).toLocaleDateString('en-GB', { 
                          weekday: 'short', 
                          day: 'numeric',
                          month: 'short'
                        })}
                      </p>
                      <span className={`inline-block px-3 py-1 rounded-full text-xs font-bold ${
                        booking.status === 'Confirmed' ? 'bg-green-100 text-green-700' :
                        booking.status === 'Pending' ? 'bg-yellow-100 text-yellow-700' :
                        'bg-red-100 text-red-700'
                      }`}>
                        {booking.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
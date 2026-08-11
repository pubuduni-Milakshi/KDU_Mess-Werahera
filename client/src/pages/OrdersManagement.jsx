import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { 
  Search, 
  Filter,
  UtensilsCrossed,
  MessageSquare,
  Settings,
  LogOut,
  UsersIcon,
  ClipboardList,
  BookOpenIcon,
  ShoppingCartIcon,
  LayoutDashboard
} from 'lucide-react';
import axios from '../api/axios';

export default function OrdersManagement() {
  const navigate = useNavigate();
  const location = useLocation();
  const [user, setUser] = useState(null);
  const [orders, setOrders] = useState([]);
  const [filteredOrders, setFilteredOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState({
    date: 'today', // Default to today
    mealType: 'All',
    status: 'All'
  });

  // Apply filters function - doesn't depend on state to avoid circular dependencies
  const applyFilters = (search, currentFilters, ordersToFilter) => {
    let filtered = [...ordersToFilter];

    if (search) {
      filtered = filtered.filter(order => 
        order.studentId?.toLowerCase().includes(search.toLowerCase()) ||
        order.studentName?.toLowerCase().includes(search.toLowerCase())
      );
    }

    if (currentFilters.date && currentFilters.date !== 'all') {
      if (currentFilters.date === 'today') {
        const today = new Date().toISOString().split('T')[0];
        filtered = filtered.filter(order => {
          const orderDate = new Date(order.date).toISOString().split('T')[0];
          return orderDate === today;
        });
      } else {
        filtered = filtered.filter(order => {
          const orderDate = new Date(order.date).toISOString().split('T')[0];
          return orderDate === currentFilters.date;
        });
      }
    }

    if (currentFilters.mealType !== 'All') {
      filtered = filtered.filter(order => order.mealType === currentFilters.mealType);
    }

    if (currentFilters.status !== 'All') {
      filtered = filtered.filter(order => order.status === currentFilters.status);
    }

    setFilteredOrders(filtered);
  };

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    try {
      const response = await axios.get('/bookings/all');
      const bookingsData = response.data || [];
      
      const transformedOrders = bookingsData
        .filter(booking => booking.status !== 'Cancelled') // Filter out cancelled orders
        .map(booking => ({
          _id: booking._id,
          studentId: booking.userId?.roleId || 'N/A',
          studentName: booking.userId ? `${booking.userId.firstName} ${booking.userId.lastName}` : 'Unknown',
          mealType: booking.mealType || 'N/A',
          foodType: booking.category || 'Vegetarian',
          includeTea: booking.mealType?.includes('Tea') || false,
          date: booking.orderDate,
          status: booking.status || 'Confirmed'
        }));

      setOrders(transformedOrders);
      
      // Set default filter to today's date (filtering will be applied by useEffect)
      setFilters({
        date: 'today',
        mealType: 'All',
        status: 'All'
      });
    } catch (err) {
      console.error('Error fetching orders:', err);
      if (err.response?.status === 401) {
        alert('Session expired. Please login again.');
        navigate('/login');
      }
      setOrders([]);
      setFilteredOrders([]);
    }
    setLoading(false);
  }, [navigate]);

  // Apply filters whenever orders, filters, or searchTerm changes
  useEffect(() => {
    if (orders.length > 0) {
      applyFilters(searchTerm, filters, orders);
    }
  }, [orders, filters, searchTerm]);

  useEffect(() => {
    const userData = JSON.parse(localStorage.getItem('user'));
    if (!userData) {
      navigate('/login');
      return;
    }
    if (userData.role !== 'Mess Staff' && userData.role !== 'Admin') {
      alert('Access denied. Only Mess Staff and Admin can view orders.');
      navigate('/login');
      return;
    }
    setUser(userData);
    fetchOrders();
  }, [navigate, fetchOrders]);

  const handleStatusChange = async (orderId, newStatus) => {
    if (!window.confirm(`Are you sure you want to mark this order as ${newStatus}?`)) {
      return;
    }

    try {
      await axios.put(`/bookings/${orderId}/status`, { status: newStatus });
      alert(`Order status updated to ${newStatus} successfully`);
      fetchOrders();
    } catch (err) {
      console.error('Error updating status:', err);
      alert(err.response?.data?.msg || 'Failed to update order status');
    }
  };

  const handleSearch = (value) => {
    setSearchTerm(value);
    // Filtering will be applied automatically by useEffect
  };

  const handleFilterChange = (key, value) => {
    const newFilters = { ...filters, [key]: value };
    setFilters(newFilters);
    // Filtering will be applied automatically by useEffect
  };

  // Get unique dates from orders for dropdown
  const getAvailableDates = () => {
    const dates = new Set();
    orders.forEach(order => {
      if (order.date) {
        const dateStr = new Date(order.date).toISOString().split('T')[0];
        dates.add(dateStr);
      }
    });
    return Array.from(dates).sort().reverse(); // Most recent first
  };

  // Check if order date is today
  const isOrderDateToday = (orderDate) => {
    if (!orderDate) return false;
    const today = new Date().toISOString().split('T')[0];
    const orderDateStr = new Date(orderDate).toISOString().split('T')[0];
    return orderDateStr === today;
  };

  const handleLogout = () => {
    localStorage.removeItem('user');
    localStorage.removeItem('token');
    navigate('/login');
  };

  const getNavigationItems = () => {
    if (user?.role === 'Admin') {
      return [
        { icon: LayoutDashboard, label: 'Dashboard', path: '/admin-dashboard' },
        { icon: BookOpenIcon, label: 'View Menu', path: '/view-menu' },
        { icon: UtensilsCrossed, label: 'Menu Management', path: '/menu-management' },
        { icon: ShoppingCartIcon, label: 'Orders Management', path: '/orders-management' },
        { icon: UsersIcon, label: 'User Management', path: '/user-management' },
        { icon: ClipboardList, label: 'Reports', path: '/reports' },
        { icon: MessageSquare, label: 'Feedback', path: '/feedback' },
        { icon: Settings, label: 'Settings', path: '/settings' }
      ];
    } else if (user?.role === 'Mess Staff') {
      return [
        { icon: LayoutDashboard, label: 'Dashboard', path: '/mess-staff-dashboard' },
        { icon: BookOpenIcon, label: 'View Menu', path: '/view-menu' },
        { icon: ShoppingCartIcon, label: 'Order Management', path: '/orders-management' },
        { icon: ClipboardList, label: 'Reports', path: '/reports' },
        { icon: MessageSquare, label: 'Feedback', path: '/feedback' },
        { icon: Settings, label: 'Settings', path: '/settings' }
      ];
    }
    return [];
  };

  const getStatusBadgeColor = (status) => {
    switch (status) {
      case 'Served':
      case 'Completed':
        return 'bg-green-100 text-green-700';
      case 'Confirmed':
      case 'Booked':
      case 'Pending':
        return 'bg-yellow-100 text-yellow-700';
      case 'Cancelled':
        return 'bg-red-100 text-red-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  // Calculate statistics - treat Confirmed/Booked as Pending
  const getPendingCount = () => {
    return filteredOrders.filter(o => 
      o.status === 'Confirmed' || 
      o.status === 'Booked' || 
      o.status === 'Pending'
    ).length;
  };

  const getServedCount = () => {
    return filteredOrders.filter(o => 
      o.status === 'Served' || 
      o.status === 'Completed'
    ).length;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-950 via-blue-900 to-blue-800 flex items-center justify-center">
        <div className="text-white text-2xl font-semibold">Loading Orders...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-950 via-blue-900 to-blue-800">
      <div className="flex">
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

        <div className="ml-64 flex-1 p-8 overflow-y-auto">
          <div className="max-w-7xl mx-auto">
            <div className="bg-white rounded-xl shadow-lg p-8 mb-6">
              <h1 className="text-4xl font-bold text-blue-950">Order Management</h1>
              <p className="text-gray-600 mt-2 text-lg">View and manage all current and upcoming meal orders.</p>
            </div>

            <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="md:col-span-1">
                  <label className="block text-base font-bold text-gray-700 mb-2">
                    <Search className="inline w-5 h-5 mr-2" />
                    Search
                  </label>
                  <input
                    type="text"
                    placeholder="Search by student or ID..."
                    value={searchTerm}
                    onChange={(e) => handleSearch(e.target.value)}
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-base"
                  />
                </div>

                <div>
                  <label className="block text-base font-bold text-gray-700 mb-2">
                    <Filter className="inline w-5 h-5 mr-2" />
                    Date
                  </label>
                  <select
                    value={filters.date}
                    onChange={(e) => handleFilterChange('date', e.target.value)}
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-base"
                  >
                    <option value="today">Today</option>
                    <option value="all">All Dates</option>
                    {getAvailableDates().map(date => {
                      const dateObj = new Date(date);
                      const dateStr = dateObj.toLocaleDateString('en-GB', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric'
                      });
                      return (
                        <option key={date} value={date}>
                          {dateStr}
                        </option>
                      );
                    })}
                  </select>
                </div>

                <div>
                  <label className="block text-base font-bold text-gray-700 mb-2">Meal Type</label>
                  <select
                    value={filters.mealType}
                    onChange={(e) => handleFilterChange('mealType', e.target.value)}
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-base"
                  >
                    <option value="All">All Meals</option>
                    <option value="Breakfast">Breakfast</option>
                    <option value="Lunch">Lunch</option>
                    <option value="Dinner">Dinner</option>
                    <option value="Morning Tea">Morning Tea</option>
                    <option value="Mid-Morning Tea">Mid-Morning Tea</option>
                    <option value="Evening Tea">Evening Tea</option>
                    <option value="Night Tea">Night Tea</option>
                  </select>
                </div>

                <div>
                  <label className="block text-base font-bold text-gray-700 mb-2">Status</label>
                  <select
                    value={filters.status}
                    onChange={(e) => handleFilterChange('status', e.target.value)}
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-base"
                  >
                    <option value="All">All Status</option>
                    <option value="Confirmed">Pending</option>
                    <option value="Booked">Booked</option>
                    <option value="Served">Served</option>
                  </select>
                </div>
              </div>

              {/* Summary Stats */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6 pt-6 border-t border-gray-200">
                <div className="bg-yellow-50 p-4 rounded-lg">
                  <p className="text-sm font-semibold text-yellow-700">Pending Orders</p>
                  <p className="text-3xl font-bold text-yellow-900">
                    {getPendingCount()}
                  </p>
                </div>
                <div className="bg-green-50 p-4 rounded-lg">
                  <p className="text-sm font-semibold text-green-700">Served</p>
                  <p className="text-3xl font-bold text-green-900">
                    {getServedCount()}
                  </p>
                </div>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="text-sm font-semibold text-gray-700">Total Orders</p>
                  <p className="text-3xl font-bold text-gray-900">{filteredOrders.length}</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-lg overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gradient-to-r from-blue-900 to-blue-800 text-white">
                    <tr>
                      <th className="text-left py-4 px-6 font-bold text-base">Student/Cadet ID</th>
                      <th className="text-left py-4 px-6 font-bold text-base">Name</th>
                      <th className="text-left py-4 px-6 font-bold text-base">Meal Type</th>
                      <th className="text-center py-4 px-6 font-bold text-base">Food Type</th>
                      <th className="text-center py-4 px-6 font-bold text-base">Order Date</th>
                      <th className="text-center py-4 px-6 font-bold text-base">Status</th>
                      {user?.role === 'Mess Staff' && (
                        <th className="text-center py-4 px-6 font-bold text-base">Action</th>
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredOrders.length === 0 ? (
                      <tr>
                        <td colSpan={user?.role === 'Mess Staff' ? "7" : "6"} className="text-center py-12 text-gray-500">
                          <div className="flex flex-col items-center">
                            <ShoppingCartIcon className="w-16 h-16 text-gray-300 mb-4" />
                            <p className="text-xl font-semibold">No orders found</p>
                            <p className="text-sm text-gray-400 mt-2">Try adjusting your filters</p>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      filteredOrders.map((order, index) => (
                        <tr 
                          key={order._id} 
                          className={`border-b border-gray-100 hover:bg-blue-50 transition-colors ${
                            index % 2 === 0 ? 'bg-white' : 'bg-gray-50'
                          }`}
                        >
                          <td className="py-4 px-6 text-base font-semibold text-gray-800">
                            {order.studentId}
                          </td>
                          <td className="py-4 px-6 text-base font-medium text-gray-800">
                            {order.studentName}
                          </td>
                          <td className="py-4 px-6 text-base font-medium text-gray-800">
                            {order.mealType}
                          </td>
                          <td className="py-4 px-6 text-center">
                            <span className={`px-3 py-1 rounded-full text-sm font-bold ${
                              order.foodType === 'Vegetarian' ? 'bg-green-100 text-green-700' :
                              'bg-red-100 text-red-700'
                            }`}>
                              {order.foodType === 'Vegetarian' ? 'Veg' : 'Non-Veg'}
                            </span>
                          </td>
                          <td className="py-4 px-6 text-center text-base font-medium text-gray-700">
                            {new Date(order.date).toLocaleDateString('en-GB', {
                              day: 'numeric',
                              month: 'short',
                              year: 'numeric'
                            })}
                          </td>
                          <td className="py-4 px-6 text-center">
                            <span className={`px-4 py-2 rounded-full text-sm font-bold ${getStatusBadgeColor(order.status)}`}>
                              {order.status === 'Confirmed' ? 'Booked' : order.status}
                            </span>
                          </td>
                          {user?.role === 'Mess Staff' && (
                            <td className="py-4 px-6 text-center">
                              {(order.status === 'Pending' || order.status === 'Confirmed' || order.status === 'Booked') && (
                                <button
                                  onClick={() => handleStatusChange(order._id, 'Served')}
                                  disabled={!isOrderDateToday(order.date)}
                                  className={`px-4 py-2 rounded-lg text-sm font-bold transition-colors shadow-md ${
                                    isOrderDateToday(order.date)
                                      ? 'bg-green-600 text-white hover:bg-green-700 cursor-pointer'
                                      : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                                  }`}
                                  title={!isOrderDateToday(order.date) ? 'Can only mark as served on the order date' : ''}
                                >
                                  Mark Served
                                </button>
                              )}
                              {(order.status === 'Served' || order.status === 'Completed') && (
                                <span className="text-sm font-semibold text-green-600">✓ Completed</span>
                              )}
                            </td>
                          )}
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {filteredOrders.length > 0 && (
              <div className="bg-white rounded-xl shadow-lg p-4 mt-6">
                <p className="text-center text-gray-600 text-base">
                  Showing <span className="font-bold text-blue-900">{filteredOrders.length}</span> order(s)
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
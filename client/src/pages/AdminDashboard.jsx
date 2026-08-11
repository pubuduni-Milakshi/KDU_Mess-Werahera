import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard,
  UtensilsCrossed,
  ShoppingCart,
  Users,
  FileText,
  Settings,
  LogOut,
  BookOpen,
  MessageSquare
} from 'lucide-react';
import axios from '../api/axios';

export default function AdminDashboard() {
  const navigate = useNavigate();
  const location = useLocation();
  const [user, setUser] = useState(null);
  const [stats, setStats] = useState({
    totalMealsServed: 0,
    activeOrders: 0,
    totalUsers: 0,
    revenue: 0
  });
  const [recentOrders, setRecentOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const userData = JSON.parse(localStorage.getItem('user'));
    if (!userData || userData.role !== 'Admin') {
      alert('Access denied. This dashboard is only for Administrators.');
      navigate('/login');
      return;
    }
    setUser(userData);
    fetchDashboardData();
  }, [navigate]);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const statsResponse = await axios.get('/admin/dashboard-stats');
      if (statsResponse.data) {
        setStats(statsResponse.data);
      }

      const ordersResponse = await axios.get('/admin/recent-orders');
      if (ordersResponse.data) {
        setRecentOrders(ordersResponse.data);
      }
    } catch (err) {
      console.error('Error fetching dashboard data:', err);
    }
    setLoading(false);
  };

  const handleLogout = () => {
    localStorage.removeItem('user');
    localStorage.removeItem('token');
    navigate('/login');
  };

  const navigationItems = [
    { icon: LayoutDashboard, label: 'Dashboard', path: '/admin-dashboard' },
    { icon: BookOpen, label: 'View Menu', path: '/view-menu' },
    { icon: UtensilsCrossed, label: 'Menu Management', path: '/menu-management' },
    { icon: ShoppingCart, label: 'Orders Management', path: '/orders-management' },
    { icon: Users, label: 'User Management', path: '/user-management' },
    { icon: FileText, label: 'Reports', path: '/reports' },
    { icon: MessageSquare, label: 'Feedback', path: '/feedback' },
    { icon: Settings, label: 'Settings', path: '/settings' }
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-950 via-blue-900 to-blue-800 flex items-center justify-center">
        <div className="text-white text-xl">Loading Dashboard...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-950 via-blue-900 to-blue-800">
      <div className="flex">
        {/* Sidebar */}
        <div className="w-64 bg-white min-h-screen shadow-xl flex flex-col">
          <div className="p-6 border-b border-gray-200">
            <h1 className="text-2xl font-bold text-blue-950">KDU Mess</h1>
            <p className="text-sm text-gray-600 mt-1">Admin Portal</p>
          </div>

          <nav className="px-4 py-4 space-y-2 flex-1">
            {navigationItems.map((item, index) => {
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
          <div className="max-w-7xl mx-auto">
            {/* Welcome Section */}
            <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
              <h1 className="text-3xl font-bold text-blue-950">
                Welcome to the Admin Panel
              </h1>
              <p className="text-gray-600 mt-1">
                Administrator: {user?.firstName} {user?.lastName}
              </p>
            </div>

            {/* Stats */}
            <div className="mb-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <h2 className="text-2xl font-bold text-white mb-4">Daily Summary</h2>
                  <div className="bg-white rounded-xl shadow-lg p-6">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-gray-600 font-medium">Total Users</h3>
                      <Users className="w-8 h-8 text-blue-600" />
                    </div>
                    <p className="text-4xl font-bold text-blue-950">{stats.totalUsers}</p>
                    <p className="text-sm text-gray-500 mt-2">Registered users</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Recent Orders */}
            <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-2xl font-bold text-blue-950">Recent Orders</h2>
                <button
                  onClick={() => navigate('/orders-management')}
                  className="text-blue-600 hover:text-blue-800 font-medium text-sm"
                >
                  View All →
                </button>
              </div>

              {recentOrders.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <ShoppingCart className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                  <p>No recent orders</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full border-collapse table-fixed">
                    <thead>
                      <tr className="border-b border-gray-200 bg-gray-50">
                        <th className="px-6 py-3 text-left text-sm font-semibold w-1/4">User ID</th>
                        <th className="px-6 py-3 text-left text-sm font-semibold w-1/4">User Name</th>
                        <th className="px-6 py-3 text-left text-sm font-semibold w-1/4">Meal Type</th>
                        <th className="px-6 py-3 text-left text-sm font-semibold w-1/4">Status</th>
                    </tr>
                    </thead>
                    <tbody>
                      {recentOrders.map((order) => (
                        <tr key={order._id} className="border-b border-gray-100 hover:bg-gray-50">
                          <td className="px-4 py-3 w-1/4 text-gray-800">{order.userId?.roleId || order.userId}</td>
                          <td className="px-4 py-3 w-1/4 text-gray-800">{order.userName || 'Unknown User'}</td>
                          <td className="px-4 py-3 w-1/4 text-gray-800">{order.mealType}</td>
                          <td className="px-4 py-3 w-1/4">
                            <span
                              className={`px-3 py-1 rounded-full text-xs font-medium ${
                                order.status === 'Confirmed'
                                  ? 'bg-green-100 text-green-700'
                                  : order.status === 'Pending'
                                  ? 'bg-yellow-100 text-yellow-700'
                                  : 'bg-red-100 text-red-700'
                              }`}
                            >
                              {order.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
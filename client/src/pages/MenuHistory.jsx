import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Calendar,
  Eye,
  Trash2,
  ChevronDown,
  ChevronUp,
  UtensilsCrossed,
  BookOpen,
  Users,
  FileText,
  MessageSquare,
  Settings,
  LogOut,
  ShoppingCart,
  History,
  Clock
} from 'lucide-react';
import axios from '../api/axios';

export default function MenuHistory() {
  const navigate = useNavigate();
  const location = useLocation();
  const [menuHistory, setMenuHistory] = useState([]);
  const [expandedWeek, setExpandedWeek] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notification, setNotification] = useState({ show: false, type: '', message: '' });

  const showNotification = useCallback((type, message) => {
    setNotification({ show: true, type, message });
    setTimeout(() => setNotification({ show: false, type: '', message: '' }), 3000);
  }, []);

  const fetchMenuHistory = useCallback(async () => {
    setLoading(true);
    try {
      const response = await axios.get('/menu-history');
      setMenuHistory(response.data || []);
    } catch (err) {
      console.error('Error fetching menu history:', err);
      showNotification('error', 'Failed to load menu history');
    }
    setLoading(false);
  }, [showNotification]);

  useEffect(() => {
    const userData = JSON.parse(localStorage.getItem('user'));
    if (!userData || userData.role !== 'Admin') {
      alert('Access denied. This page is only for Administrators.');
      navigate('/login');
      return;
    }
    fetchMenuHistory();
  }, [navigate, fetchMenuHistory]);

  const handleDeleteMenu = async (menuId, weekStart) => {
    if (!window.confirm(`Are you sure you want to delete the menu for week starting ${new Date(weekStart).toLocaleDateString('en-GB')}?`)) {
      return;
    }

    try {
      await axios.delete(`/menu-history/${menuId}`);
      showNotification('success', 'Menu deleted successfully');
      fetchMenuHistory();
    } catch (err) {
      showNotification('error', err.response?.data?.msg || 'Failed to delete menu');
    }
  };

  const toggleWeekExpansion = (weekId) => {
    setExpandedWeek(expandedWeek === weekId ? null : weekId);
  };

  const handleLogout = () => {
    localStorage.removeItem('user');
    localStorage.removeItem('token');
    navigate('/login');
  };

  const navigationItems = [
    { icon: Calendar, label: 'Dashboard', path: '/admin-dashboard' },
    { icon: BookOpen, label: 'View Menu', path: '/view-menu' },
    { icon: UtensilsCrossed, label: 'Menu Management', path: '/menu-management' },
    { icon: ShoppingCart, label: 'Orders Management', path: '/orders-management' },
    { icon: Users, label: 'User Management', path: '/user-management' },
    { icon: FileText, label: 'Reports', path: '/reports' },
    { icon: History, label: 'Menu History', path: '/menu-history' },
    { icon: MessageSquare, label: 'Feedback', path: '/feedback' },
    { icon: Settings, label: 'Settings', path: '/settings' }
  ];

  const getMealTypeIcon = (mealType) => {
    switch (mealType) {
      case 'Breakfast':
        return '🌅';
      case 'Lunch':
        return '🍽️';
      case 'Dinner':
        return '🌙';
      case 'Morning Tea':
      case 'Evening Tea':
      case 'Mid-Morning Tea':
      case 'Night Tea':
        return '☕';
      default:
        return '🍴';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-950 via-blue-900 to-blue-800 flex items-center justify-center">
        <div className="text-white text-xl">Loading Menu History...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-950 via-blue-900 to-blue-800">
      <div className="flex">
        {/* Sidebar */}
        <div className="w-64 bg-white min-h-screen shadow-xl flex flex-col">
          <div className="p-6">
            <h1 className="text-2xl font-bold text-blue-950">KDU Mess</h1>
            <p className="text-sm text-gray-600 mt-1">Admin Portal</p>
          </div>

          <nav className="px-4 space-y-2 flex-1">
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
            {/* Notification */}
            {notification.show && (
              <div className={`fixed top-6 right-6 z-50 px-6 py-4 rounded-lg shadow-lg text-white ${
                notification.type === 'success' ? 'bg-green-500' : 'bg-red-500'
              }`}>
                {notification.message}
              </div>
            )}

            {/* Header */}
            <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-3xl font-bold text-blue-950">Menu History</h1>
                  <p className="text-gray-600 mt-1">View and manage previous weekly menus</p>
                </div>
                <History className="w-12 h-12 text-blue-700" />
              </div>
            </div>

            {/* Menu History List */}
            {menuHistory.length === 0 ? (
              <div className="bg-white rounded-xl shadow-lg p-12 text-center">
                <History className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                <p className="text-gray-500 text-lg">No menu history available</p>
              </div>
            ) : (
              <div className="space-y-4">
                {menuHistory.map((menu) => {
                  const isExpanded = expandedWeek === menu._id;
                  const isCurrentWeek = new Date() >= new Date(menu.weekStartDate) && 
                                       new Date() <= new Date(menu.weekEndDate);

                  return (
                    <div key={menu._id} className="bg-white rounded-xl shadow-lg overflow-hidden">
                      {/* Week Header */}
                      <div className="p-6 border-b border-gray-200">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            <Calendar className="w-8 h-8 text-blue-600" />
                            <div>
                              <h3 className="text-xl font-bold text-blue-950">
                                Week: {new Date(menu.weekStartDate).toLocaleDateString('en-GB', {
                                  day: 'numeric',
                                  month: 'short',
                                  year: 'numeric'
                                })} - {new Date(menu.weekEndDate).toLocaleDateString('en-GB', {
                                  day: 'numeric',
                                  month: 'short',
                                  year: 'numeric'
                                })}
                              </h3>
                              <div className="flex items-center gap-4 mt-1">
                                <p className="text-sm text-gray-600">
                                  <Clock className="inline w-4 h-4 mr-1" />
                                  Last Updated: {new Date(menu.updatedAt).toLocaleDateString('en-GB', {
                                    day: 'numeric',
                                    month: 'short',
                                    year: 'numeric'
                                  })}
                                </p>
                                <p className="text-sm text-gray-600">
                                  Total Meals: {menu.totalMeals}
                                </p>
                                {isCurrentWeek && (
                                  <span className="px-3 py-1 bg-green-100 text-green-700 text-xs font-semibold rounded-full">
                                    Current Week
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => toggleWeekExpansion(menu._id)}
                              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
                            >
                              <Eye className="w-4 h-4" />
                              {isExpanded ? 'Hide' : 'View'} Details
                              {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                            </button>

                            {!isCurrentWeek && (
                              <button
                                onClick={() => handleDeleteMenu(menu._id, menu.weekStartDate)}
                                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center gap-2"
                              >
                                <Trash2 className="w-4 h-4" />
                                Delete
                              </button>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Expanded Menu Details */}
                      {isExpanded && (
                        <div className="p-6 bg-gray-50">
                          <div className="grid grid-cols-7 gap-4">
                            {['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'].map((dayName, dayIndex) => {
                              const dayMeals = menu.meals.filter(meal => meal.day === dayIndex);

                              return (
                                <div key={dayIndex} className="bg-white rounded-lg p-4 shadow">
                                  <h4 className="font-bold text-blue-950 mb-3 text-center border-b pb-2">
                                    {dayName}
                                  </h4>
                                  {dayMeals.length === 0 ? (
                                    <p className="text-gray-400 text-sm text-center">No meals</p>
                                  ) : (
                                    <div className="space-y-3">
                                      {dayMeals.map((meal, idx) => (
                                        <div key={idx} className="border-b border-gray-100 pb-2 last:border-0">
                                          <p className="font-semibold text-sm text-gray-800 flex items-center gap-1">
                                            <span>{getMealTypeIcon(meal.mealType)}</span>
                                            {meal.mealType}
                                          </p>
                                          <p className="text-xs text-gray-600 mt-1">{meal.description}</p>
                                          <div className="flex items-center gap-2 mt-1">
                                            <span className={`text-xs px-2 py-0.5 rounded ${
                                              meal.foodType === 'Vegetarian' 
                                                ? 'bg-green-100 text-green-700' 
                                                : 'bg-red-100 text-red-700'
                                            }`}>
                                              {meal.foodType}
                                            </span>
                                            {meal.tea && (
                                              <span className="text-xs px-2 py-0.5 rounded bg-amber-100 text-amber-700">
                                                + Tea
                                              </span>
                                            )}
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
import React, { useState, useEffect } from 'react';
import { 
  Calendar, 
  Plus, 
  Trash2, 
  Save, 
  Edit, 
  RefreshCw,
  UtensilsCrossed,
  BookOpen,
  MessageSquare,
  Settings,
  LogOut,
  Users as UsersIcon,
  ClipboardList,
  ShoppingCartIcon,
  BookOpenIcon,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import axios from '../api/axios';
import { useNavigate, useLocation } from 'react-router-dom';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const MEAL_TYPES = ['Breakfast', 'Lunch', 'Dinner'];
const CATEGORIES = ['Vegetarian', 'Non-Veg', 'Beverage', 'Dessert'];

export default function MenuManagement() {
  const navigate = useNavigate();
  const location = useLocation();
  const [user, setUser] = useState(null);
  const [weekStartDate, setWeekStartDate] = useState('');
  const [menus, setMenus] = useState({});
  const [loading, setLoading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [currentDayIndex, setCurrentDayIndex] = useState(0);

  // Helper function to parse menu items from saved format
  // Formats: "ItemName (Category), Quantity" or "ItemName (Quantity)" or "ItemName (Category)" or "ItemName"
  const parseMenuItem = (itemStr) => {
    const trimmed = itemStr.trim();
    if (!trimmed) {
      return { name: '', category: 'Vegetarian', quantity: '' };
    }

    // Check for format: "ItemName (Category), Quantity" - Non-Veg with quantity
    const nonVegWithQty = trimmed.match(/^(.+?)\s*\(([^,)]+)\),\s*(.+)$/);
    if (nonVegWithQty) {
      return {
        name: nonVegWithQty[1].trim(),
        category: nonVegWithQty[2].trim(),
        quantity: nonVegWithQty[3].trim()
      };
    }

    // Check for format: "ItemName (Category)" - Non-Veg without quantity
    const nonVegNoQty = trimmed.match(/^(.+?)\s*\(([^)]+)\)$/);
    if (nonVegNoQty) {
      const category = nonVegNoQty[2].trim();
      // Check if it's a known category (not a quantity)
      if (CATEGORIES.includes(category)) {
        return {
          name: nonVegNoQty[1].trim(),
          category: category,
          quantity: ''
        };
      }
      // If not a known category, it might be a quantity for vegetarian item
      // Format: "ItemName (Quantity)"
      return {
        name: nonVegNoQty[1].trim(),
        category: 'Vegetarian',
        quantity: category
      };
    }

    // Plain item name without parentheses
    return { name: trimmed, category: 'Vegetarian', quantity: '' };
  };

  const initializeEmptyMenus = () => {
    const initialMenus = {};
    DAYS.forEach(day => {
      initialMenus[day] = {
        day,
        meals: MEAL_TYPES.map(mealType => ({
          mealType,
          items: [{ name: '', category: 'Vegetarian', quantity: '' }]
        }))
      };
    });
    setMenus(initialMenus);
    setIsEditing(false);
  };

  const loadMenuForDate = async (date) => {
    if (!date) {
      initializeEmptyMenus();
      return;
    }

    setLoading(true);
    try {
      const response = await axios.get(`/menu/week/${date}`);
      
      if (response.data && response.data.length > 0) {
        const menusObj = {};
        
        response.data.forEach(dayMenu => {
          menusObj[dayMenu.day] = {
            day: dayMenu.day,
            _id: dayMenu._id,
            meals: [
              {
                mealType: 'Breakfast',
                items: dayMenu.breakfast ? dayMenu.breakfast.split(', ').map(item => {
                  return parseMenuItem(item);
                }) : [{ name: '', category: 'Vegetarian', quantity: '' }]
              },
              {
                mealType: 'Lunch',
                items: dayMenu.lunch ? dayMenu.lunch.split(', ').map(item => {
                  return parseMenuItem(item);
                }) : [{ name: '', category: 'Vegetarian', quantity: '' }]
              },
              {
                mealType: 'Dinner',
                items: dayMenu.dinner ? dayMenu.dinner.split(', ').map(item => {
                  return parseMenuItem(item);
                }) : [{ name: '', category: 'Vegetarian', quantity: '' }]
              }
            ]
          };
        });
      
        setMenus(menusObj);
        setIsEditing(true);
      } else {
        // No menu found, initialize empty menus
        initializeEmptyMenus();
      }
    } catch (err) {
      console.error(err);
      if (err.response?.status === 404) {
        // No menu found, initialize empty menus
        initializeEmptyMenus();
      } else {
        console.error('Failed to fetch menu:', err);
        // On error, still initialize empty menus so user can create new one
        initializeEmptyMenus();
      }
    }
    setLoading(false);
  };

  useEffect(() => {
    const userData = JSON.parse(localStorage.getItem('user'));
    if (!userData) {
      navigate('/login');
      return;
    }
    if (userData.role !== 'Admin' && userData.role !== 'Mess Staff') {
      alert('Access denied. Only Admin and Mess Staff can manage menus.');
      navigate('/view-menu');
      return;
    }
    setUser(userData);

    const today = new Date();
    const dayOfWeek = today.getDay();
    const diff = today.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
    const weekStart = new Date(today.setDate(diff));
    const initialDate = weekStart.toISOString().split('T')[0];
    setWeekStartDate(initialDate);
  }, [navigate]);

  // Automatically load menu when weekStartDate changes
  useEffect(() => {
    if (weekStartDate) {
      loadMenuForDate(weekStartDate);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [weekStartDate]);

  const fetchMenuForEdit = async () => {
    if (!weekStartDate) {
      alert('Please select a week start date first');
      return;
    }
    await loadMenuForDate(weekStartDate);
    if (isEditing) {
      alert('Menu loaded for editing');
    }
  };

  const addMenuItem = (day, mealIndex) => {
    setMenus(prev => ({
      ...prev,
      [day]: {
        ...prev[day],
        meals: prev[day].meals.map((meal, idx) => 
          idx === mealIndex
            ? { ...meal, items: [...meal.items, { name: '', category: 'Vegetarian', quantity: '' }] }
            : meal
        )
      }
    }));
  };

  const removeMenuItem = (day, mealIndex, itemIndex) => {
    setMenus(prev => ({
      ...prev,
      [day]: {
        ...prev[day],
        meals: prev[day].meals.map((meal, idx) => 
          idx === mealIndex
            ? { ...meal, items: meal.items.filter((_, i) => i !== itemIndex) }
            : meal
        )
      }
    }));
  };

  const updateMenuItem = (day, mealIndex, itemIndex, field, value) => {
    setMenus(prev => ({
      ...prev,
      [day]: {
        ...prev[day],
        meals: prev[day].meals.map((meal, mIdx) => 
          mIdx === mealIndex
            ? {
                ...meal,
                items: meal.items.map((item, iIdx) =>
                  iIdx === itemIndex ? { ...item, [field]: value } : item
                )
              }
            : meal
        )
      }
    }));
  };

  const handlePublish = async () => {
    if (!weekStartDate) {
      alert('Please select a week start date');
      return;
    }

    const hasValidItems = Object.values(menus).some(dayMenu =>
      dayMenu.meals.some(meal =>
        meal.items.some(item => item.name.trim() !== '')
      )
    );

    if (!hasValidItems) {
      alert('Please add at least one menu item before publishing');
      return;
    }

    setLoading(true);
    try {
      const menuArray = Object.values(menus).map(dayMenu => {
        const menuData = { day: dayMenu.day };
        
        dayMenu.meals.forEach(meal => {
          const itemsList = meal.items
            .filter(item => item.name.trim() !== '')
            .map(item => {
              let itemStr = item.name;
              if (item.category !== 'Vegetarian') {
                itemStr += ` (${item.category})`;
              }
              if (item.quantity && item.quantity.trim() !== '') {
                itemStr += item.category !== 'Vegetarian' ? `, ${item.quantity}` : ` (${item.quantity})`;
              }
              return itemStr;
            })
            .join(', ');
          
          menuData[meal.mealType.toLowerCase()] = itemsList || 'No items';
        });
        
        return menuData;
      });

      await axios.post('/menu/publish', {
        weekStartDate,
        menus: menuArray
      });
      
      alert('Menu published successfully!');
      navigate('/view-menu');
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.msg || 'Failed to publish menu');
    }
    setLoading(false);
  };

  const handleReset = () => {
    if (window.confirm('Are you sure you want to reset the menu? All unsaved changes will be lost.')) {
      initializeEmptyMenus();
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('user');
    localStorage.removeItem('token');
    navigate('/login');
  };

  const handleNavigate = (path) => {
    const hasChanges = Object.values(menus).some(dayMenu =>
      dayMenu.meals.some(meal =>
        meal.items.some(item => item.name.trim() !== '')
      )
    );

    if (hasChanges && !isEditing) {
      const confirmLeave = window.confirm('You have unsaved changes. Are you sure you want to leave?');
      if (!confirmLeave) return;
    }

    navigate(path);
  };

  const getNavigationItems = () => {
    if (user?.role === 'Admin') {
      return [
        { icon: Calendar, label: 'Dashboard', path: '/admin-dashboard' },
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
        { icon: Calendar, label: 'Dashboard', path: '/mess-staff-dashboard' },
        { icon: UtensilsCrossed, label: 'Menu Management', path: '/menu-management' },
        { icon: BookOpen, label: 'View Bookings', path: '/view-bookings' },
        { icon: MessageSquare, label: 'Feedback', path: '/feedback' },
        { icon: Settings, label: 'Settings', path: '/settings' }
      ];
    }
    return [];
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-950 via-blue-900 to-blue-800">
      <div className="flex">
        {/* Sidebar */}
        <div className="w-64 bg-white h-screen shadow-xl flex flex-col fixed left-0 top-0">
          <div className="p-6 border-b border-gray-200 flex-shrink-0">
            <h1 className="text-2xl font-bold text-blue-950">KDU Mess</h1>
            <p className="text-sm text-gray-600 mt-1">{user?.role} Portal</p>
          </div>

          <nav className="px-4 py-4 space-y-2 flex-1 overflow-y-auto">
            {getNavigationItems().map((item, index) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;
              
              return (
                <button
                  key={index}
                  onClick={() => handleNavigate(item.path)}
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

          <div className="p-4 border-t border-gray-200 flex-shrink-0">
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
        <div className="ml-64 flex-1 p-8 overflow-y-auto">
          <div className="max-w-7xl mx-auto">
            <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
              <div className="flex justify-between items-center">
                <div>
                  <h1 className="text-3xl font-bold text-blue-950">Menu Management</h1>
                  <p className="text-gray-600 mt-1">
                    {isEditing ? 'Editing existing menu' : 'Create new weekly menu'} for KDU Mess
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    <Calendar className="inline w-4 h-4 mr-2" />
                    Week Starting Date
                  </label>
                  <input
                    type="date"
                    value={weekStartDate}
                    onChange={(e) => setWeekStartDate(e.target.value)}
                    className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>
            </div>

            {isEditing && (
              <div className="bg-amber-50 border-l-4 border-amber-500 p-4 mb-6 rounded-lg">
                <div className="flex items-center">
                  <Edit className="w-5 h-5 text-amber-600 mr-2" />
                  <p className="text-amber-800 font-medium">
                    You are currently editing an existing menu. Changes will update the published menu.
                  </p>
                </div>
              </div>
            )}

            {/* Day Navigation */}
            <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
              <div className="flex items-center justify-between">
                <button
                  onClick={() => setCurrentDayIndex((prev) => (prev > 0 ? prev - 1 : DAYS.length - 1))}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors font-semibold"
                >
                  <ChevronLeft className="w-5 h-5" />
                  Previous Day
                </button>
                
                <div className="flex items-center gap-4">
                  <h2 className="text-3xl font-bold text-blue-950">
                    {DAYS[currentDayIndex]}
                  </h2>
                  <div className="text-sm text-gray-600">
                    Day {currentDayIndex + 1} of {DAYS.length}
                  </div>
                </div>
                
                <button
                  onClick={() => setCurrentDayIndex((prev) => (prev < DAYS.length - 1 ? prev + 1 : 0))}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors font-semibold"
                >
                  Next Day
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>
              
              {/* Day Selector Tabs */}
              <div className="mt-4 flex flex-wrap gap-2 justify-center">
                {DAYS.map((day, index) => (
                  <button
                    key={day}
                    onClick={() => setCurrentDayIndex(index)}
                    className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                      index === currentDayIndex
                        ? 'bg-blue-600 text-white shadow-md'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {day.substring(0, 3)}
                  </button>
                ))}
              </div>
            </div>

            {/* Current Day Menu Card */}
            {(() => {
              const day = DAYS[currentDayIndex];
              return (
                <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
                  <h2 className="text-2xl font-bold text-blue-950 mb-6">{day} Menu</h2>
                  
                  {menus[day]?.meals.map((meal, mealIndex) => (
                    <div key={mealIndex} className="mb-8 pb-8 border-b border-gray-200 last:border-b-0">
                      <h3 className="text-xl font-semibold text-gray-800 mb-4 flex items-center gap-2">
                        <UtensilsCrossed className="w-5 h-5 text-blue-600" />
                        {meal.mealType}
                      </h3>
                      
                      {meal.items.map((item, itemIndex) => (
                        <div key={itemIndex} className="grid grid-cols-4 gap-4 mb-3">
                          <input
                            type="text"
                            placeholder="Item name"
                            value={item.name}
                            onChange={(e) => updateMenuItem(day, mealIndex, itemIndex, 'name', e.target.value)}
                            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          />
                          <select
                            value={item.category}
                            onChange={(e) => updateMenuItem(day, mealIndex, itemIndex, 'category', e.target.value)}
                            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          >
                            {CATEGORIES.map(cat => (
                              <option key={cat} value={cat}>{cat}</option>
                            ))}
                          </select>
                          <input
                            type="text"
                            placeholder="Quantity (e.g., 100g)"
                            value={item.quantity}
                            onChange={(e) => updateMenuItem(day, mealIndex, itemIndex, 'quantity', e.target.value)}
                            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          />
                          <button
                            onClick={() => removeMenuItem(day, mealIndex, itemIndex)}
                            className="text-red-500 hover:text-red-700 transition-colors flex items-center justify-center"
                            title="Delete item"
                          >
                            <Trash2 className="w-5 h-5" />
                          </button>
                        </div>
                      ))}
                      
                      <button
                        onClick={() => addMenuItem(day, mealIndex)}
                        className="mt-3 text-blue-700 hover:text-blue-900 font-medium flex items-center gap-2 transition-colors px-4 py-2 bg-blue-50 rounded-lg hover:bg-blue-100"
                      >
                        <Plus className="w-4 h-4" />
                        Add Item
                      </button>
                    </div>
                  ))}
                </div>
              );
            })()}

            <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
              <div className="flex flex-wrap justify-center lg:justify-end items-center gap-4">
                <button
                  onClick={handleReset}
                  disabled={loading}
                  className="bg-gray-600 hover:bg-gray-700 text-white px-6 py-3 rounded-lg font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 shadow-md"
                >
                  <RefreshCw className="w-5 h-5" />
                  Reset Menu
                </button>
                
                <button
                  onClick={fetchMenuForEdit}
                  disabled={loading}
                  className="bg-amber-500 hover:bg-amber-600 text-white px-6 py-3 rounded-lg font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 shadow-md"
                >
                  <Edit className="w-5 h-5" />
                  {loading ? 'Loading...' : 'Edit Existing Menu'}
                </button>
                
                <button
                  onClick={handlePublish}
                  disabled={loading}
                  className="bg-gradient-to-r from-blue-900 to-amber-500 hover:from-blue-950 hover:to-amber-600 text-white px-8 py-3 rounded-lg font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 shadow-lg"
                >
                  <Save className="w-5 h-5" />
                  {loading ? 'Publishing...' : 'Publish Menu'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
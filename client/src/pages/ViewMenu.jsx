import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { 
  Clock, 
  Leaf, 
  Drumstick, 
  Calendar,
  UtensilsCrossed,
  BookOpen,
  History,
  MessageSquare,
  Settings,
  FileText,
  LogOut,
  ClipboardList,
  UsersIcon,
  ShoppingCartIcon,
  BookOpenIcon,
  LayoutDashboard
} from 'lucide-react';
import axios from '../api/axios';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

// ========== ENHANCED MEAL IMAGES WITH FOOD CATEGORIES ==========
const MEAL_TYPE_IMAGES = {
  breakfast: 'https://images.unsplash.com/photo-1533089860892-a7c6f0a88666?w=400',
  lunch: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400',
  dinner: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=400',
  tea: 'https://images.unsplash.com/photo-1556679343-c7306c1976bc?w=400'
};

const FOOD_CATEGORY_IMAGES = {
  // Rice dishes
  'rice': 'https://images.unsplash.com/photo-1516684732162-798a0062be99?w=400',
  'fried rice': 'https://images.unsplash.com/photo-1603133872878-684f208fb84b?w=400',
  'biryani': 'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=400',
  'yellow rice': 'https://images.unsplash.com/photo-1516684732162-798a0062be99?w=400',
  
  // Curry dishes
  'curry': 'https://images.unsplash.com/photo-1585937421612-70a008356fbe?w=400',
  'dhal': 'https://images.unsplash.com/photo-1585937421612-70a008356fbe?w=400',
  'dal': 'https://images.unsplash.com/photo-1585937421612-70a008356fbe?w=400',
  'chicken curry': 'https://images.unsplash.com/photo-1565557623262-b51c2513a641?w=400',
  'fish curry': 'https://images.unsplash.com/photo-1534422298391-e4f8c172dddb?w=400',
  
  // Bread items
  'bread': 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=400',
  'roti': 'https://images.unsplash.com/photo-1628840042765-356cda07504e?w=400',
  'paratha': 'https://images.unsplash.com/photo-1628840042765-356cda07504e?w=400',
  'naan': 'https://images.unsplash.com/photo-1628840042765-356cda07504e?w=400',
  'chapati': 'https://images.unsplash.com/photo-1628840042765-356cda07504e?w=400',
  'pol roti': 'https://images.unsplash.com/photo-1628840042765-356cda07504e?w=400',
  
  // Noodles & Pasta
  'noodles': 'https://images.unsplash.com/photo-1612929633738-8fe44f7ec841?w=400',
  'pasta': 'https://images.unsplash.com/photo-1621996346565-e3dbc646d9a9?w=400',
  'spaghetti': 'https://images.unsplash.com/photo-1621996346565-e3dbc646d9a9?w=400',
  'chow mein': 'https://images.unsplash.com/photo-1612929633738-8fe44f7ec841?w=400',
  
  // Kottu & Street Food
  'kottu': 'https://images.unsplash.com/photo-1601050690597-df0568f70950?w=400',
  'koththu': 'https://images.unsplash.com/photo-1601050690597-df0568f70950?w=400',
  
  // Breakfast items
  'string hoppers': 'https://images.unsplash.com/photo-1630383249896-424e482df921?w=400',
  'hoppers': 'https://images.unsplash.com/photo-1630383249896-424e482df921?w=400',
  'dosa': 'https://images.unsplash.com/photo-1567337710282-00832b415979?w=400',
  'idli': 'https://images.unsplash.com/photo-1630383249896-424e482df921?w=400',
  'egg': 'https://images.unsplash.com/photo-1482049016688-2d3e1b311543?w=400',
  'omelet': 'https://images.unsplash.com/photo-1482049016688-2d3e1b311543?w=400',
  'omelette': 'https://images.unsplash.com/photo-1482049016688-2d3e1b311543?w=400',
  
  // Soups
  'soup': 'https://images.unsplash.com/photo-1547592166-23ac45744acd?w=400',
  
  // Salads
  'salad': 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=400',
  
  // Beverages
  'tea': 'https://images.unsplash.com/photo-1556679343-c7306c1976bc?w=400',
  'coffee': 'https://images.unsplash.com/photo-1509042239860-f550ce710b93?w=400',
  'milk': 'https://images.unsplash.com/photo-1550583724-b2692b85b150?w=400',
  'juice': 'https://images.unsplash.com/photo-1600271886742-f049cd451bba?w=400',
  
  // Desserts
  'dessert': 'https://images.unsplash.com/photo-1488477181946-6428a0291777?w=400',
  'pudding': 'https://images.unsplash.com/photo-1488477181946-6428a0291777?w=400',
  'cake': 'https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=400',
  'ice cream': 'https://images.unsplash.com/photo-1563805042-7684c019e1cb?w=400',
  'wattalapam': 'https://images.unsplash.com/photo-1488477181946-6428a0291777?w=400',
  
  // Snacks
  'samosa': 'https://images.unsplash.com/photo-1601050690597-df0568f70950?w=400',
  'wade': 'https://images.unsplash.com/photo-1601050690597-df0568f70950?w=400',
  'vadai': 'https://images.unsplash.com/photo-1601050690597-df0568f70950?w=400',
  'cutlet': 'https://images.unsplash.com/photo-1601050690597-df0568f70950?w=400',
  'rolls': 'https://images.unsplash.com/photo-1626082927389-6cd097cdc6ec?w=400',
  
  // Meat dishes
  'chicken': 'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=400',
  'fish': 'https://images.unsplash.com/photo-1534422298391-e4f8c172dddb?w=400',
  'beef': 'https://images.unsplash.com/photo-1588168333986-5078d3ae3976?w=400',
  'mutton': 'https://images.unsplash.com/photo-1529692236671-f1f6cf9683ba?w=400',
  
  // Default
  'default': 'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=400'
};

// Function to get image based on menu item name
const getImageForMenuItem = (itemName, mealType) => {
  if (!itemName) return MEAL_TYPE_IMAGES[mealType] || FOOD_CATEGORY_IMAGES.default;
  
  const lowerItem = itemName.toLowerCase();
  
  // Check each category keyword
  for (const [keyword, imageUrl] of Object.entries(FOOD_CATEGORY_IMAGES)) {
    if (lowerItem.includes(keyword)) {
      return imageUrl;
    }
  }
  
  // Fallback to meal type image
  return MEAL_TYPE_IMAGES[mealType] || FOOD_CATEGORY_IMAGES.default;
};

const MEAL_PRICES = {
  breakfast: 250,
  lunch: 400,
  dinner: 250,
  tea: 100
};

const MEAL_TIMES = {
  breakfast: '7:00 - 9:00 AM',
  lunch: '12:00 - 2:00 PM',
  dinner: '7:00 - 9:00 PM',
  tea: '4:00 - 5:00 PM'
};

export default function ViewMenu() {
  const navigate = useNavigate();
  const location = useLocation();
  const [selectedDay, setSelectedDay] = useState('Monday');
  const [menuData, setMenuData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [viewMode, setViewMode] = useState('daily');

  useEffect(() => {
    const userData = JSON.parse(localStorage.getItem('user'));
    if (!userData) {
      navigate('/login');
      return;
    }
    setUser(userData);
    
    const today = new Date();
    const dayName = DAYS[today.getDay() === 0 ? 6 : today.getDay() - 1];
    setSelectedDay(dayName);
    
    fetchCurrentWeekMenu();
  }, [navigate]);

  const fetchCurrentWeekMenu = async () => {
    setLoading(true);
    try {
      const response = await axios.get('/menu/current-week');
      setMenuData(response.data);
    } catch (err) {
      console.error('Error fetching menu:', err);
      setMenuData([]);
    }
    setLoading(false);
  };

  const handleLogout = () => {
    localStorage.removeItem('user');
    localStorage.removeItem('token');
    navigate('/login');
  };

  const handleBookMeal = () => {
    navigate('/booking');
  };

  const handleNavigate = (path) => {
    navigate(path);
  };

  const getCurrentDayMenu = () => {
    if (!menuData || menuData.length === 0) return null;
    return menuData.find(menu => menu.day === selectedDay);
  };

  const parseMenuItems = (menuString) => {
    if (!menuString) return [];
    return menuString.split(',').map(item => item.trim());
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

  const renderMealCard = (mealType, mealContent, mealKey) => {
    const items = parseMenuItems(mealContent);
    const price = MEAL_PRICES[mealKey];
    const timeRange = MEAL_TIMES[mealKey];
    
    // Get image based on first item or meal type default
    const imageUrl = items.length > 0 
      ? getImageForMenuItem(items[0], mealKey) 
      : MEAL_TYPE_IMAGES[mealKey];

    return (
      <div className="bg-white rounded-xl shadow-md overflow-hidden hover:shadow-xl transition-shadow">
        {/* Image Section */}
        <div className="relative h-48 overflow-hidden">
          <img 
            src={imageUrl} 
            alt={mealType}
            className="w-full h-full object-cover"
            onError={(e) => {
              e.target.src = FOOD_CATEGORY_IMAGES.default;
            }}
          />
          <div className="absolute top-3 right-3 bg-white px-3 py-1 rounded-full shadow-md">
            <span className="text-blue-900 font-bold text-base">Rs. {price}</span>
          </div>
        </div>

        {/* Content Section */}
        <div className="p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-2xl font-bold text-blue-950">{mealType}</h3>
            <div className="flex items-center gap-1 text-gray-600 text-sm">
              <Clock className="w-4 h-4" />
              <span className="font-medium">{timeRange}</span>
            </div>
          </div>

          <div className="space-y-2 max-h-48 overflow-y-auto">
            {items.length > 0 ? items.slice(0, 6).map((item, index) => {
              const category = getItemCategory(item);
              const cleanedItem = cleanItemName(item);
              
              if (!cleanedItem) return null;
              
              return (
                <div key={index} className="flex items-start gap-2 text-gray-700">
                  {category === 'non-veg' ? (
                    <Drumstick className="w-4 h-4 text-red-600 mt-1 flex-shrink-0" />
                  ) : (
                    <Leaf className="w-4 h-4 text-green-600 mt-1 flex-shrink-0" />
                  )}
                  <span className="text-sm leading-relaxed font-medium">{cleanedItem}</span>
                </div>
              );
            }) : (
              <p className="text-gray-500 text-sm italic">No items available</p>
            )}
          </div>

          {/* Category Tags */}
          <div className="flex gap-2 mt-4 pt-4 border-t border-gray-200">
            {items.some(item => getItemCategory(item) === 'veg') && (
              <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-bold flex items-center gap-1">
                <Leaf className="w-3 h-3" />
                Vegetarian
              </span>
            )}
            {items.some(item => getItemCategory(item) === 'non-veg') && (
              <span className="px-3 py-1 bg-red-100 text-red-700 rounded-full text-xs font-bold flex items-center gap-1">
                <Drumstick className="w-3 h-3" />
                Non-Veg
              </span>
            )}
          </div>
        </div>
      </div>
    );
  };

  // Sidebar navigation based on role - UPDATED FOR OFFICER CADET
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
    } else if (user?.role === 'Day Scholar') {
      return [
        { icon: LayoutDashboard, label: 'Dashboard', path: '/day-scholar-dashboard' },
        { icon: UtensilsCrossed, label: 'Menu Page', path: '/view-menu' },
        { icon: BookOpen, label: 'Booking', path: '/booking' },
        { icon: Clock, label: 'Cancellation', path: '/cancel-booking' },
        { icon: History, label: 'Order History', path: '/order-history' },
        { icon: MessageSquare, label: 'Feedback', path: '/feedback' },
        { icon: Settings, label: 'Settings', path: '/settings' },
        { icon: FileText, label: 'Monthly Bill', path: '/monthly-bill' }
      ];
    } else if (user?.role === 'Officer Cadet') {
      return [
        { icon: LayoutDashboard, label: 'Dashboard', path: '/officer-cadet-dashboard' },
        { icon: UtensilsCrossed, label: 'Menu Page', path: '/view-menu' },
        { icon: BookOpen, label: 'Booking', path: '/booking' },
        { icon: FileText, label: 'Monthly Bill', path: '/monthly-bill' },
        { icon: Settings, label: 'Settings', path: '/settings' }
      ];
    }
    return [];
  };

  const currentMenu = getCurrentDayMenu();
  // Only Day Scholars can book meals (Officer Cadets have automatic enrollment)
  const canBookMeal = user?.role === 'Day Scholar';

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-950 via-blue-900 to-blue-800 flex items-center justify-center">
        <div className="text-white text-2xl font-semibold">Loading menu...</div>
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
                  onClick={() => handleNavigate(item.path)}
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
          {/* Header */}
          <div className="bg-white rounded-xl shadow-lg p-8 mb-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-4xl font-bold text-blue-950">Weekly Menu</h1>
                <p className="text-gray-600 mt-2 text-lg">KDU Mess - Werahera</p>
              </div>
              {canBookMeal && (
                <button
                  onClick={handleBookMeal}
                  className="flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-blue-900 to-amber-500 text-white rounded-lg font-bold text-lg hover:from-blue-950 hover:to-amber-600 transition-all shadow-md"
                >
                  <Calendar className="w-6 h-6" />
                  Book Meal
                </button>
              )}
            </div>
          </div>

          {/* View Toggle */}
          <div className="bg-white rounded-xl shadow-lg p-5 mb-6">
            <div className="flex gap-3">
              <button
                onClick={() => setViewMode('daily')}
                className={`px-8 py-3 rounded-lg font-bold text-lg transition-all ${
                  viewMode === 'daily'
                    ? 'bg-gradient-to-r from-blue-900 to-amber-500 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Daily View
              </button>
              <button
                onClick={() => setViewMode('weekly')}
                className={`px-8 py-3 rounded-lg font-bold text-lg transition-all ${
                  viewMode === 'weekly'
                    ? 'bg-gradient-to-r from-blue-900 to-amber-500 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Weekly View
              </button>
            </div>
          </div>

          {/* Day Selector */}
          {viewMode === 'daily' && (
            <div className="bg-white rounded-xl shadow-lg p-5 mb-6">
              <div className="flex gap-3 overflow-x-auto">
                {DAYS.map((day) => (
                  <button
                    key={day}
                    onClick={() => setSelectedDay(day)}
                    className={`px-8 py-4 rounded-lg font-bold text-lg transition-all whitespace-nowrap ${
                      selectedDay === day
                        ? 'bg-gradient-to-r from-blue-900 to-amber-500 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {day}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Menu Content */}
          {viewMode === 'daily' ? (
            currentMenu ? (
              <>
                <h2 className="text-3xl font-bold text-white mb-6">{selectedDay}'s Menu</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  {renderMealCard('Breakfast', currentMenu.breakfast, 'breakfast')}
                  {renderMealCard('Lunch', currentMenu.lunch, 'lunch')}
                  {renderMealCard('Dinner', currentMenu.dinner, 'dinner')}
                  {renderMealCard('Tea & Snacks', 'Tea with snacks', 'tea')}
                </div>
              </>
            ) : (
              <div className="bg-white rounded-xl shadow-lg p-16 text-center">
                <p className="text-gray-500 text-2xl font-semibold">No menu available for {selectedDay}</p>
                <p className="text-gray-400 text-lg mt-3">Please check back later</p>
              </div>
            )
          ) : (
            <div className="space-y-6">
              {DAYS.map(day => {
                const dayMenu = menuData?.find(m => m.day === day);
                return dayMenu ? (
                  <div key={day} className="bg-white rounded-xl shadow-lg p-8">
                    <h2 className="text-3xl font-bold text-blue-950 mb-6">{day}</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                      {renderMealCard('Breakfast', dayMenu.breakfast, 'breakfast')}
                      {renderMealCard('Lunch', dayMenu.lunch, 'lunch')}
                      {renderMealCard('Dinner', dayMenu.dinner, 'dinner')}
                      {renderMealCard('Tea & Snacks', 'Tea with snacks', 'tea')}
                    </div>
                  </div>
                ) : null;
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
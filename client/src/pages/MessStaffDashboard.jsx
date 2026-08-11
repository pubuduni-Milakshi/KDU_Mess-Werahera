import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard,
  UtensilsCrossed,
  ShoppingCart,
  Settings,
  LogOut,
  ChefHat,
  ClipboardList,
  MessageSquare,
  BookOpen,
  Coffee,
  Sun,
  Moon,
  Leaf,
  Drumstick
} from 'lucide-react';
import axios from '../api/axios';

// ========== MEAL IMAGES ==========
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

export default function MessStaffDashboard() {
  const navigate = useNavigate();
  const location = useLocation();
  const [user, setUser] = useState(null);
  const [todayMenu, setTodayMenu] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const userData = JSON.parse(localStorage.getItem('user'));
    if (!userData || userData.role !== 'Mess Staff') {
      alert('Access denied. This dashboard is only for Mess Staff.');
      navigate('/login');
      return;
    }
    setUser(userData);
    fetchDashboardData();
  }, [navigate]);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      // Get today's date
      const today = new Date().toISOString().split('T')[0];

      // Fetch today's menu
      try {
        const menuResponse = await axios.get(`/menu/date/${today}`);
        if (menuResponse.data && menuResponse.data.menus && menuResponse.data.menus.length > 0) {
          setTodayMenu(menuResponse.data.menus[0]);
        }
      } catch (menuErr) {
        console.log('No menu available for today:', menuErr.response?.status);
        setTodayMenu(null);
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

  // Sidebar navigation items for Mess Staff
  const getNavigationItems = () => {
    return [
      { icon: LayoutDashboard, label: 'Dashboard', path: '/mess-staff-dashboard' },
      { icon: BookOpen, label: 'View Menu', path: '/view-menu' },
      { icon: ShoppingCart, label: 'Order Management', path: '/orders-management' },
      { icon: ClipboardList, label: 'Reports', path: '/reports' },
      { icon: MessageSquare, label: 'Feedback', path: '/feedback' },
      { icon: Settings, label: 'Settings', path: '/settings' }
    ];
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

  const getMealIcon = (mealType) => {
    if (mealType === 'Breakfast') return <Coffee className="w-6 h-6 text-amber-500" />;
    if (mealType === 'Lunch') return <Sun className="w-6 h-6 text-amber-500" />;
    if (mealType === 'Dinner') return <Moon className="w-6 h-6 text-blue-700" />;
    return <UtensilsCrossed className="w-6 h-6 text-gray-600" />;
  };

  const renderMealCard = (mealType, mealContent) => {
    const items = parseMenuItems(mealContent);
    
    // Determine meal type key for image
    const mealKey = mealType.toLowerCase();
    
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
          {/* Meal Type Badge */}
          <div className="absolute top-3 left-3 bg-white bg-opacity-95 px-4 py-2 rounded-full shadow-lg">
            <div className="flex items-center gap-2">
              {getMealIcon(mealType)}
              <span className="font-bold text-blue-950 text-lg">{mealType}</span>
            </div>
          </div>
        </div>

        {/* Content Section */}
        <div className="p-5">
          <h3 className="text-xl font-bold text-blue-950 mb-3">Today's Menu</h3>
          <div className="space-y-2 max-h-40 overflow-y-auto">
            {items.length > 0 ? items.slice(0, 5).map((item, index) => {
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
                  <span className="text-base font-medium leading-relaxed">{cleanedItem}</span>
                </div>
              );
            }) : (
              <p className="text-gray-500 text-sm italic">No items available</p>
            )}
          </div>

          {/* Category Tags */}
          {items.length > 0 && (
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
          )}
        </div>
      </div>
    );
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
        {/* Fixed Sidebar - White background */}
        <div className="w-72 bg-white shadow-xl fixed left-0 top-0 h-screen flex flex-col z-50">
          {/* Header */}
          <div className="p-6 border-b border-gray-200">
            <h1 className="text-4xl font-bold text-sky-900">KDU Mess</h1>
            <p className="text-lg text-sky-700 mt-1">Mess Staff Portal</p>
          </div>

          {/* Navigation - Scrollable */}
          <nav className="px-4 py-4 space-y-2 flex-1 overflow-y-auto scrollbar-thin">
            {getNavigationItems().map((item, index) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;
              return (
                <button
                  key={index}
                  onClick={() => navigate(item.path)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg font-semibold text-lg transition-colors ${
                    isActive
                      ? 'bg-sky-500 text-white'
                      : 'text-sky-900 hover:bg-sky-100'
                  }`}
                >
                  <Icon className="w-6 h-6 flex-shrink-0" />
                  <span className="whitespace-nowrap">{item.label}</span>
                </button>
              );
            })}
          </nav>

          {/* Fixed Logout Button at Bottom */}
          <div className="p-4 border-t border-gray-200">
            <button
              onClick={handleLogout}
              className="w-full flex items-center justify-center gap-3 px-4 py-3 bg-gradient-to-r from-red-500 to-red-700 text-white hover:from-red-600 hover:to-red-800 rounded-lg font-semibold text-lg transition-colors"
            >
              <LogOut className="w-6 h-6 text-white" />
              <span>Logout</span>
            </button>
          </div>
        </div>

        {/* Main Content with Left Margin */}
        <div className="ml-72 flex-1 p-8">
          {/* Welcome Header - Smaller and Left-aligned */}
          <div className="bg-white rounded-xl shadow-lg p-4 mb-4 max-w-3xl text-left">
            <div className="flex items-start gap-4 w-full">
              <div className="bg-sky-100 p-3 rounded-lg flex-shrink-0">
                <ChefHat className="w-8 h-8 text-sky-700" />
              </div>
              <div className="flex-1 min-w-0">
                <h1 className="text-4xl font-bold text-blue-950">
                  Welcome, {user?.firstName} {user?.lastName}!
                </h1>
                <p className="text-gray-600 mt-1 text-sm font-medium">
                  Mess Staff Portal • {user?.roleId}
                </p>
              </div>
            </div>
          </div>

          {/* Today's Menu Section with Images */}
          <div className="bg-white rounded-xl shadow-lg p-8 mb-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-3xl font-bold text-blue-950">Today's Menu</h2>
              <button
                onClick={() => navigate('/view-menu')}
                className="px-4 py-2 bg-gradient-to-r from-sky-600 to-sky-400 text-white rounded-lg font-semibold text-lg hover:opacity-95 transition-colors"
              >
                View Full Menu →
              </button>
            </div>

            {todayMenu ? (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {todayMenu.breakfast && renderMealCard('Breakfast', todayMenu.breakfast)}
                {todayMenu.lunch && renderMealCard('Lunch', todayMenu.lunch)}
                {todayMenu.dinner && renderMealCard('Dinner', todayMenu.dinner)}
              </div>
            ) : (
              <div className="text-center py-12 text-gray-500">
                <UtensilsCrossed className="w-20 h-20 mx-auto mb-4 text-gray-300" />
                <p className="text-xl font-medium mb-4">No menu available for today</p>
                <button
                  onClick={() => navigate('/view-menu')}
                  className="px-8 py-3 bg-gradient-to-r from-gray-600 to-black text-white rounded-lg font-bold text-lg hover:opacity-90 transition-colors"
                >
                  Go to Menu
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { 
  Calendar,
  Filter,
  Download,
  Search,
  UtensilsCrossed,
  BookOpen,
  History as HistoryIcon,
  Settings,
  FileText,
  LogOut,
  LayoutDashboard
} from 'lucide-react';
import axios from '../api/axios';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

// Define the same prices as other components
const MEAL_PRICES = {
  Breakfast: 250,
  Lunch: 400,
  Dinner: 250,
  'Morning Tea': 100,
  'Mid-Morning Tea': 100,
  'Evening Tea': 100,
  'Night Tea': 100
};

export default function OrderHistory() {
  const navigate = useNavigate();
  const location = useLocation();
  const [user, setUser] = useState(null);
  const [orders, setOrders] = useState([]);
  const [filteredOrders, setFilteredOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    mealType: 'All Meal Types',
    status: 'All',
    startDate: '',
    endDate: ''
  });
  const [dateRangePreset, setDateRangePreset] = useState('last30days');
  const [showAllHistory, setShowAllHistory] = useState(false);

  const getDateRange = useCallback((preset, customFilters) => {
    const today = new Date();
    today.setHours(23, 59, 59, 999);
    let startDate = new Date();
    startDate.setHours(0, 0, 0, 0);

    switch (preset) {
      case 'last7days':
        startDate.setDate(today.getDate() - 7);
        break;
      case 'last30days':
        startDate.setDate(today.getDate() - 30);
        break;
      case 'last90days':
        startDate.setDate(today.getDate() - 90);
        break;
      case 'thismonth':
        startDate = new Date(today.getFullYear(), today.getMonth(), 1);
        break;
      case 'lastmonth':
        startDate = new Date(today.getFullYear(), today.getMonth() - 1, 1);
        const lastDayOfLastMonth = new Date(today.getFullYear(), today.getMonth(), 0);
        today.setTime(lastDayOfLastMonth.getTime());
        today.setHours(23, 59, 59, 999);
        break;
      case 'custom':
        return { startDate: customFilters.startDate, endDate: customFilters.endDate };
      default:
        startDate.setDate(today.getDate() - 30);
    }

    return {
      startDate: startDate.toISOString().split('T')[0],
      endDate: today.toISOString().split('T')[0]
    };
  }, []);

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        navigate('/login');
        return;
      }

      const response = await axios.get('/bookings/history', {
        headers: { 'x-auth-token': token }
      });
      const ordersData = response.data || [];
      
      // Filter based on user role
      const userData = JSON.parse(localStorage.getItem('user'));
      let filteredData = ordersData;

      if (userData.role === 'Day Scholar') {
        // Day Scholars: Only show orders that were NOT cancelled OR were cancelled after deadline
        filteredData = ordersData.filter(order => {
          if (order.status === 'Cancelled') {
            return order.cancelledAfterDeadline === true;
          }
          return true;
        });
      } else if (userData.role === 'Officer Cadet') {
        // Officer Cadets: Show all meals (auto-enrolled) and tea orders
        filteredData = ordersData;
      }

      // Apply date range filter if not showing all history
      if (!showAllHistory) {
        const dateRange = getDateRange(dateRangePreset, filters);
        if (dateRange.startDate && dateRange.endDate) {
          filteredData = filteredData.filter(order => {
            const orderDate = new Date(order.orderDate || order.date);
            const start = new Date(dateRange.startDate);
            const end = new Date(dateRange.endDate);
            end.setHours(23, 59, 59, 999);
            return orderDate >= start && orderDate <= end;
          });
        }
      }

      setOrders(filteredData);
      setFilteredOrders(filteredData);
    } catch (err) {
      console.error('Error fetching order history:', err);
      if (err.response?.status === 401) {
        navigate('/login');
      }
    }
    setLoading(false);
  }, [navigate, dateRangePreset, showAllHistory, filters, getDateRange]);

  useEffect(() => {
    const userData = JSON.parse(localStorage.getItem('user'));
    const token = localStorage.getItem('token');
    
    if (!userData || !token) {
      navigate('/login');
      return;
    }
    
    if (userData.role !== 'Day Scholar' && userData.role !== 'Officer Cadet') {
      alert('Access denied. This page is only for Day Scholars and Officer Cadets.');
      navigate('/login');
      return;
    }
    
    setUser(userData);
    
    // Set default date range (last 30 days)
    const today = new Date();
    today.setHours(23, 59, 59, 999);
    const startDate = new Date();
    startDate.setDate(today.getDate() - 30);
    startDate.setHours(0, 0, 0, 0);
    
    setFilters(prev => ({
      ...prev,
      startDate: startDate.toISOString().split('T')[0],
      endDate: today.toISOString().split('T')[0]
    }));
  }, [navigate]);

  // Fetch orders when date range or showAllHistory changes
  useEffect(() => {
    if (user) {
      fetchOrders();
    }
  }, [user, dateRangePreset, showAllHistory, fetchOrders]);

  const handleLogout = () => {
    localStorage.removeItem('user');
    localStorage.removeItem('token');
    navigate('/login');
  };

  const applyFilters = () => {
    let filtered = [...orders];

    if (filters.mealType !== 'All Meal Types') {
      filtered = filtered.filter(order => order.mealType === filters.mealType);
    }

    if (filters.status !== 'All') {
      filtered = filtered.filter(order => order.status === filters.status);
    }

    if (filters.startDate) {
      filtered = filtered.filter(order => 
        new Date(order.orderDate || order.date) >= new Date(filters.startDate)
      );
    }

    if (filters.endDate) {
      filtered = filtered.filter(order => 
        new Date(order.orderDate || order.date) <= new Date(filters.endDate)
      );
    }

    setFilteredOrders(filtered);
  };

  const handleDateRangePresetChange = (preset) => {
    setDateRangePreset(preset);
    if (preset === 'custom') {
      setShowAllHistory(false);
    } else {
      setShowAllHistory(false);
      const dateRange = getDateRange(preset, filters);
      setFilters(prev => ({
        ...prev,
        startDate: dateRange.startDate,
        endDate: dateRange.endDate
      }));
    }
  };

  const handleLoadHistory = () => {
    fetchOrders();
  };

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const getPrice = (order) => {
    if (user?.role === 'Officer Cadet') {
      // Officer Cadets - show "Officer Quota" for meals, price for tea
      const teaTypes = ['Morning Tea', 'Evening Tea', 'Mid-Morning Tea', 'Night Tea'];
      if (teaTypes.includes(order.mealType)) {
        const price = MEAL_PRICES[order.mealType] || 100;
        return `Rs. ${price}`;
      }
      return 'Officer Quota';
    } else {
      // Day Scholars - use predefined prices
      const price = MEAL_PRICES[order.mealType] || order.price || 0;
      return `Rs. ${price}`;
    }
  };

  const getActualPrice = (order) => {
    if (user?.role === 'Officer Cadet') {
      // Officer Cadets only pay for tea
      const teaTypes = ['Morning Tea', 'Evening Tea', 'Mid-Morning Tea', 'Night Tea'];
      if (teaTypes.includes(order.mealType)) {
        return MEAL_PRICES[order.mealType] || 100;
      }
      return 0;
    } else {
      // Day Scholars - use predefined prices
      return MEAL_PRICES[order.mealType] || order.price || 0;
    }
  };

  const exportToPDF = () => {
    if (!filteredOrders || filteredOrders.length === 0) {
      alert('No orders to export. Please check your filters or order history.');
      return;
    }

    try {
      const doc = new jsPDF();
      
      doc.setFontSize(20);
      doc.setTextColor(30, 58, 138);
      doc.text('KDU Mess - Order History', 14, 22);
      
      doc.setFontSize(11);
      doc.setTextColor(100);
      
      const generatedDate = new Date().toLocaleDateString('en-GB', { 
        day: 'numeric',
        month: 'long', 
        year: 'numeric' 
      });
      doc.text(`Generated on: ${generatedDate}`, 14, 30);
      
      const userName = `${user?.firstName || 'N/A'} ${user?.lastName || ''}`.trim();
      const userRole = user?.roleId || 'N/A';
      doc.text(`User: ${userName} (${userRole})`, 14, 36);
      doc.text(`Role: ${user?.role || 'N/A'}`, 14, 42);
      
      doc.setDrawColor(200);
      doc.line(14, 46, 196, 46);
      
      const tableData = filteredOrders.map(order => [
        new Date(order.orderDate || order.date).toLocaleDateString('en-GB', {
          day: 'numeric',
          month: 'short',
          year: 'numeric'
        }),
        order.mealType,
        order.status,
        getPrice(order)
      ]);
      
      doc.autoTable({
        head: [['Date', 'Meal Type', 'Status', 'Price / Quota']],
        body: tableData,
        startY: 52,
        theme: 'striped',
        headStyles: {
          fillColor: [30, 58, 138],
          textColor: [255, 255, 255],
          fontStyle: 'bold',
          fontSize: 11
        },
        styles: {
          fontSize: 10,
          cellPadding: 5
        },
        alternateRowStyles: {
          fillColor: [240, 249, 255]
        }
      });
      
      // Summary section
      const finalY = doc.lastAutoTable.finalY + 10;
      doc.setDrawColor(200);
      doc.line(14, finalY, 196, finalY);
      
      doc.setFontSize(12);
      doc.setTextColor(30, 58, 138);
      doc.text('Summary', 14, finalY + 8);
      
      doc.setFontSize(10);
      doc.setTextColor(60);
      doc.text(`Total Orders: ${filteredOrders.length}`, 14, finalY + 16);
      
      if (user?.role === 'Day Scholar') {
        const totalAmount = filteredOrders.reduce((sum, order) => sum + getActualPrice(order), 0);
        doc.setFontSize(11);
        doc.setTextColor(30, 58, 138);
        doc.text(`Total Amount: Rs. ${totalAmount.toFixed(2)}`, 14, finalY + 24);
      }
      // Officer Cadet PDF summary removed - only shows total orders count
      
      const pageCount = doc.internal.getNumberOfPages();
      doc.setFontSize(8);
      doc.setTextColor(150);
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.text(
          `Page ${i} of ${pageCount}`,
          doc.internal.pageSize.getWidth() / 2,
          doc.internal.pageSize.getHeight() - 10,
          { align: 'center' }
        );
      }
      
      const filename = `order-history-${new Date().toISOString().split('T')[0]}.pdf`;
      doc.save(filename);
      
      alert(`PDF exported successfully as ${filename}`);
      
    } catch (error) {
      console.error('PDF Export Error:', error);
      alert('Failed to generate PDF. Please try again.');
    }
  };

  const getNavigationItems = () => {
    if (user?.role === 'Day Scholar') {
      return [
        { icon: LayoutDashboard, label: 'Dashboard', path: '/day-scholar-dashboard' },
        { icon: UtensilsCrossed, label: 'Menu Page', path: '/view-menu' },
        { icon: BookOpen, label: 'Booking', path: '/booking' },
        { icon: HistoryIcon, label: 'Order History', path: '/order-history' },
        { icon: Settings, label: 'Settings', path: '/settings' },
        { icon: FileText, label: 'Monthly Bill', path: '/monthly-bill' }
      ];
    } else if (user?.role === 'Officer Cadet') {
      return [
        { icon: LayoutDashboard, label: 'Dashboard', path: '/officer-cadet-dashboard' },
        { icon: UtensilsCrossed, label: 'Menu Page', path: '/view-menu' },
        { icon: BookOpen, label: 'Booking', path: '/booking' },
        { icon: HistoryIcon, label: 'Order History', path: '/order-history' },
        { icon: FileText, label: 'Monthly Bill', path: '/monthly-bill' },
        { icon: Settings, label: 'Settings', path: '/settings' }
      ];
    }
    return [];
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-950 via-blue-900 to-blue-800 flex items-center justify-center">
        <div className="text-white text-2xl font-semibold">Loading order history...</div>
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

        {/* Main Content */}
        <div className="ml-64 flex-1 p-8 overflow-y-auto">
          <div className="max-w-full mx-auto px-4">
            {/* Header */}
            <div className="bg-white rounded-xl shadow-lg p-8 mb-6">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-4xl font-bold text-blue-950">Order History</h1>
                  <p className="text-gray-600 mt-2 text-lg">View and track all your past orders</p>
                </div>
                <button
                  onClick={exportToPDF}
                  className="flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-blue-900 to-amber-500 text-white rounded-lg font-bold text-lg hover:from-blue-950 hover:to-amber-600 transition-all shadow-md"
                >
                  <Download className="w-6 h-6" />
                  Export PDF
                </button>
              </div>
            </div>

            {/* Date Range Selection */}
            <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
              <h3 className="text-xl font-bold text-blue-950 mb-4">Select Date Range</h3>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-4">
                <button
                  onClick={() => handleDateRangePresetChange('last7days')}
                  className={`px-4 py-3 rounded-lg font-semibold text-base transition-all ${
                    dateRangePreset === 'last7days'
                      ? 'bg-blue-600 text-white shadow-md'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  Last 7 Days
                </button>
                <button
                  onClick={() => handleDateRangePresetChange('last30days')}
                  className={`px-4 py-3 rounded-lg font-semibold text-base transition-all ${
                    dateRangePreset === 'last30days'
                      ? 'bg-blue-600 text-white shadow-md'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  Last 30 Days
                </button>
                <button
                  onClick={() => handleDateRangePresetChange('last90days')}
                  className={`px-4 py-3 rounded-lg font-semibold text-base transition-all ${
                    dateRangePreset === 'last90days'
                      ? 'bg-blue-600 text-white shadow-md'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  Last 90 Days
                </button>
                <button
                  onClick={() => handleDateRangePresetChange('thismonth')}
                  className={`px-4 py-3 rounded-lg font-semibold text-base transition-all ${
                    dateRangePreset === 'thismonth'
                      ? 'bg-blue-600 text-white shadow-md'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  This Month
                </button>
                <button
                  onClick={() => handleDateRangePresetChange('lastmonth')}
                  className={`px-4 py-3 rounded-lg font-semibold text-base transition-all ${
                    dateRangePreset === 'lastmonth'
                      ? 'bg-blue-600 text-white shadow-md'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  Last Month
                </button>
                <button
                  onClick={() => handleDateRangePresetChange('custom')}
                  className={`px-4 py-3 rounded-lg font-semibold text-base transition-all ${
                    dateRangePreset === 'custom'
                      ? 'bg-blue-600 text-white shadow-md'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  Custom Range
                </button>
              </div>

              {dateRangePreset === 'custom' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="block text-base font-bold text-gray-700 mb-2">
                      <Calendar className="inline w-5 h-5 mr-2" />
                      Start Date
                    </label>
                    <input
                      type="date"
                      value={filters.startDate}
                      onChange={(e) => handleFilterChange('startDate', e.target.value)}
                      className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-base"
                    />
                  </div>
                  <div>
                    <label className="block text-base font-bold text-gray-700 mb-2">
                      <Calendar className="inline w-5 h-5 mr-2" />
                      End Date
                    </label>
                    <input
                      type="date"
                      value={filters.endDate}
                      onChange={(e) => handleFilterChange('endDate', e.target.value)}
                      className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-base"
                    />
                  </div>
                </div>
              )}

              <div className="flex items-center gap-4">
                <button
                  onClick={handleLoadHistory}
                  className="px-8 py-3 bg-gradient-to-r from-blue-900 to-amber-500 text-white rounded-lg font-bold text-lg hover:from-blue-950 hover:to-amber-600 transition-all shadow-md"
                >
                  <Search className="inline w-5 h-5 mr-2" />
                  Load History
                </button>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={showAllHistory}
                    onChange={(e) => {
                      setShowAllHistory(e.target.checked);
                      if (e.target.checked) {
                        setDateRangePreset('custom');
                      }
                    }}
                    className="w-5 h-5 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                  />
                  <span className="text-base font-semibold text-gray-700">Show All History</span>
                </label>
              </div>
            </div>

            {/* Additional Filters */}
            <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
              <h3 className="text-xl font-bold text-blue-950 mb-4">Additional Filters</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-base font-bold text-gray-700 mb-2">
                    <Filter className="inline w-5 h-5 mr-2" />
                    Meal Type
                  </label>
                  <select
                    value={filters.mealType}
                    onChange={(e) => handleFilterChange('mealType', e.target.value)}
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-base"
                  >
                    <option value="All Meal Types">All Meal Types</option>
                    <option value="Breakfast">Breakfast</option>
                    <option value="Lunch">Lunch</option>
                    <option value="Dinner">Dinner</option>
                    <option value="Morning Tea">Morning Tea</option>
                    <option value="Evening Tea">Evening Tea</option>
                    <option value="Mid-Morning Tea">Mid-Morning Tea</option>
                    <option value="Night Tea">Night Tea</option>
                  </select>
                </div>

                <div>
                  <label className="block text-base font-bold text-gray-700 mb-2">
                    Status
                  </label>
                  <select
                    value={filters.status}
                    onChange={(e) => handleFilterChange('status', e.target.value)}
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-base"
                  >
                    <option value="All">All Status</option>
                    <option value="Confirmed">Confirmed</option>
                    <option value="Cancelled">Cancelled</option>
                    <option value="Served">Served</option>
                    <option value="Pending">Pending</option>
                  </select>
                </div>
              </div>
              <div className="mt-4">
                <button
                  onClick={applyFilters}
                  className="px-6 py-3 bg-blue-600 text-white rounded-lg font-bold text-base hover:bg-blue-700 transition-all shadow-md"
                >
                  Apply Filters
                </button>
              </div>
            </div>

            {/* Orders Table */}
            <div className="bg-white rounded-xl shadow-lg overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full table-fixed">
                  <thead className="bg-gradient-to-r from-indigo-600 via-blue-600 to-cyan-600 text-white">
                    <tr>
                      <th className="text-left py-4 px-6 font-bold text-base" style={{width: '25%'}}>DATE</th>
                      <th className="text-left py-4 px-6 font-bold text-base" style={{width: '30%'}}>MEAL TYPE</th>
                      <th className="text-center py-4 px-6 font-bold text-base" style={{width: '20%'}}>STATUS</th>
                      <th className="text-right py-4 px-6 font-bold text-base" style={{width: '25%'}}>PRICE / QUOTA</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredOrders.length === 0 ? (
                      <tr>
                        <td colSpan="4" className="text-center py-12 text-gray-500">
                          <HistoryIcon className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                          <p className="text-xl font-semibold">No order history found</p>
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
                          <td className="py-4 px-6 text-base font-medium text-gray-800" style={{width: '25%'}}>
                            {new Date(order.orderDate || order.date).toLocaleDateString('en-GB', {
                              day: 'numeric',
                              month: 'short',
                              year: 'numeric'
                            })}
                          </td>
                          <td className="py-4 px-6 text-base font-semibold text-gray-800" style={{width: '30%'}}>{order.mealType}</td>
                          <td className="py-4 px-6 text-center" style={{width: '20%'}}>
                            <span className={`px-4 py-2 rounded-full text-sm font-bold ${
                              order.status === 'Completed' || order.status === 'Confirmed' || order.status === 'Booked' || order.status === 'Served'
                                ? 'bg-green-100 text-green-700'
                                : order.status === 'Cancelled'
                                ? 'bg-red-100 text-red-700'
                                : 'bg-yellow-100 text-yellow-700'
                            }`}>
                              {order.status}
                            </span>
                          </td>
                          <td className="py-4 px-6 text-right text-base font-bold text-blue-900" style={{width: '25%'}}>
                            {getPrice(order)}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Summary - SIMPLIFIED FOR OFFICER CADETS */}
            {filteredOrders.length > 0 && (
              <div className="bg-white rounded-xl shadow-lg p-8 mt-6">
                <h3 className="text-2xl font-bold text-blue-950 mb-6">Summary</h3>
                <div className="space-y-4">
                  <div className="flex justify-between items-center pb-4 border-b border-gray-200">
                    <span className="text-lg text-gray-600">Total Orders:</span>
                    <span className="font-bold text-xl text-gray-800">{filteredOrders.length}</span>
                  </div>
                  
                  {user?.role === 'Day Scholar' && (
                    <div className="flex justify-between items-center pt-2">
                      <span className="text-lg text-gray-600">Total Amount:</span>
                      <span className="font-bold text-blue-950 text-2xl">
                        Rs. {filteredOrders.reduce((sum, order) => sum + getActualPrice(order), 0).toFixed(2)}
                      </span>
                    </div>
                  )}

                  {/* Officer Cadet summary removed - only shows total orders count */}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
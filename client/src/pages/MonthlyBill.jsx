import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { 
  Download, 
  History,
  UtensilsCrossed,
  BookOpen,
  Clock,
  History as HistoryIcon,
  MessageSquare,
  Settings,
  FileText,
  LogOut,
  LayoutDashboard,
  Wallet,
  TrendingDown,
  Banknote,
  Filter,
  Calendar
} from 'lucide-react';
import axios from '../api/axios';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export default function MonthlyBill() {
  const navigate = useNavigate();
  const location = useLocation();
  const [user, setUser] = useState(null);
  const [selectedMonth, setSelectedMonth] = useState('');
  const [billData, setBillData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [availableMonths, setAvailableMonths] = useState([]);
  const [filters, setFilters] = useState({
    mealType: 'All',
    status: 'All',
    startDate: '',
    endDate: ''
  });
  const [filteredMealHistory, setFilteredMealHistory] = useState([]);

  useEffect(() => {
    const userData = JSON.parse(localStorage.getItem('user'));
    if (!userData || (userData.role !== 'Day Scholar' && userData.role !== 'Officer Cadet')) {
      alert('Access denied. Only Day Scholars and Officer Cadets can view bills.');
      navigate('/login');
      return;
    }
    setUser(userData);
    generateAvailableMonths();
  }, [navigate]);

  const handleLogout = () => {
    localStorage.removeItem('user');
    localStorage.removeItem('token');
    navigate('/login');
  };

  const generateAvailableMonths = () => {
    const months = [];
    const currentDate = new Date();
    
    for (let i = 0; i < 12; i++) {
      const date = new Date(currentDate.getFullYear(), currentDate.getMonth() - i, 1);
      months.push({
        value: `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`,
        label: date.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })
      });
    }
    
    setAvailableMonths(months);
    setSelectedMonth(months[0].value);
  };

  const fetchBillData = useCallback(async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`/bills/monthly/${selectedMonth}`, {
        headers: { 'x-auth-token': token }
      });
      console.log('📊 Bill Data Received:', response.data);
      setBillData(response.data);
    } catch (err) {
      console.error('❌ Error fetching bill data:', err);
      setBillData(null);
    }
    setLoading(false);
  }, [selectedMonth]);

  useEffect(() => {
    if (selectedMonth) {
      fetchBillData();
    }
  }, [selectedMonth, fetchBillData]);

  // Apply filters to meal history
  useEffect(() => {
    if (billData && billData.mealHistory) {
      let filtered = [...billData.mealHistory];

      // Filter by meal type
      if (filters.mealType !== 'All') {
        filtered = filtered.filter(meal => meal.mealType === filters.mealType);
      }

      // Filter by status
      if (filters.status !== 'All') {
        if (filters.status === 'Charged') {
          filtered = filtered.filter(meal => meal.charged === true);
        } else if (filters.status === 'Pending') {
          filtered = filtered.filter(meal => meal.charged === false);
        }
      }

      // Filter by date range
      if (filters.startDate) {
        filtered = filtered.filter(meal => {
          const mealDate = new Date(meal.date);
          mealDate.setHours(0, 0, 0, 0);
          const startDate = new Date(filters.startDate);
          startDate.setHours(0, 0, 0, 0);
          return mealDate >= startDate;
        });
      }

      if (filters.endDate) {
        filtered = filtered.filter(meal => {
          const mealDate = new Date(meal.date);
          mealDate.setHours(0, 0, 0, 0);
          const endDate = new Date(filters.endDate);
          endDate.setHours(23, 59, 59, 999);
          return mealDate <= endDate;
        });
      }

      setFilteredMealHistory(filtered);
    } else {
      setFilteredMealHistory([]);
    }
  }, [billData, filters]);

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const clearFilters = () => {
    setFilters({
      mealType: 'All',
      status: 'All',
      startDate: '',
      endDate: ''
    });
  };

  const downloadDayScholarPDF = () => {
    if (!billData) return;
    
    const doc = new jsPDF();
    
    doc.setFontSize(22);
    doc.setTextColor(30, 58, 138);
    doc.text('KDU Mess - Monthly Bill', 14, 22);
    
    doc.setFontSize(11);
    doc.setTextColor(100);
    const monthLabel = availableMonths.find(m => m.value === selectedMonth)?.label || selectedMonth;
    doc.text(`Billing Period: ${monthLabel}`, 14, 30);
    doc.text(`Generated on: ${new Date().toLocaleDateString('en-GB', { 
      day: 'numeric',
      month: 'long', 
      year: 'numeric' 
    })}`, 14, 36);
    
    doc.text(`Student: ${user?.firstName} ${user?.lastName}`, 14, 42);
    doc.text(`ID: ${user?.roleId}`, 14, 48);
    doc.text(`Role: ${user?.role}`, 14, 54);
    
    doc.setDrawColor(200);
    doc.line(14, 58, 196, 58);
    
    const tableData = billData.items.map(item => [
      item.item,
      item.quantity.toString(),
      `Rs. ${item.cost.toFixed(2)}`
    ]);
    
    autoTable(doc, {
      head: [['Item', 'Quantity', 'Cost (Rs.)']],
      body: tableData,
      startY: 64,
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
    
    const finalY = doc.lastAutoTable.finalY + 10;
    
    doc.setDrawColor(30, 58, 138);
    doc.setLineWidth(0.5);
    doc.line(14, finalY, 196, finalY);
    
    doc.setFontSize(14);
    doc.setTextColor(30, 58, 138);
    doc.text('Total Amount Due:', 14, finalY + 10);
    doc.setFontSize(16);
    doc.text(`Rs. ${billData.totalAmount.toFixed(2)}`, 150, finalY + 10);
    
    doc.setFontSize(8);
    doc.setTextColor(150);
    doc.text(
      `This is a computer-generated bill from KDU Mess System`,
      105,
      doc.internal.pageSize.getHeight() - 10,
      { align: 'center' }
    );
    
    doc.save(`monthly-bill-${selectedMonth}.pdf`);
  };

  const downloadOfficerCadetPDF = () => {
    if (!billData) return;
    
    const doc = new jsPDF();
    
    doc.setFontSize(22);
    doc.setTextColor(30, 58, 138);
    doc.text('KDU Mess - Monthly Allowance Summary', 14, 22);
    
    doc.setFontSize(11);
    doc.setTextColor(100);
    const monthLabel = availableMonths.find(m => m.value === selectedMonth)?.label || selectedMonth;
    doc.text(`Period: ${monthLabel}`, 14, 30);
    doc.text(`Generated on: ${new Date().toLocaleDateString('en-GB', { 
      day: 'numeric',
      month: 'long', 
      year: 'numeric' 
    })}`, 14, 36);
    
    doc.text(`Officer Cadet: ${user?.firstName} ${user?.lastName}`, 14, 42);
    doc.text(`ID: ${user?.roleId}`, 14, 48);
    
    doc.setDrawColor(200);
    doc.line(14, 52, 196, 52);
    
    // Financial summary box
    doc.setFillColor(240, 249, 255);
    doc.rect(14, 58, 182, 40, 'F');
    
    doc.setFontSize(11);
    doc.setTextColor(60);
    doc.text('Financial Summary:', 18, 66);
    
    doc.setFontSize(10);
    doc.text(`Monthly Allowance: Rs. ${(billData.monthlyAllowance || 36000).toFixed(2)}`, 18, 74);
    
    doc.setTextColor(220, 38, 38);
    doc.text(`Total Spent: Rs. ${(billData.totalSpent || 0).toFixed(2)}`, 18, 81);
    
    doc.setFontSize(11);
    doc.setTextColor(22, 101, 52);
    doc.text(`Remaining Balance: Rs. ${(billData.remainingBalance || 36000).toFixed(2)}`, 18, 91);
    
    const tableData = billData.mealHistory?.map(meal => [
      new Date(meal.date).toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'short',
        year: 'numeric'
      }),
      meal.mealType,
      meal.charged ? `Rs. ${(meal.deduction || 0).toFixed(2)}` : 'Pending'
    ]) || [];
    
    autoTable(doc, {
      head: [['Date', 'Meal/Tea', 'Amount']],
      body: tableData,
      startY: 105,
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
      },
      columnStyles: {
        2: { halign: 'right' }
      }
    });
    
    const finalY = doc.lastAutoTable.finalY + 10;
    doc.setFontSize(9);
    doc.setTextColor(100);
    doc.text('Note: All meals and tea are deducted from your monthly allowance after consumption.', 14, finalY);
    
    doc.setFontSize(8);
    doc.setTextColor(150);
    doc.text(
      `This is a computer-generated summary from KDU Mess System`,
      105,
      doc.internal.pageSize.getHeight() - 10,
      { align: 'center' }
    );
    
    doc.save(`allowance-summary-${selectedMonth}.pdf`);
  };

  const downloadBill = () => {
    if (user?.role === 'Day Scholar') {
      downloadDayScholarPDF();
    } else {
      downloadOfficerCadetPDF();
    }
  };

  const getNavigationItems = () => {
    if (user?.role === 'Day Scholar') {
      return [
        { icon: LayoutDashboard, label: 'Dashboard', path: '/day-scholar-dashboard' },
        { icon: UtensilsCrossed, label: 'Menu Page', path: '/view-menu' },
        { icon: BookOpen, label: 'Booking', path: '/booking' },
        { icon: Clock, label: 'Cancellation', path: '/cancel-booking' },
        { icon: HistoryIcon, label: 'Order History', path: '/order-history' },
        { icon: MessageSquare, label: 'Feedback', path: '/feedback' },
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
        <div className="text-white text-2xl font-semibold">Loading bill data...</div>
      </div>
    );
  }

  // Day Scholar View
  if (user?.role === 'Day Scholar') {
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
                      isActive ? 'bg-blue-50 text-blue-700' : 'text-gray-700 hover:bg-gray-100'
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
            <div className="max-w-full mx-auto px-4">
              <div className="bg-white rounded-xl shadow-lg p-8 mb-6">
                <h1 className="text-4xl font-bold text-blue-950">Monthly Bill</h1>
                <p className="text-gray-600 mt-2 text-lg">View your monthly bill for day-scholar meals and tea</p>
              </div>

              <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
                <label className="block text-base font-bold text-gray-700 mb-2">Select Month</label>
                <select
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                  className="w-full max-w-xs px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-base font-medium"
                >
                  {availableMonths.map((month) => (
                    <option key={month.value} value={month.value}>{month.label}</option>
                  ))}
                </select>
              </div>

              {billData && billData.items && billData.items.length > 0 ? (
                <>
                  <div className="bg-white rounded-xl shadow-lg overflow-hidden mb-6">
                    <table className="w-full">
                      <thead className="bg-gradient-to-r from-indigo-600 via-blue-600 to-cyan-600 text-white">
                        <tr>
                          <th className="text-left py-4 px-6 font-bold text-base w-1/2">ITEM</th>
                          <th className="text-center py-4 px-6 font-bold text-base w-1/4">QUANTITY</th>
                          <th className="text-right py-4 px-6 font-bold text-base w-1/4">COST (Rs.)</th>
                        </tr>
                      </thead>
                      <tbody>
                        {billData.items.map((item, index) => (
                          <tr key={index} className={`border-b border-gray-100 ${
                            index % 2 === 0 ? 'bg-white' : 'bg-gray-50'
                          }`}>
                            <td className="py-4 px-6 text-gray-800 font-medium text-base text-left">{item.item}</td>
                            <td className="py-4 px-6 text-gray-800 text-base text-center">{item.quantity}</td>
                            <td className="py-4 px-6 text-gray-800 font-bold text-base text-right">{item.cost.toFixed(2)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div className="bg-gradient-to-r from-blue-50 to-blue-100 rounded-xl p-8 mb-6 border-l-4 border-blue-900 shadow-lg">
                    <div className="flex justify-between items-center">
                      <span className="text-2xl font-bold text-blue-950">Total Amount Due</span>
                      <span className="text-4xl font-bold text-blue-900">
                        Rs. {billData.totalAmount.toFixed(2)}
                      </span>
                    </div>
                  </div>

                  <div className="flex gap-4">
                    <button
                      onClick={downloadBill}
                      className="flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-blue-900 to-amber-500 text-white rounded-lg font-bold text-lg hover:from-blue-950 hover:to-amber-600 transition-all shadow-md"
                    >
                      <Download className="w-6 h-6" />
                      Download Bill (PDF)
                    </button>
                    <button
                      onClick={() => navigate('/order-history')}
                      className="flex items-center gap-2 px-8 py-4 bg-gray-600 hover:bg-gray-700 text-white rounded-lg font-bold text-lg transition-colors shadow-md"
                    >
                      <History className="w-6 h-6" />
                      View Order History
                    </button>
                  </div>
                </>
              ) : (
                <div className="bg-white rounded-xl shadow-lg p-16 text-center">
                  <FileText className="w-24 h-24 mx-auto mb-4 text-gray-300" />
                  <p className="text-gray-500 text-2xl font-bold mb-2">No bill data available for this month</p>
                  <p className="text-base text-gray-400">Your bills will appear here once you make bookings</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Officer Cadet View
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
                    isActive ? 'bg-blue-50 text-blue-700' : 'text-gray-700 hover:bg-gray-100'
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
          <div className="max-w-full mx-auto px-4">
            <div className="bg-white rounded-xl shadow-lg p-8 mb-6">
              <h1 className="text-4xl font-bold text-blue-950">Monthly Allowance Summary</h1>
              <p className="text-gray-600 mt-2 text-lg">Track your monthly allowance and expenses</p>
            </div>

            <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
              <label className="block text-base font-bold text-gray-700 mb-2">Select Month</label>
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="w-full max-w-xs px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-base font-medium"
              >
                {availableMonths.map((month) => (
                  <option key={month.value} value={month.value}>{month.label}</option>
                ))}
              </select>
            </div>

            {billData ? (
              <>
                <div className="bg-white rounded-xl shadow-lg p-8 mb-6">
                  <h2 className="text-2xl font-bold text-blue-950 mb-6">Financial Summary</h2>
                  <div className="grid grid-cols-3 gap-6">
                    <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-6 border-l-4 border-blue-900 shadow-md">
                      <div className="flex items-center gap-3 mb-3">
                        <Wallet className="w-8 h-8 text-blue-900" />
                        <p className="text-sm text-gray-600 font-medium">Monthly Allowance</p>
                      </div>
                       <p className="text-3xl font-bold text-blue-900">
                        Rs. {(billData.monthlyAllowance || 36000).toFixed(2)}
                      </p>
                    </div>
                    <div className="bg-gradient-to-br from-red-50 to-red-100 rounded-xl p-6 border-l-4 border-red-600 shadow-md">
                      <div className="flex items-center gap-3 mb-3">
                        <TrendingDown className="w-8 h-8 text-red-700" />
                        <p className="text-sm text-gray-600 font-medium">Total Spent</p>
                      </div>
                      <p className="text-3xl font-bold text-red-700">
                        Rs. {(billData.totalSpent || 0).toFixed(2)}
                      </p>
                    </div>
                    <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-6 border-l-4 border-green-600 shadow-md">
                      <div className="flex items-center gap-3 mb-3">
                        <Banknote className="w-8 h-8 text-green-700" />
                        <p className="text-sm text-gray-600 font-medium">Remaining Balance</p>
                      </div>
                      <p className="text-3xl font-bold text-green-700">
                        Rs. {(billData.remainingBalance || 36000).toFixed(2)}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-xl shadow-lg overflow-hidden mb-6">
                  <div className="p-6 border-b border-gray-200">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <h2 className="text-2xl font-bold text-blue-950">Expense History</h2>
                        <p className="text-sm text-gray-600 mt-1">All expenses are charged after the meal/tea time ends</p>
                      </div>
                      <div className="text-sm text-gray-600">
                        Showing {filteredMealHistory.length} of {billData.mealHistory?.length || 0} entries
                      </div>
                    </div>

                    {/* Filters */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mt-4">
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                          <Filter className="inline w-4 h-4 mr-1" />
                          Meal Type
                        </label>
                        <select
                          value={filters.mealType}
                          onChange={(e) => handleFilterChange('mealType', e.target.value)}
                          className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                        >
                          <option value="All">All Types</option>
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
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                          Status
                        </label>
                        <select
                          value={filters.status}
                          onChange={(e) => handleFilterChange('status', e.target.value)}
                          className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                        >
                          <option value="All">All Status</option>
                          <option value="Charged">Charged</option>
                          <option value="Pending">Pending</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                          <Calendar className="inline w-4 h-4 mr-1" />
                          Start Date
                        </label>
                        <input
                          type="date"
                          value={filters.startDate}
                          onChange={(e) => handleFilterChange('startDate', e.target.value)}
                          className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                          <Calendar className="inline w-4 h-4 mr-1" />
                          End Date
                        </label>
                        <div className="flex gap-2">
                          <input
                            type="date"
                            value={filters.endDate}
                            onChange={(e) => handleFilterChange('endDate', e.target.value)}
                            className="flex-1 px-3 py-2 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                          />
                          <button
                            onClick={clearFilters}
                            className="px-3 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg text-sm font-semibold transition-colors"
                            title="Clear all filters"
                          >
                            Clear
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="overflow-x-auto max-h-96 overflow-y-auto">
                    <table className="w-full">
                      <thead className="bg-gradient-to-r from-indigo-600 via-blue-600 to-cyan-600 text-white sticky top-0">
                        <tr>
                          <th className="text-left py-4 px-6 font-bold text-base w-1/4">DATE</th>
                          <th className="text-left py-4 px-6 font-bold text-base w-1/3">MEAL/TEA</th>
                          <th className="text-center py-4 px-6 font-bold text-base w-1/6">STATUS</th>
                          <th className="text-right py-4 px-6 font-bold text-base w-1/4">AMOUNT (Rs.)</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredMealHistory.length > 0 ? (
                          filteredMealHistory.map((meal, index) => (
                            <tr key={index} className={`border-b border-gray-100 ${
                              index % 2 === 0 ? 'bg-white' : 'bg-gray-50'
                            }`}>
                              <td className="py-4 px-6 text-gray-600 text-base text-left">
                                {new Date(meal.date).toLocaleDateString('en-GB', {
                                  day: 'numeric',
                                  month: 'short',
                                  year: 'numeric'
                                })}
                              </td>
                              <td className="py-4 px-6 text-blue-700 font-bold text-base text-left">{meal.mealType}</td>
                              <td className="py-4 px-6 text-center">
                                {meal.charged ? (
                                  <span className="inline-block px-3 py-1 bg-red-100 text-red-700 rounded-full text-xs font-bold">
                                    Charged
                                  </span>
                                ) : (
                                  <span className="inline-block px-3 py-1 bg-yellow-100 text-yellow-700 rounded-full text-xs font-bold">
                                    Pending
                                  </span>
                                )}
                              </td>
                              <td className="py-4 px-6 font-bold text-base text-right">
                                {meal.charged ? (
                                  <span className="text-red-600">Rs. {(meal.deduction || 0).toFixed(2)}</span>
                                ) : (
                                  <span className="text-yellow-600">Rs. {(meal.deduction || 0).toFixed(2)}</span>
                                )}
                              </td>
                            </tr>
                          ))
                        ) : billData.mealHistory && billData.mealHistory.length > 0 ? (
                          <tr>
                            <td colSpan="4" className="py-12 text-center text-gray-500">
                              <FileText className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                              <p className="text-lg font-semibold">No expenses match your filters</p>
                              <p className="text-sm text-gray-400 mt-2">Try adjusting your search or filter criteria</p>
                            </td>
                          </tr>
                        ) : (
                          <tr>
                            <td colSpan="4" className="py-12 text-center text-gray-500">
                              <FileText className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                              <p className="text-lg font-semibold">No expense history for this month</p>
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="bg-blue-50 border-l-4 border-blue-900 rounded-lg p-8 mb-6 text-center">
                  <h3 className="font-bold text-blue-950 mb-4 text-xl text-center flex items-center justify-center gap-2">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Deduction Policy
                  </h3>
                  <div className="max-w-4xl mx-auto">
                    <ul className="text-sm text-blue-900 space-y-3">
                      <li className="flex items-start justify-center gap-3">
                        <span className="font-bold mt-1 text-base">•</span>
                        <div>
                          <strong className="text-base">All meals and tea are deducted from your Rs. 36,000 monthly allowance</strong>
                        </div>
                      </li>
                      <li className="flex items-start justify-center gap-3">
                        <span className="font-bold mt-1 text-base">•</span>
                        <div>
                          <strong className="text-base">Deduction happens after the meal/tea time ends:</strong>
                          <ul className="mt-2 space-y-1 text-center">
                            <li>- Breakfast (Rs. 250): Charged after 9:00 AM</li>
                            <li>- Lunch (Rs. 400): Charged after 2:00 PM</li>
                            <li>- Dinner (Rs. 250): Charged at end of day (11:59 PM)</li>
                            <li>- Morning Tea (Rs. 100): Charged after 11:00 AM</li>
                            <li>- Mid-Morning Tea (Rs. 100): Charged after 12:00 PM</li>
                            <li>- Evening Tea (Rs. 100): Charged after 5:00 PM</li>
                            <li>- Night Tea (Rs. 100): Charged after 11:00 PM</li>
                          </ul>
                        </div>
                      </li>
                      <li className="flex items-start justify-center gap-3">
                        <span className="font-bold mt-1 text-base">•</span>
                        <div className="text-base"><strong>Pending</strong> charges will be deducted automatically after the scheduled time</div>
                      </li>
                      <li className="flex items-start justify-center gap-3">
                        <span className="font-bold mt-1 text-base">•</span>
                        <div className="text-base">Track your remaining balance to manage your monthly expenses</div>
                      </li>
                    </ul>
                  </div>
                </div>

                <button
                  onClick={downloadBill}
                  className="flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-blue-900 to-amber-500 text-white rounded-lg font-bold text-lg hover:from-blue-950 hover:to-amber-600 transition-all shadow-md"
                >
                  <Download className="w-6 h-6" />
                  Download Summary (PDF)
                </button>
              </>
            ) : (
              <div className="bg-white rounded-xl shadow-lg p-16 text-center">
                <FileText className="w-24 h-24 mx-auto mb-4 text-gray-300" />
                <p className="text-gray-500 text-2xl font-bold mb-2">No data available for this month</p>
                <p className="text-base text-gray-400">Your allowance summary will appear here</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
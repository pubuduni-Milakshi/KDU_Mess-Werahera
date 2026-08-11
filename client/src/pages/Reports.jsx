import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Calendar,
  FileText,
  TrendingUp,
  Users,
  DollarSign,
  UtensilsCrossed,
  BarChart3,
  BookOpen,
  MessageSquare,
  Settings,
  LogOut,
  ClipboardList,
  ShoppingCart,
  LayoutDashboard
} from 'lucide-react';
import axios from '../api/axios';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

export default function Reports() {
  const navigate = useNavigate();
  const location = useLocation();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(false);
  const [activeReport, setActiveReport] = useState('daily');
  const [dateRange, setDateRange] = useState({
    startDate: new Date().toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0]
  });
  
  // Report Data States
  const [dailyMealsData, setDailyMealsData] = useState(null);
  const [periodSummaryData, setPeriodSummaryData] = useState(null);
  const [financialData, setFinancialData] = useState(null);
  const [orderStatusData, setOrderStatusData] = useState(null);

  const fetchReport = useCallback(async (reportType) => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const params = new URLSearchParams(dateRange);
      let response;
      
      switch(reportType) {
        case 'daily':
          response = await axios.get(`/reports/daily-meals?${params}`, {
            headers: { 'x-auth-token': token }
          });
          setDailyMealsData(response.data);
          break;
        case 'period':
          response = await axios.get(`/reports/period-summary?${params}`, {
            headers: { 'x-auth-token': token }
          });
          setPeriodSummaryData(response.data);
          break;
        case 'financial':
          response = await axios.get(`/reports/financial?${params}`, {
            headers: { 'x-auth-token': token }
          });
          setFinancialData(response.data);
          break;
        case 'status':
          response = await axios.get(`/reports/order-status?${params}`, {
            headers: { 'x-auth-token': token }
          });
          console.log('📊 Order Status Report Data:', response.data);
          console.log('📊 Daily Meal Type Breakdown:', response.data.dailyMealTypeBreakdown);
          setOrderStatusData(response.data);
          break;
        default:
          break;
      }
    } catch (err) {
      console.error('Error fetching report:', err);
      alert('Failed to generate report. Please try again.');
    }
    setLoading(false);
  }, [dateRange]);

  useEffect(() => {
    const userData = JSON.parse(localStorage.getItem('user'));
    if (!userData) {
      navigate('/login');
      return;
    }
    if (userData.role !== 'Admin' && userData.role !== 'Mess Staff') {
      alert('Access denied. Only Admin and Mess Staff can view reports.');
      navigate('/login');
      return;
    }
    setUser(userData);
  }, [navigate]);

  const handleGenerateReport = () => {
    fetchReport(activeReport);
  };

  const handleExportPDF = () => {
    const doc = new jsPDF();
    
    // Header
    doc.setFontSize(20);
    doc.setTextColor(30, 58, 138);
    doc.text('KDU Mess - Report', 14, 20);
    
    doc.setFontSize(11);
    doc.setTextColor(100);
    doc.text(`Generated: ${new Date().toLocaleDateString('en-GB')}`, 14, 28);
    doc.text(`Date Range: ${dateRange.startDate} to ${dateRange.endDate}`, 14, 34);
    
    doc.setDrawColor(200);
    doc.line(14, 38, 196, 38);
    
    let startY = 45;

    switch(activeReport) {
      case 'daily':
        if (dailyMealsData) {
          doc.setFontSize(16);
          doc.setTextColor(30, 58, 138);
          doc.text('Daily Meals Report', 14, startY);
          startY += 10;

          // Meals by Type
          doc.setFontSize(12);
          doc.text('Meals by Type', 14, startY);
          startY += 5;
          
          const mealTypeData = dailyMealsData.mealsByType?.map(item => [
            item._id,
            item.count.toString()
          ]) || [];
          
          doc.autoTable({
            head: [['Meal Type', 'Count']],
            body: mealTypeData,
            startY: startY,
            theme: 'striped',
            headStyles: { fillColor: [30, 58, 138] }
          });
          
          startY = doc.lastAutoTable.finalY + 10;

          // Meals by Role
          doc.text('Breakdown by User Role', 14, startY);
          startY += 5;
          
          const mealRoleData = dailyMealsData.mealsByRole?.map(item => [
            item._id,
            item.count.toString()
          ]) || [];
          
          doc.autoTable({
            head: [['User Role', 'Count']],
            body: mealRoleData,
            startY: startY,
            theme: 'striped',
            headStyles: { fillColor: [30, 58, 138] }
          });
          
          startY = doc.lastAutoTable.finalY + 10;

          // Tea Count
          doc.setFontSize(12);
          doc.text(`Tea/Beverage Requests: ${dailyMealsData.teaCount || 0}`, 14, startY);
        }
        break;

      case 'period':
        if (periodSummaryData) {
          doc.setFontSize(16);
          doc.setTextColor(30, 58, 138);
          doc.text('Period Summary Report', 14, startY);
          startY += 10;

          doc.setFontSize(12);
          doc.setTextColor(60);
          doc.text(`Total Meals: ${periodSummaryData.totalMeals}`, 14, startY);
          startY += 7;
          doc.text(`Average Per Day: ${periodSummaryData.avgMealsPerDay}`, 14, startY);
          startY += 7;
          doc.text(`Days in Period: ${periodSummaryData.daysDiff}`, 14, startY);
          startY += 10;

          // Daily Breakdown
          doc.text('Daily Breakdown', 14, startY);
          startY += 5;
          
          const dailyData = periodSummaryData.dailyBreakdown?.map(item => [
            item._id,
            item.count.toString()
          ]) || [];
          
          doc.autoTable({
            head: [['Date', 'Meals Served']],
            body: dailyData,
            startY: startY,
            theme: 'striped',
            headStyles: { fillColor: [30, 58, 138] }
          });
        }
        break;

      case 'financial':
        if (financialData) {
          doc.setFontSize(16);
          doc.setTextColor(30, 58, 138);
          doc.text('Financial Report', 14, startY);
          startY += 10;

          doc.setFontSize(14);
          doc.setTextColor(22, 101, 52);
          doc.text(`Total Revenue: Rs. ${(financialData.totalRevenue || 0).toFixed(2)}`, 14, startY);
          startY += 15;

          // Revenue by Meal Type
          doc.setFontSize(12);
          doc.setTextColor(60);
          doc.text('Revenue by Meal Type', 14, startY);
          startY += 5;
          
          const revenueByMealData = financialData.revenueByMealType?.map(item => [
            item._id,
            item.count.toString(),
            `Rs. ${(item.revenue || 0).toFixed(2)}`
          ]) || [];
          
          doc.autoTable({
            head: [['Meal Type', 'Count', 'Revenue']],
            body: revenueByMealData,
            startY: startY,
            theme: 'striped',
            headStyles: { fillColor: [30, 58, 138] }
          });
          
          startY = doc.lastAutoTable.finalY + 10;

          // Revenue by User Type
          doc.text('Revenue by User Category', 14, startY);
          startY += 5;
          
          const revenueByUserData = financialData.revenueByUserType?.map(item => [
            item._id,
            item.count.toString(),
            `Rs. ${(item.revenue || 0).toFixed(2)}`
          ]) || [];
          
          doc.autoTable({
            head: [['User Type', 'Orders', 'Revenue']],
            body: revenueByUserData,
            startY: startY,
            theme: 'striped',
            headStyles: { fillColor: [30, 58, 138] }
          });
        }
        break;

      case 'status':
        if (orderStatusData) {
          doc.setFontSize(16);
          doc.setTextColor(30, 58, 138);
          doc.text('Order Status Report', 14, startY);
          startY += 10;

          doc.setFontSize(12);
          doc.setTextColor(60);
          doc.text(`Total Orders: ${orderStatusData.totalOrders || 0}`, 14, startY);
          startY += 10;

          doc.text('Order Status Breakdown', 14, startY);
          startY += 5;
          
          const statusData = orderStatusData.statusBreakdown?.map(item => [
            item._id,
            item.count.toString()
          ]) || [];
          
          doc.autoTable({
            head: [['Status', 'Count']],
            body: statusData,
            startY: startY,
            theme: 'striped',
            headStyles: { fillColor: [30, 58, 138] }
          });

          startY = doc.lastAutoTable.finalY + 10;

          // Daily meal/tea breakdown
          doc.text('Daily Meal / Tea Breakdown', 14, startY);
          startY += 5;

          const mealByDayData = orderStatusData.dailyMealTypeBreakdown?.map(item => {
            // Handle the nested _id structure
            const date = item._id?.date || item.date || 'N/A';
            const mealType = item._id?.mealType || item.mealType || 'N/A';
            const count = item.count || item.quantity || 0;
            return [date, mealType, count.toString()];
          }).filter(item => item[0] !== 'N/A' && item[1] !== 'N/A') || [];

          if (mealByDayData.length > 0) {
            doc.autoTable({
              head: [['Date', 'Meal / Tea Type', 'Orders']],
              body: mealByDayData,
              startY: startY,
              theme: 'striped',
              headStyles: { fillColor: [30, 58, 138] }
            });
          } else {
            doc.setFontSize(10);
            doc.setTextColor(100);
            doc.text('No meal/tea order data available for this period.', 14, startY);
          }
        }
        break;

      default:
        break;
    }

    // Footer
    doc.setFontSize(8);
    doc.setTextColor(150);
    doc.text(
      'Generated by KDU Mess System',
      105,
      doc.internal.pageSize.getHeight() - 10,
      { align: 'center' }
    );

    doc.save(`${activeReport}-report-${dateRange.startDate}.pdf`);
  };

  const handleLogout = () => {
    localStorage.removeItem('user');
    localStorage.removeItem('token');
    navigate('/login');
  };

  // Sidebar navigation based on role
  const getNavigationItems = () => {
    if (user?.role === 'Admin') {
      return [
        { icon: LayoutDashboard, label: 'Dashboard', path: '/admin-dashboard' },
        { icon: BookOpen, label: 'View Menu', path: '/view-menu' },
        { icon: UtensilsCrossed, label: 'Menu Management', path: '/menu-management' },
        { icon: ShoppingCart, label: 'Orders Management', path: '/orders-management' },
        { icon: Users, label: 'User Management', path: '/user-management' },
        { icon: ClipboardList, label: 'Reports', path: '/reports' },
        { icon: MessageSquare, label: 'Feedback', path: '/feedback' },
        { icon: Settings, label: 'Settings', path: '/settings' }
      ];
    } else if (user?.role === 'Mess Staff') {
      return [
        { icon: LayoutDashboard, label: 'Dashboard', path: '/mess-staff-dashboard' },
        { icon: BookOpen, label: 'View Menu', path: '/view-menu' },
        { icon: ShoppingCart, label: 'Order Management', path: '/orders-management' },
        { icon: ClipboardList, label: 'Reports', path: '/reports' },
        { icon: MessageSquare, label: 'Feedback', path: '/feedback' },
        { icon: Settings, label: 'Settings', path: '/settings' }
      ];
    }
    return [];
  };

  // Get available report types based on user role
  const getAvailableReports = () => {
    if (user?.role === 'Admin') {
      return [
        { key: 'daily', label: 'Daily Meals', icon: UtensilsCrossed },
        { key: 'period', label: 'Period Summary', icon: TrendingUp },
        { key: 'financial', label: 'Financial', icon: DollarSign },
        { key: 'status', label: 'Order Status', icon: BarChart3 }
      ];
    } else if (user?.role === 'Mess Staff') {
      return [
        { key: 'daily', label: 'Daily Meals', icon: UtensilsCrossed },
        { key: 'status', label: 'Order Status', icon: BarChart3 }
      ];
    }
    return [];
  };

  const renderDailyMealsReport = () => {
    if (!dailyMealsData) return null;

    return (
      <div className="space-y-6">
        <div className="bg-white rounded-xl shadow-lg p-6">
          <h3 className="text-xl font-bold mb-4 text-blue-950">Meals by Type</h3>
          <div className="grid grid-cols-3 gap-4">
            {dailyMealsData.mealsByType?.map((item) => (
              <div key={item._id} className="p-4 bg-gray-100 rounded-lg">
                <p className="text-sm font-medium text-gray-600">{item._id}</p>
                <p className="text-3xl font-bold mt-2 text-blue-900">{item.count}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-lg p-6">
          <h3 className="text-xl font-bold mb-4 text-blue-950">Breakdown by User Role</h3>
          <div className="space-y-3">
            {dailyMealsData.mealsByRole?.map((item) => (
              <div key={item._id} className="flex justify-between items-center p-3 bg-gray-100 rounded-lg">
                <span className="font-medium text-gray-800">{item._id}</span>
                <span className="text-xl font-bold text-blue-700">{item.count}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-lg p-6">
          <h3 className="text-xl font-bold mb-4 text-blue-950">Tea/Beverage Requests</h3>
          <div className="p-4 bg-amber-100 rounded-lg">
            <p className="text-sm font-medium text-gray-600">Total Tea Requests</p>
            <p className="text-3xl font-bold mt-2 text-amber-600">{dailyMealsData.teaCount || 0}</p>
          </div>
        </div>
      </div>
    );
  };

  const renderPeriodSummaryReport = () => {
    if (!periodSummaryData) return null;

    return (
      <div className="space-y-6">
        <div className="grid grid-cols-3 gap-6">
          <div className="bg-white rounded-xl shadow-lg p-6">
            <p className="text-sm font-medium text-gray-600">Total Meals Served</p>
            <p className="text-4xl font-bold mt-2 text-blue-900">{periodSummaryData.totalMeals}</p>
          </div>
          <div className="bg-white rounded-xl shadow-lg p-6">
            <p className="text-sm font-medium text-gray-600">Average Per Day</p>
            <p className="text-4xl font-bold mt-2 text-green-600">{periodSummaryData.avgMealsPerDay}</p>
          </div>
          <div className="bg-white rounded-xl shadow-lg p-6">
            <p className="text-sm font-medium text-gray-600">Days in Period</p>
            <p className="text-4xl font-bold mt-2 text-amber-500">{periodSummaryData.daysDiff}</p>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-lg p-6">
          <h3 className="text-xl font-bold mb-4 text-blue-950">Daily Breakdown</h3>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gradient-to-r from-indigo-600 via-blue-600 to-cyan-600 text-white">
                <tr>
                  <th className="text-left py-3 px-4 font-bold text-base">DATE</th>
                  <th className="text-right py-3 px-4 font-bold text-base">MEALS SERVED</th>
                </tr>
              </thead>
              <tbody>
                {periodSummaryData.dailyBreakdown?.map((item, index) => (
                  <tr key={item._id} className={`border-b border-gray-100 ${
                    index % 2 === 0 ? 'bg-white' : 'bg-gray-50'
                  }`}>
                    <td className="py-3 px-4 text-gray-800">{item._id}</td>
                    <td className="py-3 px-4 font-bold text-blue-700 text-right">{item.count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  };

  const renderFinancialReport = () => {
    if (!financialData) return null;

    return (
      <div className="space-y-6">
        {!financialData.isPricingConfigured && (
          <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded-lg">
            <p className="font-medium text-amber-600">
              Pricing not configured yet. Revenue calculations will show Rs.0 until meal prices are added.
            </p>
          </div>
        )}

        <div className="bg-white rounded-xl shadow-lg p-6">
          <h3 className="text-xl font-bold mb-4 text-blue-950">Total Revenue</h3>
          <p className="text-5xl font-bold text-green-600">
            Rs. {(financialData.totalRevenue || 0).toFixed(2)}
          </p>
        </div>

        <div className="bg-white rounded-xl shadow-lg p-6">
          <h3 className="text-xl font-bold mb-4 text-blue-950">Revenue by Meal Type</h3>
          <div className="space-y-3">
            {financialData.revenueByMealType?.map((item) => (
              <div key={item._id} className="flex justify-between items-center p-3 bg-gray-100 rounded-lg">
                <div>
                  <span className="font-medium text-gray-800">{item._id}</span>
                  <p className="text-sm text-gray-600">{item.count} meals</p>
                </div>
                <span className="text-xl font-bold text-green-600">Rs. {(item.revenue || 0).toFixed(2)}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-lg p-6">
          <h3 className="text-xl font-bold mb-4 text-blue-950">Revenue by User Category</h3>
          <div className="space-y-3">
            {financialData.revenueByUserType?.map((item) => (
              <div key={item._id} className="flex justify-between items-center p-3 bg-gray-100 rounded-lg">
                <div>
                  <span className="font-medium text-gray-800">{item._id}</span>
                  <p className="text-sm text-gray-600">{item.count} orders</p>
                </div>
                <span className="text-xl font-bold text-green-600">Rs. {(item.revenue || 0).toFixed(2)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  const renderOrderStatusReport = () => {
    if (!orderStatusData) return null;

    return (
      <div className="space-y-6">
        <div className="bg-white rounded-xl shadow-lg p-6">
          <h3 className="text-xl font-bold mb-4 text-blue-950">Total Orders</h3>
          <p className="text-5xl font-bold text-blue-900">{orderStatusData.totalOrders || 0}</p>
        </div>

        <div className="bg-white rounded-xl shadow-lg p-6">
          <h3 className="text-xl font-bold mb-4 text-blue-950">Order Status Breakdown</h3>
          <div className="grid grid-cols-2 gap-4">
            {orderStatusData.statusBreakdown?.map((item) => {
              let bgColor = 'bg-gray-100';
              let textColor = 'text-gray-800';
              
              if (item._id === 'Confirmed' || item._id === 'Served') {
                bgColor = 'bg-green-100';
                textColor = 'text-green-600';
              } else if (item._id === 'Pending' || item._id === 'Booked') {
                bgColor = 'bg-amber-100';
                textColor = 'text-amber-600';
              } else if (item._id === 'Cancelled') {
                bgColor = 'bg-red-100';
                textColor = 'text-red-600';
              }

              return (
                <div key={item._id} className={`p-4 ${bgColor} rounded-lg`}>
                  <p className="text-sm font-medium text-gray-600">{item._id}</p>
                  <p className={`text-3xl font-bold mt-2 ${textColor}`}>{item.count}</p>
                </div>
              );
            })}
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-lg p-6">
          <h3 className="text-xl font-bold mb-4 text-blue-950">Daily Meal / Tea Orders</h3>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gradient-to-r from-indigo-600 via-blue-600 to-cyan-600 text-white">
                <tr>
                  <th className="text-left py-3 px-4 font-bold text-base">DATE</th>
                  <th className="text-left py-3 px-4 font-bold text-base">MEAL / TEA TYPE</th>
                  <th className="text-right py-3 px-4 font-bold text-base">ORDERS</th>
                </tr>
              </thead>
              <tbody>
                {orderStatusData.dailyMealTypeBreakdown && orderStatusData.dailyMealTypeBreakdown.length > 0 ? (
                  orderStatusData.dailyMealTypeBreakdown.map((item, index) => {
                    const date = item._id?.date || item.date || 'N/A';
                    const mealType = item._id?.mealType || item.mealType || 'N/A';
                    const count = item.count || item.quantity || 0;
                    return (
                      <tr
                        key={`${date}-${mealType}-${index}`}
                        className={`border-b border-gray-100 ${
                          index % 2 === 0 ? 'bg-white' : 'bg-gray-50'
                        }`}
                      >
                        <td className="py-3 px-4 text-gray-800">{date}</td>
                        <td className="py-3 px-4 text-gray-800">{mealType}</td>
                        <td className="py-3 px-4 font-bold text-blue-700 text-right">{count}</td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan="3" className="py-8 px-4 text-center text-gray-500">
                      No meal/tea order data available for this period.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  };

  const availableReports = getAvailableReports();

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
            {/* Header */}
            <div className="bg-white rounded-xl shadow-lg p-8 mb-6">
              <h1 className="text-4xl font-bold text-blue-950">Reports & Analytics</h1>
              <p className="text-gray-600 mt-2 text-lg">Generate comprehensive reports for mess operations</p>
            </div>

            {/* Report Type Selector - Dynamic based on role */}
            <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
              <h3 className="text-xl font-bold mb-4 text-blue-950">Select Report Type</h3>
              <div className={`grid gap-4 ${
                availableReports.length === 4 ? 'grid-cols-4' : 'grid-cols-2'
              }`}>
                {availableReports.map((report) => {
                  const Icon = report.icon;
                  return (
                    <button
                      key={report.key}
                      onClick={() => setActiveReport(report.key)}
                      className={`p-6 rounded-lg font-semibold text-base transition-all ${
                        activeReport === report.key 
                          ? 'bg-gradient-to-r from-blue-900 to-amber-500 text-white shadow-lg' 
                          : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
                      }`}
                    >
                      <Icon className="w-8 h-8 mx-auto mb-2" />
                      {report.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Date Range Filter */}
            <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
              <div className="grid grid-cols-3 gap-4 items-end">
                <div>
                  <label className="block text-base font-bold text-gray-700 mb-2">
                    <Calendar className="inline w-5 h-5 mr-2" />
                    Start Date
                  </label>
                  <input
                    type="date"
                    value={dateRange.startDate}
                    onChange={(e) => setDateRange({...dateRange, startDate: e.target.value})}
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-base"
                  />
                </div>
                <div>
                  <label className="block text-base font-bold text-gray-700 mb-2">
                    End Date
                  </label>
                  <input
                    type="date"
                    value={dateRange.endDate}
                    onChange={(e) => setDateRange({...dateRange, endDate: e.target.value})}
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-base"
                  />
                </div>
                <button
                  onClick={handleGenerateReport}
                  disabled={loading}
                  className="px-8 py-3 bg-gradient-to-r from-blue-900 to-amber-500 text-white rounded-lg font-bold text-lg hover:from-blue-950 hover:to-amber-600 transition-all disabled:opacity-50 shadow-md"
                >
                  {loading ? 'Generating...' : 'Generate Report'}
                </button>
              </div>
            </div>

            {/* Report Content - Only show reports user has access to */}
            {activeReport === 'daily' && renderDailyMealsReport()}
            {activeReport === 'period' && user?.role === 'Admin' && renderPeriodSummaryReport()}
            {activeReport === 'financial' && user?.role === 'Admin' && renderFinancialReport()}
            {activeReport === 'status' && renderOrderStatusReport()}

            {/* Export Action Bar - Only PDF */}
            {(dailyMealsData || periodSummaryData || financialData || orderStatusData) && (
              <div className="bg-white rounded-xl shadow-lg p-6 sticky bottom-6 mt-6">
                <div className="flex justify-end">
                  <button
                    onClick={handleExportPDF}
                    className="flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-blue-900 to-amber-500 text-white rounded-lg font-bold text-lg hover:from-blue-950 hover:to-amber-600 transition-all shadow-md"
                  >
                    <FileText className="w-6 h-6" />
                    Export to PDF
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
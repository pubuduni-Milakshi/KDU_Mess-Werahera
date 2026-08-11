import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Register from './pages/Register';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import VerifyEmail from './pages/VerifyEmail';
import MenuManagement from './pages/MenuManagement';
import ViewMenu from './pages/ViewMenu';
import DayScholarDashboard from './pages/DayScholarDashboard';
import OfficerCadetDashboard from './pages/OfficerCadetDashboard';
import AdminDashboard from './pages/AdminDashboard';
import MessStaffDashboard from './pages/MessStaffDashboard';
import OrdersManagement from './pages/OrdersManagement';
import Booking from './pages/Booking';
import UserManagement from './pages/UserManagement';
import Reports from './pages/Reports';
import Settings from './pages/Settings';
import CancellationPage from './pages/Cancellation';
import OrderHistory from './pages/OrderHistory';
import Feedback from './pages/Feedback';
import MonthlyBill from './pages/MonthlyBill';
import MenuHistory from './pages/MenuHistory';


import './App.css';

function App() {
  return (
    <Router>
      <div className="App">
        <Routes>
          <Route path="/" element={<Navigate to="/login" replace />} />
          
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/verify-email" element={<VerifyEmail />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password/:token" element={<ResetPassword />} />
          
          <Route path="/day-scholar-dashboard" element={<DayScholarDashboard />} />
          <Route path="/officer-cadet-dashboard" element={<OfficerCadetDashboard />} />
          <Route path="/admin-dashboard" element={<AdminDashboard />} />
          <Route path="/mess-staff-dashboard" element={<MessStaffDashboard />} />
          
          <Route path="/menu-management" element={<MenuManagement />} />
          <Route path="/view-menu" element={<ViewMenu />} />

          <Route path="/orders-management" element={<OrdersManagement />} />
          <Route path="/orders" element={<OrdersManagement />} />

          <Route path="/booking" element={<Booking />} />

          <Route path="/user-management" element={<UserManagement />} />

          <Route path="/reports" element={<Reports />} />

          <Route path="/settings" element={<Settings />} />

           <Route path="/cancel-booking" element={<CancellationPage />} />

           <Route path="/order-history" element={<OrderHistory />} />

           <Route path="/feedback" element={<Feedback />} />

           <Route path="/monthly-bill" element={<MonthlyBill />} />

           <Route path="/menu-history" element={<MenuHistory />} />

          
          
          {/* Future routes */}
          {/* <Route path="/view-quota" element={<ViewQuota />} /> */}
          {/* <Route path="/booking" element={<Booking />} /> */}
          
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
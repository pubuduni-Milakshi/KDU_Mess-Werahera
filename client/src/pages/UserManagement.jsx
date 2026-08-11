import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { 
  Search, 
  Filter, 
  Users, 
  UserCheck, 
  UserPlus, 
  Eye, 
  Trash2,
  ToggleLeft,
  ToggleRight,
  Calendar,
  UtensilsCrossed,
  ClipboardList,
  MessageSquare,
  Settings,
  LogOut,
  BookOpen,
  FileText
} from 'lucide-react';
import axios from '../api/axios';

export default function UserManagement() {
  const navigate = useNavigate();
  const location = useLocation();
  const [user, setUser] = useState(null);
  const [users, setUsers] = useState([]);
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [statistics, setStatistics] = useState({
    totalUsers: 0,
    activeUsers: 0,
    usersByRole: [],
    recentUsers: []
  });
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState({
    role: 'All',
    faculty: 'All',
    status: 'All',
    intake: 'All'
  });
  const [selectedUser, setSelectedUser] = useState(null);
  const [showViewModal, setShowViewModal] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      
      // Fetch users
      const usersRes = await axios.get('/users/all', {
        headers: { 'x-auth-token': token }
      });
      
      console.log('✅ Users fetched:', usersRes.data);
      setUsers(usersRes.data);
      setFilteredUsers(usersRes.data);
      
      // Calculate statistics from the users data
      const totalUsers = usersRes.data.length;
      const activeUsers = usersRes.data.filter(u => u.status === 'Active').length;
      
      // Count by role
      const roleCounts = {};
      usersRes.data.forEach(u => {
        roleCounts[u.role] = (roleCounts[u.role] || 0) + 1;
      });
      
      const usersByRole = Object.keys(roleCounts).map(role => ({
        _id: role,
        count: roleCounts[role]
      }));
      
      // Get recent users (last 5)
      const recentUsers = [...usersRes.data]
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
        .slice(0, 5);
      
      setStatistics({
        totalUsers,
        activeUsers,
        usersByRole,
        recentUsers
      });
      
    } catch (err) {
      console.error('❌ Error fetching data:', err);
      if (err.response?.status === 401) {
        alert('Session expired. Please login again.');
        localStorage.removeItem('user');
        localStorage.removeItem('token');
        navigate('/login');
      } else {
        alert('Failed to load user data. Please check your connection and try again.');
      }
    }
    setLoading(false);
  }, [navigate]);

  useEffect(() => {
    const userData = JSON.parse(localStorage.getItem('user'));
    if (!userData) {
      navigate('/login');
      return;
    }
    if (userData.role !== 'Admin') {
      alert('Access denied. Only Admin can manage users.');
      navigate('/admin-dashboard');
      return;
    }
    setUser(userData);
    fetchData();
  }, [navigate, fetchData]);

  const handleSearch = (value) => {
    setSearchTerm(value);
    applyFilters(value, filters);
  };

  const handleFilterChange = (key, value) => {
    const newFilters = { ...filters, [key]: value };
    setFilters(newFilters);
    applyFilters(searchTerm, newFilters);
  };

  const applyFilters = (search, currentFilters) => {
    let filtered = [...users];

    if (search) {
      filtered = filtered.filter(user => 
        user.firstName?.toLowerCase().includes(search.toLowerCase()) ||
        user.lastName?.toLowerCase().includes(search.toLowerCase()) ||
        user.roleId?.toLowerCase().includes(search.toLowerCase()) ||
        user.email?.toLowerCase().includes(search.toLowerCase())
      );
    }

    if (currentFilters.role !== 'All') {
      filtered = filtered.filter(user => user.role === currentFilters.role);
    }

    if (currentFilters.faculty !== 'All') {
      filtered = filtered.filter(user => user.faculty === currentFilters.faculty);
    }

    if (currentFilters.status !== 'All') {
      filtered = filtered.filter(user => user.status === currentFilters.status);
    }

    if (currentFilters.intake !== 'All') {
      filtered = filtered.filter(user => user.intake === currentFilters.intake);
    }

    setFilteredUsers(filtered);
  };

  const handleToggleStatus = async (userId, currentStatus) => {
    if (!window.confirm(`Are you sure you want to ${currentStatus === 'Active' ? 'deactivate' : 'activate'} this user?`)) {
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const newStatus = currentStatus === 'Active' ? 'Inactive' : 'Active';
      await axios.put(`/users/${userId}/status`, 
        { status: newStatus },
        { headers: { 'x-auth-token': token } }
      );
      alert('User status updated successfully');
      fetchData();
    } catch (err) {
      console.error('Error updating status:', err);
      alert('Failed to update user status');
    }
  };

  const handleDeleteUser = async (userId, userRole) => {
    if (userRole === 'Student') {
      alert('Students cannot be deleted from the system.');
      return;
    }

    if (!window.confirm('Are you sure you want to delete this user? This action cannot be undone.')) {
      return;
    }

    try {
      const token = localStorage.getItem('token');
      await axios.delete(`/users/${userId}`, {
        headers: { 'x-auth-token': token }
      });
      alert('User deleted successfully');
      fetchData();
    } catch (err) {
      console.error('Error deleting user:', err);
      alert('Failed to delete user');
    }
  };

  const handleViewUser = (viewUser) => {
    setSelectedUser(viewUser);
    setShowViewModal(true);
  };

  const handleLogout = () => {
    localStorage.removeItem('user');
    localStorage.removeItem('token');
    navigate('/login');
  };

  const getRoleCount = (role) => {
    const roleData = statistics.usersByRole.find(r => r._id === role);
    return roleData ? roleData.count : 0;
  };

  const uniqueFaculties = [...new Set(users.map(u => u.faculty).filter(Boolean))];
  const uniqueIntakes = [...new Set(users.map(u => u.intake).filter(Boolean))].sort((a, b) => {
    // Sort intakes numerically if they're numbers, otherwise alphabetically
    const numA = parseInt(a);
    const numB = parseInt(b);
    if (!isNaN(numA) && !isNaN(numB)) {
      return numA - numB;
    }
    return a.localeCompare(b);
  });

  // Navigation items
  const navigationItems = [
    { icon: Calendar, label: 'Dashboard', path: '/admin-dashboard' },
    { icon: BookOpen, label: 'View Menu', path: '/view-menu' },
    { icon: UtensilsCrossed, label: 'Menu Management', path: '/menu-management' },
    { icon: ClipboardList, label: 'Orders Management', path: '/orders-management' },
    { icon: Users, label: 'User Management', path: '/user-management' },
    { icon: FileText, label: 'Reports', path: '/reports' },
    { icon: MessageSquare, label: 'Feedback', path: '/feedback' },
    { icon: Settings, label: 'Settings', path: '/settings' }
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-950 via-blue-900 to-blue-800 flex items-center justify-center">
        <div className="text-white text-2xl font-semibold">Loading User Management...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-950 via-blue-900 to-blue-800">
      <div className="flex">
        {/* Sidebar */}
        <div className="w-64 bg-white shadow-xl fixed left-0 top-0 h-screen flex flex-col z-50">
          <div className="p-6 border-b border-gray-200">
            <h1 className="text-3xl font-bold text-blue-950">KDU Mess</h1>
            <p className="text-base text-gray-600 mt-1">{user?.role} Portal</p>
          </div>

          <nav className="px-4 py-4 space-y-2 flex-1 overflow-y-auto">
            {navigationItems.map((item, index) => {
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
              <h1 className="text-4xl font-bold text-blue-950">User Management</h1>
              <p className="text-gray-600 mt-2 text-lg">Manage all system users and their access</p>
            </div>

            {/* Statistics Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
              <div className="bg-white rounded-xl shadow-lg p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Total Users</p>
                    <p className="text-3xl font-bold mt-2 text-blue-900">
                      {statistics.totalUsers}
                    </p>
                  </div>
                  <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                    <Users className="w-6 h-6 text-blue-900" />
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-lg p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Active Users</p>
                    <p className="text-3xl font-bold mt-2 text-green-600">
                      {statistics.activeUsers}
                    </p>
                  </div>
                  <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                    <UserCheck className="w-6 h-6 text-green-600" />
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-lg p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Officer Cadets</p>
                    <p className="text-3xl font-bold mt-2 text-indigo-600">
                      {getRoleCount('Officer Cadet')}
                    </p>
                  </div>
                  <div className="w-12 h-12 bg-indigo-100 rounded-full flex items-center justify-center">
                    <Users className="w-6 h-6 text-indigo-600" />
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-lg p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Day Scholars</p>
                    <p className="text-3xl font-bold mt-2 text-amber-500">
                      {getRoleCount('Day Scholar')}
                    </p>
                  </div>
                  <div className="w-12 h-12 bg-amber-100 rounded-full flex items-center justify-center">
                    <UserPlus className="w-6 h-6 text-amber-500" />
                  </div>
                </div>
              </div>
            </div>

            {/* Filters */}
            <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
              <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                <div className="md:col-span-1">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <Search className="inline w-4 h-4 mr-2" />
                    Search
                  </label>
                  <input
                    type="text"
                    placeholder="Search by name, ID, or email..."
                    value={searchTerm}
                    onChange={(e) => handleSearch(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <Filter className="inline w-4 h-4 mr-2" />
                    Role
                  </label>
                  <select
                    value={filters.role}
                    onChange={(e) => handleFilterChange('role', e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="All">All Roles</option>
                    <option value="Student">Student</option>
                    <option value="Day Scholar">Day Scholar</option>
                    <option value="Officer Cadet">Officer Cadet</option>
                    <option value="Mess Staff">Mess Staff</option>
                    <option value="Admin">Admin</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Faculty</label>
                  <select
                    value={filters.faculty}
                    onChange={(e) => handleFilterChange('faculty', e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="All">All Faculties</option>
                    {uniqueFaculties.map(faculty => (
                      <option key={faculty} value={faculty}>{faculty}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
                  <select
                    value={filters.status}
                    onChange={(e) => handleFilterChange('status', e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="All">All Status</option>
                    <option value="Active">Active</option>
                    <option value="Inactive">Inactive</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Intake</label>
                  <select
                    value={filters.intake}
                    onChange={(e) => handleFilterChange('intake', e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="All">All Intakes</option>
                    {uniqueIntakes.map(intake => (
                      <option key={intake} value={intake}>Intake {intake}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Users Table */}
            <div className="bg-white rounded-xl shadow-lg overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gradient-to-r from-indigo-600 via-blue-600 to-cyan-600 text-white">
                    <tr>
                      <th className="text-left py-4 px-6 font-bold text-base">USER ID</th>
                      <th className="text-left py-4 px-6 font-bold text-base">NAME</th>
                      <th className="text-left py-4 px-6 font-bold text-base">ROLE</th>
                      <th className="text-left py-4 px-6 font-bold text-base">FACULTY</th>
                      <th className="text-left py-4 px-6 font-bold text-base">INTAKE</th>
                      <th className="text-left py-4 px-6 font-bold text-base">EMAIL</th>
                      <th className="text-center py-4 px-6 font-bold text-base">STATUS</th>
                      <th className="text-center py-4 px-6 font-bold text-base">ACTIONS</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredUsers.length === 0 ? (
                      <tr>
                        <td colSpan="8" className="text-center py-12 text-gray-500">
                          <Users className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                          <p className="text-lg font-semibold">No users found</p>
                        </td>
                      </tr>
                    ) : (
                      filteredUsers.map((usr) => (
                        <tr key={usr._id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                          <td className="py-4 px-6 text-base font-bold text-gray-800">
                            {usr.roleId}
                          </td>
                          <td className="py-4 px-6 text-base text-gray-800">
                            {usr.firstName} {usr.lastName}
                          </td>
                          <td className="py-4 px-6 text-base text-gray-800">{usr.role}</td>
                          <td className="py-4 px-6 text-base text-gray-600">{usr.faculty || 'N/A'}</td>
                          <td className="py-4 px-6 text-base text-gray-600">{usr.intake || 'N/A'}</td>
                          <td className="py-4 px-6 text-base text-gray-600">{usr.email}</td>
                          <td className="py-4 px-6 text-center">
                            <span className={`inline-block px-3 py-1 rounded-full text-xs font-bold ${
                              usr.status === 'Active' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                            }`}>
                              {usr.status}
                            </span>
                          </td>
                          <td className="py-4 px-6">
                            <div className="flex items-center justify-center gap-2">
                              <button
                                onClick={() => handleViewUser(usr)}
                                className="p-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors"
                                title="View Details"
                              >
                                <Eye className="w-5 h-5" />
                              </button>
                              <button
                                onClick={() => handleToggleStatus(usr._id, usr.status)}
                                className={`p-2 rounded-lg transition-colors ${
                                  usr.status === 'Active' 
                                    ? 'bg-red-100 text-red-700 hover:bg-red-200' 
                                    : 'bg-green-100 text-green-700 hover:bg-green-200'
                                }`}
                                title={usr.status === 'Active' ? 'Deactivate' : 'Activate'}
                              >
                                {usr.status === 'Active' ? <ToggleRight className="w-5 h-5" /> : <ToggleLeft className="w-5 h-5" />}
                              </button>
                              {usr.role !== 'Student' && usr.role !== 'Admin' && (
                                <button
                                  onClick={() => handleDeleteUser(usr._id, usr.role)}
                                  className="p-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors"
                                  title="Delete User"
                                >
                                  <Trash2 className="w-5 h-5" />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* View User Modal */}
      {showViewModal && selectedUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-2xl font-bold text-blue-950">User Details</h2>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <p className="text-sm font-medium text-gray-600">Full Name</p>
                  <p className="text-lg font-semibold mt-1 text-gray-800">
                    {selectedUser.firstName} {selectedUser.lastName}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600">User ID</p>
                  <p className="text-lg font-semibold mt-1 text-gray-800">
                    {selectedUser.roleId}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600">Role</p>
                  <p className="text-lg font-semibold mt-1 text-gray-800">
                    {selectedUser.role}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600">Email</p>
                  <p className="text-lg font-semibold mt-1 text-gray-800">
                    {selectedUser.email}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600">Faculty</p>
                  <p className="text-lg font-semibold mt-1 text-gray-800">
                    {selectedUser.faculty || 'N/A'}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600">Intake</p>
                  <p className="text-lg font-semibold mt-1 text-gray-800">
                    {selectedUser.intake || 'N/A'}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600">Room Number</p>
                  <p className="text-lg font-semibold mt-1 text-gray-800">
                    {selectedUser.roomNo || 'N/A'}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600">Status</p>
                  <p className={`text-lg font-semibold mt-1 ${
                    selectedUser.status === 'Active' ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {selectedUser.status}
                  </p>
                </div>
                <div className="col-span-2">
                  <p className="text-sm font-medium text-gray-600">Registered Date</p>
                  <p className="text-lg font-semibold mt-1 text-gray-800">
                    {selectedUser.createdAt ? new Date(selectedUser.createdAt).toLocaleDateString('en-GB', {
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric'
                    }) : 'N/A'}
                  </p>
                </div>
              </div>
            </div>
            <div className="p-6 border-t border-gray-200">
              <button
                onClick={() => setShowViewModal(false)}
                className="w-full py-3 bg-gradient-to-r from-blue-900 to-amber-500 text-white rounded-lg font-bold text-lg hover:from-blue-950 hover:to-amber-600 transition-all"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
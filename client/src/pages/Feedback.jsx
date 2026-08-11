import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { 
  Star, 
  Send,
  MessageSquare,
  UtensilsCrossed,
  BookOpen,
  History,
  Settings,
  FileText,
  LogOut,
  Clock,
  Users as UsersIcon,
  ClipboardList,
  LayoutDashboard
} from 'lucide-react';
import axios from '../api/axios';

export default function Feedback() {
  const navigate = useNavigate();
  const location = useLocation();
  const [user, setUser] = useState(null);
  const [feedbackForm, setFeedbackForm] = useState({
    item: 'Breakfast',
    rating: 0,
    comments: ''
  });
  const [feedbackHistory, setFeedbackHistory] = useState([]);
  const [allFeedback, setAllFeedback] = useState([]);
  const [replyText, setReplyText] = useState({});
  const [loading, setLoading] = useState(false);
  const [notification, setNotification] = useState({ show: false, type: '', message: '' });

  const mealItems = ['Breakfast', 'Lunch', 'Dinner', 'Morning Tea', 'Evening Tea', 'Mid-Morning Tea', 'Night Tea'];

  useEffect(() => {
    const userData = JSON.parse(localStorage.getItem('user'));
    if (!userData) {
      alert('Please login first');
      navigate('/login');
      return;
    }
    
    // Redirect Officer Cadets away from feedback page
    if (userData.role === 'Officer Cadet') {
      alert('Feedback is not available for Officer Cadets');
      navigate('/officer-cadet-dashboard');
      return;
    }
    
    setUser(userData);
    
    if (userData.role === 'Day Scholar') {
      fetchFeedbackHistory();
    } else if (userData.role === 'Admin' || userData.role === 'Mess Staff') {
      fetchAllFeedback();
    }
  }, [navigate]);

  const fetchFeedbackHistory = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get('/feedback/my-feedback', {
        headers: { 'x-auth-token': token }
      });
      setFeedbackHistory(response.data || []);
    } catch (err) {
      console.error('Error fetching feedback history:', err);
    }
  };

  const fetchAllFeedback = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get('/feedback/all', {
        headers: { 'x-auth-token': token }
      });
      console.log('🔍 Raw API Response:', response.data);
      console.log('🔍 First feedback item:', response.data[0]);
      setAllFeedback(response.data || []);
    } catch (err) {
      console.error('Error fetching all feedback:', err);
    }
  };

  const showNotification = (type, message) => {
    setNotification({ show: true, type, message });
    setTimeout(() => setNotification({ show: false, type: '', message: '' }), 3000);
  };

  const handleRatingClick = (rating) => {
    setFeedbackForm({ ...feedbackForm, rating });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (feedbackForm.rating === 0) {
      showNotification('error', 'Please select a rating');
      return;
    }

    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      await axios.post('/feedback', feedbackForm, {
        headers: { 'x-auth-token': token }
      });
      showNotification('success', 'Feedback submitted successfully!');
      setFeedbackForm({ item: 'Breakfast', rating: 0, comments: '' });
      fetchFeedbackHistory();
    } catch (err) {
      showNotification('error', err.response?.data?.msg || 'Failed to submit feedback');
    }
    setLoading(false);
  };

  const handleReply = async (feedbackId) => {
    if (!replyText[feedbackId] || replyText[feedbackId].trim() === '') {
      showNotification('error', 'Please enter a reply');
      return;
    }

    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      await axios.post(`/feedback/${feedbackId}/reply`, 
        { reply: replyText[feedbackId] },
        { headers: { 'x-auth-token': token } }
      );
      showNotification('success', 'Reply sent successfully!');
      setReplyText({ ...replyText, [feedbackId]: '' });
      fetchAllFeedback();
    } catch (err) {
      showNotification('error', err.response?.data?.msg || 'Failed to send reply');
    }
    setLoading(false);
  };

  const handleLogout = () => {
    localStorage.removeItem('user');
    localStorage.removeItem('token');
    navigate('/login');
  };

  const renderStars = (rating, interactive = false) => {
    return [1, 2, 3, 4, 5].map((star) => (
      <Star
        key={star}
        className={`w-8 h-8 ${interactive ? 'cursor-pointer' : ''} transition-colors`}
        fill={star <= rating ? '#F59E0B' : 'none'}
        stroke={star <= rating ? '#F59E0B' : '#D1D5DB'}
        onClick={interactive ? () => handleRatingClick(star) : undefined}
      />
    ));
  };

  // Sidebar navigation based on role
  const getNavigationItems = () => {
    if (user?.role === 'Admin') {
      return [
        { icon: LayoutDashboard, label: 'Dashboard', path: '/admin-dashboard' },
        { icon: BookOpen, label: 'View Menu', path: '/view-menu' },
        { icon: UtensilsCrossed, label: 'Menu Management', path: '/menu-management' },
        { icon: ClipboardList, label: 'Orders Management', path: '/orders-management' },
        { icon: UsersIcon, label: 'User Management', path: '/user-management' },
        { icon: FileText, label: 'Reports', path: '/reports' },
        { icon: MessageSquare, label: 'Feedback', path: '/feedback' },
        { icon: Settings, label: 'Settings', path: '/settings' }
      ];
    } else if (user?.role === 'Mess Staff') {
      return [
        { icon: LayoutDashboard, label: 'Dashboard', path: '/mess-staff-dashboard' },
        { icon: BookOpen, label: 'View Menu', path: '/view-menu' },
        { icon: ClipboardList, label: 'Order Management', path: '/orders-management' },
        { icon: FileText, label: 'Reports', path: '/reports' },
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
    }
    return [];
  };

  const canSubmitFeedback = user?.role === 'Day Scholar';
 
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
            {/* Notification */}
            {notification.show && (
              <div className={`fixed top-6 right-6 z-50 px-8 py-4 rounded-lg shadow-lg text-white font-bold text-base ${
                notification.type === 'success' ? 'bg-green-500' : 'bg-red-500'
              }`}>
                {notification.message}
              </div>
            )}

            {/* Header */}
            <div className="bg-white rounded-xl shadow-lg p-8 mb-6">
              <h1 className="text-4xl font-bold text-blue-950">Feedback</h1>
              <p className="text-gray-600 mt-2 text-lg">
                {canSubmitFeedback 
                  ? 'Share your thoughts and help us improve' 
                  : 'View and respond to user feedback'}
              </p>
            </div>

            {/* Content based on role */}
            {canSubmitFeedback ? (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Submit New Feedback */}
                <div className="bg-white rounded-xl shadow-lg p-8">
                  <h2 className="text-2xl font-bold text-blue-950 mb-6">Submit New Feedback</h2>
                  
                  <form onSubmit={handleSubmit} className="space-y-6">
                    <div>
                      <label className="block text-base font-bold text-gray-700 mb-2">Select Item</label>
                      <select
                        value={feedbackForm.item}
                        onChange={(e) => setFeedbackForm({ ...feedbackForm, item: e.target.value })}
                        className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-base font-medium"
                      >
                        {mealItems.map((item) => (
                          <option key={item} value={item}>{item}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-base font-bold text-gray-700 mb-3">Rating</label>
                      <div className="flex gap-2">
                        {renderStars(feedbackForm.rating, true)}
                      </div>
                      <p className="text-sm text-gray-500 mt-2">
                        {feedbackForm.rating === 0 ? 'Click to rate' : `${feedbackForm.rating} out of 5 stars`}
                      </p>
                    </div>

                    <div>
                      <label className="block text-base font-bold text-gray-700 mb-2">Comments</label>
                      <textarea
                        value={feedbackForm.comments}
                        onChange={(e) => setFeedbackForm({ ...feedbackForm, comments: e.target.value })}
                        placeholder="Share your thoughts..."
                        rows="6"
                        className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none text-base"
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full bg-gradient-to-r from-blue-900 to-amber-500 text-white py-4 rounded-lg font-bold text-lg hover:from-blue-950 hover:to-amber-600 transition-all disabled:opacity-50 shadow-md"
                    >
                      {loading ? 'Submitting...' : 'Submit Feedback'}
                    </button>
                  </form>
                </div>

                {/* Feedback History */}
                <div className="bg-white rounded-xl shadow-lg p-8">
                  <h2 className="text-2xl font-bold text-blue-950 mb-6">My Feedback History</h2>
                  
                  {feedbackHistory.length === 0 ? (
                    <div className="text-center py-16 text-gray-500">
                      <MessageSquare className="w-20 h-20 mx-auto mb-4 text-gray-300" />
                      <p className="text-xl font-bold mb-2">No feedback submitted yet</p>
                      <p className="text-base">Your feedback history will appear here</p>
                    </div>
                  ) : (
                    <div className="space-y-4 max-h-[600px] overflow-y-auto pr-2">
                      {feedbackHistory.map((feedback) => (
                        <div key={feedback._id} className="border-2 border-gray-200 rounded-xl p-5 hover:shadow-lg transition-shadow bg-white">
                          <div className="flex justify-between items-start mb-3">
                            <div>
                              <p className="font-bold text-xl text-gray-800">{feedback.item}</p>
                              <p className="text-sm text-gray-500 mt-1">
                                {new Date(feedback.createdAt).toLocaleDateString('en-GB', {
                                  day: 'numeric',
                                  month: 'short',
                                  year: 'numeric',
                                  hour: '2-digit',
                                  minute: '2-digit'
                                })}
                              </p>
                            </div>
                            <div className="flex gap-1">
                              {renderStars(feedback.rating, false)}
                            </div>
                          </div>
                          {feedback.comments && (
                            <p className="text-gray-700 text-base mt-3 bg-gray-50 p-3 rounded-lg">{feedback.comments}</p>
                          )}
                          {feedback.reply && (
                            <div className="mt-4 p-4 bg-blue-50 rounded-lg border-l-4 border-blue-500">
                              <p className="text-xs font-bold text-blue-900 mb-2">Staff Reply:</p>
                              <p className="text-base text-gray-700">{feedback.reply}</p>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ) : (
              /* View All Feedback (Admin & Mess Staff) */
              <div className="bg-white rounded-xl shadow-lg p-8">
                <h2 className="text-3xl font-bold text-blue-950 mb-6">All User Feedback</h2>
                
                {allFeedback.length === 0 ? (
                  <div className="text-center py-16 text-gray-500">
                    <MessageSquare className="w-20 h-20 mx-auto mb-4 text-gray-300" />
                    <p className="text-xl font-bold mb-2">No feedback received yet</p>
                    <p className="text-base">User feedback will appear here</p>
                  </div>
                ) : (
                  <div className="space-y-6 max-h-[700px] overflow-y-auto pr-2">
                    {allFeedback.map((feedback) => (
                      <div key={feedback._id} className="border-2 border-gray-200 rounded-xl p-6 hover:shadow-lg transition-shadow bg-white">
                        <div className="flex justify-between items-start mb-4">
                          <div>
                            <p className="font-bold text-xl text-gray-800">{feedback.item}</p>
                            <p className="text-base text-gray-600 font-medium mt-1">
                              By: {feedback.user?.firstName || 'Unknown'} {feedback.user?.lastName || ''} 
                              {feedback.user?.role && ` (${feedback.user.role})`}
                            </p>
                            <p className="text-sm text-gray-500 mt-1">
                              {new Date(feedback.createdAt).toLocaleDateString('en-GB', {
                                day: 'numeric',
                                month: 'short',
                                year: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </p>
                          </div>
                          <div className="flex gap-1">
                            {renderStars(feedback.rating, false)}
                          </div>
                        </div>
                        
                        {feedback.comments && (
                          <p className="text-gray-700 text-base mt-3 mb-4 bg-gray-50 p-4 rounded-lg">{feedback.comments}</p>
                        )}

                        {feedback.reply ? (
                          <div className="mt-4 p-4 bg-green-50 rounded-lg border-l-4 border-green-500">
                            <p className="text-xs font-bold text-green-900 mb-2">
                              {feedback.repliedByRole === 'Admin' 
                                ? 'Admin Reply:' 
                                : feedback.repliedByRole === 'Mess Staff'
                                ? 'Mess Staff Reply:'
                                : 'Your Reply:'}
                            </p>
                            <p className="text-base text-gray-700">{feedback.reply}</p>
                          </div>
                        ) : (
                          <div className="mt-4">
                            <div className="flex gap-3">
                              <input
                                type="text"
                                placeholder="Type your reply..."
                                value={replyText[feedback._id] || ''}
                                onChange={(e) => setReplyText({ ...replyText, [feedback._id]: e.target.value })}
                                className="flex-1 px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-base"
                              />
                              <button
                                onClick={() => handleReply(feedback._id)}
                                disabled={loading}
                                className="px-6 py-3 bg-gradient-to-r from-blue-900 to-amber-500 text-white rounded-lg font-bold hover:from-blue-950 hover:to-amber-600 transition-all disabled:opacity-50 flex items-center gap-2 shadow-md"
                              >
                                <Send className="w-5 h-5" />
                                Reply
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
import React, { useState } from 'react';
import {
  Bell,
  Check,
  X,
  Search,
  Settings,
  Trash2,
  Archive,
  Mail,
  AlertTriangle,
  Info,
  Clock,
  Star
} from 'lucide-react';
import ApiService from '../../api';

interface Notification {
  id: string;
  type: 'info' | 'warning' | 'error' | 'success';
  title: string;
  message: string;
  timestamp: Date;
  read: boolean;
  priority: 'low' | 'medium' | 'high';
  category: 'system' | 'document' | 'approval' | 'security' | 'general';
  actionUrl?: string;
  metadata?: Record<string, any>;
}

const NotificationsPage: React.FC = () => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [filteredNotifications, setFilteredNotifications] = useState<Notification[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedPriority, setSelectedPriority] = useState<string>('all');
  const [showUnreadOnly, setShowUnreadOnly] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [_loading, setLoading] = useState(false);
  const [_error, setError] = useState<string | null>(null);

  // Load notifications from API
  const loadNotifications = async () => {
    try {
      // Call the actual API endpoint
      const apiNotifications = await ApiService.getNotifications();
      setNotifications(apiNotifications);
      setFilteredNotifications(apiNotifications);
    } catch (err) {
      console.error('Error loading notifications:', err);
      setNotifications([]);
      setFilteredNotifications([]);
    }
  };

  // Load data on component mount
  React.useEffect(() => {
    loadNotifications();
  }, []);

  // Filter notifications
  React.useEffect(() => {
    let filtered = notifications;

    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(notification =>
        notification.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        notification.message.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Filter by category
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(notification => notification.category === selectedCategory);
    }

    // Filter by priority
    if (selectedPriority !== 'all') {
      filtered = filtered.filter(notification => notification.priority === selectedPriority);
    }

    // Filter by read status
    if (showUnreadOnly) {
      filtered = filtered.filter(notification => !notification.read);
    }

    setFilteredNotifications(filtered);
  }, [notifications, searchTerm, selectedCategory, selectedPriority, showUnreadOnly]);

  const markAsRead = async (id: string) => {
    try {
      setLoading(true);
      
      // Call the API to mark as read
      await ApiService.markNotificationAsRead(id);
      
      setNotifications(prev =>
        prev.map(notification =>
          notification.id === id
            ? { ...notification, read: true }
            : notification
        )
      );
      
      // Show success notification
      window.dispatchEvent(new CustomEvent('app:notification', {
        detail: {
          type: 'success',
          message: 'Notification marked as read'
        }
      }));
    } catch (err) {
      console.error('Error marking notification as read:', err);
      setError('Failed to mark notification as read. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const markAllAsRead = async () => {
    try {
      setLoading(true);
      
      // Call the API to mark all as read
      await ApiService.markAllNotificationsAsRead();
      
      setNotifications(prev =>
        prev.map(notification => ({ ...notification, read: true }))
      );
      
      // Show success notification
      window.dispatchEvent(new CustomEvent('app:notification', {
        detail: {
          type: 'success',
          message: 'All notifications marked as read'
        }
      }));
    } catch (err) {
      console.error('Error marking all notifications as read:', err);
      setError('Failed to mark all notifications as read. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const deleteNotification = (id: string) => {
    setNotifications(prev => prev.filter(notification => notification.id !== id));
  };

  const archiveNotification = (id: string) => {
    // In a real app, this would move to archived notifications
    deleteNotification(id);
  };

  const getNotificationIcon = (type: Notification['type']) => {
    switch (type) {
      case 'info':
        return <Info className="w-5 h-5 text-blue-500" />;
      case 'warning':
        return <AlertTriangle className="w-5 h-5 text-warning-500" />;
      case 'error':
        return <X className="w-5 h-5 text-danger-500" />;
      case 'success':
        return <Check className="w-5 h-5 text-success-500" />;
      default:
        return <Bell className="w-5 h-5 text-secondary-500" />;
    }
  };

  const getPriorityColor = (priority: Notification['priority']) => {
    switch (priority) {
      case 'high':
        return 'border-l-red-500';
      case 'medium':
        return 'border-l-yellow-500';
      case 'low':
        return 'border-l-blue-500';
      default:
        return 'border-l-gray-500';
    }
  };

  const getCategoryColor = (category: Notification['category']) => {
    switch (category) {
      case 'document':
        return 'bg-blue-100 text-blue-800';
      case 'approval':
        return 'bg-green-100 text-success-800';
      case 'security':
        return 'bg-red-100 text-danger-800';
      case 'system':
        return 'bg-secondary-100 text-secondary-800';
      default:
        return 'bg-purple-100 text-purple-800';
    }
  };

  const formatTimestamp = (timestamp: Date) => {
    const now = new Date();
    const diff = now.getTime() - timestamp.getTime();
    const minutes = Math.floor(diff / (1000 * 60));
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return timestamp.toLocaleDateString();
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <div className="min-h-screen bg-secondary-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-secondary-900">Notifications</h1>
              <p className="mt-2 text-secondary-600">
                Stay updated with important alerts and updates from your STS operations.
              </p>
            </div>

            <div className="flex items-center space-x-3">
              <button
                onClick={() => setShowSettings(!showSettings)}
                className="p-2 text-secondary-400 hover:text-secondary-600 transition-colors duration-200"
                title="Notification Settings"
              >
                <Settings className="h-5 w-5" />
              </button>

              <button
                onClick={markAllAsRead}
                disabled={unreadCount === 0}
                className="btn-primary disabled:opacity-50"
              >
                Mark All Read
              </button>
            </div>
          </div>

          {/* Stats */}
          <div className="mt-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 gap-6">
            <div className="card">
              <div className="flex items-center">
                <Bell className="w-8 h-8 text-primary-500" />
                <div className="ml-3">
                  <p className="text-sm font-medium text-secondary-500">Total</p>
                  <p className="text-2xl font-bold text-secondary-900">{notifications.length}</p>
                </div>
              </div>
            </div>

            <div className="card">
              <div className="flex items-center">
                <Mail className="w-8 h-8 text-warning-500" />
                <div className="ml-3">
                  <p className="text-sm font-medium text-secondary-500">Unread</p>
                  <p className="text-2xl font-bold text-secondary-900">{unreadCount}</p>
                </div>
              </div>
            </div>

            <div className="card">
              <div className="flex items-center">
                <AlertTriangle className="w-8 h-8 text-danger-500" />
                <div className="ml-3">
                  <p className="text-sm font-medium text-secondary-500">High Priority</p>
                  <p className="text-2xl font-bold text-secondary-900">
                    {notifications.filter(n => n.priority === 'high').length}
                  </p>
                </div>
              </div>
            </div>

            <div className="card">
              <div className="flex items-center">
                <Clock className="w-8 h-8 text-success-500" />
                <div className="ml-3">
                  <p className="text-sm font-medium text-secondary-500">Today</p>
                  <p className="text-2xl font-bold text-secondary-900">
                    {notifications.filter(n => {
                      const today = new Date();
                      const notificationDate = new Date(n.timestamp);
                      return notificationDate.toDateString() === today.toDateString();
                    }).length}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Filters and Search */}
        <div className="card">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
            {/* Search */}
            <div className="md:col-span-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-secondary-400 w-4 h-4" />
                <input
                  type="text"
                  placeholder="Search notifications..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-secondary-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>

            {/* Category Filter */}
            <div>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="w-full px-3 py-2 border border-secondary-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="all">All Categories</option>
                <option value="system">System</option>
                <option value="document">Document</option>
                <option value="approval">Approval</option>
                <option value="security">Security</option>
                <option value="general">General</option>
              </select>
            </div>

            {/* Priority Filter */}
            <div>
              <select
                value={selectedPriority}
                onChange={(e) => setSelectedPriority(e.target.value)}
                className="w-full px-3 py-2 border border-secondary-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="all">All Priorities</option>
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
            </div>

            {/* Unread Only Toggle */}
            <div className="flex items-center">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={showUnreadOnly}
                  onChange={(e) => setShowUnreadOnly(e.target.checked)}
                  className="rounded border-secondary-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="ml-2 text-sm text-secondary-700">Unread only</span>
              </label>
            </div>
          </div>
        </div>

        {/* Notifications List */}
        <div className="card">
          {filteredNotifications.length === 0 ? (
            <div className="p-12 text-center">
              <Bell className="w-12 h-12 text-secondary-400 mx-auto mb-6" />
              <h3 className="text-lg font-medium text-secondary-900 mb-2">No notifications found</h3>
              <p className="text-secondary-500">
                {searchTerm || selectedCategory !== 'all' || selectedPriority !== 'all' || showUnreadOnly
                  ? 'Try adjusting your filters or search terms.'
                  : 'You\'re all caught up! Check back later for new updates.'}
              </p>
            </div>
          ) : (
            <div className="divide-y divide-secondary-200">
              {filteredNotifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`p-6 hover:bg-secondary-50 transition-colors duration-200 ${
                    !notification.read ? 'bg-blue-50' : ''
                  }`}
                >
                  <div className={`border-l-4 pl-4 ${getPriorityColor(notification.priority)}`}>
                    <div className="flex items-start justify-between">
                      <div className="flex items-start space-x-3 flex-1">
                        <div className="flex-shrink-0 mt-1">
                          {getNotificationIcon(notification.type)}
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center space-x-2 mb-2">
                            <h3 className={`text-sm font-medium ${!notification.read ? 'text-secondary-900' : 'text-secondary-700'}`}>
                              {notification.title}
                            </h3>

                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getCategoryColor(notification.category)}`}>
                              {notification.category}
                            </span>

                            {notification.priority === 'high' && (
                              <Star className="w-4 h-4 text-danger-500" />
                            )}
                          </div>

                          <p className="text-sm text-secondary-600 mb-2">
                            {notification.message}
                          </p>

                          <div className="flex items-center space-x-4 text-xs text-secondary-500">
                            <span className="flex items-center">
                              <Clock className="w-3 h-3 mr-1" />
                              {formatTimestamp(notification.timestamp)}
                            </span>

                            {notification.actionUrl && (
                              <button className="text-blue-600 hover:text-blue-800 font-medium">
                                View Details
                              </button>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center space-x-2">
                        {!notification.read && (
                          <button
                            onClick={() => markAsRead(notification.id)}
                            className="p-1 text-secondary-400 hover:text-secondary-600 transition-colors duration-200"
                            title="Mark as read"
                          >
                            <Check className="h-4 w-4" />
                          </button>
                        )}

                        <button
                          onClick={() => archiveNotification(notification.id)}
                          className="p-1 text-secondary-400 hover:text-secondary-600 transition-colors duration-200"
                          title="Archive"
                        >
                          <Archive className="h-4 w-4" />
                        </button>

                        <button
                          onClick={() => deleteNotification(notification.id)}
                          className="p-1 text-secondary-400 hover:text-danger-600 transition-colors duration-200"
                          title="Delete"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Notification Settings Modal */}
        {showSettings && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60] p-6">
            <div className="bg-white rounded-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-xl font-semibold text-secondary-900">
                    Notification Settings
                  </h3>
                  <button
                    onClick={() => setShowSettings(false)}
                    className="text-secondary-400 hover:text-secondary-600 transition-colors duration-200"
                  >
                    <X className="w-6 h-6" />
                  </button>
                </div>

                <div className="space-y-8">
                  <div>
                    <h4 className="text-lg font-medium text-secondary-900 mb-6">Email Notifications</h4>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <label className="text-sm font-medium text-secondary-700">Document Updates</label>
                          <p className="text-xs text-secondary-500">Get notified when documents are uploaded or updated</p>
                        </div>
                        <button className="relative inline-flex h-6 w-11 items-center rounded-full bg-blue-600">
                          <span className="inline-block h-4 w-4 transform rounded-full bg-white translate-x-6" />
                        </button>
                      </div>

                      <div className="flex items-center justify-between">
                        <div>
                          <label className="text-sm font-medium text-secondary-700">Approval Requests</label>
                          <p className="text-xs text-secondary-500">Get notified when approval is required</p>
                        </div>
                        <button className="relative inline-flex h-6 w-11 items-center rounded-full bg-blue-600">
                          <span className="inline-block h-4 w-4 transform rounded-full bg-white translate-x-6" />
                        </button>
                      </div>

                      <div className="flex items-center justify-between">
                        <div>
                          <label className="text-sm font-medium text-secondary-700">Security Alerts</label>
                          <p className="text-xs text-secondary-500">Get notified of security-related events</p>
                        </div>
                        <button className="relative inline-flex h-6 w-11 items-center rounded-full bg-blue-600">
                          <span className="inline-block h-4 w-4 transform rounded-full bg-white translate-x-6" />
                        </button>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h4 className="text-lg font-medium text-secondary-900 mb-6">Push Notifications</h4>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <label className="text-sm font-medium text-secondary-700">Browser Notifications</label>
                          <p className="text-xs text-secondary-500">Receive notifications in your browser</p>
                        </div>
                        <button className="relative inline-flex h-6 w-11 items-center rounded-full bg-blue-600">
                          <span className="inline-block h-4 w-4 transform rounded-full bg-white translate-x-6" />
                        </button>
                      </div>

                      <div className="flex items-center justify-between">
                        <div>
                          <label className="text-sm font-medium text-secondary-700">Sound Alerts</label>
                          <p className="text-xs text-secondary-500">Play sound for new notifications</p>
                        </div>
                        <button className="relative inline-flex h-6 w-11 items-center rounded-full bg-secondary-200">
                          <span className="inline-block h-4 w-4 transform rounded-full bg-white translate-x-1" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-8 flex justify-end space-x-3">
                  <button
                    onClick={() => setShowSettings(false)}
                    className="px-4 py-2 border border-secondary-300 text-secondary-700 rounded-xl hover:bg-secondary-50 transition-colors duration-200"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => setShowSettings(false)}
                    className="btn-primary"
                  >
                    Save Settings
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default NotificationsPage;

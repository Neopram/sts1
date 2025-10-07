import React, { useState, useRef, useEffect } from 'react';
import { 
  Bell, 
  Check, 
  X, 
  AlertTriangle, 
  Info, 
  CheckCircle, 
  AlertCircle,
  Clock,
  Trash2,
  Eye,
  EyeOff
} from 'lucide-react';
import { useNotifications } from '../../contexts/NotificationContext';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../../contexts/LanguageContext';

interface NotificationDropdownProps {
  isOpen: boolean;
  onClose: () => void;
}

const NotificationDropdown: React.FC<NotificationDropdownProps> = ({ isOpen, onClose }) => {
  const { 
    notifications, 
    unreadCount, 
    markAsRead, 
    markAllAsRead, 
    deleteNotification,
    clearAll 
  } = useNotifications();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const dropdownRef = useRef<HTMLDivElement>(null);
  
  const [filter, setFilter] = useState<'all' | 'unread' | 'high'>('all');
  const [showRead, setShowRead] = useState(true);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen, onClose]);

  // Close dropdown on escape key
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
    }

    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  // Get filtered notifications
  const getFilteredNotifications = () => {
    let filtered = notifications;

    if (filter === 'unread') {
      filtered = filtered.filter(n => !n.read);
    } else if (filter === 'high') {
      filtered = filtered.filter(n => n.priority === 'high');
    }

    if (!showRead) {
      filtered = filtered.filter(n => !n.read);
    }

    return filtered;
  };

  // Handle notification click
  const handleNotificationClick = (notification: any) => {
    markAsRead(notification.id);
    if (notification.actionUrl) {
      navigate(notification.actionUrl);
      onClose();
    }
  };

  // Get notification icon
  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'success':
        return <CheckCircle className="w-5 h-5 text-success-500" />;
      case 'warning':
        return <AlertTriangle className="w-5 h-5 text-warning-500" />;
      case 'error':
        return <AlertCircle className="w-5 h-5 text-danger-500" />;
      case 'info':
      default:
        return <Info className="w-5 h-5 text-blue-500" />;
    }
  };

  // Get priority color
  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'border-l-red-500';
      case 'medium':
        return 'border-l-yellow-500';
      case 'low':
        return 'border-l-green-500';
      default:
        return 'border-l-gray-300';
    }
  };

  // Format timestamp
  const formatTimestamp = (timestamp: Date) => {
    const now = new Date();
    const diff = now.getTime() - timestamp.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return timestamp.toLocaleDateString();
  };

  const filteredNotifications = getFilteredNotifications();

  if (!isOpen) return null;

  return (
    <div className="absolute right-0 mt-2 w-96 bg-white rounded-xl shadow-lg border border-secondary-200 z-[60]">
      <div ref={dropdownRef}>
        {/* Header */}
        <div className="px-4 py-3 border-b border-secondary-200">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium text-secondary-900">
              {t('notifications.title') || 'Notifications'}
              {unreadCount > 0 && (
                <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-danger-800">
                  {unreadCount}
                </span>
              )}
            </h3>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setShowRead(!showRead)}
                className="p-1 text-secondary-400 hover:text-secondary-600"
                title={showRead ? 'Hide read' : 'Show read'}
              >
                {showRead ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
              <button
                onClick={markAllAsRead}
                className="p-1 text-secondary-400 hover:text-secondary-600"
                title="Mark all as read"
              >
                <Check className="w-4 h-4" />
              </button>
              <button
                onClick={clearAll}
                className="p-1 text-secondary-400 hover:text-secondary-600"
                title="Clear all"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Filters */}
          <div className="mt-3 flex items-center space-x-2">
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value as any)}
              className="text-xs border border-secondary-300 rounded px-2 py-1"
            >
              <option value="all">{t('notifications.filter.all') || 'All'}</option>
              <option value="unread">{t('notifications.filter.unread') || 'Unread'}</option>
              <option value="high">{t('notifications.filter.high') || 'High Priority'}</option>
            </select>
          </div>
        </div>

        {/* Notifications List */}
        <div className="max-h-96 overflow-y-auto">
          {filteredNotifications.length > 0 ? (
            <div className="py-2">
              {filteredNotifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`px-4 py-3 border-l-4 ${getPriorityColor(notification.priority)} hover:bg-secondary-50 transition-colors duration-200 ${
                    !notification.read ? 'bg-blue-50' : ''
                  }`}
                >
                  <div className="flex items-start space-x-3">
                    <div className="flex-shrink-0 mt-1">
                      {getNotificationIcon(notification.type)}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h4 className={`text-sm font-medium ${
                            !notification.read ? 'text-secondary-900' : 'text-secondary-700'
                          }`}>
                            {notification.title}
                          </h4>
                          <p className="text-sm text-secondary-600 mt-1">
                            {notification.message}
                          </p>
                          <div className="flex items-center space-x-4 mt-2 text-xs text-secondary-500">
                            <span className="flex items-center space-x-1">
                              <Clock className="w-3 h-3" />
                              <span>{formatTimestamp(notification.timestamp)}</span>
                            </span>
                            <span className="capitalize">{notification.category}</span>
                            <span className="capitalize">{notification.priority}</span>
                          </div>
                        </div>
                        
                        <div className="flex items-center space-x-1 ml-2">
                          {!notification.read && (
                            <button
                              onClick={() => markAsRead(notification.id)}
                              className="p-1 text-secondary-400 hover:text-blue-600"
                              title="Mark as read"
                            >
                              <Check className="w-3 h-3" />
                            </button>
                          )}
                          <button
                            onClick={() => deleteNotification(notification.id)}
                            className="p-1 text-secondary-400 hover:text-danger-600"
                            title="Delete"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                      
                      {notification.actionUrl && (
                        <button
                          onClick={() => handleNotificationClick(notification)}
                          className="mt-2 text-xs text-blue-600 hover:text-blue-800 underline"
                        >
                          {t('notifications.view') || 'View Details'}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="px-4 py-8 text-center">
              <Bell className="w-8 h-8 text-secondary-400 mx-auto mb-2" />
              <p className="text-sm text-secondary-500">
                {t('notifications.noNotifications') || 'No notifications'}
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        {filteredNotifications.length > 0 && (
          <div className="px-4 py-3 border-t border-secondary-200 bg-secondary-50 rounded-b-lg">
            <div className="flex items-center justify-between text-xs text-secondary-500">
              <span>
                {filteredNotifications.length} {t('notifications.count') || 'notifications'}
              </span>
              <button
                onClick={markAllAsRead}
                className="text-blue-600 hover:text-blue-800 underline"
              >
                {t('notifications.markAllRead') || 'Mark all as read'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default NotificationDropdown;

import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';

interface Notification {
  id: string;
  type: 'info' | 'success' | 'warning' | 'error';
  title: string;
  message: string;
  timestamp: Date;
  read: boolean;
  actionUrl?: string;
  priority: 'low' | 'medium' | 'high';
  category: 'system' | 'document' | 'vessel' | 'activity' | 'security';
  metadata?: Record<string, any>;
}

interface NotificationContextType {
  notifications: Notification[];
  unreadCount: number;
  addNotification: (notification: Omit<Notification, 'id' | 'timestamp' | 'read'>) => void;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  deleteNotification: (id: string) => void;
  clearAll: () => void;
  getNotificationsByCategory: (category: string) => Notification[];
  getNotificationsByPriority: (priority: string) => Notification[];
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
};

interface NotificationProviderProps {
  children: ReactNode;
}

export const NotificationProvider: React.FC<NotificationProviderProps> = ({ children }) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);

  // Load notifications from localStorage on mount
  useEffect(() => {
    const savedNotifications = localStorage.getItem('app-notifications');
    if (savedNotifications) {
      try {
        const parsed = JSON.parse(savedNotifications);
        // Convert timestamp strings back to Date objects
        const notificationsWithDates = parsed.map((n: any) => ({
          ...n,
          timestamp: new Date(n.timestamp)
        }));
        setNotifications(notificationsWithDates);
      } catch (error) {
        console.error('Error loading notifications:', error);
      }
    }
  }, []);

  // Save notifications to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem('app-notifications', JSON.stringify(notifications));
  }, [notifications]);

  // Calculate unread count
  const unreadCount = notifications.filter(n => !n.read).length;

  // Add new notification
  const addNotification = useCallback((notification: Omit<Notification, 'id' | 'timestamp' | 'read'>) => {
    const newNotification: Notification = {
      ...notification,
      id: `notification-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date(),
      read: false
    };

    setNotifications(prev => [newNotification, ...prev]);

    // Show browser notification if supported
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(notification.title, {
        body: notification.message,
        icon: '/favicon.ico',
        tag: newNotification.id
      });
    }

    // Dispatch custom event for other components
    window.dispatchEvent(new CustomEvent('notification:added', { detail: newNotification }));
  }, []);

  // Mark notification as read
  const markAsRead = useCallback((id: string) => {
    setNotifications(prev => 
      prev.map(n => n.id === id ? { ...n, read: true } : n)
    );
  }, []);

  // Mark all notifications as read
  const markAllAsRead = useCallback(() => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  }, []);

  // Delete notification
  const deleteNotification = useCallback((id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  }, []);

  // Clear all notifications
  const clearAll = useCallback(() => {
    setNotifications([]);
  }, []);

  // Get notifications by category
  const getNotificationsByCategory = useCallback((category: string) => {
    return notifications.filter(n => n.category === category);
  }, [notifications]);

  // Get notifications by priority
  const getNotificationsByPriority = useCallback((priority: string) => {
    return notifications.filter(n => n.priority === priority);
  }, [notifications]);

  // Initialize with some sample notifications
  useEffect(() => {
    if (notifications.length === 0) {
      const sampleNotifications: Omit<Notification, 'id' | 'timestamp' | 'read'>[] = [
        {
          type: 'warning',
          title: 'Document Expiring Soon',
          message: 'Safety Certificate for MV Ocean Star expires in 7 days',
          priority: 'high',
          category: 'document',
          actionUrl: '/documents/safety-certificate',
          metadata: { vesselId: 'vessel-1', documentType: 'Safety Certificate' }
        },
        {
          type: 'info',
          title: 'New Vessel Registration',
          message: 'MV Pacific Star has been registered for STS transfer',
          priority: 'medium',
          category: 'vessel',
          actionUrl: '/vessels/pacific-star',
          metadata: { vesselId: 'vessel-2', vesselName: 'MV Pacific Star' }
        },
        {
          type: 'success',
          title: 'Document Approved',
          message: 'Insurance Certificate has been approved by John Doe',
          priority: 'medium',
          category: 'document',
          actionUrl: '/documents/insurance-certificate',
          metadata: { approver: 'John Doe', documentType: 'Insurance Certificate' }
        },
        {
          type: 'error',
          title: 'Upload Failed',
          message: 'Failed to upload Safety Management Certificate',
          priority: 'high',
          category: 'system',
          actionUrl: '/upload',
          metadata: { error: 'File size exceeds limit', fileName: 'SMC.pdf' }
        }
      ];

      sampleNotifications.forEach(notification => {
        addNotification(notification);
      });
    }
  }, [addNotification, notifications.length]);

  const value: NotificationContextType = {
    notifications,
    unreadCount,
    addNotification,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    clearAll,
    getNotificationsByCategory,
    getNotificationsByPriority
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
};

/**
 * RealtimeNotificationPanel Component
 * Displays real-time notifications, alerts, and system updates
 * Connected to WebSocket for live updates
 */

import React, { useState, useCallback, useEffect } from 'react';
import { WebSocketMessage } from '../hooks/useWebSocket';

export interface Notification {
  id: string;
  type: 'notification' | 'alert' | 'dashboard_update' | 'warning' | 'info';
  title: string;
  message: string;
  severity?: 'low' | 'medium' | 'high' | 'critical';
  timestamp: number;
  read: boolean;
  actionUrl?: string;
  dismissible?: boolean;
}

interface RealtimeNotificationPanelProps {
  isConnected: boolean;
  onMessage?: (message: WebSocketMessage) => void;
}

export const RealtimeNotificationPanel: React.FC<RealtimeNotificationPanelProps> = ({
  isConnected,
  onMessage,
}) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isExpanded, setIsExpanded] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  const handleNewMessage = useCallback((message: WebSocketMessage) => {
    if (message.type === 'notification' || message.type === 'alert' || message.type === 'dashboard_update') {
      const notification: Notification = {
        id: `notif-${Date.now()}-${Math.random()}`,
        type: message.type as any,
        title: message.data?.title || 'New Update',
        message: message.data?.message || JSON.stringify(message.data),
        severity: message.data?.severity || message.data?.priority,
        timestamp: Date.now(),
        read: false,
        dismissible: true,
      };

      setNotifications(prev => [notification, ...prev.slice(0, 99)]);
      setUnreadCount(prev => prev + 1);

      // Auto-dismiss non-critical notifications after 5 seconds
      if (notification.severity !== 'critical') {
        setTimeout(() => {
          dismiss(notification.id);
        }, 5000);
      }
    }
  }, []);

  const dismiss = useCallback((notificationId: string) => {
    setNotifications(prev => prev.filter(n => n.id !== notificationId));
    setUnreadCount(prev => Math.max(0, prev - 1));
  }, []);

  const markAllAsRead = useCallback(() => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    setUnreadCount(0);
  }, []);

  const clearAll = useCallback(() => {
    setNotifications([]);
    setUnreadCount(0);
  }, []);

  const getSeverityColor = (severity?: string): string => {
    switch (severity) {
      case 'critical': return '#dc2626';
      case 'high': return '#ea580c';
      case 'medium': return '#eab308';
      case 'low': return '#3b82f6';
      default: return '#6366f1';
    }
  };

  const getTypeIcon = (type: string): string => {
    switch (type) {
      case 'alert': return '⚠️';
      case 'notification': return '🔔';
      case 'dashboard_update': return '📊';
      case 'warning': return '⚡';
      case 'info': return 'ℹ️';
      default: return '📢';
    }
  };

  return (
    <div style={{ position: 'relative' }}>
      {/* Notification Bell Icon */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        style={{
          position: 'relative',
          background: 'none',
          border: 'none',
          fontSize: '20px',
          cursor: 'pointer',
          padding: '8px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
        title={`${unreadCount} unread notifications`}
      >
        🔔
        {unreadCount > 0 && (
          <span
            style={{
              position: 'absolute',
              top: '-5px',
              right: '-5px',
              background: '#dc2626',
              color: 'white',
              borderRadius: '50%',
              width: '20px',
              height: '20px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '12px',
              fontWeight: 'bold',
            }}
          >
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Connection Status Indicator */}
      <div
        style={{
          position: 'absolute',
          bottom: '2px',
          right: '2px',
          width: '8px',
          height: '8px',
          borderRadius: '50%',
          background: isConnected ? '#10b981' : '#ef4444',
          animation: isConnected ? 'none' : 'pulse 2s infinite',
        }}
        title={isConnected ? 'Connected' : 'Disconnected'}
      />

      {/* Notification Panel */}
      {isExpanded && (
        <div
          style={{
            position: 'absolute',
            top: '100%',
            right: 0,
            width: '400px',
            maxHeight: '500px',
            background: 'white',
            borderRadius: '8px',
            boxShadow: '0 10px 40px rgba(0, 0, 0, 0.2)',
            zIndex: 1000,
            display: 'flex',
            flexDirection: 'column',
            marginTop: '10px',
          }}
        >
          {/* Header */}
          <div
            style={{
              padding: '15px',
              borderBottom: '1px solid #e5e7eb',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              background: '#f9fafb',
              borderRadius: '8px 8px 0 0',
            }}
          >
            <div style={{ fontWeight: 'bold', fontSize: '14px' }}>
              Notifications {unreadCount > 0 && `(${unreadCount})`}
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                onClick={markAllAsRead}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: '12px',
                  color: '#6366f1',
                  padding: '4px 8px',
                }}
                disabled={unreadCount === 0}
              >
                Mark read
              </button>
              <button
                onClick={clearAll}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: '12px',
                  color: '#ef4444',
                  padding: '4px 8px',
                }}
              >
                Clear
              </button>
            </div>
          </div>

          {/* Notifications List */}
          <div
            style={{
              flex: 1,
              overflowY: 'auto',
              maxHeight: '400px',
            }}
          >
            {notifications.length === 0 ? (
              <div
                style={{
                  padding: '30px 15px',
                  textAlign: 'center',
                  color: '#9ca3af',
                  fontSize: '14px',
                }}
              >
                No notifications
              </div>
            ) : (
              notifications.map(notification => (
                <div
                  key={notification.id}
                  style={{
                    padding: '12px 15px',
                    borderBottom: '1px solid #f3f4f6',
                    background: notification.read ? 'white' : '#f0f9ff',
                    display: 'flex',
                    gap: '12px',
                    alignItems: 'flex-start',
                  }}
                >
                  {/* Icon */}
                  <div
                    style={{
                      fontSize: '18px',
                      marginTop: '2px',
                      flexShrink: 0,
                    }}
                  >
                    {getTypeIcon(notification.type)}
                  </div>

                  {/* Content */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        fontWeight: notification.read ? '500' : 'bold',
                        fontSize: '13px',
                        color: notification.read ? '#6b7280' : '#1f2937',
                        marginBottom: '2px',
                      }}
                    >
                      {notification.title}
                    </div>
                    <div
                      style={{
                        fontSize: '12px',
                        color: '#6b7280',
                        marginBottom: '4px',
                        wordBreak: 'break-word',
                      }}
                    >
                      {notification.message}
                    </div>
                    <div
                      style={{
                        fontSize: '11px',
                        color: '#9ca3af',
                      }}
                    >
                      {new Date(notification.timestamp).toLocaleTimeString()}
                    </div>
                  </div>

                  {/* Severity Badge */}
                  {notification.severity && (
                    <div
                      style={{
                        width: '6px',
                        height: '6px',
                        borderRadius: '50%',
                        background: getSeverityColor(notification.severity),
                        marginTop: '4px',
                        flexShrink: 0,
                      }}
                    />
                  )}

                  {/* Dismiss Button */}
                  {notification.dismissible && (
                    <button
                      onClick={() => dismiss(notification.id)}
                      style={{
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        fontSize: '16px',
                        padding: '0',
                        color: '#9ca3af',
                      }}
                    >
                      ✕
                    </button>
                  )}
                </div>
              ))
            )}
          </div>

          {/* Footer */}
          <div
            style={{
              padding: '10px 15px',
              borderTop: '1px solid #e5e7eb',
              background: '#f9fafb',
              fontSize: '11px',
              color: '#9ca3af',
              borderRadius: '0 0 8px 8px',
            }}
          >
            {isConnected ? '🟢 Connected' : '🔴 Disconnected'}
          </div>
        </div>
      )}

      {/* Floating Toast Notifications */}
      <style>{`
        @keyframes slideIn {
          from {
            transform: translateX(400px);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }

        @keyframes pulse {
          0%, 100% {
            opacity: 1;
          }
          50% {
            opacity: 0.5;
          }
        }
      `}</style>
    </div>
  );
};

export default RealtimeNotificationPanel;
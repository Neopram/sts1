import React, { createContext, useContext, useEffect, useRef, useCallback, useState, ReactNode } from 'react';
import { useApp } from './AppContext';
import { useNotifications } from './NotificationContext';

export interface WebSocketMessage {
  type: string;
  room_id?: string;
  data?: any;
  timestamp?: number;
}

interface WebSocketContextType {
  isConnected: boolean;
  currentRoomId: string | null;
  connect: (roomId: string) => void;
  disconnect: () => void;
  send: (message: WebSocketMessage) => void;
  metrics: {
    messageCount: number;
    reconnectAttempts: number;
    lastMessageTime: number | null;
  };
}

const WebSocketContext = createContext<WebSocketContextType | undefined>(undefined);

export const useWebSocketContext = () => {
  const context = useContext(WebSocketContext);
  if (context === undefined) {
    throw new Error('useWebSocketContext must be used within a WebSocketProvider');
  }
  return context;
};

interface WebSocketProviderProps {
  children: ReactNode;
}

export const WebSocketProvider: React.FC<WebSocketProviderProps> = ({ children }) => {
  const { user, currentRoomId } = useApp();
  const { addNotification } = useNotifications();
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const messageCountRef = useRef(0);
  const lastMessageTimeRef = useRef<number | null>(null);

  const [isConnected, setIsConnected] = useState(false);
  const [metrics, setMetrics] = useState({
    messageCount: 0,
    reconnectAttempts: 0,
    lastMessageTime: null as number | null,
  });

  const MAX_RECONNECT_ATTEMPTS = 5;
  const RECONNECT_INTERVAL = 3000;

  const connect = useCallback(
    (roomId: string) => {
      if (!user || !roomId) return;

      // Disconnect existing connection
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }

      try {
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        // For LAN testing, use the API URL if configured
        const apiUrl = import.meta.env.VITE_API_URL;
        let wsHost: string;
        
        if (apiUrl) {
          try {
            const url = new URL(apiUrl);
            wsHost = `${url.hostname}:${url.port || (protocol === 'wss:' ? '443' : '8001')}`;
          } catch {
            wsHost = window.location.host;
          }
        } else {
          wsHost = window.location.host;
        }
        
        const token = localStorage.getItem('auth-token') || '';
        const wsUrl = `${protocol}//${wsHost}/ws/connect/${roomId}?token=${encodeURIComponent(token)}`;

        console.log(`🔌 Connecting to WebSocket: ${wsUrl}`);

        wsRef.current = new WebSocket(wsUrl);

        wsRef.current.onopen = () => {
          console.log(`✅ WebSocket connected to room: ${roomId}`);
          setIsConnected(true);
          reconnectAttemptsRef.current = 0;
          setMetrics((prev) => ({
            ...prev,
            reconnectAttempts: 0,
          }));

          // Send connection confirmation
          if (wsRef.current?.readyState === WebSocket.OPEN) {
            wsRef.current.send(
              JSON.stringify({
                type: 'connection',
                room_id: roomId,
                data: { user: user.email },
              })
            );
          }
        };

        wsRef.current.onmessage = (event) => {
          try {
            const message: WebSocketMessage = JSON.parse(event.data);
            lastMessageTimeRef.current = Date.now();
            messageCountRef.current += 1;

            setMetrics((prev) => ({
              ...prev,
              messageCount: messageCountRef.current,
              lastMessageTime: lastMessageTimeRef.current,
            }));

            // Handle different message types
            handleWebSocketMessage(message);
          } catch (error) {
            console.error('Failed to parse WebSocket message:', error);
          }
        };

        wsRef.current.onerror = (error) => {
          console.error('❌ WebSocket error:', error);
          setIsConnected(false);
        };

        wsRef.current.onclose = () => {
          console.log('🔌 WebSocket disconnected');
          setIsConnected(false);
          setMetrics((prev) => ({
            ...prev,
            lastMessageTime: null,
          }));

          // Auto-reconnect logic
          if (reconnectAttemptsRef.current < MAX_RECONNECT_ATTEMPTS && user) {
            reconnectAttemptsRef.current += 1;
            setMetrics((prev) => ({
              ...prev,
              reconnectAttempts: reconnectAttemptsRef.current,
            }));

            console.log(
              `🔄 Reconnecting in ${RECONNECT_INTERVAL * reconnectAttemptsRef.current}ms (attempt ${reconnectAttemptsRef.current}/${MAX_RECONNECT_ATTEMPTS})`
            );

            reconnectTimeoutRef.current = setTimeout(() => {
              connect(roomId);
            }, RECONNECT_INTERVAL * reconnectAttemptsRef.current);
          } else if (reconnectAttemptsRef.current >= MAX_RECONNECT_ATTEMPTS) {
            addNotification({
              type: 'error',
              title: 'WebSocket Connection Failed',
              message: 'Unable to establish real-time connection. Some features may not work.',
              priority: 'medium',
              category: 'system',
            });
          }
        };
      } catch (error) {
        console.error('Failed to create WebSocket:', error);
        setIsConnected(false);
      }
    },
    [user, addNotification]
  );

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
      setIsConnected(false);
      reconnectAttemptsRef.current = 0;
    }
  }, []);

  const send = useCallback(
    (message: WebSocketMessage) => {
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify(message));
      } else {
        console.warn('WebSocket is not connected, message not sent:', message);
      }
    },
    []
  );

  const handleWebSocketMessage = useCallback(
    (message: WebSocketMessage) => {
      // Handle notification messages
      if (message.type === 'notification' || message.type === 'alert') {
        addNotification({
          type: message.type === 'alert' ? 'warning' : 'info',
          title: message.data?.title || 'New Notification',
          message: message.data?.message || JSON.stringify(message.data),
          priority: message.data?.priority || message.data?.severity || 'medium',
          category: message.data?.category || 'system',
          actionUrl: message.data?.action_url,
        });

        // Dispatch custom event for other components
        window.dispatchEvent(
          new CustomEvent('websocket:message', {
            detail: message,
          })
        );
      }

      // Handle dashboard updates
      if (message.type === 'dashboard_update') {
        window.dispatchEvent(
          new CustomEvent('websocket:dashboard_update', {
            detail: message.data,
          })
        );
      }

      // Handle document updates
      if (message.type === 'document_update') {
        window.dispatchEvent(
          new CustomEvent('websocket:document_update', {
            detail: message.data,
          })
        );
      }

      // Handle approval updates
      if (message.type === 'approval_update') {
        window.dispatchEvent(
          new CustomEvent('websocket:approval_update', {
            detail: message.data,
          })
        );
      }

      // Handle room status updates
      if (message.type === 'room_status_update') {
        window.dispatchEvent(
          new CustomEvent('websocket:room_status_update', {
            detail: message.data,
          })
        );
      }

      // Handle chat messages
      if (message.type === 'message') {
        window.dispatchEvent(
          new CustomEvent('websocket:message_received', {
            detail: message.data,
          })
        );
      }
    },
    [addNotification]
  );

  // Auto-connect when room changes or user logs in
  useEffect(() => {
    if (user && currentRoomId) {
      connect(currentRoomId);
    } else {
      disconnect();
    }

    return () => {
      disconnect();
    };
  }, [user, currentRoomId, connect, disconnect]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      disconnect();
    };
  }, [disconnect]);

  const value: WebSocketContextType = {
    isConnected,
    currentRoomId: currentRoomId || null,
    connect,
    disconnect,
    send,
    metrics,
  };

  return <WebSocketContext.Provider value={value}>{children}</WebSocketContext.Provider>;
};


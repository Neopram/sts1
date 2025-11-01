/**
 * useWebSocket Hook - Real-time communication with backend
 * Manages WebSocket connections, reconnection, and message handling
 */

import { useEffect, useRef, useCallback, useState } from 'react';

export interface WebSocketMessage {
  type: string;
  room_id: string;
  data: any;
  timestamp?: number;
}

export interface WebSocketHookOptions {
  roomId: string;
  token: string;
  onMessage?: (message: WebSocketMessage) => void;
  onConnect?: () => void;
  onDisconnect?: () => void;
  onError?: (error: Error) => void;
  autoReconnect?: boolean;
  reconnectInterval?: number;
  maxReconnectAttempts?: number;
}

interface ConnectionMetrics {
  isConnected: boolean;
  reconnectAttempts: number;
  lastMessageTime: number | null;
  messageCount: number;
  connectionUptime: number;
}

export const useWebSocket = ({
  roomId,
  token,
  onMessage,
  onConnect,
  onDisconnect,
  onError,
  autoReconnect = true,
  reconnectInterval = 3000,
  maxReconnectAttempts = 5,
}: WebSocketHookOptions) => {
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectCounterRef = useRef(0);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const connectionStartTimeRef = useRef<number>(Date.now());
  
  const [metrics, setMetrics] = useState<ConnectionMetrics>({
    isConnected: false,
    reconnectAttempts: 0,
    lastMessageTime: null,
    messageCount: 0,
    connectionUptime: 0,
  });

  const updateMetrics = useCallback(() => {
    setMetrics(prev => ({
      ...prev,
      connectionUptime: Date.now() - connectionStartTimeRef.current,
    }));
  }, []);

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      return;
    }

    try {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      // For LAN testing, use the API URL if configured, otherwise use current host
      const apiUrl = import.meta.env.VITE_API_URL;
      let wsHost: string;
      
      if (apiUrl) {
        // Extract host from API URL (remove protocol and path)
        try {
          const url = new URL(apiUrl);
          wsHost = `${url.hostname}:${url.port || (protocol === 'wss:' ? '443' : '80')}`;
        } catch {
          wsHost = window.location.host;
        }
      } else {
        wsHost = window.location.host;
      }
      
      const wsUrl = `${protocol}//${wsHost}/ws/connect/${roomId}?token=${token}`;

      wsRef.current = new WebSocket(wsUrl);

      wsRef.current.onopen = () => {
        console.log(`✅ WebSocket connected to room: ${roomId}`);
        reconnectCounterRef.current = 0;
        setMetrics(prev => ({
          ...prev,
          isConnected: true,
          reconnectAttempts: 0,
        }));
        connectionStartTimeRef.current = Date.now();
        onConnect?.();
      };

      wsRef.current.onmessage = (event) => {
        try {
          const message: WebSocketMessage = JSON.parse(event.data);
          setMetrics(prev => ({
            ...prev,
            lastMessageTime: Date.now(),
            messageCount: prev.messageCount + 1,
          }));
          onMessage?.(message);
        } catch (error) {
          console.error('Failed to parse WebSocket message:', error);
        }
      };

      wsRef.current.onerror = (event) => {
        console.error('❌ WebSocket error:', event);
        const error = new Error('WebSocket connection error');
        onError?.(error);
      };

      wsRef.current.onclose = () => {
        console.log('🔌 WebSocket disconnected');
        setMetrics(prev => ({
          ...prev,
          isConnected: false,
        }));
        onDisconnect?.();

        if (autoReconnect && reconnectCounterRef.current < maxReconnectAttempts) {
          reconnectCounterRef.current += 1;
          setMetrics(prev => ({
            ...prev,
            reconnectAttempts: reconnectCounterRef.current,
          }));

          reconnectTimeoutRef.current = setTimeout(() => {
            console.log(`🔄 Attempting to reconnect... (attempt ${reconnectCounterRef.current})`);
            connect();
          }, reconnectInterval * reconnectCounterRef.current);
        }
      };
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      console.error('Failed to create WebSocket:', err);
      onError?.(err);
    }
  }, [roomId, token, onMessage, onConnect, onDisconnect, onError, autoReconnect, reconnectInterval, maxReconnectAttempts]);

  const send = useCallback((message: WebSocketMessage) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(message));
    } else {
      console.warn('WebSocket is not connected, message not sent');
    }
  }, []);

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
  }, []);

  // Auto-update metrics every second when connected
  useEffect(() => {
    if (metrics.isConnected) {
      const metricsInterval = setInterval(updateMetrics, 1000);
      return () => clearInterval(metricsInterval);
    }
  }, [metrics.isConnected, updateMetrics]);

  // Connect on mount
  useEffect(() => {
    connect();

    return () => {
      disconnect();
    };
  }, [connect, disconnect]);

  return {
    isConnected: metrics.isConnected,
    send,
    disconnect,
    reconnect: connect,
    metrics,
  };
};

export default useWebSocket;
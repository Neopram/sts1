import { useEffect, useCallback } from 'react';
import { useWebSocketContext } from '../contexts/WebSocketContext';

/**
 * Hook to listen for real-time updates via WebSocket
 * Automatically handles different event types and provides callbacks
 */
export const useRealtimeUpdates = (options: {
  onDocumentUpdate?: (data: any) => void;
  onApprovalUpdate?: (data: any) => void;
  onRoomStatusUpdate?: (data: any) => void;
  onDashboardUpdate?: (data: any) => void;
  onMessageReceived?: (data: any) => void;
  onNotification?: (data: any) => void;
}) => {
  const { isConnected } = useWebSocketContext();

  const handleDocumentUpdate = useCallback(
    (event: CustomEvent) => {
      options.onDocumentUpdate?.(event.detail);
    },
    [options]
  );

  const handleApprovalUpdate = useCallback(
    (event: CustomEvent) => {
      options.onApprovalUpdate?.(event.detail);
    },
    [options]
  );

  const handleRoomStatusUpdate = useCallback(
    (event: CustomEvent) => {
      options.onRoomStatusUpdate?.(event.detail);
    },
    [options]
  );

  const handleDashboardUpdate = useCallback(
    (event: CustomEvent) => {
      options.onDashboardUpdate?.(event.detail);
    },
    [options]
  );

  const handleMessageReceived = useCallback(
    (event: CustomEvent) => {
      options.onMessageReceived?.(event.detail);
    },
    [options]
  );

  const handleNotification = useCallback(
    (event: CustomEvent) => {
      options.onNotification?.(event.detail);
    },
    [options]
  );

  useEffect(() => {
    if (!isConnected) return;

    // Register event listeners
    window.addEventListener('websocket:document_update', handleDocumentUpdate as EventListener);
    window.addEventListener('websocket:approval_update', handleApprovalUpdate as EventListener);
    window.addEventListener('websocket:room_status_update', handleRoomStatusUpdate as EventListener);
    window.addEventListener('websocket:dashboard_update', handleDashboardUpdate as EventListener);
    window.addEventListener('websocket:message_received', handleMessageReceived as EventListener);
    window.addEventListener('websocket:message', handleNotification as EventListener);

    return () => {
      // Cleanup
      window.removeEventListener('websocket:document_update', handleDocumentUpdate as EventListener);
      window.removeEventListener('websocket:approval_update', handleApprovalUpdate as EventListener);
      window.removeEventListener('websocket:room_status_update', handleRoomStatusUpdate as EventListener);
      window.removeEventListener('websocket:dashboard_update', handleDashboardUpdate as EventListener);
      window.removeEventListener('websocket:message_received', handleMessageReceived as EventListener);
      window.removeEventListener('websocket:message', handleNotification as EventListener);
    };
  }, [
    isConnected,
    handleDocumentUpdate,
    handleApprovalUpdate,
    handleRoomStatusUpdate,
    handleDashboardUpdate,
    handleMessageReceived,
    handleNotification,
  ]);

  return { isConnected };
};


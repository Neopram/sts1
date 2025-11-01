import React from 'react';
import { useWebSocketContext } from '../contexts/WebSocketContext';
import { Wifi, WifiOff, AlertCircle } from 'lucide-react';

interface WebSocketConnectionIndicatorProps {
  showLabel?: boolean;
  size?: 'sm' | 'md' | 'lg';
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left';
}

export const WebSocketConnectionIndicator: React.FC<WebSocketConnectionIndicatorProps> = ({
  showLabel = false,
  size = 'sm',
  position = 'bottom-right',
}) => {
  const { isConnected, metrics } = useWebSocketContext();

  const sizeClasses = {
    sm: 'w-3 h-3',
    md: 'w-4 h-4',
    lg: 'w-5 h-5',
  };

  const positionClasses = {
    'top-right': 'top-4 right-4',
    'top-left': 'top-4 left-4',
    'bottom-right': 'bottom-4 right-4',
    'bottom-left': 'bottom-4 left-4',
  };

  if (!showLabel && size === 'sm') {
    return (
      <div
        className={`fixed ${positionClasses[position]} z-50 flex items-center gap-2 ${
          isConnected ? 'text-green-600' : 'text-red-600'
        }`}
        title={isConnected ? 'Connected' : 'Disconnected'}
      >
        <div
          className={`${sizeClasses[size]} rounded-full ${
            isConnected ? 'bg-green-500' : 'bg-red-500'
          } ${isConnected ? 'animate-pulse' : ''}`}
        />
      </div>
    );
  }

  return (
    <div
      className={`fixed ${positionClasses[position]} z-50 bg-white rounded-lg shadow-lg border border-secondary-200 px-3 py-2 flex items-center gap-2`}
    >
      {isConnected ? (
        <>
          <Wifi className={`${sizeClasses[size]} text-green-600`} />
          <span className="text-sm text-secondary-700">Connected</span>
          {metrics.messageCount > 0 && (
            <span className="text-xs text-secondary-500">({metrics.messageCount} msgs)</span>
          )}
        </>
      ) : (
        <>
          <WifiOff className={`${sizeClasses[size]} text-red-600`} />
          <span className="text-sm text-secondary-700">Disconnected</span>
          {metrics.reconnectAttempts > 0 && (
            <span className="text-xs text-secondary-500">
              (Reconnecting {metrics.reconnectAttempts}...)
            </span>
          )}
        </>
      )}
    </div>
  );
};

export default WebSocketConnectionIndicator;


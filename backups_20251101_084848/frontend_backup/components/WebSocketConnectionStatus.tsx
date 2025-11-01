/**
 * WebSocketConnectionStatus Component
 * Displays detailed WebSocket connection status and metrics
 */

import React, { useState } from 'react';

export interface ConnectionMetrics {
  isConnected: boolean;
  reconnectAttempts: number;
  lastMessageTime: number | null;
  messageCount: number;
  connectionUptime: number;
}

interface WebSocketConnectionStatusProps {
  metrics: ConnectionMetrics;
  roomId: string;
  compact?: boolean;
}

export const WebSocketConnectionStatus: React.FC<WebSocketConnectionStatusProps> = ({
  metrics,
  roomId,
  compact = false,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const formatUptime = (ms: number): string => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);

    if (hours > 0) {
      return `${hours}h ${minutes % 60}m`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`;
    } else {
      return `${seconds}s`;
    }
  };

  const getStatusColor = (): string => {
    if (metrics.isConnected) return '#10b981';
    if (metrics.reconnectAttempts > 0) return '#f59e0b';
    return '#ef4444';
  };

  const getStatusText = (): string => {
    if (metrics.isConnected) return 'Connected';
    if (metrics.reconnectAttempts > 0) return `Reconnecting... (${metrics.reconnectAttempts})`;
    return 'Disconnected';
  };

  if (compact) {
    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          fontSize: '12px',
          color: '#6b7280',
        }}
        title={`WebSocket: ${getStatusText()} | Room: ${roomId} | Messages: ${metrics.messageCount}`}
      >
        <div
          style={{
            width: '8px',
            height: '8px',
            borderRadius: '50%',
            background: getStatusColor(),
            animation: !metrics.isConnected ? 'pulse 2s infinite' : 'none',
          }}
        />
        <span>{getStatusText()}</span>
      </div>
    );
  }

  return (
    <div
      style={{
        background: 'white',
        border: `2px solid ${getStatusColor()}`,
        borderRadius: '8px',
        padding: '12px 15px',
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          cursor: 'pointer',
        }}
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div
            style={{
              width: '10px',
              height: '10px',
              borderRadius: '50%',
              background: getStatusColor(),
              animation: !metrics.isConnected ? 'pulse 2s infinite' : 'none',
            }}
          />
          <div>
            <div style={{ fontWeight: 'bold', fontSize: '14px', color: '#1f2937' }}>
              WebSocket Connection
            </div>
            <div style={{ fontSize: '12px', color: '#6b7280' }}>
              {getStatusText()} • Room: {roomId}
            </div>
          </div>
        </div>
        <div style={{ fontSize: '20px', color: '#d1d5db' }}>
          {isExpanded ? '▼' : '▶'}
        </div>
      </div>

      {isExpanded && (
        <div style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px solid #e5e7eb' }}>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(2, 1fr)',
              gap: '12px',
            }}
          >
            {/* Status */}
            <div>
              <div style={{ fontSize: '11px', color: '#9ca3af', marginBottom: '4px' }}>
                STATUS
              </div>
              <div
                style={{
                  fontSize: '13px',
                  fontWeight: 'bold',
                  color: getStatusColor(),
                }}
              >
                {metrics.isConnected ? '✅ Connected' : '❌ Disconnected'}
              </div>
            </div>

            {/* Uptime */}
            <div>
              <div style={{ fontSize: '11px', color: '#9ca3af', marginBottom: '4px' }}>
                UPTIME
              </div>
              <div
                style={{
                  fontSize: '13px',
                  fontWeight: 'bold',
                  color: '#1f2937',
                }}
              >
                {formatUptime(metrics.connectionUptime)}
              </div>
            </div>

            {/* Message Count */}
            <div>
              <div style={{ fontSize: '11px', color: '#9ca3af', marginBottom: '4px' }}>
                MESSAGES
              </div>
              <div
                style={{
                  fontSize: '13px',
                  fontWeight: 'bold',
                  color: '#1f2937',
                }}
              >
                {metrics.messageCount}
              </div>
            </div>

            {/* Reconnect Attempts */}
            <div>
              <div style={{ fontSize: '11px', color: '#9ca3af', marginBottom: '4px' }}>
                RECONNECT ATTEMPTS
              </div>
              <div
                style={{
                  fontSize: '13px',
                  fontWeight: 'bold',
                  color: metrics.reconnectAttempts > 0 ? '#f59e0b' : '#1f2937',
                }}
              >
                {metrics.reconnectAttempts}
              </div>
            </div>

            {/* Last Message */}
            <div style={{ gridColumn: '1 / -1' }}>
              <div style={{ fontSize: '11px', color: '#9ca3af', marginBottom: '4px' }}>
                LAST MESSAGE
              </div>
              <div
                style={{
                  fontSize: '13px',
                  color: '#1f2937',
                }}
              >
                {metrics.lastMessageTime
                  ? new Date(metrics.lastMessageTime).toLocaleTimeString()
                  : 'Never'}
              </div>
            </div>
          </div>

          {/* Info Message */}
          <div
            style={{
              marginTop: '12px',
              padding: '10px',
              background: '#eff6ff',
              borderRadius: '6px',
              fontSize: '12px',
              color: '#1e40af',
            }}
          >
            📡 Real-time updates are {metrics.isConnected ? '✅ enabled' : '⏸️ disabled'}. 
            {!metrics.isConnected && ' Attempting to reconnect...'}
          </div>
        </div>
      )}

      <style>{`
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

export default WebSocketConnectionStatus;
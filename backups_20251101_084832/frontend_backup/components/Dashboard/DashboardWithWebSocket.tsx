/**
 * DashboardWithWebSocket Component
 * Base component for role-based dashboards with real-time WebSocket updates
 */

import React, { useCallback, useState } from 'react';
import { useApp } from '../../contexts/AppContext';
import useWebSocket, { WebSocketMessage } from '../../hooks/useWebSocket';
import RealtimeNotificationPanel from '../RealtimeNotificationPanel';
import WebSocketConnectionStatus, { ConnectionMetrics } from '../WebSocketConnectionStatus';

interface DashboardMetric {
  key: string;
  label: string;
  value: any;
  unit?: string;
  icon?: string;
  color?: string;
  trend?: 'up' | 'down' | 'stable';
  trendValue?: number;
}

interface DashboardWithWebSocketProps {
  title: string;
  icon?: string;
  roomId?: string;
  metrics: DashboardMetric[];
  onMetricUpdate?: (key: string, value: any) => void;
  children?: React.ReactNode;
}

export const DashboardWithWebSocket: React.FC<DashboardWithWebSocketProps> = ({
  title,
  icon = '📊',
  roomId = 'default',
  metrics: initialMetrics,
  onMetricUpdate,
  children,
}) => {
  const { user } = useApp();
  const [metrics, setMetrics] = useState<DashboardMetric[]>(initialMetrics);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());

  const token = localStorage.getItem('auth-token') || '';

  const handleWebSocketMessage = useCallback((message: WebSocketMessage) => {
    if (message.type === 'dashboard_update' && message.data?.metric_name) {
      const { metric_name, metric_value } = message.data;

      setMetrics(prev =>
        prev.map(m =>
          m.key === metric_name
            ? { ...m, value: metric_value }
            : m
        )
      );

      setLastUpdate(new Date());
      onMetricUpdate?.(metric_name, metric_value);
    }
  }, [onMetricUpdate]);

  const { isConnected, metrics: wsMetrics, send } = useWebSocket({
    roomId,
    token,
    onMessage: handleWebSocketMessage,
  });

  const MetricCard: React.FC<{ metric: DashboardMetric }> = ({ metric }) => {
    const trendIcon = metric.trend === 'up'
      ? '📈' : metric.trend === 'down'
        ? '📉' : '➡️';

    return (
      <div
        style={{
          background: 'white',
          borderRadius: '12px',
          padding: '16px',
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
          border: '1px solid #e5e7eb',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Animated border */}
        {isConnected && (
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              height: '2px',
              background: 'linear-gradient(90deg, #3b82f6, #10b981, #3b82f6)',
              backgroundSize: '200% 100%',
              animation: 'gradientShift 2s infinite',
            }}
          />
        )}

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginTop: '4px' }}>
          <div>
            <div style={{ fontSize: '12px', color: '#9ca3af', marginBottom: '6px' }}>
              {metric.icon} {metric.label}
            </div>
            <div
              style={{
                fontSize: '24px',
                fontWeight: 'bold',
                color: metric.color || '#1f2937',
              }}
            >
              {metric.value}
              {metric.unit && <span style={{ fontSize: '16px', marginLeft: '4px' }}>{metric.unit}</span>}
            </div>
          </div>
          {metric.trendValue !== undefined && (
            <div
              style={{
                fontSize: '16px',
                color: metric.trend === 'up' ? '#10b981' : metric.trend === 'down' ? '#ef4444' : '#6b7280',
              }}
            >
              {trendIcon} {Math.abs(metric.trendValue)}%
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        padding: '20px',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      }}
    >
      <div
        style={{
          maxWidth: '1400px',
          margin: '0 auto',
          background: 'rgba(255, 255, 255, 0.95)',
          borderRadius: '20px',
          boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
          overflow: 'hidden',
        }}
      >
        {/* Header */}
        <header
          style={{
            background: 'linear-gradient(135deg, #2c3e50 0%, #3498db 100%)',
            color: 'white',
            padding: '20px 30px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
            <span style={{ fontSize: '28px' }}>{icon}</span>
            <div>
              <div style={{ fontSize: '24px', fontWeight: 'bold' }}>{title}</div>
              <div style={{ fontSize: '12px', opacity: 0.8 }}>
                Last updated: {lastUpdate.toLocaleTimeString()}
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
            {/* Connection Status */}
            <div style={{ fontSize: '12px' }}>
              {isConnected ? '🟢 Real-time' : '🔴 Offline'}
            </div>

            {/* Notification Panel */}
            <RealtimeNotificationPanel isConnected={isConnected} onMessage={handleWebSocketMessage} />

            {/* User Info */}
            {user && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div
                  style={{
                    width: '40px',
                    height: '40px',
                    background: '#e74c3c',
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 'bold',
                    color: 'white',
                  }}
                >
                  {user.email?.[0]?.toUpperCase() || 'U'}
                </div>
                <div style={{ color: 'white' }}>
                  <div style={{ fontSize: '14px', fontWeight: '500' }}>{user.name || user.email}</div>
                  <div style={{ fontSize: '12px', opacity: 0.8, textTransform: 'capitalize' }}>{user.role}</div>
                </div>
              </div>
            )}
          </div>
        </header>

        {/* Main Content */}
        <div style={{ padding: '30px' }}>
          {/* WebSocket Status Panel */}
          <div style={{ marginBottom: '24px' }}>
            <WebSocketConnectionStatus metrics={wsMetrics} roomId={roomId} />
          </div>

          {/* Metrics Grid */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
              gap: '20px',
              marginBottom: '30px',
            }}
          >
            {metrics.map(metric => (
              <MetricCard key={metric.key} metric={metric} />
            ))}
          </div>

          {/* Custom Content */}
          {children}
        </div>
      </div>

      <style>{`
        @keyframes gradientShift {
          0% {
            backgroundPosition: 0% 50%;
          }
          50% {
            backgroundPosition: 100% 50%;
          }
          100% {
            backgroundPosition: 0% 50%;
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

export default DashboardWithWebSocket;
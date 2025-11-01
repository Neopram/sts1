/**
 * Enhanced DashboardCharterer Component
 * Real-time dashboard for Charterer role with WebSocket integration
 */

import React, { useState, useEffect } from 'react';
import DashboardWithWebSocket, { DashboardMetric } from './DashboardWithWebSocket';

interface DemurrageData {
  vesselName: string;
  currentRate: number;
  escalationLevel: number;
  estimatedExposure: number;
  status: 'normal' | 'warning' | 'critical';
}

export const DashboardChartererEnhanced: React.FC = () => {
  const [demurrageAlerts, setDemurrageAlerts] = useState<DemurrageData[]>([]);
  const [metrics, setMetrics] = useState<DashboardMetric[]>([
    {
      key: 'active_operations',
      label: 'Active Operations',
      value: 12,
      icon: '⛴️',
      color: '#3b82f6',
      trend: 'up',
      trendValue: 5,
    },
    {
      key: 'total_demurrage',
      label: 'Total Demurrage Exposure',
      value: '$245,600',
      icon: '💰',
      color: '#ef4444',
      unit: 'USD',
      trend: 'down',
      trendValue: 12,
    },
    {
      key: 'pending_approvals',
      label: 'Pending Approvals',
      value: 8,
      icon: '⏳',
      color: '#f59e0b',
      trend: 'up',
      trendValue: 2,
    },
    {
      key: 'compliance_score',
      label: 'Compliance Score',
      value: '98.5%',
      icon: '✅',
      color: '#10b981',
      trend: 'stable',
    },
    {
      key: 'vessels_at_risk',
      label: 'Vessels at Risk',
      value: 3,
      icon: '⚠️',
      color: '#ef4444',
    },
    {
      key: 'completed_operations',
      label: 'Completed Today',
      value: 5,
      icon: '📋',
      color: '#8b5cf6',
    },
  ]);

  const handleMetricUpdate = (key: string, value: any) => {
    console.log(`📊 Metric updated: ${key} = ${value}`);
    // Update specific metric
    setMetrics(prev =>
      prev.map(m => m.key === key ? { ...m, value } : m)
    );
  };

  return (
    <DashboardWithWebSocket
      title="Charterer Dashboard"
      icon="⛴️"
      roomId="charterer_room"
      metrics={metrics}
      onMetricUpdate={handleMetricUpdate}
    >
      {/* Demurrage Alerts Section */}
      <div style={{ marginTop: '30px' }}>
        <h2 style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '15px', color: '#1f2937' }}>
          🚨 Active Demurrage Alerts
        </h2>
        <div
          style={{
            display: 'grid',
            gap: '12px',
          }}
        >
          {[
            {
              vessel: 'MV Pacific Express',
              rate: 1.8,
              level: 2,
              exposure: 45000,
              status: 'warning' as const,
            },
            {
              vessel: 'MT Atlantic Star',
              rate: 2.1,
              level: 3,
              exposure: 62000,
              status: 'critical' as const,
            },
            {
              vessel: 'Maersk Sealand',
              rate: 1.2,
              level: 1,
              exposure: 28000,
              status: 'normal' as const,
            },
          ].map((alert, idx) => (
            <div
              key={idx}
              style={{
                background: 'white',
                borderLeft: `4px solid ${
                  alert.status === 'critical'
                    ? '#ef4444'
                    : alert.status === 'warning'
                      ? '#f59e0b'
                      : '#10b981'
                }`,
                borderRadius: '8px',
                padding: '16px',
                display: 'grid',
                gridTemplateColumns: 'repeat(4, 1fr)',
                gap: '16px',
                alignItems: 'center',
              }}
            >
              <div>
                <div style={{ fontSize: '12px', color: '#9ca3af', marginBottom: '4px' }}>VESSEL</div>
                <div style={{ fontSize: '14px', fontWeight: 'bold', color: '#1f2937' }}>{alert.vessel}</div>
              </div>
              <div>
                <div style={{ fontSize: '12px', color: '#9ca3af', marginBottom: '4px' }}>RATE/DAY</div>
                <div style={{ fontSize: '14px', fontWeight: 'bold', color: '#ef4444' }}>${alert.rate}k</div>
              </div>
              <div>
                <div style={{ fontSize: '12px', color: '#9ca3af', marginBottom: '4px' }}>ESCALATION</div>
                <div style={{ fontSize: '14px', fontWeight: 'bold', color: '#f59e0b' }}>Level {alert.level}</div>
              </div>
              <div>
                <div style={{ fontSize: '12px', color: '#9ca3af', marginBottom: '4px' }}>EXPOSURE</div>
                <div style={{ fontSize: '14px', fontWeight: 'bold', color: '#8b5cf6' }}>
                  ${(alert.exposure / 1000).toFixed(0)}k
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Quick Actions */}
      <div style={{ marginTop: '30px' }}>
        <h2 style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '15px', color: '#1f2937' }}>
          🎯 Quick Actions
        </h2>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
            gap: '12px',
          }}
        >
          {['Request Extension', 'Approve Operation', 'Review Documents', 'Export Report'].map((action, idx) => (
            <button
              key={idx}
              style={{
                padding: '12px 16px',
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                fontWeight: '500',
                fontSize: '13px',
                transition: 'all 0.2s',
              }}
              onMouseOver={e => {
                (e.currentTarget as HTMLElement).style.transform = 'translateY(-2px)';
                (e.currentTarget as HTMLElement).style.boxShadow = '0 8px 16px rgba(102, 126, 234, 0.3)';
              }}
              onMouseOut={e => {
                (e.currentTarget as HTMLElement).style.transform = 'translateY(0)';
                (e.currentTarget as HTMLElement).style.boxShadow = 'none';
              }}
            >
              {action}
            </button>
          ))}
        </div>
      </div>
    </DashboardWithWebSocket>
  );
};

export default DashboardChartererEnhanced;
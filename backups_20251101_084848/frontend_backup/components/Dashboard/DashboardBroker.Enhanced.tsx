/**
 * Enhanced DashboardBroker Component
 * Real-time dashboard for Broker role with WebSocket integration
 */

import React, { useState } from 'react';
import DashboardWithWebSocket, { DashboardMetric } from './DashboardWithWebSocket';

export const DashboardBrokerEnhanced: React.FC = () => {
  const [metrics, setMetrics] = useState<DashboardMetric[]>([
    {
      key: 'active_listings',
      label: 'Active Listings',
      value: 34,
      icon: '📑',
      color: '#3b82f6',
      trend: 'up',
      trendValue: 8,
    },
    {
      key: 'commission_pending',
      label: 'Commission Pending',
      value: '$156,900',
      icon: '💵',
      color: '#10b981',
      unit: 'USD',
      trend: 'up',
      trendValue: 15,
    },
    {
      key: 'deals_closed',
      label: 'Deals Closed (Month)',
      value: 18,
      icon: '✅',
      color: '#8b5cf6',
      trend: 'up',
      trendValue: 25,
    },
    {
      key: 'client_satisfaction',
      label: 'Client Satisfaction',
      value: '9.2/10',
      icon: '⭐',
      color: '#f59e0b',
    },
    {
      key: 'pending_negotiations',
      label: 'Negotiations in Progress',
      value: 12,
      icon: '🤝',
      color: '#06b6d4',
    },
    {
      key: 'market_score',
      label: 'Market Performance',
      value: '97%',
      icon: '📈',
      color: '#10b981',
      trend: 'up',
      trendValue: 3,
    },
  ]);

  const handleMetricUpdate = (key: string, value: any) => {
    console.log(`📊 Broker metric updated: ${key} = ${value}`);
    setMetrics(prev =>
      prev.map(m => m.key === key ? { ...m, value } : m)
    );
  };

  return (
    <DashboardWithWebSocket
      title="Broker Dashboard"
      icon="🤝"
      roomId="broker_room"
      metrics={metrics}
      onMetricUpdate={handleMetricUpdate}
    >
      {/* Recent Transactions */}
      <div style={{ marginTop: '30px' }}>
        <h2 style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '15px', color: '#1f2937' }}>
          📊 Recent Transactions
        </h2>
        <div
          style={{
            background: 'white',
            borderRadius: '12px',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
            overflow: 'hidden',
          }}
        >
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#f9fafb', borderBottom: '2px solid #e5e7eb' }}>
                <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '13px', fontWeight: '600', color: '#6b7280' }}>
                  Transaction
                </th>
                <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '13px', fontWeight: '600', color: '#6b7280' }}>
                  Party
                </th>
                <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '13px', fontWeight: '600', color: '#6b7280' }}>
                  Amount
                </th>
                <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '13px', fontWeight: '600', color: '#6b7280' }}>
                  Status
                </th>
              </tr>
            </thead>
            <tbody>
              {[
                { txn: 'STS-2024-001', party: 'Global Shipping Inc.', amount: '$125,000', status: 'Completed' },
                { txn: 'STS-2024-002', party: 'Pacific Trading', amount: '$89,500', status: 'In Progress' },
                { txn: 'STS-2024-003', party: 'Atlantic Partners', amount: '$156,900', status: 'Pending Review' },
                { txn: 'STS-2024-004', party: 'Asia Maritime', amount: '$202,300', status: 'Completed' },
              ].map((row, idx) => (
                <tr
                  key={idx}
                  style={{
                    borderBottom: '1px solid #e5e7eb',
                    background: idx % 2 === 0 ? 'white' : '#f9fafb',
                  }}
                >
                  <td style={{ padding: '12px 16px', fontSize: '13px', color: '#1f2937', fontWeight: '500' }}>
                    {row.txn}
                  </td>
                  <td style={{ padding: '12px 16px', fontSize: '13px', color: '#6b7280' }}>
                    {row.party}
                  </td>
                  <td style={{ padding: '12px 16px', fontSize: '13px', fontWeight: 'bold', color: '#10b981' }}>
                    {row.amount}
                  </td>
                  <td style={{ padding: '12px 16px', fontSize: '13px' }}>
                    <span
                      style={{
                        padding: '4px 8px',
                        borderRadius: '4px',
                        background:
                          row.status === 'Completed'
                            ? '#d1fae5'
                            : row.status === 'In Progress'
                              ? '#fef3c7'
                              : '#fee2e2',
                        color:
                          row.status === 'Completed'
                            ? '#065f46'
                            : row.status === 'In Progress'
                              ? '#92400e'
                              : '#991b1b',
                        fontSize: '12px',
                        fontWeight: '500',
                      }}
                    >
                      {row.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Commission Breakdown */}
      <div style={{ marginTop: '30px' }}>
        <h2 style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '15px', color: '#1f2937' }}>
          💰 Commission Breakdown
        </h2>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: '16px',
          }}
        >
          {[
            { label: 'Earned (Current)', value: '$156,900', color: '#10b981' },
            { label: 'Pending Payment', value: '$42,300', color: '#f59e0b' },
            { label: 'Paid (YTD)', value: '$1,245,600', color: '#3b82f6' },
          ].map((item, idx) => (
            <div
              key={idx}
              style={{
                background: 'white',
                borderRadius: '12px',
                padding: '20px',
                textAlign: 'center',
                boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
              }}
            >
              <div style={{ fontSize: '12px', color: '#9ca3af', marginBottom: '8px' }}>
                {item.label}
              </div>
              <div style={{ fontSize: '24px', fontWeight: 'bold', color: item.color }}>
                {item.value}
              </div>
            </div>
          ))}
        </div>
      </div>
    </DashboardWithWebSocket>
  );
};

export default DashboardBrokerEnhanced;
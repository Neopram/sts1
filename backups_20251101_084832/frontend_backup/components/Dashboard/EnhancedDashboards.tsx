/**
 * Enhanced Dashboards for all roles
 * Buyer, Owner, Inspector, Seller, Viewer
 */

import React, { useState } from 'react';
import DashboardWithWebSocket, { DashboardMetric } from './DashboardWithWebSocket';

/* ==================== BUYER DASHBOARD ==================== */
export const DashboardBuyerEnhanced: React.FC = () => {
  const [metrics] = useState<DashboardMetric[]>([
    {
      key: 'active_bids',
      label: 'Active Bids',
      value: 24,
      icon: '🏷️',
      color: '#3b82f6',
      trend: 'up',
      trendValue: 6,
    },
    {
      key: 'total_investment',
      label: 'Total Investment',
      value: '$2.4M',
      icon: '💼',
      color: '#10b981',
      unit: 'USD',
    },
    {
      key: 'acquisitions',
      label: 'Acquisitions (Month)',
      value: 8,
      icon: '📦',
      color: '#8b5cf6',
      trend: 'up',
      trendValue: 12,
    },
    {
      key: 'avg_price',
      label: 'Avg Price per Unit',
      value: '$312k',
      icon: '💵',
      color: '#f59e0b',
    },
    {
      key: 'portfolio_value',
      label: 'Portfolio Value',
      value: '$12.5M',
      icon: '📊',
      color: '#06b6d4',
    },
    {
      key: 'risk_score',
      label: 'Risk Score',
      value: '34%',
      icon: '⚠️',
      color: '#ef4444',
    },
  ]);

  return (
    <DashboardWithWebSocket
      title="Buyer Dashboard"
      icon="🛒"
      roomId="buyer_room"
      metrics={metrics}
    >
      <div style={{ marginTop: '30px', color: '#6b7280', fontSize: '14px' }}>
        👋 Welcome Buyer! Your portfolio is performing well with real-time updates enabled.
      </div>
    </DashboardWithWebSocket>
  );
};

/* ==================== OWNER DASHBOARD ==================== */
export const DashboardOwnerEnhanced: React.FC = () => {
  const [metrics] = useState<DashboardMetric[]>([
    {
      key: 'vessels_owned',
      label: 'Vessels Owned',
      value: 12,
      icon: '⛵',
      color: '#3b82f6',
    },
    {
      key: 'revenue_generated',
      label: 'Revenue Generated',
      value: '$4.2M',
      icon: '💰',
      color: '#10b981',
      unit: 'USD',
      trend: 'up',
      trendValue: 18,
    },
    {
      key: 'maintenance_status',
      label: 'In Maintenance',
      value: 2,
      icon: '🔧',
      color: '#f59e0b',
    },
    {
      key: 'utilization_rate',
      label: 'Utilization Rate',
      value: '94.2%',
      icon: '📈',
      color: '#10b981',
      trend: 'stable',
    },
    {
      key: 'pending_repairs',
      label: 'Pending Repairs',
      value: 5,
      icon: '⚙️',
      color: '#ef4444',
    },
    {
      key: 'fleet_efficiency',
      label: 'Fleet Efficiency',
      value: '97.8%',
      icon: '✅',
      color: '#10b981',
    },
  ]);

  return (
    <DashboardWithWebSocket
      title="Owner Dashboard"
      icon="👨‍💼"
      roomId="owner_room"
      metrics={metrics}
    >
      <div style={{ marginTop: '30px', color: '#6b7280', fontSize: '14px' }}>
        ⚓ Fleet overview with real-time monitoring and instant notifications.
      </div>
    </DashboardWithWebSocket>
  );
};

/* ==================== INSPECTOR DASHBOARD ==================== */
export const DashboardInspectorEnhanced: React.FC = () => {
  const [metrics] = useState<DashboardMetric[]>([
    {
      key: 'inspections_pending',
      label: 'Pending Inspections',
      value: 16,
      icon: '🔍',
      color: '#f59e0b',
      trend: 'up',
      trendValue: 3,
    },
    {
      key: 'inspections_completed',
      label: 'Completed (Month)',
      value: 42,
      icon: '✓',
      color: '#10b981',
    },
    {
      key: 'compliance_rate',
      label: 'Compliance Rate',
      value: '96.5%',
      icon: '📋',
      color: '#3b82f6',
      trend: 'up',
      trendValue: 2,
    },
    {
      key: 'violations_found',
      label: 'Violations Found',
      value: 8,
      icon: '⚠️',
      color: '#ef4444',
    },
    {
      key: 'avg_inspection_time',
      label: 'Avg Time/Inspection',
      value: '2h 15m',
      icon: '⏱️',
      color: '#8b5cf6',
    },
    {
      key: 'report_accuracy',
      label: 'Report Accuracy',
      value: '99.2%',
      icon: '📊',
      color: '#10b981',
    },
  ]);

  return (
    <DashboardWithWebSocket
      title="Inspector Dashboard"
      icon="🔎"
      roomId="inspector_room"
      metrics={metrics}
    >
      <div style={{ marginTop: '30px', color: '#6b7280', fontSize: '14px' }}>
        🛡️ Real-time inspection tracking with compliance monitoring.
      </div>
    </DashboardWithWebSocket>
  );
};

/* ==================== SELLER DASHBOARD ==================== */
export const DashboardSellerEnhanced: React.FC = () => {
  const [metrics] = useState<DashboardMetric[]>([
    {
      key: 'active_listings',
      label: 'Active Listings',
      value: 28,
      icon: '📋',
      color: '#3b82f6',
      trend: 'up',
      trendValue: 5,
    },
    {
      key: 'total_sales',
      label: 'Total Sales (YTD)',
      value: '$8.9M',
      icon: '💵',
      color: '#10b981',
      unit: 'USD',
    },
    {
      key: 'conversion_rate',
      label: 'Conversion Rate',
      value: '34.5%',
      icon: '📊',
      color: '#8b5cf6',
      trend: 'up',
      trendValue: 7,
    },
    {
      key: 'avg_sale_price',
      label: 'Avg Sale Price',
      value: '$456k',
      icon: '💰',
      color: '#f59e0b',
    },
    {
      key: 'pending_offers',
      label: 'Pending Offers',
      value: 12,
      icon: '🤝',
      color: '#06b6d4',
    },
    {
      key: 'customer_rating',
      label: 'Customer Rating',
      value: '4.8/5',
      icon: '⭐',
      color: '#f59e0b',
    },
  ]);

  return (
    <DashboardWithWebSocket
      title="Seller Dashboard"
      icon="💼"
      roomId="seller_room"
      metrics={metrics}
    >
      <div style={{ marginTop: '30px', color: '#6b7280', fontSize: '14px' }}>
        🎯 Sales performance tracking with real-time offer notifications.
      </div>
    </DashboardWithWebSocket>
  );
};

/* ==================== VIEWER DASHBOARD ==================== */
export const DashboardViewerEnhanced: React.FC = () => {
  const [metrics] = useState<DashboardMetric[]>([
    {
      key: 'market_overview',
      label: 'Market Overview',
      value: '12.5k',
      icon: '📊',
      color: '#3b82f6',
      unit: 'listings',
    },
    {
      key: 'price_index',
      label: 'Price Index',
      value: '142.8',
      icon: '📈',
      color: '#10b981',
      trend: 'up',
      trendValue: 3,
    },
    {
      key: 'market_activity',
      label: 'Market Activity',
      value: 'High',
      icon: '⚡',
      color: '#f59e0b',
    },
    {
      key: 'trending_items',
      label: 'Trending Items',
      value: '54',
      icon: '🔥',
      color: '#ef4444',
    },
    {
      key: 'featured_deals',
      label: 'Featured Deals',
      value: '18',
      icon: '🏷️',
      color: '#8b5cf6',
    },
    {
      key: 'market_sentiment',
      label: 'Market Sentiment',
      value: 'Bullish',
      icon: '📊',
      color: '#10b981',
    },
  ]);

  return (
    <DashboardWithWebSocket
      title="Market Overview"
      icon="👁️"
      roomId="viewer_room"
      metrics={metrics}
    >
      <div style={{ marginTop: '30px', color: '#6b7280', fontSize: '14px' }}>
        👀 Real-time market insights and trending opportunities.
      </div>
    </DashboardWithWebSocket>
  );
};

export default {
  DashboardBuyerEnhanced,
  DashboardOwnerEnhanced,
  DashboardInspectorEnhanced,
  DashboardSellerEnhanced,
  DashboardViewerEnhanced,
};
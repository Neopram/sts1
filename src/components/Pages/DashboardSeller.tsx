import React from 'react';
import { DashboardBase } from '../Dashboard/DashboardBase';
import { KPICard } from '../Dashboard/KPICard';
import { AlertBanner } from '../Dashboard/AlertBanner';
import { Loading } from '../Common/Loading';
import { Alert } from '../Common/Alert';
import { useDashboardData, useDashboardAccess } from '../../hooks/useDashboardData';

// Data Interfaces
interface SalesRoom {
  room_id: string;
  room_title: string;
  quantity: number;
  unit_price: number;
  total_value: number;
  status: string;
}

interface SalesMetrics {
  total_volume_bbl: number;
  total_revenue: number;
  by_room: SalesRoom[];
}

interface AveragePrice {
  pricing_period: string;
  average_price: number;
  market_trend: string;
}

interface PricingTrend {
  average_deal_price: number;
  trend_data: AveragePrice[];
}

interface NegotiationDeal {
  room_id: string;
  room_title: string;
  buyer_party: string;
  quantity: number;
  proposed_price: number;
  status: string;
  days_in_negotiation: number;
}

interface BuyerPerformance {
  buyer_name: string;
  total_deals: number;
  approval_rate: number;
  avg_response_time_hours: number;
}

interface SellerDashboard {
  sales: SalesMetrics;
  pricing: PricingTrend;
  negotiations: NegotiationDeal[];
  buyer_performance: BuyerPerformance[];
}

export const DashboardSeller: React.FC = () => {
  const { hasAccess } = useDashboardAccess('seller');
  const { data: dashboard, loading, error } = useDashboardData<SellerDashboard>(
    '/dashboard/seller/overview',
    {
      enabled: hasAccess,
      refetchInterval: 30000, // Auto-refetch every 30 seconds
    }
  );



  // Check access
  if (!hasAccess) {
    return (
      <DashboardBase title="Access Denied" icon="🚫">
        <Alert
          variant="error"
          title="Unauthorized"
          message="You don't have permission to access this dashboard. Only sellers can view this page."
        />
      </DashboardBase>
    );
  }

  // Show loading
  if (loading) {
    return (
      <DashboardBase title="Seller Portal" icon="📦" subtitle="Sales Pipeline & Pricing Management">
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
          <Loading message="Loading your sales data..." />
        </div>
      </DashboardBase>
    );
  }

  // Handle error
  if (error || !dashboard) {
    return (
      <DashboardBase title="Seller Portal" icon="📦" subtitle="Sales Pipeline & Pricing Management">
        <Alert
          variant="error"
          title="Error Loading Dashboard"
          message={error || 'Failed to load dashboard data'}
        />
      </DashboardBase>
    );
  }

  // Safe destructuring with defaults
  const {
    sales = { total_volume_bbl: 0, total_revenue: 0, by_room: [] },
    pricing = { average_deal_price: 0, trend_data: [] },
    negotiations = [],
    buyer_performance = [],
  } = dashboard;

  // Helper function to get negotiation status color
  const getStatusColor = (status: string): string => {
    switch (status?.toLowerCase()) {
      case 'completed': return '#27ae60';
      case 'in_progress': return '#3498db';
      case 'stalled': return '#e74c3c';
      case 'pending_approval': return '#f39c12';
      default: return '#95a5a6';
    }
  };



  // Filter visible alerts
  const visibleAlerts: Array<{ id: string; type: 'critical' | 'warning' | 'info'; title: string; message: string }> = [];

  if (negotiations.filter(n => n.status === 'stalled').length > 0) {
    visibleAlerts.push({
      id: 'stalled-negotiations',
      type: 'critical',
      title: 'Stalled Negotiations',
      message: `${negotiations.filter(n => n.status === 'stalled').length} negotiation(s) are stalled. Buyer follow-up needed.`,
    });
  }

  if (negotiations.filter(n => n.days_in_negotiation > 10).length > 0) {
    visibleAlerts.push({
      id: 'long-negotiations',
      type: 'warning',
      title: 'Extended Negotiations',
      message: `${negotiations.filter(n => n.days_in_negotiation > 10).length} deal(s) in negotiation for >10 days.`,
    });
  }

  const displayedAlerts = visibleAlerts;

  return (
    <DashboardBase title="Seller Portal" icon="📦" subtitle="Sales Pipeline & Pricing Management">
      <div style={{ padding: '20px 30px 30px 30px' }}>
        {/* Alerts */}
        {displayedAlerts.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '20px' }}>
            {displayedAlerts.map(alert => (
              <AlertBanner
                key={alert.id}
                type={alert.type}
                title={alert.title}
                message={alert.message}
              />
            ))}
          </div>
        )}

        {/* KPI Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px', marginBottom: '30px' }}>
          <KPICard
            title="Total Sales Volume"
            value={`${(sales.total_volume_bbl / 1000).toFixed(1)}K BBL`}
            subtitle="Barrels"
            status="info"
            icon="📦"
            trend="up"
            trendValue={12}
          />

          <KPICard
            title="Revenue Generated"
            value={`$${(sales.total_revenue / 1000000).toFixed(2)}M`}
            subtitle="USD"
            status="success"
            icon="💰"
            trend="up"
            trendValue={8}
          />

          <KPICard
            title="Average Deal Value"
            value={`$${pricing.average_deal_price.toLocaleString()}`}
            subtitle="Per Transaction"
            status="success"
            icon="💵"
            trend={pricing.trend_data[0]?.market_trend === 'up' ? 'up' : 'down'}
            trendValue={pricing.trend_data[0]?.market_trend === 'up' ? 5 : -2}
          />

          <KPICard
            title="Active Negotiations"
            value={negotiations.length.toString()}
            subtitle="Open Deals"
            status={negotiations.length > 5 ? 'warning' : 'info'}
            icon="🤝"
            trend="neutral"
            trendValue={negotiations.filter(n => n.status === 'in_progress').length}
          />
        </div>

        {/* Sales Pipeline Section */}
        <div style={{ background: '#f8f9fa', borderRadius: '12px', padding: '20px', marginBottom: '20px' }}>
          <div style={{ marginBottom: '15px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: '600', color: '#2c3e50', margin: '0 0 5px 0' }}>📋 Sales Pipeline</h3>
            <p style={{ fontSize: '13px', color: '#7f8c8d', margin: 0 }}>Current and completed sales transactions</p>
          </div>

          {sales.by_room.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '20px', color: '#95a5a6' }}>
              <p>No sales data available</p>
            </div>
          ) : (
            <div style={{ display: 'grid', gap: '10px', maxHeight: '350px', overflowY: 'auto' }}>
              {sales.by_room.slice(0, 6).map((room) => (
                <div key={room.room_id} style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '12px',
                  background: 'white',
                  borderRadius: '8px',
                  borderLeft: `4px solid ${getStatusColor(room.status)}`,
                }}>
                  <div style={{ flex: 1 }}>
                    <p style={{ margin: '0 0 3px 0', fontSize: '14px', fontWeight: '500', color: '#2c3e50' }}>
                      {room.room_title}
                    </p>
                    <p style={{ margin: 0, fontSize: '12px', color: '#7f8c8d' }}>
                      {room.quantity.toLocaleString()} BBL @ ${room.unit_price.toLocaleString('en-US', { maximumFractionDigits: 2 })}
                    </p>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <p style={{ margin: '0 0 3px 0', fontSize: '14px', fontWeight: '600', color: '#27ae60' }}>
                      ${(room.total_value / 1000).toFixed(1)}K
                    </p>
                    <span style={{
                      display: 'inline-block',
                      padding: '3px 8px',
                      fontSize: '11px',
                      fontWeight: '500',
                      borderRadius: '4px',
                      background: getStatusColor(room.status) + '20',
                      color: getStatusColor(room.status),
                    }}>
                      {room.status}
                    </span>
                  </div>
                </div>
              ))}
              {sales.by_room.length > 6 && (
                <div style={{ textAlign: 'center', padding: '10px', color: '#3498db', fontSize: '13px', fontWeight: '500' }}>
                  +{sales.by_room.length - 6} more sales
                </div>
              )}
            </div>
          )}
        </div>

        {/* Negotiations Status Section */}
        <div style={{ background: '#f8f9fa', borderRadius: '12px', padding: '20px', marginBottom: '20px' }}>
          <div style={{ marginBottom: '15px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: '600', color: '#2c3e50', margin: '0 0 5px 0' }}>🤝 Active Negotiations</h3>
            <p style={{ fontSize: '13px', color: '#7f8c8d', margin: 0 }}>Deals in progress with buyers</p>
          </div>

          {negotiations.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '20px', color: '#95a5a6' }}>
              <p>No active negotiations</p>
            </div>
          ) : (
            <div style={{ display: 'grid', gap: '10px', maxHeight: '350px', overflowY: 'auto' }}>
              {negotiations.slice(0, 6).map((deal) => (
                <div key={deal.room_id} style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '12px',
                  background: 'white',
                  borderRadius: '8px',
                  borderLeft: `4px solid ${getStatusColor(deal.status)}`,
                }}>
                  <div style={{ flex: 1 }}>
                    <p style={{ margin: '0 0 3px 0', fontSize: '14px', fontWeight: '500', color: '#2c3e50' }}>
                      {deal.buyer_party}
                    </p>
                    <p style={{ margin: '0 0 3px 0', fontSize: '12px', color: '#7f8c8d' }}>
                      {deal.quantity.toLocaleString()} BBL @ ${deal.proposed_price.toLocaleString('en-US', { maximumFractionDigits: 2 })}
                    </p>
                    <p style={{ margin: 0, fontSize: '11px', color: '#95a5a6' }}>
                      {deal.days_in_negotiation}d in negotiation
                    </p>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <span style={{
                      display: 'inline-block',
                      padding: '4px 10px',
                      fontSize: '11px',
                      fontWeight: '600',
                      borderRadius: '4px',
                      background: getStatusColor(deal.status) + '20',
                      color: getStatusColor(deal.status),
                    }}>
                      {deal.status.replace(/_/g, ' ')}
                    </span>
                  </div>
                </div>
              ))}
              {negotiations.length > 6 && (
                <div style={{ textAlign: 'center', padding: '10px', color: '#3498db', fontSize: '13px', fontWeight: '500' }}>
                  +{negotiations.length - 6} more deals
                </div>
              )}
            </div>
          )}
        </div>

        {/* Buyer Performance Section */}
        <div style={{ background: '#f8f9fa', borderRadius: '12px', padding: '20px' }}>
          <div style={{ marginBottom: '15px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: '600', color: '#2c3e50', margin: '0 0 5px 0' }}>⭐ Buyer Performance</h3>
            <p style={{ fontSize: '13px', color: '#7f8c8d', margin: 0 }}>Track buyer metrics and engagement</p>
          </div>

          {buyer_performance.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '20px', color: '#95a5a6' }}>
              <p>No buyer performance data</p>
            </div>
          ) : (
            <div style={{ display: 'grid', gap: '10px', maxHeight: '300px', overflowY: 'auto' }}>
              {buyer_performance.slice(0, 8).map((buyer, idx) => (
                <div key={idx} style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '12px',
                  background: 'white',
                  borderRadius: '8px',
                  borderLeft: `4px solid ${buyer.approval_rate >= 80 ? '#27ae60' : buyer.approval_rate >= 60 ? '#f39c12' : '#e74c3c'}`,
                }}>
                  <div style={{ flex: 1 }}>
                    <p style={{ margin: '0 0 3px 0', fontSize: '14px', fontWeight: '500', color: '#2c3e50' }}>
                      {buyer.buyer_name}
                    </p>
                    <p style={{ margin: 0, fontSize: '12px', color: '#7f8c8d' }}>
                      {buyer.total_deals} deals • Avg response: {buyer.avg_response_time_hours}h
                    </p>
                  </div>
                  <div style={{
                    padding: '6px 12px',
                    background: buyer.approval_rate >= 80 ? '#d5f4e6' : buyer.approval_rate >= 60 ? '#fdeaa8' : '#fadbd8',
                    color: buyer.approval_rate >= 80 ? '#27ae60' : buyer.approval_rate >= 60 ? '#d68910' : '#c0392b',
                    borderRadius: '6px',
                    fontSize: '13px',
                    fontWeight: '600',
                  }}>
                    {buyer.approval_rate}% approval
                  </div>
                </div>
              ))}
              {buyer_performance.length > 8 && (
                <div style={{ textAlign: 'center', padding: '10px', color: '#3498db', fontSize: '13px', fontWeight: '500' }}>
                  +{buyer_performance.length - 8} more buyers
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </DashboardBase>
  );
};
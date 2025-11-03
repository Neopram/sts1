import React, { useState } from 'react';
import { DashboardBase } from '../Dashboard/DashboardBase';
import { KPICard } from '../Dashboard/KPICard';
import { AlertBanner } from '../Dashboard/AlertBanner';
import { Loading } from '../Common/Loading';
import { Alert } from '../Common/Alert';
import { useDashboardData, useDashboardAccess } from '../../hooks/useDashboardData';

// Data Interfaces
interface CommissionRoom {
  room_id: string;
  room_title: string;
  deal_value: number;
  commission: number;
  accrual_status: string;
}

interface CommissionMetrics {
  total_accrued: number;
  by_room: CommissionRoom[];
}

interface DealHealthRoom {
  room_id: string;
  room_title: string;
  health_score: number;
  doc_completion: number;
  approval_progress: number;
  timeline_days_remaining: number | null;
}

interface DealHealth {
  average_health: number;
  by_room: DealHealthRoom[];
}

interface StuckDeal {
  room_id: string;
  room_title: string;
  stuck_approvals: number;
  hours_stuck: number;
}

interface PartyPerformance {
  party_name: string;
  party_role: string;
  responses: number;
  quality: string;
}

interface BrokerDashboard {
  commission: CommissionMetrics;
  deal_health: DealHealth;
  stuck_deals: StuckDeal[];
  party_performance: PartyPerformance[];
  alert_priority: string;
}

export const DashboardBroker: React.FC = () => {
  // ✅ ALL HOOKS FIRST - BEFORE ANY CONDITIONALS
  const { hasAccess } = useDashboardAccess('broker');
  const { data: dashboard, loading, error, refetch } = useDashboardData<BrokerDashboard>(
    '/dashboard/broker/overview',
    {
      enabled: hasAccess,
      refetchInterval: 30000, // Auto-refetch every 30 seconds
    }
  );

  const [dismissedAlerts, setDismissedAlerts] = useState<string[]>([]);

  // Safe destructuring with defaults
  const {
    commission = { total_accrued: 0, by_room: [] },
    deal_health = { average_health: 0, by_room: [] },
    stuck_deals = [],
    party_performance = [],
    alert_priority = 'low',
  } = dashboard || {};

  // ✅ NOW CHECK ACCESS - AFTER ALL HOOKS
  if (!hasAccess) {
    return (
      <DashboardBase title="Access Denied" icon="🚫">
        <Alert
          variant="error"
          title="Unauthorized"
          message="You don't have permission to access this dashboard. Only brokers can view this page."
        />
      </DashboardBase>
    );
  }

  // Show loading
  if (loading) {
    return (
      <DashboardBase title="Broker Portal" icon="💼" subtitle="Deal Management & Commission Tracking">
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
          <Loading message="Loading your deals data..." />
        </div>
      </DashboardBase>
    );
  }

  // Handle error
  if (error || !dashboard) {
    return (
      <DashboardBase title="Broker Portal" icon="💼" subtitle="Deal Management & Commission Tracking">
        <Alert
          variant="error"
          title="Error Loading Dashboard"
          message={error || 'Failed to load dashboard data'}
        />
      </DashboardBase>
    );
  }

  // Helper function to get deal health status based on score
  const getHealthStatus = (score: number): 'success' | 'warning' | 'critical' | 'info' => {
    if (score >= 80) return 'success';
    if (score >= 60) return 'warning';
    return 'critical';
  };

  // Helper function to get deal health color
  const getHealthColor = (score: number): string => {
    if (score >= 80) return '#27ae60';
    if (score >= 60) return '#f39c12';
    return '#e74c3c';
  };

  // Helper function to get health badge background
  const getHealthBgColor = (score: number): string => {
    if (score >= 80) return '#d5f4e6';
    if (score >= 60) return '#fdeaa8';
    return '#fadbd8';
  };

  // Filter visible alerts
  const visibleAlerts: Array<{ id: string; type: 'critical' | 'warning' | 'info'; title: string; message: string }> = [];
  
  if (stuck_deals.length > 0) {
    visibleAlerts.push({
      id: 'stuck-deals-alert',
      type: 'critical',
      title: 'Stuck Deals Alert',
      message: `${stuck_deals.length} deal(s) pending approvals for more than 48 hours. Immediate action required.`,
    });
  }

  if (alert_priority === 'high' && deal_health.average_health < 60) {
    visibleAlerts.push({
      id: 'deal-health-alert',
      type: 'warning',
      title: 'Deal Health Warning',
      message: `Average deal health is ${deal_health.average_health.toFixed(0)}%. Review deals and timelines.`,
    });
  }

  return (
    <DashboardBase
      title="Broker Portal"
      icon="💼"
      subtitle="Deal Management & Commission Tracking"
      actions={
        <button
          onClick={() => refetch()}
          style={{
            background: 'rgba(255, 255, 255, 0.2)',
            border: '1px solid rgba(255, 255, 255, 0.3)',
            borderRadius: '8px',
            color: 'white',
            padding: '8px 16px',
            cursor: 'pointer',
            fontSize: '13px',
            fontWeight: '500',
            transition: 'all 0.2s ease',
          }}
        >
          ↻ Refresh
        </button>
      }
    >
      {/* Alert Banners */}
      {visibleAlerts.length > 0 && !dismissedAlerts.includes('alerts-section') && (
        <div style={{ marginBottom: '24px' }}>
          <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '12px', color: '#2c3e50' }}>
            🚨 Alerts ({visibleAlerts.length})
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {visibleAlerts.map((alert) => (
              <AlertBanner
                key={alert.id}
                type={alert.type}
                title={alert.title}
                message={alert.message}
                dismissible
                onClose={() => setDismissedAlerts([...dismissedAlerts, alert.id])}
                action={{
                  label: 'Review',
                  onClick: () => console.log('Navigating to alert:', alert.id),
                }}
              />
            ))}
          </div>
        </div>
      )}

      {/* KPI Cards */}
      <div style={{ marginBottom: '32px' }}>
        <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '16px', color: '#2c3e50' }}>
          📊 Key Performance Indicators
        </h3>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
            gap: '16px',
          }}
        >
          <KPICard
            title="Total Commission"
            value={`$${(commission.total_accrued / 1000).toFixed(1)}K`}
            icon="💰"
            status="success"
            trend="up"
            trendValue={5}
            subtitle="Accrued this period"
            onClick={() => console.log('Navigate to commission details')}
          />
          <KPICard
            title="Average Deal Health"
            value={`${deal_health.average_health.toFixed(0)}%`}
            icon="📈"
            status={getHealthStatus(deal_health.average_health)}
            trend={deal_health.average_health >= 75 ? 'up' : 'down'}
            trendValue={deal_health.average_health >= 75 ? 2 : -3}
            subtitle="Across all deals"
            onClick={() => console.log('Navigate to deal health')}
          />
          <KPICard
            title="Stuck Deals"
            value={stuck_deals.length}
            icon="⏸️"
            status={stuck_deals.length > 0 ? 'critical' : 'success'}
            trend="down"
            trendValue={-1}
            subtitle=">48h pending approvals"
            onClick={() => console.log('Navigate to stuck deals')}
          />
          <KPICard
            title="Active Deals"
            value={deal_health.by_room.length}
            icon="📋"
            status="info"
            subtitle="In pipeline"
            onClick={() => console.log('Navigate to deals')}
          />
        </div>
      </div>

      {/* Commission Breakdown */}
      {commission.by_room && commission.by_room.length > 0 && (
        <div
          style={{
            background: '#fff',
            borderRadius: '12px',
            padding: '20px',
            border: '1px solid #e0e6ed',
            marginBottom: '32px',
          }}
        >
          <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '16px', color: '#2c3e50' }}>
            💵 Commission by Deal
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {(!commission.by_room || commission.by_room.length === 0) ? (
              <div style={{ textAlign: 'center', padding: '20px', color: '#95a5a6' }}>
                <p>No commission data available</p>
              </div>
            ) : (
              commission.by_room.slice(0, 8).map((room) => (
              <div
                key={room.room_id}
                style={{
                  padding: '12px',
                  border: '1px solid #e0e6ed',
                  borderRadius: '8px',
                  background: '#f8f9fa',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', alignItems: 'flex-start' }}>
                  <div>
                    <p style={{ fontSize: '13px', fontWeight: '600', color: '#2c3e50' }}>{room.room_title}</p>
                    <p style={{ fontSize: '12px', color: '#7f8c8d', marginTop: '2px' }}>
                      Deal Value: ${room.deal_value.toLocaleString('en-US')}
                    </p>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <p style={{ fontSize: '14px', fontWeight: '700', color: '#27ae60' }}>
                      ${room.commission.toLocaleString('en-US', { maximumFractionDigits: 0 })}
                    </p>
                    <span
                      style={{
                        display: 'inline-block',
                        fontSize: '11px',
                        fontWeight: '600',
                        padding: '4px 8px',
                        borderRadius: '4px',
                        marginTop: '4px',
                        background: room.accrual_status === 'accrued' ? '#d5f4e6' : '#fdeaa8',
                        color: room.accrual_status === 'accrued' ? '#27ae60' : '#f39c12',
                      }}
                    >
                      {room.accrual_status.toUpperCase()}
                    </span>
                  </div>
                </div>
                <div style={{ background: '#ecf0f1', borderRadius: '4px', height: '4px', overflow: 'hidden' }}>
                  <div
                    style={{
                      height: '100%',
                      width: room.accrual_status === 'accrued' ? '100%' : '60%',
                      background: '#27ae60',
                      transition: 'width 0.3s ease',
                    }}
                  />
                </div>
              </div>
              ))
            )}
            {commission.by_room && commission.by_room.length > 8 && (
              <p style={{ fontSize: '12px', color: '#7f8c8d', textAlign: 'center', padding: '8px' }}>
                +{commission.by_room.length - 8} more deals
              </p>
            )}
          </div>
        </div>
      )}

      {/* Deal Health Scores */}
      {deal_health.by_room && deal_health.by_room.length > 0 && (
        <div
          style={{
            background: '#fff',
            borderRadius: '12px',
            padding: '20px',
            border: '1px solid #e0e6ed',
            marginBottom: '32px',
          }}
        >
          <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '16px', color: '#2c3e50' }}>
            📊 Deal Health Scores
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {(!deal_health.by_room || deal_health.by_room.length === 0) ? (
              <div style={{ textAlign: 'center', padding: '20px', color: '#95a5a6' }}>
                <p>No deal health data available</p>
              </div>
            ) : (
              deal_health.by_room.slice(0, 8).map((room) => (
              <div
                key={room.room_id}
                style={{
                  padding: '12px',
                  border: '1px solid #e0e6ed',
                  borderRadius: '8px',
                  background: getHealthBgColor(room.health_score),
                  transition: 'all 0.2s ease',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', alignItems: 'flex-start' }}>
                  <div>
                    <p style={{ fontSize: '13px', fontWeight: '600', color: '#2c3e50' }}>{room.room_title}</p>
                    <div style={{ fontSize: '12px', color: '#7f8c8d', marginTop: '2px', display: 'flex', gap: '12px' }}>
                      <span>Docs: {room.doc_completion.toFixed(0)}%</span>
                      <span>Approvals: {room.approval_progress.toFixed(0)}%</span>
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <p style={{ fontSize: '18px', fontWeight: '700', color: getHealthColor(room.health_score) }}>
                      {room.health_score.toFixed(0)}
                    </p>
                    {room.timeline_days_remaining && (
                      <p style={{ fontSize: '11px', color: '#7f8c8d', marginTop: '2px' }}>
                        {room.timeline_days_remaining > 0 ? `${room.timeline_days_remaining}d left` : 'Past ETA'}
                      </p>
                    )}
                  </div>
                </div>
                <div style={{ background: '#ecf0f1', borderRadius: '4px', height: '6px', overflow: 'hidden' }}>
                  <div
                    style={{
                      height: '100%',
                      width: `${room.health_score}%`,
                      background: getHealthColor(room.health_score),
                      transition: 'width 0.3s ease',
                    }}
                  />
                </div>
              </div>
              ))
            )}
            {deal_health.by_room && deal_health.by_room.length > 8 && (
              <p style={{ fontSize: '12px', color: '#7f8c8d', textAlign: 'center', padding: '8px' }}>
                +{deal_health.by_room.length - 8} more deals
              </p>
            )}
          </div>
        </div>
      )}

      {/* Stuck Deals Detail */}
      {stuck_deals.length > 0 && (
        <div
          style={{
            background: '#fadbd8',
            borderRadius: '12px',
            padding: '20px',
            border: '1px solid #fadbd8',
            marginBottom: '32px',
          }}
        >
          <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '16px', color: '#c0392b' }}>
            ⚠️ Stuck Deals - Action Required ({stuck_deals.length})
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {stuck_deals.map((deal) => (
              <div
                key={deal.room_id}
                style={{
                  padding: '12px',
                  background: '#fff',
                  border: '1px solid #f5b7b1',
                  borderRadius: '8px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <div>
                  <p style={{ fontSize: '13px', fontWeight: '600', color: '#2c3e50' }}>{deal.room_title}</p>
                  <p style={{ fontSize: '12px', color: '#e74c3c', fontWeight: '600', marginTop: '2px' }}>
                    {deal.stuck_approvals} approval(s) stuck
                  </p>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <p style={{ fontSize: '16px', fontWeight: '700', color: '#e74c3c' }}>
                    {(deal.hours_stuck / 24).toFixed(0)} days
                  </p>
                  <p style={{ fontSize: '11px', color: '#7f8c8d', marginTop: '2px' }}>pending</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Party Performance */}
      {party_performance.length > 0 && (
        <div
          style={{
            background: '#fff',
            borderRadius: '12px',
            padding: '20px',
            border: '1px solid #e0e6ed',
            marginBottom: '32px',
          }}
        >
          <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '16px', color: '#2c3e50' }}>
            👥 Party Performance
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {party_performance.slice(0, 8).map((party, idx) => (
              <div
                key={idx}
                style={{
                  padding: '12px',
                  background: '#f8f9fa',
                  borderRadius: '8px',
                  border: '1px solid #e0e6ed',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <div>
                  <p style={{ fontSize: '13px', fontWeight: '600', color: '#2c3e50' }}>{party.party_name}</p>
                  <p style={{ fontSize: '12px', color: '#7f8c8d', marginTop: '2px' }}>
                    {party.party_role}
                  </p>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <p
                    style={{
                      fontSize: '13px',
                      fontWeight: '600',
                      color: party.quality === 'good' ? '#27ae60' : '#f39c12',
                    }}
                  >
                    {party.responses} responses
                  </p>
                  <span
                    style={{
                      display: 'inline-block',
                      fontSize: '11px',
                      fontWeight: '600',
                      padding: '2px 8px',
                      borderRadius: '4px',
                      marginTop: '4px',
                      background: party.quality === 'good' ? '#d5f4e6' : '#fdeaa8',
                      color: party.quality === 'good' ? '#27ae60' : '#f39c12',
                    }}
                  >
                    {party.quality.toUpperCase()}
                  </span>
                </div>
              </div>
            ))}
            {party_performance.length > 8 && (
              <p style={{ fontSize: '12px', color: '#7f8c8d', textAlign: 'center', padding: '8px' }}>
                +{party_performance.length - 8} more parties
              </p>
            )}
          </div>
        </div>
      )}
    </DashboardBase>
  );
};

export default DashboardBroker;
import React, { useState, useMemo, useCallback } from 'react';
import { DashboardBase } from '../Dashboard/DashboardBase';
import { KPICard } from '../Dashboard/KPICard';
import { AlertBanner } from '../Dashboard/AlertBanner';
import { Loading } from '../Common/Loading';
import { Alert } from '../Common/Alert';
import { useDashboardData, useDashboardAccess } from '../../hooks/useDashboardData';

// Data Interfaces
interface DemurrageMetrics {
  total_exposure: number;
  by_room: Array<{
    room_id: string;
    room_title: string;
    daily_rate: number;
    days_pending: number;
    exposure: number;
    pending_documents: number;
  }>;
  urgency: 'critical' | 'high' | 'medium' | 'low';
}

interface MarginImpact {
  margin_safe: number;
  margin_at_risk: number;
  operations_delayed: number;
  operations_on_track: number;
}

interface UrgentApproval {
  approval_id: string;
  document_name: string;
  room_title: string;
  days_pending: number;
  status: string;
}

interface CharterOperation {
  total: number;
  active: number;
  pending_approvals: number;
  completion_rate: number;
}

interface ChartererDashboard {
  demurrage: DemurrageMetrics;
  margin_impact: MarginImpact;
  urgent_approvals: UrgentApproval[];
  operations: CharterOperation;
  alert_priority: string;
}

export const DashboardCharterer: React.FC = () => {
  const { hasAccess } = useDashboardAccess('charterer');
  const { data: dashboard, loading, error, refetch } = useDashboardData<ChartererDashboard>(
    '/dashboard/charterer/overview',
    {
      enabled: hasAccess,
      refetchInterval: 30000, // Auto-refetch every 30 seconds
    }
  );

  const [dismissedAlerts, setDismissedAlerts] = useState<string[]>([]);

  // Check access
  if (!hasAccess) {
    return (
      <DashboardBase title="Access Denied" icon="🚫">
        <Alert
          variant="error"
          title="Unauthorized"
          message="You don't have permission to access this dashboard. Only charterers can view this page."
        />
      </DashboardBase>
    );
  }

  // Show loading
  if (loading) {
    return (
      <DashboardBase title="Charterer Portal" icon="🚢" subtitle="Charter Operations & Demurrage Management">
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
          <Loading message="Loading your operations data..." />
        </div>
      </DashboardBase>
    );
  }

  // Handle error
  if (error || !dashboard) {
    return (
      <DashboardBase title="Charterer Portal" icon="🚢" subtitle="Charter Operations & Demurrage Management">
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
    demurrage = { total_exposure: 0, by_room: [], urgency: 'low' },
    margin_impact = { margin_safe: 0, margin_at_risk: 0, operations_delayed: 0, operations_on_track: 0 },
    urgent_approvals = [],
    operations = { total: 0, active: 0, pending_approvals: 0, completion_rate: 0 },
    alert_priority = 'low',
  } = dashboard;

  // Memoized helper functions
  const getUrgencyStatus = useCallback((urgency: string): 'success' | 'warning' | 'critical' | 'info' => {
    switch (urgency) {
      case 'critical':
        return 'critical';
      case 'high':
        return 'warning';
      case 'medium':
        return 'info';
      default:
        return 'success';
    }
  }, []);

  // Memoized helper function to get margin status
  const getMarginStatus = useCallback((marginAtRisk: number): 'success' | 'warning' | 'critical' => {
    if (marginAtRisk <= 20) return 'success';
    if (marginAtRisk <= 50) return 'warning';
    return 'critical';
  }, []);

  // Memoized visible alerts
  const visibleAlerts = useMemo(() => {
    const alerts: Array<{ id: string; type: 'critical' | 'warning' | 'info'; title: string; message: string }> = [];

    if (alert_priority === 'demurrage' || demurrage.urgency === 'critical') {
      alerts.push({
        id: 'demurrage-alert',
        type: 'critical',
        title: 'Demurrage Alert',
        message: `Total exposure: $${demurrage.total_exposure.toLocaleString('en-US', { maximumFractionDigits: 0 })}. Review urgent operations immediately.`,
      });
    }

    if (margin_impact.margin_at_risk > 50) {
      alerts.push({
        id: 'margin-alert',
        type: 'warning',
        title: 'High Margin Risk',
        message: `${margin_impact.margin_at_risk.toFixed(1)}% of margin at risk. ${margin_impact.operations_delayed} operations delayed.`,
      });
    }

    return alerts;
  }, [alert_priority, demurrage.urgency, demurrage.total_exposure, margin_impact.margin_at_risk, margin_impact.operations_delayed]);

  if (urgent_approvals.length > 0) {
    visibleAlerts.push({
      id: 'approvals-alert',
      type: 'warning',
      title: 'Pending Approvals',
      message: `${urgent_approvals.length} urgent approvals pending. Review immediately to avoid delays.`,
    });
  }

  return (
    <DashboardBase
      title="Charterer Portal"
      icon="🚢"
      subtitle="Charter Operations & Demurrage Management"
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
            title="Demurrage Exposure"
            value={`$${(demurrage.total_exposure / 1000).toFixed(1)}K`}
            icon="⚠️"
            status={getUrgencyStatus(demurrage.urgency)}
            trend={demurrage.urgency === 'critical' ? 'down' : 'up'}
            trendValue={demurrage.urgency === 'critical' ? -5 : 2}
            subtitle={`${demurrage.urgency.toUpperCase()} priority`}
            onClick={() => console.log('Navigate to demurrage details')}
          />
          <KPICard
            title="Margin at Risk"
            value={`${margin_impact.margin_at_risk.toFixed(1)}%`}
            icon="📉"
            status={getMarginStatus(margin_impact.margin_at_risk)}
            trend="down"
            trendValue={margin_impact.margin_at_risk > 50 ? -3 : -1}
            subtitle={`${margin_impact.operations_delayed} ops delayed`}
            onClick={() => console.log('Navigate to margin analysis')}
          />
          <KPICard
            title="Margin Safe"
            value={`${margin_impact.margin_safe.toFixed(1)}%`}
            icon="📈"
            status="success"
            trend="up"
            trendValue={2}
            subtitle={`${margin_impact.operations_on_track} ops on track`}
            onClick={() => console.log('Navigate to safe operations')}
          />
          <KPICard
            title="Operations"
            value={`${operations.active}/${operations.total}`}
            icon="📋"
            status="info"
            subtitle={`${operations.completion_rate.toFixed(0)}% complete`}
            onClick={() => console.log('Navigate to operations')}
          />
        </div>
      </div>

      {/* Demurrage Breakdown */}
      {demurrage.by_room && demurrage.by_room.length > 0 && (
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
            💰 Demurrage Breakdown
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {(!demurrage.by_room || demurrage.by_room.length === 0) ? (
              <div style={{ textAlign: 'center', padding: '20px', color: '#95a5a6' }}>
                <p>No demurrage data available</p>
              </div>
            ) : (
              demurrage.by_room.slice(0, 8).map((room) => (
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
                      Rate: ${room.daily_rate}/day · {room.days_pending}d pending
                    </p>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <p style={{ fontSize: '14px', fontWeight: '700', color: '#e74c3c' }}>
                      ${room.exposure.toLocaleString('en-US', { maximumFractionDigits: 0 })}
                    </p>
                    {room.pending_documents > 0 && (
                      <span style={{ display: 'inline-block', fontSize: '11px', fontWeight: '600', padding: '2px 8px', borderRadius: '4px', background: '#ffe0b2', color: '#f39c12', marginTop: '4px' }}>
                        {room.pending_documents} docs
                      </span>
                    )}
                  </div>
                </div>
                <div style={{ background: '#ecf0f1', borderRadius: '4px', height: '4px', overflow: 'hidden' }}>
                  <div
                    style={{
                      height: '100%',
                      width: `${Math.min((room.days_pending / 30) * 100, 100)}%`,
                      background: '#e74c3c',
                      transition: 'width 0.3s ease',
                    }}
                  />
                </div>
              </div>
              ))
            )}
            {demurrage.by_room && demurrage.by_room.length > 8 && (
              <p style={{ fontSize: '12px', color: '#7f8c8d', textAlign: 'center', padding: '8px' }}>
                +{demurrage.by_room.length - 8} more operations
              </p>
            )}
          </div>
        </div>
      )}

      {/* Urgent Approvals */}
      {urgent_approvals.length > 0 && (
        <div
          style={{
            background: '#fff3e0',
            borderRadius: '12px',
            padding: '20px',
            border: '1px solid #ffe0b2',
            marginBottom: '32px',
          }}
        >
          <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '16px', color: '#e65100' }}>
            ⏰ Urgent Approvals Pending ({urgent_approvals.length})
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {urgent_approvals.slice(0, 6).map((approval) => (
              <div
                key={approval.approval_id}
                style={{
                  padding: '12px',
                  background: '#fff',
                  border: '1px solid #ffe0b2',
                  borderRadius: '8px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <div>
                  <p style={{ fontSize: '13px', fontWeight: '600', color: '#2c3e50' }}>{approval.document_name}</p>
                  <p style={{ fontSize: '12px', color: '#7f8c8d', marginTop: '2px' }}>
                    {approval.room_title}
                  </p>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <p style={{ fontSize: '13px', fontWeight: '600', color: '#f39c12' }}>
                    {approval.days_pending}d pending
                  </p>
                  <span
                    style={{
                      display: 'inline-block',
                      fontSize: '11px',
                      fontWeight: '600',
                      padding: '2px 8px',
                      borderRadius: '4px',
                      marginTop: '4px',
                      background: '#ffe0b2',
                      color: '#e65100',
                    }}
                  >
                    {approval.status.toUpperCase()}
                  </span>
                </div>
              </div>
            ))}
            {urgent_approvals.length > 6 && (
              <p style={{ fontSize: '12px', color: '#7f8c8d', textAlign: 'center', padding: '8px' }}>
                +{urgent_approvals.length - 6} more approvals
              </p>
            )}
          </div>
        </div>
      )}

      {/* Operations Summary */}
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
          📋 Operations Summary
        </h3>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '16px',
          }}
        >
          <div
            style={{
              padding: '16px',
              background: '#f8f9fa',
              borderRadius: '8px',
              border: '1px solid #e0e6ed',
            }}
          >
            <p style={{ fontSize: '12px', color: '#7f8c8d', marginBottom: '8px' }}>Total Operations</p>
            <p style={{ fontSize: '24px', fontWeight: '700', color: '#2c3e50' }}>{operations.total}</p>
          </div>

          <div
            style={{
              padding: '16px',
              background: '#d5f4e6',
              borderRadius: '8px',
              border: '1px solid #a9dfbf',
            }}
          >
            <p style={{ fontSize: '12px', color: '#27ae60', marginBottom: '8px' }}>Active Operations</p>
            <p style={{ fontSize: '24px', fontWeight: '700', color: '#27ae60' }}>{operations.active}</p>
          </div>

          <div
            style={{
              padding: '16px',
              background: '#fdeaa8',
              borderRadius: '8px',
              border: '1px solid #f8c471',
            }}
          >
            <p style={{ fontSize: '12px', color: '#f39c12', marginBottom: '8px' }}>Pending Approvals</p>
            <p style={{ fontSize: '24px', fontWeight: '700', color: '#f39c12' }}>{operations.pending_approvals}</p>
          </div>

          <div
            style={{
              padding: '16px',
              background: '#d6eaf8',
              borderRadius: '8px',
              border: '1px solid #aed6f1',
            }}
          >
            <p style={{ fontSize: '12px', color: '#3498db', marginBottom: '8px' }}>Completion Rate</p>
            <p style={{ fontSize: '24px', fontWeight: '700', color: '#3498db' }}>{operations.completion_rate.toFixed(0)}%</p>
          </div>
        </div>
      </div>
    </DashboardBase>
  );
};

export default DashboardCharterer;
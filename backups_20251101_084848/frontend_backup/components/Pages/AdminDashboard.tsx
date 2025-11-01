import React from 'react';
import {
  Users,
  AlertTriangle,
  Activity,
  Database,
  Shield,
  CheckCircle,
  Zap,
} from 'lucide-react';
import { DashboardBase } from '../Dashboard/DashboardBase';
import { KPICard } from '../Dashboard/KPICard';
import { AlertBanner } from '../Dashboard/AlertBanner';
import { useDashboardAccess, useDashboardData } from '../../hooks/useDashboardData';

interface AdminStats {
  total_operations: number;
  total_users: number;
  active_users: number;
  total_documents: number;
  system_health_score: number;
  alert_count: number;
  expired_documents: number;
  pending_approvals: number;
  overdue_operations: number;
}

interface CriticalAlert {
  severity: string;
  type: string;
  count: number;
  message: string;
}

interface AdminDashboardData {
  stats: AdminStats;
  critical_alerts: CriticalAlert[];
}

const getHealthLabel = (score: number): string => {
  if (score >= 90) return 'Excellent';
  if (score >= 75) return 'Good';
  if (score >= 50) return 'Fair';
  return 'Critical';
};

export const AdminDashboard: React.FC = () => {
  const { hasAccess } = useDashboardAccess('admin');
  const { data } = useDashboardData<AdminDashboardData>('/dashboard/admin', {
    refetchInterval: 30000,
  });

  if (!hasAccess) {
    return (
      <DashboardBase title="Admin Dashboard">
        <div style={{ padding: '40px', textAlign: 'center' }}>
          <Shield style={{ width: '64px', height: '64px', opacity: 0.3, margin: '0 auto 20px' }} />
          <p style={{ fontSize: '18px', fontWeight: '500', color: '#374151' }}>
            You do not have access to the Admin Dashboard
          </p>
        </div>
      </DashboardBase>
    );
  }

  const stats = data?.stats || {
    total_operations: 0,
    total_users: 0,
    active_users: 0,
    total_documents: 0,
    system_health_score: 100,
    alert_count: 0,
    expired_documents: 0,
    pending_approvals: 0,
    overdue_operations: 0,
  };

  const alerts = data?.critical_alerts || [];

  // Generate alerts based on thresholds
  const visibleAlerts = [];

  if (stats.system_health_score < 50) {
    visibleAlerts.push({
      id: 'health-critical',
      type: 'critical',
      title: 'System Health Critical',
      message: `System health is critically low at ${stats.system_health_score}%. Immediate action required.`,
    });
  }

  if (stats.expired_documents > 0) {
    visibleAlerts.push({
      id: 'expired-docs',
      type: 'warning',
      title: 'Expired Documents',
      message: `${stats.expired_documents} document(s) have expired. Send notices to responsible parties.`,
    });
  }

  if (stats.overdue_operations > 0) {
    visibleAlerts.push({
      id: 'overdue-ops',
      type: 'warning',
      title: 'Overdue Operations',
      message: `${stats.overdue_operations} operation(s) past ETA. Investigate delays immediately.`,
    });
  }

  if (stats.pending_approvals > 20) {
    visibleAlerts.push({
      id: 'approval-backlog',
      type: 'info',
      title: 'Approval Backlog',
      message: `${stats.pending_approvals} approvals pending. Consider escalating to approvers.`,
    });
  }

  return (
    <DashboardBase title="Admin Dashboard">
      {/* Alerts */}
      {visibleAlerts.length > 0 && (
        <div style={{ marginBottom: '24px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {visibleAlerts.map((alert) => (
            <AlertBanner
              key={alert.id}
              type={alert.type as 'critical' | 'warning' | 'info' | 'success'}
              title={alert.title}
              message={alert.message}
            />
          ))}
        </div>
      )}

      {/* KPI Cards - 4 Main Metrics */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
          gap: '16px',
          marginBottom: '32px',
        }}
      >
        <KPICard
          icon={<Shield style={{ width: '24px', height: '24px' }} />}
          title="System Health"
          value={`${stats.system_health_score}%`}
          subtitle={getHealthLabel(stats.system_health_score)}
          status={
            stats.system_health_score >= 90
              ? 'success'
              : stats.system_health_score >= 75
                ? 'info'
                : stats.system_health_score >= 50
                  ? 'warning'
                  : 'critical'
          }
        />

        <KPICard
          icon={<Users style={{ width: '24px', height: '24px' }} />}
          title="Total Users"
          value={stats.total_users.toLocaleString()}
          subtitle={`${stats.active_users} active (7d)`}
          status="info"
        />

        <KPICard
          icon={<Database style={{ width: '24px', height: '24px' }} />}
          title="Operations"
          value={stats.total_operations.toLocaleString()}
          subtitle={`${stats.overdue_operations} overdue`}
          status={stats.overdue_operations > 0 ? 'warning' : 'success'}
        />

        <KPICard
          icon={<AlertTriangle style={{ width: '24px', height: '24px' }} />}
          title="Documents"
          value={stats.total_documents.toLocaleString()}
          subtitle={`${stats.expired_documents} expired`}
          status={stats.expired_documents > 0 ? 'critical' : 'success'}
        />
      </div>

      {/* Compliance Status */}
      <div
        style={{
          backgroundColor: '#ffffff',
          borderRadius: '8px',
          padding: '24px',
          marginBottom: '32px',
          border: '1px solid #e5e7eb',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: '20px' }}>
          <Activity style={{ width: '20px', height: '20px', marginRight: '12px', color: '#6366f1' }} />
          <h2 style={{ fontSize: '18px', fontWeight: '600', color: '#111827' }}>Compliance Overview</h2>
        </div>

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
              backgroundColor: stats.expired_documents > 0 ? '#fee2e2' : '#f0fdf4',
              borderRadius: '6px',
              border: `1px solid ${stats.expired_documents > 0 ? '#fecaca' : '#86efac'}`,
            }}
          >
            <p style={{ fontSize: '14px', color: '#6b7280', marginBottom: '8px' }}>Expired Documents</p>
            <p style={{ fontSize: '28px', fontWeight: '700', color: stats.expired_documents > 0 ? '#dc2626' : '#16a34a' }}>
              {stats.expired_documents}
            </p>
          </div>

          <div
            style={{
              padding: '16px',
              backgroundColor: stats.pending_approvals > 10 ? '#fef3c7' : '#dbeafe',
              borderRadius: '6px',
              border: `1px solid ${stats.pending_approvals > 10 ? '#fde68a' : '#93c5fd'}`,
            }}
          >
            <p style={{ fontSize: '14px', color: '#6b7280', marginBottom: '8px' }}>Pending Approvals</p>
            <p style={{ fontSize: '28px', fontWeight: '700', color: stats.pending_approvals > 10 ? '#d97706' : '#0284c7' }}>
              {stats.pending_approvals}
            </p>
          </div>

          <div
            style={{
              padding: '16px',
              backgroundColor: stats.overdue_operations > 0 ? '#fed7aa' : '#f0fdf4',
              borderRadius: '6px',
              border: `1px solid ${stats.overdue_operations > 0 ? '#fdba74' : '#86efac'}`,
            }}
          >
            <p style={{ fontSize: '14px', color: '#6b7280', marginBottom: '8px' }}>Overdue Operations</p>
            <p style={{ fontSize: '28px', fontWeight: '700', color: stats.overdue_operations > 0 ? '#ea580c' : '#16a34a' }}>
              {stats.overdue_operations}
            </p>
          </div>
        </div>
      </div>

      {/* Critical Alerts Details */}
      {alerts.length > 0 && (
        <div
          style={{
            backgroundColor: '#fef2f2',
            borderRadius: '8px',
            padding: '24px',
            marginBottom: '32px',
            border: '1px solid #fecaca',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: '20px' }}>
            <AlertTriangle style={{ width: '20px', height: '20px', marginRight: '12px', color: '#dc2626' }} />
            <h3 style={{ fontSize: '16px', fontWeight: '600', color: '#7f1d1d' }}>Critical Alerts ({alerts.length})</h3>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {alerts.slice(0, 6).map((alert, idx) => (
              <div
                key={idx}
                style={{
                  padding: '12px',
                  backgroundColor: '#ffffff',
                  borderRadius: '6px',
                  border: '1px solid #fecaca',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                  <div>
                    <p style={{ fontSize: '14px', fontWeight: '500', color: '#1f2937' }}>{alert.message}</p>
                    <p style={{ fontSize: '12px', color: '#6b7280', marginTop: '4px' }}>
                      Type: {alert.type.replace(/_/g, ' ').toUpperCase()}
                    </p>
                  </div>
                  <span
                    style={{
                      padding: '4px 8px',
                      borderRadius: '4px',
                      fontSize: '12px',
                      fontWeight: '600',
                      backgroundColor: '#fee2e2',
                      color: '#dc2626',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {alert.count} items
                  </span>
                </div>
              </div>
            ))}
            {alerts.length > 6 && (
              <p style={{ fontSize: '12px', color: '#6b7280', textAlign: 'center', marginTop: '8px' }}>
                +{alerts.length - 6} more alerts
              </p>
            )}
          </div>
        </div>
      )}

      {/* Recommendations */}
      <div
        style={{
          backgroundColor: '#ffffff',
          borderRadius: '8px',
          padding: '24px',
          border: '1px solid #e5e7eb',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: '20px' }}>
          <Zap style={{ width: '20px', height: '20px', marginRight: '12px', color: '#0284c7' }} />
          <h3 style={{ fontSize: '16px', fontWeight: '600', color: '#1f2937' }}>System Recommendations</h3>
        </div>

        <ul style={{ fontSize: '14px', color: '#374151', lineHeight: '1.75', listStyleType: 'none', padding: 0 }}>
          {stats.system_health_score < 50 && (
            <li style={{ marginBottom: '12px', display: 'flex', alignItems: 'start' }}>
              <AlertTriangle style={{ width: '16px', height: '16px', marginRight: '12px', marginTop: '2px', color: '#dc2626', flexShrink: 0 }} />
              <span>
                <strong>Critical:</strong> System health is critically low ({stats.system_health_score}%). Address compliance violations immediately.
              </span>
            </li>
          )}
          {stats.expired_documents > 0 && (
            <li style={{ marginBottom: '12px', display: 'flex', alignItems: 'start' }}>
              <AlertTriangle style={{ width: '16px', height: '16px', marginRight: '12px', marginTop: '2px', color: '#ea580c', flexShrink: 0 }} />
              <span>
                <strong>Action Required:</strong> {stats.expired_documents} document(s) have expired. Send notices immediately.
              </span>
            </li>
          )}
          {stats.overdue_operations > 0 && (
            <li style={{ marginBottom: '12px', display: 'flex', alignItems: 'start' }}>
              <Activity style={{ width: '16px', height: '16px', marginRight: '12px', marginTop: '2px', color: '#f59e0b', flexShrink: 0 }} />
              <span>
                <strong>Follow-up Needed:</strong> {stats.overdue_operations} operation(s) past ETA. Investigate delays.
              </span>
            </li>
          )}
          {stats.pending_approvals > 20 && (
            <li style={{ marginBottom: '12px', display: 'flex', alignItems: 'start' }}>
              <Activity style={{ width: '16px', height: '16px', marginRight: '12px', marginTop: '2px', color: '#f59e0b', flexShrink: 0 }} />
              <span>
                <strong>Approval Backlog:</strong> {stats.pending_approvals} approvals pending. Escalate to approvers.
              </span>
            </li>
          )}
          {stats.system_health_score >= 90 && stats.expired_documents === 0 && (
            <li style={{ marginBottom: '12px', display: 'flex', alignItems: 'start' }}>
              <CheckCircle style={{ width: '16px', height: '16px', marginRight: '12px', marginTop: '2px', color: '#10b981', flexShrink: 0 }} />
              <span>
                <strong>Excellent:</strong> System is in excellent health. All compliance metrics within acceptable ranges.
              </span>
            </li>
          )}
        </ul>
      </div>
    </DashboardBase>
  );
};
import React, { useState } from 'react';
import { DashboardBase } from './DashboardBase';
import { KPICard } from './KPICard';
import { OperationStatusCard } from './OperationStatusCard';
import { AlertBanner } from './AlertBanner';
import { useDashboardData, useDashboardAccess } from '../../hooks/useDashboardData';
import { Loading } from '../Common/Loading';
import { Alert } from '../Common/Alert';
import { Users, BarChart3, AlertTriangle, TrendingUp } from 'lucide-react';

interface AdminDashboardResponse {
  overview: {
    total_operations: number;
    active_operations: number;
    compliance_rate: number;
    total_users: number;
    online_users: number;
    critical_alerts: number;
  };
  recent_alerts: Array<{
    id: string;
    type: 'critical' | 'warning' | 'info';
    title: string;
    message: string;
    timestamp: string;
  }>;
  operations: Array<{
    operation_id: string;
    vessel_name: string;
    status: 'completed' | 'active' | 'planned' | 'delayed' | 'error';
    progress: number;
    cargo_type: string;
    volume: string;
    documentation_status: 'complete' | 'incomplete' | 'pending';
    completed_docs: number;
    total_docs: number;
  }>;
}

export const AdminDashboardExample: React.FC = () => {
  const { hasAccess } = useDashboardAccess('admin');
  const { data, loading, error, refetch } = useDashboardData<AdminDashboardResponse>(
    '/dashboard/admin/overview',
    {
      enabled: hasAccess,
      refetchInterval: 30000, // Refetch every 30 seconds
    }
  );

  const [dismissedAlerts, setDismissedAlerts] = useState<string[]>([]);

  if (!hasAccess) {
    return (
      <DashboardBase title="Access Denied" icon="🚫">
        <Alert
          type="error"
          title="Unauthorized"
          message="You don't have permission to access this dashboard. Only admins can view this page."
        />
      </DashboardBase>
    );
  }

  if (loading) {
    return (
      <DashboardBase title="Admin Dashboard" icon="👨‍💼" subtitle="System Overview">
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
          <Loading message="Loading system data..." />
        </div>
      </DashboardBase>
    );
  }

  if (error || !data) {
    return (
      <DashboardBase title="Admin Dashboard" icon="👨‍💼" subtitle="System Overview">
        <Alert
          type="error"
          title="Error Loading Dashboard"
          message={error || 'Failed to load dashboard data'}
          action={{ label: 'Retry', onClick: refetch }}
        />
      </DashboardBase>
    );
  }

  const overview = data.overview || {
    total_operations: 0,
    active_operations: 0,
    compliance_rate: 0,
    total_users: 0,
    online_users: 0,
    critical_alerts: 0,
  };

  const visibleAlerts = data.recent_alerts?.filter((alert) => !dismissedAlerts.includes(alert.id)) || [];

  return (
    <DashboardBase
      title="Admin Dashboard"
      icon="👨‍💼"
      subtitle="Complete System Overview & Control Panel"
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
      {/* Critical Alerts Section */}
      {visibleAlerts.length > 0 && (
        <div style={{ marginBottom: '24px' }}>
          <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '12px', color: '#2c3e50' }}>
            🚨 Critical Alerts ({visibleAlerts.length})
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
                  label: 'View',
                  onClick: () => console.log('Navigating to alert:', alert.id),
                }}
              />
            ))}
          </div>
        </div>
      )}

      {/* KPI Cards Grid */}
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
            title="Total Operations"
            value={overview.total_operations}
            icon="📦"
            status="info"
            subtitle="All-time operations"
            onClick={() => console.log('Navigate to operations')}
          />
          <KPICard
            title="Active Operations"
            value={overview.active_operations}
            icon="⚡"
            status="warning"
            trend="up"
            trendValue={12}
            subtitle="Currently in progress"
            onClick={() => console.log('Navigate to active')}
          />
          <KPICard
            title="Compliance Rate"
            value={`${overview.compliance_rate}%`}
            icon="✅"
            status={overview.compliance_rate >= 90 ? 'success' : 'warning'}
            trend={overview.compliance_rate >= 90 ? 'up' : 'down'}
            trendValue={overview.compliance_rate >= 90 ? 5 : -3}
            subtitle="System-wide compliance"
          />
          <KPICard
            title="System Health"
            value={`${100 - overview.critical_alerts}%`}
            icon="❤️"
            status={overview.critical_alerts === 0 ? 'success' : 'critical'}
            trend="neutral"
            subtitle={`${overview.critical_alerts} critical alert(s)`}
          />
          <KPICard
            title="Online Users"
            value={`${overview.online_users}/${overview.total_users}`}
            icon="👥"
            status="info"
            subtitle="Active users in system"
            onClick={() => console.log('Navigate to users')}
          />
          <KPICard
            title="Critical Alerts"
            value={overview.critical_alerts}
            icon="🚨"
            status={overview.critical_alerts > 0 ? 'critical' : 'success'}
            trend="down"
            trendValue={overview.critical_alerts > 0 ? -2 : 0}
            subtitle="Requires attention"
            onClick={() => console.log('Navigate to alerts')}
          />
        </div>
      </div>

      {/* Operations Table Section */}
      {data.operations && data.operations.length > 0 && (
        <div style={{ marginBottom: '32px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: '600', color: '#2c3e50' }}>
              📋 Recent Operations ({data.operations.length})
            </h3>
            <button
              style={{
                background: '#667eea',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                padding: '8px 16px',
                fontSize: '13px',
                fontWeight: '500',
                cursor: 'pointer',
              }}
            >
              View All Operations
            </button>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))',
              gap: '16px',
            }}
          >
            {data.operations.map((op) => (
              <OperationStatusCard
                key={op.operation_id}
                operationId={op.operation_id}
                vesselName={op.vessel_name}
                status={op.status}
                progress={op.progress}
                cargoType={op.cargo_type}
                volume={op.volume}
                documentationStatus={op.documentation_status}
                completedDocs={op.completed_docs}
                totalDocs={op.total_docs}
                onClick={() => console.log('Navigate to operation:', op.operation_id)}
              />
            ))}
          </div>
        </div>
      )}

      {/* Additional Info Section */}
      <div
        style={{
          background: '#fff',
          borderRadius: '12px',
          padding: '20px',
          border: '1px solid #e0e6ed',
        }}
      >
        <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '12px', color: '#2c3e50' }}>
          ℹ️ System Information
        </h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
          <div>
            <div style={{ fontSize: '12px', color: '#7f8c8d', fontWeight: '500', marginBottom: '4px' }}>
              Last Update
            </div>
            <div style={{ fontSize: '14px', fontWeight: '600', color: '#2c3e50' }}>
              {new Date().toLocaleTimeString()}
            </div>
          </div>
          <div>
            <div style={{ fontSize: '12px', color: '#7f8c8d', fontWeight: '500', marginBottom: '4px' }}>
              System Version
            </div>
            <div style={{ fontSize: '14px', fontWeight: '600', color: '#2c3e50' }}>v1.0.0</div>
          </div>
          <div>
            <div style={{ fontSize: '12px', color: '#7f8c8d', fontWeight: '500', marginBottom: '4px' }}>
              Database Status
            </div>
            <div style={{ fontSize: '14px', fontWeight: '600', color: '#27ae60' }}>✓ Connected</div>
          </div>
        </div>
      </div>
    </DashboardBase>
  );
};

export default AdminDashboardExample;
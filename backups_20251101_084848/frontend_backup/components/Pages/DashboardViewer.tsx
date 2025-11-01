import React from 'react';
import { Eye, FileText, History, Lock } from 'lucide-react';
import { DashboardBase } from '../Dashboard/DashboardBase';
import { KPICard } from '../Dashboard/KPICard';
import { useDashboardAccess, useDashboardData } from '../../hooks/useDashboardData';

interface AccessibleRoom {
  id: string;
  title: string;
  location: string;
  status: string;
  document_count: number;
  created_at: string;
}

interface ActivityEvent {
  id: string;
  actor: string;
  action: string;
  timestamp: string;
  room_id: string;
}

interface ViewerDashboardData {
  rooms: AccessibleRoom[];
  activities: ActivityEvent[];
  total_documents: number;
}

export const DashboardViewer: React.FC = () => {
  const { hasAccess } = useDashboardAccess('viewer');
  const { data } = useDashboardData<ViewerDashboardData>('/dashboard/viewer');

  if (!hasAccess) {
    return (
      <DashboardBase title="View-Only Dashboard">
        <div style={{ padding: '40px', textAlign: 'center' }}>
          <Lock style={{ width: '64px', height: '64px', opacity: 0.3, margin: '0 auto 20px' }} />
          <p style={{ fontSize: '18px', fontWeight: '500', color: '#374151' }}>
            You do not have access to this dashboard
          </p>
        </div>
      </DashboardBase>
    );
  }

  const rooms = data?.rooms || [];
  const activities = data?.activities || [];
  const totalDocuments = data?.total_documents || rooms.reduce((sum, r) => sum + r.document_count, 0);

  return (
    <DashboardBase title="View-Only Dashboard">
      {/* Read-Only Access Info */}
      <div
        style={{
          padding: '16px',
          backgroundColor: '#dbeafe',
          borderRadius: '8px',
          border: '1px solid #93c5fd',
          marginBottom: '24px',
          display: 'flex',
          gap: '12px',
        }}
      >
        <Lock style={{ width: '20px', height: '20px', color: '#0284c7', flexShrink: 0, marginTop: '2px' }} />
        <div>
          <p style={{ fontSize: '14px', fontWeight: '500', color: '#0c4a6e' }}>Read-Only Access</p>
          <p style={{ fontSize: '13px', color: '#0369a1', marginTop: '4px' }}>
            You have view-only access to assigned transactions. You cannot upload, edit, or delete documents.
          </p>
        </div>
      </div>

      {/* KPI Cards - 3 Main Metrics */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
          gap: '16px',
          marginBottom: '32px',
        }}
      >
        <KPICard
          icon={<Eye style={{ width: '24px', height: '24px' }} />}
          title="Accessible Transactions"
          value={rooms.length.toString()}
          subtitle={`${rooms.filter((r) => r.status === 'active').length} active`}
          status="info"
        />

        <KPICard
          icon={<FileText style={{ width: '24px', height: '24px' }} />}
          title="Total Documents"
          value={totalDocuments.toString()}
          subtitle="Available to view"
          status="success"
        />

        <KPICard
          icon={<History style={{ width: '24px', height: '24px' }} />}
          title="Recent Activities"
          value={activities.length.toString()}
          subtitle="Last 10 events"
          status="info"
        />
      </div>

      {/* Assigned Transactions */}
      <div
        style={{
          backgroundColor: '#ffffff',
          borderRadius: '8px',
          padding: '24px',
          marginBottom: '32px',
          border: '1px solid #e5e7eb',
        }}
      >
        <div style={{ marginBottom: '20px' }}>
          <h2 style={{ fontSize: '18px', fontWeight: '600', color: '#111827', marginBottom: '4px' }}>
            📋 Your Assigned Transactions
          </h2>
          <p style={{ fontSize: '14px', color: '#6b7280' }}>Transactions you have read-only access to</p>
        </div>

        {rooms.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '32px 16px' }}>
            <Eye style={{ width: '48px', height: '48px', opacity: 0.2, margin: '0 auto 12px' }} />
            <p style={{ fontSize: '14px', color: '#6b7280' }}>No assigned transactions yet</p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', fontSize: '14px' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #e5e7eb', backgroundColor: '#f9fafb' }}>
                  <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600', color: '#374151' }}>Title</th>
                  <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600', color: '#374151' }}>Location</th>
                  <th style={{ padding: '12px', textAlign: 'center', fontWeight: '600', color: '#374151' }}>Documents</th>
                  <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600', color: '#374151' }}>Status</th>
                  <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600', color: '#374151' }}>Created</th>
                </tr>
              </thead>
              <tbody>
                {rooms.slice(0, 8).map((room) => (
                  <tr key={room.id} style={{ borderBottom: '1px solid #e5e7eb', transition: 'background-color 0.2s' }}>
                    <td style={{ padding: '12px', fontWeight: '500', color: '#111827' }}>{room.title}</td>
                    <td style={{ padding: '12px', color: '#6b7280' }}>{room.location}</td>
                    <td style={{ padding: '12px', textAlign: 'center' }}>
                      <span
                        style={{
                          display: 'inline-block',
                          padding: '4px 8px',
                          borderRadius: '4px',
                          backgroundColor: '#dbeafe',
                          color: '#0c4a6e',
                          fontSize: '12px',
                          fontWeight: '600',
                        }}
                      >
                        {room.document_count}
                      </span>
                    </td>
                    <td style={{ padding: '12px' }}>
                      <span
                        style={{
                          display: 'inline-block',
                          padding: '4px 8px',
                          borderRadius: '4px',
                          fontSize: '12px',
                          fontWeight: '600',
                          backgroundColor: room.status === 'active' ? '#dcfce7' : '#f3f4f6',
                          color: room.status === 'active' ? '#166534' : '#374151',
                        }}
                      >
                        {room.status}
                      </span>
                    </td>
                    <td style={{ padding: '12px', fontSize: '12px', color: '#6b7280' }}>
                      {new Date(room.created_at).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {rooms.length > 8 && (
              <p style={{ fontSize: '12px', color: '#6b7280', textAlign: 'center', marginTop: '12px' }}>
                +{rooms.length - 8} more transactions
              </p>
            )}
          </div>
        )}
      </div>

      {/* Activity Timeline */}
      <div
        style={{
          backgroundColor: '#ffffff',
          borderRadius: '8px',
          padding: '24px',
          marginBottom: '32px',
          border: '1px solid #e5e7eb',
        }}
      >
        <div style={{ marginBottom: '20px' }}>
          <h2 style={{ fontSize: '18px', fontWeight: '600', color: '#111827', marginBottom: '4px' }}>
            🕐 Activity Timeline
          </h2>
          <p style={{ fontSize: '14px', color: '#6b7280' }}>Recent activities in your assigned transactions</p>
        </div>

        {activities.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '32px 16px' }}>
            <History style={{ width: '48px', height: '48px', opacity: 0.2, margin: '0 auto 12px' }} />
            <p style={{ fontSize: '14px', color: '#6b7280' }}>No activities yet</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {activities.slice(0, 10).map((activity) => (
              <div
                key={activity.id}
                style={{
                  padding: '12px',
                  display: 'flex',
                  gap: '12px',
                  borderBottom: '1px solid #e5e7eb',
                }}
              >
                <div
                  style={{
                    width: '8px',
                    height: '8px',
                    borderRadius: '50%',
                    backgroundColor: '#0284c7',
                    marginTop: '6px',
                    flexShrink: 0,
                  }}
                />
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: '14px', fontWeight: '500', color: '#111827' }}>
                    {activity.actor}{' '}
                    <span style={{ fontWeight: '400', color: '#6b7280' }}>{activity.action}</span>
                  </p>
                  <p style={{ fontSize: '12px', color: '#9ca3af', marginTop: '4px' }}>
                    {new Date(activity.timestamp).toLocaleString()}
                  </p>
                </div>
              </div>
            ))}
            {activities.length > 10 && (
              <p style={{ fontSize: '12px', color: '#6b7280', textAlign: 'center', marginTop: '8px' }}>
                +{activities.length - 10} more activities
              </p>
            )}
          </div>
        )}
      </div>

      {/* Permissions Info */}
      <div
        style={{
          backgroundColor: '#ffffff',
          borderRadius: '8px',
          padding: '24px',
          border: '1px solid #e5e7eb',
        }}
      >
        <h2 style={{ fontSize: '16px', fontWeight: '600', color: '#111827', marginBottom: '16px' }}>
          ℹ️ About Your Read-Only Access
        </h2>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '16px' }}>
          <div style={{ padding: '12px', backgroundColor: '#f9fafb', borderRadius: '6px' }}>
            <p style={{ fontSize: '13px', fontWeight: '600', color: '#111827', marginBottom: '8px' }}>✅ You can:</p>
            <ul style={{ fontSize: '12px', color: '#6b7280', lineHeight: '1.6', listStyleType: 'none', padding: 0 }}>
              <li>• View all documents in assigned transactions</li>
              <li>• Search and filter documents</li>
              <li>• Download documents for reference</li>
              <li>• Export snapshots and reports</li>
              <li>• View activity logs and history</li>
            </ul>
          </div>

          <div style={{ padding: '12px', backgroundColor: '#fef2f2', borderRadius: '6px' }}>
            <p style={{ fontSize: '13px', fontWeight: '600', color: '#7f1d1d', marginBottom: '8px' }}>❌ You cannot:</p>
            <ul style={{ fontSize: '12px', color: '#7f1d1d', lineHeight: '1.6', listStyleType: 'none', padding: 0 }}>
              <li>• Upload new documents</li>
              <li>• Edit or modify documents</li>
              <li>• Delete documents</li>
              <li>• Approve or reject documents</li>
              <li>• Create new transactions</li>
            </ul>
          </div>
        </div>
      </div>
    </DashboardBase>
  );
};
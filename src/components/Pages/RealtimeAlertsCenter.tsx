import React, { useState, useEffect } from 'react';
import { Button } from '../Common/Button';
import { Alert } from '../Common/Alert';

interface RealtimeAlert {
  alert_id: string;
  timestamp: string;
  severity: 'critical' | 'high' | 'medium' | 'low' | 'info';
  category: 'Operational' | 'Safety' | 'Compliance' | 'Financial' | 'Environmental' | 'Maintenance' | 'System';
  title: string;
  message: string;
  source: 'Vessel' | 'System' | 'User' | 'Sensor' | 'External';
  related_entity: string; // Vessel name, operation ID, etc.
  status: 'new' | 'acknowledged' | 'resolved' | 'ignored';
  assigned_to?: string;
  action_required: boolean;
  resolution_time?: string;
  notes?: string;
}

interface EventLog {
  event_id: string;
  timestamp: string;
  event_type: 'System' | 'Operation' | 'Maintenance' | 'Inspection' | 'Crew' | 'Financial' | 'Compliance';
  description: string;
  severity: 'info' | 'warning' | 'error' | 'success';
  user_name: string;
  related_entity: string;
  details: string;
}

interface AlertStats {
  total_alerts_today: number;
  critical_alerts: number;
  high_alerts: number;
  medium_alerts: number;
  new_alerts: number;
  acknowledged_alerts: number;
  resolved_alerts: number;
  average_resolution_time: number;
  alert_rate: number;
}

// Mock real-time alerts data
const MOCK_ALERTS: RealtimeAlert[] = [
  {
    alert_id: 'ALT-001',
    timestamp: new Date(Date.now() - 5 * 60000).toISOString(),
    severity: 'critical',
    category: 'Safety',
    title: 'High Engine Temperature Detected',
    message: 'Main engine temperature exceeded 95°C on MV Atlantic Storm. Immediate action required.',
    source: 'Sensor',
    related_entity: 'MV Atlantic Storm',
    status: 'new',
    assigned_to: 'Chief Engineer',
    action_required: true,
  },
  {
    alert_id: 'ALT-002',
    timestamp: new Date(Date.now() - 12 * 60000).toISOString(),
    severity: 'critical',
    category: 'Compliance',
    title: 'Overdue Certificate Found',
    message: 'Medical fitness certificate expired for 2 crew members on MV Indian Ocean.',
    source: 'System',
    related_entity: 'MV Indian Ocean',
    status: 'acknowledged',
    assigned_to: 'HR Manager',
    action_required: true,
    notes: 'Scheduled for renewal on 15 Jan 2026',
  },
  {
    alert_id: 'ALT-003',
    timestamp: new Date(Date.now() - 25 * 60000).toISOString(),
    severity: 'high',
    category: 'Maintenance',
    title: 'Ballast System Pressure Irregular',
    message: 'Ballast pump showing inconsistent pressure readings. Investigate possible suction line issue.',
    source: 'Sensor',
    related_entity: 'MV Ocean Runner',
    status: 'acknowledged',
    assigned_to: 'Pump Technician',
    action_required: true,
    notes: 'Scheduled inspection for 20 Dec',
  },
  {
    alert_id: 'ALT-004',
    timestamp: new Date(Date.now() - 45 * 60000).toISOString(),
    severity: 'high',
    category: 'Operational',
    title: 'STS Operation Delayed',
    message: 'Operation STS-004 delayed due to adverse weather. Sea state elevated to "rough".',
    source: 'User',
    related_entity: 'STS-004',
    status: 'acknowledged',
    assigned_to: 'Operations Manager',
    action_required: false,
    notes: 'On hold until 19 Dec weather improves',
  },
  {
    alert_id: 'ALT-005',
    timestamp: new Date(Date.now() - 60 * 60000).toISOString(),
    severity: 'medium',
    category: 'Financial',
    title: 'Insurance Premium Increase Alert',
    message: 'Fleet average SIRE score declined. Insurance multiplier may increase by 5-8%.',
    source: 'System',
    related_entity: 'MV Atlantic Storm',
    status: 'acknowledged',
    action_required: false,
    notes: 'Re-evaluation scheduled for next quarter',
  },
  {
    alert_id: 'ALT-006',
    timestamp: new Date(Date.now() - 90 * 60000).toISOString(),
    severity: 'medium',
    category: 'Environmental',
    title: 'CO2 Emissions Target Behind',
    message: 'Monthly emissions tracking 8% above green shipping targets. Recommend efficiency review.',
    source: 'System',
    related_entity: 'Fleet-wide',
    status: 'resolved',
    action_required: false,
    resolution_time: '45 minutes',
    notes: 'Action plan implemented. Monitoring continues.',
  },
  {
    alert_id: 'ALT-007',
    timestamp: new Date(Date.now() - 120 * 60000).toISOString(),
    severity: 'low',
    category: 'Maintenance',
    title: 'Routine Maintenance Due',
    message: 'Oil change due on MV Pacific Explorer within next 500 operating hours.',
    source: 'System',
    related_entity: 'MV Pacific Explorer',
    status: 'acknowledged',
    action_required: false,
    notes: 'Scheduled for 20 Jan 2026',
  },
  {
    alert_id: 'ALT-008',
    timestamp: new Date(Date.now() - 150 * 60000).toISOString(),
    severity: 'info',
    category: 'System',
    title: 'System Backup Completed',
    message: 'Daily database backup completed successfully at 02:30 UTC.',
    source: 'System',
    related_entity: 'Dashboard System',
    status: 'resolved',
    action_required: false,
  },
];

const MOCK_EVENT_LOG: EventLog[] = [
  {
    event_id: 'EVT-001',
    timestamp: new Date(Date.now() - 2 * 60000).toISOString(),
    event_type: 'Operation',
    description: 'STS Operation Completed Successfully',
    severity: 'success',
    user_name: 'Operations Team',
    related_entity: 'STS-001',
    details: 'Operation completed 30 minutes ahead of schedule with no issues.',
  },
  {
    event_id: 'EVT-002',
    timestamp: new Date(Date.now() - 8 * 60000).toISOString(),
    event_type: 'Inspection',
    description: 'Port State Control Inspection Conducted',
    severity: 'info',
    user_name: 'PSC Inspector',
    related_entity: 'MV Indian Ocean',
    details: 'Routine PSC inspection completed. No deficiencies noted.',
  },
  {
    event_id: 'EVT-003',
    timestamp: new Date(Date.now() - 15 * 60000).toISOString(),
    event_type: 'Maintenance',
    description: 'Emergency Engine Shutdown',
    severity: 'error',
    user_name: 'Chief Engineer',
    related_entity: 'MV Atlantic Storm',
    details: 'Main engine emergency shutdown due to high temperature alert.',
  },
  {
    event_id: 'EVT-004',
    timestamp: new Date(Date.now() - 35 * 60000).toISOString(),
    event_type: 'Crew',
    description: 'Crew Member Training Completed',
    severity: 'success',
    user_name: 'Training Manager',
    related_entity: 'MV Cargo Master',
    details: 'Advanced Fire Safety training completed for 4 crew members.',
  },
  {
    event_id: 'EVT-005',
    timestamp: new Date(Date.now() - 50 * 60000).toISOString(),
    event_type: 'System',
    description: 'Dashboard Analytics Report Generated',
    severity: 'info',
    user_name: 'System',
    related_entity: 'Dashboard',
    details: 'Monthly compliance report generated and exported to stakeholders.',
  },
];

const calculateStats = (alerts: RealtimeAlert[]): AlertStats => {
  const critical = alerts.filter(a => a.severity === 'critical').length;
  const high = alerts.filter(a => a.severity === 'high').length;
  const medium = alerts.filter(a => a.severity === 'medium').length;
  const newAlerts = alerts.filter(a => a.status === 'new').length;
  const acknowledged = alerts.filter(a => a.status === 'acknowledged').length;
  const resolved = alerts.filter(a => a.status === 'resolved').length;

  return {
    total_alerts_today: alerts.length,
    critical_alerts: critical,
    high_alerts: high,
    medium_alerts: medium,
    new_alerts: newAlerts,
    acknowledged_alerts: acknowledged,
    resolved_alerts: resolved,
    average_resolution_time: 45,
    alert_rate: 12.3,
  };
};

const getSeverityColor = (severity: string): { bg: string; color: string; icon: string } => {
  switch (severity) {
    case 'critical':
      return { bg: '#fadbd8', color: '#c0392b', icon: '🔴' };
    case 'high':
      return { bg: '#fdeaa8', color: '#d68910', icon: '🟠' };
    case 'medium':
      return { bg: '#d6eaf8', color: '#1f618d', icon: '🔵' };
    case 'low':
      return { bg: '#d5f4e6', color: '#0e6251', icon: '🟢' };
    case 'info':
      return { bg: '#ecf0f1', color: '#34495e', icon: 'ℹ️' };
    default:
      return { bg: '#ecf0f1', color: '#34495e', icon: '⚪' };
  }
};

const getEventSeverityColor = (severity: string): string => {
  switch (severity) {
    case 'error':
      return '#e74c3c';
    case 'warning':
      return '#f39c12';
    case 'success':
      return '#27ae60';
    case 'info':
      return '#3498db';
    default:
      return '#7f8c8d';
  }
};

export const RealtimeAlertsCenter: React.FC = () => {
  const alerts = MOCK_ALERTS;
  const eventLog = MOCK_EVENT_LOG;
  const stats = calculateStats(alerts);

  const [activeTab, setActiveTab] = useState<'alerts' | 'events' | 'stats'>('alerts');
  const [filterSeverity, setFilterSeverity] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [acknowledgedAlerts, setAcknowledgedAlerts] = useState<string[]>([]);

  const criticalAlerts = alerts.filter(a => a.severity === 'critical' || a.severity === 'high');
  const filteredAlerts = alerts
    .filter(a => filterSeverity === 'all' || a.severity === filterSeverity)
    .filter(a => filterStatus === 'all' || a.status === filterStatus);

  return (
    <div style={{ padding: '20px 0' }}>
      {/* Header */}
      <div style={{ marginBottom: '24px' }}>
        <h2 style={{ fontSize: '24px', fontWeight: '700', color: '#2c3e50', margin: '0 0 8px 0' }}>
          🚨 Real-time Alerts Center
        </h2>
        <p style={{ color: '#7f8c8d', fontSize: '14px', margin: 0 }}>
          Live alert monitoring, event logging, incident tracking, and notification management
        </p>
      </div>

      {/* Critical Alerts Banner */}
      {criticalAlerts.length > 0 && (
        <Alert
          variant="critical"
          title={`⚠️ ${criticalAlerts.length} Critical/High Severity Alerts`}
          message="Immediate attention required for operational safety and compliance."
        />
      )}

      {/* Key Stats */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
          gap: '16px',
          marginBottom: '24px',
        }}
      >
        <div style={{ background: '#fadbd8', borderRadius: '12px', padding: '16px', border: '1px solid #e74c3c' }}>
          <p style={{ fontSize: '12px', color: '#c0392b', margin: '0 0 8px 0', fontWeight: '600' }}>
            🔴 Critical
          </p>
          <p style={{ fontSize: '28px', fontWeight: '700', color: '#c0392b', margin: 0 }}>
            {stats.critical_alerts}
          </p>
        </div>
        <div style={{ background: '#fdeaa8', borderRadius: '12px', padding: '16px', border: '1px solid #f39c12' }}>
          <p style={{ fontSize: '12px', color: '#d68910', margin: '0 0 8px 0', fontWeight: '600' }}>
            🟠 High
          </p>
          <p style={{ fontSize: '28px', fontWeight: '700', color: '#f39c12', margin: 0 }}>
            {stats.high_alerts}
          </p>
        </div>
        <div style={{ background: '#d6eaf8', borderRadius: '12px', padding: '16px', border: '1px solid #3498db' }}>
          <p style={{ fontSize: '12px', color: '#1f618d', margin: '0 0 8px 0', fontWeight: '600' }}>
            🔵 Medium
          </p>
          <p style={{ fontSize: '28px', fontWeight: '700', color: '#3498db', margin: 0 }}>
            {stats.medium_alerts}
          </p>
        </div>
        <div style={{ background: '#fff', border: '1px solid #e0e6ed', borderRadius: '12px', padding: '16px' }}>
          <p style={{ fontSize: '12px', color: '#7f8c8d', margin: '0 0 8px 0' }}>New Alerts</p>
          <p style={{ fontSize: '28px', fontWeight: '700', color: '#e74c3c', margin: 0 }}>
            {stats.new_alerts}
          </p>
        </div>
        <div style={{ background: '#fff', border: '1px solid #e0e6ed', borderRadius: '12px', padding: '16px' }}>
          <p style={{ fontSize: '12px', color: '#7f8c8d', margin: '0 0 8px 0' }}>Avg Resolution Time</p>
          <p style={{ fontSize: '28px', fontWeight: '700', color: '#3498db', margin: 0 }}>
            {stats.average_resolution_time} min
          </p>
        </div>
        <div style={{ background: '#fff', border: '1px solid #e0e6ed', borderRadius: '12px', padding: '16px' }}>
          <p style={{ fontSize: '12px', color: '#7f8c8d', margin: '0 0 8px 0' }}>Alert Rate</p>
          <p style={{ fontSize: '28px', fontWeight: '700', color: '#f39c12', margin: 0 }}>
            {stats.alert_rate}/hr
          </p>
        </div>
      </div>

      {/* Tab Navigation */}
      <div
        style={{
          display: 'flex',
          gap: '8px',
          marginBottom: '24px',
          borderBottom: '2px solid #e0e6ed',
        }}
      >
        {['alerts', 'events', 'stats'].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab as any)}
            style={{
              padding: '12px 16px',
              border: 'none',
              background: 'none',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: '600',
              color: activeTab === tab ? '#3498db' : '#7f8c8d',
              borderBottom: activeTab === tab ? '3px solid #3498db' : '3px solid transparent',
              marginBottom: '-2px',
            }}
          >
            {tab === 'alerts' && `🚨 Active Alerts (${stats.new_alerts})`}
            {tab === 'events' && '📋 Event Log'}
            {tab === 'stats' && '📊 Statistics'}
          </button>
        ))}
      </div>

      {/* ALERTS TAB */}
      {activeTab === 'alerts' && (
        <>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: '16px',
              marginBottom: '24px',
            }}
          >
            <div>
              <label style={{ fontSize: '12px', fontWeight: '600', color: '#2c3e50', display: 'block', marginBottom: '8px' }}>
                Filter by Severity
              </label>
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                {['all', 'critical', 'high', 'medium', 'low'].map((sev) => (
                  <button
                    key={sev}
                    onClick={() => setFilterSeverity(sev)}
                    style={{
                      padding: '4px 8px',
                      borderRadius: '4px',
                      border: filterSeverity === sev ? '2px solid #3498db' : '1px solid #bdc3c7',
                      background: filterSeverity === sev ? '#ebf5fb' : '#fff',
                      color: filterSeverity === sev ? '#3498db' : '#7f8c8d',
                      cursor: 'pointer',
                      fontSize: '11px',
                      fontWeight: '600',
                    }}
                  >
                    {sev.toUpperCase()}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label style={{ fontSize: '12px', fontWeight: '600', color: '#2c3e50', display: 'block', marginBottom: '8px' }}>
                Filter by Status
              </label>
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                {['all', 'new', 'acknowledged', 'resolved'].map((stat) => (
                  <button
                    key={stat}
                    onClick={() => setFilterStatus(stat)}
                    style={{
                      padding: '4px 8px',
                      borderRadius: '4px',
                      border: filterStatus === stat ? '2px solid #3498db' : '1px solid #bdc3c7',
                      background: filterStatus === stat ? '#ebf5fb' : '#fff',
                      color: filterStatus === stat ? '#3498db' : '#7f8c8d',
                      cursor: 'pointer',
                      fontSize: '11px',
                      fontWeight: '600',
                    }}
                  >
                    {stat.toUpperCase()}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {filteredAlerts.map((alert) => {
              const severityColor = getSeverityColor(alert.severity);
              return (
                <div
                  key={alert.alert_id}
                  style={{
                    border: `2px solid ${severityColor.color}`,
                    borderRadius: '8px',
                    padding: '12px',
                    background: severityColor.bg + '20',
                    display: 'flex',
                    gap: '12px',
                  }}
                >
                  <div style={{ fontSize: '20px' }}>{severityColor.icon}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '6px' }}>
                      <p style={{ fontSize: '13px', fontWeight: '700', color: '#2c3e50', margin: 0 }}>
                        {alert.title}
                      </p>
                      <div style={{ display: 'flex', gap: '6px' }}>
                        <span
                          style={{
                            fontSize: '10px',
                            fontWeight: '700',
                            padding: '2px 6px',
                            borderRadius: '3px',
                            background: severityColor.bg,
                            color: severityColor.color,
                          }}
                        >
                          {alert.severity.toUpperCase()}
                        </span>
                        <span
                          style={{
                            fontSize: '10px',
                            fontWeight: '700',
                            padding: '2px 6px',
                            borderRadius: '3px',
                            background: alert.status === 'new' ? '#e74c3c40' : '#27ae6040',
                            color: alert.status === 'new' ? '#c0392b' : '#0e6251',
                          }}
                        >
                          {alert.status.toUpperCase()}
                        </span>
                      </div>
                    </div>
                    <p style={{ fontSize: '12px', color: '#34495e', margin: '0 0 6px 0', lineHeight: '1.4' }}>
                      {alert.message}
                    </p>
                    <div style={{ display: 'flex', gap: '12px', fontSize: '11px', color: '#7f8c8d' }}>
                      <span>📍 {alert.related_entity}</span>
                      <span>⏱️ {new Date(alert.timestamp).toLocaleTimeString()}</span>
                      {alert.assigned_to && <span>👤 {alert.assigned_to}</span>}
                    </div>
                  </div>
                  {alert.status !== 'resolved' && (
                    <button
                      onClick={() => {
                        if (alert.status === 'new') {
                          setAcknowledgedAlerts([...acknowledgedAlerts, alert.alert_id]);
                        }
                      }}
                      style={{
                        padding: '6px 10px',
                        borderRadius: '4px',
                        border: 'none',
                        background: '#3498db',
                        color: '#fff',
                        cursor: 'pointer',
                        fontSize: '11px',
                        fontWeight: '600',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {alert.status === 'new' ? 'ACK' : 'Resolve'}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* EVENTS TAB */}
      {activeTab === 'events' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {eventLog.map((event) => (
            <div
              key={event.event_id}
              style={{
                background: '#fff',
                border: `1px solid ${getEventSeverityColor(event.severity)}`,
                borderLeft: `4px solid ${getEventSeverityColor(event.severity)}`,
                borderRadius: '8px',
                padding: '12px',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '6px' }}>
                <p style={{ fontSize: '13px', fontWeight: '700', color: '#2c3e50', margin: 0 }}>
                  {event.description}
                </p>
                <span
                  style={{
                    fontSize: '10px',
                    fontWeight: '700',
                    padding: '2px 6px',
                    borderRadius: '3px',
                    background: getEventSeverityColor(event.severity) + '20',
                    color: getEventSeverityColor(event.severity),
                  }}
                >
                  {event.event_type.toUpperCase()}
                </span>
              </div>
              <p style={{ fontSize: '12px', color: '#34495e', margin: '0 0 6px 0' }}>
                {event.details}
              </p>
              <div style={{ display: 'flex', gap: '12px', fontSize: '11px', color: '#7f8c8d' }}>
                <span>👤 {event.user_name}</span>
                <span>📍 {event.related_entity}</span>
                <span>⏱️ {new Date(event.timestamp).toLocaleTimeString()}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* STATS TAB */}
      {activeTab === 'stats' && (
        <div style={{ background: '#fff', border: '1px solid #e0e6ed', borderRadius: '12px', padding: '20px' }}>
          <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '16px', color: '#2c3e50' }}>
            📊 Alert Statistics Summary
          </h3>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: '16px',
            }}
          >
            <div style={{ padding: '16px', background: '#f8f9fa', borderRadius: '8px', borderLeft: '4px solid #c0392b' }}>
              <p style={{ fontSize: '11px', color: '#7f8c8d', margin: '0 0 8px 0', fontWeight: '600' }}>
                Total Alerts Today
              </p>
              <p style={{ fontSize: '24px', fontWeight: '700', color: '#2c3e50', margin: 0 }}>
                {stats.total_alerts_today}
              </p>
              <p style={{ fontSize: '10px', color: '#7f8c8d', margin: '4px 0 0 0' }}>
                Alert frequency: {stats.alert_rate}/hour
              </p>
            </div>
            <div style={{ padding: '16px', background: '#f8f9fa', borderRadius: '8px', borderLeft: '4px solid #27ae60' }}>
              <p style={{ fontSize: '11px', color: '#7f8c8d', margin: '0 0 8px 0', fontWeight: '600' }}>
                Alerts Resolved
              </p>
              <p style={{ fontSize: '24px', fontWeight: '700', color: '#27ae60', margin: 0 }}>
                {stats.resolved_alerts}
              </p>
              <p style={{ fontSize: '10px', color: '#7f8c8d', margin: '4px 0 0 0' }}>
                Avg time: {stats.average_resolution_time} minutes
              </p>
            </div>
            <div style={{ padding: '16px', background: '#f8f9fa', borderRadius: '8px', borderLeft: '4px solid #f39c12' }}>
              <p style={{ fontSize: '11px', color: '#7f8c8d', margin: '0 0 8px 0', fontWeight: '600' }}>
                Alerts Acknowledged
              </p>
              <p style={{ fontSize: '24px', fontWeight: '700', color: '#f39c12', margin: 0 }}>
                {stats.acknowledged_alerts}
              </p>
              <p style={{ fontSize: '10px', color: '#7f8c8d', margin: '4px 0 0 0' }}>
                Pending resolution
              </p>
            </div>
            <div style={{ padding: '16px', background: '#f8f9fa', borderRadius: '8px', borderLeft: '4px solid #3498db' }}>
              <p style={{ fontSize: '11px', color: '#7f8c8d', margin: '0 0 8px 0', fontWeight: '600' }}>
                New Alerts
              </p>
              <p style={{ fontSize: '24px', fontWeight: '700', color: '#3498db', margin: 0 }}>
                {stats.new_alerts}
              </p>
              <p style={{ fontSize: '10px', color: '#7f8c8d', margin: '4px 0 0 0' }}>
                Require acknowledgement
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RealtimeAlertsCenter;
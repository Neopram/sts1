import React, { useState } from 'react';
import { Button } from '../Common/Button';
import { Alert } from '../Common/Alert';

interface MaintenanceRecord {
  maintenance_id: string;
  vessel_name: string;
  equipment_name: string;
  equipment_type: 'Engine' | 'Propulsion' | 'Navigation' | 'Safety' | 'Hull' | 'Electrical' | 'HVAC' | 'Plumbing';
  scheduled_date: string;
  completed_date?: string;
  due_date: string;
  status: 'pending' | 'in-progress' | 'completed' | 'overdue' | 'deferred';
  maintenance_type: 'routine' | 'preventive' | 'corrective' | 'emergency';
  assigned_technician: string;
  estimated_cost: number;
  actual_cost?: number;
  parts_used: string[];
  next_due_interval: string;
  downtime_hours: number;
  priority: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  notes?: string;
}

interface MaintenanceStats {
  total_maintenance_records: number;
  pending_maintenance: number;
  overdue_maintenance: number;
  completed_this_month: number;
  total_maintenance_cost_year: number;
  average_downtime_hours: number;
  equipment_coverage_percent: number;
  compliance_rate: number;
}

interface MaintenanceLogManagerProps {
  stats?: MaintenanceStats;
  records?: MaintenanceRecord[];
  isLoading?: boolean;
}

// Mock maintenance data - realistic maritime maintenance schedule
const MOCK_MAINTENANCE: MaintenanceRecord[] = [
  {
    maintenance_id: 'MNT-001',
    vessel_name: 'MV Pacific Explorer',
    equipment_name: 'Main Engine',
    equipment_type: 'Engine',
    scheduled_date: '2025-12-10',
    completed_date: '2025-12-10',
    due_date: '2025-12-10',
    status: 'completed',
    maintenance_type: 'preventive',
    assigned_technician: 'Tommy Maclean (Chief Engineer)',
    estimated_cost: 8500,
    actual_cost: 8450,
    parts_used: ['Oil filter', 'Air filter', 'Coolant additive', 'Gasket seal'],
    next_due_interval: 'Jan 2026 (500 operating hours)',
    downtime_hours: 4,
    priority: 'high',
    description: 'Main engine oil and filter service, coolant system inspection',
    notes: 'Oil analysis shows excellent condition. Next service scheduled.',
  },
  {
    maintenance_id: 'MNT-002',
    vessel_name: 'MV Atlantic Storm',
    equipment_name: 'Propulsion System',
    equipment_type: 'Propulsion',
    scheduled_date: '2025-12-18',
    due_date: '2025-12-18',
    status: 'in-progress',
    maintenance_type: 'corrective',
    assigned_technician: 'João Silva (Marine Technician)',
    estimated_cost: 15000,
    parts_used: ['Propeller shaft bearing', 'Lubrication system parts'],
    next_due_interval: 'Feb 2026',
    downtime_hours: 12,
    priority: 'critical',
    description: 'Propeller shaft bearing replacement and lubrication system overhaul',
    notes: 'Vibration detected during last voyage. Bearing showing wear.',
  },
  {
    maintenance_id: 'MNT-003',
    vessel_name: 'MV Indian Ocean',
    equipment_name: 'Navigation System',
    equipment_type: 'Navigation',
    scheduled_date: '2025-12-05',
    completed_date: '2025-12-05',
    due_date: '2025-12-05',
    status: 'completed',
    maintenance_type: 'routine',
    assigned_technician: 'Hassan Al-Rashid (Navigation Officer)',
    estimated_cost: 3200,
    actual_cost: 3200,
    parts_used: ['GPS antenna', 'Radar calibration', 'ECDIS software update'],
    next_due_interval: 'Jan 2026 (Annual)',
    downtime_hours: 2,
    priority: 'medium',
    description: 'Annual GPS, Radar and ECDIS system maintenance and calibration',
  },
  {
    maintenance_id: 'MNT-004',
    vessel_name: 'MV Cargo Master',
    equipment_name: 'Fire Safety System',
    equipment_type: 'Safety',
    scheduled_date: '2025-12-22',
    due_date: '2025-12-22',
    status: 'pending',
    maintenance_type: 'preventive',
    assigned_technician: 'Alex Thompson (Safety Inspector)',
    estimated_cost: 6800,
    parts_used: [],
    next_due_interval: 'Jun 2026',
    downtime_hours: 8,
    priority: 'high',
    description: 'Fire extinguisher inspection, sprinkler system test, emergency procedures drill',
  },
  {
    maintenance_id: 'MNT-005',
    vessel_name: 'MV Ocean Runner',
    equipment_name: 'Hull Paint System',
    equipment_type: 'Hull',
    scheduled_date: '2025-11-15',
    due_date: '2025-12-15',
    status: 'overdue',
    maintenance_type: 'preventive',
    assigned_technician: 'Carlos Mendez (Bosun)',
    estimated_cost: 22000,
    parts_used: [],
    next_due_interval: 'Dec 2026 (Annual)',
    downtime_hours: 40,
    priority: 'medium',
    description: 'Hull anti-fouling paint inspection and recoating (dry dock)',
    notes: 'Scheduled for dry dock. Coral Sea Dry Dock booked for Feb 2026.',
  },
  {
    maintenance_id: 'MNT-006',
    vessel_name: 'MV Cargo Master',
    equipment_name: 'Electrical System',
    equipment_type: 'Electrical',
    scheduled_date: '2025-12-28',
    due_date: '2025-12-28',
    status: 'pending',
    maintenance_type: 'routine',
    assigned_technician: 'Maria Rodriguez (Electrician)',
    estimated_cost: 4500,
    parts_used: [],
    next_due_interval: 'Mar 2026',
    downtime_hours: 3,
    priority: 'medium',
    description: 'Electrical panel inspection, circuit breaker testing, power distribution check',
  },
  {
    maintenance_id: 'MNT-007',
    vessel_name: 'MV Pacific Explorer',
    equipment_name: 'Cooling System',
    equipment_type: 'HVAC',
    scheduled_date: '2025-12-20',
    due_date: '2025-12-20',
    status: 'pending',
    maintenance_type: 'preventive',
    assigned_technician: 'Robert Chen (HVAC Technician)',
    estimated_cost: 5600,
    parts_used: [],
    next_due_interval: 'Mar 2026',
    downtime_hours: 6,
    priority: 'medium',
    description: 'Air conditioning system inspection, refrigerant top-up, filter replacement',
  },
  {
    maintenance_id: 'MNT-008',
    vessel_name: 'MV Atlantic Storm',
    equipment_name: 'Ballast System',
    equipment_type: 'Plumbing',
    scheduled_date: '2025-11-20',
    due_date: '2025-12-05',
    status: 'overdue',
    maintenance_type: 'corrective',
    assigned_technician: 'Dimitri Volkov (Pump Technician)',
    estimated_cost: 18500,
    parts_used: [],
    next_due_interval: 'May 2026',
    downtime_hours: 16,
    priority: 'critical',
    description: 'Ballast pump replacement and suction line inspection',
    notes: 'Pump showing inefficiency. Required for operation.',
  },
];

const calculateStats = (records: MaintenanceRecord[]): MaintenanceStats => {
  const pending = records.filter(r => r.status === 'pending').length;
  const overdue = records.filter(r => r.status === 'overdue').length;
  const completedThisMonth = records.filter(r => {
    if (r.completed_date) {
      const completed = new Date(r.completed_date);
      const now = new Date();
      return completed.getMonth() === now.getMonth() && completed.getFullYear() === now.getFullYear();
    }
    return false;
  }).length;

  const totalCost = records.reduce((sum, r) => sum + (r.actual_cost || r.estimated_cost), 0);
  const avgDowntime = records.reduce((sum, r) => sum + r.downtime_hours, 0) / (records.length || 1);
  const complianceRate = ((records.filter(r => r.status === 'completed').length / records.length) * 100) || 0;

  return {
    total_maintenance_records: records.length,
    pending_maintenance: pending,
    overdue_maintenance: overdue,
    completed_this_month: completedThisMonth,
    total_maintenance_cost_year: totalCost,
    average_downtime_hours: avgDowntime,
    equipment_coverage_percent: 87,
    compliance_rate: Math.round(complianceRate),
  };
};

const getStatusColor = (status: MaintenanceRecord['status']): string => {
  switch (status) {
    case 'completed':
      return '#27ae60';
    case 'in-progress':
      return '#3498db';
    case 'pending':
      return '#f39c12';
    case 'overdue':
      return '#e74c3c';
    case 'deferred':
      return '#95a5a6';
    default:
      return '#7f8c8d';
  }
};

const getPriorityBadge = (priority: MaintenanceRecord['priority']): { bg: string; color: string; emoji: string } => {
  switch (priority) {
    case 'critical':
      return { bg: '#fadbd8', color: '#c0392b', emoji: '🔴' };
    case 'high':
      return { bg: '#fdeaa8', color: '#d68910', emoji: '🟠' };
    case 'medium':
      return { bg: '#d6eaf8', color: '#1f618d', emoji: '🔵' };
    case 'low':
      return { bg: '#d5f4e6', color: '#0e6251', emoji: '🟢' };
    default:
      return { bg: '#ecf0f1', color: '#34495e', emoji: '⚪' };
  }
};

export const MaintenanceLogManager: React.FC<MaintenanceLogManagerProps> = ({
  stats: customStats,
  records: customRecords,
  isLoading = false,
}) => {
  const records = customRecords || MOCK_MAINTENANCE;
  const stats = customStats || calculateStats(records);

  const [filterStatus, setFilterStatus] = useState<MaintenanceRecord['status'] | 'all'>('all');
  const [filterEquipment, setFilterEquipment] = useState<MaintenanceRecord['equipment_type'] | 'all'>('all');
  const [sortBy, setSortBy] = useState<'due-date' | 'priority' | 'cost'>('due-date');
  const [showForm, setShowForm] = useState(false);

  const filteredRecords = records
    .filter(r => filterStatus === 'all' || r.status === filterStatus)
    .filter(r => filterEquipment === 'all' || r.equipment_type === filterEquipment)
    .sort((a, b) => {
      if (sortBy === 'due-date') {
        return new Date(a.due_date).getTime() - new Date(b.due_date).getTime();
      } else if (sortBy === 'priority') {
        const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
        return priorityOrder[a.priority] - priorityOrder[b.priority];
      } else {
        return (b.estimated_cost || 0) - (a.estimated_cost || 0);
      }
    });

  const equipmentTypes: MaintenanceRecord['equipment_type'][] = [
    'Engine',
    'Propulsion',
    'Navigation',
    'Safety',
    'Hull',
    'Electrical',
    'HVAC',
    'Plumbing',
  ];

  return (
    <div style={{ padding: '20px 0' }}>
      {/* Header */}
      <div style={{ marginBottom: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h2 style={{ fontSize: '24px', fontWeight: '700', color: '#2c3e50', margin: 0 }}>
            🔧 Maintenance Log Manager
          </h2>
          <Button
            onClick={() => setShowForm(!showForm)}
            style={{
              background: '#3498db',
              color: '#fff',
              border: 'none',
              padding: '10px 16px',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: '600',
            }}
          >
            {showForm ? '❌ Cancel' : '➕ New Maintenance'}
          </Button>
        </div>
        <p style={{ color: '#7f8c8d', fontSize: '14px', margin: 0 }}>
          Track all vessel maintenance activities, schedules, costs, and compliance
        </p>
      </div>

      {/* Stats Cards */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '16px',
          marginBottom: '24px',
        }}
      >
        <div style={{ background: '#fff', border: '1px solid #e0e6ed', borderRadius: '12px', padding: '16px' }}>
          <p style={{ fontSize: '12px', color: '#7f8c8d', margin: '0 0 8px 0' }}>Total Records</p>
          <p style={{ fontSize: '28px', fontWeight: '700', color: '#2c3e50', margin: 0 }}>
            {stats.total_maintenance_records}
          </p>
        </div>
        <div
          style={{
            background: '#fdeaa8',
            borderRadius: '12px',
            padding: '16px',
            border: '1px solid #f39c12',
          }}
        >
          <p style={{ fontSize: '12px', color: '#d68910', margin: '0 0 8px 0', fontWeight: '600' }}>
            Pending Maintenance
          </p>
          <p style={{ fontSize: '28px', fontWeight: '700', color: '#d68910', margin: 0 }}>
            {stats.pending_maintenance}
          </p>
        </div>
        <div
          style={{
            background: '#fadbd8',
            borderRadius: '12px',
            padding: '16px',
            border: '1px solid #e74c3c',
          }}
        >
          <p style={{ fontSize: '12px', color: '#c0392b', margin: '0 0 8px 0', fontWeight: '600' }}>
            ⚠️ Overdue
          </p>
          <p style={{ fontSize: '28px', fontWeight: '700', color: '#c0392b', margin: 0 }}>
            {stats.overdue_maintenance}
          </p>
        </div>
        <div style={{ background: '#d5f4e6', borderRadius: '12px', padding: '16px', border: '1px solid #27ae60' }}>
          <p style={{ fontSize: '12px', color: '#0e6251', margin: '0 0 8px 0', fontWeight: '600' }}>
            Completed (Month)
          </p>
          <p style={{ fontSize: '28px', fontWeight: '700', color: '#27ae60', margin: 0 }}>
            {stats.completed_this_month}
          </p>
        </div>
        <div style={{ background: '#fff', border: '1px solid #e0e6ed', borderRadius: '12px', padding: '16px' }}>
          <p style={{ fontSize: '12px', color: '#7f8c8d', margin: '0 0 8px 0' }}>Compliance Rate</p>
          <p style={{ fontSize: '28px', fontWeight: '700', color: '#3498db', margin: 0 }}>
            {stats.compliance_rate}%
          </p>
        </div>
        <div style={{ background: '#fff', border: '1px solid #e0e6ed', borderRadius: '12px', padding: '16px' }}>
          <p style={{ fontSize: '12px', color: '#7f8c8d', margin: '0 0 8px 0' }}>Annual Cost</p>
          <p style={{ fontSize: '28px', fontWeight: '700', color: '#e74c3c', margin: 0 }}>
            ${(stats.total_maintenance_cost_year / 1000).toFixed(1)}K
          </p>
        </div>
      </div>

      {/* Alerts */}
      {stats.overdue_maintenance > 0 && (
        <Alert
          variant="critical"
          title="⚠️ Overdue Maintenance"
          message={`${stats.overdue_maintenance} maintenance tasks are overdue. Immediate action required to maintain compliance.`}
        />
      )}

      {/* Filters */}
      <div
        style={{
          background: '#fff',
          border: '1px solid #e0e6ed',
          borderRadius: '12px',
          padding: '16px',
          marginBottom: '24px',
        }}
      >
        <div style={{ marginBottom: '12px' }}>
          <label style={{ fontSize: '12px', fontWeight: '600', color: '#2c3e50', display: 'block', marginBottom: '8px' }}>
            Filter by Status
          </label>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {['all', 'pending', 'in-progress', 'completed', 'overdue'].map((status) => (
              <button
                key={status}
                onClick={() => setFilterStatus(status as any)}
                style={{
                  padding: '6px 12px',
                  borderRadius: '6px',
                  border: filterStatus === status ? '2px solid #3498db' : '1px solid #bdc3c7',
                  background: filterStatus === status ? '#ebf5fb' : '#fff',
                  color: filterStatus === status ? '#3498db' : '#7f8c8d',
                  cursor: 'pointer',
                  fontSize: '13px',
                  fontWeight: '500',
                }}
              >
                {status.toUpperCase()}
              </button>
            ))}
          </div>
        </div>

        <div style={{ marginBottom: '12px' }}>
          <label style={{ fontSize: '12px', fontWeight: '600', color: '#2c3e50', display: 'block', marginBottom: '8px' }}>
            Filter by Equipment Type
          </label>
          <select
            value={filterEquipment}
            onChange={(e) => setFilterEquipment(e.target.value as any)}
            style={{
              padding: '8px 12px',
              borderRadius: '6px',
              border: '1px solid #bdc3c7',
              background: '#fff',
              color: '#2c3e50',
              cursor: 'pointer',
              fontSize: '13px',
              fontWeight: '500',
            }}
          >
            <option value="all">All Equipment Types</option>
            {equipmentTypes.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label style={{ fontSize: '12px', fontWeight: '600', color: '#2c3e50', display: 'block', marginBottom: '8px' }}>
            Sort by
          </label>
          <div style={{ display: 'flex', gap: '8px' }}>
            {(['due-date', 'priority', 'cost'] as const).map((sort) => (
              <button
                key={sort}
                onClick={() => setSortBy(sort)}
                style={{
                  padding: '6px 12px',
                  borderRadius: '6px',
                  border: sortBy === sort ? '2px solid #3498db' : '1px solid #bdc3c7',
                  background: sortBy === sort ? '#ebf5fb' : '#fff',
                  color: sortBy === sort ? '#3498db' : '#7f8c8d',
                  cursor: 'pointer',
                  fontSize: '13px',
                  fontWeight: '500',
                }}
              >
                {sort === 'due-date' ? '📅 Due Date' : sort === 'priority' ? '⚡ Priority' : '💰 Cost'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Maintenance Records Table */}
      <div style={{ overflowX: 'auto' }}>
        <table
          style={{
            width: '100%',
            borderCollapse: 'collapse',
            fontSize: '13px',
            background: '#fff',
            borderRadius: '12px',
            overflow: 'hidden',
          }}
        >
          <thead>
            <tr style={{ background: '#f8f9fa', borderBottom: '2px solid #e0e6ed' }}>
              <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600', color: '#2c3e50' }}>Equipment</th>
              <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600', color: '#2c3e50' }}>Vessel</th>
              <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600', color: '#2c3e50' }}>Type</th>
              <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600', color: '#2c3e50' }}>Due Date</th>
              <th style={{ padding: '12px', textAlign: 'center', fontWeight: '600', color: '#2c3e50' }}>Status</th>
              <th style={{ padding: '12px', textAlign: 'center', fontWeight: '600', color: '#2c3e50' }}>Priority</th>
              <th style={{ padding: '12px', textAlign: 'right', fontWeight: '600', color: '#2c3e50' }}>Cost</th>
            </tr>
          </thead>
          <tbody>
            {filteredRecords.map((record, idx) => (
              <tr
                key={record.maintenance_id}
                style={{
                  borderBottom: '1px solid #e0e6ed',
                  background: idx % 2 === 0 ? '#fff' : '#f8f9fa',
                }}
              >
                <td style={{ padding: '12px' }}>
                  <div>
                    <p style={{ margin: '0 0 4px 0', fontWeight: '600', color: '#2c3e50' }}>
                      {record.equipment_name}
                    </p>
                    <p style={{ margin: 0, fontSize: '11px', color: '#7f8c8d' }}>
                      {record.maintenance_type.charAt(0).toUpperCase() + record.maintenance_type.slice(1)}
                    </p>
                  </div>
                </td>
                <td style={{ padding: '12px', color: '#2c3e50' }}>{record.vessel_name}</td>
                <td style={{ padding: '12px', color: '#7f8c8d' }}>{record.equipment_type}</td>
                <td style={{ padding: '12px' }}>
                  <p style={{ margin: 0, color: '#2c3e50' }}>
                    {new Date(record.due_date).toLocaleDateString()}
                  </p>
                  <p
                    style={{
                      margin: '4px 0 0 0',
                      fontSize: '11px',
                      color: '#7f8c8d',
                    }}
                  >
                    {record.next_due_interval}
                  </p>
                </td>
                <td style={{ padding: '12px', textAlign: 'center' }}>
                  <span
                    style={{
                      display: 'inline-block',
                      fontSize: '11px',
                      fontWeight: '600',
                      padding: '4px 8px',
                      borderRadius: '4px',
                      background: getStatusColor(record.status) + '20',
                      color: getStatusColor(record.status),
                    }}
                  >
                    {record.status.replace('-', ' ').toUpperCase()}
                  </span>
                </td>
                <td style={{ padding: '12px', textAlign: 'center' }}>
                  <span
                    style={{
                      display: 'inline-block',
                      fontSize: '11px',
                      fontWeight: '600',
                      padding: '4px 8px',
                      borderRadius: '4px',
                      background: getPriorityBadge(record.priority).bg,
                      color: getPriorityBadge(record.priority).color,
                    }}
                  >
                    {getPriorityBadge(record.priority).emoji} {record.priority.toUpperCase()}
                  </span>
                </td>
                <td style={{ padding: '12px', textAlign: 'right', fontWeight: '600', color: '#e74c3c' }}>
                  ${(record.estimated_cost / 1000).toFixed(1)}K
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Details Section */}
      {filteredRecords.length > 0 && (
        <div style={{ marginTop: '24px' }}>
          <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '16px', color: '#2c3e50' }}>
            📊 Summary by Status
          </h3>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: '12px',
            }}
          >
            {(['pending', 'in-progress', 'completed', 'overdue'] as const).map((status) => {
              const count = records.filter(r => r.status === status).length;
              const total = records.filter(r => r.status === status).reduce((sum, r) => sum + r.estimated_cost, 0);
              return (
                <div
                  key={status}
                  style={{
                    background: '#fff',
                    border: `1px solid ${getStatusColor(status)}40`,
                    borderRadius: '8px',
                    padding: '12px',
                  }}
                >
                  <p style={{ fontSize: '12px', color: '#7f8c8d', margin: '0 0 8px 0' }}>
                    {status.replace('-', ' ').toUpperCase()}
                  </p>
                  <p style={{ fontSize: '20px', fontWeight: '700', color: getStatusColor(status), margin: '0 0 4px 0' }}>
                    {count}
                  </p>
                  <p style={{ fontSize: '11px', color: '#7f8c8d', margin: 0 }}>
                    Total: ${(total / 1000).toFixed(1)}K
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default MaintenanceLogManager;
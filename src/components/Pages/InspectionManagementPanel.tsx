import React, { useState } from 'react';
import { Button } from '../Common/Button';
import { Alert } from '../Common/Alert';

interface Inspection {
  inspection_id: string;
  vessel_name: string;
  inspection_type: 'SIRE' | 'PSC' | 'VETTING' | 'INTERNAL';
  inspector_name: string;
  scheduled_date: string;
  completed_date: string | null;
  status: 'scheduled' | 'in-progress' | 'completed' | 'cancelled';
  sire_score?: number;
  findings_count: number;
  critical_findings: number;
  notes: string;
}

interface InspectionStats {
  total_inspections: number;
  completed_this_year: number;
  scheduled_upcoming: number;
  average_sire_score: number;
  compliance_trend: 'improving' | 'stable' | 'declining';
}

interface InspectionManagementPanelProps {
  stats?: InspectionStats;
  inspections?: Inspection[];
  isLoading?: boolean;
}

// Mock inspection data - realistic maritime inspection schedule
const MOCK_INSPECTIONS: Inspection[] = [
  {
    inspection_id: 'INS-001',
    vessel_name: 'MV Pacific Explorer',
    inspection_type: 'SIRE',
    inspector_name: 'Captain John Smith (DNV)',
    scheduled_date: '2025-12-15',
    completed_date: '2025-12-15',
    status: 'completed',
    sire_score: 88,
    findings_count: 3,
    critical_findings: 0,
    notes: 'Minor paint deterioration noted. Training schedule needs update.',
  },
  {
    inspection_id: 'INS-002',
    vessel_name: 'MV Atlantic Storm',
    inspection_type: 'SIRE',
    inspector_name: 'Dr. Maria Garcia (Lloyd\'s)',
    scheduled_date: '2025-12-08',
    completed_date: '2025-12-08',
    status: 'completed',
    sire_score: 92,
    findings_count: 1,
    critical_findings: 0,
    notes: 'Excellent compliance. Minor documentation improvement suggested.',
  },
  {
    inspection_id: 'INS-003',
    vessel_name: 'MV Indian Ocean',
    inspection_type: 'SIRE',
    inspector_name: 'Mr. Robert Chen (ABS)',
    scheduled_date: '2025-12-01',
    completed_date: '2025-12-01',
    status: 'completed',
    sire_score: 75,
    findings_count: 7,
    critical_findings: 2,
    notes: 'Safety equipment overdue. Immediate remediation required.',
  },
  {
    inspection_id: 'INS-004',
    vessel_name: 'MV Pacific Explorer',
    inspection_type: 'PSC',
    inspector_name: 'Port State Control (Regional Port)',
    scheduled_date: '2025-12-22',
    completed_date: null,
    status: 'scheduled',
    findings_count: 0,
    critical_findings: 0,
    notes: 'Routine port state control inspection scheduled.',
  },
  {
    inspection_id: 'INS-005',
    vessel_name: 'MV Atlantic Storm',
    inspection_type: 'VETTING',
    inspector_name: 'Chartering Company Inspector',
    scheduled_date: '2026-01-10',
    completed_date: null,
    status: 'scheduled',
    findings_count: 0,
    critical_findings: 0,
    notes: 'Pre-charter vetting inspection for new charterer.',
  },
];

const MOCK_STATS: InspectionStats = {
  total_inspections: 5,
  completed_this_year: 3,
  scheduled_upcoming: 2,
  average_sire_score: 85,
  compliance_trend: 'improving',
};

const getStatusColor = (status: string): string => {
  switch (status) {
    case 'completed':
      return 'bg-green-50 text-green-700 border-green-200';
    case 'in-progress':
      return 'bg-yellow-50 text-yellow-700 border-yellow-200';
    case 'scheduled':
      return 'bg-blue-50 text-blue-700 border-blue-200';
    case 'cancelled':
      return 'bg-gray-50 text-gray-700 border-gray-200';
    default:
      return 'bg-gray-50 text-gray-700 border-gray-200';
  }
};

const getStatusIcon = (status: string): string => {
  switch (status) {
    case 'completed':
      return '✅';
    case 'in-progress':
      return '⏳';
    case 'scheduled':
      return '📅';
    case 'cancelled':
      return '❌';
    default:
      return '❓';
  }
};

const getSIREBadgeClass = (score?: number): string => {
  if (!score) return '';
  if (score >= 90) return 'bg-green-100 text-green-700';
  if (score >= 80) return 'bg-yellow-100 text-yellow-700';
  return 'bg-red-100 text-red-700';
};

const getSIREBadgeLabel = (score?: number): string => {
  if (!score) return 'Pending';
  if (score >= 90) return `✅ EXCELLENT (${score})`;
  if (score >= 80) return `⚠️ GOOD (${score})`;
  return `🔴 AT RISK (${score})`;
};

export const InspectionManagementPanel: React.FC<InspectionManagementPanelProps> = ({
  stats = MOCK_STATS,
  inspections = MOCK_INSPECTIONS,
  isLoading = false,
}) => {
  const [expandedInspection, setExpandedInspection] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<'all' | 'scheduled' | 'completed' | 'in-progress'>('all');
  const [showScheduleModal, setShowScheduleModal] = useState(false);

  const filteredInspections = filterStatus === 'all'
    ? inspections
    : inspections.filter(i => i.status === filterStatus);

  const completedInspections = inspections.filter(i => i.status === 'completed');
  const scheduledInspections = inspections.filter(i => i.status === 'scheduled');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 style={{ fontSize: '20px', fontWeight: '600', color: '#2c3e50', marginBottom: '4px' }}>
            🔍 Inspection Management
          </h2>
          <p style={{ fontSize: '13px', color: '#7f8c8d' }}>
            Schedule, track, and manage SIRE 2.0 inspections across your fleet
          </p>
        </div>
        <Button
          onClick={() => setShowScheduleModal(true)}
          style={{
            background: '#3498db',
            color: 'white',
            padding: '10px 20px',
            borderRadius: '8px',
            border: 'none',
            fontWeight: '600',
            cursor: 'pointer',
            fontSize: '14px',
          }}
        >
          📅 Schedule Inspection
        </Button>
      </div>

      {/* Stats Row */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '16px',
        }}
      >
        <div style={{
          background: '#fff',
          border: '1px solid #e0e6ed',
          borderRadius: '12px',
          padding: '16px',
          textAlign: 'center',
        }}>
          <p style={{ fontSize: '13px', color: '#7f8c8d', marginBottom: '8px' }}>Total Inspections</p>
          <p style={{ fontSize: '28px', fontWeight: '700', color: '#2c3e50' }}>{stats.total_inspections}</p>
          <p style={{ fontSize: '11px', color: '#95a5a6', marginTop: '4px' }}>
            {stats.completed_this_year} completed this year
          </p>
        </div>

        <div style={{
          background: '#fff',
          border: '1px solid #e0e6ed',
          borderRadius: '12px',
          padding: '16px',
          textAlign: 'center',
        }}>
          <p style={{ fontSize: '13px', color: '#7f8c8d', marginBottom: '8px' }}>Upcoming</p>
          <p style={{ fontSize: '28px', fontWeight: '700', color: '#f39c12' }}>{stats.scheduled_upcoming}</p>
          <p style={{ fontSize: '11px', color: '#95a5a6', marginTop: '4px' }}>
            Scheduled inspections
          </p>
        </div>

        <div style={{
          background: '#fff',
          border: '1px solid #e0e6ed',
          borderRadius: '12px',
          padding: '16px',
          textAlign: 'center',
        }}>
          <p style={{ fontSize: '13px', color: '#7f8c8d', marginBottom: '8px' }}>Average SIRE Score</p>
          <p style={{ fontSize: '28px', fontWeight: '700', color: '#27ae60' }}>{stats.average_sire_score}</p>
          <p style={{ fontSize: '11px', color: '#95a5a6', marginTop: '4px' }}>
            {stats.compliance_trend === 'improving' ? '📈 Improving' : stats.compliance_trend === 'stable' ? '➡️ Stable' : '📉 Declining'}
          </p>
        </div>

        <div style={{
          background: '#fff',
          border: '1px solid #e0e6ed',
          borderRadius: '12px',
          padding: '16px',
          textAlign: 'center',
        }}>
          <p style={{ fontSize: '13px', color: '#7f8c8d', marginBottom: '8px' }}>Compliance Trend</p>
          <p style={{ fontSize: '20px', marginBottom: '4px' }}>
            {stats.compliance_trend === 'improving' ? '📈' : stats.compliance_trend === 'stable' ? '➡️' : '📉'}
          </p>
          <p style={{ fontSize: '11px', color: '#95a5a6', marginTop: '4px' }}>
            {stats.compliance_trend.toUpperCase()}
          </p>
        </div>
      </div>

      {/* Filter Buttons */}
      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
        {['all', 'completed', 'scheduled', 'in-progress'].map(status => (
          <button
            key={status}
            onClick={() => setFilterStatus(status as any)}
            style={{
              padding: '8px 16px',
              borderRadius: '20px',
              border: filterStatus === status ? '2px solid #3498db' : '1px solid #e0e6ed',
              background: filterStatus === status ? '#e3f2fd' : '#fff',
              color: filterStatus === status ? '#3498db' : '#7f8c8d',
              fontWeight: filterStatus === status ? '600' : '500',
              cursor: 'pointer',
              fontSize: '12px',
              transition: 'all 0.2s ease',
            }}
          >
            {status === 'all' ? '📊 All' : status === 'completed' ? '✅ Completed' : status === 'scheduled' ? '📅 Scheduled' : '⏳ In Progress'}
          </button>
        ))}
      </div>

      {/* Inspections List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <h3 style={{ fontSize: '14px', fontWeight: '600', color: '#2c3e50' }}>
          Inspections ({filteredInspections.length})
        </h3>

        {filteredInspections.length === 0 ? (
          <div style={{
            background: '#f8f9fa',
            borderRadius: '12px',
            padding: '24px',
            textAlign: 'center',
            border: '1px solid #e0e6ed',
          }}>
            <p style={{ fontSize: '14px', color: '#7f8c8d' }}>No inspections found</p>
          </div>
        ) : (
          filteredInspections.map((inspection) => (
            <div
              key={inspection.inspection_id}
              style={{
                background: '#fff',
                border: '1px solid #e0e6ed',
                borderRadius: '12px',
                overflow: 'hidden',
                transition: 'all 0.3s ease',
              }}
            >
              {/* Inspection Card Header */}
              <div
                onClick={() => setExpandedInspection(
                  expandedInspection === inspection.inspection_id ? null : inspection.inspection_id
                )}
                style={{
                  padding: '16px',
                  cursor: 'pointer',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  background: expandedInspection === inspection.inspection_id ? '#f8f9fa' : '#fff',
                  borderBottom: expandedInspection === inspection.inspection_id ? '1px solid #e0e6ed' : 'none',
                }}
              >
                <div style={{ display: 'flex', gap: '16px', alignItems: 'center', flex: 1 }}>
                  <span style={{ fontSize: '20px' }}>{getStatusIcon(inspection.status)}</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '4px' }}>
                      <span style={{ fontSize: '13px', fontWeight: '600', color: '#2c3e50' }}>
                        {inspection.vessel_name}
                      </span>
                      <span style={{
                        fontSize: '10px',
                        fontWeight: '600',
                        padding: '3px 8px',
                        borderRadius: '4px',
                        background: '#ecf0f1',
                        color: '#34495e',
                      }}>
                        {inspection.inspection_type}
                      </span>
                      {inspection.sire_score && (
                        <span style={{
                          fontSize: '10px',
                          fontWeight: '600',
                          padding: '3px 8px',
                          borderRadius: '4px',
                          ...Object.fromEntries(
                            getSIREBadgeClass(inspection.sire_score)
                              .split(' ')
                              .map((cls) => {
                                if (cls.startsWith('bg-')) {
                                  const bgColor = cls.replace('bg-', '').replace('-100', '').replace('-50', '');
                                  return ['backgroundColor', bgColor === 'green' ? '#d5f4e6' : bgColor === 'yellow' ? '#fef3c7' : '#fee2e2'];
                                }
                                if (cls.startsWith('text-')) {
                                  const textColor = cls.replace('text-', '').replace('-700', '');
                                  return ['color', textColor === 'green' ? '#065f46' : textColor === 'yellow' ? '#9a6400' : '#991b1b'];
                                }
                                return ['', ''];
                              })
                              .filter(([k]) => k)
                          ),
                        }}>
                          {getSIREBadgeLabel(inspection.sire_score)}
                        </span>
                      )}
                    </div>
                    <p style={{ fontSize: '12px', color: '#7f8c8d' }}>
                      {inspection.inspector_name}
                    </p>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <span style={{
                    fontSize: '11px',
                    fontWeight: '600',
                    padding: '4px 8px',
                    borderRadius: '6px',
                    ...Object.fromEntries(
                      getStatusColor(inspection.status)
                        .split(' ')
                        .map((cls) => {
                          if (cls.startsWith('bg-')) {
                            const color = cls.replace('bg-', '');
                            const bgMap = {
                              'green-50': '#f0fdf4', 'yellow-50': '#fefce8', 'blue-50': '#f0f9ff', 'gray-50': '#f9fafb'
                            };
                            return ['backgroundColor', bgMap[color as keyof typeof bgMap] || bgMap['gray-50']];
                          }
                          if (cls.startsWith('text-')) {
                            const color = cls.replace('text-', '');
                            const textMap = {
                              'green-700': '#15803d', 'yellow-700': '#b45309', 'blue-700': '#0369a1', 'gray-700': '#374151'
                            };
                            return ['color', textMap[color as keyof typeof textMap] || textMap['gray-700']];
                          }
                          return ['', ''];
                        })
                        .filter(([k]) => k)
                    ),
                  }}>
                    {inspection.status.toUpperCase()}
                  </span>
                  <span style={{ color: '#7f8c8d', fontSize: '16px' }}>
                    {expandedInspection === inspection.inspection_id ? '▼' : '▶'}
                  </span>
                </div>
              </div>

              {/* Expanded Details */}
              {expandedInspection === inspection.inspection_id && (
                <div style={{ padding: '16px', background: '#f8f9fa', borderTop: '1px solid #e0e6ed' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '16px', marginBottom: '16px' }}>
                    <div>
                      <p style={{ fontSize: '11px', color: '#7f8c8d', marginBottom: '4px', fontWeight: '600' }}>SCHEDULED DATE</p>
                      <p style={{ fontSize: '13px', color: '#2c3e50', fontWeight: '500' }}>
                        {new Date(inspection.scheduled_date).toLocaleDateString()}
                      </p>
                    </div>
                    {inspection.completed_date && (
                      <div>
                        <p style={{ fontSize: '11px', color: '#7f8c8d', marginBottom: '4px', fontWeight: '600' }}>COMPLETED DATE</p>
                        <p style={{ fontSize: '13px', color: '#2c3e50', fontWeight: '500' }}>
                          {new Date(inspection.completed_date).toLocaleDateString()}
                        </p>
                      </div>
                    )}
                    <div>
                      <p style={{ fontSize: '11px', color: '#7f8c8d', marginBottom: '4px', fontWeight: '600' }}>FINDINGS</p>
                      <p style={{ fontSize: '13px', color: '#2c3e50', fontWeight: '500' }}>
                        {inspection.findings_count} total {inspection.critical_findings > 0 && `(${inspection.critical_findings} critical)`}
                      </p>
                    </div>
                  </div>

                  <div style={{ marginBottom: '16px' }}>
                    <p style={{ fontSize: '11px', color: '#7f8c8d', marginBottom: '6px', fontWeight: '600' }}>NOTES</p>
                    <p style={{ fontSize: '13px', color: '#34495e', lineHeight: '1.5' }}>
                      {inspection.notes}
                    </p>
                  </div>

                  <div style={{ display: 'flex', gap: '8px' }}>
                    <Button size="sm" variant="outline">📋 View Details</Button>
                    {inspection.status === 'completed' && (
                      <Button size="sm" variant="outline">📥 Download Report</Button>
                    )}
                    {inspection.status === 'scheduled' && (
                      <>
                        <Button size="sm" variant="outline">✏️ Edit</Button>
                        <Button size="sm" variant="outline">❌ Cancel</Button>
                      </>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Info Alert */}
      <Alert
        variant="info"
        title="💡 Inspection Insights"
        message="SIRE 2.0 inspections directly impact insurance premiums. Each point improvement can save thousands in annual premiums. Schedule regular inspections to maintain compliance and minimize insurance costs."
      />
    </div>
  );
};
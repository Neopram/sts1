import React, { useState } from 'react';
import { Button } from '../Common/Button';
import { Alert } from '../Common/Alert';

interface Finding {
  finding_id: string;
  vessel_name: string;
  inspection_id: string;
  severity: 'critical' | 'major' | 'minor' | 'observation';
  category: string;
  description: string;
  remediation_plan: string;
  remediation_due: string;
  remediation_completed?: string;
  status: 'open' | 'in-progress' | 'remediated' | 'deferred' | 'overdue';
  cost_impact: number; // USD
  insurance_impact: number; // Multiplier impact (e.g., 0.05 = 5%)
  assigned_to?: string;
  photos_attached: number;
  verification_required: boolean;
  inspector_notes?: string;
}

interface FindingsStats {
  total_open: number;
  critical_count: number;
  major_count: number;
  overdue_count: number;
  remediated_this_month: number;
  average_remediation_time_days: number;
  total_cost_impact: number;
  total_insurance_impact: number;
}

interface FindingsTrackerPanelProps {
  stats?: FindingsStats;
  findings?: Finding[];
  isLoading?: boolean;
}

// Mock findings data - realistic maritime inspection findings
const MOCK_FINDINGS: Finding[] = [
  {
    finding_id: 'FND-001',
    vessel_name: 'MV Indian Ocean',
    inspection_id: 'INS-003',
    severity: 'critical',
    category: 'Safety Equipment',
    description: 'Lifeboat davit inspection certificate expired - Last inspection 2022',
    remediation_plan: 'Engage certified lifeboat servicing contractor, complete full davit inspection and certification',
    remediation_due: '2025-12-28',
    status: 'overdue',
    cost_impact: 45000,
    insurance_impact: 0.15,
    assigned_to: 'Chief Engineer',
    photos_attached: 3,
    verification_required: true,
    inspector_notes: 'Safety critical item. Must be remediated before vessel operation.',
  },
  {
    finding_id: 'FND-002',
    vessel_name: 'MV Indian Ocean',
    inspection_id: 'INS-003',
    severity: 'critical',
    category: 'Crew Certification',
    description: '2 crew members lack required STCW certifications for their positions',
    remediation_plan: 'Conduct training course, complete certifications, update crew roster',
    remediation_due: '2025-12-20',
    status: 'in-progress',
    cost_impact: 12000,
    insurance_impact: 0.10,
    assigned_to: 'HR Manager',
    photos_attached: 1,
    verification_required: true,
    inspector_notes: 'Must have valid certifications prior to next voyage.',
  },
  {
    finding_id: 'FND-003',
    vessel_name: 'MV Indian Ocean',
    inspection_id: 'INS-003',
    severity: 'major',
    category: 'Maintenance Records',
    description: 'Incomplete maintenance log for engine room equipment (Q3 2025)',
    remediation_plan: 'Compile missing maintenance records, conduct equipment inspection, update logs',
    remediation_due: '2026-01-15',
    status: 'open',
    cost_impact: 8000,
    insurance_impact: 0.05,
    assigned_to: 'Chief Engineer',
    photos_attached: 0,
    verification_required: false,
  },
  {
    finding_id: 'FND-004',
    vessel_name: 'MV Pacific Explorer',
    inspection_id: 'INS-001',
    severity: 'major',
    category: 'Paint & Corrosion',
    description: 'Paint deterioration on weather deck area - Rust staining visible',
    remediation_plan: 'Scrape, treat, and repaint affected area using marine-grade paint',
    remediation_due: '2026-02-15',
    remediation_completed: '2025-12-18',
    status: 'remediated',
    cost_impact: 15000,
    insurance_impact: 0.02,
    assigned_to: 'Bosun',
    photos_attached: 2,
    verification_required: true,
  },
  {
    finding_id: 'FND-005',
    vessel_name: 'MV Pacific Explorer',
    inspection_id: 'INS-001',
    severity: 'minor',
    category: 'Training Schedule',
    description: 'Annual safety training schedule revision needed',
    remediation_plan: 'Update training schedule per ISM requirements and communicate to crew',
    remediation_due: '2026-01-31',
    status: 'open',
    cost_impact: 2000,
    insurance_impact: 0.01,
    assigned_to: 'Safety Manager',
    photos_attached: 0,
    verification_required: false,
  },
  {
    finding_id: 'FND-006',
    vessel_name: 'MV Atlantic Storm',
    inspection_id: 'INS-002',
    severity: 'observation',
    category: 'Documentation',
    description: 'Minor document filing discrepancies noted',
    remediation_plan: 'Organize and properly file all compliance documents',
    remediation_due: '2026-02-28',
    status: 'open',
    cost_impact: 1000,
    insurance_impact: 0.0,
    assigned_to: 'Admin Officer',
    photos_attached: 0,
    verification_required: false,
  },
];

const MOCK_STATS: FindingsStats = {
  total_open: 4,
  critical_count: 2,
  major_count: 2,
  overdue_count: 1,
  remediated_this_month: 1,
  average_remediation_time_days: 18,
  total_cost_impact: 83000,
  total_insurance_impact: 0.33,
};

const getSeverityColor = (severity: string): {bg: string, text: string, icon: string} => {
  switch (severity) {
    case 'critical':
      return { bg: '#fee2e2', text: '#991b1b', icon: '🔴' };
    case 'major':
      return { bg: '#fef3c7', text: '#92400e', icon: '🟡' };
    case 'minor':
      return { bg: '#dbeafe', text: '#0c4a6e', icon: '🔵' };
    case 'observation':
      return { bg: '#f0fdf4', text: '#15803d', icon: '🟢' };
    default:
      return { bg: '#f3f4f6', text: '#374151', icon: '⚪' };
  }
};

const getStatusIcon = (status: string): string => {
  switch (status) {
    case 'remediated':
      return '✅';
    case 'in-progress':
      return '⏳';
    case 'open':
      return '📋';
    case 'overdue':
      return '⚠️';
    case 'deferred':
      return '🔄';
    default:
      return '❓';
  }
};

export const FindingsTrackerPanel: React.FC<FindingsTrackerPanelProps> = ({
  stats = MOCK_STATS,
  findings = MOCK_FINDINGS,
  isLoading = false,
}) => {
  const [expandedFinding, setExpandedFinding] = useState<string | null>(null);
  const [filterSeverity, setFilterSeverity] = useState<'all' | 'critical' | 'major' | 'minor' | 'observation'>('all');
  const [filterStatus, setFilterStatus] = useState<'all' | 'open' | 'in-progress' | 'remediated' | 'overdue'>('all');
  const [showRisky, setShowRisky] = useState(true);

  const filteredFindings = findings.filter(f => {
    const severityMatch = filterSeverity === 'all' || f.severity === filterSeverity;
    const statusMatch = filterStatus === 'all' || f.status === filterStatus;
    return severityMatch && statusMatch;
  });

  const insuranceImpactPercentage = (stats.total_insurance_impact * 100).toFixed(1);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Header */}
      <div>
        <h2 style={{ fontSize: '20px', fontWeight: '600', color: '#2c3e50', marginBottom: '4px' }}>
          📋 Findings Tracker & Remediation Manager
        </h2>
        <p style={{ fontSize: '13px', color: '#7f8c8d' }}>
          Track inspection findings by severity, manage remediation, and monitor insurance impact
        </p>
      </div>

      {/* Critical Alert */}
      {stats.overdue_count > 0 && (
        <Alert
          variant="error"
          title="🚨 Overdue Findings"
          message={`${stats.overdue_count} critical finding(s) are overdue for remediation. Immediate action required to avoid regulatory penalties and insurance claim issues.`}
        />
      )}

      {/* Stats Grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
          gap: '12px',
        }}
      >
        <div style={{
          background: '#fff',
          border: '1px solid #e0e6ed',
          borderRadius: '12px',
          padding: '14px',
          textAlign: 'center',
        }}>
          <p style={{ fontSize: '11px', color: '#7f8c8d', marginBottom: '6px', fontWeight: '600' }}>TOTAL OPEN</p>
          <p style={{ fontSize: '26px', fontWeight: '700', color: '#2c3e50' }}>{stats.total_open}</p>
        </div>

        <div style={{
          background: '#fee2e2',
          border: '1px solid #fecaca',
          borderRadius: '12px',
          padding: '14px',
          textAlign: 'center',
        }}>
          <p style={{ fontSize: '11px', color: '#991b1b', marginBottom: '6px', fontWeight: '600' }}>CRITICAL</p>
          <p style={{ fontSize: '26px', fontWeight: '700', color: '#991b1b' }}>{stats.critical_count}</p>
        </div>

        <div style={{
          background: '#fef3c7',
          border: '1px solid #fcd34d',
          borderRadius: '12px',
          padding: '14px',
          textAlign: 'center',
        }}>
          <p style={{ fontSize: '11px', color: '#92400e', marginBottom: '6px', fontWeight: '600' }}>MAJOR</p>
          <p style={{ fontSize: '26px', fontWeight: '700', color: '#92400e' }}>{stats.major_count}</p>
        </div>

        <div style={{
          background: '#fef3c7',
          border: '1px solid #fcd34d',
          borderRadius: '12px',
          padding: '14px',
          textAlign: 'center',
        }}>
          <p style={{ fontSize: '11px', color: '#92400e', marginBottom: '6px', fontWeight: '600' }}>OVERDUE</p>
          <p style={{ fontSize: '26px', fontWeight: '700', color: '#92400e' }}>{stats.overdue_count}</p>
        </div>

        <div style={{
          background: '#d5f4e6',
          border: '1px solid #a7f3d0',
          borderRadius: '12px',
          padding: '14px',
          textAlign: 'center',
        }}>
          <p style={{ fontSize: '11px', color: '#065f46', marginBottom: '6px', fontWeight: '600' }}>REMEDIATED THIS MONTH</p>
          <p style={{ fontSize: '26px', fontWeight: '700', color: '#065f46' }}>{stats.remediated_this_month}</p>
        </div>

        <div style={{
          background: '#ecf0f1',
          border: '1px solid #bdc3c7',
          borderRadius: '12px',
          padding: '14px',
          textAlign: 'center',
        }}>
          <p style={{ fontSize: '11px', color: '#7f8c8d', marginBottom: '6px', fontWeight: '600' }}>AVG REMEDIATION</p>
          <p style={{ fontSize: '26px', fontWeight: '700', color: '#34495e' }}>{stats.average_remediation_time_days}d</p>
        </div>
      </div>

      {/* Cost & Insurance Impact */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '16px',
        }}
      >
        <div style={{
          background: '#e8f5e9',
          border: '1px solid #c8e6c9',
          borderRadius: '12px',
          padding: '16px',
        }}>
          <p style={{ fontSize: '12px', color: '#558b2f', marginBottom: '8px', fontWeight: '600' }}>💰 TOTAL COST IMPACT</p>
          <p style={{ fontSize: '22px', fontWeight: '700', color: '#33691e', marginBottom: '4px' }}>
            ${(stats.total_cost_impact / 1000).toFixed(0)}K USD
          </p>
          <p style={{ fontSize: '11px', color: '#558b2f' }}>Estimated remediation cost</p>
        </div>

        <div style={{
          background: '#ffebee',
          border: '1px solid #ffcdd2',
          borderRadius: '12px',
          padding: '16px',
        }}>
          <p style={{ fontSize: '12px', color: '#c62828', marginBottom: '8px', fontWeight: '600' }}>📊 INSURANCE IMPACT</p>
          <p style={{ fontSize: '22px', fontWeight: '700', color: '#b71c1c', marginBottom: '4px' }}>
            +{insuranceImpactPercentage}%
          </p>
          <p style={{ fontSize: '11px', color: '#c62828' }}>Premium multiplier increase</p>
        </div>
      </div>

      {/* Filter Buttons - Severity */}
      <div>
        <p style={{ fontSize: '12px', fontWeight: '600', color: '#2c3e50', marginBottom: '8px' }}>Filter by Severity:</p>
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
          {['all', 'critical', 'major', 'minor', 'observation'].map(sev => (
            <button
              key={sev}
              onClick={() => setFilterSeverity(sev as any)}
              style={{
                padding: '6px 12px',
                borderRadius: '16px',
                border: filterSeverity === sev ? '2px solid #3498db' : '1px solid #e0e6ed',
                background: filterSeverity === sev ? '#e3f2fd' : '#fff',
                color: filterSeverity === sev ? '#3498db' : '#7f8c8d',
                fontWeight: filterSeverity === sev ? '600' : '500',
                cursor: 'pointer',
                fontSize: '11px',
              }}
            >
              {sev === 'all' ? '📊 All' : sev === 'critical' ? '🔴 Critical' : sev === 'major' ? '🟡 Major' : sev === 'minor' ? '🔵 Minor' : '🟢 Observation'}
            </button>
          ))}
        </div>
      </div>

      {/* Filter Buttons - Status */}
      <div>
        <p style={{ fontSize: '12px', fontWeight: '600', color: '#2c3e50', marginBottom: '8px' }}>Filter by Status:</p>
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
          {['all', 'overdue', 'open', 'in-progress', 'remediated'].map(stat => (
            <button
              key={stat}
              onClick={() => setFilterStatus(stat as any)}
              style={{
                padding: '6px 12px',
                borderRadius: '16px',
                border: filterStatus === stat ? '2px solid #3498db' : '1px solid #e0e6ed',
                background: filterStatus === stat ? '#e3f2fd' : '#fff',
                color: filterStatus === stat ? '#3498db' : '#7f8c8d',
                fontWeight: filterStatus === stat ? '600' : '500',
                cursor: 'pointer',
                fontSize: '11px',
              }}
            >
              {stat === 'all' ? '📊 All' : stat === 'overdue' ? '⚠️ Overdue' : stat === 'open' ? '📋 Open' : stat === 'in-progress' ? '⏳ In Progress' : '✅ Remediated'}
            </button>
          ))}
        </div>
      </div>

      {/* Findings List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <h3 style={{ fontSize: '14px', fontWeight: '600', color: '#2c3e50' }}>
          Findings ({filteredFindings.length})
        </h3>

        {filteredFindings.length === 0 ? (
          <div style={{
            background: '#d5f4e6',
            borderRadius: '12px',
            padding: '24px',
            textAlign: 'center',
            border: '1px solid #a7f3d0',
          }}>
            <p style={{ fontSize: '14px', color: '#065f46', fontWeight: '600' }}>✅ No findings match this filter</p>
          </div>
        ) : (
          filteredFindings.map((finding) => {
            const severity = getSeverityColor(finding.severity);
            const riskScore = (finding.cost_impact / 1000) + (finding.insurance_impact * 100);
            const isRisky = riskScore > 25;

            return (
              <div
                key={finding.finding_id}
                style={{
                  background: '#fff',
                  border: isRisky && showRisky ? '2px solid #e74c3c' : '1px solid #e0e6ed',
                  borderRadius: '12px',
                  overflow: 'hidden',
                  transition: 'all 0.3s ease',
                }}
              >
                {/* Finding Card Header */}
                <div
                  onClick={() => setExpandedFinding(
                    expandedFinding === finding.finding_id ? null : finding.finding_id
                  )}
                  style={{
                    padding: '14px',
                    cursor: 'pointer',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    background: expandedFinding === finding.finding_id ? '#f8f9fa' : '#fff',
                    borderBottom: expandedFinding === finding.finding_id ? '1px solid #e0e6ed' : 'none',
                  }}
                >
                  <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flex: 1 }}>
                    <span style={{ fontSize: '18px' }}>{getStatusIcon(finding.status)}</span>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                        <span
                          style={{
                            display: 'inline-block',
                            fontSize: '10px',
                            fontWeight: '700',
                            padding: '3px 8px',
                            borderRadius: '4px',
                            background: severity.bg,
                            color: severity.text,
                          }}
                        >
                          {severity.icon} {finding.severity.toUpperCase()}
                        </span>
                        <span style={{
                          display: 'inline-block',
                          fontSize: '10px',
                          fontWeight: '600',
                          padding: '3px 8px',
                          borderRadius: '4px',
                          background: '#ecf0f1',
                          color: '#34495e',
                        }}>
                          {finding.status === 'overdue' ? '⚠️ OVERDUE' : finding.status.toUpperCase()}
                        </span>
                      </div>
                      <p style={{ fontSize: '12px', fontWeight: '600', color: '#2c3e50', marginBottom: '2px' }}>
                        {finding.vessel_name} - {finding.category}
                      </p>
                      <p style={{ fontSize: '11px', color: '#7f8c8d' }}>
                        {finding.description.substring(0, 60)}...
                      </p>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ textAlign: 'right', marginRight: '8px' }}>
                      <p style={{ fontSize: '11px', color: '#7f8c8d', fontWeight: '600' }}>Due</p>
                      <p style={{ fontSize: '12px', fontWeight: '600', color: finding.status === 'overdue' ? '#c0392b' : '#34495e' }}>
                        {new Date(finding.remediation_due).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                      </p>
                    </div>
                    <span style={{ color: '#7f8c8d', fontSize: '16px' }}>
                      {expandedFinding === finding.finding_id ? '▼' : '▶'}
                    </span>
                  </div>
                </div>

                {/* Expanded Details */}
                {expandedFinding === finding.finding_id && (
                  <div style={{ padding: '16px', background: '#f8f9fa', borderTop: '1px solid #e0e6ed' }}>
                    <div style={{ marginBottom: '16px' }}>
                      <p style={{ fontSize: '11px', color: '#7f8c8d', marginBottom: '6px', fontWeight: '600' }}>FULL DESCRIPTION</p>
                      <p style={{ fontSize: '13px', color: '#34495e', lineHeight: '1.5' }}>
                        {finding.description}
                      </p>
                    </div>

                    <div style={{ marginBottom: '16px' }}>
                      <p style={{ fontSize: '11px', color: '#7f8c8d', marginBottom: '6px', fontWeight: '600' }}>REMEDIATION PLAN</p>
                      <p style={{ fontSize: '13px', color: '#34495e', lineHeight: '1.5' }}>
                        {finding.remediation_plan}
                      </p>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: '12px', marginBottom: '16px' }}>
                      <div>
                        <p style={{ fontSize: '11px', color: '#7f8c8d', marginBottom: '4px', fontWeight: '600' }}>COST IMPACT</p>
                        <p style={{ fontSize: '14px', fontWeight: '700', color: '#2c3e50' }}>
                          ${(finding.cost_impact / 1000).toFixed(1)}K
                        </p>
                      </div>
                      <div>
                        <p style={{ fontSize: '11px', color: '#7f8c8d', marginBottom: '4px', fontWeight: '600' }}>INSURANCE IMPACT</p>
                        <p style={{ fontSize: '14px', fontWeight: '700', color: '#2c3e50' }}>
                          +{(finding.insurance_impact * 100).toFixed(1)}%
                        </p>
                      </div>
                      <div>
                        <p style={{ fontSize: '11px', color: '#7f8c8d', marginBottom: '4px', fontWeight: '600' }}>ASSIGNED TO</p>
                        <p style={{ fontSize: '13px', fontWeight: '600', color: '#34495e' }}>
                          {finding.assigned_to || 'Unassigned'}
                        </p>
                      </div>
                      <div>
                        <p style={{ fontSize: '11px', color: '#7f8c8d', marginBottom: '4px', fontWeight: '600' }}>PHOTOS</p>
                        <p style={{ fontSize: '13px', fontWeight: '600', color: '#34495e' }}>
                          {finding.photos_attached} attached
                        </p>
                      </div>
                    </div>

                    {finding.inspector_notes && (
                      <div style={{ marginBottom: '16px', padding: '12px', background: '#fff', borderRadius: '8px', borderLeft: '3px solid #3498db' }}>
                        <p style={{ fontSize: '11px', color: '#2980b9', fontWeight: '600', marginBottom: '4px' }}>📝 INSPECTOR NOTES</p>
                        <p style={{ fontSize: '12px', color: '#34495e' }}>{finding.inspector_notes}</p>
                      </div>
                    )}

                    <div style={{ display: 'flex', gap: '8px' }}>
                      {finding.status !== 'remediated' && <Button size="sm" variant="outline">✏️ Edit Plan</Button>}
                      {finding.status === 'open' && <Button size="sm" variant="outline">▶️ Start Progress</Button>}
                      {finding.status === 'in-progress' && <Button size="sm" variant="outline">✅ Mark Complete</Button>}
                      {finding.verification_required && <Button size="sm" variant="outline">🔍 Request Verification</Button>}
                      <Button size="sm" variant="outline">📎 Upload Photo</Button>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Info Alert */}
      <Alert
        variant="info"
        title="💡 Remediation Tips"
        message="Remediating findings quickly reduces insurance premiums. Critical findings can add 15-30% to premiums. On average, owners save $50-100K annually by maintaining SIRE scores above 90."
      />
    </div>
  );
};
import React, { useState } from 'react';
import { Button } from '../Common/Button';
import { Alert } from '../Common/Alert';

interface CrewMember {
  crew_id: string;
  vessel_name: string;
  full_name: string;
  position: string;
  nationality: string;
  rank: string;
  hire_date: string;
}

interface CrewCertification {
  cert_id: string;
  crew_id: string;
  certification_type: string; // e.g., 'STCW-A-II/1', 'Medical', 'Safety', 'Dangerous Goods'
  issuing_authority: string;
  issue_date: string;
  expiry_date: string;
  status: 'valid' | 'expiring' | 'expired';
  required_for_position: boolean;
}

interface CrewTraining {
  training_id: string;
  crew_id: string;
  vessel_name: string;
  training_type: string; // e.g., 'Fire Safety', 'First Aid', 'Security', 'Maritime Law'
  training_date: string;
  next_due: string;
  status: 'current' | 'due-soon' | 'overdue';
  provider: string;
}

interface CrewStats {
  total_crew: number;
  average_age: number;
  nationalities_count: number;
  certifications_valid: number;
  certifications_expiring_30days: number;
  certifications_expired: number;
  training_overdue: number;
  crew_compliance_score: number; // 0-100
}

interface CrewManagementPanelProps {
  stats?: CrewStats;
  crewMembers?: CrewMember[];
  certifications?: CrewCertification[];
  trainings?: CrewTraining[];
  isLoading?: boolean;
}

// Mock crew data - realistic maritime crew composition
const MOCK_CREW_MEMBERS: CrewMember[] = [
  {
    crew_id: 'CRW-001',
    vessel_name: 'MV Pacific Explorer',
    full_name: 'Captain James Wilson',
    position: 'Master',
    nationality: 'UK',
    rank: 'Captain',
    hire_date: '2020-01-15',
  },
  {
    crew_id: 'CRW-002',
    vessel_name: 'MV Pacific Explorer',
    full_name: 'Chief Officer Michael Chen',
    position: 'Chief Officer',
    nationality: 'Singapore',
    rank: 'Chief Officer',
    hire_date: '2021-06-20',
  },
  {
    crew_id: 'CRW-003',
    vessel_name: 'MV Pacific Explorer',
    full_name: 'Chief Engineer Robert Garcia',
    position: 'Chief Engineer',
    nationality: 'Spain',
    rank: 'Chief Engineer',
    hire_date: '2019-03-10',
  },
  {
    crew_id: 'CRW-004',
    vessel_name: 'MV Atlantic Storm',
    full_name: 'Captain Anna Ivanov',
    position: 'Master',
    nationality: 'Russia',
    rank: 'Captain',
    hire_date: '2018-08-01',
  },
  {
    crew_id: 'CRW-005',
    vessel_name: 'MV Indian Ocean',
    full_name: 'Second Officer Raj Patel',
    position: 'Second Officer',
    nationality: 'India',
    rank: 'Officer',
    hire_date: '2022-09-15',
  },
];

const MOCK_CERTIFICATIONS: CrewCertification[] = [
  {
    cert_id: 'CERT-001',
    crew_id: 'CRW-001',
    certification_type: 'STCW-A-II/1 (Master)',
    issuing_authority: 'UK Maritime Authority',
    issue_date: '2018-06-15',
    expiry_date: '2028-06-14',
    status: 'valid',
    required_for_position: true,
  },
  {
    cert_id: 'CERT-002',
    crew_id: 'CRW-001',
    certification_type: 'Medical Fitness',
    issuing_authority: 'Approved Medical Practitioner',
    issue_date: '2023-01-10',
    expiry_date: '2026-01-09',
    status: 'valid',
    required_for_position: true,
  },
  {
    cert_id: 'CERT-003',
    crew_id: 'CRW-002',
    certification_type: 'STCW-A-II/2 (Chief Officer)',
    issuing_authority: 'Singapore MPA',
    issue_date: '2020-03-22',
    expiry_date: '2030-03-21',
    status: 'valid',
    required_for_position: true,
  },
  {
    cert_id: 'CERT-004',
    crew_id: 'CRW-003',
    certification_type: 'STCW-A-III/1 (Chief Engineer)',
    issuing_authority: 'Spanish Maritime Authority',
    issue_date: '2019-05-08',
    expiry_date: '2026-01-15',
    status: 'expiring',
    required_for_position: true,
  },
  {
    cert_id: 'CERT-005',
    crew_id: 'CRW-005',
    certification_type: 'STCW-A-II/3 (Second Officer)',
    issuing_authority: 'India Shipping Authority',
    issue_date: '2022-07-20',
    expiry_date: '2025-08-15',
    status: 'expiring',
    required_for_position: true,
  },
  {
    cert_id: 'CERT-006',
    crew_id: 'CRW-005',
    certification_type: 'Medical Fitness',
    issuing_authority: 'Approved Medical Practitioner',
    issue_date: '2024-02-01',
    expiry_date: '2025-01-31',
    status: 'expiring',
    required_for_position: true,
  },
];

const MOCK_TRAININGS: CrewTraining[] = [
  {
    training_id: 'TRN-001',
    crew_id: 'CRW-001',
    vessel_name: 'MV Pacific Explorer',
    training_type: 'Advanced Fire Fighting (AFFF)',
    training_date: '2023-06-15',
    next_due: '2026-06-14',
    status: 'current',
    provider: 'International Maritime Training Center',
  },
  {
    training_id: 'TRN-002',
    crew_id: 'CRW-001',
    vessel_name: 'MV Pacific Explorer',
    training_type: 'Master Safety & Leadership',
    training_date: '2022-11-20',
    next_due: '2025-11-19',
    status: 'due-soon',
    provider: 'Maritime Safety Academy',
  },
  {
    training_id: 'TRN-003',
    crew_id: 'CRW-002',
    vessel_name: 'MV Pacific Explorer',
    training_type: 'Officer Navigation & Stability',
    training_date: '2023-02-10',
    next_due: '2026-02-09',
    status: 'current',
    provider: 'IMTC Singapore',
  },
  {
    training_id: 'TRN-004',
    crew_id: 'CRW-003',
    vessel_name: 'MV Pacific Explorer',
    training_type: 'Engine Room Resource Management',
    training_date: '2024-03-15',
    next_due: '2025-03-14',
    status: 'due-soon',
    provider: 'Engineering Maritime Institute',
  },
  {
    training_id: 'TRN-005',
    crew_id: 'CRW-005',
    vessel_name: 'MV Indian Ocean',
    training_type: 'Basic Safety Training',
    training_date: '2024-01-22',
    next_due: '2025-01-21',
    status: 'overdue',
    provider: 'Approved Training Provider',
  },
];

const MOCK_STATS: CrewStats = {
  total_crew: 5,
  average_age: 42,
  nationalities_count: 5,
  certifications_valid: 9,
  certifications_expiring_30days: 3,
  certifications_expired: 0,
  training_overdue: 1,
  crew_compliance_score: 82,
};

const getStatusBadge = (status: string): { bg: string; text: string; icon: string } => {
  switch (status) {
    case 'valid':
    case 'current':
      return { bg: '#d5f4e6', text: '#065f46', icon: '✅' };
    case 'expiring':
    case 'due-soon':
      return { bg: '#fef3c7', text: '#92400e', icon: '⚠️' };
    case 'expired':
    case 'overdue':
      return { bg: '#fee2e2', text: '#991b1b', icon: '🔴' };
    default:
      return { bg: '#f3f4f6', text: '#374151', icon: '❓' };
  }
};

const getDaysUntilExpiry = (expiryDate: string): number => {
  const expiry = new Date(expiryDate);
  const today = new Date();
  return Math.floor((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
};

export const CrewManagementPanel: React.FC<CrewManagementPanelProps> = ({
  stats = MOCK_STATS,
  crewMembers = MOCK_CREW_MEMBERS,
  certifications = MOCK_CERTIFICATIONS,
  trainings = MOCK_TRAININGS,
  isLoading = false,
}) => {
  const [expandedCrew, setExpandedCrew] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'crew' | 'certifications' | 'training'>('crew');
  const [filterVessel, setFilterVessel] = useState<'all' | string>('all');

  const vessels = [...new Set(crewMembers.map(c => c.vessel_name))];
  const filteredCrew = filterVessel === 'all'
    ? crewMembers
    : crewMembers.filter(c => c.vessel_name === filterVessel);

  const complianceColor = stats.crew_compliance_score >= 85
    ? '#27ae60'
    : stats.crew_compliance_score >= 75
    ? '#f39c12'
    : '#e74c3c';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 style={{ fontSize: '20px', fontWeight: '600', color: '#2c3e50', marginBottom: '4px' }}>
            👥 Crew Management & Certifications
          </h2>
          <p style={{ fontSize: '13px', color: '#7f8c8d' }}>
            Manage crew members, track certifications, and schedule training
          </p>
        </div>
        <Button
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
          ➕ Add Crew Member
        </Button>
      </div>

      {/* Alerts */}
      {stats.certifications_expiring_30days > 0 && (
        <Alert
          variant="warning"
          title="⚠️ Certifications Expiring Soon"
          message={`${stats.certifications_expiring_30days} crew member certification(s) will expire within 30 days. Immediate renewal action required.`}
        />
      )}

      {stats.training_overdue > 0 && (
        <Alert
          variant="error"
          title="🚨 Overdue Training"
          message={`${stats.training_overdue} crew member(s) have overdue training. Schedule immediately to maintain compliance.`}
        />
      )}

      {/* Stats Grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
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
          <p style={{ fontSize: '11px', color: '#7f8c8d', marginBottom: '6px', fontWeight: '600' }}>TOTAL CREW</p>
          <p style={{ fontSize: '26px', fontWeight: '700', color: '#2c3e50' }}>{stats.total_crew}</p>
        </div>

        <div style={{
          background: '#fff',
          border: '1px solid #e0e6ed',
          borderRadius: '12px',
          padding: '14px',
          textAlign: 'center',
        }}>
          <p style={{ fontSize: '11px', color: '#7f8c8d', marginBottom: '6px', fontWeight: '600' }}>VALID CERTS</p>
          <p style={{ fontSize: '26px', fontWeight: '700', color: '#27ae60' }}>{stats.certifications_valid}</p>
        </div>

        <div style={{
          background: '#fef3c7',
          border: '1px solid #fcd34d',
          borderRadius: '12px',
          padding: '14px',
          textAlign: 'center',
        }}>
          <p style={{ fontSize: '11px', color: '#92400e', marginBottom: '6px', fontWeight: '600' }}>EXPIRING SOON</p>
          <p style={{ fontSize: '26px', fontWeight: '700', color: '#92400e' }}>{stats.certifications_expiring_30days}</p>
        </div>

        <div style={{
          background: '#fee2e2',
          border: '1px solid #fecaca',
          borderRadius: '12px',
          padding: '14px',
          textAlign: 'center',
        }}>
          <p style={{ fontSize: '11px', color: '#991b1b', marginBottom: '6px', fontWeight: '600' }}>TRAINING OVERDUE</p>
          <p style={{ fontSize: '26px', fontWeight: '700', color: '#991b1b' }}>{stats.training_overdue}</p>
        </div>

        <div style={{
          background: '#ecf0f1',
          border: '1px solid #bdc3c7',
          borderRadius: '12px',
          padding: '14px',
          textAlign: 'center',
        }}>
          <p style={{ fontSize: '11px', color: '#7f8c8d', marginBottom: '6px', fontWeight: '600' }}>NATIONALITIES</p>
          <p style={{ fontSize: '26px', fontWeight: '700', color: '#34495e' }}>{stats.nationalities_count}</p>
        </div>

        <div style={{
          background: '#e8f5e9',
          border: '1px solid #c8e6c9',
          borderRadius: '12px',
          padding: '14px',
          textAlign: 'center',
        }}>
          <p style={{ fontSize: '11px', color: '#558b2f', marginBottom: '6px', fontWeight: '600' }}>COMPLIANCE SCORE</p>
          <p style={{ fontSize: '26px', fontWeight: '700', color: complianceColor }}>{stats.crew_compliance_score}%</p>
        </div>
      </div>

      {/* Tab Navigation */}
      <div style={{ display: 'flex', gap: '8px', borderBottom: '2px solid #e0e6ed', paddingBottom: '12px' }}>
        {['crew', 'certifications', 'training'].map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab as any)}
            style={{
              padding: '8px 16px',
              borderRadius: '8px 8px 0 0',
              border: 'none',
              background: activeTab === tab ? '#3498db' : 'transparent',
              color: activeTab === tab ? 'white' : '#7f8c8d',
              fontWeight: activeTab === tab ? '600' : '500',
              cursor: 'pointer',
              fontSize: '13px',
              transition: 'all 0.2s ease',
            }}
          >
            {tab === 'crew' ? '👤 Crew Members' : tab === 'certifications' ? '📋 Certifications' : '📚 Training'}
          </button>
        ))}
      </div>

      {/* Crew Tab */}
      {activeTab === 'crew' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {/* Vessel Filter */}
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
            <button
              onClick={() => setFilterVessel('all')}
              style={{
                padding: '6px 12px',
                borderRadius: '16px',
                border: filterVessel === 'all' ? '2px solid #3498db' : '1px solid #e0e6ed',
                background: filterVessel === 'all' ? '#e3f2fd' : '#fff',
                color: filterVessel === 'all' ? '#3498db' : '#7f8c8d',
                fontWeight: '500',
                cursor: 'pointer',
                fontSize: '11px',
              }}
            >
              📊 All Vessels
            </button>
            {vessels.map(vessel => (
              <button
                key={vessel}
                onClick={() => setFilterVessel(vessel)}
                style={{
                  padding: '6px 12px',
                  borderRadius: '16px',
                  border: filterVessel === vessel ? '2px solid #3498db' : '1px solid #e0e6ed',
                  background: filterVessel === vessel ? '#e3f2fd' : '#fff',
                  color: filterVessel === vessel ? '#3498db' : '#7f8c8d',
                  fontWeight: '500',
                  cursor: 'pointer',
                  fontSize: '11px',
                }}
              >
                🚢 {vessel}
              </button>
            ))}
          </div>

          {/* Crew List */}
          {filteredCrew.length === 0 ? (
            <div style={{
              background: '#f8f9fa',
              borderRadius: '12px',
              padding: '24px',
              textAlign: 'center',
              border: '1px solid #e0e6ed',
            }}>
              <p style={{ fontSize: '14px', color: '#7f8c8d' }}>No crew members found</p>
            </div>
          ) : (
            filteredCrew.map((crew) => {
              const memberCerts = certifications.filter(c => c.crew_id === crew.crew_id);
              const memberTrainings = trainings.filter(t => t.crew_id === crew.crew_id);
              const hasExpiring = memberCerts.some(c => c.status === 'expiring');
              const hasOverdueTraining = memberTrainings.some(t => t.status === 'overdue');

              return (
                <div
                  key={crew.crew_id}
                  style={{
                    background: '#fff',
                    border: hasOverdueTraining ? '2px solid #e74c3c' : '1px solid #e0e6ed',
                    borderRadius: '12px',
                    overflow: 'hidden',
                  }}
                >
                  <div
                    onClick={() => setExpandedCrew(expandedCrew === crew.crew_id ? null : crew.crew_id)}
                    style={{
                      padding: '14px',
                      cursor: 'pointer',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      background: expandedCrew === crew.crew_id ? '#f8f9fa' : '#fff',
                      borderBottom: expandedCrew === crew.crew_id ? '1px solid #e0e6ed' : 'none',
                    }}
                  >
                    <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flex: 1 }}>
                      <span style={{ fontSize: '18px' }}>👤</span>
                      <div style={{ flex: 1 }}>
                        <p style={{ fontSize: '13px', fontWeight: '600', color: '#2c3e50', marginBottom: '2px' }}>
                          {crew.full_name}
                        </p>
                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                          <span style={{ fontSize: '11px', color: '#7f8c8d' }}>
                            {crew.position}
                          </span>
                          <span style={{ fontSize: '10px', padding: '2px 6px', borderRadius: '3px', background: '#ecf0f1', color: '#34495e' }}>
                            {crew.nationality}
                          </span>
                          {hasExpiring && <span style={{ fontSize: '12px' }}>⚠️</span>}
                          {hasOverdueTraining && <span style={{ fontSize: '12px' }}>🔴</span>}
                        </div>
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div style={{ textAlign: 'right', fontSize: '11px', color: '#7f8c8d' }}>
                        <p style={{ fontWeight: '600' }}>{memberCerts.length} Certs</p>
                        <p style={{ fontWeight: '600' }}>{memberTrainings.length} Training</p>
                      </div>
                      <span style={{ fontSize: '16px', color: '#7f8c8d' }}>
                        {expandedCrew === crew.crew_id ? '▼' : '▶'}
                      </span>
                    </div>
                  </div>

                  {expandedCrew === crew.crew_id && (
                    <div style={{ padding: '16px', background: '#f8f9fa', borderTop: '1px solid #e0e6ed' }}>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '12px', marginBottom: '16px' }}>
                        <div>
                          <p style={{ fontSize: '11px', color: '#7f8c8d', marginBottom: '4px', fontWeight: '600' }}>VESSEL</p>
                          <p style={{ fontSize: '13px', color: '#2c3e50', fontWeight: '500' }}>{crew.vessel_name}</p>
                        </div>
                        <div>
                          <p style={{ fontSize: '11px', color: '#7f8c8d', marginBottom: '4px', fontWeight: '600' }}>RANK</p>
                          <p style={{ fontSize: '13px', color: '#2c3e50', fontWeight: '500' }}>{crew.rank}</p>
                        </div>
                        <div>
                          <p style={{ fontSize: '11px', color: '#7f8c8d', marginBottom: '4px', fontWeight: '600' }}>ON BOARD SINCE</p>
                          <p style={{ fontSize: '13px', color: '#2c3e50', fontWeight: '500' }}>
                            {new Date(crew.hire_date).toLocaleDateString()}
                          </p>
                        </div>
                      </div>

                      <div style={{ display: 'flex', gap: '8px' }}>
                        <Button size="sm" variant="outline">✏️ Edit Info</Button>
                        <Button size="sm" variant="outline">🔐 Update Certs</Button>
                        <Button size="sm" variant="outline">📚 Schedule Training</Button>
                        <Button size="sm" variant="outline">📄 View Records</Button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}

      {/* Certifications Tab */}
      {activeTab === 'certifications' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <h3 style={{ fontSize: '14px', fontWeight: '600', color: '#2c3e50' }}>
            All Certifications ({certifications.length})
          </h3>
          {certifications.map((cert) => {
            const badge = getStatusBadge(cert.status);
            const daysLeft = getDaysUntilExpiry(cert.expiry_date);

            return (
              <div
                key={cert.cert_id}
                style={{
                  background: '#fff',
                  border: cert.status === 'expired' ? '2px solid #e74c3c' : '1px solid #e0e6ed',
                  borderRadius: '12px',
                  padding: '14px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                    <span
                      style={{
                        display: 'inline-block',
                        fontSize: '9px',
                        fontWeight: '700',
                        padding: '3px 8px',
                        borderRadius: '3px',
                        background: badge.bg,
                        color: badge.text,
                      }}
                    >
                      {badge.icon} {cert.status.toUpperCase()}
                    </span>
                    {cert.required_for_position && (
                      <span style={{ fontSize: '9px', fontWeight: '600', color: '#e74c3c' }}>⚠️ REQUIRED</span>
                    )}
                  </div>
                  <p style={{ fontSize: '13px', fontWeight: '600', color: '#2c3e50', marginBottom: '2px' }}>
                    {cert.certification_type}
                  </p>
                  <p style={{ fontSize: '11px', color: '#7f8c8d' }}>
                    {crewMembers.find(c => c.crew_id === cert.crew_id)?.full_name} • {cert.issuing_authority}
                  </p>
                </div>

                <div style={{ textAlign: 'right' }}>
                  <p style={{ fontSize: '11px', color: '#7f8c8d', marginBottom: '2px', fontWeight: '600' }}>EXPIRES</p>
                  <p style={{
                    fontSize: '13px',
                    fontWeight: '600',
                    color: cert.status === 'expired' ? '#e74c3c' : cert.status === 'expiring' ? '#f39c12' : '#27ae60',
                  }}>
                    {new Date(cert.expiry_date).toLocaleDateString()}
                  </p>
                  <p style={{ fontSize: '10px', color: '#7f8c8d', marginTop: '2px' }}>
                    {daysLeft > 0 ? `${daysLeft} days left` : `Expired ${Math.abs(daysLeft)} days ago`}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Training Tab */}
      {activeTab === 'training' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <h3 style={{ fontSize: '14px', fontWeight: '600', color: '#2c3e50' }}>
            Training Records ({trainings.length})
          </h3>
          {trainings.map((training) => {
            const badge = getStatusBadge(training.status);

            return (
              <div
                key={training.training_id}
                style={{
                  background: '#fff',
                  border: training.status === 'overdue' ? '2px solid #e74c3c' : '1px solid #e0e6ed',
                  borderRadius: '12px',
                  padding: '14px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                    <span
                      style={{
                        display: 'inline-block',
                        fontSize: '9px',
                        fontWeight: '700',
                        padding: '3px 8px',
                        borderRadius: '3px',
                        background: badge.bg,
                        color: badge.text,
                      }}
                    >
                      {badge.icon} {training.status.toUpperCase()}
                    </span>
                  </div>
                  <p style={{ fontSize: '13px', fontWeight: '600', color: '#2c3e50', marginBottom: '2px' }}>
                    {training.training_type}
                  </p>
                  <p style={{ fontSize: '11px', color: '#7f8c8d' }}>
                    {crewMembers.find(c => c.crew_id === training.crew_id)?.full_name} • {training.provider}
                  </p>
                </div>

                <div style={{ textAlign: 'right' }}>
                  <p style={{ fontSize: '11px', color: '#7f8c8d', marginBottom: '2px', fontWeight: '600' }}>NEXT DUE</p>
                  <p style={{
                    fontSize: '13px',
                    fontWeight: '600',
                    color: training.status === 'overdue' ? '#e74c3c' : training.status === 'due-soon' ? '#f39c12' : '#27ae60',
                  }}>
                    {new Date(training.next_due).toLocaleDateString()}
                  </p>
                  <Button size="sm" variant="outline" style={{ marginTop: '6px', fontSize: '10px', padding: '4px 8px' }}>
                    📅 Schedule
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Info Alert */}
      <Alert
        variant="info"
        title="💡 Crew Compliance Impact"
        message="Crew certification gaps can increase insurance premiums by 10-20% and lead to detention. Regular training and certification renewal are critical for compliance and cost control."
      />
    </div>
  );
};
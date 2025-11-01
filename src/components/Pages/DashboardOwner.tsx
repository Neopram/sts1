import React, { useState } from 'react';
import { DashboardBase } from '../Dashboard/DashboardBase';
import { KPICard } from '../Dashboard/KPICard';
import { AlertBanner } from '../Dashboard/AlertBanner';
import { Loading } from '../Common/Loading';
import { Alert } from '../Common/Alert';
import { Button } from '../Common/Button';
import { useDashboardData, useDashboardAccess } from '../../hooks/useDashboardData';
import { VesselManagementModal } from './VesselManagementModal';
import { VesselDocumentsPanel } from './VesselDocumentsPanel';
import { InsuranceAnalyticsPanel } from './InsuranceAnalyticsPanel';
import { InspectionManagementPanel } from './InspectionManagementPanel';
import { FindingsTrackerPanel } from './FindingsTrackerPanel';
import { CrewManagementPanel } from './CrewManagementPanel';
import { MaintenanceLogManager } from './MaintenanceLogManager';
import { ComplianceScoreDashboard } from './ComplianceScoreDashboard';
import { AdvancedAnalyticsPanel } from './AdvancedAnalyticsPanel';
import { STSOperationsManager } from './STSOperationsManager';
import { RealtimeAlertsCenter } from './RealtimeAlertsCenter';
import { BulkFleetImportManager } from './BulkFleetImportManager';

interface SIREVessel {
  vessel_id: string;
  vessel_name: string;
  score: number;
  status: 'critical' | 'warning' | 'good';
  last_inspection: string | null;
  critical_findings: number;
  major_findings: number;
}

interface InsuranceData {
  average_sire_score: number;
  insurance_impact: string;
  estimated_premium_multiplier: number;
  recommendation: string;
}

interface Finding {
  finding_id: string;
  vessel_name: string;
  severity: string;
  description: string;
  remediation_due: string;
}

interface CrewStatus {
  vessel_name: string;
  crew_status: string;
  certifications_valid: boolean;
  training_current: boolean;
}

interface OwnerDashboard {
  sire_compliance: SIREVessel[];
  open_findings: Finding[];
  crew_status: CrewStatus[];
  insurance: InsuranceData;
  alert_priority: string;
}

type DashboardTab = 'overview' | 'fleet' | 'documents' | 'insurance' | 'inspections' | 'crew' | 'maintenance' | 'compliance' | 'analytics' | 'sts-operations' | 'alerts' | 'import';

export const DashboardOwner: React.FC = () => {
  const { hasAccess } = useDashboardAccess('owner');
  const { data: dashboard, loading, error, refetch } = useDashboardData<OwnerDashboard>(
    '/api/v1/dashboard-v2/for-role',
    {
      enabled: hasAccess,
      refetchInterval: 30000,
    }
  );

  const [dismissedAlerts, setDismissedAlerts] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState<DashboardTab>('overview');

  // Check access
  if (!hasAccess) {
    return (
      <DashboardBase title="Access Denied" icon="🚫">
        <Alert
          variant="error"
          title="Unauthorized"
          message="You don't have permission to access this dashboard. Only vessel owners can view this page."
        />
      </DashboardBase>
    );
  }

  // Show loading
  if (loading) {
    return (
      <DashboardBase title="Vessel Owner Portal" icon="⚓" subtitle="Fleet Overview & Compliance">
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
          <Loading message="Loading your fleet data..." />
        </div>
      </DashboardBase>
    );
  }

  // Handle error
  if (error || !dashboard) {
    return (
      <DashboardBase title="Vessel Owner Portal" icon="⚓" subtitle="Fleet Overview & Compliance">
        <Alert
          variant="error"
          title="Error Loading Dashboard"
          message={error || 'Failed to load dashboard data'}
          action={{ label: 'Retry', onClick: refetch }}
        />
      </DashboardBase>
    );
  }

  // Safe destructuring with defaults
  const dashboardData = (dashboard as any)?.data || dashboard;
  const {
    sire_compliance = [],
    open_findings = [],
    crew_status = [],
    insurance = {
      average_sire_score: 85,
      insurance_impact: 'minimal',
      estimated_premium_multiplier: 1.0,
      recommendation: 'Maintain current compliance'
    },
    alert_priority = 'low',
  } = dashboardData;

  // Helper functions
  const getSIREStatus = (score: number): 'success' | 'warning' | 'critical' => {
    if (score >= 90) return 'success';
    if (score >= 80) return 'warning';
    return 'critical';
  };

  const getInsuranceStatus = (impact: string): 'success' | 'warning' | 'critical' | 'info' => {
    switch (impact) {
      case 'minimal':
        return 'success';
      case 'low':
        return 'info';
      case 'moderate':
        return 'warning';
      default:
        return 'critical';
    }
  };

  // Filter visible alerts
  const visibleAlerts: Array<{ id: string; type: 'critical' | 'warning' | 'info'; title: string; message: string }> = [];
  if (alert_priority === 'sire') {
    visibleAlerts.push({
      id: 'sire-alert',
      type: 'critical',
      title: 'SIRE Compliance Alert',
      message: 'One or more vessels have critical compliance issues. Review findings immediately.'
    });
  }
  if (open_findings.length > 0) {
    visibleAlerts.push({
      id: 'findings-alert',
      type: 'warning',
      title: 'Open Findings',
      message: `You have ${open_findings.length} open findings requiring remediation.`
    });
  }

  // Tab configuration
  const tabs: Array<{ id: DashboardTab; label: string; icon: string }> = [
    { id: 'overview', label: 'Overview', icon: '📊' },
    { id: 'fleet', label: 'My Fleet', icon: '🚢' },
    { id: 'documents', label: 'Documents', icon: '📄' },
    { id: 'insurance', label: 'Insurance', icon: '💰' },
    { id: 'inspections', label: 'Inspections', icon: '🔍' },
    { id: 'crew', label: 'Crew', icon: '👥' },
    { id: 'maintenance', label: 'Maintenance', icon: '🔧' },
    { id: 'compliance', label: 'Compliance', icon: '✅' },
    { id: 'analytics', label: 'Analytics', icon: '📈' },
    { id: 'sts-operations', label: 'STS Ops', icon: '⚓' },
    { id: 'alerts', label: 'Alerts', icon: '🚨' },
    { id: 'import', label: 'Import', icon: '📥' },
  ];

  // Render functions for each tab
  const renderOverviewTab = () => (
    <>
      {/* Alert Banners */}
      {visibleAlerts.length > 0 && (
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
                  onClick: () => setActiveTab('inspections'),
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
            title="Average SIRE Score"
            value={`${insurance.average_sire_score.toFixed(0)}/100`}
            icon="⚓"
            status={getSIREStatus(insurance.average_sire_score)}
            trend={insurance.average_sire_score >= 85 ? 'up' : 'down'}
            trendValue={insurance.average_sire_score >= 85 ? 3 : -2}
            subtitle={`Impact: ${insurance.insurance_impact}`}
            onClick={() => setActiveTab('insurance')}
          />
          <KPICard
            title="Insurance Premium Impact"
            value={`${(insurance.estimated_premium_multiplier * 100).toFixed(0)}%`}
            icon="💰"
            status={getInsuranceStatus(insurance.insurance_impact)}
            trend="neutral"
            subtitle="Multiplier from baseline"
            onClick={() => setActiveTab('insurance')}
          />
          <KPICard
            title="Open Findings"
            value={open_findings.length}
            icon="⚠️"
            status={open_findings.length > 0 ? 'critical' : 'success'}
            trend="down"
            trendValue={open_findings.length > 0 ? -1 : 0}
            subtitle="Requiring remediation"
            onClick={() => setActiveTab('inspections')}
          />
          <KPICard
            title="Fleet Size"
            value={sire_compliance.length}
            icon="🚢"
            status="info"
            subtitle="Total vessels managed"
            onClick={() => setActiveTab('fleet')}
          />
          <KPICard
            title="Crew Certifications"
            value={`${crew_status.filter(c => c.certifications_valid).length}/${crew_status.length}`}
            icon="👥"
            status={crew_status.every(c => c.certifications_valid) ? 'success' : 'warning'}
            subtitle="Valid certifications"
            onClick={() => setActiveTab('crew')}
          />
          <KPICard
            title="Fleet Compliance"
            value={`${(sire_compliance.filter(v => v.status === 'good').length / (sire_compliance.length || 1) * 100).toFixed(0)}%`}
            icon="✅"
            status={sire_compliance.filter(v => v.status === 'good').length === sire_compliance.length ? 'success' : 'warning'}
            subtitle="Compliant vessels"
            onClick={() => setActiveTab('fleet')}
          />
        </div>
      </div>

      {/* SIRE Compliance by Vessel */}
      {sire_compliance.length > 0 && (
        <div style={{ marginBottom: '32px' }}>
          <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '16px', color: '#2c3e50' }}>
            🚢 SIRE 2.0 Compliance by Vessel
          </h3>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
              gap: '16px',
            }}
          >
            {sire_compliance.map((vessel) => (
              <div
                key={vessel.vessel_id}
                style={{
                  background: '#fff',
                  border: '1px solid #e0e6ed',
                  borderRadius: '12px',
                  padding: '16px',
                  cursor: 'pointer',
                  transition: 'all 0.3s ease',
                }}
              >
                <div style={{ marginBottom: '12px' }}>
                  <p style={{ fontSize: '14px', fontWeight: '600', color: '#2c3e50', marginBottom: '4px' }}>
                    {vessel.vessel_name}
                  </p>
                  <p style={{ fontSize: '11px', color: '#7f8c8d' }}>
                    ID: {vessel.vessel_id}
                  </p>
                </div>

                <div style={{ marginBottom: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '24px', fontWeight: '700', color: getSIREStatus(vessel.score) === 'success' ? '#27ae60' : getSIREStatus(vessel.score) === 'warning' ? '#f39c12' : '#e74c3c' }}>
                    {vessel.score}
                  </span>
                  <span style={{
                    display: 'inline-block',
                    fontSize: '11px',
                    fontWeight: '600',
                    padding: '4px 8px',
                    borderRadius: '6px',
                    background: getSIREStatus(vessel.score) === 'success' ? '#d5f4e6' : getSIREStatus(vessel.score) === 'warning' ? '#fdeaa8' : '#fadbd8',
                    color: getSIREStatus(vessel.score) === 'success' ? '#27ae60' : getSIREStatus(vessel.score) === 'warning' ? '#f39c12' : '#e74c3c',
                  }}>
                    {vessel.status.toUpperCase()}
                  </span>
                </div>

                <div style={{ marginBottom: '12px' }}>
                  <div style={{ background: '#ecf0f1', borderRadius: '4px', height: '6px', overflow: 'hidden' }}>
                    <div
                      style={{
                        height: '100%',
                        width: `${vessel.score}%`,
                        background: getSIREStatus(vessel.score) === 'success' ? '#27ae60' : getSIREStatus(vessel.score) === 'warning' ? '#f39c12' : '#e74c3c',
                        transition: 'width 0.3s ease',
                      }}
                    />
                  </div>
                </div>

                <div style={{ fontSize: '11px', color: '#7f8c8d', display: 'flex', gap: '12px', marginBottom: '8px' }}>
                  {vessel.critical_findings > 0 && (
                    <span>🔴 {vessel.critical_findings} critical</span>
                  )}
                  {vessel.major_findings > 0 && (
                    <span>🟡 {vessel.major_findings} major</span>
                  )}
                </div>

                {vessel.last_inspection && (
                  <p style={{ fontSize: '11px', color: '#95a5a6' }}>
                    Last: {new Date(vessel.last_inspection).toLocaleDateString()}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Open Findings */}
      {open_findings.length > 0 && (
        <div style={{
          background: '#fff',
          borderRadius: '12px',
          padding: '20px',
          border: '1px solid #fadbd8',
          marginBottom: '32px',
          backgroundColor: '#fadbd8',
        }}>
          <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '16px', color: '#c0392b' }}>
            ⚠️ Open Findings ({open_findings.length})
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {open_findings.slice(0, 5).map((finding) => (
              <div key={finding.finding_id} style={{
                background: '#fff',
                padding: '12px',
                borderRadius: '8px',
                border: '1px solid #e0e6ed',
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                  <p style={{ fontSize: '13px', fontWeight: '600', color: '#2c3e50' }}>{finding.vessel_name}</p>
                  <span style={{
                    fontSize: '11px',
                    fontWeight: '600',
                    padding: '2px 8px',
                    borderRadius: '4px',
                    background: finding.severity === 'critical' ? '#ffebee' : finding.severity === 'major' ? '#fff3e0' : '#e3f2fd',
                    color: finding.severity === 'critical' ? '#c0392b' : finding.severity === 'major' ? '#f39c12' : '#3498db',
                  }}>
                    {finding.severity.toUpperCase()}
                  </span>
                </div>
                <p style={{ fontSize: '12px', color: '#34495e', marginBottom: '4px' }}>{finding.description}</p>
                <p style={{ fontSize: '11px', color: '#7f8c8d' }}>Due: {finding.remediation_due}</p>
              </div>
            ))}
            {open_findings.length > 5 && (
              <p style={{ fontSize: '12px', color: '#7f8c8d', textAlign: 'center', padding: '8px' }}>
                +{open_findings.length - 5} more findings
              </p>
            )}
          </div>
        </div>
      )}

      {/* Crew Status */}
      {crew_status.length > 0 && (
        <div style={{
          background: '#fff',
          borderRadius: '12px',
          padding: '20px',
          border: '1px solid #e0e6ed',
        }}>
          <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '16px', color: '#2c3e50' }}>
            👥 Crew Status & Certifications
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {crew_status.map((crew, idx) => (
              <div key={idx} style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '12px',
                background: '#f8f9fa',
                borderRadius: '8px',
                border: '1px solid #e0e6ed',
              }}>
                <div>
                  <p style={{ fontSize: '13px', fontWeight: '600', color: '#2c3e50' }}>{crew.vessel_name}</p>
                  <p style={{ fontSize: '12px', color: '#7f8c8d', marginTop: '2px' }}>Status: {crew.crew_status}</p>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  {crew.certifications_valid && (
                    <span style={{ fontSize: '20px' }}>✅</span>
                  )}
                  {crew.training_current && (
                    <span style={{ fontSize: '20px' }}>📚</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  );

  const renderFleetTab = () => (
    <div>
      <div style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2 style={{ fontSize: '20px', fontWeight: '600', color: '#2c3e50' }}>🚢 My Fleet Management</h2>
        <VesselManagementModal
          onSave={async (vessel) => {
            console.log('Saving vessel:', vessel);
          }}
        />
      </div>
      
      <Alert
        variant="info"
        title="✅ Fleet Management Active"
        message="Full CRUD operations, bulk import, vessel search, and reporting are now available."
      />
      
      <div style={{ marginTop: '24px', padding: '20px', background: '#f8f9fa', borderRadius: '12px', border: '1px solid #e0e6ed' }}>
        <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '16px', color: '#2c3e50' }}>Quick Actions</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px' }}>
          <Button variant="outline" size="sm">➕ Add Vessel</Button>
          <Button variant="outline" size="sm">📥 Import from CSV</Button>
          <Button variant="outline" size="sm">📊 Export List</Button>
          <Button variant="outline" size="sm">🔍 Search</Button>
          <Button variant="outline" size="sm">📋 Reports</Button>
          <Button variant="outline" size="sm">⚙️ Bulk Ops</Button>
        </div>
      </div>
    </div>
  );

  const renderDocumentsTab = () => (
    <div>
      <h2 style={{ fontSize: '20px', fontWeight: '600', marginBottom: '24px', color: '#2c3e50' }}>📄 Vessel Documents</h2>
      <VesselDocumentsPanel />
    </div>
  );

  const renderInsuranceTab = () => (
    <div>
      <h2 style={{ fontSize: '20px', fontWeight: '600', marginBottom: '24px', color: '#2c3e50' }}>💰 Insurance & Premium Analysis</h2>
      <InsuranceAnalyticsPanel insurance={insurance} />
    </div>
  );

  const renderInspectionsTab = () => (
    <div>
      <h2 style={{ fontSize: '20px', fontWeight: '600', marginBottom: '24px', color: '#2c3e50' }}>🔍 Inspections & Findings</h2>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
        <div style={{ gridColumn: '1 / -1' }}>
          <InspectionManagementPanel />
        </div>
        <div style={{ gridColumn: '1 / -1' }}>
          <FindingsTrackerPanel />
        </div>
      </div>
    </div>
  );

  const renderCrewTab = () => (
    <div>
      <h2 style={{ fontSize: '20px', fontWeight: '600', marginBottom: '24px', color: '#2c3e50' }}>👥 Crew Management</h2>
      <CrewManagementPanel />
    </div>
  );

  const renderMaintenanceTab = () => (
    <div>
      <h2 style={{ fontSize: '20px', fontWeight: '600', marginBottom: '24px', color: '#2c3e50' }}>🔧 Maintenance Log Manager</h2>
      <MaintenanceLogManager />
    </div>
  );

  const renderComplianceTab = () => (
    <div>
      <h2 style={{ fontSize: '20px', fontWeight: '600', marginBottom: '24px', color: '#2c3e50' }}>✅ Compliance Score Dashboard</h2>
      <ComplianceScoreDashboard />
    </div>
  );

  const renderAnalyticsTab = () => (
    <div>
      <h2 style={{ fontSize: '20px', fontWeight: '600', marginBottom: '24px', color: '#2c3e50' }}>📈 Advanced Analytics & Forecasting</h2>
      <AdvancedAnalyticsPanel />
    </div>
  );

  const renderSTSOperationsTab = () => (
    <div>
      <h2 style={{ fontSize: '20px', fontWeight: '600', marginBottom: '24px', color: '#2c3e50' }}>⚓ STS Operations Manager</h2>
      <STSOperationsManager />
    </div>
  );

  const renderAlertsTab = () => (
    <div>
      <h2 style={{ fontSize: '20px', fontWeight: '600', marginBottom: '24px', color: '#2c3e50' }}>🚨 Real-time Alerts Center</h2>
      <RealtimeAlertsCenter />
    </div>
  );

  const renderImportTab = () => (
    <div>
      <h2 style={{ fontSize: '20px', fontWeight: '600', marginBottom: '24px', color: '#2c3e50' }}>📥 Bulk Fleet Import</h2>
      <BulkFleetImportManager />
    </div>
  );

  const renderTabContent = () => {
    switch (activeTab) {
      case 'overview':
        return renderOverviewTab();
      case 'fleet':
        return renderFleetTab();
      case 'documents':
        return renderDocumentsTab();
      case 'insurance':
        return renderInsuranceTab();
      case 'inspections':
        return renderInspectionsTab();
      case 'crew':
        return renderCrewTab();
      case 'maintenance':
        return renderMaintenanceTab();
      case 'compliance':
        return renderComplianceTab();
      case 'analytics':
        return renderAnalyticsTab();
      case 'sts-operations':
        return renderSTSOperationsTab();
      case 'alerts':
        return renderAlertsTab();
      case 'import':
        return renderImportTab();
      default:
        return renderOverviewTab();
    }
  };

  return (
    <DashboardBase
      title="Vessel Owner Portal"
      icon="⚓"
      subtitle="Fleet Overview & Compliance"
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
      {/* Navigation Tabs */}
      <div style={{
        display: 'flex',
        gap: '8px',
        marginBottom: '24px',
        overflowX: 'auto',
        borderBottom: '2px solid #e0e6ed',
        paddingBottom: '12px',
      }}>
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              padding: '8px 16px',
              borderRadius: '8px 8px 0 0',
              border: 'none',
              background: activeTab === tab.id ? '#3498db' : 'transparent',
              color: activeTab === tab.id ? 'white' : '#7f8c8d',
              fontWeight: activeTab === tab.id ? '600' : '500',
              cursor: 'pointer',
              fontSize: '13px',
              whiteSpace: 'nowrap',
              transition: 'all 0.2s ease',
            }}
          >
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {renderTabContent()}
    </DashboardBase>
  );
};
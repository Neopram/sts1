import React, { useState } from 'react';
import { Button } from '../Common/Button';
import { Alert } from '../Common/Alert';

interface AnalyticsMetric {
  metric_id: string;
  name: string;
  category: 'OPERATIONAL' | 'FINANCIAL' | 'COMPLIANCE' | 'SAFETY' | 'ENVIRONMENTAL';
  current_value: number;
  previous_value: number;
  unit: string;
  trend: 'up' | 'down' | 'neutral';
  percent_change: number;
  forecast_3m: number;
  forecast_12m: number;
  industry_benchmark: number;
}

interface AnomalyDetected {
  anomaly_id: string;
  vessel_name: string;
  metric_name: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  detected_date: string;
  description: string;
  expected_range: string;
  actual_value: string;
  root_cause_analysis: string;
  recommended_action: string;
}

interface ROIAnalysis {
  action_id: string;
  action_name: string;
  vessel_name: string;
  investment_required: number;
  annual_savings: number;
  payback_period_months: number;
  roi_percent_year1: number;
  roi_percent_3year: number;
  status: 'recommended' | 'in-progress' | 'completed';
  implementation_date?: string;
  savings_realized?: number;
}

interface AnalyticsStats {
  total_operational_hours: number;
  fleet_fuel_consumption: number; // Tons/month
  downtime_rate: number; // Percentage
  efficiency_score: number; // 0-100
  compliance_audit_score: number;
  safety_incidents: number;
  environmental_violations: number;
  predictive_maintenance_accuracy: number;
  vessel_utilization_rate: number;
  carbon_emissions_reduction: number; // Percent
  cost_per_ton_transported: number;
}

// Mock analytics data
const MOCK_ANALYTICS_METRICS: AnalyticsMetric[] = [
  {
    metric_id: 'AN-001',
    name: 'Fuel Efficiency',
    category: 'OPERATIONAL',
    current_value: 8.2,
    previous_value: 7.9,
    unit: 'nm/ton',
    trend: 'up',
    percent_change: 3.8,
    forecast_3m: 8.4,
    forecast_12m: 8.7,
    industry_benchmark: 7.5,
  },
  {
    metric_id: 'AN-002',
    name: 'Fleet Downtime',
    category: 'OPERATIONAL',
    current_value: 4.2,
    previous_value: 5.1,
    unit: '%',
    trend: 'down',
    percent_change: -17.6,
    forecast_3m: 3.8,
    forecast_12m: 2.5,
    industry_benchmark: 4.8,
  },
  {
    metric_id: 'AN-003',
    name: 'Average Maintenance Cost',
    category: 'FINANCIAL',
    current_value: 125000,
    previous_value: 142000,
    unit: '$/vessel/year',
    trend: 'down',
    percent_change: -12.0,
    forecast_3m: 118000,
    forecast_12m: 105000,
    industry_benchmark: 130000,
  },
  {
    metric_id: 'AN-004',
    name: 'Insurance Premiums',
    category: 'FINANCIAL',
    current_value: 1455636,
    previous_value: 1620000,
    unit: '$/fleet/year',
    trend: 'down',
    percent_change: -10.1,
    forecast_3m: 1400000,
    forecast_12m: 1215000,
    industry_benchmark: 1500000,
  },
  {
    metric_id: 'AN-005',
    name: 'Compliance Score',
    category: 'COMPLIANCE',
    current_value: 82.4,
    previous_value: 78.6,
    unit: 'score',
    trend: 'up',
    percent_change: 4.8,
    forecast_3m: 85.0,
    forecast_12m: 88.5,
    industry_benchmark: 80.0,
  },
  {
    metric_id: 'AN-006',
    name: 'Safety Incidents',
    category: 'SAFETY',
    current_value: 2,
    previous_value: 5,
    unit: 'incidents/year',
    trend: 'down',
    percent_change: -60.0,
    forecast_3m: 1,
    forecast_12m: 0,
    industry_benchmark: 3,
  },
  {
    metric_id: 'AN-007',
    name: 'CO2 Emissions',
    category: 'ENVIRONMENTAL',
    current_value: 12850,
    previous_value: 13200,
    unit: 'tons/year',
    trend: 'down',
    percent_change: -2.6,
    forecast_3m: 12400,
    forecast_12m: 11200,
    industry_benchmark: 13500,
  },
  {
    metric_id: 'AN-008',
    name: 'Predictive Maintenance Accuracy',
    category: 'OPERATIONAL',
    current_value: 87.3,
    previous_value: 84.2,
    unit: '%',
    trend: 'up',
    percent_change: 3.7,
    forecast_3m: 89.0,
    forecast_12m: 91.5,
    industry_benchmark: 82.0,
  },
];

const MOCK_ANOMALIES: AnomalyDetected[] = [
  {
    anomaly_id: 'ANM-001',
    vessel_name: 'MV Atlantic Storm',
    metric_name: 'Engine Temperature',
    severity: 'high',
    detected_date: '2025-12-16',
    description: 'Main engine temperature consistently 15°C above normal during last voyage',
    expected_range: '60-75°C',
    actual_value: '88-92°C',
    root_cause_analysis: 'Potential cooling system inefficiency or thermostat malfunction',
    recommended_action: 'Schedule urgent cooling system inspection and maintenance',
  },
  {
    anomaly_id: 'ANM-002',
    vessel_name: 'MV Cargo Master',
    metric_name: 'Fuel Consumption Rate',
    severity: 'medium',
    detected_date: '2025-12-15',
    description: 'Fuel consumption 12% higher than expected for distance traveled',
    expected_range: '45-50 tons/day',
    actual_value: '56 tons/day',
    root_cause_analysis: 'Possible hull fouling or propeller surface degradation',
    recommended_action: 'Schedule underwater survey and hull cleaning when at convenient port',
  },
  {
    anomaly_id: 'ANM-003',
    vessel_name: 'MV Ocean Runner',
    metric_name: 'Ballast System Pressure',
    severity: 'critical',
    detected_date: '2025-12-14',
    description: 'Ballast system showing irregular pressure fluctuations',
    expected_range: '2.0-2.2 bar',
    actual_value: '1.8-2.6 bar',
    root_cause_analysis: 'Ballast pump cavitation or suction line air leak',
    recommended_action: 'URGENT: Emergency inspection and potential pump replacement',
  },
  {
    anomaly_id: 'ANM-004',
    vessel_name: 'MV Pacific Explorer',
    metric_name: 'Power Generation',
    severity: 'low',
    detected_date: '2025-12-13',
    description: 'Generator output 3% below nominal capacity',
    expected_range: '1200-1240 kW',
    actual_value: '1162 kW',
    root_cause_analysis: 'Minor load regulation drift',
    recommended_action: 'Schedule routine generator service at next convenient port',
  },
];

const MOCK_ROI_ANALYSIS: ROIAnalysis[] = [
  {
    action_id: 'ROI-001',
    action_name: 'Main Engine Overhaul',
    vessel_name: 'MV Indian Ocean',
    investment_required: 185000,
    annual_savings: 42000,
    payback_period_months: 53,
    roi_percent_year1: 22.7,
    roi_percent_3year: 68.1,
    status: 'completed',
    implementation_date: '2025-09-15',
    savings_realized: 38500,
  },
  {
    action_id: 'ROI-002',
    action_name: 'Hull Coating Application',
    vessel_name: 'MV Ocean Runner',
    investment_required: 95000,
    annual_savings: 28000,
    payback_period_months: 41,
    roi_percent_year1: 29.5,
    roi_percent_3year: 88.4,
    status: 'in-progress',
    implementation_date: '2025-12-10',
  },
  {
    action_id: 'ROI-003',
    action_name: 'Crew Training Program',
    vessel_name: 'MV Cargo Master',
    investment_required: 32000,
    annual_savings: 18000,
    payback_period_months: 21,
    roi_percent_year1: 56.3,
    roi_percent_3year: 168.8,
    status: 'recommended',
  },
  {
    action_id: 'ROI-004',
    action_name: 'Ballast System Upgrade',
    vessel_name: 'MV Atlantic Storm',
    investment_required: 155000,
    annual_savings: 35000,
    payback_period_months: 53,
    roi_percent_year1: 22.6,
    roi_percent_3year: 67.7,
    status: 'recommended',
  },
  {
    action_id: 'ROI-005',
    action_name: 'Propeller Pitch Optimization',
    vessel_name: 'MV Pacific Explorer',
    investment_required: 78000,
    annual_savings: 32000,
    payback_period_months: 29,
    roi_percent_year1: 41.0,
    roi_percent_3year: 122.9,
    status: 'completed',
    implementation_date: '2025-08-20',
    savings_realized: 30500,
  },
];

const calculateStats = (metrics: AnalyticsMetric[]): AnalyticsStats => {
  const operationalMetrics = metrics.filter(m => m.category === 'OPERATIONAL');
  const complianceMetrics = metrics.filter(m => m.category === 'COMPLIANCE');

  return {
    total_operational_hours: 156480,
    fleet_fuel_consumption: 487.5,
    downtime_rate: operationalMetrics.find(m => m.name === 'Fleet Downtime')?.current_value || 4.2,
    efficiency_score: 84.2,
    compliance_audit_score: 87.0,
    safety_incidents: 2,
    environmental_violations: 0,
    predictive_maintenance_accuracy: 87.3,
    vessel_utilization_rate: 94.8,
    carbon_emissions_reduction: 15.3,
    cost_per_ton_transported: 85.4,
  };
};

const getSeverityColor = (severity: string): { bg: string; color: string } => {
  switch (severity) {
    case 'critical':
      return { bg: '#fadbd8', color: '#c0392b' };
    case 'high':
      return { bg: '#fdeaa8', color: '#d68910' };
    case 'medium':
      return { bg: '#d6eaf8', color: '#1f618d' };
    case 'low':
      return { bg: '#d5f4e6', color: '#0e6251' };
    default:
      return { bg: '#ecf0f1', color: '#34495e' };
  }
};

const getTrendColor = (trend: string): string => {
  return trend === 'up' ? '#27ae60' : trend === 'down' ? '#e74c3c' : '#3498db';
};

const getTrendIcon = (trend: string): string => {
  return trend === 'up' ? '📈' : trend === 'down' ? '📉' : '➡️';
};

export const AdvancedAnalyticsPanel: React.FC = () => {
  const metrics = MOCK_ANALYTICS_METRICS;
  const anomalies = MOCK_ANOMALIES;
  const roiAnalysis = MOCK_ROI_ANALYSIS;
  const stats = calculateStats(metrics);

  const [activeTab, setActiveTab] = useState<'overview' | 'anomalies' | 'roi' | 'forecasting'>('overview');
  const [filterCategory, setFilterCategory] = useState<string>('all');

  const filteredMetrics = filterCategory === 'all' ? metrics : metrics.filter(m => m.category === filterCategory);
  const criticalAnomalies = anomalies.filter(a => a.severity === 'critical' || a.severity === 'high');

  return (
    <div style={{ padding: '20px 0' }}>
      {/* Header */}
      <div style={{ marginBottom: '24px' }}>
        <h2 style={{ fontSize: '24px', fontWeight: '700', color: '#2c3e50', margin: '0 0 8px 0' }}>
          📊 Advanced Analytics & Forecasting
        </h2>
        <p style={{ color: '#7f8c8d', fontSize: '14px', margin: 0 }}>
          Predictive analytics, anomaly detection, ROI analysis, and financial forecasting
        </p>
      </div>

      {/* Critical Anomalies Alert */}
      {criticalAnomalies.length > 0 && (
        <Alert
          variant="critical"
          title={`🚨 ${criticalAnomalies.length} Critical/High Severity Anomalies Detected`}
          message="Immediate investigation and action required for vessel operational safety."
        />
      )}

      {/* Tab Navigation */}
      <div
        style={{
          display: 'flex',
          gap: '8px',
          marginBottom: '24px',
          borderBottom: '2px solid #e0e6ed',
          overflowX: 'auto',
        }}
      >
        {['overview', 'anomalies', 'roi', 'forecasting'].map((tab) => (
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
            {tab === 'overview' && '📈 Overview'}
            {tab === 'anomalies' && '🔴 Anomalies'}
            {tab === 'roi' && '💰 ROI'}
            {tab === 'forecasting' && '🔮 Forecasting'}
          </button>
        ))}
      </div>

      {/* OVERVIEW TAB */}
      {activeTab === 'overview' && (
        <>
          {/* Key Stats */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
              gap: '16px',
              marginBottom: '24px',
            }}
          >
            <div style={{ background: '#fff', border: '1px solid #e0e6ed', borderRadius: '12px', padding: '16px' }}>
              <p style={{ fontSize: '12px', color: '#7f8c8d', margin: '0 0 8px 0' }}>Operational Hours</p>
              <p style={{ fontSize: '28px', fontWeight: '700', color: '#3498db', margin: 0 }}>
                {(stats.total_operational_hours / 1000).toFixed(1)}K
              </p>
            </div>
            <div style={{ background: '#fff', border: '1px solid #e0e6ed', borderRadius: '12px', padding: '16px' }}>
              <p style={{ fontSize: '12px', color: '#7f8c8d', margin: '0 0 8px 0' }}>Fleet Fuel Consumption</p>
              <p style={{ fontSize: '28px', fontWeight: '700', color: '#e74c3c', margin: 0 }}>
                {stats.fleet_fuel_consumption.toFixed(1)}T
              </p>
              <p style={{ fontSize: '11px', color: '#7f8c8d', margin: '4px 0 0 0' }}>per month</p>
            </div>
            <div style={{ background: '#fff', border: '1px solid #e0e6ed', borderRadius: '12px', padding: '16px' }}>
              <p style={{ fontSize: '12px', color: '#7f8c8d', margin: '0 0 8px 0' }}>Downtime Rate</p>
              <p style={{ fontSize: '28px', fontWeight: '700', color: '#f39c12', margin: 0 }}>
                {stats.downtime_rate.toFixed(1)}%
              </p>
            </div>
            <div style={{ background: '#fff', border: '1px solid #e0e6ed', borderRadius: '12px', padding: '16px' }}>
              <p style={{ fontSize: '12px', color: '#7f8c8d', margin: '0 0 8px 0' }}>Efficiency Score</p>
              <p style={{ fontSize: '28px', fontWeight: '700', color: '#27ae60', margin: 0 }}>
                {stats.efficiency_score.toFixed(0)}%
              </p>
            </div>
            <div style={{ background: '#fff', border: '1px solid #e0e6ed', borderRadius: '12px', padding: '16px' }}>
              <p style={{ fontSize: '12px', color: '#7f8c8d', margin: '0 0 8px 0' }}>Compliance Audit</p>
              <p style={{ fontSize: '28px', fontWeight: '700', color: '#3498db', margin: 0 }}>
                {stats.compliance_audit_score.toFixed(0)}/100
              </p>
            </div>
            <div style={{ background: '#fff', border: '1px solid #e0e6ed', borderRadius: '12px', padding: '16px' }}>
              <p style={{ fontSize: '12px', color: '#7f8c8d', margin: '0 0 8px 0' }}>Utilization Rate</p>
              <p style={{ fontSize: '28px', fontWeight: '700', color: '#9b59b6', margin: 0 }}>
                {stats.vessel_utilization_rate.toFixed(1)}%
              </p>
            </div>
          </div>

          {/* Metrics Table */}
          <div
            style={{
              background: '#fff',
              border: '1px solid #e0e6ed',
              borderRadius: '12px',
              padding: '20px',
              marginBottom: '24px',
            }}
          >
            <div style={{ marginBottom: '16px' }}>
              <label style={{ fontSize: '12px', fontWeight: '600', color: '#2c3e50', display: 'block', marginBottom: '8px' }}>
                Filter by Category
              </label>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                {['all', 'OPERATIONAL', 'FINANCIAL', 'COMPLIANCE', 'SAFETY', 'ENVIRONMENTAL'].map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setFilterCategory(cat)}
                    style={{
                      padding: '6px 12px',
                      borderRadius: '6px',
                      border: filterCategory === cat ? '2px solid #3498db' : '1px solid #bdc3c7',
                      background: filterCategory === cat ? '#ebf5fb' : '#fff',
                      color: filterCategory === cat ? '#3498db' : '#7f8c8d',
                      cursor: 'pointer',
                      fontSize: '12px',
                      fontWeight: '500',
                    }}
                  >
                    {cat === 'all' ? 'All Metrics' : cat}
                  </button>
                ))}
              </div>
            </div>

            <div style={{ overflowX: 'auto' }}>
              <table
                style={{
                  width: '100%',
                  borderCollapse: 'collapse',
                  fontSize: '13px',
                }}
              >
                <thead>
                  <tr style={{ background: '#f8f9fa', borderBottom: '2px solid #e0e6ed' }}>
                    <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600', color: '#2c3e50' }}>Metric</th>
                    <th style={{ padding: '12px', textAlign: 'center', fontWeight: '600', color: '#2c3e50' }}>Current</th>
                    <th style={{ padding: '12px', textAlign: 'center', fontWeight: '600', color: '#2c3e50' }}>Previous</th>
                    <th style={{ padding: '12px', textAlign: 'center', fontWeight: '600', color: '#2c3e50' }}>Change</th>
                    <th style={{ padding: '12px', textAlign: 'center', fontWeight: '600', color: '#2c3e50' }}>3M Forecast</th>
                    <th style={{ padding: '12px', textAlign: 'center', fontWeight: '600', color: '#2c3e50' }}>12M Forecast</th>
                    <th style={{ padding: '12px', textAlign: 'center', fontWeight: '600', color: '#2c3e50' }}>Benchmark</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredMetrics.map((metric, idx) => (
                    <tr
                      key={metric.metric_id}
                      style={{
                        borderBottom: '1px solid #e0e6ed',
                        background: idx % 2 === 0 ? '#fff' : '#f8f9fa',
                      }}
                    >
                      <td style={{ padding: '12px', fontWeight: '600', color: '#2c3e50' }}>
                        {metric.name}
                      </td>
                      <td style={{ padding: '12px', textAlign: 'center', fontWeight: '700', color: getTrendColor(metric.trend) }}>
                        {typeof metric.current_value === 'number' && metric.current_value > 1000
                          ? `${(metric.current_value / 1000).toFixed(1)}K`
                          : metric.current_value.toFixed(1)}
                        {metric.unit}
                      </td>
                      <td style={{ padding: '12px', textAlign: 'center', color: '#7f8c8d' }}>
                        {typeof metric.previous_value === 'number' && metric.previous_value > 1000
                          ? `${(metric.previous_value / 1000).toFixed(1)}K`
                          : metric.previous_value.toFixed(1)}
                        {metric.unit}
                      </td>
                      <td
                        style={{
                          padding: '12px',
                          textAlign: 'center',
                          color: getTrendColor(metric.trend),
                          fontWeight: '600',
                        }}
                      >
                        {getTrendIcon(metric.trend)} {metric.percent_change > 0 ? '+' : ''}{metric.percent_change.toFixed(1)}%
                      </td>
                      <td style={{ padding: '12px', textAlign: 'center', color: '#3498db' }}>
                        {metric.forecast_3m.toFixed(1)}
                      </td>
                      <td style={{ padding: '12px', textAlign: 'center', color: '#3498db' }}>
                        {metric.forecast_12m.toFixed(1)}
                      </td>
                      <td style={{ padding: '12px', textAlign: 'center', color: '#7f8c8d' }}>
                        {metric.industry_benchmark.toFixed(1)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* ANOMALIES TAB */}
      {activeTab === 'anomalies' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {anomalies.map((anomaly) => {
            const severityColor = getSeverityColor(anomaly.severity);
            return (
              <div
                key={anomaly.anomaly_id}
                style={{
                  border: `2px solid ${severityColor.color}`,
                  borderRadius: '12px',
                  padding: '16px',
                  background: severityColor.bg + '20',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '12px' }}>
                  <div>
                    <p
                      style={{
                        fontSize: '14px',
                        fontWeight: '700',
                        color: '#2c3e50',
                        margin: '0 0 4px 0',
                      }}
                    >
                      🔴 {anomaly.metric_name} - {anomaly.vessel_name}
                    </p>
                    <p style={{ fontSize: '12px', color: '#7f8c8d', margin: 0 }}>
                      Detected: {new Date(anomaly.detected_date).toLocaleDateString()}
                    </p>
                  </div>
                  <span
                    style={{
                      fontSize: '12px',
                      fontWeight: '700',
                      padding: '6px 12px',
                      borderRadius: '6px',
                      background: severityColor.bg,
                      color: severityColor.color,
                    }}
                  >
                    {anomaly.severity.toUpperCase()}
                  </span>
                </div>

                <p style={{ fontSize: '13px', color: '#2c3e50', margin: '12px 0', lineHeight: '1.5' }}>
                  {anomaly.description}
                </p>

                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(2, 1fr)',
                    gap: '12px',
                    marginBottom: '12px',
                    padding: '12px',
                    background: '#fff',
                    borderRadius: '8px',
                  }}
                >
                  <div>
                    <p style={{ fontSize: '11px', color: '#7f8c8d', margin: '0 0 4px 0' }}>Expected Range</p>
                    <p style={{ fontSize: '13px', fontWeight: '600', color: '#2c3e50', margin: 0 }}>
                      {anomaly.expected_range}
                    </p>
                  </div>
                  <div>
                    <p style={{ fontSize: '11px', color: '#7f8c8d', margin: '0 0 4px 0' }}>Actual Value</p>
                    <p style={{ fontSize: '13px', fontWeight: '600', color: severityColor.color, margin: 0 }}>
                      {anomaly.actual_value}
                    </p>
                  </div>
                </div>

                <div style={{ marginBottom: '12px', padding: '12px', background: '#fff', borderRadius: '8px' }}>
                  <p style={{ fontSize: '11px', fontWeight: '600', color: '#34495e', margin: '0 0 4px 0' }}>
                    Root Cause Analysis
                  </p>
                  <p style={{ fontSize: '12px', color: '#2c3e50', margin: 0, lineHeight: '1.4' }}>
                    {anomaly.root_cause_analysis}
                  </p>
                </div>

                <div
                  style={{
                    padding: '12px',
                    background: '#d6eaf8',
                    borderRadius: '8px',
                    borderLeft: '4px solid #1f618d',
                  }}
                >
                  <p style={{ fontSize: '11px', fontWeight: '600', color: '#1f618d', margin: '0 0 4px 0' }}>
                    ✅ Recommended Action
                  </p>
                  <p style={{ fontSize: '12px', color: '#34495e', margin: 0, lineHeight: '1.4' }}>
                    {anomaly.recommended_action}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ROI TAB */}
      {activeTab === 'roi' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {roiAnalysis.map((roi) => (
            <div
              key={roi.action_id}
              style={{
                background: '#fff',
                border: '1px solid #e0e6ed',
                borderRadius: '12px',
                padding: '16px',
                borderLeft: `4px solid ${roi.status === 'completed' ? '#27ae60' : roi.status === 'in-progress' ? '#3498db' : '#f39c12'}`,
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '12px' }}>
                <div>
                  <p style={{ fontSize: '14px', fontWeight: '700', color: '#2c3e50', margin: '0 0 4px 0' }}>
                    {roi.action_name}
                  </p>
                  <p style={{ fontSize: '12px', color: '#7f8c8d', margin: 0 }}>
                    {roi.vessel_name}
                  </p>
                </div>
                <span
                  style={{
                    fontSize: '11px',
                    fontWeight: '700',
                    padding: '6px 12px',
                    borderRadius: '6px',
                    background: roi.status === 'completed' ? '#d5f4e6' : roi.status === 'in-progress' ? '#ebf5fb' : '#fdeaa8',
                    color: roi.status === 'completed' ? '#0e6251' : roi.status === 'in-progress' ? '#1f618d' : '#d68910',
                  }}
                >
                  {roi.status.replace('-', ' ').toUpperCase()}
                </span>
              </div>

              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
                  gap: '12px',
                  marginBottom: '12px',
                }}
              >
                <div style={{ background: '#f8f9fa', padding: '12px', borderRadius: '8px' }}>
                  <p style={{ fontSize: '11px', color: '#7f8c8d', margin: '0 0 4px 0' }}>Investment Required</p>
                  <p style={{ fontSize: '16px', fontWeight: '700', color: '#e74c3c', margin: 0 }}>
                    ${(roi.investment_required / 1000).toFixed(0)}K
                  </p>
                </div>
                <div style={{ background: '#f8f9fa', padding: '12px', borderRadius: '8px' }}>
                  <p style={{ fontSize: '11px', color: '#7f8c8d', margin: '0 0 4px 0' }}>Annual Savings</p>
                  <p style={{ fontSize: '16px', fontWeight: '700', color: '#27ae60', margin: 0 }}>
                    ${(roi.annual_savings / 1000).toFixed(0)}K
                  </p>
                </div>
                <div style={{ background: '#f8f9fa', padding: '12px', borderRadius: '8px' }}>
                  <p style={{ fontSize: '11px', color: '#7f8c8d', margin: '0 0 4px 0' }}>Payback Period</p>
                  <p style={{ fontSize: '16px', fontWeight: '700', color: '#3498db', margin: 0 }}>
                    {roi.payback_period_months} mo
                  </p>
                </div>
                <div style={{ background: '#f8f9fa', padding: '12px', borderRadius: '8px' }}>
                  <p style={{ fontSize: '11px', color: '#7f8c8d', margin: '0 0 4px 0' }}>Year 1 ROI</p>
                  <p style={{ fontSize: '16px', fontWeight: '700', color: '#9b59b6', margin: 0 }}>
                    {roi.roi_percent_year1.toFixed(1)}%
                  </p>
                </div>
                <div style={{ background: '#f8f9fa', padding: '12px', borderRadius: '8px' }}>
                  <p style={{ fontSize: '11px', color: '#7f8c8d', margin: '0 0 4px 0' }}>3-Year ROI</p>
                  <p style={{ fontSize: '16px', fontWeight: '700', color: '#9b59b6', margin: 0 }}>
                    {roi.roi_percent_3year.toFixed(1)}%
                  </p>
                </div>
              </div>

              {roi.status === 'completed' && roi.savings_realized && (
                <div style={{ padding: '12px', background: '#d5f4e6', borderRadius: '8px', borderLeft: '4px solid #27ae60' }}>
                  <p style={{ fontSize: '11px', fontWeight: '600', color: '#0e6251', margin: '0 0 4px 0' }}>
                    💚 Savings Realized
                  </p>
                  <p style={{ fontSize: '14px', fontWeight: '700', color: '#27ae60', margin: 0 }}>
                    ${(roi.savings_realized / 1000).toFixed(1)}K
                  </p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* FORECASTING TAB */}
      {activeTab === 'forecasting' && (
        <div
          style={{
            background: '#fff',
            border: '1px solid #e0e6ed',
            borderRadius: '12px',
            padding: '20px',
          }}
        >
          <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '16px', color: '#2c3e50' }}>
            🔮 12-Month Financial Forecast
          </h3>

          <div style={{ marginBottom: '24px' }}>
            <div
              style={{
                background: '#ebf5fb',
                border: '1px solid #3498db',
                borderRadius: '8px',
                padding: '16px',
                marginBottom: '16px',
              }}
            >
              <p style={{ fontSize: '13px', color: '#1f618d', margin: '0 0 8px 0' }}>
                <strong>Insurance Premium Forecast</strong>
              </p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', fontSize: '12px' }}>
                <div>
                  <p style={{ color: '#7f8c8d', margin: '0 0 4px 0' }}>Current (Month 0)</p>
                  <p style={{ fontSize: '18px', fontWeight: '700', color: '#1f618d', margin: 0 }}>$1.46M</p>
                </div>
                <div>
                  <p style={{ color: '#7f8c8d', margin: '0 0 4px 0' }}>Projected (Month 6)</p>
                  <p style={{ fontSize: '18px', fontWeight: '700', color: '#3498db', margin: 0 }}>$1.33M</p>
                </div>
                <div>
                  <p style={{ color: '#7f8c8d', margin: '0 0 4px 0' }}>Target (Month 12)</p>
                  <p style={{ fontSize: '18px', fontWeight: '700', color: '#27ae60', margin: 0 }}>$1.22M</p>
                </div>
              </div>
              <p style={{ fontSize: '11px', color: '#1f618d', margin: '12px 0 0 0', lineHeight: '1.4' }}>
                📊 <strong>Impact:</strong> $240K annual savings if all Phase 2 findings are remediated and compliance targets met.
              </p>
            </div>

            <div
              style={{
                background: '#d5f4e6',
                border: '1px solid #27ae60',
                borderRadius: '8px',
                padding: '16px',
                marginBottom: '16px',
              }}
            >
              <p style={{ fontSize: '13px', color: '#0e6251', margin: '0 0 8px 0' }}>
                <strong>Maintenance Cost Forecast</strong>
              </p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', fontSize: '12px' }}>
                <div>
                  <p style={{ color: '#0e6251', margin: '0 0 4px 0' }}>Current Annual</p>
                  <p style={{ fontSize: '18px', fontWeight: '700', color: '#27ae60', margin: 0 }}>$125K</p>
                </div>
                <div>
                  <p style={{ color: '#0e6251', margin: '0 0 4px 0' }}>Projected (6M avg)</p>
                  <p style={{ fontSize: '18px', fontWeight: '700', color: '#27ae60', margin: 0 }}>$118K</p>
                </div>
                <div>
                  <p style={{ color: '#0e6251', margin: '0 0 4px 0' }}>Optimized (12M target)</p>
                  <p style={{ fontSize: '18px', fontWeight: '700', color: '#27ae60', margin: 0 }}>$105K</p>
                </div>
              </div>
              <p style={{ fontSize: '11px', color: '#0e6251', margin: '12px 0 0 0', lineHeight: '1.4' }}>
                ✅ <strong>Optimization:</strong> Preventive maintenance improvements reduce emergency repairs by 16%.
              </p>
            </div>

            <div
              style={{
                background: '#fdeaa8',
                border: '1px solid #f39c12',
                borderRadius: '8px',
                padding: '16px',
              }}
            >
              <p style={{ fontSize: '13px', color: '#d68910', margin: '0 0 8px 0' }}>
                <strong>Fuel Efficiency Trend</strong>
              </p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', fontSize: '12px' }}>
                <div>
                  <p style={{ color: '#d68910', margin: '0 0 4px 0' }}>Current Efficiency</p>
                  <p style={{ fontSize: '18px', fontWeight: '700', color: '#f39c12', margin: 0 }}>8.2 nm/t</p>
                </div>
                <div>
                  <p style={{ color: '#d68910', margin: '0 0 4px 0' }}>6-Month Target</p>
                  <p style={{ fontSize: '18px', fontWeight: '700', color: '#f39c12', margin: 0 }}>8.4 nm/t</p>
                </div>
                <div>
                  <p style={{ color: '#d68910', margin: '0 0 4px 0' }}>12-Month Target</p>
                  <p style={{ fontSize: '18px', fontWeight: '700', color: '#f39c12', margin: 0 }}>8.7 nm/t</p>
                </div>
              </div>
              <p style={{ fontSize: '11px', color: '#d68910', margin: '12px 0 0 0', lineHeight: '1.4' }}>
                📈 <strong>Improvement:</strong> 6% efficiency gain through hull optimization and engine tuning.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdvancedAnalyticsPanel;
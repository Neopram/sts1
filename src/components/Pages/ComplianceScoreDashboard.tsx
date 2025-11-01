import React, { useState } from 'react';
import { Button } from '../Common/Button';
import { Alert } from '../Common/Alert';

interface ComplianceMetric {
  metric_id: string;
  vessel_name: string;
  category: 'SIRE' | 'PSC' | 'VETTING' | 'CREW' | 'MAINTENANCE' | 'ENVIRONMENTAL' | 'DOCUMENTATION' | 'SAFETY';
  metric_name: string;
  current_score: number; // 0-100
  target_score: number; // 0-100
  trend: 'improving' | 'stable' | 'declining';
  trend_percent: number; // -10 to +10
  historical_scores: number[]; // Last 6 months
  last_updated: string;
  status: 'excellent' | 'good' | 'fair' | 'poor' | 'critical';
  benchmark_comparison: number; // Industry average comparison
  gap_analysis: string;
  risk_level: 'low' | 'medium' | 'high' | 'critical';
  recommendations: string[];
}

interface ComplianceOverallScore {
  vessel_id: string;
  vessel_name: string;
  overall_score: number;
  sire_component: number;
  psc_component: number;
  crew_component: number;
  maintenance_component: number;
  environmental_component: number;
  safety_component: number;
  rating: 'A' | 'B' | 'C' | 'D' | 'F';
  calculated_insurance_multiplier: number;
  compliance_trend_6m: 'improving' | 'stable' | 'declining';
}

interface ComplianceStats {
  fleet_average_score: number;
  fleet_median_score: number;
  fleet_trend: 'improving' | 'stable' | 'declining';
  vessels_exceeding_target: number;
  total_vessels: number;
  critical_gaps: number;
  high_risk_vessels: number;
  compliance_distribution: {
    excellent: number;
    good: number;
    fair: number;
    poor: number;
    critical: number;
  };
}

// Mock compliance metrics data
const MOCK_COMPLIANCE_METRICS: ComplianceMetric[] = [
  {
    metric_id: 'CMP-001',
    vessel_name: 'MV Pacific Explorer',
    category: 'SIRE',
    metric_name: 'SIRE 2.0 Overall Score',
    current_score: 88,
    target_score: 85,
    trend: 'improving',
    trend_percent: 5,
    historical_scores: [78, 80, 82, 84, 86, 88],
    last_updated: '2025-12-15',
    status: 'good',
    benchmark_comparison: 85,
    gap_analysis: '3 points above fleet average',
    risk_level: 'low',
    recommendations: ['Maintain current training schedule', 'Continue preventive maintenance'],
  },
  {
    metric_id: 'CMP-002',
    vessel_name: 'MV Atlantic Storm',
    category: 'SIRE',
    metric_name: 'SIRE 2.0 Overall Score',
    current_score: 72,
    target_score: 85,
    trend: 'declining',
    trend_percent: -8,
    historical_scores: [85, 82, 78, 75, 73, 72],
    last_updated: '2025-12-14',
    status: 'poor',
    benchmark_comparison: 85,
    gap_analysis: '13 points below target',
    risk_level: 'high',
    recommendations: ['Urgent: Schedule comprehensive inspection', 'Increase crew training frequency', 'Review maintenance compliance'],
  },
  {
    metric_id: 'CMP-003',
    vessel_name: 'MV Indian Ocean',
    category: 'PSC',
    metric_name: 'Port State Control Compliance',
    current_score: 92,
    target_score: 90,
    trend: 'stable',
    trend_percent: 0,
    historical_scores: [90, 91, 92, 92, 92, 92],
    last_updated: '2025-12-16',
    status: 'excellent',
    benchmark_comparison: 88,
    gap_analysis: '4 points above fleet average',
    risk_level: 'low',
    recommendations: ['Maintain current compliance level'],
  },
  {
    metric_id: 'CMP-004',
    vessel_name: 'MV Cargo Master',
    category: 'CREW',
    metric_name: 'Crew Competency Score',
    current_score: 82,
    target_score: 88,
    trend: 'improving',
    trend_percent: 6,
    historical_scores: [72, 74, 76, 79, 81, 82],
    last_updated: '2025-12-13',
    status: 'good',
    benchmark_comparison: 80,
    gap_analysis: '2 points above fleet average',
    risk_level: 'medium',
    recommendations: ['Schedule advanced STCW training', 'Increase bridge simulator practice'],
  },
  {
    metric_id: 'CMP-005',
    vessel_name: 'MV Ocean Runner',
    category: 'MAINTENANCE',
    metric_name: 'Preventive Maintenance Compliance',
    current_score: 76,
    target_score: 90,
    trend: 'declining',
    trend_percent: -12,
    historical_scores: [92, 88, 84, 80, 78, 76],
    last_updated: '2025-12-10',
    status: 'fair',
    benchmark_comparison: 83,
    gap_analysis: '7 points below fleet average',
    risk_level: 'high',
    recommendations: ['Implement maintenance catch-up plan', 'Schedule 3 critical maintenance items', 'Review maintenance scheduling'],
  },
  {
    metric_id: 'CMP-006',
    vessel_name: 'MV Pacific Explorer',
    category: 'ENVIRONMENTAL',
    metric_name: 'Environmental Compliance',
    current_score: 94,
    target_score: 90,
    trend: 'improving',
    trend_percent: 3,
    historical_scores: [88, 89, 91, 93, 93, 94],
    last_updated: '2025-12-15',
    status: 'excellent',
    benchmark_comparison: 86,
    gap_analysis: '8 points above fleet average',
    risk_level: 'low',
    recommendations: ['Maintain ISO 14001 certification', 'Continue green shipping initiatives'],
  },
  {
    metric_id: 'CMP-007',
    vessel_name: 'MV Atlantic Storm',
    category: 'SAFETY',
    metric_name: 'Safety Management Score',
    current_score: 65,
    target_score: 85,
    trend: 'declining',
    trend_percent: -15,
    historical_scores: [88, 82, 77, 71, 68, 65],
    last_updated: '2025-12-14',
    status: 'critical',
    benchmark_comparison: 85,
    gap_analysis: '20 points below target',
    risk_level: 'critical',
    recommendations: ['URGENT: Safety management system review', 'Mandatory crew safety retraining', 'Independent third-party assessment'],
  },
  {
    metric_id: 'CMP-008',
    vessel_name: 'MV Indian Ocean',
    category: 'DOCUMENTATION',
    metric_name: 'Documentation Completeness',
    current_score: 96,
    target_score: 95,
    trend: 'stable',
    trend_percent: 1,
    historical_scores: [95, 95, 95, 96, 96, 96],
    last_updated: '2025-12-16',
    status: 'excellent',
    benchmark_comparison: 92,
    gap_analysis: '4 points above fleet average',
    risk_level: 'low',
    recommendations: ['Maintain documentation standards'],
  },
];

const MOCK_OVERALL_SCORES: ComplianceOverallScore[] = [
  {
    vessel_id: 'VES-001',
    vessel_name: 'MV Pacific Explorer',
    overall_score: 89,
    sire_component: 88,
    psc_component: 89,
    crew_component: 85,
    maintenance_component: 87,
    environmental_component: 94,
    safety_component: 92,
    rating: 'A',
    calculated_insurance_multiplier: 1.0,
    compliance_trend_6m: 'improving',
  },
  {
    vessel_id: 'VES-002',
    vessel_name: 'MV Atlantic Storm',
    overall_score: 71,
    sire_component: 72,
    psc_component: 68,
    crew_component: 74,
    maintenance_component: 70,
    environmental_component: 75,
    safety_component: 65,
    rating: 'D',
    calculated_insurance_multiplier: 1.5,
    compliance_trend_6m: 'declining',
  },
  {
    vessel_id: 'VES-003',
    vessel_name: 'MV Indian Ocean',
    overall_score: 91,
    sire_component: 85,
    psc_component: 92,
    crew_component: 88,
    maintenance_component: 90,
    environmental_component: 95,
    safety_component: 93,
    rating: 'A',
    calculated_insurance_multiplier: 0.95,
    compliance_trend_6m: 'stable',
  },
  {
    vessel_id: 'VES-004',
    vessel_name: 'MV Cargo Master',
    overall_score: 83,
    sire_component: 82,
    psc_component: 84,
    crew_component: 82,
    maintenance_component: 83,
    environmental_component: 85,
    safety_component: 84,
    rating: 'B',
    calculated_insurance_multiplier: 1.15,
    compliance_trend_6m: 'improving',
  },
  {
    vessel_id: 'VES-005',
    vessel_name: 'MV Ocean Runner',
    overall_score: 78,
    sire_component: 80,
    psc_component: 77,
    crew_component: 76,
    maintenance_component: 76,
    environmental_component: 82,
    safety_component: 80,
    rating: 'C',
    calculated_insurance_multiplier: 1.25,
    compliance_trend_6m: 'declining',
  },
];

const calculateStats = (metrics: ComplianceMetric[], scores: ComplianceOverallScore[]): ComplianceStats => {
  const avg = scores.reduce((sum, s) => sum + s.overall_score, 0) / (scores.length || 1);
  const sorted = [...scores].sort((a, b) => a.overall_score - b.overall_score);
  const median = sorted[Math.floor(sorted.length / 2)].overall_score;

  const distribution = {
    excellent: scores.filter(s => s.rating === 'A').length,
    good: scores.filter(s => s.rating === 'B').length,
    fair: scores.filter(s => s.rating === 'C').length,
    poor: scores.filter(s => s.rating === 'D').length,
    critical: scores.filter(s => s.rating === 'F').length,
  };

  return {
    fleet_average_score: avg,
    fleet_median_score: median,
    fleet_trend: avg >= 85 ? 'improving' : avg < 70 ? 'declining' : 'stable',
    vessels_exceeding_target: scores.filter(s => s.overall_score >= 85).length,
    total_vessels: scores.length,
    critical_gaps: metrics.filter(m => m.status === 'critical').length,
    high_risk_vessels: scores.filter(s => s.rating === 'D' || s.rating === 'F').length,
    compliance_distribution: distribution,
  };
};

const getScoreColor = (score: number): string => {
  if (score >= 90) return '#27ae60';
  if (score >= 80) return '#3498db';
  if (score >= 70) return '#f39c12';
  if (score >= 60) return '#e74c3c';
  return '#c0392b';
};

const getRatingColor = (rating: string): string => {
  switch (rating) {
    case 'A':
      return '#27ae60';
    case 'B':
      return '#3498db';
    case 'C':
      return '#f39c12';
    case 'D':
      return '#e74c3c';
    case 'F':
      return '#c0392b';
    default:
      return '#95a5a6';
  }
};

export const ComplianceScoreDashboard: React.FC = () => {
  const metrics = MOCK_COMPLIANCE_METRICS;
  const scores = MOCK_OVERALL_SCORES;
  const stats = calculateStats(metrics, scores);

  const [selectedVessel, setSelectedVessel] = useState<string | null>(null);
  const [filterCategory, setFilterCategory] = useState<string>('all');

  const filteredMetrics = filterCategory === 'all' ? metrics : metrics.filter(m => m.category === filterCategory);
  const selectedVesselData = selectedVessel
    ? scores.find(s => s.vessel_name === selectedVessel)
    : null;

  const categories: string[] = ['SIRE', 'PSC', 'VETTING', 'CREW', 'MAINTENANCE', 'ENVIRONMENTAL', 'DOCUMENTATION', 'SAFETY'];

  return (
    <div style={{ padding: '20px 0' }}>
      {/* Header */}
      <div style={{ marginBottom: '24px' }}>
        <h2 style={{ fontSize: '24px', fontWeight: '700', color: '#2c3e50', margin: '0 0 8px 0' }}>
          📊 Compliance Score Dashboard
        </h2>
        <p style={{ color: '#7f8c8d', fontSize: '14px', margin: 0 }}>
          Track vessel compliance metrics, trends, benchmarking, and regulatory alignment
        </p>
      </div>

      {/* Fleet Overview Stats */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '16px',
          marginBottom: '24px',
        }}
      >
        <div style={{ background: '#fff', border: '1px solid #e0e6ed', borderRadius: '12px', padding: '16px' }}>
          <p style={{ fontSize: '12px', color: '#7f8c8d', margin: '0 0 8px 0' }}>Fleet Average Score</p>
          <p style={{ fontSize: '32px', fontWeight: '700', color: getScoreColor(stats.fleet_average_score), margin: 0 }}>
            {stats.fleet_average_score.toFixed(1)}
          </p>
          <p style={{ fontSize: '11px', color: '#7f8c8d', margin: '4px 0 0 0' }}>Out of 100</p>
        </div>

        <div style={{ background: '#fff', border: '1px solid #e0e6ed', borderRadius: '12px', padding: '16px' }}>
          <p style={{ fontSize: '12px', color: '#7f8c8d', margin: '0 0 8px 0' }}>Fleet Median</p>
          <p style={{ fontSize: '32px', fontWeight: '700', color: '#3498db', margin: 0 }}>
            {stats.fleet_median_score.toFixed(1)}
          </p>
          <p style={{ fontSize: '11px', color: '#7f8c8d', margin: '4px 0 0 0' }}>Central tendency</p>
        </div>

        <div style={{ background: '#d5f4e6', borderRadius: '12px', padding: '16px', border: '1px solid #27ae60' }}>
          <p style={{ fontSize: '12px', color: '#0e6251', margin: '0 0 8px 0', fontWeight: '600' }}>
            ✅ On Target
          </p>
          <p style={{ fontSize: '32px', fontWeight: '700', color: '#27ae60', margin: 0 }}>
            {stats.vessels_exceeding_target}/{stats.total_vessels}
          </p>
          <p style={{ fontSize: '11px', color: '#0e6251', margin: '4px 0 0 0' }}>
            Vessels exceeding 85 target
          </p>
        </div>

        <div style={{ background: '#fadbd8', borderRadius: '12px', padding: '16px', border: '1px solid #e74c3c' }}>
          <p style={{ fontSize: '12px', color: '#c0392b', margin: '0 0 8px 0', fontWeight: '600' }}>
            ⚠️ At Risk
          </p>
          <p style={{ fontSize: '32px', fontWeight: '700', color: '#e74c3c', margin: 0 }}>
            {stats.high_risk_vessels}
          </p>
          <p style={{ fontSize: '11px', color: '#c0392b', margin: '4px 0 0 0' }}>
            Vessels rated D or F
          </p>
        </div>

        <div style={{ background: '#fdeaa8', borderRadius: '12px', padding: '16px', border: '1px solid #f39c12' }}>
          <p style={{ fontSize: '12px', color: '#d68910', margin: '0 0 8px 0', fontWeight: '600' }}>
            🔴 Critical Gaps
          </p>
          <p style={{ fontSize: '32px', fontWeight: '700', color: '#f39c12', margin: 0 }}>
            {stats.critical_gaps}
          </p>
          <p style={{ fontSize: '11px', color: '#d68910', margin: '4px 0 0 0' }}>
            Metrics below threshold
          </p>
        </div>

        <div style={{ background: '#fff', border: '1px solid #e0e6ed', borderRadius: '12px', padding: '16px' }}>
          <p style={{ fontSize: '12px', color: '#7f8c8d', margin: '0 0 8px 0' }}>Fleet Trend</p>
          <p
            style={{
              fontSize: '20px',
              fontWeight: '700',
              color: stats.fleet_trend === 'improving' ? '#27ae60' : stats.fleet_trend === 'declining' ? '#e74c3c' : '#3498db',
              margin: 0,
            }}
          >
            {stats.fleet_trend === 'improving' ? '📈' : stats.fleet_trend === 'declining' ? '📉' : '➡️'}{' '}
            {stats.fleet_trend.toUpperCase()}
          </p>
        </div>
      </div>

      {/* Compliance Distribution */}
      <div
        style={{
          background: '#fff',
          border: '1px solid #e0e6ed',
          borderRadius: '12px',
          padding: '20px',
          marginBottom: '24px',
        }}
      >
        <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '16px', color: '#2c3e50' }}>
          📊 Fleet Rating Distribution
        </h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '12px' }}>
          {[
            { rating: 'A', count: stats.compliance_distribution.excellent, color: '#27ae60', desc: 'Excellent' },
            { rating: 'B', count: stats.compliance_distribution.good, color: '#3498db', desc: 'Good' },
            { rating: 'C', count: stats.compliance_distribution.fair, color: '#f39c12', desc: 'Fair' },
            { rating: 'D', count: stats.compliance_distribution.poor, color: '#e74c3c', desc: 'Poor' },
            { rating: 'F', count: stats.compliance_distribution.critical, color: '#c0392b', desc: 'Critical' },
          ].map((item) => (
            <div
              key={item.rating}
              style={{
                background: item.color + '20',
                border: `2px solid ${item.color}`,
                borderRadius: '8px',
                padding: '12px',
                textAlign: 'center',
              }}
            >
              <p style={{ fontSize: '24px', fontWeight: '700', color: item.color, margin: '0 0 4px 0' }}>
                {item.rating}
              </p>
              <p style={{ fontSize: '18px', fontWeight: '600', color: item.color, margin: '0 0 4px 0' }}>
                {item.count}
              </p>
              <p style={{ fontSize: '11px', color: '#7f8c8d', margin: 0 }}>{item.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Vessel Overall Scores */}
      <div
        style={{
          background: '#fff',
          border: '1px solid #e0e6ed',
          borderRadius: '12px',
          padding: '20px',
          marginBottom: '24px',
        }}
      >
        <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '16px', color: '#2c3e50' }}>
          🚢 Vessel Overall Compliance Scores
        </h3>
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
                <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600', color: '#2c3e50' }}>Vessel</th>
                <th style={{ padding: '12px', textAlign: 'center', fontWeight: '600', color: '#2c3e50' }}>Score</th>
                <th style={{ padding: '12px', textAlign: 'center', fontWeight: '600', color: '#2c3e50' }}>Rating</th>
                <th style={{ padding: '12px', textAlign: 'center', fontWeight: '600', color: '#2c3e50' }}>Trend</th>
                <th style={{ padding: '12px', textAlign: 'center', fontWeight: '600', color: '#2c3e50' }}>Insurance Multiplier</th>
              </tr>
            </thead>
            <tbody>
              {scores.map((score, idx) => (
                <tr
                  key={score.vessel_id}
                  onClick={() => setSelectedVessel(score.vessel_name)}
                  style={{
                    borderBottom: '1px solid #e0e6ed',
                    background: selectedVessel === score.vessel_name ? '#ebf5fb' : idx % 2 === 0 ? '#fff' : '#f8f9fa',
                    cursor: 'pointer',
                    transition: 'background 0.2s',
                  }}
                >
                  <td style={{ padding: '12px', fontWeight: '600', color: '#2c3e50' }}>
                    {score.vessel_name}
                  </td>
                  <td style={{ padding: '12px', textAlign: 'center' }}>
                    <span
                      style={{
                        fontSize: '16px',
                        fontWeight: '700',
                        color: getScoreColor(score.overall_score),
                      }}
                    >
                      {score.overall_score}
                    </span>
                  </td>
                  <td style={{ padding: '12px', textAlign: 'center' }}>
                    <span
                      style={{
                        display: 'inline-block',
                        fontSize: '14px',
                        fontWeight: '700',
                        width: '30px',
                        height: '30px',
                        lineHeight: '30px',
                        borderRadius: '50%',
                        background: getRatingColor(score.rating) + '20',
                        color: getRatingColor(score.rating),
                      }}
                    >
                      {score.rating}
                    </span>
                  </td>
                  <td style={{ padding: '12px', textAlign: 'center' }}>
                    <span
                      style={{
                        color: score.compliance_trend_6m === 'improving' ? '#27ae60' : score.compliance_trend_6m === 'declining' ? '#e74c3c' : '#3498db',
                      }}
                    >
                      {score.compliance_trend_6m === 'improving' ? '📈' : score.compliance_trend_6m === 'declining' ? '📉' : '➡️'}
                    </span>
                  </td>
                  <td
                    style={{
                      padding: '12px',
                      textAlign: 'center',
                      fontWeight: '600',
                      color: score.calculated_insurance_multiplier <= 1.0 ? '#27ae60' : '#e74c3c',
                    }}
                  >
                    {score.calculated_insurance_multiplier.toFixed(2)}x
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Selected Vessel Detailed View */}
      {selectedVesselData && (
        <div
          style={{
            background: '#fff',
            border: '2px solid #3498db',
            borderRadius: '12px',
            padding: '20px',
            marginBottom: '24px',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h3 style={{ fontSize: '18px', fontWeight: '600', color: '#2c3e50', margin: 0 }}>
              📋 {selectedVesselData.vessel_name} - Component Breakdown
            </h3>
            <button
              onClick={() => setSelectedVessel(null)}
              style={{
                background: '#ecf0f1',
                border: 'none',
                padding: '6px 12px',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '12px',
                fontWeight: '600',
                color: '#7f8c8d',
              }}
            >
              ✕ Close
            </button>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
              gap: '12px',
            }}
          >
            {[
              { name: 'SIRE', score: selectedVesselData.sire_component },
              { name: 'PSC', score: selectedVesselData.psc_component },
              { name: 'Crew', score: selectedVesselData.crew_component },
              { name: 'Maintenance', score: selectedVesselData.maintenance_component },
              { name: 'Environmental', score: selectedVesselData.environmental_component },
              { name: 'Safety', score: selectedVesselData.safety_component },
            ].map((comp) => (
              <div
                key={comp.name}
                style={{
                  background: '#f8f9fa',
                  borderRadius: '8px',
                  padding: '12px',
                  border: `2px solid ${getScoreColor(comp.score)}`,
                }}
              >
                <p style={{ fontSize: '12px', color: '#7f8c8d', margin: '0 0 8px 0' }}>{comp.name}</p>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                  <span style={{ fontSize: '24px', fontWeight: '700', color: getScoreColor(comp.score) }}>
                    {comp.score}
                  </span>
                  <span style={{ fontSize: '12px', color: '#95a5a6' }}>/100</span>
                </div>
                <div style={{ marginTop: '8px', background: '#ecf0f1', borderRadius: '4px', height: '4px', overflow: 'hidden' }}>
                  <div
                    style={{
                      height: '100%',
                      width: `${comp.score}%`,
                      background: getScoreColor(comp.score),
                    }}
                  />
                </div>
              </div>
            ))}
          </div>

          <div
            style={{
              marginTop: '16px',
              padding: '12px',
              background: '#ebf5fb',
              borderRadius: '8px',
              borderLeft: `4px solid #3498db`,
            }}
          >
            <p style={{ fontSize: '12px', color: '#1f618d', margin: '0 0 8px 0', fontWeight: '600' }}>
              Insurance Impact Calculator
            </p>
            <p style={{ fontSize: '13px', color: '#34495e', margin: 0 }}>
              Current overall score of <strong>{selectedVesselData.overall_score}</strong> results in an insurance multiplier of{' '}
              <strong style={{ color: selectedVesselData.calculated_insurance_multiplier <= 1.0 ? '#27ae60' : '#e74c3c' }}>
                {selectedVesselData.calculated_insurance_multiplier.toFixed(2)}x
              </strong>{' '}
              of baseline premium.
            </p>
          </div>
        </div>
      )}

      {/* Metric Details */}
      <div
        style={{
          background: '#fff',
          border: '1px solid #e0e6ed',
          borderRadius: '12px',
          padding: '20px',
        }}
      >
        <div style={{ marginBottom: '16px' }}>
          <label style={{ fontSize: '12px', fontWeight: '600', color: '#2c3e50', display: 'block', marginBottom: '8px' }}>
            Filter by Category
          </label>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {['all', ...categories].map((cat) => (
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
                {cat === 'all' ? 'All Categories' : cat}
              </button>
            ))}
          </div>
        </div>

        <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '16px', color: '#2c3e50' }}>
          📈 Compliance Metrics Details
        </h3>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {filteredMetrics.map((metric) => (
            <div
              key={metric.metric_id}
              style={{
                border: `2px solid ${getScoreColor(metric.current_score)}`,
                borderRadius: '8px',
                padding: '12px',
                background: getScoreColor(metric.current_score) + '05',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '8px' }}>
                <div>
                  <p style={{ fontSize: '13px', fontWeight: '600', color: '#2c3e50', margin: '0 0 4px 0' }}>
                    {metric.metric_name}
                  </p>
                  <p style={{ fontSize: '11px', color: '#7f8c8d', margin: 0 }}>
                    {metric.vessel_name} • {metric.category}
                  </p>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <p
                    style={{
                      fontSize: '16px',
                      fontWeight: '700',
                      color: getScoreColor(metric.current_score),
                      margin: 0,
                    }}
                  >
                    {metric.current_score}
                  </p>
                  <p style={{ fontSize: '11px', color: '#7f8c8d', margin: '2px 0 0 0' }}>
                    Target: {metric.target_score}
                  </p>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '12px', fontSize: '11px', marginBottom: '8px' }}>
                <span
                  style={{
                    padding: '2px 6px',
                    borderRadius: '4px',
                    background: metric.status === 'critical' ? '#fadbd8' : metric.status === 'poor' ? '#fdeaa8' : '#d5f4e6',
                    color: metric.status === 'critical' ? '#c0392b' : metric.status === 'poor' ? '#d68910' : '#0e6251',
                    fontWeight: '600',
                  }}
                >
                  {metric.status.toUpperCase()}
                </span>
                <span
                  style={{
                    padding: '2px 6px',
                    borderRadius: '4px',
                    background: metric.trend === 'improving' ? '#d5f4e6' : metric.trend === 'declining' ? '#fadbd8' : '#ecf0f1',
                    color: metric.trend === 'improving' ? '#0e6251' : metric.trend === 'declining' ? '#c0392b' : '#34495e',
                    fontWeight: '600',
                  }}
                >
                  {metric.trend === 'improving' ? '📈' : metric.trend === 'declining' ? '📉' : '➡️'} {Math.abs(metric.trend_percent)}%
                </span>
              </div>

              {metric.recommendations.length > 0 && (
                <div style={{ fontSize: '11px', color: '#34495e', marginTop: '8px' }}>
                  <strong>Recommendations:</strong>
                  <ul style={{ margin: '4px 0 0 0', paddingLeft: '16px' }}>
                    {metric.recommendations.slice(0, 2).map((rec, idx) => (
                      <li key={idx} style={{ margin: '2px 0' }}>
                        {rec}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default ComplianceScoreDashboard;
import React, { useState } from 'react';
import { Button } from '../Common/Button';
import { Alert } from '../Common/Alert';

interface InsuranceData {
  average_sire_score: number;
  insurance_impact: string;
  estimated_premium_multiplier: number;
  recommendation: string;
}

interface VesselInsurance {
  vessel_name: string;
  sire_score: number;
  status: string;
  estimated_premium_impact: number;
  improvement_potential: number;
  key_issues: string[];
}

interface InsuranceAnalyticsPanelProps {
  insurance?: InsuranceData;
  vessels?: VesselInsurance[];
  isLoading?: boolean;
}

// Mock data
const MOCK_VESSELS_INSURANCE: VesselInsurance[] = [
  {
    vessel_name: 'MV Pacific Explorer',
    sire_score: 88,
    status: 'warning',
    estimated_premium_impact: 1.12,
    improvement_potential: 0.08,
    key_issues: ['Minor paint deterioration', 'Training schedule update needed'],
  },
  {
    vessel_name: 'MV Atlantic Storm',
    sire_score: 92,
    status: 'good',
    estimated_premium_impact: 1.05,
    improvement_potential: 0.02,
    key_issues: ['None - Excellent compliance'],
  },
  {
    vessel_name: 'MV Indian Ocean',
    sire_score: 75,
    status: 'critical',
    estimated_premium_impact: 1.45,
    improvement_potential: 0.35,
    key_issues: ['Safety equipment overdue', 'Crew certification gaps', 'Maintenance records incomplete'],
  },
];

const BASELINE_ANNUAL_PREMIUM = 391300; // USD per vessel per year (estimated)

const calculateEstimatedPremium = (multiplier: number): number => {
  return Math.round(BASELINE_ANNUAL_PREMIUM * multiplier);
};

const getSIREStatusColor = (score: number): string => {
  if (score >= 90) return 'text-green-600 bg-green-50';
  if (score >= 80) return 'text-yellow-600 bg-yellow-50';
  return 'text-red-600 bg-red-50';
};

const getSIREStatusLabel = (score: number): string => {
  if (score >= 90) return '✅ GOOD';
  if (score >= 80) return '⚠️ WARNING';
  return '🔴 CRITICAL';
};

export const InsuranceAnalyticsPanel: React.FC<InsuranceAnalyticsPanelProps> = ({
  insurance = {
    average_sire_score: 85,
    insurance_impact: 'moderate',
    estimated_premium_multiplier: 1.15,
    recommendation: 'Remediate critical findings on Indian Ocean to reduce premium impact',
  },
  vessels = MOCK_VESSELS_INSURANCE,
  isLoading = false,
}) => {
  const [expandedVessel, setExpandedVessel] = useState<string | null>(null);
  const [showDetailedAnalysis, setShowDetailedAnalysis] = useState(false);

  const totalAnnualPremium = vessels.reduce(
    (sum, v) => sum + calculateEstimatedPremium(v.estimated_premium_impact),
    0
  );

  const potentialSavings = vessels.reduce(
    (sum, v) => sum + (BASELINE_ANNUAL_PREMIUM * v.improvement_potential),
    0
  );

  const averageMultiplier = vessels.length > 0
    ? vessels.reduce((sum, v) => sum + v.estimated_premium_impact, 0) / vessels.length
    : insurance.estimated_premium_multiplier;

  return (
    <div className="space-y-6">
      {/* Executive Summary Cards */}
      <div className="grid grid-cols-4 gap-4">
        {/* Average SIRE Score */}
        <div className={`rounded-lg p-4 border-2 ${getSIREStatusColor(insurance.average_sire_score)}`}>
          <p className="text-sm opacity-75">Average SIRE Score</p>
          <p className="text-3xl font-bold">{insurance.average_sire_score}/100</p>
          <p className="text-xs mt-1">{getSIREStatusLabel(insurance.average_sire_score)}</p>
        </div>

        {/* Insurance Impact */}
        <div className="bg-blue-50 rounded-lg p-4 border-2 border-blue-200">
          <p className="text-sm text-gray-600">Insurance Impact</p>
          <p className="text-2xl font-bold text-blue-600 capitalize">{insurance.insurance_impact}</p>
          <p className="text-xs text-gray-500 mt-1">Current Status</p>
        </div>

        {/* Premium Multiplier */}
        <div className="bg-purple-50 rounded-lg p-4 border-2 border-purple-200">
          <p className="text-sm text-gray-600">Premium Multiplier</p>
          <p className="text-3xl font-bold text-purple-600">{(averageMultiplier * 100).toFixed(0)}%</p>
          <p className="text-xs text-gray-500 mt-1">vs. Baseline (100%)</p>
        </div>

        {/* Potential Savings */}
        <div className="bg-green-50 rounded-lg p-4 border-2 border-green-200">
          <p className="text-sm text-gray-600">Potential Annual Savings</p>
          <p className="text-2xl font-bold text-green-600">${(potentialSavings / 1000).toFixed(0)}K</p>
          <p className="text-xs text-gray-500 mt-1">If fully compliant</p>
        </div>
      </div>

      {/* Key Recommendation */}
      <Alert
        variant="info"
        title="💡 Optimization Recommendation"
        message={insurance.recommendation}
      />

      {/* Financial Summary */}
      <div className="bg-gradient-to-r from-slate-700 to-slate-900 text-white rounded-lg p-6">
        <h3 className="text-lg font-semibold mb-4">💰 Insurance Financial Impact Analysis</h3>

        <div className="grid grid-cols-3 gap-6 mb-6">
          <div>
            <p className="text-sm opacity-80">Current Annual Premium (Estimated)</p>
            <p className="text-3xl font-bold">${(totalAnnualPremium / 1000).toFixed(1)}K</p>
            <p className="text-xs opacity-70 mt-1">{vessels.length} vessel(s)</p>
          </div>

          <div>
            <p className="text-sm opacity-80">Baseline Annual Premium</p>
            <p className="text-3xl font-bold">${(BASELINE_ANNUAL_PREMIUM * vessels.length / 1000).toFixed(1)}K</p>
            <p className="text-xs opacity-70 mt-1">100% Compliance</p>
          </div>

          <div>
            <p className="text-sm opacity-80">Extra Cost</p>
            <p className="text-3xl font-bold text-red-400">
              ${((totalAnnualPremium - BASELINE_ANNUAL_PREMIUM * vessels.length) / 1000).toFixed(1)}K
            </p>
            <p className="text-xs opacity-70 mt-1">Above baseline</p>
          </div>
        </div>

        <div className="bg-white bg-opacity-10 rounded p-3 text-sm">
          <p>
            By improving compliance scores fleet-wide, you can potentially save{' '}
            <strong>${(potentialSavings / 1000).toFixed(0)}K annually</strong> on insurance premiums.
          </p>
        </div>
      </div>

      {/* Vessel-by-Vessel Breakdown */}
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-semibold">🚢 Vessel-by-Vessel Insurance Analysis</h3>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setShowDetailedAnalysis(!showDetailedAnalysis)}
          >
            {showDetailedAnalysis ? 'Collapse All' : 'Expand All'}
          </Button>
        </div>

        {vessels.map((vessel) => {
          const currentPremium = calculateEstimatedPremium(vessel.estimated_premium_impact);
          const baselinePremium = BASELINE_ANNUAL_PREMIUM;
          const extraCost = currentPremium - baselinePremium;
          const potentialSaving = BASELINE_ANNUAL_PREMIUM * vessel.improvement_potential;
          const isExpanded = expandedVessel === vessel.vessel_name;

          return (
            <div
              key={vessel.vessel_name}
              className="border rounded-lg overflow-hidden hover:shadow-md transition"
            >
              {/* Header */}
              <div
                className="bg-gradient-to-r from-gray-50 to-gray-100 p-4 cursor-pointer hover:from-gray-100 hover:to-gray-200"
                onClick={() => setExpandedVessel(isExpanded ? null : vessel.vessel_name)}
              >
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-3 flex-1">
                    <span className={`px-3 py-1 rounded-full text-sm font-semibold ${getSIREStatusColor(vessel.sire_score)}`}>
                      SIRE {vessel.sire_score}
                    </span>
                    <h4 className="font-semibold text-gray-900">{vessel.vessel_name}</h4>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="text-xs text-gray-500">Est. Annual Premium</p>
                      <p className="text-lg font-bold text-gray-900">${(currentPremium / 1000).toFixed(1)}K</p>
                    </div>
                    <span className="text-gray-400">{isExpanded ? '▼' : '▶'}</span>
                  </div>
                </div>
              </div>

              {/* Expanded Details */}
              {isExpanded && (
                <div className="bg-white p-4 border-t border-gray-200 space-y-4">
                  {/* Premium Comparison */}
                  <div className="grid grid-cols-3 gap-4">
                    <div className="bg-blue-50 rounded p-3">
                      <p className="text-xs text-gray-600">Current Multiplier</p>
                      <p className="text-2xl font-bold text-blue-600">
                        {(vessel.estimated_premium_impact * 100).toFixed(0)}%
                      </p>
                    </div>
                    <div className="bg-green-50 rounded p-3">
                      <p className="text-xs text-gray-600">Potential Multiplier</p>
                      <p className="text-2xl font-bold text-green-600">
                        {(Math.max(1.0, vessel.estimated_premium_impact - vessel.improvement_potential) * 100).toFixed(0)}%
                      </p>
                    </div>
                    <div className="bg-purple-50 rounded p-3">
                      <p className="text-xs text-gray-600">Potential Annual Saving</p>
                      <p className="text-2xl font-bold text-purple-600">
                        ${(potentialSaving / 1000).toFixed(1)}K
                      </p>
                    </div>
                  </div>

                  {/* Premium Breakdown */}
                  <div className="bg-gray-50 rounded p-3 space-y-2">
                    <p className="font-semibold text-sm">Premium Breakdown</p>
                    <div className="space-y-1 text-sm">
                      <div className="flex justify-between">
                        <span>Baseline Premium (100% compliance):</span>
                        <span className="font-semibold">${(baselinePremium / 1000).toFixed(1)}K</span>
                      </div>
                      <div className="flex justify-between text-red-600">
                        <span>Compliance Penalty ({((vessel.estimated_premium_impact - 1) * 100).toFixed(0)}%):</span>
                        <span className="font-semibold">${(extraCost / 1000).toFixed(1)}K</span>
                      </div>
                      <div className="border-t pt-1 flex justify-between font-bold">
                        <span>Current Annual Premium:</span>
                        <span className="text-lg">${(currentPremium / 1000).toFixed(1)}K</span>
                      </div>
                    </div>
                  </div>

                  {/* Key Issues */}
                  <div className="space-y-2">
                    <p className="font-semibold text-sm">
                      {vessel.status === 'critical' ? '🔴 Critical Issues' : vessel.status === 'warning' ? '⚠️ Issues to Address' : '✅ No Issues'}
                    </p>
                    <ul className="space-y-1 text-sm">
                      {vessel.key_issues.map((issue, idx) => (
                        <li key={idx} className="flex items-start gap-2">
                          <span className="text-gray-400">•</span>
                          <span>{issue}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* ROI Calculator */}
                  <div className="bg-gradient-to-r from-indigo-50 to-blue-50 rounded p-3 border border-indigo-200">
                    <p className="font-semibold text-sm mb-2">💡 ROI on Remediation</p>
                    <p className="text-xs text-gray-700">
                      By addressing {vessel.key_issues.length} issue(s), you can improve SIRE score to ~95 and save approximately{' '}
                      <span className="font-bold text-green-600">${(potentialSaving / 1000).toFixed(1)}K annually</span> on insurance premiums.
                    </p>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-2 pt-2">
                    <Button size="sm" variant="outline" className="flex-1">
                      📊 View Detailed Report
                    </Button>
                    <Button size="sm" variant="outline" className="flex-1">
                      🔧 View Remediation Steps
                    </Button>
                    <Button size="sm" variant="outline" className="flex-1">
                      📧 Share with Broker
                    </Button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Export & Actions */}
      <div className="flex gap-2 flex-wrap">
        <Button variant="outline" size="sm">
          📥 Download Insurance Analysis (PDF)
        </Button>
        <Button variant="outline" size="sm">
          📊 Export Vessel Insurance Data (Excel)
        </Button>
        <Button variant="outline" size="sm">
          📧 Share with Insurance Broker
        </Button>
        <Button variant="outline" size="sm">
          📋 Generate Compliance Certificate
        </Button>
        <Button variant="outline" size="sm">
          💬 Request Insurance Quote
        </Button>
      </div>
    </div>
  );
};
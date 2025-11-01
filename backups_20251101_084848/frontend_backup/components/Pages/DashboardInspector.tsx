/**
 * Inspector Dashboard
 * ==================
 * Specialized dashboard for SIRE/Port State Control inspectors.
 * Shows findings, compliance assessments, and recommendations.
 */

import React, { useState, useEffect } from 'react'
import { AlertCircle, CheckCircle, AlertTriangle, Eye, FileText, TrendingUp } from 'lucide-react'
import { dashboardApi } from '../../services/dashboardApi'
import { Card, Badge, Alert, Loading } from '../Common'
import { useNotification } from '../../hooks/useNotification'

interface Finding {
  id: string
  type: 'critical' | 'major' | 'minor'
  vessel: string
  date: string
  description: string
  status: 'open' | 'closed' | 'pending'
}

interface ComplianceItem {
  category: string
  score: number
  status: 'compliant' | 'non-compliant' | 'pending'
  lastAudit: string
}

interface Recommendation {
  id: string
  priority: 'high' | 'medium' | 'low'
  title: string
  description: string
  dueDate: string
  assignedTo: string
}

export const DashboardInspector: React.FC = () => {
  const [loading, setLoading] = useState(true)
  const [overview, setOverview] = useState<any>(null)
  const [findings, setFindings] = useState<Finding[]>([])
  const [compliance, setCompliance] = useState<ComplianceItem[]>([])
  const [recommendations, setRecommendations] = useState<Recommendation[]>([])
  const [activeTab, setActiveTab] = useState<'overview' | 'findings' | 'compliance' | 'recommendations'>('overview')
  const { showNotification } = useNotification()

  useEffect(() => {
    loadDashboardData()
  }, [activeTab])

  const loadDashboardData = async () => {
    try {
      setLoading(true)

      switch (activeTab) {
        case 'overview':
          const overviewData = await dashboardApi.inspector.getOverview()
          setOverview(overviewData.data)
          break

        case 'findings':
          const findingsData = await dashboardApi.inspector.getFindings()
          setFindings(findingsData.data.findings || [])
          break

        case 'compliance':
          const complianceData = await dashboardApi.inspector.getCompliance()
          setCompliance(complianceData.data.items || [])
          break

        case 'recommendations':
          const recommendationsData = await dashboardApi.inspector.getRecommendations()
          setRecommendations(recommendationsData.data.recommendations || [])
          break
      }
    } catch (error) {
      showNotification({
        type: 'error',
        title: 'Error Loading Dashboard',
        message: error instanceof Error ? error.message : 'Failed to load dashboard data',
      })
    } finally {
      setLoading(false)
    }
  }

  if (loading && !overview && findings.length === 0) {
    return <Loading />
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Inspector Dashboard</h1>
          <p className="text-gray-600 mt-1">SIRE & PSC Inspection Management</p>
        </div>
        <div className="text-right">
          <p className="text-sm text-gray-600">Last Updated</p>
          <p className="text-lg font-semibold">{new Date().toLocaleTimeString()}</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex space-x-4 border-b border-gray-200">
        {(['overview', 'findings', 'compliance', 'recommendations'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 font-medium ${
              activeTab === tab
                ? 'border-b-2 border-blue-600 text-blue-600'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>

      {/* Overview Tab */}
      {activeTab === 'overview' && overview && (
        <div className="space-y-6">
          {/* KPIs */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Findings</p>
                  <p className="text-3xl font-bold text-gray-900 mt-2">
                    {overview.total_findings || 0}
                  </p>
                </div>
                <Eye className="w-8 h-8 text-blue-500" />
              </div>
            </Card>

            <Card className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Critical Issues</p>
                  <p className="text-3xl font-bold text-red-600 mt-2">
                    {overview.critical_findings || 0}
                  </p>
                </div>
                <AlertCircle className="w-8 h-8 text-red-500" />
              </div>
            </Card>

            <Card className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Compliance Score</p>
                  <p className="text-3xl font-bold text-green-600 mt-2">
                    {overview.compliance_score || '0'}%
                  </p>
                </div>
                <CheckCircle className="w-8 h-8 text-green-500" />
              </div>
            </Card>

            <Card className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Pending Recommendations</p>
                  <p className="text-3xl font-bold text-orange-600 mt-2">
                    {overview.pending_recommendations || 0}
                  </p>
                </div>
                <AlertTriangle className="w-8 h-8 text-orange-500" />
              </div>
            </Card>
          </div>

          {/* Recent Activity */}
          {overview.recent_inspections && (
            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-4">Recent Inspections</h3>
              <div className="space-y-3">
                {overview.recent_inspections.slice(0, 5).map((inspection: any, idx: number) => (
                  <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded">
                    <div>
                      <p className="font-medium">{inspection.vessel_name}</p>
                      <p className="text-sm text-gray-600">{inspection.type}</p>
                    </div>
                    <Badge color={inspection.status === 'compliant' ? 'green' : 'red'}>
                      {inspection.status}
                    </Badge>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </div>
      )}

      {/* Findings Tab */}
      {activeTab === 'findings' && (
        <div className="space-y-4">
          {findings.length > 0 ? (
            findings.map((finding) => (
              <Card key={finding.id} className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3">
                      <AlertCircle
                        className={`w-5 h-5 ${
                          finding.type === 'critical'
                            ? 'text-red-600'
                            : finding.type === 'major'
                              ? 'text-orange-600'
                              : 'text-yellow-600'
                        }`}
                      />
                      <h3 className="font-semibold">{finding.vessel}</h3>
                      <Badge
                        color={
                          finding.type === 'critical'
                            ? 'red'
                            : finding.type === 'major'
                              ? 'orange'
                              : 'yellow'
                        }
                      >
                        {finding.type.toUpperCase()}
                      </Badge>
                    </div>
                    <p className="mt-2 text-gray-700">{finding.description}</p>
                    <p className="text-sm text-gray-600 mt-2">{finding.date}</p>
                  </div>
                  <Badge
                    color={
                      finding.status === 'closed'
                        ? 'green'
                        : finding.status === 'open'
                          ? 'red'
                          : 'yellow'
                    }
                  >
                    {finding.status.toUpperCase()}
                  </Badge>
                </div>
              </Card>
            ))
          ) : (
            <Alert type="info" title="No Findings">
              No inspection findings available.
            </Alert>
          )}
        </div>
      )}

      {/* Compliance Tab */}
      {activeTab === 'compliance' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {compliance.length > 0 ? (
            compliance.map((item, idx) => (
              <Card key={idx} className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-lg">{item.category}</h3>
                  <Badge
                    color={
                      item.status === 'compliant'
                        ? 'green'
                        : item.status === 'non-compliant'
                          ? 'red'
                          : 'yellow'
                    }
                  >
                    {item.status.toUpperCase()}
                  </Badge>
                </div>

                {/* Score bar */}
                <div className="mb-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium">Compliance Score</span>
                    <span className="font-semibold">{item.score}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full ${
                        item.score >= 80
                          ? 'bg-green-600'
                          : item.score >= 60
                            ? 'bg-yellow-600'
                            : 'bg-red-600'
                      }`}
                      style={{ width: `${item.score}%` }}
                    />
                  </div>
                </div>

                <p className="text-xs text-gray-600">Last Audit: {item.lastAudit}</p>
              </Card>
            ))
          ) : (
            <Alert type="info" title="No Data">
              No compliance data available.
            </Alert>
          )}
        </div>
      )}

      {/* Recommendations Tab */}
      {activeTab === 'recommendations' && (
        <div className="space-y-4">
          {recommendations.length > 0 ? (
            recommendations.map((rec) => (
              <Card key={rec.id} className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3">
                      <TrendingUp
                        className={`w-5 h-5 ${
                          rec.priority === 'high'
                            ? 'text-red-600'
                            : rec.priority === 'medium'
                              ? 'text-orange-600'
                              : 'text-blue-600'
                        }`}
                      />
                      <h3 className="font-semibold">{rec.title}</h3>
                      <Badge
                        color={
                          rec.priority === 'high'
                            ? 'red'
                            : rec.priority === 'medium'
                              ? 'orange'
                              : 'blue'
                        }
                      >
                        {rec.priority.toUpperCase()}
                      </Badge>
                    </div>
                    <p className="mt-2 text-gray-700">{rec.description}</p>
                    <div className="flex justify-between text-sm text-gray-600 mt-3">
                      <span>Due: {rec.dueDate}</span>
                      <span>Assigned to: {rec.assignedTo}</span>
                    </div>
                  </div>
                </div>
              </Card>
            ))
          ) : (
            <Alert type="info" title="No Recommendations">
              No pending recommendations.
            </Alert>
          )}
        </div>
      )}
    </div>
  )
}

export default DashboardInspector
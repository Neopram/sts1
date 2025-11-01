import React, { useState, useEffect } from 'react';
import {
  CheckCircle,
  AlertCircle,
  Clock,
  Trash2,
  Plus,
  Edit,
  Shield,
  TrendingUp,
  FileText
} from 'lucide-react';
import { useApp } from '../contexts/AppContext';
import ApiService from '../api';

interface ApprovalMatrixRule {
  id: string;
  name: string;
  description: string;
  type: 'operation' | 'access' | 'document' | 'sanctions';
  approvalLevels: number;
  approvers: string[];
  conditions: string;
  status: 'active' | 'inactive';
  createdAt: string;
  updatedAt: string;
}

interface PendingApproval {
  id: string;
  itemId: string;
  itemName: string;
  type: 'operation' | 'access' | 'document' | 'sanctions';
  requestedBy: string;
  requestedAt: string;
  currentApproverLevel: number;
  totalApprovalLevels: number;
  status: 'pending' | 'approved' | 'rejected';
  approvalChain: Array<{
    level: number;
    approver: string;
    status: 'pending' | 'approved' | 'rejected';
    approvedAt?: string;
    comments?: string;
  }>;
}

interface ApprovalStatistics {
  totalPending: number;
  totalApproved: number;
  totalRejected: number;
  averageApprovalTime: number;
  approvalRules: number;
}

const ApprovalMatrixPage: React.FC = () => {
  const { user, currentRoomId } = useApp();
  const [activeTab, setActiveTab] = useState<'rules' | 'pending' | 'history' | 'statistics'>('rules');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Matrix Rules State
  const [matrixRules, setMatrixRules] = useState<ApprovalMatrixRule[]>([]);
  const [filterRuleType, setFilterRuleType] = useState('');

  // Pending Approvals State
  const [pendingApprovals, setPendingApprovals] = useState<PendingApproval[]>([]);
  const [approvalComments, setApprovalComments] = useState<Record<string, string>>({});

  // Statistics State
  const [statistics, setStatistics] = useState<ApprovalStatistics>({
    totalPending: 0,
    totalApproved: 0,
    totalRejected: 0,
    averageApprovalTime: 0,
    approvalRules: 0
  });

  // Load data on mount
  useEffect(() => {
    loadApprovalMatrixData();
  }, [currentRoomId]);

  const loadApprovalMatrixData = async () => {
    if (!currentRoomId) return;

    try {
      setLoading(true);

      // Load matrix rules
      const rulesData = await ApiService.getApprovalMatrixRules(currentRoomId);
      setMatrixRules(rulesData || []);

      // Load pending approvals
      const approvalsData = await ApiService.getPendingApprovals(currentRoomId);
      setPendingApprovals(approvalsData || []);

      // Load statistics
      const statsData = await ApiService.getApprovalStatistics(currentRoomId);
      setStatistics(statsData);
    } catch (error) {
      console.error('Error loading approval matrix data:', error);
      setMessage({ type: 'error', text: 'Failed to load approval matrix data' });
    } finally {
      setLoading(false);
    }
  };

  // Matrix Rules Management
  const handleAddRule = () => {
    // Show notification or navigate to rule creation
    setMessage({ type: 'success', text: 'Rule creation modal would open here' });
  };

  const handleEditRule = (rule: ApprovalMatrixRule) => {
    // Show notification or navigate to rule edit
    console.log('Editing rule:', rule);
  };

  const handleDeleteRule = async (ruleId: string) => {
    if (!window.confirm('Are you sure you want to delete this approval rule?')) return;

    try {
      setLoading(true);
      await ApiService.deleteApprovalMatrixRule(currentRoomId!, ruleId);
      setMatrixRules(prev => prev.filter(r => r.id !== ruleId));
      setMessage({ type: 'success', text: 'Approval rule deleted successfully' });
    } catch (error) {
      console.error('Error deleting rule:', error);
      setMessage({ type: 'error', text: 'Failed to delete approval rule' });
    } finally {
      setLoading(false);
    }
  };

  const handleToggleRuleStatus = async (rule: ApprovalMatrixRule) => {
    try {
      const newStatus = rule.status === 'active' ? 'inactive' : 'active';
      await ApiService.updateApprovalMatrixRule(currentRoomId!, rule.id, { status: newStatus });
      setMatrixRules(prev =>
        prev.map(r => r.id === rule.id ? { ...r, status: newStatus } : r)
      );
      setMessage({ type: 'success', text: `Approval rule ${newStatus}` });
    } catch (error) {
      console.error('Error toggling rule status:', error);
      setMessage({ type: 'error', text: 'Failed to update approval rule status' });
    }
  };

  // Pending Approvals Management
  const handleApprovalAction = async (approvalId: string, action: 'approve' | 'reject') => {
    try {
      setLoading(true);
      const approval = pendingApprovals.find(a => a.id === approvalId);
      if (!approval) return;

      const comments = approvalComments[approvalId] || '';

      await ApiService.submitApprovalAction(currentRoomId!, approvalId, {
        action,
        comments,
        approverEmail: user?.email
      });

      // Update approval status
      setPendingApprovals(prev => {
        return prev.map(a => {
          if (a.id === approvalId) {
            const updatedChain: typeof a.approvalChain = a.approvalChain.map(level => {
              if (level.level === approval.currentApproverLevel) {
                return {
                  ...level,
                  status: action === 'approve' ? 'approved' as const : 'rejected' as const,
                  approvedAt: new Date().toISOString(),
                  comments
                };
              }
              return level;
            });
            
            const updatedApproval: PendingApproval = {
              ...a,
              status: (action === 'approve' ? 'approved' : 'rejected') as 'approved' | 'rejected',
              approvalChain: updatedChain,
              currentApproverLevel: action === 'approve' ? a.currentApproverLevel + 1 : a.currentApproverLevel
            };
            return updatedApproval;
          }
          return a;
        });
      });

      setMessage({ type: 'success', text: `Approval ${action}d successfully` });
      setApprovalComments(prev => {
        const updated = { ...prev };
        delete updated[approvalId];
        return updated;
      });
    } catch (error) {
      console.error('Error submitting approval action:', error);
      setMessage({ type: 'error', text: 'Failed to submit approval action' });
    } finally {
      setLoading(false);
    }
  };

  const renderRulesTab = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-xl font-bold text-secondary-900 mb-2">Approval Matrix Rules</h3>
          <p className="text-secondary-600">Configure approval workflows for different business scenarios</p>
        </div>
        <button
          onClick={handleAddRule}
          className="btn-primary flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          New Rule
        </button>
      </div>

      {filterRuleType && (
        <div className="flex items-center gap-2">
          <span className="text-secondary-600">Filtering by:</span>
          <span className="px-3 py-1 bg-primary-100 text-primary-700 rounded-full text-sm">{filterRuleType}</span>
          <button
            onClick={() => setFilterRuleType('')}
            className="text-secondary-600 hover:text-secondary-900 text-sm font-medium"
          >
            Clear
          </button>
        </div>
      )}

      <div className="grid gap-4">
        {matrixRules.length === 0 ? (
          <div className="card text-center py-12">
            <Shield className="w-12 h-12 mx-auto mb-3 opacity-50 text-secondary-400" />
            <p className="text-secondary-500 mb-4">No approval rules configured</p>
            <button
              onClick={handleAddRule}
              className="btn-primary inline-flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Create First Rule
            </button>
          </div>
        ) : (
          matrixRules
            .filter(rule => !filterRuleType || rule.type === filterRuleType)
            .map(rule => (
              <div key={rule.id} className="card">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <h4 className="text-lg font-medium text-secondary-900">{rule.name}</h4>
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        rule.status === 'active'
                          ? 'bg-success-100 text-success-700'
                          : 'bg-secondary-100 text-secondary-600'
                      }`}>
                        {rule.status.charAt(0).toUpperCase() + rule.status.slice(1)}
                      </span>
                      <span className="px-2 py-1 bg-primary-100 text-primary-700 rounded text-xs font-medium">
                        {rule.type}
                      </span>
                    </div>
                    <p className="text-secondary-600 text-sm mt-2">{rule.description}</p>
                  </div>
                  <div className="flex gap-2 ml-4">
                    <button
                      onClick={() => handleEditRule(rule)}
                      className="text-primary-600 hover:text-primary-700 p-2"
                      title="Edit rule"
                    >
                      <Edit className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => handleToggleRuleStatus(rule)}
                      className="text-secondary-600 hover:text-secondary-900 p-2"
                      title={rule.status === 'active' ? 'Deactivate' : 'Activate'}
                    >
                      <CheckCircle className={`w-5 h-5 ${rule.status === 'active' ? 'text-success-600' : ''}`} />
                    </button>
                    <button
                      onClick={() => handleDeleteRule(rule.id)}
                      className="text-danger-600 hover:text-danger-700 p-2"
                      title="Delete rule"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 py-4 border-t border-secondary-200">
                  <div>
                    <p className="text-secondary-600 text-sm">Approval Levels</p>
                    <p className="text-lg font-medium text-secondary-900">{rule.approvalLevels}</p>
                  </div>
                  <div>
                    <p className="text-secondary-600 text-sm">Approvers</p>
                    <p className="text-lg font-medium text-secondary-900">{rule.approvers.length}</p>
                  </div>
                  <div className="col-span-2">
                    <p className="text-secondary-600 text-sm">Conditions</p>
                    <p className="text-sm text-secondary-900">{rule.conditions}</p>
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  {rule.approvers.map((approver, idx) => (
                    <span key={idx} className="px-2 py-1 bg-secondary-100 text-secondary-700 rounded text-xs">
                      {approver}
                    </span>
                  ))}
                </div>
              </div>
            ))
        )}
      </div>
    </div>
  );

  const renderPendingTab = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-xl font-bold text-secondary-900 mb-2">Pending Approvals</h3>
        <p className="text-secondary-600">Review and action pending approval requests</p>
      </div>

      <div className="grid gap-4">
        {pendingApprovals.length === 0 ? (
          <div className="card text-center py-12">
            <CheckCircle className="w-12 h-12 mx-auto mb-3 text-success-400" />
            <p className="text-secondary-500">No pending approvals</p>
          </div>
        ) : (
          pendingApprovals
            .filter(a => a.status === 'pending')
            .map(approval => (
              <div key={approval.id} className="card">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <h4 className="text-lg font-medium text-secondary-900">{approval.itemName}</h4>
                      <span className="px-2 py-1 bg-warning-100 text-warning-700 rounded text-xs font-medium">
                        {approval.type}
                      </span>
                    </div>
                    <p className="text-secondary-600 text-sm mt-2">
                      Requested by <span className="font-medium">{approval.requestedBy}</span> on {new Date(approval.requestedAt).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-secondary-900">
                      Level {approval.currentApproverLevel} of {approval.totalApprovalLevels}
                    </p>
                    <div className="w-32 h-2 bg-secondary-200 rounded-full mt-2">
                      <div
                        className="h-full bg-primary-600 rounded-full"
                        style={{ width: `${(approval.currentApproverLevel / approval.totalApprovalLevels) * 100}%` }}
                      ></div>
                    </div>
                  </div>
                </div>

                {/* Approval Chain */}
                <div className="my-4 p-4 bg-secondary-50 rounded-lg">
                  <p className="text-sm font-medium text-secondary-900 mb-3">Approval Chain</p>
                  <div className="space-y-2">
                    {approval.approvalChain.map((level, idx) => (
                      <div key={idx} className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2 flex-1">
                          <span className="font-medium text-secondary-900">Level {level.level}:</span>
                          <span className="text-secondary-600">{level.approver}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          {level.status === 'approved' && (
                            <>
                              <CheckCircle className="w-4 h-4 text-success-600" />
                              <span className="text-success-600 font-medium">Approved</span>
                            </>
                          )}
                          {level.status === 'rejected' && (
                            <>
                              <AlertCircle className="w-4 h-4 text-danger-600" />
                              <span className="text-danger-600 font-medium">Rejected</span>
                            </>
                          )}
                          {level.status === 'pending' && (
                            <>
                              <Clock className="w-4 h-4 text-warning-600" />
                              <span className="text-warning-600 font-medium">Pending</span>
                            </>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {approval.currentApproverLevel <= approval.totalApprovalLevels && (
                  <div className="border-t border-secondary-200 pt-4">
                    <div className="mb-4">
                      <label className="form-label">Comments</label>
                      <textarea
                        value={approvalComments[approval.id] || ''}
                        onChange={(e) => setApprovalComments(prev => ({ ...prev, [approval.id]: e.target.value }))}
                        placeholder="Add optional approval comments..."
                        className="form-input resize-none h-16"
                      />
                    </div>
                    <div className="flex gap-3">
                      <button
                        onClick={() => handleApprovalAction(approval.id, 'approve')}
                        disabled={loading}
                        className="flex-1 btn-success flex items-center justify-center gap-2"
                      >
                        <CheckCircle className="w-4 h-4" />
                        Approve
                      </button>
                      <button
                        onClick={() => handleApprovalAction(approval.id, 'reject')}
                        disabled={loading}
                        className="flex-1 btn-danger flex items-center justify-center gap-2"
                      >
                        <AlertCircle className="w-4 h-4" />
                        Reject
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))
        )}
      </div>
    </div>
  );

  const renderHistoryTab = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-xl font-bold text-secondary-900 mb-2">Approval History</h3>
        <p className="text-secondary-600">View completed approval workflows</p>
      </div>

      <div className="grid gap-4">
        {pendingApprovals.filter(a => a.status !== 'pending').length === 0 ? (
          <div className="card text-center py-12">
            <FileText className="w-12 h-12 mx-auto mb-3 opacity-50 text-secondary-400" />
            <p className="text-secondary-500">No approval history</p>
          </div>
        ) : (
          pendingApprovals
            .filter(a => a.status !== 'pending')
            .map(approval => (
              <div key={approval.id} className="card">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-lg font-medium text-secondary-900">{approval.itemName}</h4>
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                    approval.status === 'approved'
                      ? 'bg-success-100 text-success-700'
                      : 'bg-danger-100 text-danger-700'
                  }`}>
                    {approval.status.charAt(0).toUpperCase() + approval.status.slice(1)}
                  </span>
                </div>
                <p className="text-secondary-600 text-sm mb-4">
                  Requested: {new Date(approval.requestedAt).toLocaleString()}
                </p>
                <div className="space-y-2">
                  {approval.approvalChain.map((level, idx) => (
                    <div key={idx} className="text-sm text-secondary-600">
                      <span className="font-medium">{level.approver}</span> •{' '}
                      {level.status === 'approved' ? 'Approved' : 'Rejected'} at {level.approvedAt ? new Date(level.approvedAt).toLocaleString() : 'N/A'}
                      {level.comments && <p className="text-xs text-secondary-500 mt-1">Comments: {level.comments}</p>}
                    </div>
                  ))}
                </div>
              </div>
            ))
        )}
      </div>
    </div>
  );

  const renderStatisticsTab = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-xl font-bold text-secondary-900 mb-2">Approval Statistics</h3>
        <p className="text-secondary-600">Overview of approval metrics and performance</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-secondary-600 text-sm mb-1">Pending Approvals</p>
              <p className="text-3xl font-bold text-warning-600">{statistics.totalPending}</p>
            </div>
            <Clock className="w-12 h-12 text-warning-200" />
          </div>
        </div>

        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-secondary-600 text-sm mb-1">Approved</p>
              <p className="text-3xl font-bold text-success-600">{statistics.totalApproved}</p>
            </div>
            <CheckCircle className="w-12 h-12 text-success-200" />
          </div>
        </div>

        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-secondary-600 text-sm mb-1">Rejected</p>
              <p className="text-3xl font-bold text-danger-600">{statistics.totalRejected}</p>
            </div>
            <AlertCircle className="w-12 h-12 text-danger-200" />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="card">
          <h4 className="text-lg font-medium text-secondary-900 mb-4">Performance Metrics</h4>
          <div className="space-y-4">
            <div>
              <p className="text-secondary-600 text-sm mb-2">Average Approval Time</p>
              <p className="text-2xl font-bold text-secondary-900">{statistics.averageApprovalTime}</p>
              <p className="text-xs text-secondary-500">hours</p>
            </div>
            <div>
              <p className="text-secondary-600 text-sm mb-2">Active Approval Rules</p>
              <p className="text-2xl font-bold text-secondary-900">{statistics.approvalRules}</p>
            </div>
          </div>
        </div>

        <div className="card">
          <h4 className="text-lg font-medium text-secondary-900 mb-4">Approval Breakdown</h4>
          <div className="space-y-3">
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm text-secondary-600">Pending</span>
                <span className="text-sm font-medium text-secondary-900">{statistics.totalPending}</span>
              </div>
              <div className="w-full h-2 bg-secondary-200 rounded-full overflow-hidden">
                <div className="h-full bg-warning-600" style={{ width: '40%' }}></div>
              </div>
            </div>
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm text-secondary-600">Approved</span>
                <span className="text-sm font-medium text-secondary-900">{statistics.totalApproved}</span>
              </div>
              <div className="w-full h-2 bg-secondary-200 rounded-full overflow-hidden">
                <div className="h-full bg-success-600" style={{ width: '55%' }}></div>
              </div>
            </div>
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm text-secondary-600">Rejected</span>
                <span className="text-sm font-medium text-secondary-900">{statistics.totalRejected}</span>
              </div>
              <div className="w-full h-2 bg-secondary-200 rounded-full overflow-hidden">
                <div className="h-full bg-danger-600" style={{ width: '5%' }}></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  if (loading && matrixRules.length === 0) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-secondary-600">Loading approval matrix data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <Shield className="w-8 h-8 text-primary-600" />
          <h1 className="text-3xl font-bold text-secondary-900">Approval Matrix</h1>
        </div>
        <p className="text-secondary-600">Manage approval workflows and rules for operations, access, documents, and sanctions</p>
      </div>

      {message && (
        <div className={`mb-6 p-4 rounded-lg flex items-center gap-3 ${
          message.type === 'success' 
            ? 'bg-success-50 border border-success-200' 
            : 'bg-danger-50 border border-danger-200'
        }`}>
          {message.type === 'success' ? (
            <CheckCircle className="w-5 h-5 text-success-600" />
          ) : (
            <AlertCircle className="w-5 h-5 text-danger-600" />
          )}
          <span className={message.type === 'success' ? 'text-success-700' : 'text-danger-700'}>
            {message.text}
          </span>
        </div>
      )}

      {/* Tab Navigation */}
      <div className="flex gap-4 mb-8 border-b border-secondary-200 overflow-x-auto">
        {[
          { id: 'rules', label: 'Rules', icon: <Shield className="w-4 h-4" /> },
          { id: 'pending', label: 'Pending', icon: <Clock className="w-4 h-4" /> },
          { id: 'history', label: 'History', icon: <FileText className="w-4 h-4" /> },
          { id: 'statistics', label: 'Statistics', icon: <TrendingUp className="w-4 h-4" /> }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex items-center gap-2 pb-4 px-2 border-b-2 font-medium transition-colors whitespace-nowrap ${
              activeTab === tab.id
                ? 'border-primary-600 text-primary-600'
                : 'border-transparent text-secondary-600 hover:text-secondary-900'
            }`}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div>
        {activeTab === 'rules' && renderRulesTab()}
        {activeTab === 'pending' && renderPendingTab()}
        {activeTab === 'history' && renderHistoryTab()}
        {activeTab === 'statistics' && renderStatisticsTab()}
      </div>
    </div>
  );
};

export default ApprovalMatrixPage;
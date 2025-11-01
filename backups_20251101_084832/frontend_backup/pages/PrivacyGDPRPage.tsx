import React, { useState, useEffect } from 'react';
import {
  Download,
  Trash2,
  CheckCircle,
  AlertCircle,
  FileText,
  Shield,
  Clock
} from 'lucide-react';
import ApiService from '../api';

interface ConsentRecord {
  id: string;
  type: string;
  status: 'accepted' | 'rejected' | 'pending';
  date: string;
  expiryDate?: string;
}

interface AuditLog {
  id: string;
  action: string;
  actor: string;
  target: string;
  timestamp: string;
  details: string;
}

interface DataExport {
  id: string;
  requestedAt: string;
  status: 'pending' | 'ready' | 'expired';
  expiryDate: string;
  size: string;
}

const PrivacyGDPRPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'consent' | 'retention' | 'export' | 'erasure' | 'audit'>('consent');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Consent Management State
  const [consents, setConsents] = useState<ConsentRecord[]>([]);

  // Data Retention Policy State
  const [retentionPolicies, setRetentionPolicies] = useState([
    { id: '1', dataType: 'Operational Data', retentionDays: 365, autoDelete: true, description: 'Active operation records' },
    { id: '2', dataType: 'Archive Data', retentionDays: 2555, autoDelete: true, description: 'Historical records (7 years)' },
    { id: '3', dataType: 'Audit Logs', retentionDays: 1825, autoDelete: true, description: 'Compliance audit trails (5 years)' },
    { id: '4', dataType: 'Personal Data', retentionDays: 365, autoDelete: false, description: 'User profile information' }
  ]);
  const [editingPolicy, setEditingPolicy] = useState<string | null>(null);
  const [policyChanges, setPolicyChanges] = useState<Record<string, number>>({});

  // Data Export State
  const [dataExports, setDataExports] = useState<DataExport[]>([]);
  const [exportStatus, setExportStatus] = useState<'idle' | 'processing' | 'ready'>('idle');

  // Right to Erasure State
  const [erasureRequest, setErasureRequest] = useState<{ status: 'idle' | 'confirming' | 'processing'; confirmed: boolean }>({
    status: 'idle',
    confirmed: false
  });
  const [erasureReason, setErasureReason] = useState('');

  // Audit Logs State
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [filterActor, setFilterActor] = useState('');
  const [filterAction, setFilterAction] = useState('');

  // Load data on mount
  useEffect(() => {
    loadPrivacyData();
  }, []);

  const loadPrivacyData = async () => {
    try {
      setLoading(true);
      
      // Load consent records
      const consentsData = await ApiService.getUserConsents();
      setConsents(consentsData || []);

      // Load data exports
      const exportsData = await ApiService.getUserDataExports();
      setDataExports(exportsData || []);

      // Load audit logs
      const logsData = await ApiService.getAuditLogs(0, 50);
      setAuditLogs(logsData.logs || []);

      // Load retention policies
      const policiesData = await ApiService.getRetentionPolicies();
      if (policiesData) {
        setRetentionPolicies(policiesData);
      }
    } catch (error) {
      console.error('Error loading privacy data:', error);
      setMessage({ type: 'error', text: 'Failed to load privacy data' });
    } finally {
      setLoading(false);
    }
  };

  // Consent Management
  const handleConsentUpdate = async (consentId: string, accepted: boolean) => {
    try {
      await ApiService.updateConsent(consentId, { accepted });
      setConsents(prev =>
        prev.map(c => c.id === consentId ? { ...c, status: accepted ? 'accepted' : 'rejected' } : c)
      );
      setMessage({ type: 'success', text: `Consent ${accepted ? 'accepted' : 'rejected'} successfully` });
    } catch (error) {
      console.error('Error updating consent:', error);
      setMessage({ type: 'error', text: 'Failed to update consent' });
    }
  };

  const handleConsentRevoke = async (consentId: string) => {
    try {
      await ApiService.revokeConsent(consentId);
      setConsents(prev => prev.filter(c => c.id !== consentId));
      setMessage({ type: 'success', text: 'Consent revoked successfully' });
    } catch (error) {
      console.error('Error revoking consent:', error);
      setMessage({ type: 'error', text: 'Failed to revoke consent' });
    }
  };

  // Data Retention
  const handleRetentionPolicyChange = (policyId: string, days: number) => {
    setPolicyChanges(prev => ({ ...prev, [policyId]: days }));
  };

  const handleSaveRetentionPolicy = async (policyId: string) => {
    try {
      const days = policyChanges[policyId];
      await ApiService.updateRetentionPolicy(policyId, { retentionDays: days });
      setRetentionPolicies(prev =>
        prev.map(p => p.id === policyId ? { ...p, retentionDays: days } : p)
      );
      setEditingPolicy(null);
      setPolicyChanges(prev => {
        const updated = { ...prev };
        delete updated[policyId];
        return updated;
      });
      setMessage({ type: 'success', text: 'Retention policy updated successfully' });
    } catch (error) {
      console.error('Error updating retention policy:', error);
      setMessage({ type: 'error', text: 'Failed to update retention policy' });
    }
  };

  // Data Export
  const handleRequestDataExport = async () => {
    try {
      setExportStatus('processing');
      const result = await ApiService.requestDataExport();
      setDataExports(prev => [result, ...prev]);
      setExportStatus('ready');
      setMessage({ type: 'success', text: 'Data export requested. Download link will be available shortly.' });
      setTimeout(() => setExportStatus('idle'), 3000);
    } catch (error) {
      console.error('Error requesting data export:', error);
      setExportStatus('idle');
      setMessage({ type: 'error', text: 'Failed to request data export' });
    }
  };

  const handleDownloadExport = async (exportId: string) => {
    try {
      const data = await ApiService.downloadDataExport(exportId);
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `privacy-export-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      setMessage({ type: 'success', text: 'Data exported successfully!' });
    } catch (error) {
      console.error('Error downloading export:', error);
      setMessage({ type: 'error', text: 'Failed to download export' });
    }
  };

  // Right to Erasure
  const handleRequestErasure = async () => {
    try {
      setLoading(true);
      await ApiService.requestAccountErasure({
        reason: erasureReason || 'User requested erasure'
      });
      setErasureRequest({ status: 'processing', confirmed: true });
      setMessage({ 
        type: 'success', 
        text: 'Erasure request submitted. Your account will be deleted within 30 days.' 
      });
      setTimeout(() => {
        setErasureReason('');
        setErasureRequest({ status: 'idle', confirmed: false });
      }, 3000);
    } catch (error) {
      console.error('Error requesting erasure:', error);
      setMessage({ type: 'error', text: 'Failed to request account erasure' });
    } finally {
      setLoading(false);
    }
  };

  // Audit Logs
  const filteredLogs = auditLogs.filter(log => {
    const actorMatch = !filterActor || log.actor.toLowerCase().includes(filterActor.toLowerCase());
    const actionMatch = !filterAction || log.action.toLowerCase().includes(filterAction.toLowerCase());
    return actorMatch && actionMatch;
  });

  const renderConsentTab = () => (
    <div className="space-y-6">
      <div className="card">
        <h3 className="text-lg font-medium text-secondary-900 mb-4">Consent Management</h3>
        <p className="text-secondary-600 mb-6">
          Manage your consent preferences for data processing and communications
        </p>

        <div className="space-y-4">
          {consents.length === 0 ? (
            <div className="text-center py-8 text-secondary-500">
              <CheckCircle className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>No consent records found</p>
            </div>
          ) : (
            consents.map(consent => (
              <div key={consent.id} className="border border-secondary-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-medium text-secondary-900">{consent.type}</h4>
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                    consent.status === 'accepted' ? 'bg-success-100 text-success-700' :
                    consent.status === 'rejected' ? 'bg-danger-100 text-danger-700' :
                    'bg-warning-100 text-warning-700'
                  }`}>
                    {consent.status.charAt(0).toUpperCase() + consent.status.slice(1)}
                  </span>
                </div>
                <div className="text-sm text-secondary-600 mb-4">
                  Granted: {new Date(consent.date).toLocaleDateString()}
                  {consent.expiryDate && ` • Expires: ${new Date(consent.expiryDate).toLocaleDateString()}`}
                </div>
                <div className="flex gap-3">
                  {consent.status !== 'accepted' && (
                    <button
                      onClick={() => handleConsentUpdate(consent.id, true)}
                      className="flex-1 btn-secondary text-sm"
                    >
                      Accept
                    </button>
                  )}
                  {consent.status !== 'rejected' && (
                    <button
                      onClick={() => handleConsentUpdate(consent.id, false)}
                      className="flex-1 btn-secondary text-sm"
                    >
                      Reject
                    </button>
                  )}
                  <button
                    onClick={() => handleConsentRevoke(consent.id)}
                    className="flex-1 btn-danger text-sm"
                  >
                    Revoke
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );

  const renderRetentionTab = () => (
    <div className="space-y-6">
      <div className="card">
        <h3 className="text-lg font-medium text-secondary-900 mb-4">Data Retention Policies</h3>
        <p className="text-secondary-600 mb-6">
          Configure how long different types of data are retained before automatic deletion
        </p>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-secondary-200">
                <th className="text-left py-3 px-4 font-medium text-secondary-900">Data Type</th>
                <th className="text-left py-3 px-4 font-medium text-secondary-900">Description</th>
                <th className="text-left py-3 px-4 font-medium text-secondary-900">Retention Period</th>
                <th className="text-left py-3 px-4 font-medium text-secondary-900">Auto-Delete</th>
                <th className="text-left py-3 px-4 font-medium text-secondary-900">Actions</th>
              </tr>
            </thead>
            <tbody>
              {retentionPolicies.map(policy => (
                <tr key={policy.id} className="border-b border-secondary-100 hover:bg-secondary-50">
                  <td className="py-3 px-4 font-medium text-secondary-900">{policy.dataType}</td>
                  <td className="py-3 px-4 text-secondary-600">{policy.description}</td>
                  <td className="py-3 px-4">
                    {editingPolicy === policy.id ? (
                      <div className="flex gap-2">
                        <input
                          type="number"
                          min="0"
                          value={policyChanges[policy.id] ?? policy.retentionDays}
                          onChange={(e) => handleRetentionPolicyChange(policy.id, parseInt(e.target.value))}
                          className="form-input w-24"
                        />
                        <span className="text-secondary-600">days</span>
                      </div>
                    ) : (
                      <span className="text-secondary-600">{policy.retentionDays} days</span>
                    )}
                  </td>
                  <td className="py-3 px-4">
                    <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${
                      policy.autoDelete ? 'bg-success-100 text-success-700' : 'bg-secondary-100 text-secondary-600'
                    }`}>
                      {policy.autoDelete ? '✓ Yes' : '✗ No'}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    {editingPolicy === policy.id ? (
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleSaveRetentionPolicy(policy.id)}
                          disabled={loading}
                          className="text-success-600 hover:text-success-700 text-sm font-medium"
                        >
                          Save
                        </button>
                        <button
                          onClick={() => setEditingPolicy(null)}
                          className="text-secondary-600 hover:text-secondary-700 text-sm font-medium"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => {
                          setEditingPolicy(policy.id);
                          setPolicyChanges(prev => ({ ...prev, [policy.id]: policy.retentionDays }));
                        }}
                        className="text-primary-600 hover:text-primary-700 text-sm font-medium"
                      >
                        Edit
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

  const renderExportTab = () => (
    <div className="space-y-6">
      <div className="card">
        <h3 className="text-lg font-medium text-secondary-900 mb-4">Data Export</h3>
        <p className="text-secondary-600 mb-6">
          Export all your personal data in a machine-readable format (GDPR Right to Data Portability)
        </p>

        <button
          onClick={handleRequestDataExport}
          disabled={exportStatus !== 'idle' || loading}
          className="btn-primary flex items-center gap-2 mb-6"
        >
          <Download className="w-4 h-4" />
          {exportStatus === 'processing' ? 'Preparing Export...' : 'Request Data Export'}
        </button>

        {exportStatus === 'ready' && (
          <div className="bg-success-50 border border-success-200 rounded-lg p-4 mb-6 flex items-center gap-3">
            <CheckCircle className="w-5 h-5 text-success-600" />
            <span className="text-success-700">Export ready for download</span>
          </div>
        )}

        <div className="space-y-4">
          <h4 className="font-medium text-secondary-900">Recent Exports</h4>
          {dataExports.length === 0 ? (
            <div className="text-center py-8 text-secondary-500">
              <FileText className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>No data exports yet</p>
            </div>
          ) : (
            dataExports.map(exp => (
              <div key={exp.id} className="border border-secondary-200 rounded-lg p-4 flex items-center justify-between">
                <div>
                  <p className="font-medium text-secondary-900">Export from {new Date(exp.requestedAt).toLocaleDateString()}</p>
                  <p className="text-sm text-secondary-600">Size: {exp.size} • Status: {exp.status}</p>
                  {exp.status === 'ready' && (
                    <p className="text-xs text-secondary-500">Expires: {new Date(exp.expiryDate).toLocaleDateString()}</p>
                  )}
                </div>
                {exp.status === 'ready' && (
                  <button
                    onClick={() => handleDownloadExport(exp.id)}
                    className="btn-primary"
                  >
                    Download
                  </button>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );

  const renderErasureTab = () => (
    <div className="space-y-6">
      <div className="card border-danger-200 bg-danger-50">
        <div className="flex items-center gap-3 mb-4">
          <AlertCircle className="w-6 h-6 text-danger-600" />
          <h3 className="text-lg font-medium text-danger-900">Right to Erasure</h3>
        </div>
        <p className="text-danger-700 mb-6">
          Request permanent deletion of your account and all associated data. This action is irreversible.
        </p>

        {erasureRequest.status === 'confirming' ? (
          <div className="space-y-4">
            <div>
              <label className="form-label text-danger-900">
                Reason for Erasure (Optional)
              </label>
              <textarea
                value={erasureReason}
                onChange={(e) => setErasureReason(e.target.value)}
                placeholder="Please let us know why you're requesting erasure..."
                className="form-input h-24 resize-none"
              />
            </div>
            <div className="bg-white border border-danger-200 rounded-lg p-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={erasureRequest.confirmed}
                  onChange={(e) => setErasureRequest(prev => ({ ...prev, confirmed: e.target.checked }))}
                  className="form-checkbox"
                />
                <span className="text-sm text-danger-900">
                  I understand this action cannot be undone and will permanently delete my account
                </span>
              </label>
            </div>
            <div className="flex gap-3">
              <button
                onClick={handleRequestErasure}
                disabled={!erasureRequest.confirmed || loading}
                className="btn-danger disabled:opacity-50"
              >
                {loading ? 'Processing...' : 'Confirm Erasure'}
              </button>
              <button
                onClick={() => setErasureRequest({ status: 'idle', confirmed: false })}
                className="btn-secondary"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setErasureRequest({ status: 'confirming', confirmed: false })}
            disabled={erasureRequest.status === 'processing' || loading}
            className="btn-danger"
          >
            <Trash2 className="w-4 h-4 mr-2 inline" />
            Request Account Erasure
          </button>
        )}

        {erasureRequest.status === 'processing' && (
          <div className="mt-4 p-4 bg-warning-100 border border-warning-200 rounded-lg">
            <p className="text-warning-700 text-sm">
              Your erasure request has been submitted. Your account will be permanently deleted within 30 days.
            </p>
          </div>
        )}
      </div>
    </div>
  );

  const renderAuditTab = () => (
    <div className="space-y-6">
      <div className="card">
        <h3 className="text-lg font-medium text-secondary-900 mb-4">Audit Logs</h3>
        <p className="text-secondary-600 mb-6">
          Complete audit trail of all data access and modifications
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <input
            type="text"
            placeholder="Filter by actor..."
            value={filterActor}
            onChange={(e) => setFilterActor(e.target.value)}
            className="form-input"
          />
          <input
            type="text"
            placeholder="Filter by action..."
            value={filterAction}
            onChange={(e) => setFilterAction(e.target.value)}
            className="form-input"
          />
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-secondary-200">
                <th className="text-left py-3 px-4 font-medium text-secondary-900">Timestamp</th>
                <th className="text-left py-3 px-4 font-medium text-secondary-900">Action</th>
                <th className="text-left py-3 px-4 font-medium text-secondary-900">Actor</th>
                <th className="text-left py-3 px-4 font-medium text-secondary-900">Target</th>
                <th className="text-left py-3 px-4 font-medium text-secondary-900">Details</th>
              </tr>
            </thead>
            <tbody>
              {filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-secondary-500">
                    No audit logs found
                  </td>
                </tr>
              ) : (
                filteredLogs.map(log => (
                  <tr key={log.id} className="border-b border-secondary-100 hover:bg-secondary-50">
                    <td className="py-3 px-4 text-secondary-600">{new Date(log.timestamp).toLocaleString()}</td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-1 bg-primary-100 text-primary-700 rounded text-xs font-medium">
                        {log.action}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-secondary-900">{log.actor}</td>
                    <td className="py-3 px-4 text-secondary-600">{log.target}</td>
                    <td className="py-3 px-4 text-secondary-600 text-xs">{log.details}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

  if (loading && consents.length === 0) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-secondary-600">Loading privacy data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <Shield className="w-8 h-8 text-primary-600" />
          <h1 className="text-3xl font-bold text-secondary-900">Privacy & GDPR</h1>
        </div>
        <p className="text-secondary-600">Manage your privacy preferences and data protection rights</p>
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
          { id: 'consent', label: 'Consent', icon: <CheckCircle className="w-4 h-4" /> },
          { id: 'retention', label: 'Retention', icon: <Clock className="w-4 h-4" /> },
          { id: 'export', label: 'Export', icon: <Download className="w-4 h-4" /> },
          { id: 'erasure', label: 'Erasure', icon: <Trash2 className="w-4 h-4" /> },
          { id: 'audit', label: 'Audit Logs', icon: <FileText className="w-4 h-4" /> }
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
        {activeTab === 'consent' && renderConsentTab()}
        {activeTab === 'retention' && renderRetentionTab()}
        {activeTab === 'export' && renderExportTab()}
        {activeTab === 'erasure' && renderErasureTab()}
        {activeTab === 'audit' && renderAuditTab()}
      </div>
    </div>
  );
};

export default PrivacyGDPRPage;
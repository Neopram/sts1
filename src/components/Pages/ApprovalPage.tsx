import React, { useState, useEffect } from 'react';
import { Check, X, Clock, AlertTriangle, Ship, FileText, RefreshCw, Download, Eye } from 'lucide-react';
import { useApp } from '../../contexts/AppContext';
import ApiService from '../../api';

interface ApprovalData {
  id: string;
  vessel_name: string;
  vessel_type: string;
  flag: string;
  imo: string;
  status: string;
  approvals: Array<{
    id: string;
    type: string;
    status: 'pending' | 'approved' | 'rejected';
    time: string;
    document_id?: string;
    notes?: string;
  }>;
}

export const ApprovalPage: React.FC = () => {
  const { currentRoomId, user } = useApp();
  const [approvalData, setApprovalData] = useState<ApprovalData[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedApproval, setSelectedApproval] = useState<any>(null);
  const [showApprovalModal, setShowApprovalModal] = useState(false);

  // Load approval data
  const loadApprovalData = async () => {
    if (!currentRoomId) return;
    
    try {
      setLoading(true);
      setError(null);
      
      const vessels = await ApiService.getVessels(currentRoomId);
      setApprovalData(vessels);
    } catch (err) {
      console.error('Error loading approval data:', err);
      setError('Failed to load approval data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Handle approval action
  const handleApprovalAction = async (approvalId: string, action: 'approve' | 'reject') => {
    if (!currentRoomId) return;
    
    try {
      setLoading(true);
      setError(null);
      
      // Update approval status via API
      await ApiService.updateDocument(currentRoomId, approvalId, {
        status: action === 'approve' ? 'approved' : 'rejected',
        action: action,
        approved_by: user?.email,
        approved_at: new Date().toISOString()
      });
      
      // Refresh data
      await loadApprovalData();
      
      // Show success message
      setError(null);
      
      // Show success notification
      window.dispatchEvent(new CustomEvent('app:notification', {
        detail: {
          type: 'success',
          message: `Document ${action}d successfully`
        }
      }));
    } catch (err) {
      console.error('Error updating approval:', err);
      setError(`Failed to ${action} document. Please try again.`);
    } finally {
      setLoading(false);
    }
  };

  // Handle bulk approval
  const handleBulkApproval = async (action: 'approve' | 'reject') => {
    if (!currentRoomId) return;
    
    try {
      setLoading(true);
      setError(null);
      
      const pendingApprovals = approvalData.flatMap(vessel => 
        vessel.approvals.filter(approval => approval.status === 'pending')
      );
      
      if (pendingApprovals.length === 0) {
        setError('No pending approvals to process.');
        return;
      }
      
      // Process all pending approvals
      for (const approval of pendingApprovals) {
        await ApiService.updateDocument(currentRoomId, approval.id, {
          status: action === 'approve' ? 'approved' : 'rejected',
          action: action,
          approved_by: user?.email,
          approved_at: new Date().toISOString()
        });
      }
      
      // Refresh data
      await loadApprovalData();
      
      // Show success message
      setError(null);
    } catch (err) {
      console.error('Error in bulk approval:', err);
      setError(`Failed to ${action} documents. Please try again.`);
    } finally {
      setLoading(false);
    }
  };

  // View approval details
  const handleViewApproval = (approval: any) => {
    setSelectedApproval(approval);
    setShowApprovalModal(true);
  };

  // Download approval document
  const handleDownloadDocument = async (documentId: string) => {
    if (!currentRoomId || !documentId) return;
    
    try {
      setLoading(true);
      const blob = await ApiService.downloadDocument(currentRoomId, documentId);
      const url = window.URL.createObjectURL(blob);
      
      const a = document.createElement('a');
      a.href = url;
      a.download = `approval-document-${documentId}.pdf`;
      a.click();
      
      setTimeout(() => window.URL.revokeObjectURL(url), 1000);
    } catch (err) {
      console.error('Error downloading document:', err);
      setError('Failed to download document. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Get status icon
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return <Clock className="w-4 h-4 text-warning-500" />;
      case 'approved':
        return <Check className="w-4 h-4 text-success-500" />;
      case 'rejected':
        return <X className="w-4 h-4 text-danger-500" />;
      default:
        return <Clock className="w-4 h-4 text-secondary-500" />;
    }
  };

  // Get status color
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-warning-800 border-warning-200';
      case 'approved':
        return 'bg-green-100 text-success-800 border-success-200';
      case 'rejected':
        return 'bg-red-100 text-danger-800 border-danger-200';
      default:
        return 'bg-secondary-100 text-secondary-800 border-secondary-200';
    }
  };

  // Load data on component mount
  useEffect(() => {
    loadApprovalData();
  }, [currentRoomId]);

  if (loading && approvalData.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
          <p className="text-secondary-600">Loading approval data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-secondary-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-8">
      {/* Error Display */}
      {error && (
        <div className="bg-danger-50 border border-danger-200 rounded-xl p-6">
          <div className="flex items-center">
            <AlertTriangle className="w-5 h-5 text-danger-500 mr-2" />
            <span className="text-danger-800 font-medium">{error}</span>
            <button
              onClick={() => setError(null)}
              className="ml-auto text-danger-400 hover:text-danger-600 transition-colors duration-200"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold text-secondary-900 flex items-center">
          <Check className="w-6 h-6 mr-3" />
          Document Approvals
        </h1>
        
        <div className="flex gap-6">
          <button
            onClick={() => handleBulkApproval('approve')}
            disabled={loading}
            className="btn-success flex items-center disabled:opacity-50"
          >
            <Check className="w-4 h-4 mr-2" />
            Approve All Pending
          </button>
          
          <button
            onClick={() => handleBulkApproval('reject')}
            disabled={loading}
            className="btn-danger flex items-center disabled:opacity-50"
          >
            <X className="w-4 h-4 mr-2" />
            Reject All Pending
          </button>
          
          <button
            onClick={loadApprovalData}
            disabled={loading}
            className="btn-secondary flex items-center disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* Approval Summary */}
      <div className="card">
        <h3 className="text-lg font-medium text-secondary-900 mb-6">Approval Summary</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="text-center p-6 bg-blue-50 rounded-xl border border-blue-200">
            <div className="text-2xl font-bold text-blue-600">
              {approvalData.reduce((total, vessel) => 
                total + vessel.approvals.length, 0
              )}
            </div>
            <div className="text-sm text-blue-800">Total Documents</div>
          </div>
          
          <div className="text-center p-6 bg-warning-50 rounded-xl border border-warning-200">
            <div className="text-2xl font-bold text-warning-600">
              {approvalData.reduce((total, vessel) => 
                total + vessel.approvals.filter(a => a.status === 'pending').length, 0
              )}
            </div>
            <div className="text-sm text-warning-800">Pending Approval</div>
          </div>
          
          <div className="text-center p-6 bg-success-50 rounded-xl border border-success-200">
            <div className="text-2xl font-bold text-success-600">
              {approvalData.reduce((total, vessel) => 
                total + vessel.approvals.filter(a => a.status === 'approved').length, 0
              )}
            </div>
            <div className="text-sm text-success-800">Approved</div>
          </div>
          
          <div className="text-center p-6 bg-danger-50 rounded-xl border border-danger-200">
            <div className="text-2xl font-bold text-danger-600">
              {approvalData.reduce((total, vessel) => 
                total + vessel.approvals.filter(a => a.status === 'rejected').length, 0
              )}
            </div>
            <div className="text-sm text-danger-800">Rejected</div>
          </div>
        </div>
      </div>

      {/* Vessels and Approvals */}
      {approvalData.length === 0 ? (
        <div className="bg-white rounded-xl shadow-card border border-secondary-200 p-6 text-center">
          <FileText className="w-12 h-12 text-secondary-400 mx-auto mb-6" />
          <h3 className="text-lg font-medium text-secondary-900 mb-2">No Approval Data</h3>
          <p className="text-secondary-600">No vessels or documents require approval at this time.</p>
        </div>
      ) : (
        <div className="space-y-8">
          {approvalData.map((vessel, index) => (
            <div key={vessel.id || index} className="card">
              <div className="px-6 py-4 border-b border-secondary-200">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-6">
                    <Ship className="w-5 h-5 text-blue-500" />
                    <div>
                      <h3 className="text-lg font-medium text-secondary-900">{vessel.vessel_name}</h3>
                      <p className="text-sm text-secondary-600">
                        {vessel.vessel_type} • {vessel.flag} • IMO: {vessel.imo}
                      </p>
                    </div>
                  </div>
                  
                  <span className={`px-3 py-1 text-sm font-medium rounded-full border ${
                    vessel.status === 'active' ? 'bg-green-100 text-success-800 border-success-200' : 'bg-secondary-100 text-secondary-800 border-secondary-200'
                  }`}>
                    {vessel.status}
                  </span>
                </div>
              </div>
              
              <div className="p-6 space-y-8">
                {vessel.approvals.map((approval, approvalIndex) => (
                  <div key={approval.id || approvalIndex} className="border border-secondary-200 rounded-xl p-6">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-6 mb-2">
                          <h4 className="font-medium text-secondary-900">{approval.type}</h4>
                          <span className={`px-2 py-1 text-xs font-medium rounded-full border ${getStatusColor(approval.status)}`}>
                            {getStatusIcon(approval.status)}
                            {approval.status.replace('_', ' ')}
                          </span>
                          <span className="text-sm text-secondary-500">{approval.time}</span>
                        </div>
                        
                        {approval.notes && (
                          <p className="text-sm text-secondary-600 mb-3">{approval.notes}</p>
                        )}
                      </div>
                      
                      <div className="flex items-center gap-2 ml-4">
                        {approval.document_id && (
                          <>
                            <button
                              onClick={() => handleViewApproval(approval)}
                              className="p-2 text-secondary-400 hover:text-secondary-600 transition-colors duration-200"
                              title="View Details"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                            
                            <button
                              onClick={() => handleDownloadDocument(approval.document_id!)}
                              className="p-2 text-secondary-400 hover:text-secondary-600 transition-colors duration-200"
                              title="Download Document"
                            >
                              <Download className="w-4 h-4" />
                            </button>
                          </>
                        )}
                        
                        {approval.status === 'pending' && (
                          <div className="flex gap-2">
                            <button 
                              onClick={() => handleApprovalAction(approval.id || '', 'approve')}
                              disabled={loading}
                              className="px-3 py-1 bg-green-600 text-white text-sm rounded hover:bg-green-700 transition-colors duration-200 disabled:opacity-50"
                            >
                              <Check className="w-3 h-3 inline mr-1" />
                              Approve
                            </button>
                            <button 
                              onClick={() => handleApprovalAction(approval.id || '', 'reject')}
                              disabled={loading}
                              className="px-3 py-1 bg-red-600 text-white text-sm rounded hover:bg-red-700 transition-colors duration-200 disabled:opacity-50"
                            >
                              <X className="w-3 h-3 inline mr-1" />
                              Reject
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Approval Details Modal */}
      {showApprovalModal && selectedApproval && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[50]">
          <div className="bg-white rounded-xl p-6 w-full max-w-2xl mx-4">
            <h3 className="text-lg font-medium text-secondary-900 mb-6">Approval Details</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-secondary-700 mb-2">
                  Document Type
                </label>
                <p className="text-secondary-900">{selectedApproval.type}</p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-secondary-700 mb-2">
                  Status
                </label>
                <span className={`px-2 py-1 text-sm font-medium rounded-full border ${getStatusColor(selectedApproval.status)}`}>
                  {getStatusIcon(selectedApproval.status)}
                  {selectedApproval.status.replace('_', ' ')}
                </span>
              </div>
              
              {selectedApproval.notes && (
                <div>
                  <label className="block text-sm font-medium text-secondary-700 mb-2">
                    Notes
                  </label>
                  <p className="text-secondary-900">{selectedApproval.notes}</p>
                </div>
              )}
              
              <div>
                <label className="block text-sm font-medium text-secondary-700 mb-2">
                  Submitted
                </label>
                <p className="text-secondary-900">{selectedApproval.time}</p>
              </div>
            </div>
            
            <div className="flex gap-6 mt-6">
              <button
                onClick={() => setShowApprovalModal(false)}
                className="flex-1 px-4 py-2 border border-secondary-300 rounded-xl text-secondary-700 hover:bg-secondary-50 transition-colors duration-200"
              >
                Close
              </button>
              
              {selectedApproval.document_id && (
                <button
                  onClick={() => handleDownloadDocument(selectedApproval.document_id)}
                  className="flex-1 btn-primary"
                >
                  <Download className="w-4 h-4 inline mr-2" />
                  Download Document
                </button>
              )}
            </div>
          </div>
        </div>
      )}
        </div>
      </div>
    </div>
  );
};
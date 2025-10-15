import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  TrendingUp, 
  AlertTriangle, 
  CheckCircle, 
  Clock, 
  Ship, 
  Users, 
  RefreshCw,
  Download,
  Eye,
  AlertCircle,
  X
} from 'lucide-react';
import { useApp } from '../../contexts/AppContext';
import { Document } from '../../types/api';
import ApiService from '../../api';

interface OverviewPageProps {
  cockpitData?: any;
  vessels?: any[];
}

export const OverviewPage: React.FC<OverviewPageProps> = ({
  cockpitData: propCockpitData,
  vessels: propVessels
}) => {
  const { currentRoomId } = useApp();
  const navigate = useNavigate();
  const [cockpitData, setCockpitData] = useState<any>(propCockpitData);
  const [vessels, setVessels] = useState<any[]>(propVessels || []);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedDocument, setSelectedDocument] = useState<Document | null>(null);
  const [showDocumentModal, setShowDocumentModal] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Load data from API
  const loadData = async () => {
    if (!currentRoomId) return;

    try {
      setLoading(true);
      setError(null);

      const [summaryData, vesselsData] = await Promise.all([
        ApiService.getRoomSummary(currentRoomId),
        ApiService.getVessels(currentRoomId)
      ]);

      setCockpitData(summaryData);
      setVessels(vesselsData);
    } catch (err) {
      console.error('Error loading overview data:', err);
      setError('Failed to load overview data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Handle document action
  const handleDocumentAction = async (documentId: string, action: string) => {
    if (!currentRoomId) return;
    
    try {
      setLoading(true);
      setError(null);
      
      if (action === 'view') {
        const document = await ApiService.getDocument(currentRoomId, documentId);
        setSelectedDocument(document);
        setShowDocumentModal(true);
      } else if (action === 'download') {
        const blob = await ApiService.downloadDocument(currentRoomId, documentId);
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `document-${documentId}.pdf`;
        a.click();
        setTimeout(() => window.URL.revokeObjectURL(url), 1000);
      }
    } catch (err) {
      console.error('Error handling document action:', err);
      setError('Failed to process document action. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Navigation functions
  const navigateToDocuments = () => navigate('/documents');
  const navigateToApproval = () => navigate('/approval');
  const navigateToActivity = () => navigate('/activity');
  const navigateToHistory = () => navigate('/history');
  const navigateToMessages = () => navigate('/messages');

  // Generate PDF snapshot
  const handleGenerateSnapshot = async () => {
    if (!currentRoomId) return;
    
    try {
      setLoading(true);
      setError(null);
      
      const blob = await ApiService.generatePDF(currentRoomId);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `sts-snapshot-${new Date().toISOString().split('T')[0]}.pdf`;
      a.click();
      setTimeout(() => window.URL.revokeObjectURL(url), 1000);
    } catch (err) {
      console.error('Error generating snapshot:', err);
      setError('Failed to generate snapshot. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Load data on component mount
  useEffect(() => {
    loadData();
  }, [currentRoomId]);

  // Update local state when props change
  useEffect(() => {
    if (propCockpitData) {
      setCockpitData(propCockpitData);
    }
    if (propVessels) {
      setVessels(propVessels);
    }
  }, [propCockpitData, propVessels]);

  if (loading && !cockpitData) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="loading-spinner h-8 w-8 mx-auto mb-2"></div>
          <p className="text-secondary-600 font-medium">Loading overview data...</p>
        </div>
      </div>
    );
  }

  if (!cockpitData) {
    return (
      <div className="card text-center">
        <div className="card-body">
          <div className="w-12 h-12 bg-secondary-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <AlertCircle className="w-6 h-6 text-secondary-500" />
          </div>
          <h3 className="text-lg font-semibold text-secondary-900 mb-2">No Data Available</h3>
          <p className="text-secondary-600 mb-6">Unable to load overview data at this time.</p>
          <button
            onClick={loadData}
            className="btn-primary"
          >
            Try Again
          </button>
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
            <div className="flex-shrink-0">
              <AlertTriangle className="w-5 h-5 text-danger-500" />
            </div>
            <div className="ml-3 flex-1">
              <span className="text-danger-800 font-medium">{error}</span>
            </div>
            <button
              onClick={() => setError(null)}
              className="ml-3 text-danger-400 hover:text-danger-600 transition-colors duration-200"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">
        <div>
          <h1 className="text-responsive-3xl font-bold text-secondary-900">Operation Overview</h1>
          <p className="text-secondary-600 mt-1">Monitor your STS operation progress and status</p>
        </div>
        
        <div className="flex gap-6">
          <button
            onClick={handleGenerateSnapshot}
            disabled={loading}
            className="btn-primary disabled:opacity-50"
          >
            <Download className="w-4 h-4 mr-2" />
            Generate Snapshot
          </button>
          
          <button
            onClick={loadData}
            disabled={loading}
            className="btn-secondary disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          
          <button
            onClick={navigateToDocuments}
            className="btn-primary"
          >
            <Download className="w-4 h-4 mr-2" />
            Manage Documents
          </button>
        </div>
      </div>

      {/* Progress Overview */}
      <div className="card">
        <div className="card-header">
          <h3 className="text-lg font-semibold text-secondary-900">Operation Progress</h3>
        </div>
        <div className="card-body">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="text-center">
              <div className="w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <TrendingUp className="w-8 h-8 text-primary-600" />
              </div>
              <div className="text-2xl font-bold text-primary-600">
                {cockpitData.progress_percentage || 0}%
              </div>
              <div className="text-sm text-secondary-600 font-medium">Overall Progress</div>
            </div>
            
            <div className="text-center">
              <div className="w-16 h-16 bg-success-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <CheckCircle className="w-8 h-8 text-success-600" />
              </div>
              <div className="text-2xl font-bold text-success-600">
                {cockpitData.resolved_required_docs || 0}
              </div>
              <div className="text-sm text-secondary-600 font-medium">Documents Resolved</div>
            </div>
            
            <div className="text-center">
              <div className="w-16 h-16 bg-warning-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <Clock className="w-8 h-8 text-warning-600" />
              </div>
              <div className="text-2xl font-bold text-warning-600">
                {cockpitData.total_required_docs || 0}
              </div>
              <div className="text-sm text-secondary-600 font-medium">Total Required</div>
            </div>
            
            <div className="text-center">
              <div className="w-16 h-16 bg-danger-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <AlertTriangle className="w-8 h-8 text-danger-600" />
              </div>
              <div className="text-2xl font-bold text-danger-600">
                {(cockpitData.blockers?.length || 0) + (cockpitData.expiring_soon?.length || 0)}
              </div>
              <div className="text-sm text-secondary-600 font-medium">Issues</div>
            </div>
          </div>
          
          {/* Progress Bar */}
          <div className="mt-8">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-semibold text-secondary-700">Overall Progress</span>
              <span className="text-sm font-medium text-secondary-600">{cockpitData.progress_percentage || 0}%</span>
            </div>
            <div className="w-full bg-secondary-200 rounded-full h-3">
              <div 
                className="bg-gradient-to-r from-primary-500 to-primary-600 h-3 rounded-full transition-all duration-200 ease-out" 
                style={{ width: `${cockpitData.progress_percentage || 0}%` }}
              ></div>
            </div>
          </div>
        </div>
      </div>

      {/* Operation Details */}
      <div className="card">
        <div className="card-header">
          <h3 className="text-lg font-semibold text-secondary-900">Operation Details</h3>
        </div>
        <div className="card-body">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div>
              <h4 className="font-semibold text-secondary-900 mb-6 flex items-center">
                <div className="w-8 h-8 bg-primary-100 rounded-xl flex items-center justify-center mr-3">
                  <Ship className="w-4 h-4 text-primary-600" />
                </div>
                Operation Information
              </h4>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between py-2 border-b border-secondary-100">
                  <span className="text-secondary-600 font-medium">Title:</span>
                  <span className="font-semibold text-secondary-900">{cockpitData.title || 'N/A'}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-secondary-100">
                  <span className="text-secondary-600 font-medium">Location:</span>
                  <span className="font-semibold text-secondary-900">{cockpitData.location || 'N/A'}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-secondary-100">
                  <span className="text-secondary-600 font-medium">ETA:</span>
                  <span className="font-semibold text-secondary-900">
                    {cockpitData.sts_eta ? new Date(cockpitData.sts_eta).toLocaleDateString() : 'N/A'}
                  </span>
                </div>
              </div>
            </div>
            
            <div>
              <h4 className="font-semibold text-secondary-900 mb-6 flex items-center">
                <div className="w-8 h-8 bg-success-100 rounded-xl flex items-center justify-center mr-3">
                  <Users className="w-4 h-4 text-success-600" />
                </div>
                Team Status
              </h4>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between py-2 border-b border-secondary-100">
                  <span className="text-secondary-600 font-medium">Owner:</span>
                  <div className="flex items-center">
                    <div className="status-online mr-2"></div>
                    <span className="font-semibold text-success-600">Active</span>
                  </div>
                </div>
                <div className="flex justify-between py-2 border-b border-secondary-100">
                  <span className="text-secondary-600 font-medium">Charterer:</span>
                  <div className="flex items-center">
                    <div className="status-online mr-2"></div>
                    <span className="font-semibold text-success-600">Active</span>
                  </div>
                </div>
                <div className="flex justify-between py-2 border-b border-secondary-100">
                  <span className="text-secondary-600 font-medium">Broker:</span>
                  <div className="flex items-center">
                    <div className="status-online mr-2"></div>
                    <span className="font-semibold text-success-600">Active</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Critical Issues */}
      {cockpitData.blockers && cockpitData.blockers.length > 0 && (
        <div className="card">
          <div className="card-header">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <div className="w-8 h-8 bg-danger-100 rounded-xl flex items-center justify-center mr-3">
                  <AlertTriangle className="w-4 h-4 text-danger-600" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-secondary-900">
                    Critical Issues ({cockpitData.blockers.length})
                  </h3>
                  <p className="text-sm text-secondary-600 mt-1">
                    These issues must be resolved before the operation can proceed
                  </p>
                </div>
              </div>
              <span className="badge-danger">{cockpitData.blockers.length}</span>
              <button
                onClick={navigateToDocuments}
                className="btn-secondary btn-sm"
                title="Manage Documents"
              >
                Manage
              </button>
            </div>
          </div>
          
          <div className="card-body">
            <div className="space-y-4">
              {cockpitData.blockers.map((doc: Document) => (
                <div key={doc.id} className="border border-danger-200 rounded-xl p-6 bg-danger-50">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-6 mb-2">
                        <h4 className="font-semibold text-danger-900">{doc.type_name}</h4>
                        <span className="badge-danger">
                          {doc.criticality} priority
                        </span>
                      </div>
                      
                      {doc.notes && (
                        <p className="text-sm text-danger-700 mb-3">{doc.notes}</p>
                      )}
                    </div>
                    
                    <div className="flex items-center gap-2 ml-4">
                      <button
                        onClick={() => {
                          handleDocumentAction(doc.id, 'view');
                          navigateToDocuments();
                        }}
                        className="p-2 text-danger-500 hover:text-danger-700 hover:bg-danger-100 rounded-xl transition-colors duration-200"
                        title="View Details"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      
                      <button
                        onClick={() => handleDocumentAction(doc.id, 'download')}
                        className="p-2 text-danger-500 hover:text-danger-700 hover:bg-danger-100 rounded-xl transition-colors duration-200"
                        title="Download"
                      >
                        <Download className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Expiring Soon */}
      {cockpitData.expiring_soon && cockpitData.expiring_soon.length > 0 && (
        <div className="card">
          <div className="card-header">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <div className="w-8 h-8 bg-warning-100 rounded-xl flex items-center justify-center mr-3">
                  <Clock className="w-4 h-4 text-warning-600" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-secondary-900">
                    Expiring Soon ({cockpitData.expiring_soon.length})
                  </h3>
                  <p className="text-sm text-secondary-600 mt-1">
                    These documents will expire soon and need attention
                  </p>
                </div>
              </div>
              <span className="badge-warning">{cockpitData.expiring_soon.length}</span>
              <button
                onClick={navigateToDocuments}
                className="btn-secondary btn-sm"
                title="Manage Documents"
              >
                Manage
              </button>
            </div>
          </div>
          
          <div className="card-body">
            <div className="space-y-4">
              {cockpitData.expiring_soon.map((doc: Document) => (
                <div key={doc.id} className="border border-warning-200 rounded-xl p-6 bg-warning-50">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-6 mb-2">
                        <h4 className="font-semibold text-warning-900">{doc.type_name}</h4>
                        <span className="badge-warning">
                          Expires: {doc.expires_on ? new Date(doc.expires_on).toLocaleDateString() : 'Unknown'}
                        </span>
                      </div>
                      
                      {doc.notes && (
                        <p className="text-sm text-warning-700 mb-3">{doc.notes}</p>
                      )}
                    </div>
                    
                    <div className="flex items-center gap-2 ml-4">
                      <button
                        onClick={() => {
                          handleDocumentAction(doc.id, 'view');
                          navigateToDocuments();
                        }}
                        className="p-2 text-warning-500 hover:text-warning-700 hover:bg-warning-100 rounded-xl transition-colors duration-200"
                        title="View Details"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      
                      <button
                        onClick={() => handleDocumentAction(doc.id, 'download')}
                        className="p-2 text-warning-500 hover:text-warning-700 hover:bg-warning-100 rounded-xl transition-colors duration-200"
                        title="Download"
                      >
                        <Download className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Vessels Overview */}
      {vessels.length > 0 && (
        <div className="card">
          <div className="card-header">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <div className="w-8 h-8 bg-primary-100 rounded-xl flex items-center justify-center mr-3">
                  <Ship className="w-4 h-4 text-primary-600" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-secondary-900">
                    Vessels ({vessels.length})
                  </h3>
                  <p className="text-sm text-secondary-600 mt-1">
                    Overview of vessels involved in this operation
                  </p>
                </div>
              </div>
              <span className="badge-primary">{vessels.length}</span>
              <button
                onClick={navigateToActivity}
                className="btn-secondary btn-sm"
                title="View Activity"
              >
                Activity
              </button>
            </div>
          </div>
          
          <div className="card-body">
            <div className="space-y-4">
              {vessels.map((vessel, index) => (
                <div key={vessel.id || index} className="border border-secondary-200 rounded-xl p-6 hover:border-primary-300 transition-colors duration-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-semibold text-secondary-900">{vessel.name}</h4>
                      <p className="text-sm text-secondary-600 mt-1">
                        {vessel.type} • {vessel.flag} • IMO: {vessel.imo}
                      </p>
                    </div>
                    
                    <span className={`px-3 py-1 text-sm font-semibold rounded-full ${
                      vessel.status === 'active' ? 'badge-success' : 'badge-secondary'
                    }`}>
                      {vessel.status}
                    </span>
                  </div>
                  
                  {vessel.approvals && vessel.approvals.length > 0 && (
                    <div className="mt-4 pt-4 border-t border-secondary-200">
                      <h5 className="text-sm font-semibold text-secondary-700 mb-3">Approvals</h5>
                      <div className="space-y-2">
                        {vessel.approvals.map((approval: any, approvalIndex: number) => (
                          <div key={approvalIndex} className="flex items-center justify-between text-sm">
                            <span className="text-secondary-600 font-medium">{approval.type}</span>
                            <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                              approval.status === 'approved' ? 'badge-success' :
                              approval.status === 'pending' ? 'badge-warning' :
                              'badge-danger'
                            }`}>
                              {approval.status}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Document Details Modal */}
      {showDocumentModal && selectedDocument && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[50] p-6">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[80vh] overflow-hidden">
            <div className="card-header">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-secondary-900">Document Details</h3>
                <button
                  onClick={() => setShowDocumentModal(false)}
                  className="p-2 text-secondary-400 hover:text-secondary-600 hover:bg-secondary-100 rounded-xl transition-colors duration-200"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
            
            <div className="card-body overflow-y-auto">
              <div className="space-y-8">
                <div className="form-group">
                  <label className="form-label">
                    Document Type
                  </label>
                  <p className="text-secondary-900 font-medium">{selectedDocument.type_name}</p>
                </div>
                
                <div className="form-group">
                  <label className="form-label">
                    Status
                  </label>
                  <span className={`inline-block ${
                    selectedDocument.status === 'missing' ? 'badge-danger' :
                    selectedDocument.status === 'under_review' ? 'badge-warning' :
                    selectedDocument.status === 'approved' ? 'badge-success' :
                    'badge-secondary'
                  }`}>
                    {selectedDocument.status?.replace('_', ' ')}
                  </span>
                </div>
                
                <div className="form-group">
                  <label className="form-label">
                    Priority
                  </label>
                  <span className={`inline-block ${
                    selectedDocument.criticality === 'high' ? 'badge-danger' :
                    selectedDocument.criticality === 'med' ? 'badge-warning' :
                    'badge-success'
                  }`}>
                    {selectedDocument.criticality} priority
                  </span>
                </div>
              
                {selectedDocument.expires_on && (
                  <div className="form-group">
                    <label className="form-label">
                      Expires On
                    </label>
                    <p className="text-secondary-900 font-medium">{new Date(selectedDocument.expires_on).toLocaleDateString()}</p>
                  </div>
                )}
                
                {selectedDocument.notes && (
                  <div className="form-group">
                    <label className="form-label">
                      Notes
                    </label>
                    <p className="text-secondary-900 bg-secondary-50 p-6 rounded-xl border border-secondary-200">{selectedDocument.notes}</p>
                  </div>
                )}
                
                {selectedDocument.uploaded_by && (
                  <div className="form-group">
                    <label className="form-label">
                      Uploaded By
                    </label>
                    <p className="text-secondary-900 font-medium">{selectedDocument.uploaded_by}</p>
                  </div>
                )}
                
                {selectedDocument.uploaded_at && (
                  <div className="form-group">
                    <label className="form-label">
                      Uploaded At
                    </label>
                    <p className="text-secondary-900 font-medium">{new Date(selectedDocument.uploaded_at).toLocaleString()}</p>
                  </div>
                )}
              </div>
            </div>
            
            <div className="card-footer">
              <div className="flex gap-6">
                <button
                  onClick={() => setShowDocumentModal(false)}
                  className="btn-secondary flex-1"
                >
                  Close
                </button>
                
                <button
                  onClick={() => handleDocumentAction(selectedDocument.id, 'download')}
                  className="btn-primary flex-1"
                >
                  <Download className="w-4 h-4 inline mr-2" />
                  Download
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
        </div>
      </div>
    </div>
  );
};
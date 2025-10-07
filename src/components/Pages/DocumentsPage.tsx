import React, { useState, useMemo } from 'react';
import { Eye, Check, X, Clock, AlertTriangle, FileText, Upload, Edit3 } from 'lucide-react';
import { Document } from '../../types/api';

interface DocumentsPageProps {
  cockpitData: any;
  onUploadDocument: () => void;
  onUpdateDocumentStatus: (documentId: string, status: string) => void;
  onDocumentAction: (documentId: string, action: 'approve' | 'reject', data?: any) => void;
  onViewDocument: (document: Document) => void;
}

export const DocumentsPage: React.FC<DocumentsPageProps> = ({
  cockpitData,
  onUploadDocument,
  onUpdateDocumentStatus,
  onDocumentAction,
  onViewDocument
}) => {
  const [showDocumentModal, setShowDocumentModal] = useState(false);
  const [editingDocument, setEditingDocument] = useState<Document | null>(null);
  const [editForm, setEditForm] = useState({
    notes: '',
    expiresOn: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Filter documents by status
  const filteredBlockers = useMemo(() => {
    if (!cockpitData?.blockers) return [];
    return cockpitData.blockers.filter((doc: Document) => doc.status === 'missing');
  }, [cockpitData?.blockers]);

  const filteredExpiring = useMemo(() => {
    if (!cockpitData?.expiring_soon) return [];
    return cockpitData.expiring_soon.filter((doc: Document) => doc.status === 'approved');
  }, [cockpitData?.expiring_soon]);

  const filteredUnderReview = useMemo(() => {
    if (!cockpitData?.documents) return [];
    return cockpitData.documents.filter((doc: Document) => doc.status === 'under_review');
  }, [cockpitData?.documents]);

  const handleEditDocument = (document: Document) => {
    setEditingDocument(document);
    setEditForm({
      notes: document.notes || '',
      expiresOn: document.expires_on ? new Date(document.expires_on).toISOString().split('T')[0] : ''
    });
    setShowDocumentModal(true);
  };

  const handleSaveEdit = async () => {
    if (!editingDocument) return;
    
    try {
      setLoading(true);
      setError(null);
      
      await onUpdateDocumentStatus(editingDocument.id, editingDocument.status);
      
      // Update local state
      setShowDocumentModal(false);
      setEditingDocument(null);
      setEditForm({ notes: '', expiresOn: '' });
      
      // Show success message
      window.dispatchEvent(new CustomEvent('app:refresh'));
      
      // Show success notification
      window.dispatchEvent(new CustomEvent('app:notification', {
        detail: {
          type: 'success',
          message: 'Document updated successfully'
        }
      }));
    } catch (err) {
      setError('Failed to update document. Please try again.');
      console.error('Error updating document:', err);
    } finally {
      setLoading(false);
    }
  };



  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'missing':
        return <AlertTriangle className="w-4 h-4 text-danger-500" />;
      case 'under_review':
        return <Clock className="w-4 h-4 text-warning-500" />;
      case 'approved':
        return <Check className="w-4 h-4 text-success-500" />;
      case 'expired':
        return <X className="w-4 h-4 text-danger-500" />;
      default:
        return <FileText className="w-4 h-4 text-secondary-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'missing':
        return 'bg-red-100 text-danger-800 border-danger-200';
      case 'under_review':
        return 'bg-yellow-100 text-warning-800 border-warning-200';
      case 'approved':
        return 'bg-green-100 text-success-800 border-success-200';
      case 'expired':
        return 'bg-red-100 text-danger-800 border-danger-200';
      default:
        return 'bg-secondary-100 text-secondary-800 border-secondary-200';
    }
  };

  const getCriticalityColor = (criticality: string) => {
    switch (criticality) {
      case 'high':
        return 'bg-red-100 text-danger-800 border-danger-200';
      case 'med':
        return 'bg-yellow-100 text-warning-800 border-warning-200';
      case 'low':
        return 'bg-green-100 text-success-800 border-success-200';
      default:
        return 'bg-secondary-100 text-secondary-800 border-secondary-200';
    }
  };

  if (!cockpitData) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
          <p className="text-secondary-600">Loading document data...</p>
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
          <FileText className="w-6 h-6 mr-3" />
          Document Management
        </h1>
        
        <button
          onClick={onUploadDocument}
          className="btn-primary flex items-center"
        >
          <Upload className="w-4 h-4 mr-2" />
          Upload Document
        </button>
      </div>

      {/* Missing Documents (Blockers) */}
      {filteredBlockers.length > 0 && (
        <div className="bg-white rounded-xl shadow-card border border-secondary-200">
          <div className="px-6 py-4 border-b border-secondary-200">
            <h3 className="text-lg font-medium text-secondary-900 flex items-center">
              <AlertTriangle className="w-5 h-5 text-danger-500 mr-2" />
              Missing Documents ({filteredBlockers.length})
            </h3>
            <p className="text-sm text-secondary-600 mt-1">
              These documents are required to proceed with the operation
            </p>
          </div>
          
          <div className="p-6 space-y-8">
            {filteredBlockers.map((doc: Document) => (
              <div key={doc.id} className="border border-secondary-200 rounded-xl p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-6 mb-2">
                      <h4 className="font-medium text-secondary-900">{doc.type_name}</h4>
                      <span className={`px-2 py-1 text-xs font-medium rounded-full border ${getStatusColor(doc.status)}`}>
                        {getStatusIcon(doc.status)}
                        {doc.status.replace('_', ' ')}
                      </span>
                      <span className={`px-2 py-1 text-xs font-medium rounded-full border ${getCriticalityColor(doc.criticality)}`}>
                        {doc.criticality} priority
                      </span>
                    </div>
                    
                    {doc.notes && (
                      <p className="text-sm text-secondary-600 mb-3">{doc.notes}</p>
                    )}
                  </div>
                  
                  <div className="flex items-center gap-2 ml-4">
                    <button
                      onClick={() => onViewDocument(doc)}
                      className="p-2 text-secondary-400 hover:text-secondary-600 transition-colors duration-200"
                      title="View Details"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                    
                    <button
                      onClick={() => handleEditDocument(doc)}
                      className="p-2 text-secondary-400 hover:text-secondary-600 transition-colors duration-200"
                      title="Edit Document"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                    
                    <button
                      onClick={() => onUpdateDocumentStatus(doc.id, 'under_review')}
                      className="btn-primary btn-sm"
                      title="Mark for Review"
                    >
                      <Clock className="w-3 h-3 inline mr-1" />
                      Mark Review
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Documents Under Review */}
      {filteredUnderReview.length > 0 && (
        <div className="bg-white rounded-xl shadow-card border border-secondary-200">
          <div className="px-6 py-4 border-b border-secondary-200">
            <h3 className="text-lg font-medium text-secondary-900 flex items-center">
              <Clock className="w-5 h-5 text-warning-500 mr-2" />
              Under Review ({filteredUnderReview.length})
            </h3>
            <p className="text-sm text-secondary-600 mt-1">
              These documents are currently being reviewed
            </p>
          </div>
          
          <div className="p-6 space-y-8">
            {filteredUnderReview.map((doc: Document) => (
              <div key={doc.id} className="border border-secondary-200 rounded-xl p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-6 mb-2">
                      <h4 className="font-medium text-secondary-900">{doc.type_name}</h4>
                      <span className={`px-2 py-1 text-xs font-medium rounded-full border ${getStatusColor(doc.status)}`}>
                        {getStatusIcon(doc.status)}
                        {doc.status.replace('_', ' ')}
                      </span>
                      <span className={`px-2 py-1 text-xs font-medium rounded-full border ${getCriticalityColor(doc.criticality)}`}>
                        {doc.criticality} priority
                      </span>
                    </div>
                    
                    {doc.notes && (
                      <p className="text-sm text-secondary-600 mb-3">{doc.notes}</p>
                    )}
                  </div>
                  
                  <div className="flex items-center gap-2 ml-4">
                    <button
                      onClick={() => onViewDocument(doc)}
                      className="p-2 text-secondary-400 hover:text-secondary-600 transition-colors duration-200"
                      title="View Details"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                    
                    <button
                      onClick={() => onDocumentAction(doc.id, 'approve')}
                      className="btn-success btn-sm"
                      title="Approve Document"
                    >
                      <Check className="w-3 h-3 inline mr-1" />
                      Approve
                    </button>
                    
                    <button
                      onClick={() => onDocumentAction(doc.id, 'reject')}
                      className="btn-danger btn-sm"
                      title="Reject Document"
                    >
                      <X className="w-3 h-3 inline mr-1" />
                      Reject
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Expiring Soon */}
      {filteredExpiring.length > 0 && (
        <div className="bg-white rounded-xl shadow-card border border-secondary-200">
          <div className="px-6 py-4 border-b border-secondary-200">
            <h3 className="text-lg font-medium text-secondary-900 flex items-center">
              <Clock className="w-5 h-5 text-orange-500 mr-2" />
              Expiring Soon ({filteredExpiring.length})
            </h3>
            <p className="text-sm text-secondary-600 mt-1">
              These approved documents will expire soon
            </p>
          </div>
          
          <div className="p-6 space-y-8">
            {filteredExpiring.map((doc: Document) => (
              <div key={doc.id} className="border border-secondary-200 rounded-xl p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-6 mb-2">
                      <h4 className="font-medium text-secondary-900">{doc.type_name}</h4>
                      <span className={`px-2 py-1 text-xs font-medium rounded-full border ${getStatusColor(doc.status)}`}>
                        {getStatusIcon(doc.status)}
                        {doc.status.replace('_', ' ')}
                      </span>
                      {doc.expires_on && (
                        <span className="text-sm text-orange-600">
                          Expires: {new Date(doc.expires_on).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                    
                    {doc.notes && (
                      <p className="text-sm text-secondary-600 mb-3">{doc.notes}</p>
                    )}
                  </div>
                  
                  <div className="flex items-center gap-2 ml-4">
                    <button
                      onClick={() => onViewDocument(doc)}
                      className="p-2 text-secondary-400 hover:text-secondary-600 transition-colors duration-200"
                      title="View Details"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                    
                    <button
                      onClick={() => onUpdateDocumentStatus(doc.id, 'expired')}
                      className="px-3 py-1 bg-orange-600 text-white text-xs rounded hover:bg-orange-700 transition-colors duration-200"
                      title="Mark as Expired"
                    >
                      <Clock className="w-3 h-3 inline mr-1" />
                      Mark Expired
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Document Edit Modal */}
      {showDocumentModal && editingDocument && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[50]">
          <div className="bg-white rounded-xl p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-medium text-secondary-900 mb-6">Edit Document</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-secondary-700 mb-2">
                  Notes
                </label>
                <textarea
                  value={editForm.notes}
                  onChange={(e) => setEditForm(prev => ({ ...prev, notes: e.target.value }))}
                  rows={3}
                  className="w-full px-3 py-2 border border-secondary-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Add notes about this document..."
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-secondary-700 mb-2">
                  Expires On (Optional)
                </label>
                <input
                  type="date"
                  value={editForm.expiresOn}
                  onChange={(e) => setEditForm(prev => ({ ...prev, expiresOn: e.target.value }))}
                  className="w-full px-3 py-2 border border-secondary-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
            
            <div className="flex gap-6 mt-6">
              <button
                onClick={() => setShowDocumentModal(false)}
                className="flex-1 px-4 py-2 border border-secondary-300 rounded-xl text-secondary-700 hover:bg-secondary-50 transition-colors duration-200"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveEdit}
                disabled={loading}
                className="flex-1 btn-primary disabled:opacity-50"
              >
                {loading ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}
        </div>
      </div>
    </div>
  );
};

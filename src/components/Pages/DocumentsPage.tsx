import React, { useState, useMemo, useEffect } from 'react';
import { Eye, Check, X, Clock, AlertTriangle, FileText, Upload, Edit3, RefreshCw, Search, Download } from 'lucide-react';
import { Document } from '../../types/api';
import { useApp } from '../../contexts/AppContext';
import ApiService from '../../api';
import { DocumentPreviewViewer } from '../DocumentPreviewViewer';

interface DocumentsPageProps {
  onUploadDocument: () => void;
  refreshTrigger?: number;
  cockpitData?: any;
  onUpdateDocumentStatus?: (documentId: string, status: string) => void;
  onDocumentAction?: (documentId: string, action: 'approve' | 'reject' | string, data?: any) => Promise<void> | void;
  onViewDocument?: (documentId: string) => void;
}

export const DocumentsPage: React.FC<DocumentsPageProps> = ({
  onUploadDocument,
  refreshTrigger = 0
}) => {
  const { currentRoomId } = useApp();
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showDocumentModal, setShowDocumentModal] = useState(false);
  const [editingDocument, setEditingDocument] = useState<Document | null>(null);
  const [selectedDocument, setSelectedDocument] = useState<Document | null>(null);
  const [editForm, setEditForm] = useState({
    notes: '',
    expiresOn: ''
  });
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterType, setFilterType] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<'details' | 'preview'>('details');
  const [previewBlob, setPreviewBlob] = useState<Blob | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);

  // Load documents from API
  const loadDocuments = async () => {
    if (!currentRoomId) return;

    try {
      setLoading(true);
      setError(null);

      const apiDocuments = await ApiService.getDocuments(currentRoomId);
      setDocuments(apiDocuments);
    } catch (err) {
      console.error('Error loading documents:', err);
      setError('Failed to load documents. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Handle document actions
  const handleDocumentAction = async (documentId: string, action: string, data?: any) => {
    if (!currentRoomId) return;

    try {
      setLoading(true);
      setError(null);

      if (action === 'approve') {
        await ApiService.approveDocument(currentRoomId, documentId, data);
      } else if (action === 'reject') {
        await ApiService.rejectDocument(currentRoomId, documentId, data?.reason || 'Rejected');
      } else if (action === 'update_status') {
        await ApiService.updateDocument(currentRoomId, documentId, { status: data?.status || 'under_review' });
      } else if (action === 'view') {
        const document = await ApiService.getDocument(currentRoomId, documentId);
        setSelectedDocument(document);
        setShowDocumentModal(true);
        return;
      } else if (action === 'download') {
        const blob = await ApiService.downloadDocument(currentRoomId, documentId);
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `document-${documentId}.pdf`;
        a.click();
        setTimeout(() => window.URL.revokeObjectURL(url), 1000);
        return;
      }

      // Reload documents after action
      await loadDocuments();

      // Show success notification
      window.dispatchEvent(new CustomEvent('app:notification', {
        detail: {
          type: 'success',
          message: `Document ${action}ed successfully`
        }
      }));
    } catch (err) {
      console.error('Error handling document action:', err);
      setError('Failed to process document action. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Load document preview
  const loadDocumentPreview = async (documentId: string) => {
    if (!currentRoomId) return;

    try {
      setPreviewLoading(true);
      setPreviewError(null);
      const blob = await ApiService.downloadDocument(currentRoomId, documentId);
      setPreviewBlob(blob);
    } catch (err) {
      console.error('Error loading document preview:', err);
      setPreviewError('Failed to load document preview. Please try again.');
    } finally {
      setPreviewLoading(false);
    }
  };

  // Handle edit document
  const handleEditDocument = (document: Document) => {
    setEditingDocument(document);
    setEditForm({
      notes: document.notes || '',
      expiresOn: document.expires_on ? new Date(document.expires_on).toISOString().split('T')[0] : ''
    });
    setShowDocumentModal(true);
  };

  // Handle save edit
  const handleSaveEdit = async () => {
    if (!editingDocument || !currentRoomId) return;

    try {
      setLoading(true);
      setError(null);

      const updateData = {
        notes: editForm.notes,
        expires_on: editForm.expiresOn ? new Date(editForm.expiresOn).toISOString() : null
      };

      await ApiService.updateDocument(currentRoomId, editingDocument.id, updateData);

      // Reload documents
      await loadDocuments();

      // Close modal
      setShowDocumentModal(false);
      setEditingDocument(null);
      setEditForm({ notes: '', expiresOn: '' });

      // Show success notification
      window.dispatchEvent(new CustomEvent('app:notification', {
        detail: {
          type: 'success',
          message: 'Document updated successfully'
        }
      }));
    } catch (err) {
      console.error('Error updating document:', err);
      setError('Failed to update document. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Filter documents
  const filteredDocuments = useMemo(() => {
    return documents.filter(doc => {
      const matchesSearch = doc.type_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           doc.notes?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = filterStatus === 'all' || doc.status === filterStatus;
      const matchesType = filterType === 'all' || doc.type_name === filterType;
      return matchesSearch && matchesStatus && matchesType;
    });
  }, [documents, searchTerm, filterStatus, filterType]);

  // Group documents by status
  const groupedDocuments = useMemo(() => {
    return {
      missing: filteredDocuments.filter(doc => doc.status === 'missing'),
      under_review: filteredDocuments.filter(doc => doc.status === 'under_review'),
      approved: filteredDocuments.filter(doc => doc.status === 'approved'),
      expired: filteredDocuments.filter(doc => doc.status === 'expired')
    };
  }, [filteredDocuments]);

  // Load data on component mount and when refreshTrigger changes
  useEffect(() => {
    loadDocuments();
  }, [currentRoomId, refreshTrigger]);

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

  if (loading && documents.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
          <p className="text-secondary-600">Loading documents...</p>
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
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">
            <h1 className="text-3xl font-bold text-secondary-900 flex items-center">
              <FileText className="w-6 h-6 mr-3" />
              Document Management
            </h1>

            <div className="flex gap-6">
              <button
                onClick={loadDocuments}
                disabled={loading}
                className="btn-secondary disabled:opacity-50"
              >
                <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </button>

              <button
                onClick={onUploadDocument}
                className="btn-primary"
              >
                <Upload className="w-4 h-4 mr-2" />
                Upload Document
              </button>
            </div>
          </div>

          {/* Filters and Search */}
          <div className="bg-white rounded-xl shadow-card border border-secondary-200 p-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-secondary-400 w-4 h-4" />
                <input
                  type="text"
                  placeholder="Search documents..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-secondary-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="px-4 py-2 border border-secondary-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="all">All Status</option>
                <option value="missing">Missing</option>
                <option value="under_review">Under Review</option>
                <option value="approved">Approved</option>
                <option value="expired">Expired</option>
              </select>

              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="px-4 py-2 border border-secondary-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="all">All Types</option>
                {/* Add document types dynamically */}
              </select>

              <div className="text-sm text-secondary-600 flex items-center">
                {filteredDocuments.length} of {documents.length} documents
              </div>
            </div>
          </div>

          {/* Missing Documents (Blockers) */}
          {groupedDocuments.missing.length > 0 && (
            <div className="bg-white rounded-xl shadow-card border border-secondary-200">
              <div className="px-6 py-4 border-b border-secondary-200">
                <h3 className="text-lg font-medium text-secondary-900 flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-danger-500" />
                  <span>Missing Documents ({groupedDocuments.missing.length})</span>
                </h3>
                <p className="text-sm text-secondary-600 mt-1">
                  These documents are required to proceed with the operation
                </p>
              </div>

              <div className="p-6 space-y-4">
                {groupedDocuments.missing.map((doc: Document) => (
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
                          onClick={() => handleDocumentAction(doc.id, 'view')}
                          className="p-2 text-secondary-400 hover:text-secondary-600 hover:bg-secondary-100 rounded-lg transition-colors duration-200"
                          title="View Details"
                        >
                          <Eye className="w-4 h-4" />
                        </button>

                        <button
                          onClick={() => handleEditDocument(doc)}
                          className="p-2 text-secondary-400 hover:text-secondary-600 hover:bg-secondary-100 rounded-lg transition-colors duration-200"
                          title="Edit Document"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>

                        <button
                          onClick={() => handleDocumentAction(doc.id, 'update_status', { status: 'under_review' })}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-primary-600 text-white text-sm rounded-lg hover:bg-primary-700 transition-colors duration-200"
                          title="Mark for Review"
                        >
                          <Clock className="w-3.5 h-3.5" />
                          <span>Mark Review</span>
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Documents Under Review */}
          {groupedDocuments.under_review.length > 0 && (
            <div className="bg-white rounded-xl shadow-card border border-secondary-200">
              <div className="px-6 py-4 border-b border-secondary-200">
                <h3 className="text-lg font-medium text-secondary-900 flex items-center gap-2">
                  <Clock className="w-5 h-5 text-warning-500" />
                  <span>Under Review ({groupedDocuments.under_review.length})</span>
                </h3>
                <p className="text-sm text-secondary-600 mt-1">
                  These documents are currently being reviewed
                </p>
              </div>

              <div className="p-6 space-y-4">
                {groupedDocuments.under_review.map((doc: Document) => (
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
                          onClick={() => handleDocumentAction(doc.id, 'view')}
                          className="p-2 text-secondary-400 hover:text-secondary-600 hover:bg-secondary-100 rounded-lg transition-colors duration-200"
                          title="View Details"
                        >
                          <Eye className="w-4 h-4" />
                        </button>

                        <button
                          onClick={() => handleDocumentAction(doc.id, 'approve')}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-success-600 text-white text-sm rounded-lg hover:bg-success-700 transition-colors duration-200"
                          title="Approve Document"
                        >
                          <Check className="w-3.5 h-3.5" />
                          <span>Approve</span>
                        </button>

                        <button
                          onClick={() => handleDocumentAction(doc.id, 'reject')}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-danger-600 text-white text-sm rounded-lg hover:bg-danger-700 transition-colors duration-200"
                          title="Reject Document"
                        >
                          <X className="w-3.5 h-3.5" />
                          <span>Reject</span>
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Approved Documents */}
          {groupedDocuments.approved.length > 0 && (
            <div className="bg-white rounded-xl shadow-card border border-secondary-200">
              <div className="px-6 py-4 border-b border-secondary-200">
                <h3 className="text-lg font-medium text-secondary-900 flex items-center gap-2">
                  <Check className="w-5 h-5 text-success-500" />
                  <span>Approved Documents ({groupedDocuments.approved.length})</span>
                </h3>
                <p className="text-sm text-secondary-600 mt-1">
                  These documents have been approved and are valid
                </p>
              </div>

              <div className="p-6 space-y-4">
                {groupedDocuments.approved.map((doc: Document) => (
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
                          onClick={() => handleDocumentAction(doc.id, 'view')}
                          className="p-2 text-secondary-400 hover:text-secondary-600 hover:bg-secondary-100 rounded-lg transition-colors duration-200"
                          title="View Details"
                        >
                          <Eye className="w-4 h-4" />
                        </button>

                        <button
                          onClick={() => handleDocumentAction(doc.id, 'download')}
                          className="p-2 text-secondary-400 hover:text-secondary-600 hover:bg-secondary-100 rounded-lg transition-colors duration-200"
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
          )}

          {/* Document Details Modal */}
          {showDocumentModal && (selectedDocument || editingDocument) && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[50] p-6">
              <div className="bg-white rounded-xl shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
                <div className="card-header border-b border-secondary-200">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-secondary-900">
                      {editingDocument ? 'Edit Document' : 'Document Details'}
                    </h3>
                    <button
                      onClick={() => {
                        setShowDocumentModal(false);
                        setSelectedDocument(null);
                        setEditingDocument(null);
                        setEditForm({ notes: '', expiresOn: '' });
                        setActiveTab('details');
                        setPreviewBlob(null);
                        setPreviewError(null);
                      }}
                      className="p-2 text-secondary-400 hover:text-secondary-600 hover:bg-secondary-100 rounded-xl transition-colors duration-200"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>

                  {!editingDocument && selectedDocument && (
                    <div className="flex gap-4 mt-4 border-t border-secondary-100 pt-4">
                      <button
                        onClick={() => setActiveTab('details')}
                        className={`px-4 py-2 rounded-lg font-medium transition-colors duration-200 ${
                          activeTab === 'details'
                            ? 'bg-blue-100 text-blue-700 border-b-2 border-blue-500'
                            : 'text-secondary-600 hover:text-secondary-900 hover:bg-secondary-100'
                        }`}
                      >
                        Details
                      </button>
                      <button
                        onClick={() => {
                          setActiveTab('preview');
                          if (!previewBlob) {
                            loadDocumentPreview(selectedDocument.id);
                          }
                        }}
                        className={`px-4 py-2 rounded-lg font-medium transition-colors duration-200 ${
                          activeTab === 'preview'
                            ? 'bg-blue-100 text-blue-700 border-b-2 border-blue-500'
                            : 'text-secondary-600 hover:text-secondary-900 hover:bg-secondary-100'
                        }`}
                      >
                        Preview
                      </button>
                    </div>
                  )}
                </div>

                <div className="flex-1 overflow-hidden flex flex-col">
                  {editingDocument ? (
                    <div className="card-body overflow-y-auto">
                      <div className="space-y-6">
                        <div className="form-group">
                          <label className="form-label">Notes</label>
                          <textarea
                            value={editForm.notes}
                            onChange={(e) => setEditForm(prev => ({ ...prev, notes: e.target.value }))}
                            rows={3}
                            className="w-full px-3 py-2 border border-secondary-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            placeholder="Add notes about this document..."
                          />
                        </div>

                        <div className="form-group">
                          <label className="form-label">Expires On (Optional)</label>
                          <input
                            type="date"
                            value={editForm.expiresOn}
                            onChange={(e) => setEditForm(prev => ({ ...prev, expiresOn: e.target.value }))}
                            className="w-full px-3 py-2 border border-secondary-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          />
                        </div>
                      </div>
                    </div>
                  ) : activeTab === 'preview' ? (
                    <div className="flex-1 overflow-hidden p-4">
                      <DocumentPreviewViewer
                        fileBlob={previewBlob}
                        loading={previewLoading}
                        error={previewError}
                      />
                    </div>
                  ) : selectedDocument ? (
                    <div className="card-body overflow-y-auto">
                      <div className="space-y-6">
                        <div className="form-group">
                          <label className="form-label">Document Type</label>
                          <p className="text-secondary-900 font-medium">{selectedDocument.type_name}</p>
                        </div>

                        <div className="form-group">
                          <label className="form-label">Status</label>
                          <span className={`inline-block ${getStatusColor(selectedDocument.status)}`}>
                            {getStatusIcon(selectedDocument.status)}
                            {selectedDocument.status?.replace('_', ' ')}
                          </span>
                        </div>

                        <div className="form-group">
                          <label className="form-label">Priority</label>
                          <span className={`inline-block ${getCriticalityColor(selectedDocument.criticality)}`}>
                            {selectedDocument.criticality} priority
                          </span>
                        </div>

                        {selectedDocument.expires_on && (
                          <div className="form-group">
                            <label className="form-label">Expires On</label>
                            <p className="text-secondary-900 font-medium">{new Date(selectedDocument.expires_on).toLocaleDateString()}</p>
                          </div>
                        )}

                        {selectedDocument.notes && (
                          <div className="form-group">
                            <label className="form-label">Notes</label>
                            <p className="text-secondary-900 bg-secondary-50 p-4 rounded-xl border border-secondary-200">{selectedDocument.notes}</p>
                          </div>
                        )}

                        {selectedDocument.uploaded_by && (
                          <div className="form-group">
                            <label className="form-label">Uploaded By</label>
                            <p className="text-secondary-900 font-medium">{selectedDocument.uploaded_by}</p>
                          </div>
                        )}

                        {selectedDocument.uploaded_at && (
                          <div className="form-group">
                            <label className="form-label">Uploaded At</label>
                            <p className="text-secondary-900 font-medium">{new Date(selectedDocument.uploaded_at).toLocaleString()}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  ) : null}
                </div>

                <div className="card-footer border-t border-secondary-200">
                  <div className="flex gap-6">
                    <button
                      onClick={() => {
                        setShowDocumentModal(false);
                        setSelectedDocument(null);
                        setEditingDocument(null);
                        setEditForm({ notes: '', expiresOn: '' });
                        setActiveTab('details');
                        setPreviewBlob(null);
                        setPreviewError(null);
                      }}
                      className="btn-secondary flex-1"
                    >
                      {editingDocument ? 'Cancel' : 'Close'}
                    </button>

                    {editingDocument ? (
                      <button
                        onClick={handleSaveEdit}
                        disabled={loading}
                        className="btn-primary flex-1 disabled:opacity-50"
                      >
                        {loading ? 'Saving...' : 'Save Changes'}
                      </button>
                    ) : selectedDocument ? (
                      <button
                        onClick={() => handleDocumentAction(selectedDocument.id, 'download')}
                        className="btn-primary flex-1"
                      >
                        <Download className="w-4 h-4 inline mr-2" />
                        Download
                      </button>
                    ) : null}
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

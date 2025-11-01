/**
 * Missing Documents Window Component
 * Reusable compact widget for displaying missing/expiring documents
 * Can be used as a sidebar, modal, or embedded widget
 */

import React, { useState } from 'react';
import {
  AlertTriangle,
  Clock,
  X,
  ChevronRight,
  Upload as UploadIcon,
  RefreshCw,
  CheckCircle,
  Zap
} from 'lucide-react';
import { MissingDocumentStatus } from '../../types/documents';

interface MissingDocumentsWindowProps {
  isOpen?: boolean;
  onClose?: () => void;
  documents: MissingDocumentStatus[];
  loading?: boolean;
  onUploadClick?: () => void;
  onRefresh?: () => void;
  variant?: 'compact' | 'full' | 'sidebar';
  maxItems?: number;
}

export const MissingDocumentsWindow: React.FC<MissingDocumentsWindowProps> = ({
  isOpen = true,
  onClose,
  documents,
  loading = false,
  onUploadClick,
  onRefresh,
  variant = 'compact',
  maxItems = 5
}) => {
  const [expanded, setExpanded] = useState(false);

  // Sort documents by priority
  const sortedDocuments = [...documents].sort((a, b) => {
    const priorityOrder = { high: 3, med: 2, low: 1 };
    const aPriority = priorityOrder[a.priority as keyof typeof priorityOrder] || 0;
    const bPriority = priorityOrder[b.priority as keyof typeof priorityOrder] || 0;
    return bPriority - aPriority;
  });

  const displayedDocuments = expanded ? sortedDocuments : sortedDocuments.slice(0, maxItems);
  const hasMore = sortedDocuments.length > maxItems;

  // Get priority color
  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'bg-red-100 text-red-700 border-red-200';
      case 'med':
        return 'bg-amber-100 text-amber-700 border-amber-200';
      case 'low':
        return 'bg-green-100 text-green-700 border-green-200';
      default:
        return 'bg-secondary-100 text-secondary-700 border-secondary-200';
    }
  };

  // Get priority icon
  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case 'high':
        return <AlertTriangle className="w-4 h-4" />;
      case 'med':
        return <Clock className="w-4 h-4" />;
      default:
        return <CheckCircle className="w-4 h-4" />;
    }
  };

  // Compact variant - small card
  if (variant === 'compact') {
    return (
      <div className="bg-white border border-secondary-200 rounded-lg shadow-sm p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Zap className="w-5 h-5 text-primary-600" />
            <h3 className="font-semibold text-secondary-900">Missing Documents</h3>
          </div>
          {documents.length > 0 && (
            <span className="px-2.5 py-0.5 bg-danger-100 text-danger-700 rounded-full text-xs font-bold">
              {documents.length}
            </span>
          )}
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-4">
            <RefreshCw className="w-4 h-4 text-secondary-400 animate-spin" />
          </div>
        ) : documents.length === 0 ? (
          <div className="text-center py-4">
            <CheckCircle className="w-6 h-6 text-green-500 mx-auto mb-2" />
            <p className="text-sm text-secondary-600">All documents complete</p>
          </div>
        ) : (
          <div className="space-y-2">
            {displayedDocuments.map(doc => (
              <div key={doc.id} className="flex items-start gap-2 text-sm">
                {getPriorityIcon(doc.priority)}
                <div className="flex-1 min-w-0">
                  <p className="text-secondary-900 font-medium truncate">{doc.type.name}</p>
                  <p className="text-xs text-secondary-500">
                    {doc.reason === 'missing' && 'Missing'}
                    {doc.reason === 'expired' && 'Expired'}
                    {doc.reason === 'expiring_soon' && `${doc.daysUntilExpiry} days left`}
                  </p>
                </div>
              </div>
            ))}
            
            {hasMore && !expanded && (
              <button
                onClick={() => setExpanded(true)}
                className="text-xs text-primary-600 hover:text-primary-700 font-medium mt-2"
              >
                View all {sortedDocuments.length} items →
              </button>
            )}
          </div>
        )}

        {onUploadClick && documents.length > 0 && (
          <button
            onClick={onUploadClick}
            className="w-full mt-3 px-3 py-2 bg-primary-50 hover:bg-primary-100 text-primary-700 rounded-lg text-sm font-medium transition-colors duration-200 flex items-center justify-center gap-2"
          >
            <UploadIcon className="w-4 h-4" />
            Upload Document
          </button>
        )}
      </div>
    );
  }

  // Full variant - full-width card
  if (variant === 'full') {
    return (
      <div className="bg-white border border-secondary-200 rounded-lg shadow-md overflow-hidden">
        <div className="px-6 py-4 border-b border-secondary-200 bg-gradient-to-r from-primary-50 to-secondary-50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Zap className="w-5 h-5 text-primary-600" />
              <h2 className="text-lg font-semibold text-secondary-900">Missing Documents Overview</h2>
            </div>
            {documents.length > 0 && (
              <span className="px-3 py-1 bg-danger-100 text-danger-700 rounded-full text-sm font-bold">
                {documents.length} items
              </span>
            )}
          </div>
        </div>

        <div className="px-6 py-4">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <RefreshCw className="w-6 h-6 text-secondary-400 animate-spin" />
            </div>
          ) : documents.length === 0 ? (
            <div className="text-center py-8">
              <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-3" />
              <h3 className="font-semibold text-secondary-900 mb-1">All Documents Complete!</h3>
              <p className="text-secondary-600">No missing or expiring documents</p>
            </div>
          ) : (
            <div className="space-y-3">
              {displayedDocuments.map(doc => (
                <div
                  key={doc.id}
                  className={`border rounded-lg p-4 hover:shadow-md transition-all duration-200 ${
                    doc.priority === 'high'
                      ? 'border-red-200 bg-red-50'
                      : doc.priority === 'med'
                      ? 'border-amber-200 bg-amber-50'
                      : 'border-green-200 bg-green-50'
                  }`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3 flex-1">
                      <div className="flex-shrink-0">{getPriorityIcon(doc.priority)}</div>
                      <div className="flex-1">
                        <h4 className="font-semibold text-secondary-900">{doc.type.name}</h4>
                        <p className="text-sm text-secondary-600 mt-1">{doc.type.description}</p>
                        <p className="text-xs text-secondary-500 mt-2">
                          Status: <span className="font-medium">{doc.reason}</span>
                          {doc.daysUntilExpiry && ` • ${doc.daysUntilExpiry} days`}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={onUploadClick}
                      className="flex-shrink-0 p-2 hover:bg-white rounded-lg transition-colors duration-200"
                    >
                      <UploadIcon className="w-4 h-4 text-primary-600" />
                    </button>
                  </div>
                </div>
              ))}

              {hasMore && (
                <button
                  onClick={() => setExpanded(!expanded)}
                  className="w-full mt-4 py-2 text-center text-primary-600 hover:text-primary-700 font-medium text-sm"
                >
                  {expanded ? 'Show less' : `Show all ${sortedDocuments.length} items`}
                </button>
              )}
            </div>
          )}
        </div>

        {onRefresh && (
          <div className="px-6 py-3 border-t border-secondary-200 bg-secondary-50 flex justify-end gap-2">
            <button
              onClick={onRefresh}
              disabled={loading}
              className="px-4 py-2 text-secondary-700 hover:bg-white rounded-lg transition-colors duration-200 text-sm font-medium disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        )}
      </div>
    );
  }

  // Sidebar variant - sliding panel
  return (
    <div
      className={`fixed right-0 top-0 h-full w-96 bg-white shadow-2xl z-40 transform transition-transform duration-300 ease-in-out overflow-y-auto ${
        isOpen ? 'translate-x-0' : 'translate-x-full'
      }`}
    >
      {/* Header */}
      <div className="sticky top-0 px-6 py-4 border-b border-secondary-200 bg-white flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Zap className="w-5 h-5 text-primary-600" />
          <h2 className="font-semibold text-secondary-900">Missing Documents</h2>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="p-1 hover:bg-secondary-100 rounded-lg transition-colors duration-200"
          >
            <X className="w-5 h-5 text-secondary-600" />
          </button>
        )}
      </div>

      {/* Content */}
      <div className="p-6 space-y-4">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <RefreshCw className="w-6 h-6 text-secondary-400 animate-spin" />
          </div>
        ) : documents.length === 0 ? (
          <div className="text-center py-12">
            <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-3" />
            <h3 className="font-semibold text-secondary-900 mb-1">Perfect!</h3>
            <p className="text-secondary-600">All documents are complete</p>
          </div>
        ) : (
          <>
            {/* Summary Stats */}
            <div className="grid grid-cols-3 gap-3">
              <div className="text-center p-3 bg-red-50 rounded-lg">
                <div className="text-2xl font-bold text-red-600">
                  {sortedDocuments.filter(d => d.priority === 'high').length}
                </div>
                <div className="text-xs text-red-600 font-medium mt-1">Critical</div>
              </div>
              <div className="text-center p-3 bg-amber-50 rounded-lg">
                <div className="text-2xl font-bold text-amber-600">
                  {sortedDocuments.filter(d => d.priority === 'med').length}
                </div>
                <div className="text-xs text-amber-600 font-medium mt-1">Important</div>
              </div>
              <div className="text-center p-3 bg-green-50 rounded-lg">
                <div className="text-2xl font-bold text-green-600">
                  {sortedDocuments.filter(d => d.priority === 'low').length}
                </div>
                <div className="text-xs text-green-600 font-medium mt-1">Optional</div>
              </div>
            </div>

            {/* Document List */}
            <div className="space-y-2">
              {displayedDocuments.map(doc => (
                <div
                  key={doc.id}
                  className={`p-3 rounded-lg border ${getPriorityColor(doc.priority)} cursor-pointer hover:shadow-md transition-all duration-200`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm">{doc.type.name}</p>
                      <p className="text-xs mt-1 opacity-75">
                        {doc.reason === 'missing' && 'Missing'}
                        {doc.reason === 'expired' && 'Expired'}
                        {doc.reason === 'expiring_soon' && `Expires in ${doc.daysUntilExpiry} days`}
                      </p>
                    </div>
                    <button
                      onClick={onUploadClick}
                      className="p-1.5 hover:bg-white rounded transition-colors duration-200 flex-shrink-0"
                    >
                      <UploadIcon className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}

              {hasMore && (
                <button
                  onClick={() => setExpanded(!expanded)}
                  className="w-full py-2 text-center text-sm font-medium text-primary-600 hover:text-primary-700 mt-2"
                >
                  {expanded ? 'Show less' : `View all ${sortedDocuments.length} items`}
                  <ChevronRight className={`inline w-4 h-4 ml-1 transition-transform duration-200 ${expanded ? 'rotate-90' : ''}`} />
                </button>
              )}
            </div>
          </>
        )}
      </div>

      {/* Footer */}
      {documents.length > 0 && (
        <div className="sticky bottom-0 px-6 py-4 border-t border-secondary-200 bg-secondary-50 space-y-3">
          {onUploadClick && (
            <button
              onClick={onUploadClick}
              className="w-full px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg font-medium transition-colors duration-200 flex items-center justify-center gap-2"
            >
              <UploadIcon className="w-4 h-4" />
              Upload Document
            </button>
          )}
          {onRefresh && (
            <button
              onClick={onRefresh}
              disabled={loading}
              className="w-full px-4 py-2 border border-secondary-300 hover:bg-white text-secondary-700 rounded-lg font-medium transition-colors duration-200 disabled:opacity-50"
            >
              <RefreshCw className={`inline w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          )}
        </div>
      )}
    </div>
  );
};
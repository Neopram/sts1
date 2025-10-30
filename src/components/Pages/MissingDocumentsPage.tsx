/**
 * Missing Documents Page
 * Comprehensive view of all missing and expiring documents
 */

import React, { useState, useEffect } from 'react';
import { 
  AlertTriangle, 
  Clock, 
  CheckCircle, 
  Search, 
  Filter, 
  RefreshCw,
  Upload as UploadIcon,
  ArrowRight,
  Zap,
  TrendingUp
} from 'lucide-react';
import { useApp } from '../../contexts/AppContext';
import ApiService from '../../api';
import { MissingDocumentStatus, MissingDocumentsOverview, MissingDocumentsFilter } from '../../types/documents';
import { PRIORITY_LABELS } from '../../constants/ocimf';

interface MissingDocumentsPageProps {
  onUploadDocument?: () => void;
}

export const MissingDocumentsPage: React.FC<MissingDocumentsPageProps> = ({
  onUploadDocument
}) => {
  const { currentRoomId } = useApp();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [overview, setOverview] = useState<MissingDocumentsOverview | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  
  // Filter state
  const [filters, setFilters] = useState<MissingDocumentsFilter>({
    status: 'all',
    priority: 'all',
    category: 'all',
    searchTerm: '',
    sortBy: 'priority',
    sortOrder: 'desc'
  });
  
  const [expandedCategory, setExpandedCategory] = useState<string | null>('missing');

  // Load missing documents
  const loadMissingDocuments = async () => {
    if (!currentRoomId) return;
    
    try {
      setLoading(true);
      setError(null);
      
      const data = await ApiService.getMissingDocuments([currentRoomId]);
      setOverview(data);
    } catch (err) {
      console.error('Error loading missing documents:', err);
      setError('Failed to load missing documents. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Refresh data
  const handleRefresh = async () => {
    if (!currentRoomId) return;
    
    try {
      setRefreshing(true);
      await loadMissingDocuments();
      
      window.dispatchEvent(new CustomEvent('app:notification', {
        detail: {
          type: 'success',
          message: 'Missing documents updated'
        }
      }));
    } catch (err) {
      console.error('Error refreshing:', err);
    } finally {
      setRefreshing(false);
    }
  };

  // Load data on mount
  useEffect(() => {
    loadMissingDocuments();
  }, [currentRoomId]);

  // Filter documents
  const filterDocuments = (docs: MissingDocumentStatus[]): MissingDocumentStatus[] => {
    return docs.filter(doc => {
      // Status filter
      if (filters.status !== 'all' && doc.status !== filters.status) {
        return false;
      }
      
      // Priority filter
      if (filters.priority !== 'all' && doc.priority !== filters.priority) {
        return false;
      }
      
      // Category filter
      if (filters.category !== 'all' && doc.type.category !== filters.category) {
        return false;
      }
      
      // Search filter
      if (filters.searchTerm) {
        const search = filters.searchTerm.toLowerCase();
        const matchesName = doc.type.name.toLowerCase().includes(search);
        const matchesCode = doc.type.code.toLowerCase().includes(search);
        const matchesDescription = doc.type.description.toLowerCase().includes(search);
        
        if (!matchesName && !matchesCode && !matchesDescription) {
          return false;
        }
      }
      
      return true;
    });
  };

  // Sort documents
  const sortDocuments = (docs: MissingDocumentStatus[]): MissingDocumentStatus[] => {
    const sorted = [...docs];
    
    sorted.sort((a, b) => {
      let comparison = 0;
      
      switch (filters.sortBy) {
        case 'priority':
          const priorityOrder = { high: 3, med: 2, low: 1 };
          comparison = (priorityOrder[b.priority] || 0) - (priorityOrder[a.priority] || 0);
          break;
        case 'expiry':
          const aExpiry = a.daysUntilExpiry ?? Infinity;
          const bExpiry = b.daysUntilExpiry ?? Infinity;
          comparison = aExpiry - bExpiry;
          break;
        case 'name':
          comparison = a.type.name.localeCompare(b.type.name);
          break;
        default:
          comparison = 0;
      }
      
      return filters.sortOrder === 'asc' ? comparison : -comparison;
    });
    
    return sorted;
  };

  // Get filtered and sorted documents
  const allMissing = overview?.categories?.missing || [];
  const allExpiring = overview?.categories?.expiring || [];
  const allExpired = overview?.categories?.expired || [];
  const allUnderReview = overview?.categories?.underReview || [];

  const filteredMissing = sortDocuments(filterDocuments(allMissing));
  const filteredExpiring = sortDocuments(filterDocuments(allExpiring));
  const filteredExpired = sortDocuments(filterDocuments(allExpired));
  const filteredUnderReview = sortDocuments(filterDocuments(allUnderReview));

  // Get priority badge
  const getPriorityBadge = (priority: string) => {
    const colors = {
      high: 'bg-red-100 text-red-700 border-red-200',
      med: 'bg-amber-100 text-amber-700 border-amber-200',
      low: 'bg-green-100 text-green-700 border-green-200'
    };
    
    return (
      <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${colors[priority as keyof typeof colors] || ''}`}>
        {PRIORITY_LABELS[priority as keyof typeof PRIORITY_LABELS] || priority}
      </span>
    );
  };

  // Get status icon
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'missing':
        return <AlertTriangle className="w-5 h-5 text-red-600" />;
      case 'expired':
        return <AlertTriangle className="w-5 h-5 text-red-600" />;
      case 'expiring_soon':
        return <Clock className="w-5 h-5 text-amber-600" />;
      case 'under_review':
        return <RefreshCw className="w-5 h-5 text-blue-600" />;
      default:
        return <CheckCircle className="w-5 h-5 text-green-600" />;
    }
  };

  // Render document item
  const renderDocumentItem = (doc: MissingDocumentStatus) => (
    <div 
      key={doc.id}
      className="border border-secondary-200 rounded-lg p-4 hover:border-primary-300 hover:shadow-md transition-all duration-200"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3 flex-1 min-w-0">
          {getStatusIcon(doc.reason)}
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2">
              <h4 className="font-semibold text-secondary-900 truncate">{doc.type.name}</h4>
              <span className="text-xs font-mono bg-secondary-100 text-secondary-700 px-2 py-1 rounded">
                {doc.type.code}
              </span>
            </div>
            
            <p className="text-sm text-secondary-600 mb-2">{doc.type.description}</p>
            
            <div className="flex items-center gap-2 text-xs text-secondary-500">
              {doc.daysUntilExpiry !== undefined && (
                <>
                  <Clock className="w-3 h-3" />
                  {doc.daysUntilExpiry < 0 
                    ? `Expired ${Math.abs(doc.daysUntilExpiry)} days ago`
                    : `Expires in ${doc.daysUntilExpiry} days`
                  }
                </>
              )}
              {doc.uploadedBy && (
                <>
                  <span>•</span>
                  <span>Uploaded by {doc.uploadedBy}</span>
                </>
              )}
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-2 flex-shrink-0">
          {getPriorityBadge(doc.priority)}
          <button
            onClick={onUploadDocument}
            className="p-2 hover:bg-primary-50 rounded-lg transition-colors duration-200"
            title="Upload document"
          >
            <UploadIcon className="w-4 h-4 text-primary-600" />
          </button>
        </div>
      </div>
    </div>
  );

  // Render category section
  const renderCategorySection = (
    title: string,
    count: number,
    docs: MissingDocumentStatus[],
    categoryId: string,
    icon: React.ReactNode
  ) => {
    const isExpanded = expandedCategory === categoryId;
    const isEmpty = docs.length === 0;
    
    return (
      <div key={categoryId} className="card">
        <button
          onClick={() => setExpandedCategory(isExpanded ? null : categoryId)}
          className="w-full px-6 py-4 flex items-center justify-between hover:bg-secondary-50 transition-colors duration-200"
        >
          <div className="flex items-center gap-3">
            {icon}
            <div className="text-left">
              <h3 className="font-semibold text-secondary-900">{title}</h3>
              <p className="text-sm text-secondary-500">{count} document{count !== 1 ? 's' : ''}</p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            {!isEmpty && count > 0 && (
              <span className="px-2 py-1 bg-danger-100 text-danger-700 rounded-full text-xs font-semibold">
                {count}
              </span>
            )}
            <ArrowRight 
              className={`w-5 h-5 text-secondary-600 transition-transform duration-200 ${isExpanded ? 'rotate-90' : ''}`}
            />
          </div>
        </button>
        
        {isExpanded && !isEmpty && (
          <div className="border-t border-secondary-200 px-6 py-4 space-y-3">
            {docs.map(renderDocumentItem)}
          </div>
        )}
        
        {isEmpty && isExpanded && (
          <div className="border-t border-secondary-200 px-6 py-8 text-center">
            <CheckCircle className="w-12 h-12 text-green-400 mx-auto mb-2" />
            <p className="text-secondary-600">No documents in this category</p>
          </div>
        )}
      </div>
    );
  };

  if (loading && !overview) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
          <p className="text-secondary-600 font-medium">Loading missing documents...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Error Display */}
      {error && (
        <div className="bg-danger-50 border border-danger-200 rounded-lg p-4 flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 text-danger-600 flex-shrink-0" />
          <div className="flex-1">
            <p className="text-danger-800 font-medium">{error}</p>
          </div>
          <button
            onClick={() => setError(null)}
            className="text-danger-600 hover:text-danger-700 text-sm"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-secondary-900 flex items-center gap-2">
            <Zap className="w-7 h-7 text-primary-600" />
            Missing Documents Overview
          </h1>
          <p className="text-secondary-600 mt-1">
            Track all missing, expiring, and pending documents in one place
          </p>
        </div>
        
        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className="btn-primary flex items-center gap-2 disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Statistics */}
      {overview && (
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <div className="card p-6">
            <div className="text-sm text-secondary-600 mb-2">Completion Rate</div>
            <div className="text-3xl font-bold text-primary-600">
              {Math.round(overview.statistics.completionPercentage)}%
            </div>
            <div className="mt-2 bg-secondary-200 h-2 rounded-full overflow-hidden">
              <div 
                className="bg-primary-600 h-full transition-all duration-300"
                style={{ width: `${overview.statistics.completionPercentage}%` }}
              />
            </div>
          </div>
          
          <div className="card p-6">
            <div className="text-sm text-secondary-600 mb-2 flex items-center gap-1">
              <AlertTriangle className="w-4 h-4" />
              Missing
            </div>
            <div className="text-3xl font-bold text-red-600">
              {overview.summary.missingCount}
            </div>
          </div>
          
          <div className="card p-6">
            <div className="text-sm text-secondary-600 mb-2 flex items-center gap-1">
              <Clock className="w-4 h-4" />
              Expiring
            </div>
            <div className="text-3xl font-bold text-amber-600">
              {overview.summary.expiringCount}
            </div>
          </div>
          
          <div className="card p-6">
            <div className="text-sm text-secondary-600 mb-2 flex items-center gap-1">
              <AlertTriangle className="w-4 h-4" />
              Expired
            </div>
            <div className="text-3xl font-bold text-danger-600">
              {overview.summary.expiredCount}
            </div>
          </div>
          
          <div className="card p-6">
            <div className="text-sm text-secondary-600 mb-2 flex items-center gap-1">
              <TrendingUp className="w-4 h-4" />
              Risk Score
            </div>
            <div className="text-3xl font-bold text-secondary-900">
              {overview.statistics.expirationRiskScore}/100
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="card">
        <div className="px-6 py-4 border-b border-secondary-200">
          <h3 className="font-semibold text-secondary-900 flex items-center gap-2">
            <Filter className="w-4 h-4" />
            Filters & Search
          </h3>
        </div>
        
        <div className="p-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Search */}
            <div>
              <label className="block text-sm font-medium text-secondary-700 mb-2">
                Search
              </label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-secondary-400" />
                <input
                  type="text"
                  placeholder="Document name, code..."
                  value={filters.searchTerm}
                  onChange={(e) => setFilters({ ...filters, searchTerm: e.target.value })}
                  className="w-full pl-10 pr-4 py-2 border border-secondary-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>
            </div>
            
            {/* Status Filter */}
            <div>
              <label className="block text-sm font-medium text-secondary-700 mb-2">
                Status
              </label>
              <select
                value={filters.status}
                onChange={(e) => setFilters({ ...filters, status: e.target.value as any })}
                className="w-full px-4 py-2 border border-secondary-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              >
                <option value="all">All Status</option>
                <option value="missing">Missing</option>
                <option value="under_review">Under Review</option>
                <option value="expired">Expired</option>
                <option value="approved">Approved</option>
              </select>
            </div>
            
            {/* Priority Filter */}
            <div>
              <label className="block text-sm font-medium text-secondary-700 mb-2">
                Priority
              </label>
              <select
                value={filters.priority}
                onChange={(e) => setFilters({ ...filters, priority: e.target.value as any })}
                className="w-full px-4 py-2 border border-secondary-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              >
                <option value="all">All Priorities</option>
                <option value="high">Critical</option>
                <option value="med">Important</option>
                <option value="low">Optional</option>
              </select>
            </div>
            
            {/* Sort */}
            <div>
              <label className="block text-sm font-medium text-secondary-700 mb-2">
                Sort By
              </label>
              <select
                value={filters.sortBy}
                onChange={(e) => setFilters({ ...filters, sortBy: e.target.value as any })}
                className="w-full px-4 py-2 border border-secondary-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              >
                <option value="priority">Priority</option>
                <option value="expiry">Expiry Date</option>
                <option value="name">Document Name</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Document Categories */}
      <div className="space-y-4">
        {overview && renderCategorySection(
          'Missing Documents',
          allMissing.length,
          filteredMissing,
          'missing',
          <AlertTriangle className="w-5 h-5 text-red-600" />
        )}
        
        {overview && renderCategorySection(
          'Expiring Soon',
          allExpiring.length,
          filteredExpiring,
          'expiring',
          <Clock className="w-5 h-5 text-amber-600" />
        )}
        
        {overview && renderCategorySection(
          'Expired',
          allExpired.length,
          filteredExpired,
          'expired',
          <AlertTriangle className="w-5 h-5 text-danger-600" />
        )}
        
        {overview && renderCategorySection(
          'Under Review',
          allUnderReview.length,
          filteredUnderReview,
          'under_review',
          <RefreshCw className="w-5 h-5 text-blue-600" />
        )}
      </div>

      {/* Empty State */}
      {overview && 
        filteredMissing.length === 0 &&
        filteredExpiring.length === 0 &&
        filteredExpired.length === 0 &&
        filteredUnderReview.length === 0 && (
        <div className="card text-center py-12">
          <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-secondary-900 mb-2">All Documents Complete!</h3>
          <p className="text-secondary-600">No missing or expiring documents found.</p>
        </div>
      )}
    </div>
  );
};
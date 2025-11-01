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
      className="bg-white border border-blue-200 rounded-xl p-5 hover:border-blue-400 hover:shadow-lg transition-all duration-200"
    >
      <div className="flex flex-col gap-3">
        {/* Title and Description Row */}
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0 mt-0.5">
            {getStatusIcon(doc.reason)}
          </div>
          
          <div className="flex-1 min-w-0">
            <h4 className="font-bold text-secondary-900 text-base mb-1">{doc.type.name}</h4>
            <p className="text-sm text-secondary-600">{doc.type.description}</p>
          </div>
        </div>

        {/* Badges Row */}
        <div className="flex flex-wrap gap-2">
          <span className="text-xs font-semibold bg-blue-100 text-blue-700 px-2.5 py-1 rounded-full border border-blue-200 flex-shrink-0">
            {doc.type.code}
          </span>
          
          {doc.daysUntilExpiry !== undefined && (
            <span className={`text-xs font-semibold px-2.5 py-1 rounded-full border flex-shrink-0 inline-flex items-center gap-1 ${
              doc.daysUntilExpiry < 0 
                ? 'bg-orange-100 text-orange-700 border-orange-300'
                : doc.daysUntilExpiry <= 7
                ? 'bg-amber-100 text-amber-700 border-amber-300'
                : 'bg-emerald-100 text-emerald-700 border-emerald-300'
            }`}>
              <Clock className="w-3 h-3 flex-shrink-0" />
              <span>
                {doc.daysUntilExpiry < 0 
                  ? `Expired ${Math.abs(doc.daysUntilExpiry)}d ago`
                  : `Expires in ${doc.daysUntilExpiry}d`
                }
              </span>
            </span>
          )}
          
          {doc.uploadedBy && (
            <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-secondary-100 text-secondary-700 border border-secondary-200 flex-shrink-0">
              {doc.uploadedBy}
            </span>
          )}
        </div>

        {/* Actions Row */}
        <div className="flex items-center gap-2 flex-shrink-0 justify-end">
          {getPriorityBadge(doc.priority)}
          <button
            onClick={onUploadDocument}
            className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white text-xs font-semibold rounded-lg hover:bg-blue-700 active:bg-blue-800 transition-all duration-200 shadow-md hover:shadow-lg flex-shrink-0"
            title="Upload document"
          >
            <UploadIcon className="w-3.5 h-3.5 flex-shrink-0" />
            <span>Upload</span>
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
    
    const categoryColors = {
      missing: { bg: 'from-red-50 to-red-100', header: 'from-red-600 to-red-700', border: 'border-red-300' },
      expiring: { bg: 'from-amber-50 to-amber-100', header: 'from-amber-500 to-amber-600', border: 'border-amber-300' },
      expired: { bg: 'from-orange-50 to-orange-100', header: 'from-orange-600 to-orange-700', border: 'border-orange-300' },
      under_review: { bg: 'from-blue-50 to-blue-100', header: 'from-blue-600 to-blue-700', border: 'border-blue-300' }
    };
    
    const colors = categoryColors[categoryId as keyof typeof categoryColors] || categoryColors.missing;
    
    return (
      <div key={categoryId} className={`bg-gradient-to-br ${colors.bg} rounded-xl border ${colors.border} shadow-lg overflow-hidden`}>
        <button
          onClick={() => setExpandedCategory(isExpanded ? null : categoryId)}
          className={`w-full px-6 py-5 flex items-center justify-between hover:opacity-95 transition-all duration-200 bg-gradient-to-r ${colors.header}`}
        >
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-8 h-8 bg-white bg-opacity-90 rounded-full">
              {icon}
            </div>
            <div className="text-left">
              <h3 className="font-bold text-white text-lg">{title}</h3>
              <p className="text-sm text-white text-opacity-80">{count} document{count !== 1 ? 's' : ''}</p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            {!isEmpty && count > 0 && (
              <span className="px-3 py-1 bg-white bg-opacity-90 text-secondary-900 rounded-full text-xs font-bold">
                {count}
              </span>
            )}
            <ArrowRight 
              className={`w-5 h-5 text-white transition-transform duration-200 ${isExpanded ? 'rotate-90' : ''}`}
            />
          </div>
        </button>
        
        {isExpanded && !isEmpty && (
          <div className="px-6 py-5 space-y-3 bg-white bg-opacity-50">
            {docs.map(renderDocumentItem)}
          </div>
        )}
        
        {isEmpty && isExpanded && (
          <div className="px-6 py-12 text-center bg-white bg-opacity-50">
            <CheckCircle className="w-12 h-12 text-emerald-500 mx-auto mb-3" />
            <p className="text-secondary-700 font-medium">No documents in this category</p>
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
      {overview && overview.summary && overview.statistics && (
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl border border-blue-300 p-6 shadow-md">
            <div className="text-xs font-bold text-blue-900 mb-2 uppercase tracking-wide">Completion Rate</div>
            <div className="text-4xl font-bold text-blue-600 mb-3">
              {Math.round(overview.statistics.completionPercentage)}%
            </div>
            <div className="mt-3 bg-blue-200 h-2.5 rounded-full overflow-hidden">
              <div 
                className="bg-gradient-to-r from-blue-600 to-blue-500 h-full transition-all duration-300"
                style={{ width: `${overview.statistics.completionPercentage}%` }}
              />
            </div>
          </div>
          
          <div className="bg-gradient-to-br from-red-50 to-red-100 rounded-xl border border-red-300 p-6 shadow-md">
            <div className="text-xs font-bold text-red-900 mb-2 uppercase tracking-wide flex items-center gap-1">
              <AlertTriangle className="w-4 h-4 flex-shrink-0" />
              Missing
            </div>
            <div className="text-4xl font-bold text-red-600">
              {overview.summary.missingCount}
            </div>
          </div>
          
          <div className="bg-gradient-to-br from-amber-50 to-amber-100 rounded-xl border border-amber-300 p-6 shadow-md">
            <div className="text-xs font-bold text-amber-900 mb-2 uppercase tracking-wide flex items-center gap-1">
              <Clock className="w-4 h-4 flex-shrink-0" />
              Expiring
            </div>
            <div className="text-4xl font-bold text-amber-600">
              {overview.summary.expiringCount}
            </div>
          </div>
          
          <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-xl border border-orange-300 p-6 shadow-md">
            <div className="text-xs font-bold text-orange-900 mb-2 uppercase tracking-wide flex items-center gap-1">
              <AlertTriangle className="w-4 h-4 flex-shrink-0" />
              Expired
            </div>
            <div className="text-4xl font-bold text-orange-600">
              {overview.summary.expiredCount}
            </div>
          </div>
          
          <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl border border-purple-300 p-6 shadow-md">
            <div className="text-xs font-bold text-purple-900 mb-2 uppercase tracking-wide flex items-center gap-1">
              <TrendingUp className="w-4 h-4 flex-shrink-0" />
              Risk Score
            </div>
            <div className="text-4xl font-bold text-purple-600">
              {overview.statistics.expirationRiskScore}/100
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl border border-blue-200 shadow-md overflow-hidden">
        <div className="px-6 py-5 border-b border-blue-200 bg-gradient-to-r from-blue-600 to-blue-700">
          <h3 className="font-bold text-white flex items-center gap-2 text-lg">
            <Filter className="w-5 h-5 flex-shrink-0" />
            Filters & Search
          </h3>
        </div>
        
        <div className="p-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Search */}
            <div>
              <label className="block text-xs font-bold text-blue-900 mb-2 uppercase tracking-wide">
                Search
              </label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-blue-400 flex-shrink-0" />
                <input
                  type="text"
                  placeholder="Document name, code..."
                  value={filters.searchTerm}
                  onChange={(e) => setFilters({ ...filters, searchTerm: e.target.value })}
                  className="w-full pl-10 pr-4 py-2.5 border border-blue-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white text-secondary-900 font-medium"
                />
              </div>
            </div>
            
            {/* Status Filter */}
            <div>
              <label className="block text-xs font-bold text-blue-900 mb-2 uppercase tracking-wide">
                Status
              </label>
              <select
                value={filters.status}
                onChange={(e) => setFilters({ ...filters, status: e.target.value as any })}
                className="w-full px-4 py-2.5 border border-blue-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white text-secondary-900 font-medium"
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
              <label className="block text-xs font-bold text-blue-900 mb-2 uppercase tracking-wide">
                Priority
              </label>
              <select
                value={filters.priority}
                onChange={(e) => setFilters({ ...filters, priority: e.target.value as any })}
                className="w-full px-4 py-2.5 border border-blue-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white text-secondary-900 font-medium"
              >
                <option value="all">All Priorities</option>
                <option value="high">Critical</option>
                <option value="med">Important</option>
                <option value="low">Optional</option>
              </select>
            </div>
            
            {/* Sort */}
            <div>
              <label className="block text-xs font-bold text-blue-900 mb-2 uppercase tracking-wide">
                Sort By
              </label>
              <select
                value={filters.sortBy}
                onChange={(e) => setFilters({ ...filters, sortBy: e.target.value as any })}
                className="w-full px-4 py-2.5 border border-blue-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white text-secondary-900 font-medium"
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
        <div className="bg-gradient-to-br from-emerald-50 to-emerald-100 rounded-xl border border-emerald-300 shadow-lg text-center py-16 px-8">
          <CheckCircle className="w-16 h-16 text-emerald-500 mx-auto mb-4" />
          <h3 className="text-2xl font-bold text-emerald-900 mb-2">All Documents Complete!</h3>
          <p className="text-emerald-700 font-medium">No missing or expiring documents found.</p>
        </div>
      )}
    </div>
  );
};
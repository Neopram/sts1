/**
 * VESSEL COMPARATIVE PANEL - PR-3 PHASE 3
 * 
 * Shows side-by-side comparison of vessel documents and status
 * from two perspectives: Trading Company vs Shipowner
 * 
 * Features:
 * - Document status comparison (Uploaded/Missing/Outdated)
 * - Last update timestamps
 * - Comments per role
 * - Badge-based status indicators
 */

import React, { useState, useEffect } from 'react';
import { 
  AlertTriangle, 
  Check, 
  Clock, 
  FileText, 
  TrendingUp, 
  MessageSquare,
  Calendar,
  User
} from 'lucide-react';
import ApiService from '../api';
import { useApp } from '../contexts/AppContext';

interface DocumentStatus {
  name: string;
  status: 'uploaded' | 'missing' | 'outdated';
  lastUpdate?: string;
  uploadedBy?: string;
  comment?: string;
}

interface VesselComparison {
  vesselName: string;
  vesselIMO: string;
  tradingDocuments: DocumentStatus[];
  ownerDocuments: DocumentStatus[];
}

interface Props {
  operationId?: string;
  vessels?: any[];
  onRefresh?: () => void;
}

export const VesselComparativePanel: React.FC<Props> = ({
  operationId,
  vessels = [],
  onRefresh
}) => {
  const { currentRoomId } = useApp();
  const [comparisons, setComparisons] = useState<VesselComparison[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedVessel, setSelectedVessel] = useState<string | null>(null);
  const [expandedVessel, setExpandedVessel] = useState<string | null>(null);

  // Load comparative data from real API
  const loadComparativeData = async () => {
    const roomId = operationId || currentRoomId;
    if (!roomId) return;

    try {
      setLoading(true);
      setError(null);

      // Fetch real vessel comparison data from backend
      const response = await ApiService.getVesselComparison(roomId);
      
      if (response?.comparisons && Array.isArray(response.comparisons)) {
        setComparisons(response.comparisons);
      } else if (Array.isArray(response)) {
        // Handle if API returns array directly
        setComparisons(response);
      } else {
        // Fallback: if no API data, create structure from vessels
        const fallbackComparisons: VesselComparison[] = (vessels || []).map((vessel: any) => ({
          vesselName: vessel.name || 'Unknown Vessel',
          vesselIMO: vessel.imo || 'N/A',
          tradingDocuments: [],
          ownerDocuments: []
        }));
        setComparisons(fallbackComparisons);
      }
    } catch (err) {
      console.error('Error loading comparative data:', err);
      // Fallback gracefully to empty state
      setComparisons([]);
      setError('Unable to load vessel comparisons. Data will be updated when available.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadComparativeData();
  }, [currentRoomId, operationId, vessels]);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'uploaded':
        return <Check className="w-4 h-4 text-success-500" />;
      case 'missing':
        return <AlertTriangle className="w-4 h-4 text-danger-500" />;
      case 'outdated':
        return <Clock className="w-4 h-4 text-warning-500" />;
      default:
        return <FileText className="w-4 h-4 text-secondary-500" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'uploaded':
        return 'bg-success-100 text-success-800 border-success-300';
      case 'missing':
        return 'bg-danger-100 text-danger-800 border-danger-300';
      case 'outdated':
        return 'bg-warning-100 text-warning-800 border-warning-300';
      default:
        return 'bg-secondary-100 text-secondary-800 border-secondary-300';
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Never';
    const date = new Date(dateString);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
    return date.toLocaleDateString();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto mb-2"></div>
          <p className="text-secondary-600">Loading vessel comparisons...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-danger-50 border border-danger-200 rounded-xl p-6">
        <div className="flex items-center">
          <AlertTriangle className="w-5 h-5 text-danger-500 mr-2" />
          <span className="text-danger-800 font-medium">{error}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-secondary-900 flex items-center gap-2">
            <TrendingUp className="w-6 h-6 text-primary-600" />
            Vessel Document Comparison
          </h2>
          <p className="text-sm text-secondary-600 mt-1">Trading Company vs Shipowner Perspective</p>
        </div>
        <button
          onClick={loadComparativeData}
          disabled={loading}
          className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 font-medium"
        >
          Refresh
        </button>
      </div>

      {/* Comparisons Grid */}
      <div className="space-y-6">
        {comparisons.map((comparison, idx) => (
          <div
            key={idx}
            className="bg-white border-2 border-secondary-200 rounded-xl overflow-hidden hover:shadow-lg transition-all duration-200"
          >
            {/* Vessel Header */}
            <div
              onClick={() => setExpandedVessel(expandedVessel === comparison.vesselIMO ? null : comparison.vesselIMO)}
              className="px-6 py-4 bg-gradient-to-r from-primary-50 to-primary-100 border-b border-primary-200 cursor-pointer hover:bg-gradient-to-r hover:from-primary-100 hover:to-primary-150 transition-colors"
            >
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-bold text-secondary-900">{comparison.vesselName}</h3>
                  <p className="text-sm text-secondary-600">IMO: {comparison.vesselIMO}</p>
                </div>
                <div className="text-right">
                  <div className="inline-block px-3 py-1 bg-primary-200 text-primary-900 rounded-full text-sm font-semibold">
                    {comparison.tradingDocuments.filter(d => d.status === 'uploaded').length} of{' '}
                    {comparison.tradingDocuments.length}
                  </div>
                </div>
              </div>
            </div>

            {/* Comparison Content */}
            {expandedVessel === comparison.vesselIMO && (
              <div className="p-6">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Trading Company Perspective */}
                  <div className="space-y-4">
                    <h4 className="font-bold text-secondary-900 flex items-center gap-2">
                      <User className="w-4 h-4 text-blue-600" />
                      Trading Company
                    </h4>
                    <div className="space-y-3">
                      {comparison.tradingDocuments.map((doc, docIdx) => (
                        <div
                          key={docIdx}
                          className="p-4 bg-blue-50 border border-blue-200 rounded-lg"
                        >
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex items-center gap-2">
                              {getStatusIcon(doc.status)}
                              <span className="font-medium text-secondary-900">{doc.name}</span>
                            </div>
                            <span className={`text-xs font-semibold px-2 py-1 rounded-full border ${getStatusBadge(doc.status)}`}>
                              {doc.status.charAt(0).toUpperCase() + doc.status.slice(1)}
                            </span>
                          </div>
                          {doc.lastUpdate && (
                            <div className="text-xs text-secondary-600 flex items-center gap-1 mb-1">
                              <Calendar className="w-3 h-3" />
                              {formatDate(doc.lastUpdate)}
                            </div>
                          )}
                          {doc.uploadedBy && (
                            <div className="text-xs text-secondary-600 flex items-center gap-1 mb-1">
                              <User className="w-3 h-3" />
                              {doc.uploadedBy}
                            </div>
                          )}
                          {doc.comment && (
                            <div className="text-xs text-secondary-700 flex items-start gap-1 mt-2 p-2 bg-white rounded">
                              <MessageSquare className="w-3 h-3 flex-shrink-0 mt-0.5" />
                              {doc.comment}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Shipowner Perspective */}
                  <div className="space-y-4">
                    <h4 className="font-bold text-secondary-900 flex items-center gap-2">
                      <User className="w-4 h-4 text-orange-600" />
                      Shipowner
                    </h4>
                    <div className="space-y-3">
                      {comparison.ownerDocuments.map((doc, docIdx) => (
                        <div
                          key={docIdx}
                          className="p-4 bg-orange-50 border border-orange-200 rounded-lg"
                        >
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex items-center gap-2">
                              {getStatusIcon(doc.status)}
                              <span className="font-medium text-secondary-900">{doc.name}</span>
                            </div>
                            <span className={`text-xs font-semibold px-2 py-1 rounded-full border ${getStatusBadge(doc.status)}`}>
                              {doc.status.charAt(0).toUpperCase() + doc.status.slice(1)}
                            </span>
                          </div>
                          {doc.lastUpdate && (
                            <div className="text-xs text-secondary-600 flex items-center gap-1 mb-1">
                              <Calendar className="w-3 h-3" />
                              {formatDate(doc.lastUpdate)}
                            </div>
                          )}
                          {doc.uploadedBy && (
                            <div className="text-xs text-secondary-600 flex items-center gap-1 mb-1">
                              <User className="w-3 h-3" />
                              {doc.uploadedBy}
                            </div>
                          )}
                          {doc.comment && (
                            <div className="text-xs text-secondary-700 flex items-start gap-1 mt-2 p-2 bg-white rounded">
                              <MessageSquare className="w-3 h-3 flex-shrink-0 mt-0.5" />
                              {doc.comment}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {comparisons.length === 0 && (
        <div className="p-12 text-center rounded-xl border-2 border-dashed border-secondary-200 bg-secondary-50">
          <TrendingUp className="w-12 h-12 text-secondary-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-secondary-900 mb-2">No Vessels to Compare</h3>
          <p className="text-secondary-600">No vessels have been assigned to this operation yet.</p>
        </div>
      )}
    </div>
  );
};

export default VesselComparativePanel;
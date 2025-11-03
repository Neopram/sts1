/**
 * RECENT UPDATES BY PLAYER PANEL - PR-3 PHASE 3
 * 
 * Shows recent updates filtered by player role
 * Displays activities specific to each party perspective
 * 
 * Features:
 * - Activity feed per role
 * - Vessel context for each update
 * - Timestamp and actor information
 * - Role-based filtering
 */

import React, { useState, useEffect } from 'react';
import {
  Activity,
  FileText,
  CheckCircle,
  AlertTriangle,
  Clock,
  MessageSquare,
  TrendingUp,
  Filter,
  X
} from 'lucide-react';
import ApiService from '../api';
import { useApp } from '../contexts/AppContext';

interface PlayerUpdate {
  id: string;
  timestamp: string;
  actor: string;
  actorRole: 'trading_company' | 'shipowner' | 'broker' | 'system';
  action: string;
  description: string;
  vesselName?: string;
  documentName?: string;
  status?: string;
  comment?: string;
}

interface Props {
  operationId?: string;
  maxItems?: number;
  onRefresh?: () => void;
}

export const RecentUpdatesByPlayerPanel: React.FC<Props> = ({
  operationId,
  maxItems = 10,
  onRefresh
}) => {
  const { currentRoomId, user } = useApp();
  const [updates, setUpdates] = useState<PlayerUpdate[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filterRole, setFilterRole] = useState<string>('all');

  // Load recent updates from real API
  const loadUpdates = async () => {
    const roomId = operationId || currentRoomId;
    if (!roomId) return;

    try {
      setLoading(true);
      setError(null);

      // Fetch real activities data from backend
      const roleFilterParam = filterRole !== 'all' ? filterRole : undefined;
      const response = await ApiService.getActivitiesByRole(roomId, roleFilterParam, maxItems || 10, 0);
      
      if (response?.activities && Array.isArray(response.activities)) {
        // Map backend response to PlayerUpdate format
        const updates: PlayerUpdate[] = response.activities.map((activity: any) => ({
          id: activity.id,
          timestamp: activity.timestamp,
          actor: activity.actor,
          actorRole: activity.actorRole || 'system',
          action: activity.action,
          description: activity.description,
          vesselName: activity.vesselName,
          documentName: activity.documentName,
          status: activity.status,
          comment: activity.comment
        }));
        setUpdates(updates);
      } else if (Array.isArray(response)) {
        // Handle if API returns array directly
        setUpdates(response);
      } else {
        setUpdates([]);
      }
    } catch (err) {
      console.error('Error loading updates:', err);
      // Fallback gracefully
      setUpdates([]);
      setError('Unable to load recent updates. Data will be available soon.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUpdates();
  }, [currentRoomId, operationId, filterRole]);

  const getActionIcon = (action: string) => {
    switch (action) {
      case 'document_uploaded':
        return <FileText className="w-4 h-4 text-blue-500" />;
      case 'document_reviewed':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'approval_requested':
        return <AlertTriangle className="w-4 h-4 text-yellow-500" />;
      case 'operation_created':
        return <Activity className="w-4 h-4 text-purple-500" />;
      default:
        return <Activity className="w-4 h-4 text-secondary-500" />;
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'trading_company':
        return 'bg-blue-100 text-blue-800 border-blue-300';
      case 'shipowner':
        return 'bg-orange-100 text-orange-800 border-orange-300';
      case 'broker':
        return 'bg-purple-100 text-purple-800 border-purple-300';
      case 'system':
        return 'bg-gray-100 text-gray-800 border-gray-300';
      default:
        return 'bg-secondary-100 text-secondary-800 border-secondary-300';
    }
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'trading_company':
        return '🏢 Trading Company';
      case 'shipowner':
        return '⚓ Shipowner';
      case 'broker':
        return '🤝 Broker';
      case 'system':
        return '⚙️ System';
      default:
        return '👤 Other';
    }
  };

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  const filteredUpdates = filterRole === 'all'
    ? updates
    : updates.filter(u => u.actorRole === filterRole);

  const displayUpdates = filteredUpdates.slice(0, maxItems);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto mb-2"></div>
          <p className="text-secondary-600">Loading recent updates...</p>
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
            Recent Updates by Player
          </h2>
          <p className="text-sm text-secondary-600 mt-1">Latest activities across all participants</p>
        </div>
        <button
          onClick={loadUpdates}
          disabled={loading}
          className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 font-medium"
        >
          Refresh
        </button>
      </div>

      {/* Filter */}
      <div className="flex items-center gap-3">
        <Filter className="w-4 h-4 text-secondary-600" />
        <div className="flex gap-2 flex-wrap">
          {[
            { value: 'all', label: 'All Updates' },
            { value: 'trading_company', label: '🏢 Trading Company' },
            { value: 'shipowner', label: '⚓ Shipowner' },
            { value: 'broker', label: '🤝 Broker' },
            { value: 'system', label: '⚙️ System' },
          ].map((filter) => (
            <button
              key={filter.value}
              onClick={() => setFilterRole(filter.value)}
              className={`px-3 py-1 rounded-full text-sm font-medium transition-all ${
                filterRole === filter.value
                  ? 'bg-primary-600 text-white'
                  : 'bg-secondary-100 text-secondary-700 hover:bg-secondary-200'
              }`}
            >
              {filter.label}
            </button>
          ))}
        </div>
        {filterRole !== 'all' && (
          <button
            onClick={() => setFilterRole('all')}
            className="ml-auto text-secondary-400 hover:text-secondary-600"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Updates Timeline */}
      <div className="space-y-3">
        {displayUpdates.length > 0 ? (
          displayUpdates.map((update, idx) => (
            <div
              key={update.id}
              className="bg-white border-l-4 border-primary-500 rounded-lg p-4 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start gap-4">
                {/* Icon */}
                <div className="flex-shrink-0 mt-1">
                  {getActionIcon(update.action)}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-secondary-900">{update.actor}</span>
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${getRoleColor(update.actorRole)}`}>
                          {getRoleLabel(update.actorRole)}
                        </span>
                      </div>
                      <p className="text-sm text-secondary-700 mt-1">{update.description}</p>

                      {/* Details */}
                      <div className="flex items-center gap-3 mt-2 text-xs text-secondary-600 flex-wrap">
                        {update.vesselName && (
                          <span className="flex items-center gap-1">
                            🚢 {update.vesselName}
                          </span>
                        )}
                        {update.documentName && (
                          <span className="flex items-center gap-1">
                            📄 {update.documentName}
                          </span>
                        )}
                        {update.status && (
                          <span className="flex items-center gap-1 px-2 py-0.5 bg-secondary-100 rounded">
                            {update.status.replace('_', ' ')}
                          </span>
                        )}
                      </div>

                      {/* Comment */}
                      {update.comment && (
                        <div className="mt-2 p-2 bg-secondary-50 border border-secondary-200 rounded text-xs text-secondary-700 flex items-start gap-2">
                          <MessageSquare className="w-3 h-3 flex-shrink-0 mt-0.5" />
                          {update.comment}
                        </div>
                      )}
                    </div>

                    {/* Timestamp */}
                    <div className="flex-shrink-0 text-xs text-secondary-500 flex items-center gap-1 whitespace-nowrap">
                      <Clock className="w-3 h-3" />
                      {formatTime(update.timestamp)}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="p-8 text-center rounded-lg border-2 border-dashed border-secondary-200 bg-secondary-50">
            <Activity className="w-12 h-12 text-secondary-400 mx-auto mb-3" />
            <p className="text-secondary-600 font-medium">No updates found</p>
            <p className="text-sm text-secondary-500 mt-1">Try adjusting your filters</p>
          </div>
        )}
      </div>

      {/* Show more link */}
      {filteredUpdates.length > maxItems && (
        <div className="text-center">
          <button className="text-primary-600 hover:text-primary-700 font-medium text-sm">
            View all {filteredUpdates.length} updates
          </button>
        </div>
      )}
    </div>
  );
};

export default RecentUpdatesByPlayerPanel;
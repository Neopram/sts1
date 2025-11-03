/**
 * UNIFIED DASHBOARD CONTAINER
 * 
 * Orchestrates role-based dashboard rendering while maintaining
 * unified tab navigation and consistent data flow.
 * 
 * PHASE 0: Architectural Unification
 * Replaces: OverviewPage + RoleDashboardSelector
 * Status: New Component (non-breaking)
 */

import React, { useState, useEffect } from 'react';
import { useApp } from '../../contexts/AppContext';
import { Loading } from '../Common/Loading';
import ApiService from '../../api';

// Import role-specific dashboards
import { AdminDashboard } from './AdminDashboard';
import { DashboardBroker } from './DashboardBroker';
import { DashboardOwner } from './DashboardOwner';
import { DashboardParty } from './DashboardParty';
import { DashboardCharterer } from './DashboardCharterer';
import { DashboardInspector } from './DashboardInspector';
import { DashboardViewer } from './DashboardViewer';

// Fallback to generic overview if role is not specifically handled
import { OverviewPage } from './OverviewPage';

interface UnifiedDashboardProps {
  cockpitData?: any;
  vessels?: any[];
  onRefresh?: () => void;
}

/**
 * DashboardContainer Component
 * 
 * Smart orchestrator that:
 * 1. Loads role-specific dashboard data
 * 2. Renders appropriate dashboard component
 * 3. Maintains unified tab navigation
 * 4. Synchronizes data across all dashboards
 * 5. Provides fallback for generic views
 */
export const DashboardContainer: React.FC<UnifiedDashboardProps> = ({
  cockpitData: propCockpitData,
  vessels: propVessels,
  onRefresh
}) => {
  const { currentRoomId, user, loading: contextLoading, rooms } = useApp();
  
  // Use current room if available, otherwise show loading
  if (!user) {
    return <Loading message="Loading user information..." />;
  }
  
  if (!currentRoomId || (rooms.length === 0 && contextLoading)) {
    return <Loading message="Initializing your dashboard..." />;
  }
  
  // State management
  const [dashboardData, setDashboardData] = useState<any>(propCockpitData);
  const [vessels, setVessels] = useState<any[]>(propVessels || []);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dataRefreshTimestamp, setDataRefreshTimestamp] = useState(Date.now());

  /**
   * Load unified dashboard data
   * Fetches role-specific endpoint if available, otherwise generic endpoint
   */
  const loadDashboardData = async () => {
    if (!currentRoomId || !user) return;

    try {
      setLoading(true);
      setError(null);

      let dashboardDataResponse: any;
      
      // Use the unified dashboard endpoint - backend handles role detection via JWT
      try {
        const response = await ApiService.get(`/api/v1/dashboard/overview`);
        dashboardDataResponse = response.data || response;
      } catch {
        // Fallback to generic room summary
        console.warn(`Dashboard endpoint not available, using room summary`);
        dashboardDataResponse = await ApiService.getRoomSummary(currentRoomId);
      }

      // Always load vessels data
      const vesselsData = await ApiService.getVessels(currentRoomId);
      
      // Filter vessels based on role
      const filteredVessels = filterVesselsByRole(vesselsData);

      setDashboardData(dashboardDataResponse);
      setVessels(filteredVessels);
      setDataRefreshTimestamp(Date.now());
    } catch (err) {
      console.error('Error loading dashboard data:', err);
      setError('Failed to load dashboard data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Filter vessels based on user role
   */
  const filterVesselsByRole = (allVessels: any[]): any[] => {
    if (!user) return [];

    return allVessels.filter((vessel: any) => {
      switch (user.role?.toLowerCase()) {
        case 'broker':
        case 'admin':
        case 'inspector':
          // These roles see all vessels
          return true;

        case 'charterer':
          // Charterers see vessels they charter
          return user.vesselImos?.includes(vessel.imo) || false;

        case 'owner':
        case 'shipowner':
          // Owners see only their vessels
          return user.vesselImos?.includes(vessel.imo) || false;

        case 'seller':
        case 'buyer':
          // Party roles see relevant vessels
          return user.vesselImos?.includes(vessel.imo) || false;

        case 'viewer':
          // Viewers see nothing (or limited access)
          return false;

        default:
          return false;
      }
    });
  };

  /**
   * Refresh data on demand
   */
  const handleRefresh = async () => {
    await loadDashboardData();
    onRefresh?.();
  };

  // Load data on mount or when currentRoomId changes
  useEffect(() => {
    loadDashboardData();
  }, [currentRoomId, user?.id]);

  // Show loading state
  if (contextLoading || loading) {
    return (
      <Loading message={`Loading ${user?.role || 'your'} dashboard...`} />
    );
  }

  // Show error state
  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="card max-w-md">
          <div className="card-body">
            <h3 className="text-lg font-semibold text-danger-600 mb-2">Error Loading Dashboard</h3>
            <p className="text-secondary-600 mb-4">{error}</p>
            <button
              onClick={handleRefresh}
              className="btn-primary w-full"
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Render appropriate dashboard based on role
  const roleLower = user?.role?.toLowerCase();

  try {
    switch (roleLower) {
      case 'admin':
        return <AdminDashboard />;

      case 'broker':
        return <DashboardBroker />;

      case 'owner':
      case 'shipowner':
        return <DashboardOwner />;

      case 'charterer':
        return <DashboardCharterer />;

      case 'inspector':
        return <DashboardInspector />;

      case 'seller':
      case 'buyer':
        return <DashboardParty />;

      case 'viewer':
        return <DashboardViewer />;

      default:
        // Fallback to generic overview for unknown roles
        return (
          <OverviewPage
            cockpitData={dashboardData}
            vessels={vessels}
          />
        );
    }
  } catch (componentError) {
    console.error('Error rendering dashboard component:', componentError);
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="card max-w-md">
          <div className="card-body">
            <h3 className="text-lg font-semibold text-danger-600 mb-2">Dashboard Render Error</h3>
            <p className="text-secondary-600 mb-4">Unable to render dashboard for role: {user?.role}</p>
            <button
              onClick={() => window.location.reload()}
              className="btn-primary w-full"
            >
              Reload Page
            </button>
          </div>
        </div>
      </div>
    );
  }
};

export default DashboardContainer;
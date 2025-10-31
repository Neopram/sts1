import React from 'react';
import { useApp } from '../../contexts/AppContext';
import { Loading } from '../Common/Loading';
import { AdminDashboard } from './AdminDashboard';
import { DashboardBroker } from './DashboardBroker';
import { DashboardOwner } from './DashboardOwner';
import { DashboardParty } from './DashboardParty';
import { DashboardCharterer } from './DashboardCharterer';
import { DashboardViewer } from './DashboardViewer';
import { DashboardLayout } from './DashboardLayout';

/**
 * RoleDashboardSelector Component
 * 
 * This component determines which dashboard to display based on the user's role.
 * It acts as a smart router for role-specific UI experiences.
 * 
 * Supported roles:
 * - admin: Admin Control Center
 * - broker: Broker Operations Center
 * - owner: Vessel Owner Portal
 * - seller/buyer: My Transactions Dashboard
 * - viewer: View-Only Mode
 * - charterer: Falls back to Overview (can be customized)
 */
export const RoleDashboardSelector: React.FC = () => {
  const { user, loading } = useApp();

  // Show loading while user data is being fetched
  if (loading || !user) {
    return <Loading message="Loading your personalized dashboard..." />;
  }

  // Route to appropriate dashboard based on role
  switch (user.role) {
    case 'admin':
      return (
        <DashboardLayout title="Admin Control Center" icon="📊">
          <AdminDashboard />
        </DashboardLayout>
      );

    case 'broker':
      return (
        <DashboardLayout title="Broker Operations Center" icon="🏢">
          <DashboardBroker />
        </DashboardLayout>
      );

    case 'owner':
      return (
        <DashboardLayout title="Vessel Owner Portal" icon="⚓">
          <DashboardOwner />
        </DashboardLayout>
      );

    case 'seller':
    case 'buyer':
      return (
        <DashboardLayout title="My Transactions" icon="🛒">
          <DashboardParty />
        </DashboardLayout>
      );

    case 'viewer':
      return (
        <DashboardLayout title="View-Only Mode" icon="👁️">
          <DashboardViewer />
        </DashboardLayout>
      );

    case 'charterer':
      return (
        <DashboardLayout title="Charter Operations" icon="⚓">
          <DashboardCharterer />
        </DashboardLayout>
      );

    default:
      // Fallback to a generic message
      return (
        <DashboardLayout title="Welcome" icon="👋">
          <div className="p-6">
            <h1 className="text-2xl font-bold text-gray-900 mb-4">Welcome</h1>
            <p className="text-gray-600">
              Your role "{user.role}" does not have a custom dashboard configured yet.
            </p>
          </div>
        </DashboardLayout>
      );
  }
};

export default RoleDashboardSelector;
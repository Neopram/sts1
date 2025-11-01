import { createBrowserRouter, Navigate } from 'react-router-dom';
import STSClearanceApp from '../sts-clearance-app';
import SettingsPage from './components/Pages/SettingsPage';
import ProfilePage from './components/Pages/ProfilePage';
import NotificationsPage from './components/Pages/NotificationsPage';
import HelpPage from './components/Pages/HelpPage';
import LoginPage from './components/Pages/LoginPage';
import RegisterPage from './components/Pages/RegisterPage';
import RegionalOperationsPage from './components/Pages/RegionalOperationsPage';
import SanctionsCheckerPage from './components/Pages/SanctionsCheckerPage';
import ApprovalMatrixPage from './components/Pages/ApprovalMatrixPage';
import { DashboardCustomizationPage } from './components/Pages/DashboardCustomizationPage';
import { AdvancedFilteringPage } from './components/Pages/AdvancedFilteringPage';
import { RolePermissionMatrixPage } from './components/Pages/RolePermissionMatrixPage';
import PerformanceDashboardPage from './components/Pages/PerformanceDashboardPage';
import { AdminDashboard } from './components/Pages/AdminDashboard';
import { RoleDashboardSelector } from './components/Pages/RoleDashboardSelector';
import { DashboardContainer } from './components/Pages/DashboardContainer'; // NEW: Unified dashboard
import RoomDetailPage from './components/Pages/RoomDetailPage';
import UserManagementPage from './components/Pages/UserManagementPage';
import VesselManagementPage from './components/Pages/VesselManagementPage';

export const router = createBrowserRouter([
  {
    path: '/login',
    element: <LoginPage />
  },
  {
    path: '/register',
    element: <RegisterPage />
  },
  {
    path: '/',
    element: <STSClearanceApp />,
    children: [
      {
        index: true,
        element: <Navigate to="/overview" replace />
      },
      {
        path: 'dashboard',
        element: <DashboardContainer /> // PHASE 0: Unified dashboard (replaces RoleDashboardSelector)
      },
      {
        path: 'rooms/:roomId',
        element: <RoomDetailPage />
      },
      {
        path: 'users',
        element: <UserManagementPage />
      },
      {
        path: 'vessels',
        element: <VesselManagementPage />
      },
      {
        path: 'overview',
        element: <STSClearanceApp />
      },
      {
        path: 'documents',
        element: <STSClearanceApp />
      },
      {
        path: 'missing',
        element: <STSClearanceApp />
      },
      {
        path: 'approval',
        element: <STSClearanceApp />
      },
      {
        path: 'activity',
        element: <STSClearanceApp />
      },
      {
        path: 'history',
        element: <STSClearanceApp />
      },
      {
        path: 'messages',
        element: <STSClearanceApp />
      },
      {
        path: 'settings',
        element: <SettingsPage />
      },
      {
        path: 'profile',
        element: <ProfilePage />
      },
      {
        path: 'notifications',
        element: <NotificationsPage />
      },
      {
        path: 'help',
        element: <HelpPage />
      },
      {
        path: 'regional-operations',
        element: <RegionalOperationsPage />
      },
      {
        path: 'sanctions-checker',
        element: <SanctionsCheckerPage />
      },
      {
        path: 'approval-matrix',
        element: <ApprovalMatrixPage />
      },
      {
        path: 'dashboard-customization',
        element: <DashboardCustomizationPage />
      },
      {
        path: 'advanced-filtering',
        element: <AdvancedFilteringPage />
      },
      {
        path: 'role-permission-matrix',
        element: <RolePermissionMatrixPage />
      },
      {
        path: 'performance-dashboard',
        element: <PerformanceDashboardPage />
      },
      {
        path: 'admin-dashboard',
        element: <AdminDashboard />
      }
    ]
  }
]);

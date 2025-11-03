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
import { DashboardContainer } from './components/Pages/DashboardContainer'; // Unified dashboard
import RoomDetailPage from './components/Pages/RoomDetailPage';
import UserManagementPage from './components/Pages/UserManagementPage';
import VesselManagementPage from './components/Pages/VesselManagementPage';
import { ChatPage } from './pages/ChatPage';  // PHASE 4: Chat implementation
import { ProtectedRoute } from './components/ProtectedRoute';
import { RouteGuard } from './components/RouteGuard';  // RBAC: Route guard
import { SessionCreationPage } from './components/Pages/SessionCreationPage';  // RBAC: Session creation

/**
 * Simple 404 Not Found Page Component
 */
const NotFoundPage = () => (
  <div className="min-h-screen bg-secondary-50 flex items-center justify-center">
    <div className="text-center">
      <h1 className="text-6xl font-bold text-secondary-900 mb-4">404</h1>
      <p className="text-lg text-secondary-600 mb-8">Page not found</p>
      <a href="/" className="btn-primary">
        Go Home
      </a>
    </div>
  </div>
);

/**
 * FIXED ROUTER CONFIGURATION
 * 
 * Changes from original:
 * 1. Removed duplicate STSClearanceApp routes (overview, documents, missing, etc. are handled by STSClearanceApp internally)
 * 2. Removed double ProtectedRoute wrapping - child routes inherit from parent
 * 3. Removed RoleDashboardSelector (replaced by DashboardContainer)
 * 4. Added catch-all 404 route at the end
 * 5. Tab routes (overview, documents, etc) are handled by STSClearanceApp via URL matching
 */
export const router = createBrowserRouter([
  // PUBLIC ROUTES
  {
    path: '/login',
    element: <LoginPage />
  },
  {
    path: '/register',
    element: <RegisterPage />
  },
  
  // PROTECTED ROUTES (all children inherit ProtectedRoute from parent)
  {
    path: '/',
    element: <ProtectedRoute><STSClearanceApp /></ProtectedRoute>,
    children: [
      {
        index: true,
        element: <Navigate to="/overview" replace />
      },
      // NOTE: Tab routes (overview, documents, missing, approval, activity, history, messages)
      // are handled by STSClearanceApp component directly via URL matching
      // They don't need separate route definitions here
      
      // RBAC: Create Operation (STS Session)
      // Access: Admin, Broker, Charterer, Owner only
      {
        path: 'create-operation',
        element: <RouteGuard><SessionCreationPage /></RouteGuard>
      },
      
      // Non-tab routes (don't use TabNavigation)
      {
        path: 'dashboard',
        element: <DashboardContainer /> // No extra ProtectedRoute needed
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
        path: 'chat',
        element: <ChatPage /> // PHASE 4: Chat page
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
  },
  
  // CATCH-ALL 404 ROUTE (must be last)
  {
    path: '*',
    element: <NotFoundPage />
  }
]);

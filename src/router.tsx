import { createBrowserRouter, Navigate } from 'react-router-dom';
import STSClearanceApp from '../sts-clearance-app';
import SettingsPage from './components/Pages/SettingsPage';
import ProfilePage from './components/Pages/ProfilePage';
import NotificationsPage from './components/Pages/NotificationsPage';
import HelpPage from './components/Pages/HelpPage';

export const router = createBrowserRouter([
  {
    path: '/',
    element: <STSClearanceApp />,
    children: [
      {
        index: true,
        element: <Navigate to="/overview" replace />
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
      }
    ]
  }
]);

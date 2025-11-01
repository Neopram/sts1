/**
 * App Initializer Component
 * Sets up theme, session timeout, and other app-level features
 * Should wrap the entire app after RouterProvider
 */

import React, { useEffect, useCallback } from 'react';
import { useTheme } from '../hooks/useTheme';
import { useSessionTimeout } from '../hooks/useSessionTimeout';
import { SessionTimeoutWarning } from './SessionTimeoutWarning';
import { useApp } from '../contexts/AppContext';

interface AppInitializerProps {
  children: React.ReactNode;
}

export const AppInitializer: React.FC<AppInitializerProps> = ({ children }) => {
  const { theme, isDark, setTheme } = useTheme();
  const { user } = useApp();

  // Session timeout settings from user preferences
  const sessionTimeoutMinutes = parseInt(
    localStorage.getItem('session-timeout') || '30',
    10
  );
  const warningMinutes = Math.ceil(sessionTimeoutMinutes * 0.167); // ~5 mins or 16.7% of timeout

  const handleSessionTimeout = useCallback(() => {
    // Logout user
    localStorage.removeItem('auth-token');
    window.location.href = '/login';
  }, []);

  const handleSessionWarning = useCallback(() => {
    // Could trigger a notification here
    console.warn('Session timeout warning shown');
  }, []);

  const {
    isWarningVisible,
    timeRemaining,
    dismissWarning,
    extendSession,
    resetInactivity
  } = useSessionTimeout({
    timeoutMinutes: sessionTimeoutMinutes,
    warningMinutes: warningMinutes,
    onWarning: handleSessionWarning,
    onTimeout: handleSessionTimeout
  });

  // Load user settings on app startup
  useEffect(() => {
    if (user) {
      // Load saved preferences from localStorage if available
      const savedTheme = localStorage.getItem('app-theme') as any;
      const savedSessionTimeout = localStorage.getItem('session-timeout');

      if (savedTheme && savedTheme !== theme) {
        setTheme(savedTheme);
      }

      if (savedSessionTimeout) {
        console.log(`Session timeout set to: ${savedSessionTimeout} minutes`);
      }
    }
  }, [user, theme, setTheme]);

  // Keyboard shortcut to toggle theme (Ctrl+Shift+T)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'T') {
        e.preventDefault();
        setTheme(isDark ? 'light' : 'dark');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isDark, setTheme]);

  return (
    <>
      {children}
      {user && (
        <SessionTimeoutWarning
          isVisible={isWarningVisible}
          timeRemaining={timeRemaining}
          onExtend={extendSession}
          onLogout={handleSessionTimeout}
        />
      )}
    </>
  );
};
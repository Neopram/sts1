/**
 * Session Timeout Warning Dialog Component
 * Shows warning when user is about to be logged out
 */

import React from 'react';
import { AlertCircle } from 'lucide-react';

interface SessionTimeoutWarningProps {
  isVisible: boolean;
  timeRemaining: number;
  onExtend: () => void;
  onLogout: () => void;
}

export const SessionTimeoutWarning: React.FC<SessionTimeoutWarningProps> = ({
  isVisible,
  timeRemaining,
  onExtend,
  onLogout
}) => {
  if (!isVisible) {
    return null;
  }

  const minutes = Math.floor(timeRemaining / 60);
  const seconds = timeRemaining % 60;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9999]">
      <div className="bg-white dark:bg-gray-900 rounded-lg shadow-xl p-6 max-w-md w-full mx-4">
        <div className="flex items-center gap-3 mb-4">
          <AlertCircle className="w-6 h-6 text-yellow-500 flex-shrink-0" />
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            Session Expiring Soon
          </h2>
        </div>

        <p className="text-gray-600 dark:text-gray-300 mb-4">
          Your session will expire in{' '}
          <span className="font-semibold text-red-600 dark:text-red-400">
            {minutes}:{seconds.toString().padStart(2, '0')}
          </span>
        </p>

        <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
          Please save your work. Click "Continue Session" to stay logged in or you will be automatically logged out.
        </p>

        <div className="flex gap-3">
          <button
            onClick={onLogout}
            className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-200 dark:bg-gray-700 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
          >
            Logout Now
          </button>
          <button
            onClick={onExtend}
            className="flex-1 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Continue Session
          </button>
        </div>
      </div>
    </div>
  );
};
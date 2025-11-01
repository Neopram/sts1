/**
 * Connection Status Component
 * Shows the current connection status with the backend
 */

import React, { useState, useEffect } from 'react';
import { useHealthCheck } from '../hooks/useApi';

interface ConnectionStatusProps {
  showDetails?: boolean;
  className?: string;
}

const ConnectionStatus: React.FC<ConnectionStatusProps> = ({ 
  showDetails = false, 
  className = '' 
}) => {
  const { data, loading, error, success, execute } = useHealthCheck();
  const [lastChecked, setLastChecked] = useState<Date | null>(null);

  // Auto-refresh every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      execute();
      setLastChecked(new Date());
    }, 30000);

    return () => clearInterval(interval);
  }, [execute]);

  const getStatusColor = () => {
    if (loading) return 'text-yellow-500';
    if (error) return 'text-red-500';
    if (success && data?.status === 'healthy') return 'text-green-500';
    return 'text-gray-500';
  };

  const getStatusText = () => {
    if (loading) return 'Checking...';
    if (error) return 'Disconnected';
    if (success && data?.status === 'healthy') return 'Connected';
    return 'Unknown';
  };

  const getStatusIcon = () => {
    if (loading) return '🔄';
    if (error) return '❌';
    if (success && data?.status === 'healthy') return '✅';
    return '❓';
  };

  return (
    <div className={`flex items-center space-x-2 ${className}`}>
      <span className="text-sm">
        {getStatusIcon()}
      </span>
      
      <span className={`text-sm font-medium ${getStatusColor()}`}>
        {getStatusText()}
      </span>

      {showDetails && (
        <div className="ml-2 text-xs text-gray-500">
          {lastChecked && (
            <span>
              Last checked: {lastChecked.toLocaleTimeString()}
            </span>
          )}
          {data?.timestamp && (
            <span className="ml-2">
              Response time: {data.timestamp}
            </span>
          )}
        </div>
      )}

      {error && showDetails && (
        <div className="ml-2 text-xs text-red-500">
          Error: {error}
        </div>
      )}
    </div>
  );
};

export default ConnectionStatus;

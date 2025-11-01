/**
 * Connectivity Test Component
 * Tests all backend connections and shows results
 */

import React, { useState } from 'react';
import ApiService from '../api';
// import { useHealthCheck, useCacheStats } from '../hooks/useApi';

interface TestResult {
  name: string;
  status: 'success' | 'error' | 'pending';
  message: string;
  responseTime?: number;
}

const ConnectivityTest: React.FC = () => {
  const [results, setResults] = useState<TestResult[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const api = new ApiService();

  const runConnectivityTest = async () => {
    setIsRunning(true);
    setResults([]);

    const tests: Array<{
      name: string;
      test: () => Promise<TestResult>;
    }> = [
      {
        name: 'Health Check',
        test: async () => {
          const start = Date.now();
          try {
            const response = await api.healthCheck();
            const responseTime = Date.now() - start;
            
            if (response.status === 200) {
              return {
                name: 'Health Check',
                status: 'success',
                message: 'Backend is healthy',
                responseTime
              };
            } else {
              return {
                name: 'Health Check',
                status: 'error',
                message: `Unexpected status: ${response.status}`
              };
            }
          } catch (error) {
            return {
              name: 'Health Check',
              status: 'error',
              message: error instanceof Error ? error.message : 'Unknown error'
            };
          }
        }
      },
      {
        name: 'Authentication',
        test: async () => {
          const start = Date.now();
          try {
            // Test login endpoint
            const response = await fetch(`${api['baseURL']}/api/v1/auth/login`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ email: 'test@example.com', password: 'test' })
            });
            const responseTime = Date.now() - start;
            
            if (response.status === 200 || response.status === 400) {
              return {
                name: 'Authentication',
                status: 'success',
                message: 'Auth endpoint responding',
                responseTime
              };
            } else {
              return {
                name: 'Authentication',
                status: 'error',
                message: `Unexpected status: ${response.status}`
              };
            }
          } catch (error) {
            return {
              name: 'Authentication',
              status: 'error',
              message: error instanceof Error ? error.message : 'Unknown error'
            };
          }
        }
      },
      {
        name: 'Configuration',
        test: async () => {
          const start = Date.now();
          try {
            const response = await ApiService.getSystemInfo();
            const responseTime = Date.now() - start;
            
            if (response.status === 200) {
              return {
                name: 'Configuration',
                status: 'success',
                message: 'Config endpoints working',
                responseTime
              };
            } else {
              return {
                name: 'Configuration',
                status: 'error',
                message: `Unexpected status: ${response.status}`
              };
            }
          } catch (error) {
            return {
              name: 'Configuration',
              status: 'error',
              message: error instanceof Error ? error.message : 'Unknown error'
            };
          }
        }
      },
      {
        name: 'Cache System',
        test: async () => {
          const start = Date.now();
          try {
            const response = await api.getCacheStats();
            const responseTime = Date.now() - start;
            
            if (response.status === 200) {
              return {
                name: 'Cache System',
                status: 'success',
                message: 'Cache system operational',
                responseTime
              };
            } else {
              return {
                name: 'Cache System',
                status: 'error',
                message: `Unexpected status: ${response.status}`
              };
            }
          } catch (error) {
            return {
              name: 'Cache System',
              status: 'error',
              message: error instanceof Error ? error.message : 'Unknown error'
            };
          }
        }
      },
      {
        name: 'Search Endpoints',
        test: async () => {
          const start = Date.now();
          try {
            const response = await fetch(`${api['baseURL']}/api/v1/search?q=test`, {
              headers: { 'Authorization': `Bearer ${localStorage.getItem('auth-token') || 'test'}` }
            });
            const responseTime = Date.now() - start;
            
            if (response.status === 401 || response.status === 200) {
              return {
                name: 'Search Endpoints',
                status: 'success',
                message: 'Search endpoints responding',
                responseTime
              };
            } else {
              return {
                name: 'Search Endpoints',
                status: 'error',
                message: `Unexpected status: ${response.status}`
              };
            }
          } catch (error) {
            return {
              name: 'Search Endpoints',
              status: 'error',
              message: error instanceof Error ? error.message : 'Unknown error'
            };
          }
        }
      },
      {
        name: 'WebSocket Connection',
        test: async () => {
          const start = Date.now();
          try {
            // Test WebSocket endpoint
            const wsUrl = `${api['baseURL'].replace('http', 'ws')}/ws/test-room`;
            const ws = new WebSocket(wsUrl);
            
            return new Promise<TestResult>((resolve) => {
              const timeout = setTimeout(() => {
                ws.close();
                resolve({
                  name: 'WebSocket Connection',
                  status: 'error',
                  message: 'Connection timeout'
                });
              }, 5000);

              ws.onopen = () => {
                clearTimeout(timeout);
                const responseTime = Date.now() - start;
                ws.close();
                resolve({
                  name: 'WebSocket Connection',
                  status: 'success',
                  message: 'WebSocket connection successful',
                  responseTime
                });
              };

              ws.onerror = () => {
                clearTimeout(timeout);
                resolve({
                  name: 'WebSocket Connection',
                  status: 'error',
                  message: 'WebSocket connection failed'
                });
              };
            });
          } catch (error) {
            return {
              name: 'WebSocket Connection',
              status: 'error',
              message: error instanceof Error ? error.message : 'Unknown error'
            };
          }
        }
      }
    ];

    // Run tests sequentially
    for (const test of tests) {
      setResults(prev => [...prev, {
        name: test.name,
        status: 'pending',
        message: 'Running...'
      }]);

      const result = await test.test();
      
      setResults(prev => prev.map(r => 
        r.name === test.name ? result : r
      ));

      // Small delay between tests
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    setIsRunning(false);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success': return '✅';
      case 'error': return '❌';
      case 'pending': return '🔄';
      default: return '❓';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'success': return 'text-green-600';
      case 'error': return 'text-red-600';
      case 'pending': return 'text-yellow-600';
      default: return 'text-gray-600';
    }
  };

  const successCount = results.filter(r => r.status === 'success').length;
  const totalCount = results.length;
  const successRate = totalCount > 0 ? Math.round((successCount / totalCount) * 100) : 0;

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">
          Backend Connectivity Test
        </h3>
        <button
          onClick={runConnectivityTest}
          disabled={isRunning}
          className={`px-4 py-2 rounded-md font-medium ${
            isRunning
              ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
              : 'bg-blue-600 text-white hover:bg-blue-700'
          }`}
        >
          {isRunning ? 'Testing...' : 'Run Test'}
        </button>
      </div>

      {results.length > 0 && (
        <div className="mb-4">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">
              Overall Status: {successCount}/{totalCount} tests passed
            </span>
            <span className={`text-sm font-medium ${
              successRate >= 80 ? 'text-green-600' : 
              successRate >= 60 ? 'text-yellow-600' : 'text-red-600'
            }`}>
              {successRate}% Success Rate
            </span>
          </div>
          
          <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
            <div
              className={`h-2 rounded-full transition-all duration-300 ${
                successRate >= 80 ? 'bg-green-500' : 
                successRate >= 60 ? 'bg-yellow-500' : 'bg-red-500'
              }`}
              style={{ width: `${successRate}%` }}
            />
          </div>
        </div>
      )}

      <div className="space-y-2">
        {results.map((result, index) => (
          <div
            key={index}
            className="flex items-center justify-between p-3 bg-gray-50 rounded-md"
          >
            <div className="flex items-center space-x-3">
              <span className="text-lg">{getStatusIcon(result.status)}</span>
              <div>
                <span className={`font-medium ${getStatusColor(result.status)}`}>
                  {result.name}
                </span>
                <div className="text-sm text-gray-600">
                  {result.message}
                </div>
              </div>
            </div>
            
            {result.responseTime && (
              <span className="text-sm text-gray-500">
                {result.responseTime}ms
              </span>
            )}
          </div>
        ))}
      </div>

      {results.length === 0 && !isRunning && (
        <div className="text-center text-gray-500 py-8">
          Click "Run Test" to check backend connectivity
        </div>
      )}
    </div>
  );
};

export default ConnectivityTest;

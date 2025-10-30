import React, { useState, useEffect } from 'react';
import { BarChart3, AlertTriangle, Zap, Cpu, TrendingDown, RefreshCw } from 'lucide-react';
import {
  performanceMonitor,
  cacheManager,
  memoryOptimizer,
  getPerformanceDashboardData,
  QueryOptimizationGuide
} from '../utils/performanceOptimization';

interface DashboardData {
  cacheStats: any;
  performanceSummary: any;
  memoryUsage: any;
  slowOperations: any[];
  queryOptimizationTips: any[];
}

export const PerformanceDashboardPage: React.FC = () => {
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  useEffect(() => {
    loadDashboardData();
    
    if (autoRefresh) {
      const interval = setInterval(loadDashboardData, 5000);
      return () => clearInterval(interval);
    }
  }, [autoRefresh]);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      const data = await getPerformanceDashboardData();
      setDashboardData(data);
    } catch (error) {
      console.error('Error loading performance data:', error);
    } finally {
      setLoading(false);
    }
  };

  const clearCache = () => {
    cacheManager.clear();
    loadDashboardData();
  };

  const startAutoCleanup = () => {
    memoryOptimizer.startAutoCleanup(5 * 60 * 1000);
  };

  const metrics = performanceMonitor.getMetrics(selectedCategory === 'all' ? undefined : selectedCategory);
  const avgDuration = metrics.length > 0 
    ? metrics.reduce((sum, m) => sum + m.duration, 0) / metrics.length 
    : 0;

  if (loading || !dashboardData) {
    return <div className="flex items-center justify-center h-screen text-white">Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <BarChart3 className="w-8 h-8 text-blue-400" />
              <div>
                <h1 className="text-3xl font-bold text-white">Performance Dashboard</h1>
                <p className="text-slate-400 mt-1">Monitor and optimize application performance</p>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={loadDashboardData}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
              >
                <RefreshCw className="w-4 h-4" />
                Refresh
              </button>
              <label className="flex items-center gap-2 px-4 py-2 bg-slate-700 text-white rounded-lg cursor-pointer hover:bg-slate-600">
                <input
                  type="checkbox"
                  checked={autoRefresh}
                  onChange={(e) => setAutoRefresh(e.target.checked)}
                  className="w-4 h-4"
                />
                <span className="text-sm">Auto Refresh</span>
              </label>
            </div>
          </div>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-4 gap-4 mb-8">
          <div className="bg-slate-800 rounded-lg p-4 border border-slate-700">
            <div className="flex items-center justify-between mb-2">
              <p className="text-slate-400 text-sm">Cache Size</p>
              <Cpu className="w-4 h-4 text-green-400" />
            </div>
            <p className="text-3xl font-bold text-white">{dashboardData.cacheStats.size}</p>
            <p className="text-xs text-slate-500">/ {dashboardData.cacheStats.maxSize} max</p>
          </div>

          <div className="bg-slate-800 rounded-lg p-4 border border-slate-700">
            <div className="flex items-center justify-between mb-2">
              <p className="text-slate-400 text-sm">Cache Hits</p>
              <Zap className="w-4 h-4 text-yellow-400" />
            </div>
            <p className="text-3xl font-bold text-white">{dashboardData.cacheStats.totalHits}</p>
            <p className="text-xs text-slate-500">Total hits</p>
          </div>

          <div className="bg-slate-800 rounded-lg p-4 border border-slate-700">
            <div className="flex items-center justify-between mb-2">
              <p className="text-slate-400 text-sm">Avg Response</p>
              <TrendingDown className="w-4 h-4 text-blue-400" />
            </div>
            <p className="text-3xl font-bold text-white">{avgDuration.toFixed(0)}</p>
            <p className="text-xs text-slate-500">milliseconds</p>
          </div>

          <div className="bg-slate-800 rounded-lg p-4 border border-slate-700">
            <div className="flex items-center justify-between mb-2">
              <p className="text-slate-400 text-sm">Slow Ops</p>
              <AlertTriangle className="w-4 h-4 text-red-400" />
            </div>
            <p className="text-3xl font-bold text-white">{dashboardData.slowOperations.length}</p>
            <p className="text-xs text-slate-500">&gt; 1000ms</p>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-6">
          {/* Cache Management */}
          <div className="col-span-1 bg-slate-800 rounded-lg p-4 border border-slate-700">
            <h3 className="text-lg font-semibold text-white mb-4">Cache Management</h3>
            <div className="space-y-3">
              <div className="p-3 bg-slate-700 rounded">
                <p className="text-slate-300 text-sm mb-2">Cache utilization: {Math.round((dashboardData.cacheStats.size / dashboardData.cacheStats.maxSize) * 100)}%</p>
                <div className="w-full bg-slate-600 rounded h-2">
                  <div
                    className="bg-blue-500 h-2 rounded"
                    style={{ width: `${(dashboardData.cacheStats.size / dashboardData.cacheStats.maxSize) * 100}%` }}
                  />
                </div>
              </div>
              <button
                onClick={clearCache}
                className="w-full px-3 py-2 bg-red-600 text-white rounded hover:bg-red-700 text-sm"
              >
                Clear Cache
              </button>
              <button
                onClick={startAutoCleanup}
                className="w-full px-3 py-2 bg-slate-700 text-white rounded hover:bg-slate-600 text-sm"
              >
                Start Auto-Cleanup
              </button>
            </div>
          </div>

          {/* Memory Usage */}
          <div className="col-span-1 bg-slate-800 rounded-lg p-4 border border-slate-700">
            <h3 className="text-lg font-semibold text-white mb-4">Memory Usage</h3>
            {dashboardData.memoryUsage ? (
              <div className="space-y-3">
                <div className="text-sm">
                  <p className="text-slate-400">Used: <span className="text-white font-semibold">{(dashboardData.memoryUsage.usedJSHeapSize / 1048576).toFixed(2)} MB</span></p>
                  <p className="text-slate-400">Total: <span className="text-white font-semibold">{(dashboardData.memoryUsage.totalJSHeapSize / 1048576).toFixed(2)} MB</span></p>
                  <p className="text-slate-400">Limit: <span className="text-white font-semibold">{(dashboardData.memoryUsage.jsHeapSizeLimit / 1048576).toFixed(2)} MB</span></p>
                </div>
                <div className="p-3 bg-slate-700 rounded">
                  <p className="text-slate-300 text-xs mb-2">Memory usage: {Math.round((dashboardData.memoryUsage.usedJSHeapSize / dashboardData.memoryUsage.jsHeapSizeLimit) * 100)}%</p>
                  <div className="w-full bg-slate-600 rounded h-2">
                    <div
                      className="bg-yellow-500 h-2 rounded"
                      style={{ width: `${(dashboardData.memoryUsage.usedJSHeapSize / dashboardData.memoryUsage.jsHeapSizeLimit) * 100}%` }}
                    />
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-slate-400 text-sm">Memory API not available</p>
            )}
          </div>

          {/* Performance Metrics by Category */}
          <div className="col-span-1 bg-slate-800 rounded-lg p-4 border border-slate-700">
            <h3 className="text-lg font-semibold text-white mb-4">Metrics by Category</h3>
            <div className="space-y-2">
              {dashboardData.performanceSummary.categories?.map((category: string) => {
                const categoryMetrics = performanceMonitor.getMetrics(category);
                const avgTime = categoryMetrics.length > 0
                  ? categoryMetrics.reduce((sum, m) => sum + m.duration, 0) / categoryMetrics.length
                  : 0;
                return (
                  <button
                    key={category}
                    onClick={() => setSelectedCategory(category)}
                    className={`w-full text-left px-3 py-2 rounded text-sm transition ${
                      selectedCategory === category
                        ? 'bg-blue-600 text-white'
                        : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span>{category}</span>
                      <span className="text-xs">{avgTime.toFixed(0)}ms</span>
                    </div>
                  </button>
                );
              })}
              <button
                onClick={() => setSelectedCategory('all')}
                className={`w-full text-left px-3 py-2 rounded text-sm transition ${
                  selectedCategory === 'all'
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span>All</span>
                  <span className="text-xs">{avgDuration.toFixed(0)}ms</span>
                </div>
              </button>
            </div>
          </div>
        </div>

        {/* Slow Operations */}
        {dashboardData.slowOperations.length > 0 && (
          <div className="mt-6 bg-slate-800 rounded-lg p-4 border border-slate-700">
            <div className="flex items-center gap-2 mb-4">
              <AlertTriangle className="w-5 h-5 text-red-400" />
              <h3 className="text-lg font-semibold text-white">Slow Operations</h3>
              <span className="text-sm text-slate-400">({dashboardData.slowOperations.length})</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-slate-400 border-b border-slate-700">
                    <th className="text-left p-2">Operation</th>
                    <th className="text-left p-2">Duration (ms)</th>
                    <th className="text-left p-2">Category</th>
                    <th className="text-left p-2">Timestamp</th>
                  </tr>
                </thead>
                <tbody>
                  {dashboardData.slowOperations.map((op, index) => (
                    <tr key={index} className="border-b border-slate-700 hover:bg-slate-700">
                      <td className="p-2 text-slate-300">{op.name}</td>
                      <td className="p-2 text-red-400 font-semibold">{op.duration.toFixed(2)}</td>
                      <td className="p-2 text-slate-400">{op.category}</td>
                      <td className="p-2 text-slate-500">{new Date(op.timestamp).toLocaleTimeString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Query Optimization Tips */}
        <div className="mt-6 bg-slate-800 rounded-lg p-4 border border-slate-700">
          <h3 className="text-lg font-semibold text-white mb-4">Query Optimization Tips</h3>
          <div className="grid grid-cols-3 gap-4">
            {QueryOptimizationGuide.getAllTips().map((tip, index) => (
              <div key={index} className="bg-slate-700 rounded p-3">
                <div className="flex items-start gap-2 mb-2">
                  <AlertTriangle className={`w-4 h-4 flex-shrink-0 mt-0.5 ${
                    tip.impact === 'high' ? 'text-red-400' :
                    tip.impact === 'medium' ? 'text-yellow-400' :
                    'text-blue-400'
                  }`} />
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-white text-sm">{tip.issue}</p>
                    <span className={`inline-block mt-1 px-2 py-1 text-xs rounded ${
                      tip.impact === 'high' ? 'bg-red-900 text-red-200' :
                      tip.impact === 'medium' ? 'bg-yellow-900 text-yellow-200' :
                      'bg-blue-900 text-blue-200'
                    }`}>
                      {tip.impact.toUpperCase()} IMPACT
                    </span>
                  </div>
                </div>
                <p className="text-slate-300 text-xs">{tip.solution}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Detailed Metrics */}
        <div className="mt-6 bg-slate-800 rounded-lg p-4 border border-slate-700">
          <h3 className="text-lg font-semibold text-white mb-4">Detailed Metrics</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-slate-400 border-b border-slate-700">
                  <th className="text-left p-2">Operation</th>
                  <th className="text-left p-2">Duration (ms)</th>
                  <th className="text-left p-2">Category</th>
                  <th className="text-left p-2">Timestamp</th>
                </tr>
              </thead>
              <tbody>
                {metrics.slice(-20).reverse().map((metric, index) => (
                  <tr key={index} className="border-b border-slate-700 hover:bg-slate-700">
                    <td className="p-2 text-slate-300">{metric.name}</td>
                    <td className={`p-2 font-semibold ${metric.duration > 500 ? 'text-red-400' : 'text-green-400'}`}>
                      {metric.duration.toFixed(2)}
                    </td>
                    <td className="p-2 text-slate-400">{metric.category}</td>
                    <td className="p-2 text-slate-500">{new Date(metric.timestamp).toLocaleTimeString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PerformanceDashboardPage;
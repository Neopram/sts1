/**
 * FASE 5: Performance Monitor Component
 * 
 * Real-time performance monitoring dashboard showing:
 * - Web Vitals (FCP, LCP, FID, CLS, TTFB)
 * - Memory usage
 * - Network performance
 * - Component render metrics
 */

import React, { useState, useEffect } from 'react';
import { usePerformanceMonitoring } from '../hooks/usePerformanceMonitoring';
import { Activity, Zap, BarChart3, AlertTriangle, CheckCircle } from 'lucide-react';

interface MetricStatus {
  good: string[];
  warning: string[];
  critical: string[];
}

export const PerformanceMonitor: React.FC<{ 
  visible?: boolean;
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left';
}> = ({ 
  visible = true, 
  position = 'top-right' 
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [metricStatus, setMetricStatus] = useState<MetricStatus>({
    good: [],
    warning: [],
    critical: []
  });

  const { metrics, trackCustomMetric } = usePerformanceMonitoring(
    'PerformanceMonitor',
    (alert) => {
      console.warn(`⚠️ Performance Alert: ${alert.metric} = ${alert.value.toFixed(2)} (threshold: ${alert.threshold})`);
    },
    false
  );

  // Categorize metrics by status
  useEffect(() => {
    const newStatus: MetricStatus = { good: [], warning: [], critical: [] };

    // Web Vitals thresholds
    const thresholds = {
      fcp: { good: 1800, warning: 3000 },
      lcp: { good: 2500, warning: 4000 },
      fid: { good: 100, warning: 300 },
      cls: { good: 0.1, warning: 0.25 },
      ttfb: { good: 600, warning: 1200 }
    };

    Object.entries(metrics).forEach(([key, value]) => {
      if (value === undefined) return;

      const threshold = (thresholds as any)[key];
      if (!threshold) return;

      if (value <= threshold.good) {
        newStatus.good.push(key.toUpperCase());
      } else if (value <= threshold.warning) {
        newStatus.warning.push(key.toUpperCase());
      } else {
        newStatus.critical.push(key.toUpperCase());
      }
    });

    setMetricStatus(newStatus);
  }, [metrics]);

  if (!visible) return null;

  const positionClasses = {
    'top-right': 'top-4 right-4',
    'top-left': 'top-4 left-4',
    'bottom-right': 'bottom-4 right-4',
    'bottom-left': 'bottom-4 left-4'
  };

  return (
    <div className={`fixed ${positionClasses[position]} z-50 text-sm`}>
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="bg-blue-600 hover:bg-blue-700 text-white rounded-full p-3 shadow-lg transition-all"
        title="Toggle Performance Monitor"
      >
        <Activity size={20} />
      </button>

      {isExpanded && (
        <div className="absolute top-12 right-0 bg-white dark:bg-gray-900 rounded-lg shadow-xl p-4 w-80 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-lg">Performance</h3>
            <button
              onClick={() => setIsExpanded(false)}
              className="text-gray-500 hover:text-gray-700"
            >
              ✕
            </button>
          </div>

          {/* Web Vitals */}
          <div className="space-y-2 mb-4">
            <h4 className="font-semibold flex items-center gap-2 text-gray-700 dark:text-gray-300">
              <Zap size={16} /> Web Vitals
            </h4>
            
            <div className="bg-gray-50 dark:bg-gray-800 rounded p-3 space-y-2 text-xs">
              {metrics.fcp && (
                <div className="flex justify-between">
                  <span>FCP:</span>
                  <span className="font-mono">{metrics.fcp.toFixed(0)}ms</span>
                </div>
              )}
              {metrics.lcp && (
                <div className="flex justify-between">
                  <span>LCP:</span>
                  <span className="font-mono">{metrics.lcp.toFixed(0)}ms</span>
                </div>
              )}
              {metrics.fid && (
                <div className="flex justify-between">
                  <span>FID:</span>
                  <span className="font-mono">{metrics.fid.toFixed(2)}ms</span>
                </div>
              )}
              {metrics.cls && (
                <div className="flex justify-between">
                  <span>CLS:</span>
                  <span className="font-mono">{metrics.cls.toFixed(3)}</span>
                </div>
              )}
              {metrics.ttfb && (
                <div className="flex justify-between">
                  <span>TTFB:</span>
                  <span className="font-mono">{metrics.ttfb.toFixed(0)}ms</span>
                </div>
              )}
            </div>
          </div>

          {/* Memory Usage */}
          {metrics.memoryPercent && (
            <div className="space-y-2 mb-4">
              <h4 className="font-semibold flex items-center gap-2 text-gray-700 dark:text-gray-300">
                <BarChart3 size={16} /> Memory
              </h4>
              
              <div className="bg-gray-50 dark:bg-gray-800 rounded p-3">
                <div className="w-full bg-gray-300 rounded-full h-2 mb-2">
                  <div
                    className={`h-2 rounded-full ${
                      metrics.memoryPercent > 80
                        ? 'bg-red-500'
                        : metrics.memoryPercent > 60
                        ? 'bg-yellow-500'
                        : 'bg-green-500'
                    }`}
                    style={{ width: `${metrics.memoryPercent}%` }}
                  />
                </div>
                <div className="text-xs flex justify-between">
                  <span>{metrics.memoryPercent.toFixed(1)}%</span>
                  <span>
                    {(metrics.usedMemory! / 1024 / 1024).toFixed(1)}MB /
                    {(metrics.totalMemory! / 1024 / 1024).toFixed(1)}MB
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Status Summary */}
          <div className="space-y-2">
            <h4 className="font-semibold flex items-center gap-2 text-gray-700 dark:text-gray-300">
              <BarChart3 size={16} /> Status
            </h4>
            
            <div className="space-y-1 text-xs">
              {metricStatus.critical.length > 0 && (
                <div className="flex items-center gap-2 text-red-600 dark:text-red-400">
                  <AlertTriangle size={14} />
                  <span>Critical: {metricStatus.critical.join(', ')}</span>
                </div>
              )}
              {metricStatus.warning.length > 0 && (
                <div className="flex items-center gap-2 text-yellow-600 dark:text-yellow-400">
                  <AlertTriangle size={14} />
                  <span>Warning: {metricStatus.warning.join(', ')}</span>
                </div>
              )}
              {metricStatus.good.length > 0 && (
                <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
                  <CheckCircle size={14} />
                  <span>Good: {metricStatus.good.length} metrics</span>
                </div>
              )}
            </div>
          </div>

          {/* Navigation Timing */}
          {metrics.pageLoadTime && (
            <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
              <h4 className="font-semibold text-xs text-gray-700 dark:text-gray-300 mb-2">
                Load Times
              </h4>
              <div className="text-xs space-y-1">
                <div className="flex justify-between">
                  <span>Page Load:</span>
                  <span className="font-mono">{metrics.pageLoadTime.toFixed(0)}ms</span>
                </div>
                {metrics.timeToInteractive && (
                  <div className="flex justify-between">
                    <span>TTI:</span>
                    <span className="font-mono">{metrics.timeToInteractive.toFixed(0)}ms</span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default PerformanceMonitor;
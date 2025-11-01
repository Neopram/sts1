/**
 * FASE 5: Performance Monitoring Hook
 * 
 * Monitors real-time performance metrics for production applications:
 * - Page load time, Time to Interactive, Largest Contentful Paint
 * - Memory usage, CPU utilization, Network performance
 * - Component render times, re-render counts
 * - Custom business metrics tracking
 */

import { useEffect, useRef, useCallback, useState } from 'react';

export interface PerformanceMetrics {
  // Core Web Vitals
  fcp?: number; // First Contentful Paint
  lcp?: number; // Largest Contentful Paint
  fid?: number; // First Input Delay
  cls?: number; // Cumulative Layout Shift
  ttfb?: number; // Time to First Byte

  // Navigation Timing
  pageLoadTime?: number;
  domInteractive?: number;
  domComplete?: number;
  timeToInteractive?: number;

  // Memory
  usedMemory?: number;
  totalMemory?: number;
  memoryPercent?: number;

  // Custom Metrics
  [key: string]: number | undefined;
}

interface PerformanceAlert {
  metric: string;
  value: number;
  threshold: number;
  severity: 'warning' | 'critical';
  timestamp: Date;
}

export const usePerformanceMonitoring = (
  componentName: string,
  alertCallback?: (alert: PerformanceAlert) => void,
  enableLogging: boolean = false
) => {
  const metricsRef = useRef<PerformanceMetrics>({});
  const [metrics, setMetrics] = useState<PerformanceMetrics>({});
  const renderTimeRef = useRef<number>(0);
  const renderCountRef = useRef<number>(0);

  // Initialize Web Vitals monitoring
  useEffect(() => {
    const observerEntries = (list: PerformanceEntryList) => {
      list.getEntries().forEach((entry) => {
        if (entry.entryType === 'paint') {
          const paintEntry = entry as PerformanceEntryList;
          metricsRef.current[`paint_${entry.name}`] = entry.startTime;
        }
        if (entry.entryType === 'largest-contentful-paint') {
          const lcpEntry = entry as any;
          metricsRef.current.lcp = lcpEntry.renderTime || lcpEntry.loadTime;
          checkMetricThreshold('LCP', metricsRef.current.lcp, 2500, alertCallback);
        }
        if (entry.entryType === 'first-input') {
          const fidEntry = entry as any;
          metricsRef.current.fid = fidEntry.processingDuration;
          checkMetricThreshold('FID', metricsRef.current.fid, 100, alertCallback);
        }
        if (entry.entryType === 'layout-shift') {
          const clsEntry = entry as any;
          if (!metricsRef.current.cls) metricsRef.current.cls = 0;
          if (!clsEntry.hadRecentInput) {
            metricsRef.current.cls! += clsEntry.value;
            checkMetricThreshold('CLS', metricsRef.current.cls, 0.1, alertCallback);
          }
        }
      });
      setMetrics({ ...metricsRef.current });
    };

    // Observe performance entries
    const observer = new PerformanceObserver(observerEntries);
    observer.observe({
      entryTypes: [
        'paint',
        'largest-contentful-paint',
        'first-input',
        'layout-shift',
        'navigation',
        'resource'
      ],
      buffered: true
    });

    return () => observer.disconnect();
  }, [alertCallback]);

  // Monitor navigation timing
  useEffect(() => {
    const calculateNavigationMetrics = () => {
      if (performance.timing) {
        const timing = performance.timing;
        metricsRef.current.ttfb = timing.responseStart - timing.fetchStart;
        metricsRef.current.pageLoadTime = timing.loadEventEnd - timing.fetchStart;
        metricsRef.current.domInteractive = timing.domInteractive - timing.fetchStart;
        metricsRef.current.domComplete = timing.domComplete - timing.fetchStart;
        metricsRef.current.timeToInteractive = timing.domContentLoadedEventEnd - timing.fetchStart;

        if (enableLogging) {
          console.log(`[${componentName}] Navigation Metrics:`, {
            ttfb: metricsRef.current.ttfb,
            pageLoadTime: metricsRef.current.pageLoadTime,
            timeToInteractive: metricsRef.current.timeToInteractive
          });
        }

        checkMetricThreshold('TTFB', metricsRef.current.ttfb, 600, alertCallback);
        checkMetricThreshold('PageLoadTime', metricsRef.current.pageLoadTime, 3000, alertCallback);
      }
    };

    if (document.readyState === 'complete') {
      calculateNavigationMetrics();
    } else {
      window.addEventListener('load', calculateNavigationMetrics);
      return () => window.removeEventListener('load', calculateNavigationMetrics);
    }
  }, [componentName, enableLogging, alertCallback]);

  // Monitor memory usage
  useEffect(() => {
    const monitorMemory = () => {
      if ((performance as any).memory) {
        const memory = (performance as any).memory;
        metricsRef.current.usedMemory = memory.usedJSHeapSize;
        metricsRef.current.totalMemory = memory.jsHeapSizeLimit;
        metricsRef.current.memoryPercent = (memory.usedJSHeapSize / memory.jsHeapSizeLimit) * 100;

        checkMetricThreshold('Memory', metricsRef.current.memoryPercent, 80, alertCallback);

        setMetrics({ ...metricsRef.current });
      }
    };

    const interval = setInterval(monitorMemory, 5000);
    return () => clearInterval(interval);
  }, [alertCallback]);

  // Track render performance
  const trackRender = useCallback(() => {
    renderCountRef.current++;
    renderTimeRef.current = performance.now();
  }, []);

  // Custom metric tracking
  const trackCustomMetric = useCallback((metricName: string, value: number, threshold?: number) => {
    metricsRef.current[metricName] = value;
    setMetrics({ ...metricsRef.current });

    if (threshold) {
      checkMetricThreshold(metricName, value, threshold, alertCallback);
    }

    if (enableLogging) {
      console.log(`[${componentName}] Custom Metric: ${metricName} = ${value}`);
    }
  }, [componentName, enableLogging, alertCallback]);

  // Performance mark/measure helpers
  const startMeasure = useCallback((markName: string) => {
    performance.mark(`${componentName}-${markName}-start`);
  }, [componentName]);

  const endMeasure = useCallback((markName: string) => {
    performance.mark(`${componentName}-${markName}-end`);
    try {
      performance.measure(
        `${componentName}-${markName}`,
        `${componentName}-${markName}-start`,
        `${componentName}-${markName}-end`
      );
      const measure = performance.getEntriesByName(`${componentName}-${markName}`)[0];
      trackCustomMetric(`${markName}Duration`, measure.duration);
    } catch (e) {
      // Marks not found yet
    }
  }, [componentName, trackCustomMetric]);

  return {
    metrics,
    trackRender,
    trackCustomMetric,
    startMeasure,
    endMeasure,
    renderCount: renderCountRef.current
  };
};

// Helper function to check metric thresholds
function checkMetricThreshold(
  metric: string,
  value: number,
  threshold: number,
  alertCallback?: (alert: PerformanceAlert) => void
) {
  if (value > threshold) {
    const severity = value > threshold * 1.5 ? 'critical' : 'warning';
    const alert: PerformanceAlert = {
      metric,
      value,
      threshold,
      severity,
      timestamp: new Date()
    };
    alertCallback?.(alert);
  }
}
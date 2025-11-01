/**
 * useAnalytics Hook
 * Provides easy access to analytics tracking functionality
 */

import { useEffect, useCallback } from 'react';
import AnalyticsTracker, { AnalyticsMetrics } from '../utils/analyticsTracker';

interface UseAnalyticsReturn {
  trackEvent: (
    eventName: string,
    eventCategory: string,
    eventValue?: number,
    eventLabel?: string,
    customProperties?: Record<string, any>
  ) => void;
  trackPageView: (pageName?: string, pageTitle?: string) => void;
  trackConversion: (conversionName: string, conversionValue?: number) => void;
  trackError: (errorMessage: string, errorType?: string, stackTrace?: string) => void;
  trackTiming: (timingName: string, timingValue: number, timingCategory: string) => void;
  setUserId: (userId: string) => void;
  getMetrics: () => AnalyticsMetrics;
  getSessionId: () => string;
  flush: () => Promise<void>;
}

/**
 * Hook to use analytics tracking
 * @returns Analytics tracking functions
 */
export function useAnalytics(): UseAnalyticsReturn {
  const tracker = AnalyticsTracker.getInstance();

  useEffect(() => {
    // Track page view on mount
    tracker.trackPageView();

    return () => {
      // Cleanup if needed
    };
  }, []);

  const trackEvent = useCallback(
    (
      eventName: string,
      eventCategory: string,
      eventValue?: number,
      eventLabel?: string,
      customProperties?: Record<string, any>
    ) => {
      tracker.trackEvent(eventName, eventCategory, eventValue, eventLabel, customProperties);
    },
    []
  );

  const trackPageView = useCallback((pageName?: string, pageTitle?: string) => {
    tracker.trackPageView(pageName, pageTitle);
  }, []);

  const trackConversion = useCallback((conversionName: string, conversionValue?: number) => {
    tracker.trackConversion(conversionName, conversionValue);
  }, []);

  const trackError = useCallback(
    (errorMessage: string, errorType?: string, stackTrace?: string) => {
      tracker.trackError(errorMessage, errorType, stackTrace);
    },
    []
  );

  const trackTiming = useCallback(
    (timingName: string, timingValue: number, timingCategory: string) => {
      tracker.trackTiming(timingName, timingValue, timingCategory);
    },
    []
  );

  const setUserId = useCallback((userId: string) => {
    tracker.setUserId(userId);
  }, []);

  const getMetrics = useCallback((): AnalyticsMetrics => {
    return tracker.getMetrics();
  }, []);

  const getSessionId = useCallback((): string => {
    return tracker.getSessionId();
  }, []);

  const flush = useCallback(async () => {
    await tracker.flush();
  }, []);

  return {
    trackEvent,
    trackPageView,
    trackConversion,
    trackError,
    trackTiming,
    setUserId,
    getMetrics,
    getSessionId,
    flush,
  };
}

export default useAnalytics;
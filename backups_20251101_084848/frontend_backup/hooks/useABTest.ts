/**
 * useABTest Hook
 * Hook for accessing A/B testing functionality in React components
 */

import { useEffect, useState, useCallback } from 'react';
import ABTestingEngine, { Variation } from '../utils/abTestingEngine';

interface UseABTestReturn {
  variation: Variation | null;
  isLoading: boolean;
  logMetric: (metricName: string, value: number) => void;
  getVariationConfig: <T = any>(key: string, defaultValue?: T) => T;
}

/**
 * Hook to use A/B testing in a component
 * @param userId - The user ID
 * @param experimentId - The experiment ID
 * @returns A/B test information and functions
 */
export function useABTest(userId: string, experimentId: string): UseABTestReturn {
  const [variation, setVariation] = useState<Variation | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const engine = ABTestingEngine.getInstance();

  useEffect(() => {
    const assignVariation = async () => {
      try {
        const assignment = engine.assignUserToVariation(userId, experimentId);
        if (assignment) {
          const exp = engine.getExperiment(experimentId);
          const var_ = exp?.variations.find(v => v.id === assignment.variationId);
          setVariation(var_ || null);
        }
        setIsLoading(false);
      } catch (error) {
        console.error('Failed to assign variation:', error);
        setIsLoading(false);
      }
    };

    assignVariation();
  }, [userId, experimentId, engine]);

  const logMetric = useCallback(
    (metricName: string, value: number) => {
      if (variation) {
        engine.logMetric(experimentId, variation.id, metricName, value);
      }
    },
    [variation, experimentId, engine]
  );

  const getVariationConfig = useCallback(
    <T = any>(key: string, defaultValue?: T): T => {
      if (!variation || !variation.config) {
        return defaultValue as T;
      }
      return variation.config[key] ?? defaultValue;
    },
    [variation]
  );

  return {
    variation,
    isLoading,
    logMetric,
    getVariationConfig,
  };
}

export default useABTest;
/**
 * useAIRecommendations Hook
 * Hook for AI-powered recommendations in React components
 */

import { useEffect, useState, useCallback } from 'react';
import AIService, { Recommendation, UserInteraction } from '../services/aiService';

interface UseAIRecommendationsReturn {
  recommendations: Recommendation[];
  isLoading: boolean;
  error: string | null;
  recordInteraction: (itemId: string, interactionType: 'view' | 'click' | 'purchase' | 'like' | 'share') => Promise<void>;
  refresh: () => Promise<void>;
  trending: Recommendation[];
  trendingLoading: boolean;
}

/**
 * Hook for AI recommendations
 * @param userId - User ID
 * @param limit - Number of recommendations to fetch
 * @param type - Type of recommendations (hybrid, collaborative, content-based, trending)
 * @returns Recommendations and helper functions
 */
export function useAIRecommendations(
  userId: string,
  limit: number = 5,
  type: 'hybrid' | 'collaborative' | 'content-based' | 'trending' = 'hybrid'
): UseAIRecommendationsReturn {
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [trending, setTrending] = useState<Recommendation[]>([]);
  const [trendingLoading, setTrendingLoading] = useState(true);

  const fetchRecommendations = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      let recs: Recommendation[] = [];

      switch (type) {
        case 'collaborative':
          recs = await AIService.getCollaborativeRecommendations(userId, limit);
          break;
        case 'content-based':
          recs = await AIService.getContentBasedRecommendations(userId, limit);
          break;
        case 'trending':
          recs = await AIService.getTrendingItems(limit);
          break;
        default:
          recs = await AIService.getHybridRecommendations(userId, limit);
      }

      setRecommendations(recs);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load recommendations');
    } finally {
      setIsLoading(false);
    }
  }, [userId, limit, type]);

  const fetchTrending = useCallback(async () => {
    setTrendingLoading(true);

    try {
      const trendingRecs = await AIService.getTrendingItems(limit);
      setTrending(trendingRecs);
    } catch (err) {
      console.error('Failed to fetch trending:', err);
    } finally {
      setTrendingLoading(false);
    }
  }, [limit]);

  useEffect(() => {
    fetchRecommendations();
    fetchTrending();
  }, [fetchRecommendations, fetchTrending]);

  const recordInteraction = useCallback(
    async (itemId: string, interactionType: 'view' | 'click' | 'purchase' | 'like' | 'share') => {
      try {
        const interaction: UserInteraction = {
          item_id: itemId,
          interaction_type: interactionType,
          weight: interactionType === 'purchase' ? 5 : interactionType === 'like' ? 2 : 1,
        };

        await AIService.recordInteraction(userId, interaction);
      } catch (err) {
        console.error('Failed to record interaction:', err);
      }
    },
    [userId]
  );

  const refresh = useCallback(async () => {
    await fetchRecommendations();
    await fetchTrending();
  }, [fetchRecommendations, fetchTrending]);

  return {
    recommendations,
    isLoading,
    error,
    recordInteraction,
    refresh,
    trending,
    trendingLoading,
  };
}

export default useAIRecommendations;
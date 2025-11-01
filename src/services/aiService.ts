/**
 * AI Service
 * Frontend integration with AI recommendation backend
 */

import { API_BASE_URL } from '../api';

interface Recommendation {
  item_id: string;
  title: string;
  category: string;
  score: number;
  reason: string;
}

interface UserInteraction {
  item_id: string;
  interaction_type: 'view' | 'click' | 'purchase' | 'like' | 'share';
  weight?: number;
}

interface AnomalyDetection {
  type: string;
  item_id: string;
  severity: 'low' | 'medium' | 'high';
  details?: Record<string, any>;
}

class AIService {
  private static readonly BASE_URL = `${API_BASE_URL}/ai`;

  /**
   * Get collaborative filtering recommendations
   */
  static async getCollaborativeRecommendations(userId: string, limit: number = 5): Promise<Recommendation[]> {
    try {
      const response = await fetch(
        `${this.BASE_URL}/recommendations/collaborative?userId=${userId}&limit=${limit}`
      );

      if (!response.ok) {
        throw new Error(`Failed to fetch recommendations: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Failed to get collaborative recommendations:', error);
      throw error;
    }
  }

  /**
   * Get content-based recommendations
   */
  static async getContentBasedRecommendations(userId: string, limit: number = 5): Promise<Recommendation[]> {
    try {
      const response = await fetch(
        `${this.BASE_URL}/recommendations/content-based?userId=${userId}&limit=${limit}`
      );

      if (!response.ok) {
        throw new Error(`Failed to fetch recommendations: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Failed to get content-based recommendations:', error);
      throw error;
    }
  }

  /**
   * Get hybrid recommendations
   */
  static async getHybridRecommendations(userId: string, limit: number = 5): Promise<Recommendation[]> {
    try {
      const response = await fetch(
        `${this.BASE_URL}/recommendations/hybrid?userId=${userId}&limit=${limit}`
      );

      if (!response.ok) {
        throw new Error(`Failed to fetch recommendations: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Failed to get hybrid recommendations:', error);
      throw error;
    }
  }

  /**
   * Record user interaction
   */
  static async recordInteraction(userId: string, interaction: UserInteraction): Promise<void> {
    try {
      const response = await fetch(`${this.BASE_URL}/interactions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user_id: userId,
          ...interaction,
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to record interaction: ${response.statusText}`);
      }
    } catch (error) {
      console.error('Failed to record interaction:', error);
      throw error;
    }
  }

  /**
   * Get trending items
   */
  static async getTrendingItems(limit: number = 5, timeWindowDays: number = 7): Promise<Recommendation[]> {
    try {
      const response = await fetch(
        `${this.BASE_URL}/recommendations/trending?limit=${limit}&timeWindowDays=${timeWindowDays}`
      );

      if (!response.ok) {
        throw new Error(`Failed to fetch trending items: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Failed to get trending items:', error);
      throw error;
    }
  }

  /**
   * Detect anomalies in user behavior
   */
  static async detectAnomalies(userId: string): Promise<AnomalyDetection[]> {
    try {
      const response = await fetch(`${this.BASE_URL}/anomalies/${userId}`);

      if (!response.ok) {
        throw new Error(`Failed to detect anomalies: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Failed to detect anomalies:', error);
      throw error;
    }
  }

  /**
   * Get user profile
   */
  static async getUserProfile(userId: string): Promise<any> {
    try {
      const response = await fetch(`${this.BASE_URL}/profiles/${userId}`);

      if (!response.ok) {
        throw new Error(`Failed to fetch user profile: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Failed to get user profile:', error);
      throw error;
    }
  }

  /**
   * Get predicted next action
   */
  static async getPredictedNextAction(userId: string): Promise<any> {
    try {
      const response = await fetch(`${this.BASE_URL}/predictions/${userId}/next-action`);

      if (!response.ok) {
        throw new Error(`Failed to get prediction: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Failed to get predicted action:', error);
      throw error;
    }
  }

  /**
   * Get personalized dashboard
   */
  static async getPersonalizedDashboard(userId: string): Promise<any> {
    try {
      const response = await fetch(`${this.BASE_URL}/dashboards/${userId}`);

      if (!response.ok) {
        throw new Error(`Failed to fetch dashboard: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Failed to get personalized dashboard:', error);
      throw error;
    }
  }

  /**
   * Get AI analytics
   */
  static async getAnalytics(): Promise<any> {
    try {
      const response = await fetch(`${this.BASE_URL}/analytics`);

      if (!response.ok) {
        throw new Error(`Failed to fetch analytics: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Failed to get analytics:', error);
      throw error;
    }
  }

  /**
   * Create custom recommendation model
   */
  static async createCustomModel(modelConfig: any): Promise<any> {
    try {
      const response = await fetch(`${this.BASE_URL}/models`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(modelConfig),
      });

      if (!response.ok) {
        throw new Error(`Failed to create model: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Failed to create model:', error);
      throw error;
    }
  }
}

export default AIService;
export type { Recommendation, UserInteraction, AnomalyDetection };
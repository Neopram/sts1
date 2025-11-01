/**
 * Analytics Service
 * Backend integration for analytics data
 */

import { API_BASE_URL } from '../api';

interface AnalyticsPayload {
  session_id: string;
  events: any[];
}

interface AnalyticsReport {
  date: string;
  sessions: number;
  users: number;
  pageviews: number;
  bounce_rate: number;
  avg_session_duration: number;
  conversions: number;
}

interface AnalyticsQuery {
  startDate: string;
  endDate: string;
  metrics: string[];
  dimensions?: string[];
}

class AnalyticsService {
  private static readonly BASE_URL = `${API_BASE_URL}/analytics`;

  /**
   * Submit analytics events to backend
   */
  static async submitEvents(payload: AnalyticsPayload): Promise<void> {
    try {
      const response = await fetch(`${this.BASE_URL}/events`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error(`Analytics submission failed: ${response.statusText}`);
      }
    } catch (error) {
      console.error('Failed to submit analytics events:', error);
      throw error;
    }
  }

  /**
   * Get analytics report for a date range
   */
  static async getReport(
    startDate: string,
    endDate: string
  ): Promise<AnalyticsReport[]> {
    try {
      const response = await fetch(
        `${this.BASE_URL}/reports?startDate=${startDate}&endDate=${endDate}`
      );

      if (!response.ok) {
        throw new Error(`Failed to fetch analytics report: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Failed to get analytics report:', error);
      throw error;
    }
  }

  /**
   * Query analytics data with custom parameters
   */
  static async queryData(query: AnalyticsQuery): Promise<any[]> {
    try {
      const response = await fetch(`${this.BASE_URL}/query`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(query),
      });

      if (!response.ok) {
        throw new Error(`Analytics query failed: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Failed to query analytics data:', error);
      throw error;
    }
  }

  /**
   * Get user behavior analytics
   */
  static async getUserBehavior(userId: string): Promise<any> {
    try {
      const response = await fetch(`${this.BASE_URL}/users/${userId}/behavior`);

      if (!response.ok) {
        throw new Error(`Failed to fetch user behavior: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Failed to get user behavior analytics:', error);
      throw error;
    }
  }

  /**
   * Get user funnel analytics
   */
  static async getUserFunnel(funnelId: string): Promise<any> {
    try {
      const response = await fetch(`${this.BASE_URL}/funnels/${funnelId}`);

      if (!response.ok) {
        throw new Error(`Failed to fetch funnel analytics: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Failed to get funnel analytics:', error);
      throw error;
    }
  }

  /**
   * Get event analytics
   */
  static async getEventAnalytics(eventName: string): Promise<any> {
    try {
      const response = await fetch(`${this.BASE_URL}/events/${eventName}`);

      if (!response.ok) {
        throw new Error(`Failed to fetch event analytics: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Failed to get event analytics:', error);
      throw error;
    }
  }

  /**
   * Export analytics data
   */
  static async exportData(format: 'csv' | 'json'): Promise<Blob> {
    try {
      const response = await fetch(`${this.BASE_URL}/export?format=${format}`);

      if (!response.ok) {
        throw new Error(`Failed to export analytics: ${response.statusText}`);
      }

      return await response.blob();
    } catch (error) {
      console.error('Failed to export analytics data:', error);
      throw error;
    }
  }

  /**
   * Get heatmap data
   */
  static async getHeatmapData(pageUrl: string): Promise<any> {
    try {
      const response = await fetch(
        `${this.BASE_URL}/heatmaps?pageUrl=${encodeURIComponent(pageUrl)}`
      );

      if (!response.ok) {
        throw new Error(`Failed to fetch heatmap data: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Failed to get heatmap data:', error);
      throw error;
    }
  }

  /**
   * Get user session recordings
   */
  static async getSessionRecordings(sessionId: string): Promise<any> {
    try {
      const response = await fetch(`${this.BASE_URL}/sessions/${sessionId}/recordings`);

      if (!response.ok) {
        throw new Error(`Failed to fetch session recordings: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Failed to get session recordings:', error);
      throw error;
    }
  }

  /**
   * Get real-time analytics
   */
  static async getRealTimeData(): Promise<any> {
    try {
      const response = await fetch(`${this.BASE_URL}/realtime`);

      if (!response.ok) {
        throw new Error(`Failed to fetch real-time data: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Failed to get real-time analytics:', error);
      throw error;
    }
  }

  /**
   * Create custom analytics event
   */
  static async createCustomEvent(
    eventName: string,
    eventData: Record<string, any>
  ): Promise<void> {
    try {
      const response = await fetch(`${this.BASE_URL}/custom-events`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          event_name: eventName,
          event_data: eventData,
          timestamp: new Date().toISOString(),
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to create custom event: ${response.statusText}`);
      }
    } catch (error) {
      console.error('Failed to create custom analytics event:', error);
      throw error;
    }
  }

  /**
   * Get analytics dashboard data
   */
  static async getDashboardData(): Promise<any> {
    try {
      const response = await fetch(`${this.BASE_URL}/dashboard`);

      if (!response.ok) {
        throw new Error(`Failed to fetch dashboard data: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Failed to get dashboard data:', error);
      throw error;
    }
  }
}

export default AnalyticsService;
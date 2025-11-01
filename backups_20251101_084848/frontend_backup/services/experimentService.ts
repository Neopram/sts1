/**
 * Experiment Service
 * Backend integration for A/B testing experiments
 */

import { API_BASE_URL } from '../api';

interface ExperimentPayload {
  name: string;
  description?: string;
  hypothesis: string;
  variations: Array<{
    id: string;
    name: string;
    weight: number;
    config: Record<string, any>;
  }>;
  primaryMetric: string;
  secondaryMetrics?: string[];
}

interface ExperimentResponse {
  id: string;
  name: string;
  status: string;
  created_at: string;
  updated_at: string;
}

class ExperimentService {
  private static readonly BASE_URL = `${API_BASE_URL}/experiments`;

  /**
   * Create a new experiment
   */
  static async createExperiment(payload: ExperimentPayload): Promise<ExperimentResponse> {
    try {
      const response = await fetch(`${this.BASE_URL}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error(`Failed to create experiment: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Failed to create experiment:', error);
      throw error;
    }
  }

  /**
   * Get experiment by ID
   */
  static async getExperiment(experimentId: string): Promise<any> {
    try {
      const response = await fetch(`${this.BASE_URL}/${experimentId}`);

      if (!response.ok) {
        throw new Error(`Failed to fetch experiment: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Failed to get experiment:', error);
      throw error;
    }
  }

  /**
   * List all experiments
   */
  static async listExperiments(status?: string): Promise<ExperimentResponse[]> {
    try {
      let url = `${this.BASE_URL}`;
      if (status) {
        url += `?status=${status}`;
      }

      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(`Failed to fetch experiments: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Failed to list experiments:', error);
      throw error;
    }
  }

  /**
   * Update experiment status
   */
  static async updateExperimentStatus(
    experimentId: string,
    status: 'running' | 'paused' | 'completed' | 'archived'
  ): Promise<ExperimentResponse> {
    try {
      const response = await fetch(`${this.BASE_URL}/${experimentId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status }),
      });

      if (!response.ok) {
        throw new Error(`Failed to update experiment status: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Failed to update experiment status:', error);
      throw error;
    }
  }

  /**
   * Submit metric for experiment
   */
  static async submitMetric(
    experimentId: string,
    variationId: string,
    metricName: string,
    value: number
  ): Promise<void> {
    try {
      const response = await fetch(`${this.BASE_URL}/${experimentId}/metrics`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          variation_id: variationId,
          metric_name: metricName,
          value,
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to submit metric: ${response.statusText}`);
      }
    } catch (error) {
      console.error('Failed to submit metric:', error);
      throw error;
    }
  }

  /**
   * Get experiment results
   */
  static async getResults(experimentId: string): Promise<any> {
    try {
      const response = await fetch(`${this.BASE_URL}/${experimentId}/results`);

      if (!response.ok) {
        throw new Error(`Failed to fetch experiment results: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Failed to get experiment results:', error);
      throw error;
    }
  }

  /**
   * Get experiment statistics
   */
  static async getStatistics(experimentId: string): Promise<any> {
    try {
      const response = await fetch(`${this.BASE_URL}/${experimentId}/statistics`);

      if (!response.ok) {
        throw new Error(`Failed to fetch statistics: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Failed to get statistics:', error);
      throw error;
    }
  }

  /**
   * Get variation assignment for user
   */
  static async getUserVariation(userId: string, experimentId: string): Promise<any> {
    try {
      const response = await fetch(
        `${this.BASE_URL}/${experimentId}/users/${userId}/variation`
      );

      if (!response.ok) {
        throw new Error(`Failed to fetch user variation: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Failed to get user variation:', error);
      throw error;
    }
  }

  /**
   * Get all user experiments
   */
  static async getUserExperiments(userId: string): Promise<any[]> {
    try {
      const response = await fetch(`${this.BASE_URL}/users/${userId}`);

      if (!response.ok) {
        throw new Error(`Failed to fetch user experiments: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Failed to get user experiments:', error);
      throw error;
    }
  }

  /**
   * Delete experiment
   */
  static async deleteExperiment(experimentId: string): Promise<void> {
    try {
      const response = await fetch(`${this.BASE_URL}/${experimentId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error(`Failed to delete experiment: ${response.statusText}`);
      }
    } catch (error) {
      console.error('Failed to delete experiment:', error);
      throw error;
    }
  }

  /**
   * Get experiment report
   */
  static async getReport(experimentId: string, format: 'json' | 'csv'): Promise<Blob> {
    try {
      const response = await fetch(`${this.BASE_URL}/${experimentId}/report?format=${format}`);

      if (!response.ok) {
        throw new Error(`Failed to fetch report: ${response.statusText}`);
      }

      return await response.blob();
    } catch (error) {
      console.error('Failed to get report:', error);
      throw error;
    }
  }
}

export default ExperimentService;
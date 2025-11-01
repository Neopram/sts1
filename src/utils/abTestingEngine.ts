/**
 * A/B Testing Engine
 * Multivariant testing framework for feature experiments
 */

export interface Variation {
  id: string;
  name: string;
  description?: string;
  config: Record<string, any>;
  weight?: number; // Traffic allocation percentage (0-100)
}

export interface Experiment {
  id: string;
  name: string;
  description?: string;
  status: 'draft' | 'running' | 'paused' | 'completed' | 'archived';
  hypothesis: string;
  startDate: number;
  endDate?: number;
  variations: Variation[];
  audience?: {
    userIds?: string[];
    percentageOfUsers?: number;
    conditions?: Record<string, any>;
  };
  primaryMetric: string;
  secondaryMetrics?: string[];
  successCriteria?: Record<string, any>;
}

export interface ExperimentResult {
  experimentId: string;
  variationId: string;
  metricName: string;
  value: number;
  confidence?: number;
  pValue?: number;
  winner?: boolean;
}

export interface UserVariationAssignment {
  userId: string;
  experimentId: string;
  variationId: string;
  assignedAt: number;
  exposureLogged: boolean;
}

class ABTestingEngine {
  private static instance: ABTestingEngine;
  private experiments: Map<string, Experiment> = new Map();
  private userAssignments: Map<string, UserVariationAssignment[]> = new Map();
  private results: Map<string, ExperimentResult[]> = new Map();
  private variationCache: Map<string, string> = new Map(); // Cache for user-variation assignments

  private constructor() {
    this.loadExperiments();
    this.loadUserAssignments();
  }

  static getInstance(): ABTestingEngine {
    if (!ABTestingEngine.instance) {
      ABTestingEngine.instance = new ABTestingEngine();
    }
    return ABTestingEngine.instance;
  }

  /**
   * Create a new experiment
   */
  createExperiment(experiment: Experiment): Experiment {
    // Validate weights sum to 100
    const totalWeight = experiment.variations.reduce((sum, v) => sum + (v.weight || 0), 0);
    if (totalWeight !== 100) {
      throw new Error(`Variation weights must sum to 100, got ${totalWeight}`);
    }

    this.experiments.set(experiment.id, {
      ...experiment,
      startDate: experiment.startDate || Date.now(),
    });

    this.saveExperiments();
    return experiment;
  }

  /**
   * Get experiment by ID
   */
  getExperiment(experimentId: string): Experiment | undefined {
    return this.experiments.get(experimentId);
  }

  /**
   * List all experiments
   */
  listExperiments(status?: Experiment['status']): Experiment[] {
    const experiments = Array.from(this.experiments.values());
    if (status) {
      return experiments.filter(e => e.status === status);
    }
    return experiments;
  }

  /**
   * Assign user to variation
   */
  assignUserToVariation(
    userId: string,
    experimentId: string
  ): { variationId: string; config: Record<string, any> } | null {
    const experiment = this.experiments.get(experimentId);
    if (!experiment) {
      throw new Error(`Experiment ${experimentId} not found`);
    }

    if (experiment.status !== 'running') {
      return null;
    }

    // Check if user already assigned
    const cacheKey = `${userId}:${experimentId}`;
    if (this.variationCache.has(cacheKey)) {
      const variationId = this.variationCache.get(cacheKey)!;
      const variation = experiment.variations.find(v => v.id === variationId);
      return variation ? { variationId, config: variation.config } : null;
    }

    // Check audience eligibility
    if (experiment.audience) {
      if (experiment.audience.userIds && !experiment.audience.userIds.includes(userId)) {
        return null;
      }
    }

    // Assign to variation based on weights
    const variationId = this.selectVariation(userId, experiment);
    const variation = experiment.variations.find(v => v.id === variationId);

    if (!variation) {
      return null;
    }

    // Store assignment
    const assignment: UserVariationAssignment = {
      userId,
      experimentId,
      variationId,
      assignedAt: Date.now(),
      exposureLogged: false,
    };

    if (!this.userAssignments.has(userId)) {
      this.userAssignments.set(userId, []);
    }
    this.userAssignments.get(userId)!.push(assignment);

    // Cache assignment
    this.variationCache.set(cacheKey, variationId);

    this.saveUserAssignments();

    return {
      variationId,
      config: variation.config,
    };
  }

  /**
   * Select variation for user using consistent hashing
   */
  private selectVariation(userId: string, experiment: Experiment): string {
    const hash = this.hashString(`${userId}:${experiment.id}`);
    const normalized = ((hash % 1000) + 1000) % 1000;

    let cumulativeWeight = 0;
    for (const variation of experiment.variations) {
      const weight = variation.weight || 0;
      cumulativeWeight += weight * 10; // Convert percentage to 0-1000 scale

      if (normalized < cumulativeWeight) {
        return variation.id;
      }
    }

    // Fallback to last variation
    return experiment.variations[experiment.variations.length - 1].id;
  }

  /**
   * Simple hash function for consistent hashing
   */
  private hashString(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash);
  }

  /**
   * Log metric for experiment
   */
  logMetric(
    experimentId: string,
    variationId: string,
    metricName: string,
    value: number
  ): void {
    const resultKey = `${experimentId}:${variationId}:${metricName}`;

    if (!this.results.has(resultKey)) {
      this.results.set(resultKey, []);
    }

    const result: ExperimentResult = {
      experimentId,
      variationId,
      metricName,
      value,
    };

    this.results.get(resultKey)!.push(result);

    // Send to backend
    this.sendMetricToBackend(result);
  }

  /**
   * Get experiment results
   */
  getResults(experimentId: string): Map<string, ExperimentResult[]> {
    const resultMap = new Map<string, ExperimentResult[]>();

    for (const [key, results] of this.results.entries()) {
      if (key.startsWith(experimentId)) {
        resultMap.set(key, results);
      }
    }

    return resultMap;
  }

  /**
   * Calculate statistical significance
   */
  calculateSignificance(
    controlResults: ExperimentResult[],
    treatmentResults: ExperimentResult[]
  ): {
    pValue: number;
    isSignificant: boolean;
    confidence: number;
  } {
    if (controlResults.length === 0 || treatmentResults.length === 0) {
      return {
        pValue: 1,
        isSignificant: false,
        confidence: 0,
      };
    }

    const controlMean = controlResults.reduce((sum, r) => sum + r.value, 0) / controlResults.length;
    const treatmentMean = treatmentResults.reduce((sum, r) => sum + r.value, 0) / treatmentResults.length;

    const controlVariance = this.calculateVariance(controlResults.map(r => r.value), controlMean);
    const treatmentVariance = this.calculateVariance(
      treatmentResults.map(r => r.value),
      treatmentMean
    );

    // T-test calculation
    const pooledStdErr = Math.sqrt(
      controlVariance / controlResults.length + treatmentVariance / treatmentResults.length
    );

    const tStatistic = (treatmentMean - controlMean) / pooledStdErr;
    const pValue = this.tTestPValue(tStatistic, controlResults.length + treatmentResults.length - 2);

    return {
      pValue,
      isSignificant: pValue < 0.05,
      confidence: (1 - pValue) * 100,
    };
  }

  /**
   * Calculate variance
   */
  private calculateVariance(values: number[], mean: number): number {
    if (values.length === 0) return 0;
    const squaredDiffs = values.map(v => Math.pow(v - mean, 2));
    return squaredDiffs.reduce((sum, v) => sum + v, 0) / values.length;
  }

  /**
   * Approximate t-test p-value (simplified for browser)
   */
  private tTestPValue(tStatistic: number, df: number): number {
    // Simplified approximation - in production use proper statistical library
    const absTStat = Math.abs(tStatistic);
    if (absTStat > 3) return 0.001;
    if (absTStat > 2.576) return 0.01;
    if (absTStat > 1.96) return 0.05;
    if (absTStat > 1.645) return 0.1;
    return 1.0;
  }

  /**
   * Get winner of experiment
   */
  getWinner(experimentId: string): Variation | null {
    const experiment = this.experiments.get(experimentId);
    if (!experiment) return null;

    const results = this.getResults(experimentId);
    if (results.size === 0) return null;

    let bestVariation: Variation | null = null;
    let bestMetricValue = -Infinity;

    for (const variation of experiment.variations) {
      const variationResults: ExperimentResult[] = [];

      for (const [_, resultList] of results.entries()) {
        variationResults.push(
          ...resultList.filter(r => r.variationId === variation.id && r.metricName === experiment.primaryMetric)
        );
      }

      if (variationResults.length > 0) {
        const avgValue = variationResults.reduce((sum, r) => sum + r.value, 0) / variationResults.length;

        if (avgValue > bestMetricValue) {
          bestMetricValue = avgValue;
          bestVariation = variation;
        }
      }
    }

    return bestVariation;
  }

  /**
   * Update experiment status
   */
  updateExperimentStatus(experimentId: string, status: Experiment['status']): void {
    const experiment = this.experiments.get(experimentId);
    if (experiment) {
      experiment.status = status;
      this.saveExperiments();
    }
  }

  /**
   * Get user's variation for experiment
   */
  getUserVariation(userId: string, experimentId: string): Variation | null {
    const assignments = this.userAssignments.get(userId) || [];
    const assignment = assignments.find(a => a.experimentId === experimentId);

    if (!assignment) return null;

    const experiment = this.experiments.get(experimentId);
    if (!experiment) return null;

    return experiment.variations.find(v => v.id === assignment.variationId) || null;
  }

  /**
   * Send metric to backend for persistence
   */
  private async sendMetricToBackend(result: ExperimentResult): Promise<void> {
    try {
      await fetch('/api/experiments/metrics', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(result),
      });
    } catch (error) {
      console.error('Failed to send metric to backend:', error);
    }
  }

  private saveExperiments(): void {
    const data = Array.from(this.experiments.values());
    localStorage.setItem('ab_experiments', JSON.stringify(data));
  }

  private loadExperiments(): void {
    const data = localStorage.getItem('ab_experiments');
    if (data) {
      try {
        const experiments = JSON.parse(data) as Experiment[];
        experiments.forEach(exp => this.experiments.set(exp.id, exp));
      } catch (error) {
        console.error('Failed to load experiments:', error);
      }
    }
  }

  private saveUserAssignments(): void {
    const data: Record<string, UserVariationAssignment[]> = {};
    for (const [userId, assignments] of this.userAssignments.entries()) {
      data[userId] = assignments;
    }
    localStorage.setItem('ab_user_assignments', JSON.stringify(data));
  }

  private loadUserAssignments(): void {
    const data = localStorage.getItem('ab_user_assignments');
    if (data) {
      try {
        const assignments = JSON.parse(data) as Record<string, UserVariationAssignment[]>;
        for (const [userId, userAssignments] of Object.entries(assignments)) {
          this.userAssignments.set(userId, userAssignments);
        }
      } catch (error) {
        console.error('Failed to load user assignments:', error);
      }
    }
  }
}

export default ABTestingEngine;
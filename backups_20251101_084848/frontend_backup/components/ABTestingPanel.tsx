/**
 * A/B Testing Panel Component
 * Interface for managing and monitoring experiments
 */

import React, { useState, useEffect } from 'react';
import ABTestingEngine, { Experiment, Variation, ExperimentResult } from '../utils/abTestingEngine';
import '../styles/ab-testing-panel.css';

interface ABTestingPanelProps {
  userId?: string;
}

const ABTestingPanel: React.FC<ABTestingPanelProps> = ({ userId }) => {
  const engine = ABTestingEngine.getInstance();
  const [experiments, setExperiments] = useState<Experiment[]>([]);
  const [selectedExperiment, setSelectedExperiment] = useState<Experiment | null>(null);
  const [results, setResults] = useState<Map<string, ExperimentResult[]>>(new Map());
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [winner, setWinner] = useState<Variation | null>(null);

  useEffect(() => {
    const exps = engine.listExperiments();
    setExperiments(exps);
  }, [engine]);

  useEffect(() => {
    if (selectedExperiment) {
      const expResults = engine.getResults(selectedExperiment.id);
      setResults(expResults);

      const exp_winner = engine.getWinner(selectedExperiment.id);
      setWinner(exp_winner || null);
    }
  }, [selectedExperiment, engine]);

  const handleCreateExperiment = (e: React.FormEvent) => {
    e.preventDefault();
    const formData = new FormData(e.target as HTMLFormElement);

    const newExperiment: Experiment = {
      id: `exp_${Date.now()}`,
      name: formData.get('name') as string,
      description: formData.get('description') as string,
      hypothesis: formData.get('hypothesis') as string,
      status: 'draft',
      startDate: Date.now(),
      variations: [
        {
          id: 'control',
          name: 'Control',
          config: {},
          weight: 50,
        },
        {
          id: 'treatment',
          name: 'Treatment',
          config: {},
          weight: 50,
        },
      ],
      primaryMetric: formData.get('primaryMetric') as string,
    };

    try {
      engine.createExperiment(newExperiment);
      setExperiments(engine.listExperiments());
      setShowCreateForm(false);
    } catch (error) {
      console.error('Failed to create experiment:', error);
      alert('Failed to create experiment: ' + (error instanceof Error ? error.message : 'Unknown error'));
    }
  };

  const handleUpdateStatus = (experimentId: string, status: Experiment['status']) => {
    engine.updateExperimentStatus(experimentId, status);
    setExperiments(engine.listExperiments());
  };

  const calculateMetricStats = (metricResults: ExperimentResult[]) => {
    if (metricResults.length === 0) {
      return {
        count: 0,
        mean: 0,
        stdDev: 0,
        min: 0,
        max: 0,
      };
    }

    const values = metricResults.map(r => r.value);
    const count = values.length;
    const mean = values.reduce((a, b) => a + b, 0) / count;
    const variance = values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / count;
    const stdDev = Math.sqrt(variance);

    return {
      count,
      mean,
      stdDev,
      min: Math.min(...values),
      max: Math.max(...values),
    };
  };

  return (
    <div className="ab-testing-panel">
      <div className="panel-header">
        <h2>A/B Testing Dashboard</h2>
        <button onClick={() => setShowCreateForm(!showCreateForm)} className="create-btn">
          {showCreateForm ? 'Cancel' : 'Create Experiment'}
        </button>
      </div>

      {showCreateForm && (
        <form onSubmit={handleCreateExperiment} className="create-experiment-form">
          <h3>Create New Experiment</h3>
          <div className="form-group">
            <label>Experiment Name</label>
            <input type="text" name="name" required />
          </div>
          <div className="form-group">
            <label>Description</label>
            <textarea name="description" rows={3} />
          </div>
          <div className="form-group">
            <label>Hypothesis</label>
            <textarea name="hypothesis" rows={3} required />
          </div>
          <div className="form-group">
            <label>Primary Metric</label>
            <input type="text" name="primaryMetric" required />
          </div>
          <button type="submit" className="submit-btn">
            Create Experiment
          </button>
        </form>
      )}

      <div className="experiments-list">
        <h3>Active Experiments</h3>
        {experiments.length === 0 ? (
          <p className="empty-state">No experiments yet. Create one to get started.</p>
        ) : (
          <div className="experiments-grid">
            {experiments.map(exp => (
              <div
                key={exp.id}
                className={`experiment-card ${selectedExperiment?.id === exp.id ? 'selected' : ''}`}
                onClick={() => setSelectedExperiment(exp)}
              >
                <div className="card-header">
                  <h4>{exp.name}</h4>
                  <span className={`status-badge status-${exp.status}`}>{exp.status}</span>
                </div>
                <p className="card-description">{exp.description}</p>
                <div className="card-info">
                  <span>Variations: {exp.variations.length}</span>
                  <span>Metric: {exp.primaryMetric}</span>
                </div>
                <div className="card-actions">
                  {exp.status === 'draft' && (
                    <button onClick={() => handleUpdateStatus(exp.id, 'running')} className="btn-sm btn-primary">
                      Start
                    </button>
                  )}
                  {exp.status === 'running' && (
                    <>
                      <button onClick={() => handleUpdateStatus(exp.id, 'paused')} className="btn-sm btn-warning">
                        Pause
                      </button>
                      <button onClick={() => handleUpdateStatus(exp.id, 'completed')} className="btn-sm btn-success">
                        Complete
                      </button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {selectedExperiment && (
        <div className="experiment-details">
          <h3>Experiment Details: {selectedExperiment.name}</h3>

          <div className="details-section">
            <h4>Hypothesis</h4>
            <p>{selectedExperiment.hypothesis}</p>
          </div>

          <div className="details-section">
            <h4>Variations</h4>
            <div className="variations-table">
              <table>
                <thead>
                  <tr>
                    <th>Variation</th>
                    <th>Traffic %</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedExperiment.variations.map(variation => (
                    <tr key={variation.id}>
                      <td>{variation.name}</td>
                      <td>{variation.weight}%</td>
                      <td>{variation.id === winner?.id ? '🏆 Winner' : '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="details-section">
            <h4>Results</h4>
            {results.size === 0 ? (
              <p>No results yet</p>
            ) : (
              <div className="results-table">
                <table>
                  <thead>
                    <tr>
                      <th>Metric</th>
                      <th>Variation</th>
                      <th>Count</th>
                      <th>Mean</th>
                      <th>Std Dev</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Array.from(results.entries()).map(([key, resultList]) => {
                      const stats = calculateMetricStats(resultList);
                      const [, variationId, metricName] = key.split(':');
                      return (
                        <tr key={key}>
                          <td>{metricName}</td>
                          <td>{variationId}</td>
                          <td>{stats.count}</td>
                          <td>{stats.mean.toFixed(2)}</td>
                          <td>{stats.stdDev.toFixed(2)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default ABTestingPanel;
/**
 * AI Recommendations Component
 * Display AI-powered personalized recommendations
 */

import React, { useState, useEffect } from 'react';
import AIService, { Recommendation } from '../services/aiService';
import '../styles/ai-recommendations.css';

interface AIRecommendationsProps {
  userId: string;
  limit?: number;
  type?: 'hybrid' | 'collaborative' | 'content-based' | 'trending';
  title?: string;
}

const AIRecommendations: React.FC<AIRecommendationsProps> = ({
  userId,
  limit = 5,
  type = 'hybrid',
  title = 'Recommended for You',
}) => {
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedRecommendation, setSelectedRecommendation] = useState<Recommendation | null>(null);

  useEffect(() => {
    const fetchRecommendations = async () => {
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
    };

    fetchRecommendations();
  }, [userId, limit, type]);

  const handleInteraction = async (recommendation: Recommendation, interactionType: 'click' | 'like' = 'click') => {
    try {
      await AIService.recordInteraction(userId, {
        item_id: recommendation.item_id,
        interaction_type: interactionType,
      });
    } catch (err) {
      console.error('Failed to record interaction:', err);
    }
  };

  if (isLoading) {
    return (
      <div className="ai-recommendations ai-recommendations--loading">
        <div className="ai-loading-skeleton">
          {[...Array(limit)].map((_, i) => (
            <div key={i} className="skeleton-card" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="ai-recommendations ai-recommendations--error">
        <p className="error-message">⚠️ {error}</p>
      </div>
    );
  }

  if (recommendations.length === 0) {
    return (
      <div className="ai-recommendations ai-recommendations--empty">
        <p className="empty-message">No recommendations available at this time.</p>
      </div>
    );
  }

  return (
    <div className="ai-recommendations">
      <div className="recommendations-header">
        <h3>{title}</h3>
        <span className="ai-badge">✨ AI Powered</span>
      </div>

      <div className="recommendations-grid">
        {recommendations.map((rec) => (
          <div
            key={rec.item_id}
            className={`recommendation-card ${selectedRecommendation?.item_id === rec.item_id ? 'selected' : ''}`}
            onClick={() => {
              setSelectedRecommendation(rec);
              handleInteraction(rec, 'click');
            }}
          >
            <div className="card-header">
              <h4>{rec.title}</h4>
              <span className="score-badge">{(rec.score * 100).toFixed(0)}%</span>
            </div>

            <div className="card-meta">
              <span className="category">{rec.category}</span>
              <span className="reason">{rec.reason.replace('_', ' ')}</span>
            </div>

            <div className="card-actions">
              <button
                className="btn-secondary"
                onClick={(e) => {
                  e.stopPropagation();
                  handleInteraction(rec, 'like');
                }}
              >
                ❤️ Like
              </button>
              <button
                className="btn-primary"
                onClick={(e) => {
                  e.stopPropagation();
                  handleInteraction(rec, 'click');
                }}
              >
                View Details
              </button>
            </div>

            <div className="confidence-bar">
              <div
                className="confidence-fill"
                style={{ width: `${rec.score * 100}%` }}
              />
            </div>
          </div>
        ))}
      </div>

      {selectedRecommendation && (
        <div className="recommendation-details">
          <h4>Details: {selectedRecommendation.title}</h4>
          <div className="details-content">
            <p>
              <strong>Category:</strong> {selectedRecommendation.category}
            </p>
            <p>
              <strong>Match Score:</strong> {(selectedRecommendation.score * 100).toFixed(1)}%
            </p>
            <p>
              <strong>Recommendation Type:</strong> {selectedRecommendation.reason.replace('_', ' ')}
            </p>
            <p className="details-description">
              This item was recommended based on your preferences and behavior patterns.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default AIRecommendations;
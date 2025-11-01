"""
AI Recommendation Engine
Machine learning-based recommendation system for personalized content
"""

from typing import List, Dict, Any, Tuple, Optional
from datetime import datetime, timedelta
import json
import numpy as np
from collections import defaultdict
import logging

logger = logging.getLogger(__name__)


class UserProfile:
    """User profile for recommendations"""

    def __init__(self, user_id: str):
        self.user_id = user_id
        self.interactions = []
        self.preferences = defaultdict(float)
        self.visit_history = []
        self.behavior_patterns = {}
        self.last_updated = datetime.now()

    def add_interaction(self, item_id: str, interaction_type: str, weight: float = 1.0):
        """Record user interaction with item"""
        self.interactions.append({
            'item_id': item_id,
            'type': interaction_type,
            'weight': weight,
            'timestamp': datetime.now().isoformat(),
        })
        self.update_preferences(item_id, weight)

    def update_preferences(self, item_id: str, weight: float):
        """Update user preferences"""
        self.preferences[item_id] += weight

    def get_top_preferences(self, limit: int = 10) -> List[Tuple[str, float]]:
        """Get user's top item preferences"""
        return sorted(
            self.preferences.items(),
            key=lambda x: x[1],
            reverse=True
        )[:limit]

    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary"""
        return {
            'user_id': self.user_id,
            'interactions_count': len(self.interactions),
            'preferences': dict(self.preferences),
            'last_updated': self.last_updated.isoformat(),
        }


class Item:
    """Item for recommendation"""

    def __init__(self, item_id: str, title: str, category: str, tags: List[str]):
        self.item_id = item_id
        self.title = title
        self.category = category
        self.tags = tags
        self.interaction_count = 0
        self.engagement_score = 0.0
        self.creation_date = datetime.now()

    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary"""
        return {
            'item_id': self.item_id,
            'title': self.title,
            'category': self.category,
            'tags': self.tags,
            'interaction_count': self.interaction_count,
            'engagement_score': self.engagement_score,
        }


class AIRecommendationEngine:
    """Main AI recommendation engine"""

    def __init__(self):
        self.user_profiles = {}
        self.items = {}
        self.similarity_cache = {}
        self.interaction_matrix = defaultdict(lambda: defaultdict(float))

    def add_user(self, user_id: str) -> UserProfile:
        """Add new user"""
        if user_id not in self.user_profiles:
            self.user_profiles[user_id] = UserProfile(user_id)
        return self.user_profiles[user_id]

    def add_item(self, item_id: str, title: str, category: str, tags: List[str]) -> Item:
        """Add new item"""
        if item_id not in self.items:
            self.items[item_id] = Item(item_id, title, category, tags)
        return self.items[item_id]

    def record_interaction(
        self,
        user_id: str,
        item_id: str,
        interaction_type: str = 'view',
        weight: float = 1.0
    ):
        """Record user-item interaction"""
        user = self.add_user(user_id)
        item = self.items.get(item_id)

        if item:
            user.add_interaction(item_id, interaction_type, weight)
            item.interaction_count += 1
            self.interaction_matrix[user_id][item_id] += weight
            self._update_engagement_score(item)
            self.similarity_cache.clear()  # Invalidate cache

    def _update_engagement_score(self, item: Item):
        """Update item engagement score"""
        total_interactions = sum(1 for u_id in self.interaction_matrix
                                 if item.item_id in self.interaction_matrix[u_id])
        time_decay = (datetime.now() - item.creation_date).days / 365.0
        item.engagement_score = (item.interaction_count / (1 + time_decay)) if time_decay > 0 else item.interaction_count

    def get_collaborative_filtering_recommendations(
        self,
        user_id: str,
        limit: int = 5
    ) -> List[Dict[str, Any]]:
        """Get recommendations using collaborative filtering"""
        if user_id not in self.user_profiles:
            return []

        user_profile = self.user_profiles[user_id]
        user_interactions = set(dict(user_profile.preferences).keys())

        # Find similar users
        similar_users = self._find_similar_users(user_id)

        # Aggregate recommendations from similar users
        recommendations = defaultdict(float)
        for similar_user_id, similarity_score in similar_users:
            similar_profile = self.user_profiles.get(similar_user_id)
            if not similar_profile:
                continue

            for item_id, preference in dict(similar_profile.preferences).items():
                if item_id not in user_interactions:
                    recommendations[item_id] += preference * similarity_score

        # Sort and return top recommendations
        result = []
        for item_id, score in sorted(recommendations.items(), key=lambda x: x[1], reverse=True)[:limit]:
            item = self.items.get(item_id)
            if item:
                result.append({
                    'item_id': item.item_id,
                    'title': item.title,
                    'category': item.category,
                    'score': float(score),
                    'reason': 'collaborative_filtering',
                })

        return result

    def get_content_based_recommendations(
        self,
        user_id: str,
        limit: int = 5
    ) -> List[Dict[str, Any]]:
        """Get recommendations using content-based filtering"""
        if user_id not in self.user_profiles:
            return []

        user_profile = self.user_profiles[user_id]

        # Get user's favorite categories and tags
        favorite_categories = defaultdict(float)
        favorite_tags = defaultdict(float)

        for item_id, preference in dict(user_profile.preferences).items():
            item = self.items.get(item_id)
            if item:
                favorite_categories[item.category] += preference
                for tag in item.tags:
                    favorite_tags[tag] += preference

        # Find items matching user preferences
        user_interactions = set(dict(user_profile.preferences).keys())
        recommendations = []

        for item in self.items.values():
            if item.item_id in user_interactions:
                continue

            # Calculate match score
            category_score = favorite_categories.get(item.category, 0)
            tag_score = sum(favorite_tags.get(tag, 0) for tag in item.tags)
            total_score = (category_score * 0.6) + (tag_score * 0.4)

            if total_score > 0:
                recommendations.append({
                    'item_id': item.item_id,
                    'title': item.title,
                    'category': item.category,
                    'score': float(total_score),
                    'reason': 'content_based',
                })

        # Sort by score and return top
        recommendations.sort(key=lambda x: x['score'], reverse=True)
        return recommendations[:limit]

    def get_hybrid_recommendations(
        self,
        user_id: str,
        limit: int = 5
    ) -> List[Dict[str, Any]]:
        """Get recommendations using hybrid approach"""
        cf_recs = self.get_collaborative_filtering_recommendations(user_id, limit * 2)
        cb_recs = self.get_content_based_recommendations(user_id, limit * 2)

        # Combine and deduplicate
        combined = {}
        for rec in cf_recs:
            combined[rec['item_id']] = rec.copy()
            combined[rec['item_id']]['score'] *= 0.6  # 60% weight to CF

        for rec in cb_recs:
            if rec['item_id'] in combined:
                combined[rec['item_id']]['score'] += rec['score'] * 0.4
                combined[rec['item_id']]['reason'] = 'hybrid'
            else:
                combined[rec['item_id']] = rec.copy()
                combined[rec['item_id']]['score'] *= 0.4  # 40% weight to CB

        # Sort and return
        result = sorted(combined.values(), key=lambda x: x['score'], reverse=True)
        return result[:limit]

    def detect_anomalies(self, user_id: str) -> List[Dict[str, Any]]:
        """Detect anomalous behavior patterns"""
        if user_id not in self.user_profiles:
            return []

        user_profile = self.user_profiles[user_id]
        anomalies = []

        # Check interaction frequency
        if len(user_profile.interactions) > 100:
            avg_weight = sum(i['weight'] for i in user_profile.interactions) / len(user_profile.interactions)
            for interaction in user_profile.interactions[-10:]:
                if interaction['weight'] > avg_weight * 3:
                    anomalies.append({
                        'type': 'unusual_engagement',
                        'item_id': interaction['item_id'],
                        'weight': interaction['weight'],
                        'severity': 'high',
                    })

        return anomalies

    def _find_similar_users(self, user_id: str, top_k: int = 5) -> List[Tuple[str, float]]:
        """Find users similar to given user"""
        user_profile = self.user_profiles.get(user_id)
        if not user_profile:
            return []

        similarities = []
        user_prefs = dict(user_profile.preferences)

        for other_user_id, other_profile in self.user_profiles.items():
            if other_user_id == user_id:
                continue

            other_prefs = dict(other_profile.preferences)
            similarity = self._calculate_cosine_similarity(user_prefs, other_prefs)

            if similarity > 0:
                similarities.append((other_user_id, similarity))

        return sorted(similarities, key=lambda x: x[1], reverse=True)[:top_k]

    def _calculate_cosine_similarity(self, vec1: Dict[str, float], vec2: Dict[str, float]) -> float:
        """Calculate cosine similarity between two vectors"""
        all_keys = set(vec1.keys()) | set(vec2.keys())

        if not all_keys:
            return 0.0

        dot_product = sum(vec1.get(key, 0) * vec2.get(key, 0) for key in all_keys)
        magnitude1 = sum(v ** 2 for v in vec1.values()) ** 0.5
        magnitude2 = sum(v ** 2 for v in vec2.values()) ** 0.5

        if magnitude1 == 0 or magnitude2 == 0:
            return 0.0

        return dot_product / (magnitude1 * magnitude2)

    def get_trending_items(self, limit: int = 5, time_window_days: int = 7) -> List[Dict[str, Any]]:
        """Get trending items based on recent interactions"""
        cutoff_date = datetime.now() - timedelta(days=time_window_days)
        trending = defaultdict(int)

        for user_profile in self.user_profiles.values():
            for interaction in user_profile.interactions:
                ts = datetime.fromisoformat(interaction['timestamp'])
                if ts > cutoff_date:
                    trending[interaction['item_id']] += 1

        result = []
        for item_id, count in sorted(trending.items(), key=lambda x: x[1], reverse=True)[:limit]:
            item = self.items.get(item_id)
            if item:
                result.append({
                    'item_id': item.item_id,
                    'title': item.title,
                    'category': item.category,
                    'interactions': count,
                    'reason': 'trending',
                })

        return result

    def export_analytics(self) -> Dict[str, Any]:
        """Export analytics data"""
        return {
            'total_users': len(self.user_profiles),
            'total_items': len(self.items),
            'total_interactions': sum(len(u.interactions) for u in self.user_profiles.values()),
            'users': [u.to_dict() for u in self.user_profiles.values()],
            'items': [i.to_dict() for i in self.items.values()],
        }


# Global engine instance
_engine = AIRecommendationEngine()


def get_engine() -> AIRecommendationEngine:
    """Get global engine instance"""
    return _engine
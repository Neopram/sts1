"""
Audit and logging service for STS Clearance system
Provides comprehensive audit trails and activity logging
"""

import logging
import uuid
from datetime import datetime, timedelta
from typing import Dict, List, Optional

from sqlalchemy import desc, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import ActivityLog, Room

logger = logging.getLogger(__name__)


class AuditService:
    """Service for managing audit trails and activity logging"""

    def __init__(self):
        self.audit_config = {
            "retention_days": 365,  # Keep audit logs for 1 year
            "batch_size": 100,
            "critical_actions": [
                "document_approved",
                "document_rejected", 
                "room_created",
                "room_deleted",
                "user_login",
                "user_logout",
                "permission_granted",
                "permission_revoked"
            ]
        }

    async def log_activity(
        self,
        room_id: str,
        actor: str,
        action: str,
        meta_json: Optional[Dict] = None,
        session: AsyncSession = None
    ) -> str:
        """Log an activity with full audit trail"""
        try:
            activity_id = str(uuid.uuid4())
            
            # Create activity log entry
            activity_log = ActivityLog(
                id=activity_id,
                room_id=room_id,
                actor=actor,
                action=action,
                meta_json=meta_json or {},
                ts=datetime.utcnow()
            )

            session.add(activity_log)
            await session.commit()

            # Log to application logger
            logger.info(f"Activity logged: {action} by {actor} in room {room_id}")

            # Check if this is a critical action that needs special handling
            if action in self.audit_config["critical_actions"]:
                await self._handle_critical_action(activity_log, session)

            return activity_id

        except Exception as e:
            logger.error(f"Error logging activity: {e}")
            await session.rollback()
            return None

    async def get_activity_timeline(
        self,
        room_id: str,
        limit: int = 50,
        offset: int = 0,
        action_filter: Optional[str] = None,
        actor_filter: Optional[str] = None,
        date_from: Optional[datetime] = None,
        date_to: Optional[datetime] = None,
        session: AsyncSession = None
    ) -> Dict:
        """Get activity timeline for a room with filtering options"""
        try:
            # Build query conditions
            conditions = [ActivityLog.room_id == room_id]

            if action_filter:
                conditions.append(ActivityLog.action == action_filter)

            if actor_filter:
                conditions.append(ActivityLog.actor == actor_filter)

            if date_from:
                conditions.append(ActivityLog.ts >= date_from)

            if date_to:
                conditions.append(ActivityLog.ts <= date_to)

            # Get total count
            count_result = await session.execute(
                select(ActivityLog.id).where(*conditions)
            )
            total_count = len(count_result.scalars().all())

            # Get paginated results
            activities_result = await session.execute(
                select(ActivityLog)
                .where(*conditions)
                .order_by(desc(ActivityLog.ts))
                .offset(offset)
                .limit(limit)
            )

            activities = []
            for activity in activities_result.scalars().all():
                activities.append({
                    "id": activity.id,
                    "actor": activity.actor,
                    "action": activity.action,
                    "timestamp": activity.ts,
                    "meta": activity.meta_json,
                    "is_critical": activity.action in self.audit_config["critical_actions"]
                })

            return {
                "activities": activities,
                "total_count": total_count,
                "offset": offset,
                "limit": limit,
                "has_more": (offset + limit) < total_count
            }

        except Exception as e:
            logger.error(f"Error getting activity timeline: {e}")
            return {"activities": [], "total_count": 0, "offset": 0, "limit": limit, "has_more": False}

    async def get_user_activity_summary(
        self,
        user_email: str,
        days: int = 30,
        session: AsyncSession = None
    ) -> Dict:
        """Get activity summary for a user over specified period"""
        try:
            date_from = datetime.utcnow() - timedelta(days=days)

            # Get user's accessible rooms
            rooms_result = await session.execute(
                select(Room.id).join(Room.parties).where(Room.parties.any(email=user_email))
            )
            user_room_ids = [str(room_id) for room_id in rooms_result.scalars().all()]

            if not user_room_ids:
                return self._empty_activity_summary()

            # Get activity counts by action
            activity_counts_result = await session.execute(
                select(ActivityLog.action, ActivityLog.id)
                .where(
                    ActivityLog.actor == user_email,
                    ActivityLog.ts >= date_from
                )
            )

            action_counts = {}
            total_activities = 0

            for action, activity_id in activity_counts_result.all():
                action_counts[action] = action_counts.get(action, 0) + 1
                total_activities += 1

            # Get recent activities
            recent_activities_result = await session.execute(
                select(ActivityLog)
                .where(
                    ActivityLog.actor == user_email,
                    ActivityLog.ts >= date_from
                )
                .order_by(desc(ActivityLog.ts))
                .limit(10)
            )

            recent_activities = []
            for activity in recent_activities_result.scalars().all():
                recent_activities.append({
                    "id": activity.id,
                    "action": activity.action,
                    "room_id": activity.room_id,
                    "timestamp": activity.ts,
                    "is_critical": activity.action in self.audit_config["critical_actions"]
                })

            return {
                "user_email": user_email,
                "period_days": days,
                "total_activities": total_activities,
                "action_counts": action_counts,
                "recent_activities": recent_activities,
                "critical_actions_count": sum(
                    1 for activity in recent_activities 
                    if activity["is_critical"]
                )
            }

        except Exception as e:
            logger.error(f"Error getting user activity summary: {e}")
            return self._empty_activity_summary()

    async def get_room_audit_report(
        self,
        room_id: str,
        session: AsyncSession = None
    ) -> Dict:
        """Generate comprehensive audit report for a room"""
        try:
            # Get room information
            room_result = await session.execute(
                select(Room).where(Room.id == room_id)
            )
            room = room_result.scalar_one_or_none()

            if not room:
                return {"error": "Room not found"}

            # Get activity statistics
            stats_result = await session.execute(
                select(ActivityLog.action, ActivityLog.id)
                .where(ActivityLog.room_id == room_id)
            )

            action_stats = {}
            total_activities = 0
            critical_activities = 0

            for action, activity_id in stats_result.all():
                action_stats[action] = action_stats.get(action, 0) + 1
                total_activities += 1
                
                if action in self.audit_config["critical_actions"]:
                    critical_activities += 1

            # Get unique actors
            actors_result = await session.execute(
                select(ActivityLog.actor.distinct())
                .where(ActivityLog.room_id == room_id)
            )
            unique_actors = list(actors_result.scalars().all())

            # Get date range
            date_range_result = await session.execute(
                select(ActivityLog.ts)
                .where(ActivityLog.room_id == room_id)
                .order_by(ActivityLog.ts)
            )
            timestamps = list(date_range_result.scalars().all())

            date_range = {
                "first_activity": timestamps[0] if timestamps else None,
                "last_activity": timestamps[-1] if timestamps else None
            }

            return {
                "room_id": room_id,
                "room_title": room.title,
                "total_activities": total_activities,
                "critical_activities": critical_activities,
                "unique_actors": len(unique_actors),
                "action_statistics": action_stats,
                "date_range": date_range,
                "audit_period": {
                    "start": date_range["first_activity"],
                    "end": date_range["last_activity"],
                    "days_span": (date_range["last_activity"] - date_range["first_activity"]).days if date_range["first_activity"] and date_range["last_activity"] else 0
                },
                "compliance_score": self._calculate_compliance_score(action_stats, total_activities),
                "generated_at": datetime.utcnow().isoformat()
            }

        except Exception as e:
            logger.error(f"Error generating room audit report: {e}")
            return {"error": "Failed to generate audit report"}

    async def cleanup_old_audit_logs(self, session: AsyncSession = None) -> int:
        """Clean up old audit logs beyond retention period"""
        try:
            cutoff_date = datetime.utcnow() - timedelta(days=self.audit_config["retention_days"])

            # Get old logs to delete
            old_logs_result = await session.execute(
                select(ActivityLog.id)
                .where(ActivityLog.ts < cutoff_date)
            )
            old_log_ids = list(old_logs_result.scalars().all())

            if not old_log_ids:
                return 0

            # Delete in batches
            deleted_count = 0
            for i in range(0, len(old_log_ids), self.audit_config["batch_size"]):
                batch_ids = old_log_ids[i:i + self.audit_config["batch_size"]]
                
                await session.execute(
                    ActivityLog.__table__.delete().where(ActivityLog.id.in_(batch_ids))
                )
                deleted_count += len(batch_ids)

            await session.commit()

            logger.info(f"Cleaned up {deleted_count} old audit logs")
            return deleted_count

        except Exception as e:
            logger.error(f"Error cleaning up audit logs: {e}")
            await session.rollback()
            return 0

    async def _handle_critical_action(self, activity_log: ActivityLog, session: AsyncSession):
        """Handle critical actions with additional logging and notifications"""
        try:
            # Log critical action to separate log file or external system
            logger.critical(
                f"CRITICAL ACTION: {activity_log.action} by {activity_log.actor} "
                f"in room {activity_log.room_id} at {activity_log.ts}"
            )

            # In a production system, you might:
            # - Send alerts to administrators
            # - Log to external audit system
            # - Trigger additional security checks

        except Exception as e:
            logger.error(f"Error handling critical action: {e}")

    def _calculate_compliance_score(self, action_stats: Dict, total_activities: int) -> float:
        """Calculate compliance score based on activity patterns"""
        try:
            if total_activities == 0:
                return 100.0

            # Define compliance weights for different actions
            compliance_weights = {
                "document_approved": 1.0,
                "document_rejected": 0.8,
                "room_created": 1.0,
                "user_login": 0.9,
                "permission_granted": 0.7,
                "permission_revoked": 0.6
            }

            weighted_score = 0.0
            total_weight = 0.0

            for action, count in action_stats.items():
                weight = compliance_weights.get(action, 0.5)
                weighted_score += count * weight
                total_weight += count

            if total_weight == 0:
                return 100.0

            compliance_score = (weighted_score / total_weight) * 100
            return min(100.0, max(0.0, compliance_score))

        except Exception:
            return 50.0  # Default score if calculation fails

    def _empty_activity_summary(self) -> Dict:
        """Return empty activity summary"""
        return {
            "user_email": "",
            "period_days": 0,
            "total_activities": 0,
            "action_counts": {},
            "recent_activities": [],
            "critical_actions_count": 0
        }


# Global instance
audit_service = AuditService()

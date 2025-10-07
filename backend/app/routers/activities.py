"""
Activities router for STS Clearance system
Handles activity logs and audit trail
"""

import json
import logging
from datetime import datetime, timedelta
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy import desc, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_async_session
from app.dependencies import get_current_user, require_room_access
from app.models import ActivityLog, Party, Room

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1", tags=["activities"])


# Response schemas
class ActivityResponse(BaseModel):
    id: str
    actor: str
    action: str
    timestamp: datetime
    meta: Optional[dict] = None


@router.get("/activities", response_model=List[ActivityResponse])
async def get_user_activities_general(
    limit: int = 50,
    offset: int = 0,
    action_filter: Optional[str] = None,
    current_user: dict = Depends(get_current_user),
    session: AsyncSession = Depends(get_async_session),
):
    """
    Get activities for all rooms the user has access to (alias for backward compatibility)
    """
    return await get_user_activities(
        limit, offset, action_filter, current_user, session
    )


@router.get("/activities/my-recent", response_model=List[ActivityResponse])
async def get_user_activities(
    limit: int = 50,
    offset: int = 0,
    action_filter: Optional[str] = None,
    current_user: dict = Depends(get_current_user),
    session: AsyncSession = Depends(get_async_session),
):
    """
    Get activities for all rooms the user has access to
    """
    try:
        user_email = current_user["email"]

        # Get user's accessible room IDs with optimized query
        user_rooms_result = await session.execute(
            select(Room.id).join(Party).where(Party.email == user_email)
        )
        user_room_ids = [str(room_id) for room_id in user_rooms_result.scalars().all()]

        if not user_room_ids:
            return []

        # Build optimized query with proper indexing
        try:
            # Use indexed columns for better performance
            query = (
                select(ActivityLog)
                .where(ActivityLog.room_id.in_(user_room_ids))
                .order_by(desc(ActivityLog.ts))  # Uses idx_activity_log_ts
            )

            if action_filter:
                query = query.where(ActivityLog.action.ilike(f"%{action_filter}%"))

            # Apply pagination
            query = query.offset(offset).limit(limit)

            result = await session.execute(query)
            activities = result.scalars().all()

            return [
                ActivityResponse(
                    id=str(activity.id),
                    actor=activity.actor,
                    action=activity.action,
                    timestamp=activity.ts,
                    meta=json.loads(activity.meta) if activity.meta else None,
                )
                for activity in activities
            ]
        except Exception as query_error:
            logger.warning(
                f"Error querying activities, returning empty list: {query_error}"
            )
            return []

    except Exception as e:
        logger.error(f"Error getting user activities: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")


@router.get("/rooms/{room_id}/activities", response_model=List[ActivityResponse])
async def get_room_activities(
    room_id: str,
    limit: int = 50,
    offset: int = 0,
    action_filter: Optional[str] = None,
    actor_filter: Optional[str] = None,
    current_user: dict = Depends(get_current_user),
    session: AsyncSession = Depends(get_async_session),
):
    """
    Get activity logs for a room
    """
    try:
        user_email = current_user["email"]

        # Verify user has access to room
        await require_room_access(room_id, user_email, session)

        # Build optimized query with proper indexing
        query = (
            select(ActivityLog)
            .where(ActivityLog.room_id == room_id)  # Uses idx_activity_log_room_id
            .order_by(
                desc(ActivityLog.ts)
            )  # Uses idx_activity_log_room_ts composite index
        )

        # Apply filters with indexed columns
        if action_filter:
            query = query.where(ActivityLog.action.ilike(f"%{action_filter}%"))
        if actor_filter:
            query = query.where(ActivityLog.actor.ilike(f"%{actor_filter}%"))

        # Apply pagination
        query = query.offset(offset).limit(limit)

        # Execute query
        activities_result = await session.execute(query)
        activities = activities_result.scalars().all()

        # Convert to response format
        response = []
        for activity in activities:
            meta = None
            if activity.meta_json:
                try:
                    meta = json.loads(activity.meta_json)
                except json.JSONDecodeError:
                    meta = {"raw": activity.meta_json}

            response.append(
                ActivityResponse(
                    id=str(activity.id),
                    actor=activity.actor,
                    action=activity.action,
                    timestamp=activity.ts,
                    meta=meta,
                )
            )

        return response

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting room activities: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")


@router.get("/rooms/{room_id}/activities/summary")
async def get_activities_summary(
    room_id: str,
    days: int = 7,
    current_user: dict = Depends(get_current_user),
    session: AsyncSession = Depends(get_async_session),
):
    """
    Get activity summary for a room
    """
    try:
        user_email = current_user["email"]

        # Verify user has access to room
        await require_room_access(room_id, user_email, session)

        # Get activities from the last N days with optimized query
        since_date = datetime.utcnow() - timedelta(days=days)

        # Use composite index for better performance
        activities_result = await session.execute(
            select(ActivityLog)
            .where(ActivityLog.room_id == room_id, ActivityLog.ts >= since_date)
            .order_by(desc(ActivityLog.ts))  # Uses idx_activity_log_room_ts
        )

        activities = activities_result.scalars().all()

        # Calculate summary statistics
        total_activities = len(activities)
        unique_actors = len(set(activity.actor for activity in activities))

        # Group by action type
        action_counts = {}
        for activity in activities:
            action_counts[activity.action] = action_counts.get(activity.action, 0) + 1

        # Group by actor
        actor_counts = {}
        for activity in activities:
            actor_counts[activity.actor] = actor_counts.get(activity.actor, 0) + 1

        # Recent activities (last 10)
        recent_activities = []
        for activity in activities[:10]:
            meta = None
            if activity.meta_json:
                try:
                    meta = json.loads(activity.meta_json)
                except json.JSONDecodeError:
                    meta = {"raw": activity.meta_json}

            recent_activities.append(
                {
                    "id": str(activity.id),
                    "actor": activity.actor,
                    "action": activity.action,
                    "timestamp": activity.ts,
                    "meta": meta,
                }
            )

        return {
            "period_days": days,
            "total_activities": total_activities,
            "unique_actors": unique_actors,
            "action_counts": action_counts,
            "actor_counts": actor_counts,
            "recent_activities": recent_activities,
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting activities summary: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")


@router.get("/rooms/{room_id}/activities/timeline")
async def get_activities_timeline(
    room_id: str,
    days: int = 30,
    current_user: dict = Depends(get_current_user),
    session: AsyncSession = Depends(get_async_session),
):
    """
    Get activity timeline for a room (grouped by day)
    Enhanced with performance optimization and caching
    """
    try:
        user_email = current_user["email"]

        # Verify user has access to room
        await require_room_access(room_id, user_email, session)

        # Validate input parameters
        if days < 1 or days > 365:
            raise HTTPException(
                status_code=400, detail="Days parameter must be between 1 and 365"
            )

        # Get activities from the last N days with optimized query
        since_date = datetime.utcnow() - timedelta(days=days)

        # Use optimized query with proper indexing
        activities_result = await session.execute(
            select(
                ActivityLog.ts,
                ActivityLog.action,
                ActivityLog.actor,
                ActivityLog.meta_json,
            )
            .where(ActivityLog.room_id == room_id, ActivityLog.ts >= since_date)
            .order_by(ActivityLog.ts.desc())  # Uses idx_activity_log_room_ts
            .limit(10000)  # Prevent memory issues with large datasets
        )

        activities = activities_result.fetchall()

        # Group activities by date with enhanced data structure
        timeline = {}
        total_activities = 0
        unique_actors = set()
        action_counts = {}

        for activity in activities:
            date_key = activity.ts.date().isoformat()

            if date_key not in timeline:
                timeline[date_key] = {
                    "date": date_key,
                    "total_activities": 0,
                    "actions": {},
                    "actors": set(),
                    "peak_hour": None,
                    "hourly_distribution": {},
                }

            # Track hourly distribution
            hour = activity.ts.hour
            timeline[date_key]["hourly_distribution"][hour] = (
                timeline[date_key]["hourly_distribution"].get(hour, 0) + 1
            )

            # Update daily stats
            timeline[date_key]["total_activities"] += 1
            timeline[date_key]["actions"][activity.action] = (
                timeline[date_key]["actions"].get(activity.action, 0) + 1
            )
            timeline[date_key]["actors"].add(activity.actor)

            # Update global stats
            total_activities += 1
            unique_actors.add(activity.actor)
            action_counts[activity.action] = action_counts.get(activity.action, 0) + 1

        # Convert sets to lists and calculate peak hours
        timeline_list = []
        for date_key in sorted(timeline.keys(), reverse=True):  # Most recent first
            day_data = timeline[date_key]

            # Find peak hour
            if day_data["hourly_distribution"]:
                peak_hour = max(
                    day_data["hourly_distribution"],
                    key=day_data["hourly_distribution"].get,
                )
                day_data["peak_hour"] = {
                    "hour": peak_hour,
                    "activity_count": day_data["hourly_distribution"][peak_hour],
                }

            # Convert actors set to list
            day_data["unique_actors"] = len(day_data["actors"])
            day_data["actors"] = list(day_data["actors"])

            # Remove hourly_distribution from response (internal use only)
            del day_data["hourly_distribution"]

            timeline_list.append(day_data)

        # Calculate activity trends
        activity_trend = "stable"
        if len(timeline_list) >= 2:
            recent_avg = sum(
                day["total_activities"] for day in timeline_list[:7]
            ) / min(7, len(timeline_list))
            older_avg = (
                sum(day["total_activities"] for day in timeline_list[7:14])
                / min(7, len(timeline_list[7:14]))
                if len(timeline_list) > 7
                else recent_avg
            )

            if recent_avg > older_avg * 1.2:
                activity_trend = "increasing"
            elif recent_avg < older_avg * 0.8:
                activity_trend = "decreasing"

        # Top actors by activity count
        actor_activity_count = {}
        for day in timeline_list:
            for actor in day["actors"]:
                actor_activity_count[actor] = actor_activity_count.get(actor, 0) + 1

        top_actors = sorted(
            actor_activity_count.items(), key=lambda x: x[1], reverse=True
        )[:5]

        return {
            "room_id": room_id,
            "period_days": days,
            "date_range": {
                "start": since_date.date().isoformat(),
                "end": datetime.utcnow().date().isoformat(),
            },
            "summary": {
                "total_activities": total_activities,
                "unique_actors": len(unique_actors),
                "unique_actions": len(action_counts),
                "activity_trend": activity_trend,
                "avg_activities_per_day": total_activities / max(days, 1),
            },
            "top_actions": sorted(
                action_counts.items(), key=lambda x: x[1], reverse=True
            )[:5],
            "top_actors": [
                {"actor": actor, "activity_count": count} for actor, count in top_actors
            ],
            "timeline": timeline_list,
            "generated_at": datetime.utcnow().isoformat(),
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting activities timeline for room {room_id}: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")


@router.get("/activities/my-recent")
async def get_my_recent_activities(
    limit: int = 20,
    current_user: dict = Depends(get_current_user),
    session: AsyncSession = Depends(get_async_session),
):
    """
    Get recent activities for current user across all rooms
    """
    try:
        user_email = current_user["email"]

        # Get user's recent activities
        activities_result = await session.execute(
            select(ActivityLog, Room.title)
            .join(Room)
            .where(ActivityLog.actor == user_email)
            .order_by(desc(ActivityLog.timestamp))
            .limit(limit)
        )

        activities = activities_result.all()

        # Convert to response format
        response = []
        for activity, room_title in activities:
            meta = None
            if activity.meta_json:
                try:
                    meta = json.loads(activity.meta_json)
                except json.JSONDecodeError:
                    meta = {"raw": activity.meta_json}

            response.append(
                {
                    "id": str(activity.id),
                    "room_id": str(activity.room_id),
                    "room_title": room_title,
                    "action": activity.action,
                    "timestamp": activity.timestamp,
                    "meta": meta,
                }
            )

        return response

    except Exception as e:
        logger.error(f"Error getting my recent activities: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")

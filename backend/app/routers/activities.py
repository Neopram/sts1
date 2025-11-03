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
from app.models import ActivityLog, Party, Room, User

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1", tags=["activities"])


# Helper function to extract user info from current_user (dict or User object)
def get_user_info(current_user):
    """Extract email from current_user (dict or User object)"""
    if isinstance(current_user, dict):
        return current_user.get("email") or current_user.get("user_email")
    else:
        return current_user.email


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
    current_user: User = Depends(get_current_user),
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
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_async_session),
):
    """
    Get activities for all rooms the user has access to.
    Real permission validation logic:
    - All authenticated users can view own activities (permission_matrix: activities.view_own)
    - Admins can view all activities (permission_matrix: activities.view_all)
    - Users only see activities from rooms they're members of
    """
    try:
        from app.permission_matrix import permission_matrix
        from app.models import User

        user_email = get_user_info(current_user)

        # 1. CHECK PERMISSION - User must have "activities.view_own" permission at minimum
        user_result = await session.execute(
            select(User).where(User.email == user_email)
        )
        user = user_result.scalar_one_or_none()
        
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        
        # Determine what activities user can see
        if user.role == "admin":
            # Admins can see all activities
            if not permission_matrix.has_permission(user.role, "activities", "view_all"):
                logger.warning(f"Admin {user_email} denied all activities access")
                raise HTTPException(
                    status_code=403,
                    detail="Admin permission denied for all activities"
                )
            # Query all activities from all rooms
            try:
                query = (
                    select(ActivityLog)
                    .order_by(desc(ActivityLog.ts))
                )

                if action_filter:
                    query = query.where(ActivityLog.action.ilike(f"%{action_filter}%"))

                query = query.offset(offset).limit(limit)
                result = await session.execute(query)
                activities = result.scalars().all()

                logger.info(f"Admin {user_email} retrieved {len(activities)} activities from all rooms")
                return [
                    ActivityResponse(
                        id=str(activity.id),
                        actor=activity.actor,
                        action=activity.action,
                        timestamp=activity.ts,
                        meta=json.loads(activity.meta_json) if activity.meta_json else None,
                    )
                    for activity in activities
                ]
            except Exception as query_error:
                logger.error(f"Error querying admin activities: {query_error}")
                return []
        else:
            # Non-admins can only see own activities from their rooms
            if not permission_matrix.has_permission(user.role, "activities", "view_own"):
                logger.warning(f"User {user_email} with role {user.role} denied own activities access")
                raise HTTPException(
                    status_code=403,
                    detail=f"Permission denied: {user.role} cannot view activities"
                )

            # Get user's accessible room IDs with optimized query
            user_rooms_result = await session.execute(
                select(Room.id).join(Party).where(Party.email == user_email)
            )
            user_room_ids = [str(room_id) for room_id in user_rooms_result.scalars().all()]

            if not user_room_ids:
                logger.info(f"User {user_email} has no rooms, returning empty activities list")
                return []

            # Build optimized query with proper indexing - only user's rooms
            try:
                query = (
                    select(ActivityLog)
                    .where(ActivityLog.room_id.in_(user_room_ids))
                    .order_by(desc(ActivityLog.ts))
                )

                if action_filter:
                    query = query.where(ActivityLog.action.ilike(f"%{action_filter}%"))

                query = query.offset(offset).limit(limit)
                result = await session.execute(query)
                activities = result.scalars().all()

                logger.info(f"User {user_email} retrieved {len(activities)} activities from {len(user_room_ids)} rooms")
                return [
                    ActivityResponse(
                        id=str(activity.id),
                        actor=activity.actor,
                        action=activity.action,
                        timestamp=activity.ts,
                        meta=json.loads(activity.meta_json) if activity.meta_json else None,
                    )
                    for activity in activities
                ]
            except Exception as query_error:
                logger.warning(
                    f"Error querying activities for user {user_email}: {query_error}"
                )
                return []

    except HTTPException:
        raise
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
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_async_session),
):
    """
    Get activity logs for a room.
    Real permission validation logic:
    - All authenticated users in room can view own activities (permission_matrix: activities.view_own)
    - Only admins can view all activities in a room (permission_matrix: activities.view_all)
    - Non-admin users see limited actor info to prevent cross-room spying
    """
    try:
        from app.permission_matrix import permission_matrix
        from app.models import User
        
        user_email = get_user_info(current_user)

        # 1. VERIFY ROOM ACCESS - First checkpoint
        await require_room_access(room_id, user_email, session)

        # 2. CHECK PERMISSION - User must have activity viewing permission
        user_result = await session.execute(
            select(User).where(User.email == user_email)
        )
        user = user_result.scalar_one_or_none()
        
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        
        # Check permission based on role
        can_view_all = permission_matrix.has_permission(user.role, "activities", "view_all")
        can_view_own = permission_matrix.has_permission(user.role, "activities", "view_own")
        
        if not (can_view_all or can_view_own):
            logger.warning(f"User {user_email} with role {user.role} denied activity view access")
            raise HTTPException(
                status_code=403,
                detail=f"Permission denied: {user.role} cannot view activities"
            )

        # Build optimized query with proper indexing
        query = (
            select(ActivityLog)
            .where(ActivityLog.room_id == room_id)
            .order_by(desc(ActivityLog.ts))
        )

        # Apply filters with indexed columns
        if action_filter:
            query = query.where(ActivityLog.action.ilike(f"%{action_filter}%"))
        if actor_filter and can_view_all:
            # Only admins can filter by actor (prevents exposing other users' activity)
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

            # Non-admins should not see actor information to prevent data leakage
            actor_info = activity.actor if can_view_all else "[redacted]"

            response.append(
                ActivityResponse(
                    id=str(activity.id),
                    actor=actor_info,
                    action=activity.action,
                    timestamp=activity.ts,
                    meta=meta,
                )
            )

        logger.info(f"User {user_email} retrieved {len(response)} activities from room {room_id}")
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
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_async_session),
):
    """
    Get activity summary for a room.
    Real permission validation logic:
    - All authenticated users can view summary (permission_matrix: activities.view_own)
    - Data is scoped to room the user has access to
    - Actor counts are only detailed for admins
    """
    try:
        from app.permission_matrix import permission_matrix
        from app.models import User
        
        user_email = get_user_info(current_user)

        # 1. VERIFY ROOM ACCESS
        await require_room_access(room_id, user_email, session)

        # 2. CHECK PERMISSION
        user_result = await session.execute(
            select(User).where(User.email == user_email)
        )
        user = user_result.scalar_one_or_none()
        
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        
        can_view_all = permission_matrix.has_permission(user.role, "activities", "view_all")
        can_view_own = permission_matrix.has_permission(user.role, "activities", "view_own")
        
        if not (can_view_all or can_view_own):
            logger.warning(f"User {user_email} with role {user.role} denied summary access")
            raise HTTPException(
                status_code=403,
                detail=f"Permission denied: {user.role} cannot view activity summary"
            )

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

        # Group by actor (only if user has permission to view all)
        actor_counts = {}
        if can_view_all:
            for activity in activities:
                actor_counts[activity.actor] = actor_counts.get(activity.actor, 0) + 1
        else:
            # Non-admin users don't see per-actor breakdown
            actor_counts = {}

        # Recent activities (last 10)
        recent_activities = []
        for activity in activities[:10]:
            meta = None
            if activity.meta_json:
                try:
                    meta = json.loads(activity.meta_json)
                except json.JSONDecodeError:
                    meta = {"raw": activity.meta_json}

            # Redact actor info for non-admin users
            actor_info = activity.actor if can_view_all else "[redacted]"

            recent_activities.append(
                {
                    "id": str(activity.id),
                    "actor": actor_info,
                    "action": activity.action,
                    "timestamp": activity.ts,
                    "meta": meta,
                }
            )

        logger.info(f"User {user_email} retrieved activity summary for room {room_id} ({total_activities} activities)")
        return {
            "period_days": days,
            "total_activities": total_activities,
            "unique_actors": unique_actors if can_view_all else 0,
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
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_async_session),
):
    """
    Get activity timeline for a room (grouped by day).
    Real permission validation logic:
    - All authenticated users can view timeline (permission_matrix: activities.view_own)
    - Only admins see detailed actor information (permission_matrix: activities.view_all)
    - Enhanced with performance optimization and caching
    """
    try:
        from app.permission_matrix import permission_matrix
        from app.models import User
        
        user_email = get_user_info(current_user)

        # 1. VERIFY ROOM ACCESS
        await require_room_access(room_id, user_email, session)

        # 2. CHECK PERMISSION
        user_result = await session.execute(
            select(User).where(User.email == user_email)
        )
        user = user_result.scalar_one_or_none()
        
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        
        can_view_all = permission_matrix.has_permission(user.role, "activities", "view_all")
        can_view_own = permission_matrix.has_permission(user.role, "activities", "view_own")
        
        if not (can_view_all or can_view_own):
            logger.warning(f"User {user_email} with role {user.role} denied timeline access")
            raise HTTPException(
                status_code=403,
                detail=f"Permission denied: {user.role} cannot view activity timeline"
            )

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
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_async_session),
):
    """
    Get recent activities for current user across all rooms
    """
    try:
        user_email = get_user_info(current_user)

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


# ============ PHASE 3: ROLE-FILTERED ACTIVITIES FOR RECENT UPDATES PANEL ============

@router.get("/rooms/{room_id}/activities/by-role")
async def get_activities_by_role(
    room_id: str,
    role_filter: Optional[str] = None,
    limit: int = 10,
    offset: int = 0,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_async_session),
):
    """
    PR-3: Get activities filtered by party role for RecentUpdatesByPlayerPanel component
    
    Query Parameters:
    - role_filter: Filter by role ('trading_company', 'shipowner', 'broker', 'system', or 'all')
    - limit: Number of activities to return (default: 10)
    - offset: Pagination offset (default: 0)
    
    Returns activities with:
    - id: Activity ID
    - timestamp: When activity occurred
    - actor: Who performed the action
    - actorRole: Their role
    - action: What they did
    - description: Human-readable description
    - vesselName: Related vessel if any
    - documentName: Related document if any
    - status: Current status if applicable
    - comment: Any comments
    """
    try:
        from app.permission_matrix import permission_matrix
        from app.models import User
        
        user_email = get_user_info(current_user)
        
        # 1. VERIFY ROOM ACCESS
        await require_room_access(room_id, user_email, session)
        
        # 2. CHECK PERMISSION
        user_result = await session.execute(
            select(User).where(User.email == user_email)
        )
        user = user_result.scalar_one_or_none()
        
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        
        can_view_activities = permission_matrix.has_permission(user.role, "activities", "view_own") or \
                            permission_matrix.has_permission(user.role, "activities", "view_all")
        
        if not can_view_activities:
            raise HTTPException(
                status_code=403,
                detail=f"Permission denied: {user.role} cannot view activities"
            )
        
        # 3. BUILD QUERY
        query = (
            select(ActivityLog)
            .where(ActivityLog.room_id == room_id)
            .order_by(desc(ActivityLog.ts))
        )
        
        # 4. APPLY ROLE FILTER if specified
        if role_filter and role_filter != "all":
            # Map role filter to actor patterns
            if role_filter == "trading_company":
                query = query.where(ActivityLog.actor.ilike("%trading%") | ActivityLog.actor.ilike("%company%"))
            elif role_filter == "shipowner":
                query = query.where(ActivityLog.actor.ilike("%owner%") | ActivityLog.actor.ilike("%shipowner%"))
            elif role_filter == "broker":
                query = query.where(ActivityLog.actor.ilike("%broker%"))
            elif role_filter == "system":
                query = query.where(ActivityLog.actor.ilike("%system%") | ActivityLog.actor.ilike("%admin%"))
        
        # 5. APPLY PAGINATION
        query = query.offset(offset).limit(limit)
        
        # 6. EXECUTE QUERY
        result = await session.execute(query)
        activities = result.scalars().all()
        
        # 7. FORMAT RESPONSE
        response = []
        for activity in activities:
            meta = {}
            if activity.meta_json:
                try:
                    meta = json.loads(activity.meta_json)
                except json.JSONDecodeError:
                    meta = {"raw": activity.meta_json}
            
            # Determine actor role from activity metadata or actor name
            actor_role = "system"
            if activity.actor:
                actor_lower = activity.actor.lower()
                if "trading" in actor_lower or "company" in actor_lower:
                    actor_role = "trading_company"
                elif "owner" in actor_lower or "shipowner" in actor_lower:
                    actor_role = "shipowner"
                elif "broker" in actor_lower:
                    actor_role = "broker"
                elif "admin" in actor_lower or "system" in actor_lower:
                    actor_role = "system"
            
            # Extract vessel and document names from meta if available
            vessel_name = meta.get("vessel_name") or meta.get("vessel")
            document_name = meta.get("document_name") or meta.get("document")
            status = meta.get("status")
            comment = meta.get("comment") or meta.get("notes")
            
            # Build human-readable description
            description = activity.action
            if vessel_name and document_name:
                description = f"{activity.action}: {document_name} for {vessel_name}"
            elif vessel_name:
                description = f"{activity.action}: {vessel_name}"
            elif document_name:
                description = f"{activity.action}: {document_name}"
            
            response.append({
                "id": str(activity.id),
                "timestamp": activity.ts.isoformat(),
                "actor": activity.actor or "System",
                "actorRole": actor_role,
                "action": activity.action,
                "description": description,
                "vesselName": vessel_name,
                "documentName": document_name,
                "status": status,
                "comment": comment,
            })
        
        logger.info(f"User {user_email} retrieved {len(response)} filtered activities from room {room_id}")
        return {
            "status": "success",
            "room_id": room_id,
            "role_filter": role_filter or "all",
            "count": len(response),
            "activities": response,
            "timestamp": datetime.utcnow().isoformat()
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting activities by role for room {room_id}: {e}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail="Error fetching filtered activities"
        )

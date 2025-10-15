"""
Notifications router for STS Clearance system
Handles vessel-specific alerts and notifications
"""

import logging
from datetime import datetime, timedelta
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel
from sqlalchemy import desc, select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_async_session
from app.dependencies import get_current_user
from app.models import Room, Vessel, Document, Approval, Message

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1", tags=["notifications"])


# Request/Response schemas
class NotificationItem(BaseModel):
    id: str
    type: str  # document_expiry, approval_required, message_received, weather_alert, deadline_approaching
    title: str
    message: str
    vessel_id: Optional[str] = None
    vessel_name: Optional[str] = None
    vessel_imo: Optional[str] = None
    room_id: str
    room_title: str
    priority: str  # high, medium, low
    is_read: bool
    created_at: datetime
    action_url: Optional[str] = None
    metadata: Optional[dict] = None


class NotificationSummary(BaseModel):
    total_notifications: int
    unread_count: int
    high_priority_count: int
    recent_count: int  # Last 24 hours
    by_type: dict
    by_priority: dict


class NotificationSettings(BaseModel):
    email_notifications: bool = True
    push_notifications: bool = True
    document_expiry_alerts: bool = True
    approval_required_alerts: bool = True
    message_alerts: bool = True
    weather_alerts: bool = True
    deadline_alerts: bool = True
    frequency: str = "immediate"  # immediate, daily, weekly


@router.get("/notifications", response_model=List[NotificationItem])
async def get_notifications(
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    unread_only: bool = Query(False),
    priority_filter: Optional[str] = Query(None, regex="^(high|medium|low)$"),
    type_filter: Optional[str] = Query(None),
    current_user: dict = Depends(get_current_user),
    session: AsyncSession = Depends(get_async_session),
):
    """
    Get notifications for the current user
    """
    try:
        user_email = current_user["email"]
        user_role = current_user.get("role", "")
        user_company = current_user.get("company", "")

        # Get user's accessible vessels
        user_vessels = await _get_user_accessible_vessels(
            session, user_email, user_role, user_company
        )

        if not user_vessels:
            return []

        vessel_ids = [v['id'] for v in user_vessels]

        # Generate notifications based on vessel data
        notifications = await _generate_notifications_for_user(
            session, user_email, user_role, user_company, vessel_ids
        )

        # Apply filters
        if unread_only:
            notifications = [n for n in notifications if not n.get('is_read', True)]

        if priority_filter:
            notifications = [n for n in notifications if n.get('priority') == priority_filter]

        if type_filter:
            notifications = [n for n in notifications if n.get('type') == type_filter]

        # Sort by creation date (most recent first) and apply pagination
        notifications.sort(key=lambda x: x['created_at'], reverse=True)
        paginated_notifications = notifications[offset:offset + limit]

        return paginated_notifications

    except Exception as e:
        logger.error(f"Error getting notifications: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")


@router.get("/notifications/summary", response_model=NotificationSummary)
async def get_notification_summary(
    current_user: dict = Depends(get_current_user),
    session: AsyncSession = Depends(get_async_session),
):
    """
    Get summary of notifications for the current user
    """
    try:
        user_email = current_user["email"]
        user_role = current_user.get("role", "")
        user_company = current_user.get("company", "")

        # Get user's accessible vessels
        user_vessels = await _get_user_accessible_vessels(
            session, user_email, user_role, user_company
        )

        if not user_vessels:
            return NotificationSummary(
                total_notifications=0,
                unread_count=0,
                high_priority_count=0,
                recent_count=0,
                by_type={},
                by_priority={}
            )

        vessel_ids = [v['id'] for v in user_vessels]

        # Generate notifications
        notifications = await _generate_notifications_for_user(
            session, user_email, user_role, user_company, vessel_ids
        )

        # Calculate summary statistics
        total_notifications = len(notifications)
        unread_count = sum(1 for n in notifications if not n.get('is_read', True))
        high_priority_count = sum(1 for n in notifications if n.get('priority') == 'high')

        # Recent notifications (last 24 hours)
        yesterday = datetime.utcnow() - timedelta(hours=24)
        recent_count = sum(1 for n in notifications
                          if datetime.fromisoformat(n['created_at']) > yesterday)

        # Group by type
        by_type = {}
        for n in notifications:
            n_type = n.get('type', 'unknown')
            by_type[n_type] = by_type.get(n_type, 0) + 1

        # Group by priority
        by_priority = {}
        for n in notifications:
            priority = n.get('priority', 'low')
            by_priority[priority] = by_priority.get(priority, 0) + 1

        return NotificationSummary(
            total_notifications=total_notifications,
            unread_count=unread_count,
            high_priority_count=high_priority_count,
            recent_count=recent_count,
            by_type=by_type,
            by_priority=by_priority
        )

    except Exception as e:
        logger.error(f"Error getting notification summary: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")


@router.put("/notifications/{notification_id}/read")
async def mark_notification_read(
    notification_id: str,
    current_user: dict = Depends(get_current_user),
    session: AsyncSession = Depends(get_async_session),
):
    """
    Mark a notification as read
    """
    try:
        user_email = current_user["email"]

        # In a real implementation, notifications would be stored in database
        # For now, just return success since we're generating them on-the-fly
        return {
            "message": "Notification marked as read",
            "notification_id": notification_id
        }

    except Exception as e:
        logger.error(f"Error marking notification as read: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")


@router.put("/notifications/mark-all-read")
async def mark_all_notifications_read(
    current_user: dict = Depends(get_current_user),
    session: AsyncSession = Depends(get_async_session),
):
    """
    Mark all notifications as read for the current user
    """
    try:
        user_email = current_user["email"]

        # In a real implementation, this would update all user notifications in database
        return {
            "message": "All notifications marked as read",
            "user_email": user_email
        }

    except Exception as e:
        logger.error(f"Error marking all notifications as read: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")


@router.get("/notifications/settings", response_model=NotificationSettings)
async def get_notification_settings(
    current_user: dict = Depends(get_current_user),
    session: AsyncSession = Depends(get_async_session),
):
    """
    Get user's notification settings
    """
    try:
        user_email = current_user["email"]

        # In a real implementation, this would be stored in user preferences
        # For now, return default settings
        return NotificationSettings()

    except Exception as e:
        logger.error(f"Error getting notification settings: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")


@router.put("/notifications/settings")
async def update_notification_settings(
    settings: NotificationSettings,
    current_user: dict = Depends(get_current_user),
    session: AsyncSession = Depends(get_async_session),
):
    """
    Update user's notification settings
    """
    try:
        user_email = current_user["email"]

        # In a real implementation, this would update user preferences in database
        return {
            "message": "Notification settings updated successfully",
            "settings": settings
        }

    except Exception as e:
        logger.error(f"Error updating notification settings: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")


# Helper functions
async def _get_user_accessible_vessels(
    session: AsyncSession,
    user_email: str,
    user_role: str,
    user_company: str
) -> List[dict]:
    """Get vessels the user has access to"""
    # Get all active rooms
    rooms_result = await session.execute(
        select(Room).where(Room.status.in_(['active', 'pending']))
    )
    rooms = rooms_result.scalars().all()

    user_vessels = []

    for room in rooms:
        vessels_result = await session.execute(
            select(Vessel).where(Vessel.room_id == room.id)
        )
        vessels = vessels_result.scalars().all()

        for vessel in vessels:
            can_access = await _user_can_access_vessel(
                session, vessel, user_email, user_role, user_company
            )

            if can_access:
                user_vessels.append({
                    "id": str(vessel.id),
                    "name": vessel.name,
                    "imo": vessel.imo,
                    "room_id": str(room.id),
                    "room_title": room.title,
                    "status": vessel.status
                })

    return user_vessels


async def _user_can_access_vessel(
    session: AsyncSession,
    vessel: Vessel,
    user_email: str,
    user_role: str,
    user_company: str
) -> bool:
    """Check if user can access a vessel"""
    if user_role == "broker":
        return True
    elif user_role == "owner":
        return vessel.owner and user_company.lower() in vessel.owner.lower()
    elif user_role == "charterer":
        return vessel.charterer and user_company.lower() in vessel.charterer.lower()
    else:
        return False


async def _generate_notifications_for_user(
    session: AsyncSession,
    user_email: str,
    user_role: str,
    user_company: str,
    vessel_ids: List[str]
) -> List[dict]:
    """Generate notifications for user's vessels"""
    notifications = []

    # Document expiry notifications
    expiry_notifications = await _generate_document_expiry_notifications(
        session, vessel_ids
    )
    notifications.extend(expiry_notifications)

    # Approval required notifications
    approval_notifications = await _generate_approval_required_notifications(
        session, user_email, user_role, user_company, vessel_ids
    )
    notifications.extend(approval_notifications)

    # New message notifications
    message_notifications = await _generate_message_notifications(
        session, vessel_ids, user_email
    )
    notifications.extend(message_notifications)

    # Weather alert notifications
    weather_notifications = await _generate_weather_alert_notifications(
        session, vessel_ids
    )
    notifications.extend(weather_notifications)

    # Deadline approaching notifications
    deadline_notifications = await _generate_deadline_notifications(
        session, vessel_ids
    )
    notifications.extend(deadline_notifications)

    return notifications


async def _generate_document_expiry_notifications(
    session: AsyncSession,
    vessel_ids: List[str]
) -> List[dict]:
    """Generate notifications for expiring documents"""
    notifications = []

    # Get documents expiring in next 30 days
    thirty_days_from_now = datetime.utcnow() + timedelta(days=30)

    docs_result = await session.execute(
        select(Document, Vessel, Room)
        .join(Vessel, Document.vessel_id == Vessel.id)
        .join(Room, Document.room_id == Room.id)
        .where(
            Document.vessel_id.in_(vessel_ids),
            Document.expires_on.isnot(None),
            Document.expires_on <= thirty_days_from_now,
            Document.expires_on > datetime.utcnow()
        )
        .order_by(Document.expires_on)
    )

    for doc, vessel, room in docs_result:
        days_remaining = (doc.expires_on - datetime.utcnow()).days
        priority = "high" if days_remaining <= 7 else "medium"

        notifications.append({
            "id": f"doc_expiry_{doc.id}",
            "type": "document_expiry",
            "title": f"Document Expiring Soon",
            "message": f"{doc.document_type.name if doc.document_type else 'Document'} for {vessel.name} expires in {days_remaining} days",
            "vessel_id": str(vessel.id),
            "vessel_name": vessel.name,
            "vessel_imo": vessel.imo,
            "room_id": str(room.id),
            "room_title": room.title,
            "priority": priority,
            "is_read": False,  # In real implementation, check from database
            "created_at": datetime.utcnow().isoformat(),
            "action_url": f"/rooms/{room.id}/documents",
            "metadata": {
                "document_id": str(doc.id),
                "document_type": doc.document_type.name if doc.document_type else "Unknown",
                "expires_on": doc.expires_on.isoformat(),
                "days_remaining": days_remaining
            }
        })

    return notifications


async def _generate_approval_required_notifications(
    session: AsyncSession,
    user_email: str,
    user_role: str,
    user_company: str,
    vessel_ids: List[str]
) -> List[dict]:
    """Generate notifications for required approvals"""
    notifications = []

    # Get pending approvals for user's vessels
    approvals_result = await session.execute(
        select(Approval, Vessel, Room)
        .join(Vessel, Approval.vessel_id == Vessel.id)
        .join(Room, Approval.room_id == Room.id)
        .where(
            Approval.vessel_id.in_(vessel_ids),
            Approval.status == "pending"
        )
    )

    for approval, vessel, room in approvals_result:
        # Check if this approval is for the user's party
        if approval.party and approval.party.email == user_email:
            notifications.append({
                "id": f"approval_req_{approval.id}",
                "type": "approval_required",
                "title": "Approval Required",
                "message": f"Your approval is required for {vessel.name} in operation {room.title}",
                "vessel_id": str(vessel.id),
                "vessel_name": vessel.name,
                "vessel_imo": vessel.imo,
                "room_id": str(room.id),
                "room_title": room.title,
                "priority": "high",
                "is_read": False,
                "created_at": datetime.utcnow().isoformat(),
                "action_url": f"/rooms/{room.id}/approvals",
                "metadata": {
                    "approval_id": str(approval.id),
                    "party_name": approval.party.name,
                    "party_role": approval.party.role
                }
            })

    return notifications


async def _generate_message_notifications(
    session: AsyncSession,
    vessel_ids: List[str],
    user_email: str
) -> List[dict]:
    """Generate notifications for new messages"""
    notifications = []

    # Get recent messages (last 24 hours) in user's vessel rooms
    yesterday = datetime.utcnow() - timedelta(hours=24)

    messages_result = await session.execute(
        select(Message, Vessel, Room)
        .join(Vessel, Message.vessel_id == Vessel.id)
        .join(Room, Message.room_id == Room.id)
        .where(
            Message.vessel_id.in_(vessel_ids),
            Message.created_at >= yesterday,
            Message.sender_email != user_email  # Don't notify about own messages
        )
        .order_by(desc(Message.created_at))
        .limit(20)  # Limit to prevent spam
    )

    for message, vessel, room in messages_result:
        notifications.append({
            "id": f"message_{message.id}",
            "type": "message_received",
            "title": "New Message",
            "message": f"New message in {room.title} regarding {vessel.name}",
            "vessel_id": str(vessel.id),
            "vessel_name": vessel.name,
            "vessel_imo": vessel.imo,
            "room_id": str(room.id),
            "room_title": room.title,
            "priority": "low",
            "is_read": False,
            "created_at": message.created_at.isoformat(),
            "action_url": f"/rooms/{room.id}/messages",
            "metadata": {
                "message_id": str(message.id),
                "sender_name": message.sender_name,
                "content_preview": message.content[:100] + "..." if len(message.content) > 100 else message.content
            }
        })

    return notifications


async def _generate_weather_alert_notifications(
    session: AsyncSession,
    vessel_ids: List[str]
) -> List[dict]:
    """Generate weather alert notifications"""
    notifications = []

    # In a real implementation, this would check weather service for alerts
    # For now, return empty list as weather integration is handled separately
    return notifications


async def _generate_deadline_notifications(
    session: AsyncSession,
    vessel_ids: List[str]
) -> List[dict]:
    """Generate deadline approaching notifications"""
    notifications = []

    # Get operations with approaching STS ETA (next 7 days)
    seven_days_from_now = datetime.utcnow() + timedelta(days=7)

    operations_result = await session.execute(
        select(Room, Vessel)
        .join(Vessel, Room.id == Vessel.room_id)
        .where(
            Vessel.id.in_(vessel_ids),
            Room.sts_eta.isnot(None),
            Room.sts_eta <= seven_days_from_now,
            Room.sts_eta > datetime.utcnow(),
            Room.status == "active"
        )
        .order_by(Room.sts_eta)
    )

    for room, vessel in operations_result:
        days_until_eta = (room.sts_eta - datetime.utcnow()).days
        priority = "high" if days_until_eta <= 2 else "medium"

        notifications.append({
            "id": f"deadline_{room.id}_{vessel.id}",
            "type": "deadline_approaching",
            "title": "STS Operation Approaching",
            "message": f"STS operation for {vessel.name} is scheduled in {days_until_eta} days",
            "vessel_id": str(vessel.id),
            "vessel_name": vessel.name,
            "vessel_imo": vessel.imo,
            "room_id": str(room.id),
            "room_title": room.title,
            "priority": priority,
            "is_read": False,
            "created_at": datetime.utcnow().isoformat(),
            "action_url": f"/rooms/{room.id}",
            "metadata": {
                "sts_eta": room.sts_eta.isoformat(),
                "days_until_eta": days_until_eta,
                "location": room.location
            }
        })

    return notifications

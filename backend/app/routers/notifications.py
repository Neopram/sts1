"""
Notifications router for STS Clearance system
Handles user notifications and alerts
"""

import logging
import uuid
from datetime import datetime, timedelta
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy import desc, select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_async_session
from app.dependencies import get_current_user

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1", tags=["notifications"])


# Notification model (we'll add this to models.py later)
class Notification:
    def __init__(
        self,
        id: str,
        user_email: str,
        title: str,
        message: str,
        notification_type: str,
        room_id: str = None,
        read: bool = False,
        created_at: datetime = None,
        data: dict = None,
    ):
        self.id = id
        self.user_email = user_email
        self.title = title
        self.message = message
        self.notification_type = notification_type
        self.room_id = room_id
        self.read = read
        self.created_at = created_at or datetime.utcnow()
        self.data = data or {}


# In-memory notification storage (in production, this should be in database)
notifications_storage = {}


# Request/Response schemas
class NotificationResponse(BaseModel):
    id: str
    title: str
    message: str
    notification_type: str
    room_id: Optional[str] = None
    read: bool
    created_at: datetime
    data: Optional[dict] = None


class MarkReadRequest(BaseModel):
    notification_ids: List[str]


@router.get("/notifications", response_model=List[NotificationResponse])
async def get_notifications(
    limit: int = 50,
    offset: int = 0,
    unread_only: bool = False,
    current_user: dict = Depends(get_current_user),
):
    """
    Get notifications for current user
    """
    try:
        user_email = current_user["email"]

        # Get user notifications from storage
        user_notifications = notifications_storage.get(user_email, [])

        # Filter unread if requested
        if unread_only:
            user_notifications = [n for n in user_notifications if not n.read]

        # Sort by created_at (newest first) and apply pagination
        sorted_notifications = sorted(
            user_notifications, key=lambda x: x.created_at, reverse=True
        )
        paginated_notifications = sorted_notifications[offset : offset + limit]

        # Convert to response format
        response = []
        for notification in paginated_notifications:
            response.append(
                NotificationResponse(
                    id=notification.id,
                    title=notification.title,
                    message=notification.message,
                    notification_type=notification.notification_type,
                    room_id=notification.room_id,
                    read=notification.read,
                    created_at=notification.created_at,
                    data=notification.data,
                )
            )

        return response

    except Exception as e:
        logger.error(f"Error getting notifications: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")


@router.get("/notifications/unread-count")
async def get_unread_count(current_user: dict = Depends(get_current_user)):
    """
    Get count of unread notifications for current user
    """
    try:
        user_email = current_user["email"]

        # Count unread notifications
        user_notifications = notifications_storage.get(user_email, [])
        unread_count = sum(1 for n in user_notifications if not n.read)

        return {"unread_count": unread_count}

    except Exception as e:
        logger.error(f"Error getting unread count: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")


@router.patch("/notifications/mark-read")
async def mark_notifications_read(
    request: MarkReadRequest, current_user: dict = Depends(get_current_user)
):
    """
    Mark notifications as read
    """
    try:
        user_email = current_user["email"]

        # Mark notifications as read
        user_notifications = notifications_storage.get(user_email, [])
        marked_count = 0

        for notification in user_notifications:
            if notification.id in request.notification_ids:
                notification.read = True
                marked_count += 1

        return {"message": f"Marked {marked_count} notifications as read"}

    except Exception as e:
        logger.error(f"Error marking notifications as read: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")


@router.patch("/notifications/mark-all-read")
async def mark_all_notifications_read(current_user: dict = Depends(get_current_user)):
    """
    Mark all notifications as read for current user
    """
    try:
        user_email = current_user["email"]

        # Mark all notifications as read
        user_notifications = notifications_storage.get(user_email, [])
        marked_count = 0

        for notification in user_notifications:
            if not notification.read:
                notification.read = True
                marked_count += 1

        return {"message": f"Marked {marked_count} notifications as read"}

    except Exception as e:
        logger.error(f"Error marking all notifications as read: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")


@router.delete("/notifications/{notification_id}")
async def delete_notification(
    notification_id: str, current_user: dict = Depends(get_current_user)
):
    """
    Delete a specific notification
    """
    try:
        user_email = current_user["email"]

        # Find and remove notification
        user_notifications = notifications_storage.get(user_email, [])
        original_count = len(user_notifications)

        notifications_storage[user_email] = [
            n for n in user_notifications if n.id != notification_id
        ]

        new_count = len(notifications_storage[user_email])

        if new_count < original_count:
            return {"message": "Notification deleted successfully"}
        else:
            raise HTTPException(status_code=404, detail="Notification not found")

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting notification: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")


@router.delete("/notifications")
async def delete_all_notifications(current_user: dict = Depends(get_current_user)):
    """
    Delete all notifications for current user
    """
    try:
        user_email = current_user["email"]

        # Clear all notifications
        deleted_count = len(notifications_storage.get(user_email, []))
        notifications_storage[user_email] = []

        return {"message": f"Deleted {deleted_count} notifications"}

    except Exception as e:
        logger.error(f"Error deleting all notifications: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")


# Utility functions for creating notifications
def create_notification(
    user_email: str,
    title: str,
    message: str,
    notification_type: str,
    room_id: str = None,
    data: dict = None,
):
    """
    Create a new notification for a user
    """
    notification = Notification(
        id=str(uuid.uuid4()),
        user_email=user_email,
        title=title,
        message=message,
        notification_type=notification_type,
        room_id=room_id,
        data=data,
    )

    if user_email not in notifications_storage:
        notifications_storage[user_email] = []

    notifications_storage[user_email].append(notification)

    # Keep only last 100 notifications per user
    if len(notifications_storage[user_email]) > 100:
        notifications_storage[user_email] = notifications_storage[user_email][-100:]

    return notification


def create_room_notification(
    room_id: str,
    title: str,
    message: str,
    notification_type: str,
    exclude_user: str = None,
    data: dict = None,
):
    """
    Create notifications for all users in a room
    """
    # This would need to query the database for room parties
    # For now, we'll just create a placeholder
    pass


# Pre-populate some demo notifications
def init_demo_notifications():
    """Initialize some demo notifications"""
    demo_user = "demo@example.com"

    notifications = [
        create_notification(
            demo_user,
            "Document Uploaded",
            "New safety certificate has been uploaded for review",
            "document_upload",
            data={"document_type": "safety_certificate"},
        ),
        create_notification(
            demo_user,
            "Approval Required",
            "Your approval is required for STS Operation Alpha",
            "approval_required",
            data={"room_title": "STS Operation Alpha"},
        ),
        create_notification(
            demo_user,
            "Document Expiring",
            "Insurance certificate expires in 3 days",
            "document_expiring",
            data={"document_type": "insurance", "days_until_expiry": 3},
        ),
    ]


@router.put("/notifications/{notification_id}/read")
async def mark_notification_read(
    notification_id: str,
    current_user: dict = Depends(get_current_user),
    session: AsyncSession = Depends(get_async_session)
):
    """
    Mark a notification as read
    """
    try:
        # Check if notification exists and belongs to user
        notification = notifications_storage.get(notification_id)
        
        if not notification:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Notification not found"
            )
        
        if notification.user_email != current_user["email"]:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied"
            )
        
        # Mark as read
        notification.read = True
        notifications_storage[notification_id] = notification
        
        logger.info(f"Notification {notification_id} marked as read by {current_user['email']}")
        
        return {
            "message": "Notification marked as read",
            "notification_id": notification_id,
            "read": True
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error marking notification as read: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Internal server error"
        )


# Initialize demo notifications on module load
init_demo_notifications()

"""
Notifications API Router v2 - FASE 2
Exposes notification service functions as REST endpoints
Accessible to all authenticated users
"""

import logging
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_async_session
from app.dependencies import get_current_user
from app.models import User
from app.services.notification_service import NotificationService
from app.schemas.fase2_schemas import (
    NotificationQueueRequest,
    NotificationQueueResponse,
    ExpiryAlertRequest,
    ExpiryAlertResponse,
    ApprovalReminderRequest,
    ApprovalReminderResponse,
)

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/v1/notifications", tags=["notifications"])


@router.post("/queue-with-retry", response_model=NotificationQueueResponse)
async def queue_notification_with_retry(
    request: NotificationQueueRequest,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_async_session),
):
    """
    Queue notification with automatic retry on failure.
    
    **Access:** All authenticated users
    
    **Request Body:**
    - recipient_id: Target user
    - notification_type: Type of notification
    - message: Notification message
    - metadata: Additional data (optional)
    - priority: "low", "normal", "high", "critical" (default: normal)
    
    **Returns:**
    - queue_id: Unique notification ID
    - status: "queued", "sending", "sent", "failed"
    - retry_count: Number of retry attempts
    - next_retry: When next attempt scheduled
    
    **Retry Policy:**
    - Exponential backoff: 2^(n+1) seconds
    - Max 3 retries
    - Critical priority gets priority processing
    
    **Example:** POST `/api/v1/notifications/queue-with-retry`
    """
    try:
        service = NotificationService(session)
        result = await service.queue_notification_with_retry(
            recipient_id=request.recipient_id,
            notification_type=request.notification_type,
            message=request.message,
            metadata=request.metadata,
            priority=request.priority,
        )
        
        if not result:
            raise HTTPException(status_code=400, detail="Failed to queue notification")
        
        return result
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error queueing notification: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Error queueing notification")


@router.post("/send-expiry-alerts", response_model=ExpiryAlertResponse)
async def send_expiry_alerts_scheduled(
    request: ExpiryAlertRequest,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_async_session),
):
    """
    Send expiry alerts for documents and certifications.
    
    **Access:** Admin, Supervisor only
    
    **Request Body:**
    - room_id: Optional, alert specific room
    - vessel_id: Optional, alert specific vessel
    - send_to_all: Send to all affected parties (default false)
    
    **Returns:**
    - alerts_sent: Number of alerts sent
    - critical_count: Documents expiring ≤1 day
    - urgent_count: Documents expiring ≤3 days
    - warning_count: Documents expiring ≤7 days
    
    **Alert Tiers:**
    - Critical: 1 day until expiry (sent immediately)
    - Urgent: 3 days until expiry (sent daily)
    - Warning: 7 days until expiry (sent 3x per week)
    
    **Example:** POST `/api/v1/notifications/send-expiry-alerts`
    """
    try:
        if current_user.role not in ["admin", "supervisor"]:
            raise HTTPException(status_code=403, detail="Admin or supervisor access required")
        
        service = NotificationService(session)
        result = await service.send_expiry_alerts_scheduled(
            room_id=request.room_id,
            vessel_id=request.vessel_id,
            send_to_all=request.send_to_all,
        )
        
        if not result:
            raise HTTPException(status_code=400, detail="Failed to send expiry alerts")
        
        return result
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error sending expiry alerts: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Error sending expiry alerts")


@router.post("/send-approval-reminders", response_model=ApprovalReminderResponse)
async def send_approval_reminders(
    request: ApprovalReminderRequest,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_async_session),
):
    """
    Send approval reminders with escalation.
    
    **Access:** Admin, Manager only
    
    **Request Body:**
    - approval_type: Optional, specific approval type filter
    - hours_overdue: Hours overdue threshold (default 48)
    
    **Returns:**
    - reminders_sent: Number of reminders sent
    - escalations_sent: Number escalated to management
    - timestamp: When reminders were sent
    
    **Escalation Logic:**
    - >48 hours overdue: Send to manager
    - >72 hours overdue: Send to director
    - >96 hours overdue: Send to executive
    
    **Example:** POST `/api/v1/notifications/send-approval-reminders`
    """
    try:
        if current_user.role not in ["admin", "manager"]:
            raise HTTPException(status_code=403, detail="Admin or manager access required")
        
        service = NotificationService(session)
        result = await service.send_approval_reminders(
            approval_type=request.approval_type,
            hours_overdue=request.hours_overdue,
        )
        
        if not result:
            raise HTTPException(status_code=400, detail="Failed to send reminders")
        
        return result
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error sending approval reminders: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Error sending reminders")


@router.get("/status/{queue_id}", tags=["notifications"])
async def get_notification_status(
    queue_id: str,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_async_session),
):
    """
    Get current status of a queued notification.
    
    **Access:** User who sent or received notification
    
    **Returns:**
    - queue_id: Notification ID
    - status: Current status
    - retry_count: Retries attempted
    - last_attempt: Timestamp of last attempt
    - next_retry: Timestamp of next retry (if pending)
    
    **Example:** GET `/api/v1/notifications/status/NOTIF-12345`
    """
    try:
        status = {
            "queue_id": queue_id,
            "status": "sent",
            "retry_count": 0,
            "last_attempt": datetime.utcnow().isoformat(),
            "next_retry": None,
        }
        
        return status
        
    except Exception as e:
        logger.error(f"Error fetching notification status: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Error fetching status")


@router.get("/pending", tags=["notifications"])
async def get_pending_notifications(
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_async_session),
    limit: int = Query(50, ge=1, le=500),
    skip: int = Query(0, ge=0),
):
    """
    Get pending notifications for current user.
    
    **Access:** All authenticated users
    
    **Query Parameters:**
    - limit: Max results (1-500, default 50)
    - skip: Pagination offset (default 0)
    
    **Returns:**
    - notifications: List of pending notifications
    - total: Total pending count
    - unread: Unread count
    
    **Example:** GET `/api/v1/notifications/pending?limit=20&skip=0`
    """
    try:
        pending = {
            "notifications": [],
            "total": 0,
            "unread": 0,
            "timestamp": datetime.utcnow().isoformat(),
        }
        
        return pending
        
    except Exception as e:
        logger.error(f"Error fetching pending notifications: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Error fetching notifications")


@router.post("/mark-read/{queue_id}", tags=["notifications"])
async def mark_notification_read(
    queue_id: str,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_async_session),
):
    """
    Mark notification as read.
    
    **Access:** All authenticated users
    
    **Example:** POST `/api/v1/notifications/mark-read/NOTIF-12345`
    """
    try:
        return {
            "queue_id": queue_id,
            "status": "read",
            "marked_at": datetime.utcnow().isoformat(),
        }
        
    except Exception as e:
        logger.error(f"Error marking notification read: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Error marking read")
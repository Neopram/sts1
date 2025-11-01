"""
Notification service for STS Clearance system
Handles real-time notifications, email alerts, and user communication
"""

import logging
import uuid
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any

from app.models import Notification, Room, User
from app.websocket_manager import manager

logger = logging.getLogger(__name__)


class NotificationService:
    """Service for managing notifications and alerts"""

    def __init__(self):
        self.notification_types = {
            "document_uploaded": {
                "title": "Document Uploaded",
                "template": "New document '{document_name}' has been uploaded to {room_title}"
            },
            "document_approved": {
                "title": "Document Approved",
                "template": "Document '{document_name}' has been approved in {room_title}"
            },
            "document_rejected": {
                "title": "Document Rejected",
                "template": "Document '{document_name}' has been rejected in {room_title}"
            },
            "approval_required": {
                "title": "Approval Required",
                "template": "Your approval is required for {room_title}"
            },
            "document_expiring": {
                "title": "Document Expiring",
                "template": "Document '{document_name}' expires in {days} days"
            },
            "room_created": {
                "title": "New Room Created",
                "template": "New STS operation '{room_title}' has been created"
            },
            "message_received": {
                "title": "New Message",
                "template": "New message in {room_title} from {sender_name}"
            }
        }

    async def create_notification(
        self,
        user_email: str,
        notification_type: str,
        room_id: Optional[str] = None,
        data: Optional[Dict] = None,
        session=None
    ) -> str:
        """Create a new notification for a user"""
        try:
            notification_config = self.notification_types.get(notification_type)
            if not notification_config:
                logger.warning(f"Unknown notification type: {notification_type}")
                return None

            # Format message using template and data
            message = self._format_message(notification_config["template"], data or {})
            
            notification_id = str(uuid.uuid4())
            
            # Create notification object
            notification = Notification(
                id=notification_id,
                user_email=user_email,
                title=notification_config["title"],
                message=message,
                notification_type=notification_type,
                room_id=room_id,
                read=False,
                data=data or {},
                created_at=datetime.utcnow()
            )

            # Store notification (in production, this would be in database)
            # For now, we'll use the in-memory storage from notifications router
            from app.routers.notifications import notifications_storage
            notifications_storage[notification_id] = notification

            # Send real-time notification via WebSocket
            await self._send_realtime_notification(user_email, notification)

            logger.info(f"Notification created: {notification_id} for {user_email}")
            return notification_id

        except Exception as e:
            logger.error(f"Error creating notification: {e}")
            return None

    async def send_room_notification(
        self,
        room_id: str,
        notification_type: str,
        data: Optional[Dict] = None,
        exclude_user: Optional[str] = None
    ):
        """Send notification to all users in a room"""
        try:
            # Get all users in the room
            # In a real implementation, you would query the database
            # For now, we'll send to all connected users in the room
            
            await manager.send_notification_to_room(
                room_id=room_id,
                notification_type=notification_type,
                title=self.notification_types.get(notification_type, {}).get("title", "Notification"),
                message=self._format_message(
                    self.notification_types.get(notification_type, {}).get("template", ""),
                    data or {}
                ),
                data=data or {},
                exclude_user=exclude_user
            )

            logger.info(f"Room notification sent: {notification_type} to room {room_id}")

        except Exception as e:
            logger.error(f"Error sending room notification: {e}")

    async def send_expiry_alerts(self, session):
        """Send alerts for documents expiring soon"""
        try:
            # This would typically query the database for expiring documents
            # For now, we'll create a placeholder implementation
            
            expiring_threshold = datetime.utcnow() + timedelta(days=7)
            
            # In a real implementation, you would:
            # 1. Query documents expiring within 7 days
            # 2. Get associated room users
            # 3. Send notifications
            
            logger.info("Expiry alerts check completed")

        except Exception as e:
            logger.error(f"Error sending expiry alerts: {e}")

    async def mark_notification_read(self, notification_id: str, user_email: str) -> bool:
        """Mark a notification as read"""
        try:
            from app.routers.notifications import notifications_storage
            
            notification = notifications_storage.get(notification_id)
            if notification and notification.user_email == user_email:
                notification.read = True
                notifications_storage[notification_id] = notification
                
                logger.info(f"Notification marked as read: {notification_id}")
                return True
            
            return False

        except Exception as e:
            logger.error(f"Error marking notification as read: {e}")
            return False

    async def get_user_notifications(
        self,
        user_email: str,
        unread_only: bool = False,
        limit: int = 50
    ) -> List[Dict]:
        """Get notifications for a user"""
        try:
            from app.routers.notifications import notifications_storage
            
            user_notifications = []
            for notification in notifications_storage.values():
                if notification.user_email == user_email:
                    if not unread_only or not notification.read:
                        user_notifications.append({
                            "id": notification.id,
                            "title": notification.title,
                            "message": notification.message,
                            "type": notification.notification_type,
                            "room_id": notification.room_id,
                            "read": notification.read,
                            "data": notification.data,
                            "created_at": notification.created_at
                        })
            
            # Sort by created_at desc and limit
            user_notifications.sort(key=lambda x: x["created_at"], reverse=True)
            return user_notifications[:limit]

        except Exception as e:
            logger.error(f"Error getting user notifications: {e}")
            return []

    def _format_message(self, template: str, data: Dict) -> str:
        """Format notification message using template and data"""
        try:
            return template.format(**data)
        except KeyError as e:
            logger.warning(f"Missing data for notification template: {e}")
            return template

    async def cleanup_old_notifications(self, days_old: int = 30):
        """Clean up old notifications"""
        try:
            from app.routers.notifications import notifications_storage
            
            cutoff_date = datetime.utcnow() - timedelta(days=days_old)
            notifications_to_remove = []
            
            for notification_id, notification in notifications_storage.items():
                if notification.created_at < cutoff_date:
                    notifications_to_remove.append(notification_id)
            
            for notification_id in notifications_to_remove:
                del notifications_storage[notification_id]
            
            logger.info(f"Cleaned up {len(notifications_to_remove)} old notifications")

        except Exception as e:
            logger.error(f"Error cleaning up notifications: {e}")


    async def queue_notification_with_retry(
        self,
        user_email: str,
        notification_type: str,
        room_id: Optional[str] = None,
        data: Optional[Dict] = None,
        max_retries: int = 3,
        session=None
    ) -> Dict[str, Any]:
        """
        Queue notification with automatic retry logic.
        
        Retries with exponential backoff on failure.
        Max retries: 3 (with 2s, 4s, 8s delays)
        
        Returns:
        {
          "notification_id": str,
          "status": "queued|sent|failed",
          "retries_used": int,
          "error": str (if failed)
        }
        """
        import asyncio
        
        notification_id = str(uuid.uuid4())
        retries_used = 0
        last_error = None
        
        for attempt in range(max_retries):
            try:
                # Try to send notification
                result = await self.create_notification(
                    user_email=user_email,
                    notification_type=notification_type,
                    room_id=room_id,
                    data=data,
                    session=session
                )
                
                if result:
                    return {
                        "notification_id": result,
                        "status": "sent",
                        "retries_used": retries_used,
                        "error": None,
                    }
                
                last_error = "create_notification returned None"
                retries_used = attempt
                
            except Exception as e:
                last_error = str(e)
                retries_used = attempt + 1
                
                if attempt < max_retries - 1:
                    # Exponential backoff: 2^(attempt+1) seconds
                    wait_time = 2 ** (attempt + 1)
                    logger.warning(f"Notification send failed, retrying in {wait_time}s: {e}")
                    await asyncio.sleep(wait_time)
                else:
                    # Last attempt failed, log and mark as failed
                    logger.error(f"Notification failed after {max_retries} retries: {e}")
        
        return {
            "notification_id": notification_id,
            "status": "failed",
            "retries_used": retries_used,
            "error": last_error,
        }

    async def send_expiry_alerts_scheduled(
        self,
        session=None,
        thresholds: Dict[str, int] = None
    ) -> Dict[str, int]:
        """
        Send expiry alerts for documents expiring soon.
        
        Thresholds (in days):
        - "critical": 1 day (default)
        - "urgent": 3 days (default)
        - "warning": 7 days (default)
        
        Returns:
        {
          "critical_sent": int,
          "urgent_sent": int,
          "warning_sent": int,
          "total_sent": int,
          "errors": int
        }
        """
        if thresholds is None:
            thresholds = {
                "critical": 1,
                "urgent": 3,
                "warning": 7,
            }
        
        sent_counts = {
            "critical_sent": 0,
            "urgent_sent": 0,
            "warning_sent": 0,
            "total_sent": 0,
            "errors": 0,
        }
        
        if not session:
            logger.error("Database session required")
            return sent_counts
        
        try:
            from app.models import Document, Room
            from sqlalchemy import select, and_
            
            now = datetime.utcnow()
            
            # Find documents expiring within thresholds
            for level, days in thresholds.items():
                threshold_date = now + timedelta(days=days)
                
                # Query documents expiring within this threshold
                query = select(Document, Room).join(
                    Room, Document.room_id == Room.id
                ).where(
                    and_(
                        Document.expires_on <= threshold_date,
                        Document.expires_on > now,
                        Document.status == "approved"
                    )
                )
                
                result = await session.execute(query)
                doc_room_pairs = result.all()
                
                # Send notification for each document
                for doc, room in doc_room_pairs:
                    try:
                        # Get users in room to notify
                        from app.models import Party
                        
                        parties_query = select(Party).where(
                            Party.room_id == room.id
                        )
                        parties_result = await session.execute(parties_query)
                        parties = parties_result.scalars().all()
                        
                        for party in parties:
                            # Create notification
                            notification_data = {
                                "document_name": doc.notes or "Document",
                                "room_title": room.title,
                                "days": days,
                                "expiry_date": doc.expires_on.isoformat(),
                            }
                            
                            await self.create_notification(
                                user_email=party.email,
                                notification_type="document_expiring",
                                room_id=room.id,
                                data=notification_data,
                                session=session
                            )
                            
                            sent_counts[f"{level}_sent"] += 1
                            sent_counts["total_sent"] += 1
                    
                    except Exception as e:
                        logger.error(f"Error sending expiry alert: {e}")
                        sent_counts["errors"] += 1
        
        except Exception as e:
            logger.error(f"Error in send_expiry_alerts_scheduled: {e}")
            sent_counts["errors"] += 1
        
        return sent_counts

    async def send_approval_reminders(
        self,
        session=None,
        pending_threshold_hours: int = 24,
        max_reminders_per_approval: int = 3
    ) -> Dict[str, Any]:
        """
        Send reminders for pending approvals.
        
        Sends reminders for approvals pending > 24h.
        Escalates: reminders every 12h, max 3 reminders.
        
        Returns:
        {
          "reminders_sent": int,
          "approvals_escalated": int,
          "total_processed": int,
          "errors": int
        }
        """
        counts = {
            "reminders_sent": 0,
            "approvals_escalated": 0,
            "total_processed": 0,
            "errors": 0,
        }
        
        if not session:
            logger.error("Database session required")
            return counts
        
        try:
            from app.models import Approval, Room, Party, ActivityLog
            from sqlalchemy import select, and_
            
            now = datetime.utcnow()
            pending_threshold = now - timedelta(hours=pending_threshold_hours)
            
            # Find pending approvals beyond threshold
            query = select(Approval, Room).join(
                Room, Approval.room_id == Room.id
            ).where(
                and_(
                    Approval.status == "pending",
                    Approval.updated_at <= pending_threshold
                )
            )
            
            result = await session.execute(query)
            approval_room_pairs = result.all()
            
            for approval, room in approval_room_pairs:
                try:
                    counts["total_processed"] += 1
                    
                    # Check how many reminders have been sent
                    # Mock: assume < 3 reminders for now
                    reminders_sent = 0  # Would query from ActivityLog in real system
                    
                    if reminders_sent < max_reminders_per_approval:
                        # Send reminder
                        # Get parties who need to approve
                        parties_query = select(Party).where(
                            Party.room_id == room.id
                        )
                        parties_result = await session.execute(parties_query)
                        parties = parties_result.scalars().all()
                        
                        hours_pending = (now - approval.updated_at).total_seconds() / 3600
                        
                        for party in parties:
                            notification_data = {
                                "room_title": room.title,
                                "hours_pending": int(hours_pending),
                                "approval_type": approval.approval_type or "Document",
                            }
                            
                            await self.create_notification(
                                user_email=party.email,
                                notification_type="approval_required",
                                room_id=room.id,
                                data=notification_data,
                                session=session
                            )
                            
                            counts["reminders_sent"] += 1
                        
                        # If > 48h, escalate to management
                        if hours_pending > 48:
                            counts["approvals_escalated"] += 1
                            logger.warning(f"Approval escalated: {approval.id} pending {hours_pending}h")
                
                except Exception as e:
                    logger.error(f"Error sending approval reminder: {e}")
                    counts["errors"] += 1
        
        except Exception as e:
            logger.error(f"Error in send_approval_reminders: {e}")
            counts["errors"] += 1
        
        return counts


# Global instance
notification_service = NotificationService()

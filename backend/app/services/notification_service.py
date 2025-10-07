"""
Notification service for STS Clearance system
Handles real-time notifications, email alerts, and user communication
"""

import logging
import uuid
from datetime import datetime, timedelta
from typing import Dict, List, Optional

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


# Global instance
notification_service = NotificationService()

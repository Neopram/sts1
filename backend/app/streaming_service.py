"""
Real-Time Streaming Service for STS Clearance
Handles notification streaming, dashboard updates, and event broadcasting
"""

import asyncio
import logging
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any, Callable
from enum import Enum

from app.websocket_v2_manager import WebSocketManagerV2, WebSocketMessage

logger = logging.getLogger(__name__)


class StreamEventType(str, Enum):
    """Types of streaming events"""
    NOTIFICATION = "notification"
    DASHBOARD_UPDATE = "dashboard_update"
    ALERT = "alert"
    ACTIVITY = "activity"
    METRIC_UPDATE = "metric_update"
    SYSTEM_EVENT = "system_event"


class NotificationPriority(str, Enum):
    """Notification priority levels"""
    LOW = "low"
    NORMAL = "normal"
    HIGH = "high"
    CRITICAL = "critical"


class StreamingService:
    """Central service for real-time streaming"""
    
    def __init__(self, ws_manager: WebSocketManagerV2):
        self.ws_manager = ws_manager
        self.event_subscribers: Dict[str, List[Callable]] = {}
    
    def subscribe_to_event(self, event_type: str, callback: Callable):
        """Subscribe to specific event type"""
        if event_type not in self.event_subscribers:
            self.event_subscribers[event_type] = []
        self.event_subscribers[event_type].append(callback)
        logger.info(f"Subscribed to event: {event_type}")
    
    async def emit_event(self, event_type: str, data: Dict[str, Any]):
        """Emit event to all subscribers"""
        subscribers = self.event_subscribers.get(event_type, [])
        for callback in subscribers:
            try:
                if asyncio.iscoroutinefunction(callback):
                    await callback(data)
                else:
                    callback(data)
            except Exception as e:
                logger.error(f"Error in event subscriber: {e}")
    
    async def broadcast_notification(
        self,
        room_id: str,
        title: str,
        message: str,
        notification_type: str = "info",
        priority: str = NotificationPriority.NORMAL,
        target_role: Optional[str] = None,
        data: Optional[Dict] = None,
    ):
        """Broadcast notification to room"""
        ws_message = WebSocketMessage(
            type=StreamEventType.NOTIFICATION,
            room_id=room_id,
            priority=priority,
            data={
                "title": title,
                "message": message,
                "notification_type": notification_type,
                "data": data or {},
            }
        )
        
        if target_role:
            await self.ws_manager.broadcast_to_user_role(room_id, target_role, ws_message)
        else:
            await self.ws_manager.broadcast_to_room(room_id, ws_message)
        
        logger.info(f"Broadcast notification to room {room_id}: {title}")
    
    async def broadcast_alert(
        self,
        room_id: str,
        alert_type: str,
        severity: str,
        message: str,
        data: Optional[Dict] = None,
    ):
        """Broadcast alert to room"""
        priority = {
            "critical": NotificationPriority.CRITICAL,
            "high": NotificationPriority.HIGH,
            "medium": NotificationPriority.NORMAL,
            "low": NotificationPriority.LOW,
        }.get(severity, NotificationPriority.NORMAL)
        
        ws_message = WebSocketMessage(
            type=StreamEventType.ALERT,
            room_id=room_id,
            priority=priority,
            data={
                "alert_type": alert_type,
                "severity": severity,
                "message": message,
                "data": data or {},
            }
        )
        
        await self.ws_manager.broadcast_to_room(room_id, ws_message)
        logger.warning(f"Alert in room {room_id}: {message}")
    
    async def broadcast_dashboard_update(
        self,
        room_id: str,
        metric_name: str,
        metric_value: Any,
        target_role: Optional[str] = None,
        incremental: bool = True,
    ):
        """Broadcast dashboard metric update"""
        ws_message = WebSocketMessage(
            type=StreamEventType.DASHBOARD_UPDATE,
            room_id=room_id,
            data={
                "metric_name": metric_name,
                "metric_value": metric_value,
                "incremental": incremental,
                "timestamp": datetime.utcnow().isoformat(),
            }
        )
        
        if target_role:
            await self.ws_manager.broadcast_to_user_role(room_id, target_role, ws_message)
        else:
            await self.ws_manager.broadcast_to_room(room_id, ws_message)
    
    async def broadcast_activity(
        self,
        room_id: str,
        actor_name: str,
        action: str,
        resource: str,
        data: Optional[Dict] = None,
    ):
        """Broadcast activity update"""
        ws_message = WebSocketMessage(
            type=StreamEventType.ACTIVITY,
            room_id=room_id,
            data={
                "actor": actor_name,
                "action": action,
                "resource": resource,
                "data": data or {},
                "timestamp": datetime.utcnow().isoformat(),
            }
        )
        
        await self.ws_manager.broadcast_to_room(room_id, ws_message)
        logger.info(f"Activity in room {room_id}: {actor_name} {action} {resource}")
    
    async def broadcast_demurrage_alert(
        self,
        room_id: str,
        vessel_name: str,
        current_rate: float,
        escalation_level: int,
        target_role: str = "charterer",
    ):
        """Broadcast demurrage alert"""
        alert_message = f"Demurrage escalation alert for {vessel_name}: Rate {current_rate:.2f}x (Level {escalation_level})"
        
        await self.broadcast_alert(
            room_id=room_id,
            alert_type="demurrage_escalation",
            severity="high" if escalation_level > 2 else "medium",
            message=alert_message,
            data={
                "vessel_name": vessel_name,
                "current_rate": current_rate,
                "escalation_level": escalation_level,
            }
        )
    
    async def broadcast_compliance_alert(
        self,
        room_id: str,
        issue_type: str,
        severity: str,
        crew_member: Optional[str] = None,
        expiry_days: Optional[int] = None,
    ):
        """Broadcast compliance alert"""
        if issue_type == "crew_certification_expiring":
            message = f"Crew certification expiring in {expiry_days} days for {crew_member}"
        elif issue_type == "crew_certification_expired":
            message = f"Crew certification expired for {crew_member}"
        else:
            message = f"Compliance issue: {issue_type}"
        
        await self.broadcast_alert(
            room_id=room_id,
            alert_type="compliance",
            severity=severity,
            message=message,
            data={
                "issue_type": issue_type,
                "crew_member": crew_member,
                "expiry_days": expiry_days,
            }
        )
    
    async def broadcast_document_alert(
        self,
        room_id: str,
        document_name: str,
        alert_type: str,
        days_until_expiry: Optional[int] = None,
    ):
        """Broadcast document-related alert"""
        if alert_type == "expiring":
            message = f"Document '{document_name}' expires in {days_until_expiry} days"
            severity = "critical" if days_until_expiry <= 3 else "high"
        elif alert_type == "expired":
            message = f"Document '{document_name}' has expired"
            severity = "critical"
        elif alert_type == "missing":
            message = f"Document '{document_name}' is missing"
            severity = "high"
        else:
            message = f"Document alert: {alert_type}"
            severity = "medium"
        
        await self.broadcast_alert(
            room_id=room_id,
            alert_type="document_alert",
            severity=severity,
            message=message,
            data={
                "document_name": document_name,
                "alert_type": alert_type,
                "days_until_expiry": days_until_expiry,
            }
        )
    
    async def broadcast_system_metric(
        self,
        room_id: str,
        metric_name: str,
        metric_value: Any,
        target_role: str = "admin",
    ):
        """Broadcast system metric to admins"""
        ws_message = WebSocketMessage(
            type=StreamEventType.METRIC_UPDATE,
            room_id=room_id,
            role=target_role,
            data={
                "metric_name": metric_name,
                "metric_value": metric_value,
                "timestamp": datetime.utcnow().isoformat(),
            }
        )
        
        await self.ws_manager.broadcast_to_user_role(room_id, target_role, ws_message)
    
    async def send_to_user(
        self,
        user_email: str,
        room_id: str,
        message_type: str,
        data: Dict[str, Any],
        priority: str = NotificationPriority.NORMAL,
    ):
        """Send targeted message to specific user"""
        ws_message = WebSocketMessage(
            type=message_type,
            room_id=room_id,
            priority=priority,
            user_id=user_email,
            data=data,
        )
        
        # Queue message if user is not currently connected
        # In production, store in database/cache for persistence
        await self.ws_manager.message_queue.enqueue(user_email, ws_message)


class DashboardStreamService:
    """Service for real-time dashboard updates"""
    
    def __init__(self, streaming_service: StreamingService):
        self.streaming_service = streaming_service
    
    async def stream_demurrage_update(
        self,
        room_id: str,
        vessel_name: str,
        current_demurrage: float,
        projected_demurrage: float,
        escalation_level: int,
    ):
        """Stream demurrage update"""
        await self.streaming_service.broadcast_dashboard_update(
            room_id=room_id,
            metric_name="demurrage_exposure",
            metric_value={
                "vessel_name": vessel_name,
                "current": current_demurrage,
                "projected": projected_demurrage,
                "escalation_level": escalation_level,
            },
            target_role="charterer",
            incremental=True,
        )
    
    async def stream_commission_update(
        self,
        room_id: str,
        commission_accrued: float,
        commission_pending: float,
        total_commission: float,
    ):
        """Stream commission update"""
        await self.streaming_service.broadcast_dashboard_update(
            room_id=room_id,
            metric_name="commission_status",
            metric_value={
                "accrued": commission_accrued,
                "pending": commission_pending,
                "total": total_commission,
            },
            target_role="broker",
            incremental=True,
        )
    
    async def stream_compliance_status(
        self,
        room_id: str,
        crew_compliance_score: int,
        sire_score: int,
        violations_count: int,
    ):
        """Stream compliance status update"""
        await self.streaming_service.broadcast_dashboard_update(
            room_id=room_id,
            metric_name="compliance_status",
            metric_value={
                "crew_compliance_score": crew_compliance_score,
                "sire_score": sire_score,
                "violations_count": violations_count,
            },
            target_role="owner",
            incremental=True,
        )
    
    async def stream_system_health(
        self,
        room_id: str,
        cpu_usage: float,
        memory_usage: float,
        active_connections: int,
        request_rate: float,
    ):
        """Stream system health metrics to admins"""
        await self.streaming_service.broadcast_system_metric(
            room_id=room_id,
            metric_name="system_health",
            metric_value={
                "cpu_usage": cpu_usage,
                "memory_usage": memory_usage,
                "active_connections": active_connections,
                "request_rate": request_rate,
            },
            target_role="admin",
        )


# Create global instances
def create_streaming_service(ws_manager: WebSocketManagerV2) -> StreamingService:
    """Factory function to create streaming service"""
    return StreamingService(ws_manager)


def create_dashboard_stream_service(streaming_service: StreamingService) -> DashboardStreamService:
    """Factory function to create dashboard streaming service"""
    return DashboardStreamService(streaming_service)
"""
WebSocket Router v2 - Production-ready real-time communication
Integrates connection pooling, message queuing, heartbeats, and streaming
"""

import asyncio
import json
import logging
from datetime import datetime
from typing import Optional

import jwt
from fastapi import APIRouter, Depends, HTTPException, WebSocket, WebSocketDisconnect, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_async_session
from app.dependencies import ALGORITHM, SECRET_KEY, get_current_user
from app.models import User, Room, Party
from app.websocket_v2_manager import WebSocketManagerV2, WebSocketMessage, manager_v2
from app.streaming_service import StreamingService, create_streaming_service

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/ws", tags=["websocket"])

# Global streaming service
_streaming_service: Optional[StreamingService] = None


class WebSocketRouter:
    """Router for WebSocket connections and real-time communication"""
    
    def __init__(self, ws_manager: WebSocketManagerV2):
        """Initialize WebSocket router
        
        Args:
            ws_manager: WebSocketManagerV2 instance for connection management
        """
        self.ws_manager = ws_manager
        self.streaming_service: Optional[StreamingService] = None
    
    def get_streaming_service(self) -> StreamingService:
        """Get or create streaming service"""
        if self.streaming_service is None:
            self.streaming_service = create_streaming_service(self.ws_manager)
        return self.streaming_service


# Global router instance
_router_instance = WebSocketRouter(manager_v2)


def get_streaming_service() -> StreamingService:
    """Get or create streaming service"""
    global _streaming_service
    if _streaming_service is None:
        _streaming_service = create_streaming_service(manager_v2)
    return _streaming_service


async def get_user_from_token(token: str, session: AsyncSession) -> Optional[dict]:
    """Extract user info from JWT token"""
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        email: str = payload.get("sub")
        if not email:
            return None
        
        result = await session.execute(select(User).where(User.email == email))
        user = result.scalar_one_or_none()
        
        if not user:
            return None
        
        return {
            "user_id": str(user.id),
            "email": user.email,
            "name": user.name or "User",
            "role": user.role.value if hasattr(user.role, "value") else str(user.role),
        }
    except Exception as e:
        logger.error(f"Token validation error: {e}")
        return None


async def verify_room_access(
    room_id: str,
    user_email: str,
    session: AsyncSession
) -> bool:
    """Verify user has access to room"""
    try:
        # Check room exists
        room_result = await session.execute(
            select(Room).where(Room.id == room_id)
        )
        if not room_result.scalar_one_or_none():
            return False
        
        # Check user is party in room
        party_result = await session.execute(
            select(Party).where(
                Party.room_id == room_id,
                Party.email == user_email
            )
        )
        return party_result.scalar_one_or_none() is not None
    except Exception as e:
        logger.error(f"Room access verification error: {e}")
        return False


@router.websocket("/connect/{room_id}")
async def websocket_endpoint(
    websocket: WebSocket,
    room_id: str,
    token: str = Query(None),
):
    """
    WebSocket connection endpoint
    
    Usage:
    - ws://localhost:8000/ws/connect/{room_id}?token={jwt_token}
    """
    streaming = get_streaming_service()
    connection_id = None
    
    async for session in get_async_session():
        try:
            # Authenticate
            if not token:
                await websocket.close(code=1008, reason="Token required")
                return
            
            user_info = await get_user_from_token(token, session)
            if not user_info:
                await websocket.close(code=1008, reason="Invalid token")
                return
            
            # Verify room access
            has_access = await verify_room_access(room_id, user_info["email"], session)
            if not has_access:
                await websocket.close(code=1008, reason="Room access denied")
                return
            
            # Connect
            connection_id = await manager_v2.connect(
                websocket=websocket,
                room_id=room_id,
                user_id=user_info["user_id"],
                user_email=user_info["email"],
                user_role=user_info["role"],
            )
            
            # Send welcome message
            welcome_msg = WebSocketMessage(
                type="connection_established",
                data={
                    "connection_id": connection_id,
                    "user": user_info,
                    "room_id": room_id,
                }
            )
            await manager_v2.send_personal_message(welcome_msg, websocket)
            
            # Send current users in room
            room_users = await manager_v2.get_room_users(room_id)
            users_msg = WebSocketMessage(
                type="room_users",
                data={"users": room_users}
            )
            await manager_v2.send_personal_message(users_msg, websocket)
            
            # Broadcast user joined
            joined_msg = WebSocketMessage(
                type="user_joined",
                room_id=room_id,
                user_id=user_info["user_id"],
                data={"user": user_info}
            )
            await manager_v2.broadcast_to_room(
                room_id,
                joined_msg,
                exclude_connection_id=connection_id
            )
            
            # Start heartbeat task
            heartbeat_task = asyncio.create_task(
                heartbeat_loop(room_id, connection_id)
            )
            
            # Listen for messages
            try:
                while True:
                    data = await websocket.receive_text()
                    manager_v2.total_messages_received += 1
                    
                    try:
                        msg_data = json.loads(data)
                        message = WebSocketMessage.from_dict(msg_data)
                        
                        # Route based on type
                        if message.type == "message":
                            # Chat message
                            await handle_chat_message(
                                room_id,
                                user_info,
                                message,
                                connection_id
                            )
                        elif message.type == "typing":
                            # Typing indicator
                            await handle_typing_indicator(
                                room_id,
                                user_info,
                                message,
                                connection_id
                            )
                        elif message.type == "heartbeat":
                            # Heartbeat response
                            pong_msg = WebSocketMessage(type="pong")
                            await manager_v2.send_personal_message(pong_msg, websocket)
                        else:
                            # Custom handler
                            await streaming.emit_event(message.type, message.data)
                    
                    except json.JSONDecodeError:
                        error_msg = WebSocketMessage(
                            type="error",
                            data={"message": "Invalid JSON"}
                        )
                        await manager_v2.send_personal_message(error_msg, websocket)
            
            except WebSocketDisconnect:
                logger.info(f"WebSocket disconnect for {user_info['email']}")
            
            finally:
                # Cancel heartbeat
                heartbeat_task.cancel()
                
                # Disconnect
                await manager_v2.disconnect(connection_id)
                
                # Broadcast user left
                left_msg = WebSocketMessage(
                    type="user_left",
                    room_id=room_id,
                    user_id=user_info["user_id"],
                    data={"user": user_info}
                )
                await manager_v2.broadcast_to_room(room_id, left_msg)
        
        except Exception as e:
            logger.error(f"WebSocket error: {e}")
            try:
                await websocket.close(code=1011, reason="Internal server error")
            except:
                pass
        
        finally:
            await session.close()
            break


async def heartbeat_loop(room_id: str, connection_id: str, interval: int = 30):
    """Send periodic heartbeats"""
    try:
        while True:
            await asyncio.sleep(interval)
            await manager_v2.send_heartbeat(room_id)
    except asyncio.CancelledError:
        logger.info(f"Heartbeat cancelled for {connection_id}")
    except Exception as e:
        logger.error(f"Heartbeat error: {e}")


async def handle_chat_message(
    room_id: str,
    user_info: dict,
    message: WebSocketMessage,
    connection_id: str
):
    """Handle chat message"""
    content = message.data.get("content", "").strip()
    if not content:
        return
    
    # Create broadcast message
    chat_msg = WebSocketMessage(
        type="message",
        room_id=room_id,
        user_id=user_info["user_id"],
        data={
            "sender": user_info,
            "content": content,
            "timestamp": datetime.utcnow().isoformat(),
        }
    )
    
    await manager_v2.broadcast_to_room(room_id, chat_msg)
    logger.info(f"Chat message in {room_id} from {user_info['email']}")


async def handle_typing_indicator(
    room_id: str,
    user_info: dict,
    message: WebSocketMessage,
    connection_id: str
):
    """Handle typing indicator"""
    is_typing = message.data.get("is_typing", False)
    
    typing_msg = WebSocketMessage(
        type="typing",
        room_id=room_id,
        data={
            "user": user_info,
            "is_typing": is_typing,
        }
    )
    
    await manager_v2.broadcast_to_room(
        room_id,
        typing_msg,
        exclude_connection_id=connection_id
    )


# REST Endpoints for WebSocket management


@router.get("/rooms/{room_id}/users")
async def get_room_users(room_id: str):
    """Get users connected to room"""
    users = await manager_v2.get_room_users(room_id)
    count = await manager_v2.pool.get_room_count(room_id)
    
    return {
        "room_id": room_id,
        "users": users,
        "count": count,
    }


@router.get("/metrics")
async def get_websocket_metrics():
    """Get WebSocket metrics"""
    metrics = await manager_v2.get_metrics()
    return metrics


@router.post("/rooms/{room_id}/broadcast")
async def broadcast_message(
    room_id: str,
    message_type: str,
    data: dict,
    current_user: dict = Depends(get_current_user),
):
    """Admin endpoint to broadcast message to room"""
    if current_user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin only")
    
    message = WebSocketMessage(
        type=message_type,
        room_id=room_id,
        data=data,
    )
    
    await manager_v2.broadcast_to_room(room_id, message)
    
    return {
        "status": "broadcasted",
        "room_id": room_id,
        "message_type": message_type,
    }


@router.post("/test/notification")
async def test_notification(
    room_id: str,
    title: str,
    message_text: str,
):
    """Test notification broadcast"""
    streaming = get_streaming_service()
    
    await streaming.broadcast_notification(
        room_id=room_id,
        title=title,
        message=message_text,
        notification_type="test",
        priority="normal",
    )
    
    return {"status": "notification_sent"}


@router.post("/test/alert")
async def test_alert(
    room_id: str,
    alert_type: str,
    severity: str,
    message_text: str,
):
    """Test alert broadcast"""
    streaming = get_streaming_service()
    
    await streaming.broadcast_alert(
        room_id=room_id,
        alert_type=alert_type,
        severity=severity,
        message=message_text,
    )
    
    return {"status": "alert_sent"}
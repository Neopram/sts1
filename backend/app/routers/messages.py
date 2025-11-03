"""
Messages router for STS Clearance system
Handles real-time messaging and chat functionality
"""

import json
import logging
import uuid
from datetime import datetime
from typing import List, Optional

from fastapi import (APIRouter, Depends, HTTPException, Query, WebSocket,
                     WebSocketDisconnect, status)
from pydantic import BaseModel
from sqlalchemy import desc, select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_async_session
from app.dependencies import (get_current_user, log_activity,
                              require_room_access)
from app.models import Message, Party, Room, User
from app.websocket_manager import manager

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1", tags=["messages"])


# Helper function to extract user info from current_user (dict or User object)
def get_user_info(current_user, include_name=False):
    """Extract email and optionally name from current_user (dict or User object)"""
    if isinstance(current_user, dict):
        email = current_user.get("email") or current_user.get("user_email")
        name = current_user.get("name") or current_user.get("user_name", "Unknown User")
        if include_name:
            return email, name
        return email
    else:
        if include_name:
            return current_user.email, current_user.name or "Unknown User"
        return current_user.email


# Pydantic models
class MessageResponse(BaseModel):
    id: str
    sender_email: str
    sender_name: str
    content: str
    message_type: str
    created_at: datetime
    read_by: List[str] = []
    is_public: bool = True  # PHASE 4: Public/Private visibility


class SendMessageRequest(BaseModel):
    content: str
    message_type: str = "text"
    is_public: bool = True  # PHASE 4: Public by default


# WebSocket endpoint for real-time chat
@router.websocket("/rooms/{room_id}/ws")
async def websocket_endpoint(
    websocket: WebSocket,
    room_id: str,
    user_email: str = Query(...),
    user_name: str = Query(...),
):
    """
    WebSocket endpoint for real-time chat
    """
    try:
        # Verify user has access to room
        async for session in get_async_session():
            try:
                await require_room_access(room_id, user_email, session)
                break
            except HTTPException:
                await websocket.close(code=4003, reason="Access denied")
                return
            finally:
                await session.close()

        # Connect user to room
        await manager.connect(websocket, room_id, user_email, user_name)

        try:
            while True:
                # Receive message from client
                data = await websocket.receive_text()
                message_data = json.loads(data)

                # Handle different message types
                if message_data.get("type") == "message":
                    await handle_chat_message(
                        room_id,
                        user_email,
                        user_name,
                        message_data.get("content", ""),
                        message_data.get("message_type", "text"),
                        message_data.get("is_public", True),  # PHASE 4
                    )
                elif message_data.get("type") == "typing":
                    await handle_typing_indicator(
                        room_id,
                        user_email,
                        user_name,
                        message_data.get("typing", False),
                    )
                elif message_data.get("type") == "read_receipt":
                    await handle_read_receipt(
                        room_id, user_email, message_data.get("message_id")
                    )

        except WebSocketDisconnect:
            pass
        except Exception as e:
            logger.error(f"WebSocket error: {e}")
        finally:
            manager.disconnect(websocket)

    except Exception as e:
        logger.error(f"WebSocket connection error: {e}")
        await websocket.close(code=4000, reason="Connection error")


async def handle_chat_message(
    room_id: str, sender_email: str, sender_name: str, content: str, message_type: str, is_public: bool = True
):
    """
    Handle incoming chat message
    """
    try:
        # Save message to database
        async for session in get_async_session():
            try:
                message = Message(
                    room_id=room_id,
                    sender_email=sender_email,
                    sender_name=sender_name,
                    content=content,
                    message_type=message_type,
                    is_public=is_public,  # PHASE 4: Save visibility
                )
                session.add(message)
                await session.commit()

                # Broadcast message to room
                await manager.send_message_to_room(
                    room_id,
                    sender_email,
                    sender_name,
                    content,
                    message_type,
                    str(message.id),
                    is_public=is_public,  # PHASE 4
                )

                # Log activity
                await log_activity(
                    room_id,
                    sender_email,
                    "message_sent",
                    {"message_type": message_type, "content_length": len(content), "is_public": is_public},  # PHASE 4
                )

                break
            finally:
                await session.close()

    except Exception as e:
        logger.error(f"Error handling chat message: {e}")


async def handle_typing_indicator(
    room_id: str, user_email: str, user_name: str, is_typing: bool
):
    """
    Handle typing indicator
    """
    await manager.broadcast_to_room(
        room_id,
        {
            "type": "typing",
            "user_email": user_email,
            "user_name": user_name,
            "typing": is_typing,
            "timestamp": datetime.utcnow().isoformat(),
        },
    )


async def handle_read_receipt(room_id: str, user_email: str, message_id: str):
    """
    Handle message read receipt
    """
    try:
        async for session in get_async_session():
            try:
                # Update message read status
                result = await session.execute(
                    select(Message).where(
                        Message.id == message_id, Message.room_id == room_id
                    )
                )
                message = result.scalar_one_or_none()

                if message:
                    # Add user to read_by list if not already there
                    read_by = message.read_by or []
                    if user_email not in read_by:
                        read_by.append(user_email)
                        message.read_by = read_by
                        await session.commit()

                        # Broadcast read receipt
                        await manager.broadcast_to_room(
                            room_id,
                            {
                                "type": "read_receipt",
                                "message_id": message_id,
                                "user_email": user_email,
                                "timestamp": datetime.utcnow().isoformat(),
                            },
                        )

                break
            finally:
                await session.close()

    except Exception as e:
        logger.error(f"Error handling read receipt: {e}")


@router.get("/rooms/{room_id}/messages", response_model=List[MessageResponse])
async def get_room_messages(
    room_id: str,
    limit: int = 50,
    offset: int = 0,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_async_session),
):
    """
    Get messages for a room, filtered by user's vessel access
    """
    try:
        # current_user is now a User SQLAlchemy object, not a dict
        user_email = get_user_info(current_user)

        # Verify user has access to room
        await require_room_access(room_id, user_email, session)

        # Get user's message visibility permissions (OPTION B - Granular permissions)
        from app.dependencies import get_user_message_visibility
        visibility = await get_user_message_visibility(room_id, user_email, session)

        # Build query based on visibility configuration
        query_filters = [Message.room_id == room_id]
        
        if visibility["can_see_all_vessels"]:
            # User can see all messages (room-level + all vessels)
            pass  # No additional filter needed
        elif visibility["can_see_vessel_level"] and visibility["accessible_vessel_ids"]:
            # User can see room-level + their specific vessels
            from sqlalchemy import or_
            query_filters.append(
                or_(
                    Message.vessel_id.is_(None),  # Room-level messages
                    Message.vessel_id.in_(visibility["accessible_vessel_ids"])  # Their vessels
                )
            )
        elif visibility["can_see_room_level"]:
            # User can only see room-level messages
            query_filters.append(Message.vessel_id.is_(None))
        else:
            # User has no permission to see any messages
            return []

        # Execute query with computed filters
        messages_result = await session.execute(
            select(Message)
            .where(*query_filters)
            .order_by(desc(Message.created_at))
            .offset(offset)
            .limit(limit)
        )

        messages = messages_result.scalars().all()

        # Convert to response format
        response = []
        for message in reversed(messages):  # Reverse to get chronological order
            response.append(
                MessageResponse(
                    id=str(message.id),
                    sender_email=message.sender_email,
                    sender_name=message.sender_name,
                    content=message.content,
                    message_type=message.message_type,
                    created_at=message.created_at,
                    read_by=message.read_by or [],
                    is_public=message.is_public,  # PHASE 4
                )
            )

        return response

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting room messages: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")


@router.post("/rooms/{room_id}/messages")
async def send_message(
    room_id: str,
    message_data: SendMessageRequest,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_async_session),
):
    """
    Send a message to a room (HTTP endpoint for non-WebSocket clients)
    """
    try:
        # Handle both dict and User object
        user_email, user_name = get_user_info(current_user, include_name=True)

        # Verify user has access to room
        await require_room_access(room_id, user_email, session)

        # Save message to database
        message = Message(
            room_id=room_id,
            sender_email=user_email,
            sender_name=user_name,
            content=message_data.content,
            message_type=message_data.message_type,
            is_public=message_data.is_public,  # PHASE 4
        )
        session.add(message)
        await session.commit()

        # Broadcast message to WebSocket connections
        await manager.send_message_to_room(
            room_id,
            user_email,
            user_name,
            message_data.content,
            message_data.message_type,
            str(message.id),
            is_public=message_data.is_public,  # PHASE 4
        )

        # Log activity
        await log_activity(
            room_id,
            user_email,
            "message_sent",
            {
                "message_type": message_data.message_type,
                "content_length": len(message_data.content),
            },
        )

        return {
            "id": str(message.id),
            "message": "Message sent successfully",
            "timestamp": message.created_at,
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error sending message: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")


@router.patch("/rooms/{room_id}/messages/{message_id}/read")
async def mark_message_read(
    room_id: str,
    message_id: str,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_async_session),
):
    """
    Mark a message as read
    """
    try:
        # current_user is now a User SQLAlchemy object, not a dict
        user_email = get_user_info(current_user)

        # Verify user has access to room
        await require_room_access(room_id, user_email, session)

        # Get message
        result = await session.execute(
            select(Message).where(Message.id == message_id, Message.room_id == room_id)
        )
        message = result.scalar_one_or_none()

        if not message:
            raise HTTPException(status_code=404, detail="Message not found")

        # Add user to read_by list if not already there
        read_by = message.read_by or []
        if user_email not in read_by:
            read_by.append(user_email)
            message.read_by = read_by
            await session.commit()

            # Broadcast read receipt via WebSocket
            await manager.broadcast_to_room(
                room_id,
                {
                    "type": "read_receipt",
                    "message_id": message_id,
                    "user_email": user_email,
                    "timestamp": datetime.utcnow().isoformat(),
                },
            )

        return {"message": "Message marked as read"}

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error marking message as read: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")


@router.get("/rooms/{room_id}/messages/unread-count")
async def get_unread_message_count(
    room_id: str,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_async_session),
):
    """
    Get count of unread messages for current user in a room
    """
    try:
        user_email = get_user_info(current_user)

        # Verify user has access to room
        await require_room_access(room_id, user_email, session)

        # Get all messages in room
        messages_result = await session.execute(
            select(Message).where(Message.room_id == room_id)
        )
        messages = messages_result.scalars().all()

        # Count unread messages
        unread_count = 0
        for message in messages:
            if message.sender_email != user_email:  # Don't count own messages
                read_by = message.read_by or []
                if user_email not in read_by:
                    unread_count += 1

        return {"unread_count": unread_count}

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting unread message count: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")


@router.get("/rooms/{room_id}/online-users")
async def get_online_users(
    room_id: str,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_async_session),
):
    """
    Get list of users currently online in a room
    """
    try:
        user_email = get_user_info(current_user)

        # Verify user has access to room
        await require_room_access(room_id, user_email, session)

        # Get online users from WebSocket manager
        online_users = manager.get_room_users(room_id)

        return {"online_users": online_users, "count": len(online_users)}

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting online users: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")

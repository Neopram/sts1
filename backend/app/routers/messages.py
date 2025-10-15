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
from app.models import Message, Party, Room
from app.websocket_manager import manager

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1", tags=["messages"])


# Pydantic models
class MessageResponse(BaseModel):
    id: str
    sender_email: str
    sender_name: str
    content: str
    message_type: str
    created_at: datetime
    read_by: List[str] = []


class SendMessageRequest(BaseModel):
    content: str
    message_type: str = "text"


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
    room_id: str, sender_email: str, sender_name: str, content: str, message_type: str
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
                )

                # Log activity
                await log_activity(
                    room_id,
                    sender_email,
                    "message_sent",
                    {"message_type": message_type, "content_length": len(content)},
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
    current_user: dict = Depends(get_current_user),
    session: AsyncSession = Depends(get_async_session),
):
    """
    Get messages for a room, filtered by user's vessel access
    """
    try:
        user_email = current_user["email"]

        # Verify user has access to room
        await require_room_access(room_id, user_email, session)

        # Get user's accessible vessel IDs
        from app.dependencies import get_user_accessible_vessels
        accessible_vessel_ids = await get_user_accessible_vessels(room_id, user_email, session)

        # Build query based on vessel access
        if accessible_vessel_ids:
            # User has access to specific vessels - filter messages by vessel
            messages_result = await session.execute(
                select(Message)
                .where(
                    Message.room_id == room_id,
                    Message.vessel_id.in_(accessible_vessel_ids)
                )
                .order_by(desc(Message.created_at))
                .offset(offset)
                .limit(limit)
            )
        else:
            # User has no vessel access - return empty list (room-level messages only for brokers)
            if current_user.get("role") == "broker":
                # Brokers can see room-level messages
                messages_result = await session.execute(
                    select(Message)
                    .where(Message.room_id == room_id, Message.vessel_id.is_(None))
                    .order_by(desc(Message.created_at))
                    .offset(offset)
                    .limit(limit)
                )
            else:
                # Non-brokers with no vessel access see nothing
                return []

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
    current_user: dict = Depends(get_current_user),
    session: AsyncSession = Depends(get_async_session),
):
    """
    Send a message to a room (HTTP endpoint for non-WebSocket clients)
    """
    try:
        user_email = current_user["email"]
        user_name = current_user.get("name", "Unknown User")

        # Verify user has access to room
        await require_room_access(room_id, user_email, session)

        # Save message to database
        message = Message(
            room_id=room_id,
            sender_email=user_email,
            sender_name=user_name,
            content=message_data.content,
            message_type=message_data.message_type,
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
    current_user: dict = Depends(get_current_user),
    session: AsyncSession = Depends(get_async_session),
):
    """
    Mark a message as read
    """
    try:
        user_email = current_user["email"]

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
    current_user: dict = Depends(get_current_user),
    session: AsyncSession = Depends(get_async_session),
):
    """
    Get count of unread messages for current user in a room
    """
    try:
        user_email = current_user["email"]

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
    current_user: dict = Depends(get_current_user),
    session: AsyncSession = Depends(get_async_session),
):
    """
    Get list of users currently online in a room
    """
    try:
        user_email = current_user["email"]

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

"""
WebSocket router for STS Clearance system
Handles real-time chat and notifications
"""

import json
import logging
from datetime import datetime
from typing import Dict, List, Set

import jwt
from fastapi import (APIRouter, Depends, HTTPException, WebSocket,
                     WebSocketDisconnect)
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_async_session
from app.dependencies import ALGORITHM, SECRET_KEY
from app.models import Message, Party, Room, User

logger = logging.getLogger(__name__)

router = APIRouter()


class ConnectionManager:
    def __init__(self):
        # room_id -> set of websockets
        self.active_connections: Dict[str, Set[WebSocket]] = {}
        # websocket -> user info
        self.connection_users: Dict[WebSocket, dict] = {}

    async def connect(self, websocket: WebSocket, room_id: str, user: dict):
        await websocket.accept()

        if room_id not in self.active_connections:
            self.active_connections[room_id] = set()

        self.active_connections[room_id].add(websocket)
        self.connection_users[websocket] = user

        logger.info(f"User {user['email']} connected to room {room_id}")

        # Notify other users in the room
        await self.broadcast_to_room(
            room_id,
            {
                "type": "user_joined",
                "user": user,
                "timestamp": datetime.utcnow().isoformat(),
            },
            exclude=websocket,
        )

    def disconnect(self, websocket: WebSocket, room_id: str):
        if room_id in self.active_connections:
            self.active_connections[room_id].discard(websocket)
            if not self.active_connections[room_id]:
                del self.active_connections[room_id]

        user = self.connection_users.pop(websocket, None)
        if user:
            logger.info(f"User {user['email']} disconnected from room {room_id}")

    async def send_personal_message(self, message: dict, websocket: WebSocket):
        try:
            await websocket.send_text(json.dumps(message))
        except Exception as e:
            logger.error(f"Error sending personal message: {e}")

    async def broadcast_to_room(
        self, room_id: str, message: dict, exclude: WebSocket = None
    ):
        if room_id not in self.active_connections:
            return

        message_text = json.dumps(message)
        disconnected = set()

        for connection in self.active_connections[room_id]:
            if connection == exclude:
                continue

            try:
                await connection.send_text(message_text)
            except Exception as e:
                logger.error(f"Error broadcasting to connection: {e}")
                disconnected.add(connection)

        # Clean up disconnected connections
        for connection in disconnected:
            self.active_connections[room_id].discard(connection)
            self.connection_users.pop(connection, None)

    def get_room_users(self, room_id: str) -> List[dict]:
        if room_id not in self.active_connections:
            return []

        users = []
        for connection in self.active_connections[room_id]:
            user = self.connection_users.get(connection)
            if user:
                users.append(
                    {"email": user["email"], "name": user["name"], "role": user["role"]}
                )

        return users


manager = ConnectionManager()


async def get_user_from_token(token: str, session: AsyncSession) -> dict:
    """
    Extract user information from JWT token
    """
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        email: str = payload.get("sub")
        if email is None:
            raise HTTPException(status_code=401, detail="Invalid token")

        # Get user from database
        result = await session.execute(select(User).where(User.email == email))
        user = result.scalar_one_or_none()

        if not user:
            raise HTTPException(status_code=401, detail="User not found")

        return {"email": user.email, "name": user.name, "role": user.role}

    except jwt.PyJWTError:
        raise HTTPException(status_code=401, detail="Invalid token")


async def verify_room_access(
    room_id: str, user_email: str, session: AsyncSession
) -> bool:
    """
    Verify user has access to the room
    """
    try:
        # Check if room exists
        room_result = await session.execute(select(Room).where(Room.id == room_id))
        room = room_result.scalar_one_or_none()

        if not room:
            return False

        # Check if user is a party in the room
        party_result = await session.execute(
            select(Party).where(Party.room_id == room_id, Party.email == user_email)
        )
        party = party_result.scalar_one_or_none()

        return party is not None

    except Exception as e:
        logger.error(f"Error verifying room access: {e}")
        return False


@router.websocket("/ws/{room_id}")
async def websocket_endpoint(
    websocket: WebSocket, 
    room_id: str, 
    token: str = None,
    user_email: str = None,
    user_name: str = None
):
    """
    WebSocket endpoint for real-time chat in a room
    """
    # For testing purposes, allow connection with user_email and user_name
    if not token and not (user_email and user_name):
        await websocket.close(code=1008, reason="Token or user credentials required")
        return

    # Get database session
    async for session in get_async_session():
        try:
            # Authenticate user
            if token:
                user = await get_user_from_token(token, session)
            else:
                # Testing mode - create user object from parameters
                user = {
                    "email": user_email,
                    "name": user_name,
                    "role": "user"
                }

            # Verify room access (skip for testing)
            if token:
                has_access = await verify_room_access(room_id, user["email"], session)
                if not has_access:
                    await websocket.close(code=1008, reason="Access denied")
                    return

            # Connect user
            await manager.connect(websocket, room_id, user)

            # Send current room users
            room_users = manager.get_room_users(room_id)
            await manager.send_personal_message(
                {
                    "type": "room_users",
                    "users": room_users,
                    "timestamp": datetime.utcnow().isoformat(),
                },
                websocket,
            )

            # Listen for messages
            while True:
                try:
                    data = await websocket.receive_text()
                    message_data = json.loads(data)

                    message_type = message_data.get("type", "message")

                    if message_type == "message":
                        content = message_data.get("content", "").strip()
                        if not content:
                            continue

                        # Save message to database
                        message = Message(
                            room_id=room_id,
                            sender_name=user["name"],
                            sender_email=user["email"],
                            content=content,
                            created_at=datetime.utcnow(),
                        )
                        session.add(message)
                        await session.commit()

                        # Broadcast message to room
                        broadcast_data = {
                            "type": "message",
                            "id": str(message.id),
                            "sender_name": user["name"],
                            "sender_email": user["email"],
                            "content": content,
                            "timestamp": message.created_at.isoformat(),
                        }

                        await manager.broadcast_to_room(room_id, broadcast_data)

                    elif message_type == "typing":
                        # Broadcast typing indicator
                        typing_data = {
                            "type": "typing",
                            "user": user,
                            "is_typing": message_data.get("is_typing", False),
                            "timestamp": datetime.utcnow().isoformat(),
                        }

                        await manager.broadcast_to_room(
                            room_id, typing_data, exclude=websocket
                        )

                    elif message_type == "ping":
                        # Respond to ping
                        await manager.send_personal_message(
                            {
                                "type": "pong",
                                "timestamp": datetime.utcnow().isoformat(),
                            },
                            websocket,
                        )

                except WebSocketDisconnect:
                    break
                except json.JSONDecodeError:
                    await manager.send_personal_message(
                        {
                            "type": "error",
                            "message": "Invalid JSON format",
                            "timestamp": datetime.utcnow().isoformat(),
                        },
                        websocket,
                    )
                except Exception as e:
                    logger.error(f"Error processing WebSocket message: {e}")
                    await manager.send_personal_message(
                        {
                            "type": "error",
                            "message": "Internal server error",
                            "timestamp": datetime.utcnow().isoformat(),
                        },
                        websocket,
                    )

        except Exception as e:
            logger.error(f"WebSocket connection error: {e}")
            await websocket.close(code=1011, reason="Internal server error")

        finally:
            manager.disconnect(websocket, room_id)
            await session.close()
            break


@router.get("/ws/rooms/{room_id}/users")
async def get_room_online_users(room_id: str):
    """
    Get list of users currently online in a room
    """
    users = manager.get_room_users(room_id)
    return {"room_id": room_id, "online_users": users, "count": len(users)}

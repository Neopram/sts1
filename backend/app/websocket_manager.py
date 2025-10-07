"""
WebSocket connection manager for real-time chat
"""

import json
import logging
from datetime import datetime
from typing import Dict, List, Set

from fastapi import WebSocket, WebSocketDisconnect

logger = logging.getLogger(__name__)


class ConnectionManager:
    """
    Manages WebSocket connections for real-time chat
    """

    def __init__(self):
        # room_id -> set of websockets
        self.active_connections: Dict[str, Set[WebSocket]] = {}
        # websocket -> user info
        self.connection_info: Dict[WebSocket, Dict] = {}

    async def connect(
        self, websocket: WebSocket, room_id: str, user_email: str, user_name: str
    ):
        """
        Connect a user to a room
        """
        await websocket.accept()

        # Add to room connections
        if room_id not in self.active_connections:
            self.active_connections[room_id] = set()
        self.active_connections[room_id].add(websocket)

        # Store connection info
        self.connection_info[websocket] = {
            "room_id": room_id,
            "user_email": user_email,
            "user_name": user_name,
            "connected_at": datetime.utcnow(),
        }

        logger.info(f"User {user_email} connected to room {room_id}")

        # Notify other users in the room
        await self.broadcast_to_room(
            room_id,
            {
                "type": "user_joined",
                "user_email": user_email,
                "user_name": user_name,
                "timestamp": datetime.utcnow().isoformat(),
            },
            exclude_websocket=websocket,
        )

    def disconnect(self, websocket: WebSocket):
        """
        Disconnect a user
        """
        if websocket in self.connection_info:
            info = self.connection_info[websocket]
            room_id = info["room_id"]
            user_email = info["user_email"]
            user_name = info["user_name"]

            # Remove from room connections
            if room_id in self.active_connections:
                self.active_connections[room_id].discard(websocket)
                if not self.active_connections[room_id]:
                    del self.active_connections[room_id]

            # Remove connection info
            del self.connection_info[websocket]

            logger.info(f"User {user_email} disconnected from room {room_id}")

            # Notify other users in the room
            if room_id in self.active_connections:
                import asyncio

                asyncio.create_task(
                    self.broadcast_to_room(
                        room_id,
                        {
                            "type": "user_left",
                            "user_email": user_email,
                            "user_name": user_name,
                            "timestamp": datetime.utcnow().isoformat(),
                        },
                    )
                )

    async def send_personal_message(self, message: dict, websocket: WebSocket):
        """
        Send a message to a specific websocket
        """
        try:
            await websocket.send_text(json.dumps(message))
        except Exception as e:
            logger.error(f"Error sending personal message: {e}")

    async def broadcast_to_room(
        self, room_id: str, message: dict, exclude_websocket: WebSocket = None
    ):
        """
        Broadcast a message to all users in a room
        """
        if room_id not in self.active_connections:
            return

        message_text = json.dumps(message)
        disconnected_websockets = []

        for websocket in self.active_connections[room_id].copy():
            if websocket == exclude_websocket:
                continue

            try:
                await websocket.send_text(message_text)
            except Exception as e:
                logger.error(f"Error broadcasting to websocket: {e}")
                disconnected_websockets.append(websocket)

        # Clean up disconnected websockets
        for websocket in disconnected_websockets:
            self.disconnect(websocket)

    async def send_message_to_room(
        self,
        room_id: str,
        sender_email: str,
        sender_name: str,
        content: str,
        message_type: str = "text",
        message_id: str = None,
    ):
        """
        Send a chat message to all users in a room
        """
        message = {
            "type": "message",
            "id": message_id,
            "sender_email": sender_email,
            "sender_name": sender_name,
            "content": content,
            "message_type": message_type,
            "timestamp": datetime.utcnow().isoformat(),
        }

        await self.broadcast_to_room(room_id, message)

    async def send_notification_to_room(
        self,
        room_id: str,
        notification_type: str,
        title: str,
        message: str,
        data: dict = None,
    ):
        """
        Send a notification to all users in a room
        """
        notification = {
            "type": "notification",
            "notification_type": notification_type,
            "title": title,
            "message": message,
            "data": data or {},
            "timestamp": datetime.utcnow().isoformat(),
        }

        await self.broadcast_to_room(room_id, notification)

    async def send_activity_to_room(
        self, room_id: str, actor: str, action: str, meta: dict = None
    ):
        """
        Send an activity update to all users in a room
        """
        activity = {
            "type": "activity",
            "actor": actor,
            "action": action,
            "meta": meta or {},
            "timestamp": datetime.utcnow().isoformat(),
        }

        await self.broadcast_to_room(room_id, activity)

    def get_room_users(self, room_id: str) -> List[Dict]:
        """
        Get list of users currently connected to a room
        """
        if room_id not in self.active_connections:
            return []

        users = []
        for websocket in self.active_connections[room_id]:
            if websocket in self.connection_info:
                info = self.connection_info[websocket]
                users.append(
                    {
                        "user_email": info["user_email"],
                        "user_name": info["user_name"],
                        "connected_at": info["connected_at"].isoformat(),
                    }
                )

        return users

    def get_connection_count(self, room_id: str) -> int:
        """
        Get number of active connections in a room
        """
        if room_id not in self.active_connections:
            return 0
        return len(self.active_connections[room_id])

    def get_total_connections(self) -> int:
        """
        Get total number of active connections
        """
        return len(self.connection_info)


# Global connection manager instance
manager = ConnectionManager()

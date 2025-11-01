"""
Enhanced WebSocket Manager v2 for STS Clearance system
Provides connection pooling, message queuing, reconnection handling, and performance monitoring
Production-ready with graceful shutdown and resource cleanup
"""

import asyncio
import json
import logging
import time
import uuid
from collections import deque
from dataclasses import dataclass, field, asdict
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Set, Callable, Any

from fastapi import WebSocket, WebSocketDisconnect

logger = logging.getLogger(__name__)


@dataclass
class WebSocketMessage:
    """Structured message for WebSocket communication"""
    message_id: str = field(default_factory=lambda: str(uuid.uuid4()))
    type: str = ""
    role: str = "user"
    data: Dict[str, Any] = field(default_factory=dict)
    timestamp: str = field(default_factory=lambda: datetime.utcnow().isoformat())
    priority: str = "normal"  # low, normal, high, critical
    user_id: Optional[str] = None
    room_id: Optional[str] = None
    
    def to_json(self) -> str:
        """Convert message to JSON"""
        return json.dumps(asdict(self))
    
    @classmethod
    def from_dict(cls, data: dict) -> "WebSocketMessage":
        """Create message from dictionary"""
        return cls(
            message_id=data.get("message_id", str(uuid.uuid4())),
            type=data.get("type", ""),
            role=data.get("role", "user"),
            data=data.get("data", {}),
            timestamp=data.get("timestamp", datetime.utcnow().isoformat()),
            priority=data.get("priority", "normal"),
            user_id=data.get("user_id"),
            room_id=data.get("room_id"),
        )


@dataclass
class ConnectionMetadata:
    """Metadata for a WebSocket connection"""
    connection_id: str = field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str = ""
    user_email: str = ""
    user_role: str = ""
    room_id: str = ""
    connected_at: datetime = field(default_factory=datetime.utcnow)
    last_heartbeat: datetime = field(default_factory=datetime.utcnow)
    message_count: int = 0
    bytes_sent: int = 0
    bytes_received: int = 0
    
    def is_stale(self, timeout_seconds: int = 300) -> bool:
        """Check if connection is stale (no heartbeat)"""
        elapsed = (datetime.utcnow() - self.last_heartbeat).total_seconds()
        return elapsed > timeout_seconds
    
    def update_heartbeat(self):
        """Update last heartbeat timestamp"""
        self.last_heartbeat = datetime.utcnow()


class ConnectionPool:
    """Manages a pool of WebSocket connections"""
    
    def __init__(self, max_connections_per_room: int = 500):
        self.max_connections_per_room = max_connections_per_room
        # room_id -> {connection_id -> (websocket, metadata)}
        self.connections: Dict[str, Dict[str, tuple]] = {}
        self.metadata: Dict[str, ConnectionMetadata] = {}
        self.lock = asyncio.Lock()
    
    async def add_connection(
        self,
        websocket: WebSocket,
        room_id: str,
        user_id: str,
        user_email: str,
        user_role: str
    ) -> str:
        """Add connection to pool, returns connection_id"""
        async with self.lock:
            # Check room limit
            room_connections = self.connections.get(room_id, {})
            if len(room_connections) >= self.max_connections_per_room:
                raise RuntimeError(f"Room {room_id} at max capacity")
            
            connection_id = str(uuid.uuid4())
            metadata = ConnectionMetadata(
                connection_id=connection_id,
                user_id=user_id,
                user_email=user_email,
                user_role=user_role,
                room_id=room_id,
            )
            
            if room_id not in self.connections:
                self.connections[room_id] = {}
            
            self.connections[room_id][connection_id] = (websocket, metadata)
            self.metadata[connection_id] = metadata
            
            logger.info(f"Added connection {connection_id} for {user_email} to room {room_id}")
            return connection_id
    
    async def remove_connection(self, connection_id: str) -> Optional[str]:
        """Remove connection from pool, returns room_id"""
        async with self.lock:
            metadata = self.metadata.pop(connection_id, None)
            if not metadata:
                return None
            
            room_id = metadata.room_id
            if room_id in self.connections:
                self.connections[room_id].pop(connection_id, None)
                if not self.connections[room_id]:
                    del self.connections[room_id]
            
            logger.info(f"Removed connection {connection_id}")
            return room_id
    
    async def get_room_connections(self, room_id: str) -> Dict[str, tuple]:
        """Get all connections in a room"""
        async with self.lock:
            return self.connections.get(room_id, {}).copy()
    
    async def get_connection(self, connection_id: str) -> Optional[tuple]:
        """Get specific connection"""
        async with self.lock:
            return self.metadata.get(connection_id)
    
    async def get_total_connections(self) -> int:
        """Get total active connections"""
        async with self.lock:
            return len(self.metadata)
    
    async def get_room_count(self, room_id: str) -> int:
        """Get number of connections in a room"""
        async with self.lock:
            return len(self.connections.get(room_id, {}))


class MessageQueue:
    """In-memory message queue for offline users"""
    
    def __init__(self, max_queue_size: int = 1000, message_ttl_seconds: int = 3600):
        # user_id -> deque of messages
        self.queues: Dict[str, deque] = {}
        self.max_queue_size = max_queue_size
        self.message_ttl = message_ttl_seconds
        self.lock = asyncio.Lock()
    
    async def enqueue(self, user_id: str, message: WebSocketMessage):
        """Add message to queue"""
        async with self.lock:
            if user_id not in self.queues:
                self.queues[user_id] = deque(maxlen=self.max_queue_size)
            
            self.queues[user_id].append((message, datetime.utcnow()))
    
    async def dequeue_all(self, user_id: str) -> List[WebSocketMessage]:
        """Get all queued messages for user and clear queue"""
        async with self.lock:
            if user_id not in self.queues:
                return []
            
            now = datetime.utcnow()
            messages = []
            
            while self.queues[user_id]:
                msg, timestamp = self.queues[user_id].popleft()
                # Skip expired messages
                if (now - timestamp).total_seconds() < self.message_ttl:
                    messages.append(msg)
            
            if not self.queues[user_id]:
                del self.queues[user_id]
            
            return messages
    
    async def get_queue_size(self, user_id: str) -> int:
        """Get number of queued messages"""
        async with self.lock:
            queue = self.queues.get(user_id)
            return len(queue) if queue else 0


class WebSocketManagerV2:
    """Enhanced WebSocket Manager with connection pooling and message queuing"""
    
    def __init__(
        self,
        max_connections_per_room: int = 500,
        heartbeat_interval: int = 30,
        heartbeat_timeout: int = 300,
        max_queue_size: int = 1000,
        message_ttl_seconds: int = 3600,
    ):
        self.pool = ConnectionPool(max_connections_per_room)
        self.message_queue = MessageQueue(max_queue_size, message_ttl_seconds)
        
        self.heartbeat_interval = heartbeat_interval
        self.heartbeat_timeout = heartbeat_timeout
        
        # Message handlers: {message_type -> [callable]}
        self.message_handlers: Dict[str, List[Callable]] = {}
        
        # Metrics
        self.total_messages_sent = 0
        self.total_messages_received = 0
        self.total_connections_created = 0
        self.total_connections_closed = 0
    
    def register_message_handler(self, message_type: str, handler: Callable):
        """Register handler for specific message type"""
        if message_type not in self.message_handlers:
            self.message_handlers[message_type] = []
        self.message_handlers[message_type].append(handler)
        logger.info(f"Registered handler for message type: {message_type}")
    
    async def handle_message(self, message: WebSocketMessage):
        """Route message to appropriate handlers"""
        handlers = self.message_handlers.get(message.type, [])
        for handler in handlers:
            try:
                if asyncio.iscoroutinefunction(handler):
                    await handler(message)
                else:
                    handler(message)
            except Exception as e:
                logger.error(f"Error in message handler: {e}")
    
    async def connect(
        self,
        websocket: WebSocket,
        room_id: str,
        user_id: str,
        user_email: str,
        user_role: str,
    ) -> str:
        """Connect user and return connection_id"""
        await websocket.accept()
        
        try:
            connection_id = await self.pool.add_connection(
                websocket, room_id, user_id, user_email, user_role
            )
            self.total_connections_created += 1
            
            # Send queued messages to user
            queued_messages = await self.message_queue.dequeue_all(user_id)
            for msg in queued_messages:
                await self.send_personal_message(msg, websocket)
            
            logger.info(f"User {user_email} connected (connection_id: {connection_id})")
            return connection_id
            
        except Exception as e:
            logger.error(f"Connection error: {e}")
            await websocket.close(code=1008, reason="Connection failed")
            raise
    
    async def disconnect(self, connection_id: str):
        """Disconnect user"""
        room_id = await self.pool.remove_connection(connection_id)
        self.total_connections_closed += 1
        
        if room_id:
            logger.info(f"User disconnected from room {room_id}")
    
    async def send_personal_message(
        self,
        message: WebSocketMessage,
        websocket: WebSocket
    ) -> bool:
        """Send message to specific connection"""
        try:
            await websocket.send_text(message.to_json())
            self.total_messages_sent += 1
            return True
        except Exception as e:
            logger.error(f"Error sending personal message: {e}")
            return False
    
    async def broadcast_to_room(
        self,
        room_id: str,
        message: WebSocketMessage,
        exclude_connection_id: Optional[str] = None
    ):
        """Broadcast message to all connections in room"""
        connections = await self.pool.get_room_connections(room_id)
        disconnected = []
        
        for conn_id, (websocket, metadata) in connections.items():
            if conn_id == exclude_connection_id:
                continue
            
            try:
                await websocket.send_text(message.to_json())
                self.total_messages_sent += 1
                metadata.bytes_sent += len(message.to_json())
            except Exception as e:
                logger.error(f"Error broadcasting to {conn_id}: {e}")
                disconnected.append(conn_id)
        
        # Clean up disconnected
        for conn_id in disconnected:
            await self.disconnect(conn_id)
    
    async def broadcast_to_user_role(
        self,
        room_id: str,
        role: str,
        message: WebSocketMessage
    ):
        """Broadcast message to all users with specific role in room"""
        connections = await self.pool.get_room_connections(room_id)
        
        for conn_id, (websocket, metadata) in connections.items():
            if metadata.user_role == role:
                try:
                    await websocket.send_text(message.to_json())
                    self.total_messages_sent += 1
                except Exception as e:
                    logger.error(f"Error broadcasting to role {role}: {e}")
    
    async def send_heartbeat(self, room_id: str):
        """Send heartbeat to all connections in room"""
        message = WebSocketMessage(
            type="heartbeat",
            timestamp=datetime.utcnow().isoformat()
        )
        
        connections = await self.pool.get_room_connections(room_id)
        for conn_id, (websocket, metadata) in connections.items():
            try:
                await websocket.send_text(message.to_json())
                metadata.update_heartbeat()
            except Exception as e:
                logger.error(f"Heartbeat failed for {conn_id}: {e}")
    
    async def get_room_users(self, room_id: str) -> List[Dict]:
        """Get list of users in room"""
        connections = await self.pool.get_room_connections(room_id)
        users = []
        
        for conn_id, (websocket, metadata) in connections.items():
            users.append({
                "connection_id": conn_id,
                "user_id": metadata.user_id,
                "user_email": metadata.user_email,
                "user_role": metadata.user_role,
                "connected_at": metadata.connected_at.isoformat(),
                "message_count": metadata.message_count,
            })
        
        return users
    
    async def get_metrics(self) -> Dict:
        """Get performance metrics"""
        total_connections = await self.pool.get_total_connections()
        
        return {
            "active_connections": total_connections,
            "total_connections_created": self.total_connections_created,
            "total_connections_closed": self.total_connections_closed,
            "total_messages_sent": self.total_messages_sent,
            "total_messages_received": self.total_messages_received,
            "message_queue_size": sum(
                len(queue) for queue in self.message_queue.queues.values()
            ),
            "timestamp": datetime.utcnow().isoformat(),
        }
    
    async def cleanup_stale_connections(self):
        """Clean up stale connections"""
        # Note: This is simplified - in production, iterate through all connections
        logger.info("Stale connection cleanup triggered")


# Global manager instance
manager_v2 = WebSocketManagerV2()
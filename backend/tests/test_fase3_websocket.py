"""
FASE 3: WebSocket Integration Tests
Comprehensive test suite for real-time communication
"""

import asyncio
import json
import logging
import pytest
from datetime import datetime
from typing import List, Optional
from unittest.mock import AsyncMock, MagicMock, patch

from app.websocket_v2_manager import (
    WebSocketManagerV2,
    WebSocketMessage,
    ConnectionMetadata,
    ConnectionPool,
    MessageQueue,
)
from app.streaming_service import (
    StreamingService,
    DashboardStreamService,
    NotificationPriority,
    StreamEventType,
)

logger = logging.getLogger(__name__)


# ============================================================================
# UNIT TESTS: WebSocket Manager Components
# ============================================================================

class TestWebSocketMessage:
    """Tests for WebSocketMessage dataclass"""
    
    def test_message_creation(self):
        """Test basic message creation"""
        msg = WebSocketMessage(
            type="notification",
            role="admin",
            data={"title": "Test"},
        )
        
        assert msg.type == "notification"
        assert msg.role == "admin"
        assert msg.data["title"] == "Test"
        assert msg.priority == "normal"
    
    def test_message_to_json(self):
        """Test message JSON serialization"""
        msg = WebSocketMessage(
            type="alert",
            data={"severity": "high"},
        )
        
        json_str = msg.to_json()
        data = json.loads(json_str)
        
        assert data["type"] == "alert"
        assert data["data"]["severity"] == "high"
    
    def test_message_from_dict(self):
        """Test message creation from dict"""
        data = {
            "type": "message",
            "role": "user",
            "data": {"content": "Hello"},
            "priority": "high",
        }
        
        msg = WebSocketMessage.from_dict(data)
        
        assert msg.type == "message"
        assert msg.priority == "high"
        assert msg.data["content"] == "Hello"


class TestConnectionMetadata:
    """Tests for ConnectionMetadata"""
    
    def test_metadata_creation(self):
        """Test metadata creation"""
        meta = ConnectionMetadata(
            user_id="user123",
            user_email="user@test.com",
            user_role="admin",
            room_id="room123",
        )
        
        assert meta.user_email == "user@test.com"
        assert meta.user_role == "admin"
        assert meta.message_count == 0
    
    def test_metadata_is_stale(self):
        """Test stale connection detection"""
        meta = ConnectionMetadata()
        
        assert not meta.is_stale(timeout_seconds=300)
        
        # Simulate old heartbeat
        meta.last_heartbeat = datetime(2020, 1, 1)
        assert meta.is_stale(timeout_seconds=300)
    
    @pytest.mark.asyncio
    async def test_update_heartbeat(self):
        """Test heartbeat update"""
        import time
        meta = ConnectionMetadata()
        old_time = meta.last_heartbeat
        
        await asyncio.sleep(0.01)  # Small delay
        meta.update_heartbeat()
        
        assert meta.last_heartbeat >= old_time  # Allow equal if very fast


@pytest.mark.asyncio
async def test_connection_pool():
    """Test connection pool"""
    pool = ConnectionPool(max_connections_per_room=10)
    
    # Mock websocket
    ws = AsyncMock()
    
    # Add connection
    conn_id = await pool.add_connection(
        ws,
        room_id="room1",
        user_id="user1",
        user_email="user@test.com",
        user_role="admin",
    )
    
    assert conn_id is not None
    assert await pool.get_room_count("room1") == 1
    assert await pool.get_total_connections() == 1
    
    # Remove connection
    removed_room = await pool.remove_connection(conn_id)
    assert removed_room == "room1"
    assert await pool.get_total_connections() == 0


@pytest.mark.asyncio
async def test_message_queue():
    """Test message queue"""
    queue = MessageQueue(max_queue_size=100, message_ttl_seconds=3600)
    
    # Enqueue message
    msg = WebSocketMessage(type="test", data={"test": "data"})
    await queue.enqueue("user1", msg)
    
    assert await queue.get_queue_size("user1") == 1
    
    # Dequeue all
    messages = await queue.dequeue_all("user1")
    assert len(messages) == 1
    assert messages[0].type == "test"
    
    # Queue should be empty
    assert await queue.get_queue_size("user1") == 0


# ============================================================================
# UNIT TESTS: WebSocket Manager
# ============================================================================

@pytest.mark.asyncio
class TestWebSocketManagerV2:
    """Tests for WebSocketManagerV2"""
    
    async def test_manager_creation(self):
        """Test manager creation"""
        manager = WebSocketManagerV2()
        
        assert manager.heartbeat_interval == 30
        assert manager.total_messages_sent == 0
        assert manager.total_messages_received == 0
    
    async def test_message_handler_registration(self):
        """Test registering message handlers"""
        manager = WebSocketManagerV2()
        
        async def handler(msg: WebSocketMessage):
            pass
        
        manager.register_message_handler("notification", handler)
        
        assert "notification" in manager.message_handlers
        assert len(manager.message_handlers["notification"]) == 1
    
    async def test_connect_disconnect(self):
        """Test connect/disconnect cycle"""
        manager = WebSocketManagerV2()
        ws = AsyncMock()
        
        # Connect
        conn_id = await manager.connect(
            ws,
            "room1",
            "user1",
            "user@test.com",
            "admin",
        )
        
        assert conn_id is not None
        assert manager.total_connections_created == 1
        
        # Disconnect
        await manager.disconnect(conn_id)
        assert manager.total_connections_closed == 1
    
    async def test_send_personal_message(self):
        """Test sending personal message"""
        manager = WebSocketManagerV2()
        ws = AsyncMock()
        
        msg = WebSocketMessage(type="test", data={"text": "hello"})
        result = await manager.send_personal_message(msg, ws)
        
        assert result is True
        assert manager.total_messages_sent == 1
        ws.send_text.assert_called_once()
    
    async def test_broadcast_to_room(self):
        """Test broadcasting to room"""
        manager = WebSocketManagerV2()
        ws1 = AsyncMock()
        ws2 = AsyncMock()
        
        # Add two connections
        conn_id_1 = await manager.connect(ws1, "room1", "user1", "user1@test.com", "admin")
        conn_id_2 = await manager.connect(ws2, "room1", "user2", "user2@test.com", "user")
        
        # Broadcast
        msg = WebSocketMessage(type="notification", data={"title": "Test"})
        await manager.broadcast_to_room("room1", msg)
        
        # Both should receive (at least the broadcast message)
        assert ws1.send_text.call_count >= 1
        assert ws2.send_text.call_count >= 1
        assert manager.total_messages_sent >= 2
    
    async def test_broadcast_to_user_role(self):
        """Test broadcasting to specific role"""
        manager = WebSocketManagerV2()
        admin_ws = AsyncMock()
        user_ws = AsyncMock()
        
        # Add connections with different roles
        await manager.connect(admin_ws, "room1", "admin1", "admin@test.com", "admin")
        await manager.connect(user_ws, "room1", "user1", "user@test.com", "user")
        
        # Broadcast to admin role only
        msg = WebSocketMessage(type="system_alert", data={})
        await manager.broadcast_to_user_role("room1", "admin", msg)
        
        # Only admin should receive (plus initial connection message)
        assert admin_ws.send_text.call_count >= 1
    
    async def test_get_room_users(self):
        """Test getting room users"""
        manager = WebSocketManagerV2()
        ws1 = AsyncMock()
        ws2 = AsyncMock()
        
        await manager.connect(ws1, "room1", "user1", "user1@test.com", "admin")
        await manager.connect(ws2, "room1", "user2", "user2@test.com", "user")
        
        users = await manager.get_room_users("room1")
        
        assert len(users) == 2
        assert users[0]["user_email"] == "user1@test.com"
        assert users[1]["user_email"] == "user2@test.com"
    
    async def test_get_metrics(self):
        """Test metrics collection"""
        manager = WebSocketManagerV2()
        
        metrics = await manager.get_metrics()
        
        assert "active_connections" in metrics
        assert "total_connections_created" in metrics
        assert "total_messages_sent" in metrics
        assert "timestamp" in metrics


# ============================================================================
# INTEGRATION TESTS: Streaming Service
# ============================================================================

@pytest.mark.asyncio
class TestStreamingService:
    """Tests for StreamingService"""
    
    async def test_broadcast_notification(self):
        """Test notification broadcast"""
        manager = WebSocketManagerV2()
        ws = AsyncMock()
        
        await manager.connect(ws, "room1", "user1", "user@test.com", "admin")
        
        streaming = StreamingService(manager)
        await streaming.broadcast_notification(
            "room1",
            title="Test Alert",
            message="This is a test",
            notification_type="info",
        )
        
        # Check broadcast was sent
        assert manager.total_messages_sent >= 1
    
    async def test_broadcast_alert(self):
        """Test alert broadcast"""
        manager = WebSocketManagerV2()
        ws = AsyncMock()
        
        await manager.connect(ws, "room1", "user1", "user@test.com", "admin")
        
        streaming = StreamingService(manager)
        await streaming.broadcast_alert(
            "room1",
            alert_type="compliance",
            severity="high",
            message="Compliance issue detected",
        )
        
        assert manager.total_messages_sent >= 1
    
    async def test_broadcast_dashboard_update(self):
        """Test dashboard update broadcast"""
        manager = WebSocketManagerV2()
        ws = AsyncMock()
        
        await manager.connect(ws, "room1", "user1", "user@test.com", "charterer")
        
        streaming = StreamingService(manager)
        await streaming.broadcast_dashboard_update(
            "room1",
            metric_name="demurrage_exposure",
            metric_value={"vessel": "Test", "rate": 1.5},
            target_role="charterer",
        )
        
        assert manager.total_messages_sent >= 1
    
    async def test_demurrage_alert(self):
        """Test demurrage alert"""
        manager = WebSocketManagerV2()
        ws = AsyncMock()
        
        await manager.connect(ws, "room1", "user1", "user@test.com", "charterer")
        
        streaming = StreamingService(manager)
        await streaming.broadcast_demurrage_alert(
            "room1",
            vessel_name="Test Vessel",
            current_rate=1.8,
            escalation_level=2,
        )
        
        assert manager.total_messages_sent >= 1
    
    async def test_compliance_alert(self):
        """Test compliance alert"""
        manager = WebSocketManagerV2()
        ws = AsyncMock()
        
        await manager.connect(ws, "room1", "user1", "user@test.com", "owner")
        
        streaming = StreamingService(manager)
        await streaming.broadcast_compliance_alert(
            "room1",
            issue_type="crew_certification_expiring",
            severity="high",
            crew_member="John Doe",
            expiry_days=5,
        )
        
        assert manager.total_messages_sent >= 1
    
    async def test_document_alert(self):
        """Test document alert"""
        manager = WebSocketManagerV2()
        ws = AsyncMock()
        
        await manager.connect(ws, "room1", "user1", "user@test.com", "admin")
        
        streaming = StreamingService(manager)
        await streaming.broadcast_document_alert(
            "room1",
            document_name="Certificate",
            alert_type="expiring",
            days_until_expiry=3,
        )
        
        assert manager.total_messages_sent >= 1


# ============================================================================
# INTEGRATION TESTS: Dashboard Stream Service
# ============================================================================

@pytest.mark.asyncio
class TestDashboardStreamService:
    """Tests for DashboardStreamService"""
    
    async def test_stream_demurrage_update(self):
        """Test demurrage update streaming"""
        manager = WebSocketManagerV2()
        ws = AsyncMock()
        
        await manager.connect(ws, "room1", "user1", "user@test.com", "charterer")
        
        streaming = StreamingService(manager)
        dashboard_stream = DashboardStreamService(streaming)
        
        await dashboard_stream.stream_demurrage_update(
            "room1",
            vessel_name="Test Vessel",
            current_demurrage=1000.0,
            projected_demurrage=1500.0,
            escalation_level=1,
        )
        
        assert manager.total_messages_sent >= 1
    
    async def test_stream_commission_update(self):
        """Test commission update streaming"""
        manager = WebSocketManagerV2()
        ws = AsyncMock()
        
        await manager.connect(ws, "room1", "user1", "user@test.com", "broker")
        
        streaming = StreamingService(manager)
        dashboard_stream = DashboardStreamService(streaming)
        
        await dashboard_stream.stream_commission_update(
            "room1",
            commission_accrued=5000.0,
            commission_pending=2000.0,
            total_commission=7000.0,
        )
        
        assert manager.total_messages_sent >= 1
    
    async def test_stream_compliance_status(self):
        """Test compliance status streaming"""
        manager = WebSocketManagerV2()
        ws = AsyncMock()
        
        await manager.connect(ws, "room1", "user1", "user@test.com", "owner")
        
        streaming = StreamingService(manager)
        dashboard_stream = DashboardStreamService(streaming)
        
        await dashboard_stream.stream_compliance_status(
            "room1",
            crew_compliance_score=95,
            sire_score=4.5,
            violations_count=0,
        )
        
        assert manager.total_messages_sent >= 1
    
    async def test_stream_system_health(self):
        """Test system health streaming"""
        manager = WebSocketManagerV2()
        ws = AsyncMock()
        
        await manager.connect(ws, "room1", "user1", "user@test.com", "admin")
        
        streaming = StreamingService(manager)
        dashboard_stream = DashboardStreamService(streaming)
        
        await dashboard_stream.stream_system_health(
            "room1",
            cpu_usage=45.2,
            memory_usage=62.1,
            active_connections=150,
            request_rate=1200,
        )
        
        assert manager.total_messages_sent >= 1


# ============================================================================
# PERFORMANCE TESTS
# ============================================================================

@pytest.mark.asyncio
class TestPerformance:
    """Performance tests for WebSocket system"""
    
    async def test_concurrent_connections(self):
        """Test handling multiple concurrent connections"""
        manager = WebSocketManagerV2(max_connections_per_room=1000)
        
        connections = []
        for i in range(100):
            ws = AsyncMock()
            conn_id = await manager.connect(
                ws,
                "room1",
                f"user{i}",
                f"user{i}@test.com",
                "user",
            )
            connections.append(conn_id)
        
        assert await manager.pool.get_total_connections() == 100
        assert await manager.pool.get_room_count("room1") == 100
    
    async def test_high_message_throughput(self):
        """Test high message throughput"""
        manager = WebSocketManagerV2()
        ws = AsyncMock()
        
        await manager.connect(ws, "room1", "user1", "user@test.com", "admin")
        
        # Send 1000 messages
        for i in range(1000):
            msg = WebSocketMessage(
                type="message",
                data={"index": i}
            )
            await manager.send_personal_message(msg, ws)
        
        assert manager.total_messages_sent == 1000
    
    async def test_broadcast_performance(self):
        """Test broadcast performance with many recipients"""
        manager = WebSocketManagerV2()
        
        # Create 50 connections
        for i in range(50):
            ws = AsyncMock()
            await manager.connect(
                ws,
                "room1",
                f"user{i}",
                f"user{i}@test.com",
                "user",
            )
        
        # Broadcast message
        msg = WebSocketMessage(type="notification", data={})
        await manager.broadcast_to_room("room1", msg)
        
        # Should send to 50 recipients
        assert manager.total_messages_sent >= 50


# ============================================================================
# ERROR HANDLING TESTS
# ============================================================================

@pytest.mark.asyncio
class TestErrorHandling:
    """Tests for error handling"""
    
    async def test_send_to_disconnected_websocket(self):
        """Test sending to disconnected websocket"""
        manager = WebSocketManagerV2()
        ws = AsyncMock()
        ws.send_text.side_effect = RuntimeError("Connection closed")
        
        msg = WebSocketMessage(type="test", data={})
        result = await manager.send_personal_message(msg, ws)
        
        assert result is False
    
    async def test_broadcast_with_partial_failures(self):
        """Test broadcast with some recipients failing"""
        manager = WebSocketManagerV2()
        
        ws1 = AsyncMock()
        ws2 = AsyncMock()
        ws2.send_text.side_effect = RuntimeError("Connection failed")
        ws3 = AsyncMock()
        
        await manager.connect(ws1, "room1", "user1", "user1@test.com", "admin")
        await manager.connect(ws2, "room1", "user2", "user2@test.com", "user")
        await manager.connect(ws3, "room1", "user3", "user3@test.com", "user")
        
        msg = WebSocketMessage(type="test", data={})
        await manager.broadcast_to_room("room1", msg)
        
        # Should still send to ws1 and ws3
        assert ws1.send_text.call_count >= 1
        assert ws3.send_text.call_count >= 1


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
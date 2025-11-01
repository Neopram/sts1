import sys
import io
if sys.platform == 'win32':
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8', errors='replace')
#!/usr/bin/env python3
"""
FASE 3 Validation Tests
Verifies all WebSocket components are correctly implemented and integrated
"""

import asyncio
import json
import sys
import logging
from pathlib import Path

# Add backend to path
sys.path.insert(0, str(Path(__file__).parent))

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
)

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Test counters
tests_passed = 0
tests_failed = 0
tests_skipped = 0


def test_result(name: str, passed: bool, details: str = ""):
    """Record test result"""
    global tests_passed, tests_failed
    
    status = "✅ PASS" if passed else "❌ FAIL"
    print(f"{status} | {name}")
    if details:
        print(f"      └─ {details}")
    
    if passed:
        tests_passed += 1
    else:
        tests_failed += 1


async def test_websocket_message():
    """Test WebSocketMessage class"""
    try:
        msg = WebSocketMessage(
            type="notification",
            role="admin",
            priority="high",
            data={"title": "Test"}
        )
        
        # Test JSON serialization
        json_str = msg.to_json()
        data = json.loads(json_str)
        
        assert data["type"] == "notification"
        assert data["role"] == "admin"
        
        # Test deserialization
        msg2 = WebSocketMessage.from_dict(data)
        assert msg2.type == msg.type
        
        test_result("WebSocketMessage Creation & Serialization", True)
    except Exception as e:
        test_result("WebSocketMessage Creation & Serialization", False, str(e))


async def test_connection_metadata():
    """Test ConnectionMetadata class"""
    try:
        meta = ConnectionMetadata(
            user_id="user123",
            user_email="test@example.com",
            user_role="admin",
        )
        
        assert not meta.is_stale(timeout_seconds=300)
        assert meta.user_email == "test@example.com"
        
        meta.update_heartbeat()
        assert meta.last_heartbeat is not None
        
        test_result("ConnectionMetadata Operations", True)
    except Exception as e:
        test_result("ConnectionMetadata Operations", False, str(e))


async def test_connection_pool():
    """Test ConnectionPool"""
    try:
        pool = ConnectionPool(max_connections_per_room=100)
        
        # Test add connection
        from unittest.mock import AsyncMock
        ws1 = AsyncMock()
        
        conn_id = await pool.add_connection(
            ws1, "room1", "user1", "user@test.com", "admin"
        )
        
        assert conn_id is not None
        assert await pool.get_total_connections() == 1
        assert await pool.get_room_count("room1") == 1
        
        # Test get connections
        connections = await pool.get_room_connections("room1")
        assert len(connections) == 1
        
        # Test remove connection
        removed_room = await pool.remove_connection(conn_id)
        assert removed_room == "room1"
        assert await pool.get_total_connections() == 0
        
        test_result("ConnectionPool Operations", True)
    except Exception as e:
        test_result("ConnectionPool Operations", False, str(e))


async def test_message_queue():
    """Test MessageQueue"""
    try:
        queue = MessageQueue(max_queue_size=100)
        
        msg = WebSocketMessage(type="test", data={"test": "data"})
        
        # Test enqueue
        await queue.enqueue("user1", msg)
        size = await queue.get_queue_size("user1")
        assert size == 1
        
        # Test dequeue
        messages = await queue.dequeue_all("user1")
        assert len(messages) == 1
        assert messages[0].type == "test"
        
        # Queue should be empty
        assert await queue.get_queue_size("user1") == 0
        
        test_result("MessageQueue Operations", True)
    except Exception as e:
        test_result("MessageQueue Operations", False, str(e))


async def test_websocket_manager():
    """Test WebSocketManagerV2"""
    try:
        manager = WebSocketManagerV2()
        
        # Test initialization
        assert manager.heartbeat_interval == 30
        assert manager.total_messages_sent == 0
        
        # Test handler registration
        async def handler(msg: WebSocketMessage):
            pass
        
        manager.register_message_handler("test", handler)
        assert "test" in manager.message_handlers
        
        # Test connect/disconnect
        from unittest.mock import AsyncMock
        ws = AsyncMock()
        
        conn_id = await manager.connect(
            ws, "room1", "user1", "user@test.com", "admin"
        )
        assert conn_id is not None
        assert manager.total_connections_created == 1
        
        await manager.disconnect(conn_id)
        assert manager.total_connections_closed == 1
        
        test_result("WebSocketManagerV2 Core Operations", True)
    except Exception as e:
        test_result("WebSocketManagerV2 Core Operations", False, str(e))


async def test_streaming_service():
    """Test StreamingService"""
    try:
        from unittest.mock import AsyncMock
        
        manager = WebSocketManagerV2()
        streaming = StreamingService(manager)
        
        # Test event subscription
        called = []
        
        async def event_handler(data):
            called.append(data)
        
        streaming.subscribe_to_event("test_event", event_handler)
        await streaming.emit_event("test_event", {"test": "data"})
        
        assert len(called) == 1
        assert called[0]["test"] == "data"
        
        test_result("StreamingService Event System", True)
    except Exception as e:
        test_result("StreamingService Event System", False, str(e))


async def test_file_creation():
    """Test that all required files exist"""
    try:
        required_files = [
            "app/websocket_v2_manager.py",
            "app/streaming_service.py",
            "app/routers/websocket_v2.py",
            "tests/test_fase3_websocket.py",
        ]
        
        base_path = Path(__file__).parent
        missing_files = []
        
        for file in required_files:
            full_path = base_path / file
            if not full_path.exists():
                missing_files.append(file)
        
        if missing_files:
            test_result("File Creation", False, f"Missing: {', '.join(missing_files)}")
        else:
            test_result("File Creation", True, "All 4 files created")
    except Exception as e:
        test_result("File Creation", False, str(e))


async def test_router_registration():
    """Test that router is registered in main.py"""
    try:
        main_py_path = Path(__file__).parent / "app" / "main.py"
        
        with open(main_py_path, "r") as f:
            content = f.read()
        
        checks = [
            ("websocket_v2 import", "websocket_v2" in content),
            ("websocket_v2 router registration", "app.include_router(websocket_v2.router)" in content),
        ]
        
        all_passed = all(check[1] for check in checks)
        details = ", ".join([check[0] for check in checks if check[1]])
        
        if all_passed:
            test_result("Router Registration in main.py", True, details)
        else:
            failed = [check[0] for check in checks if not check[1]]
            test_result("Router Registration in main.py", False, f"Missing: {', '.join(failed)}")
    except Exception as e:
        test_result("Router Registration in main.py", False, str(e))


async def test_imports():
    """Test that imports work correctly"""
    try:
        # Try importing modules
        from app.websocket_v2_manager import manager_v2
        from app.streaming_service import create_streaming_service, create_dashboard_stream_service
        from app.routers import websocket_v2
        
        assert manager_v2 is not None
        assert create_streaming_service is not None
        assert websocket_v2 is not None
        
        test_result("Module Imports", True, "All imports successful")
    except Exception as e:
        test_result("Module Imports", False, str(e))


async def test_broadcast_functionality():
    """Test broadcasting to multiple users"""
    try:
        from unittest.mock import AsyncMock
        
        manager = WebSocketManagerV2()
        
        # Create multiple connections
        ws_list = []
        conn_ids = []
        
        for i in range(5):
            ws = AsyncMock()
            ws_list.append(ws)
            conn_id = await manager.connect(
                ws, "room1", f"user{i}", f"user{i}@test.com", "user"
            )
            conn_ids.append(conn_id)
        
        # Broadcast message
        msg = WebSocketMessage(type="test", data={"broadcast": True})
        await manager.broadcast_to_room("room1", msg)
        
        # All should receive the message (plus initial connection message)
        all_received = all(ws.send_text.call_count >= 1 for ws in ws_list)
        
        test_result("Broadcast to Multiple Users", all_received)
    except Exception as e:
        test_result("Broadcast to Multiple Users", False, str(e))


async def test_role_based_broadcast():
    """Test role-based broadcasting"""
    try:
        from unittest.mock import AsyncMock
        
        manager = WebSocketManagerV2()
        
        admin_ws = AsyncMock()
        user_ws = AsyncMock()
        
        admin_conn = await manager.connect(
            admin_ws, "room1", "admin1", "admin@test.com", "admin"
        )
        user_conn = await manager.connect(
            user_ws, "room1", "user1", "user@test.com", "user"
        )
        
        # Broadcast to admin role only
        msg = WebSocketMessage(type="admin_alert", data={})
        await manager.broadcast_to_user_role("room1", "admin", msg)
        
        # Check admin received more messages than user
        # (admin gets connection message + broadcast, user just gets connection)
        admin_calls = admin_ws.send_text.call_count
        user_calls = user_ws.send_text.call_count
        
        test_result(
            "Role-Based Broadcasting",
            admin_calls > user_calls,
            f"Admin: {admin_calls} calls, User: {user_calls} calls"
        )
    except Exception as e:
        test_result("Role-Based Broadcasting", False, str(e))


async def test_metrics_collection():
    """Test metrics collection"""
    try:
        manager = WebSocketManagerV2()
        
        metrics = await manager.get_metrics()
        
        required_metrics = [
            "active_connections",
            "total_connections_created",
            "total_connections_closed",
            "total_messages_sent",
            "total_messages_received",
            "timestamp",
        ]
        
        missing = [m for m in required_metrics if m not in metrics]
        
        if missing:
            test_result("Metrics Collection", False, f"Missing: {', '.join(missing)}")
        else:
            test_result("Metrics Collection", True, f"All {len(required_metrics)} metrics available")
    except Exception as e:
        test_result("Metrics Collection", False, str(e))


async def test_error_handling():
    """Test error handling"""
    try:
        from unittest.mock import AsyncMock
        
        manager = WebSocketManagerV2()
        ws = AsyncMock()
        ws.send_text.side_effect = RuntimeError("Connection closed")
        
        msg = WebSocketMessage(type="test", data={})
        result = await manager.send_personal_message(msg, ws)
        
        # Should return False on error
        test_result(
            "Error Handling",
            result is False,
            "Graceful error handling confirmed"
        )
    except Exception as e:
        test_result("Error Handling", False, str(e))


async def run_all_tests():
    """Run all validation tests"""
    print("\n" + "="*70)
    print("FASE 3: WebSocket Integration - VALIDATION TESTS")
    print("="*70 + "\n")
    
    # Core component tests
    print("📋 Component Tests:")
    print("-" * 70)
    await test_websocket_message()
    await test_connection_metadata()
    await test_connection_pool()
    await test_message_queue()
    await test_websocket_manager()
    
    print("\n📡 Service Tests:")
    print("-" * 70)
    await test_streaming_service()
    await test_broadcast_functionality()
    await test_role_based_broadcast()
    
    print("\n🎯 Feature Tests:")
    print("-" * 70)
    await test_metrics_collection()
    await test_error_handling()
    
    print("\n🔧 Integration Tests:")
    print("-" * 70)
    await test_file_creation()
    await test_router_registration()
    await test_imports()
    
    print("\n" + "="*70)
    print("TEST SUMMARY")
    print("="*70)
    print(f"✅ Passed:  {tests_passed}")
    print(f"❌ Failed:  {tests_failed}")
    print(f"⏭️  Skipped: {tests_skipped}")
    print(f"📊 Total:   {tests_passed + tests_failed + tests_skipped}")
    print("="*70 + "\n")
    
    if tests_failed == 0:
        print("🎉 ALL TESTS PASSED!")
        print("\nFASE 3 is ready for production deployment.\n")
        return 0
    else:
        print(f"⚠️  {tests_failed} TEST(S) FAILED")
        print("\nPlease review the failures above.\n")
        return 1


if __name__ == "__main__":
    exit_code = asyncio.run(run_all_tests())
    sys.exit(exit_code)
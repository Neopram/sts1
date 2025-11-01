"""
Verification script to ensure WebSocketRouter and StreamingService classes are properly detected
"""

import sys
import os
import inspect

# Add backend to path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

def verify_websocket_router():
    """Verify WebSocketRouter class is detected"""
    try:
        from app.routers.websocket_v2 import WebSocketRouter
        
        print("✅ WebSocketRouter class detected successfully")
        print(f"   - Location: {inspect.getfile(WebSocketRouter)}")
        print(f"   - Type: {type(WebSocketRouter)}")
        print(f"   - Methods: {[m for m in dir(WebSocketRouter) if not m.startswith('_')]}")
        
        # Verify instantiation
        from app.websocket_v2_manager import manager_v2
        router = WebSocketRouter(manager_v2)
        print(f"   - ✅ Instance created: {router}")
        print(f"   - ✅ Streaming service getter: {hasattr(router, 'get_streaming_service')}")
        
        return True
    except Exception as e:
        print(f"❌ ERROR detecting WebSocketRouter: {e}")
        import traceback
        traceback.print_exc()
        return False


def verify_streaming_service():
    """Verify StreamingService class is detected"""
    try:
        from app.streaming_service import StreamingService, DashboardStreamService
        
        print("\n✅ StreamingService class detected successfully")
        print(f"   - Location: {inspect.getfile(StreamingService)}")
        print(f"   - Type: {type(StreamingService)}")
        print(f"   - Methods: {[m for m in dir(StreamingService) if not m.startswith('_')]}")
        
        print("\n✅ DashboardStreamService class detected successfully")
        print(f"   - Location: {inspect.getfile(DashboardStreamService)}")
        print(f"   - Type: {type(DashboardStreamService)}")
        print(f"   - Methods: {[m for m in dir(DashboardStreamService) if not m.startswith('_')]}")
        
        # Verify instantiation
        from app.websocket_v2_manager import manager_v2
        from app.streaming_service import create_streaming_service, create_dashboard_stream_service
        
        streaming = create_streaming_service(manager_v2)
        print(f"\n   - ✅ StreamingService instance created: {streaming}")
        
        dashboard = create_dashboard_stream_service(streaming)
        print(f"   - ✅ DashboardStreamService instance created: {dashboard}")
        
        return True
    except Exception as e:
        print(f"❌ ERROR detecting StreamingService: {e}")
        import traceback
        traceback.print_exc()
        return False


def verify_imports():
    """Verify all imports work correctly"""
    try:
        print("\n\n📦 VERIFYING IMPORTS:")
        print("-" * 50)
        
        from app.routers.websocket_v2 import router, WebSocketRouter, _router_instance
        print("✅ websocket_v2 router imported")
        
        from app.streaming_service import (
            StreamingService, 
            DashboardStreamService,
            StreamEventType,
            NotificationPriority,
            create_streaming_service,
            create_dashboard_stream_service
        )
        print("✅ streaming_service classes and factories imported")
        
        from app.websocket_v2_manager import WebSocketManagerV2, manager_v2
        print("✅ websocket_v2_manager imported")
        
        return True
    except Exception as e:
        print(f"❌ ERROR importing: {e}")
        import traceback
        traceback.print_exc()
        return False


def main():
    """Run all verifications"""
    print("=" * 60)
    print("🔍 CLASS DETECTION VERIFICATION")
    print("=" * 60)
    
    results = []
    
    print("\n\n📋 CHECKING WEBSOCKET ROUTER:")
    print("-" * 50)
    results.append(("WebSocketRouter", verify_websocket_router()))
    
    print("\n\n📋 CHECKING STREAMING SERVICES:")
    print("-" * 50)
    results.append(("StreamingService", verify_streaming_service()))
    
    results.append(("Imports", verify_imports()))
    
    print("\n\n" + "=" * 60)
    print("📊 VERIFICATION SUMMARY")
    print("=" * 60)
    
    all_passed = all(result[1] for result in results)
    
    for name, passed in results:
        status = "✅ PASS" if passed else "❌ FAIL"
        print(f"{status}: {name}")
    
    print("\n" + "=" * 60)
    if all_passed:
        print("🎉 ALL VERIFICATIONS PASSED - Classes properly detected!")
    else:
        print("⚠️  Some verifications failed - please review errors above")
    print("=" * 60)
    
    return all_passed


if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)
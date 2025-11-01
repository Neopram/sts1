import sys
import io
if sys.platform == 'win32':
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8', errors='replace')
#!/usr/bin/env python
"""
Test that the application can start without errors
"""
import sys
import asyncio
import logging

# Set up logging
logging.basicConfig(
    level=logging.WARNING,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)

async def test_imports():
    """Test that all critical imports work"""
    print("\n=== TESTING IMPORTS ===\n")
    
    try:
        print("Importing FastAPI app...")
        from app.main import app
        print("  ✓ FastAPI app imported successfully")
        
        print("Checking registered routers...")
        routes = [route.path for route in app.routes]
        
        # Check critical endpoints
        critical_endpoints = [
            "/api/v1/dashboard/overview",
            "/api/v1/dashboard/admin/stats",
            "/api/v1/dashboard/charterer/overview",
            "/api/v1/dashboard/broker/overview",
            "/api/v1/dashboard/owner/overview",
            "/api/v1/dashboard/inspector/overview",
        ]
        
        found = 0
        for endpoint in critical_endpoints:
            if any(endpoint in route for route in routes):
                print(f"  ✓ {endpoint}")
                found += 1
            else:
                print(f"  ✗ {endpoint} NOT FOUND")
        
        print(f"\n  Dashboard endpoints found: {found}/{len(critical_endpoints)}")
        
        # List all dashboard routes
        print("\nAll dashboard routes:")
        dashboard_routes = [r for r in routes if "/dashboard" in r]
        for route in sorted(dashboard_routes):
            print(f"  • {route}")
        
        return found == len(critical_endpoints)
        
    except Exception as e:
        print(f"  ✗ ERROR: {e}")
        import traceback
        traceback.print_exc()
        return False

async def main():
    success = await test_imports()
    
    print("\n=== SUMMARY ===\n")
    if success:
        print("✅ Application is ready to start!")
        print("\nNext step: Start the server with:")
        print("  python run_server.py")
        return 0
    else:
        print("⚠️  Some issues detected. Review errors above.")
        return 1

if __name__ == '__main__':
    sys.exit(asyncio.run(main()))
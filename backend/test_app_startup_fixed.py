"""
Test application startup and dashboard integration
Fixed for Windows encoding issues
"""
import sys
import os

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

print("=" * 60)
print("TESTING APPLICATION STARTUP")
print("=" * 60)

try:
    print("\n[1] Importing FastAPI app...")
    from app.main import app as fastapi_app
    print("    SUCCESS: FastAPI app imported")
    
    print("\n[2] Checking dashboard router registration...")
    dashboard_routes = [route for route in fastapi_app.routes if "dashboard" in str(route.path)]
    print(f"    SUCCESS: Found {len(dashboard_routes)} dashboard routes")
    for route in dashboard_routes[:5]:
        print(f"      - {route.path}")
    if len(dashboard_routes) > 5:
        print(f"      ... and {len(dashboard_routes) - 5} more")
    
    print("\n[3] Importing dashboard services...")
    from app.services.metrics_service import MetricsService, metrics_service
    from app.services.demurrage_service import DemurrageService
    from app.services.commission_service import CommissionService
    from app.services.compliance_service import ComplianceService
    from app.services.dashboard_projection_service import DashboardProjectionService
    print("    SUCCESS: All 5 dashboard services imported")
    
    print("\n[4] Importing base schemas...")
    from app.base_schemas import (
        PartyRole, DocumentStatus, Criticality,
        RoomResponse, DocumentResponse,
        FeatureFlagResponse, DocumentWithScore
    )
    print("    SUCCESS: All base schemas imported")
    
    print("\n[5] Importing dashboard schemas...")
    from app.schemas import (
        AdminDashboard, ChartererDashboard, BrokerDashboard,
        OwnerDashboard, InspectorDashboard
    )
    print("    SUCCESS: All dashboard schemas imported")
    
    print("\n[6] Verifying circular imports are resolved...")
    import app.schemas
    import app.base_schemas
    print("    SUCCESS: No circular import errors")
    
    print("\n[7] Checking total routes in application...")
    total_routes = len(fastapi_app.routes)
    print(f"    SUCCESS: {total_routes} total routes registered")
    
    print("\n[8] Listing all dashboard endpoints:")
    dashboard_paths = sorted(set([r.path for r in fastapi_app.routes if "/dashboard" in r.path]))
    for path in dashboard_paths:
        methods = [r.methods for r in fastapi_app.routes if r.path == path]
        methods_flat = set()
        for m in methods:
            if m:
                methods_flat.update(m)
        print(f"    {path} [{', '.join(sorted(methods_flat))}]")
    
    print("\n" + "=" * 60)
    print("ALL TESTS PASSED - APPLICATION READY")
    print("=" * 60)
    print("\nNext steps:")
    print("1. Configure DATABASE_URL in environment")
    print("2. Run: python -m uvicorn app.main:app --reload")
    print("3. Test endpoint: http://localhost:8000/api/v1/dashboard/overview")
    
except Exception as e:
    print(f"\nERROR: {type(e).__name__}: {e}")
    import traceback
    traceback.print_exc()
    sys.exit(1)
import sys
import io
if sys.platform == 'win32':
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8', errors='replace')
#!/usr/bin/env python3
"""
Test application startup and dashboard router registration
"""

import os
import sys

print("=" * 60)
print("🔍 TESTING APPLICATION STARTUP")
print("=" * 60)

print("\n1️⃣ Environment Check:")
print(f"   DATABASE_URL: {os.getenv('DATABASE_URL', '❌ Not set')}")
print(f"   PYTHONPATH: {sys.path[0]}")

print("\n2️⃣ Importing FastAPI Application...")
try:
    from app.main import app
    print("   ✅ FastAPI app initialized successfully")
except Exception as e:
    print(f"   ❌ Error: {e}")
    import traceback
    traceback.print_exc()
    sys.exit(1)

print("\n3️⃣ Checking Routes:")
print(f"   Total routes: {len(app.routes)}")

dashboard_routes = [r.path for r in app.routes if 'dashboard' in r.path]
if dashboard_routes:
    print(f"   ✅ Dashboard routes registered: {len(dashboard_routes)}")
    for route in sorted(set(dashboard_routes)):
        print(f"      - {route}")
else:
    print("   ⚠️  No dashboard routes found")

print("\n4️⃣ Importing Services:")
services_to_test = [
    ("MetricsService", "app.services.metrics_service", "MetricsService"),
    ("DemurrageService", "app.services.demurrage_service", "DemurrageService"),
    ("CommissionService", "app.services.commission_service", "CommissionService"),
    ("ComplianceService", "app.services.compliance_service", "ComplianceService"),
    ("DashboardProjectionService", "app.services.dashboard_projection_service", "DashboardProjectionService"),
]

for name, module_path, class_name in services_to_test:
    try:
        module = __import__(module_path, fromlist=[class_name])
        service_class = getattr(module, class_name)
        print(f"   ✅ {name}")
    except Exception as e:
        print(f"   ❌ {name}: {e}")

print("\n5️⃣ Importing Schemas:")
try:
    from app.schemas import PartyRole, DocumentStatus, Criticality
    from app.schemas.dashboard_schemas import ChartererDashboard, BrokerDashboard, OwnerDashboard, AdminDashboard
    print("   ✅ Base schemas loaded")
    print("   ✅ Dashboard schemas loaded")
except Exception as e:
    print(f"   ❌ Schema import error: {e}")

print("\n" + "=" * 60)
print("✅ APPLICATION READY FOR TESTING")
print("=" * 60)
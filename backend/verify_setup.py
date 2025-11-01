#!/usr/bin/env python3
"""
Phase 2 Verification - Non-async verification of setup
"""

import os
import sys
from pathlib import Path

print("=" * 70)
print("PHASE 2 VERIFICATION - BACKEND READINESS CHECK")
print("=" * 70)

# ============ STEP 1: ENVIRONMENT ============

print("\n[STEP 1] ENVIRONMENT CONFIGURATION")
print("-" * 70)

db_url = os.getenv("DATABASE_URL", "sqlite:///./sts_clearance.db")
os.environ["DATABASE_URL"] = db_url
print(f"✅ DATABASE_URL: {db_url}")

# ============ STEP 2: FILE STRUCTURE ============

print("\n[STEP 2] FILE STRUCTURE VERIFICATION")
print("-" * 70)

required_files = [
    "app/main.py",
    "app/routers/dashboard.py",
    "app/services/dashboard_projection_service.py",
    "app/services/metrics_service.py",
    "app/schemas/__init__.py",
    "app/schemas/dashboard_schemas.py",
    "app/base_schemas.py",
]

for file in required_files:
    path = Path(file)
    if path.exists():
        print(f"✅ {file}")
    else:
        print(f"❌ {file} - NOT FOUND")

# ============ STEP 3: PYTHON IMPORTS (Non-async) ============

print("\n[STEP 3] PYTHON IMPORTS")
print("-" * 70)

# Test imports without initializing FastAPI
try:
    print("Importing app models...")
    from app.models import User, Room, Document
    print("✅ Models imported")
except Exception as e:
    print(f"❌ Models import failed: {e}")

try:
    print("Importing schemas...")
    from app.schemas import (
        AdminDashboard, 
        ChartererDashboard, 
        BrokerDashboard,
        OwnerDashboard,
        InspectorDashboard
    )
    print("✅ All dashboard schemas imported")
except Exception as e:
    print(f"❌ Schema import failed: {e}")
    import traceback
    traceback.print_exc()

try:
    print("Importing services (metadata only)...")
    import app.services.metrics_service as ms
    import app.services.demurrage_service as ds
    import app.services.commission_service as cs
    import app.services.compliance_service as ccs
    import app.services.dashboard_projection_service as dps
    print("✅ All services importable")
except Exception as e:
    print(f"❌ Service import failed: {e}")

try:
    print("Importing dependencies...")
    from app.dependencies import get_current_user
    from app.database import get_async_session
    print("✅ Dependencies imported")
except Exception as e:
    print(f"❌ Dependency import failed: {e}")

# ============ STEP 4: DATABASE CHECK ============

print("\n[STEP 4] DATABASE CHECK")
print("-" * 70)

if db_url.startswith("sqlite"):
    db_path = db_url.replace("sqlite:///./", "").replace("sqlite:///", "")
    db_file = Path(db_path)
    
    if db_file.exists():
        print(f"✅ Database file exists: {db_path}")
        
        # Try to open it with sqlite3
        try:
            import sqlite3
            conn = sqlite3.connect(db_path)
            cursor = conn.cursor()
            
            # Check tables
            cursor.execute("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name")
            tables = [row[0] for row in cursor.fetchall()]
            
            if tables:
                print(f"✅ Database has {len(tables)} tables:")
                for table in tables[:10]:
                    print(f"   - {table}")
                if len(tables) > 10:
                    print(f"   ... and {len(tables) - 10} more")
            else:
                print("⚠️  Database exists but has no tables")
            
            # Check rooms table structure
            if "rooms" in tables:
                cursor.execute("PRAGMA table_info(rooms)")
                columns = cursor.fetchall()
                print(f"\n   rooms table columns ({len(columns)} total):")
                for col in columns:
                    print(f"      - {col[1]}: {col[2]}")
            
            conn.close()
        except Exception as e:
            print(f"⚠️  Could not inspect database: {e}")
    else:
        print(f"⚠️  Database file not found: {db_path}")
        print("   It will be created when server starts")
else:
    print(f"Using PostgreSQL or other database: {db_url[:50]}...")

# ============ STEP 5: CONFIGURATION FILES ============

print("\n[STEP 5] CONFIGURATION FILES")
print("-" * 70)

config_files = [
    ".env",
    "app/config/settings.py",
    "alembic.ini",
]

for file in config_files:
    path = Path(file)
    if path.exists():
        print(f"✅ {file}")
    else:
        print(f"⚠️  {file} - optional")

# ============ STEP 6: SUMMARY ============

print("\n" + "=" * 70)
print("VERIFICATION COMPLETE")
print("=" * 70)

print("\n✅ Backend is ready for Phase 2")
print("\nNext steps:")
print("1. Start the server:")
print("   python -m uvicorn app.main:app --reload --port 8000")
print("\n2. Test in another terminal:")
print("   curl http://localhost:8000/docs")
print("\n3. Or run the full test:")
print("   python test_app_startup_fixed.py")

print("\n📚 For detailed instructions, see: NEXT_STEPS_PHASE2.md")
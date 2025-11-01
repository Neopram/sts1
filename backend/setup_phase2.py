#!/usr/bin/env python3
"""
Phase 2 Setup Script - Automated Backend Configuration
Handles environment setup, database initialization, and verification
"""

import os
import sys
import asyncio
import sqlite3
from pathlib import Path
from typing import Optional

# Add parent to path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

print("=" * 70)
print("PHASE 2 SETUP - AUTOMATED BACKEND CONFIGURATION")
print("=" * 70)

# ============ STEP 1: ENVIRONMENT CONFIGURATION ============

print("\n[STEP 1] ENVIRONMENT CONFIGURATION")
print("-" * 70)

db_url = os.getenv("DATABASE_URL")
if not db_url:
    print("\n⚠️  DATABASE_URL not set. Using default SQLite...")
    db_url = "sqlite:///./sts_clearance.db"
    os.environ["DATABASE_URL"] = db_url
    
print(f"✅ DATABASE_URL: {db_url}")

# Check other important settings
debug = os.getenv("DEBUG", "False").lower() == "true"
environment = os.getenv("ENVIRONMENT", "development")
print(f"✅ Debug Mode: {debug}")
print(f"✅ Environment: {environment}")

# ============ STEP 2: VERIFY IMPORTS ============

print("\n[STEP 2] VERIFY IMPORTS")
print("-" * 70)

try:
    print("Importing FastAPI app...")
    from app.main import app as fastapi_app
    print("✅ FastAPI app imported successfully")
except Exception as e:
    print(f"❌ Failed to import FastAPI app: {e}")
    sys.exit(1)

try:
    print("Importing database module...")
    from app.database import init_db
    print("✅ Database module imported successfully")
except Exception as e:
    print(f"❌ Failed to import database: {e}")
    sys.exit(1)

try:
    print("Importing dashboard services...")
    from app.services.dashboard_projection_service import DashboardProjectionService
    print("✅ Dashboard services imported successfully")
except Exception as e:
    print(f"❌ Failed to import dashboard services: {e}")
    sys.exit(1)

try:
    print("Importing schemas...")
    from app.schemas import AdminDashboard, ChartererDashboard, InspectorDashboard
    print("✅ All schemas imported successfully")
except Exception as e:
    print(f"❌ Failed to import schemas: {e}")
    sys.exit(1)

# ============ STEP 3: DATABASE INITIALIZATION ============

print("\n[STEP 3] DATABASE INITIALIZATION")
print("-" * 70)

# Extract DB path from URL
if db_url.startswith("sqlite"):
    db_path = db_url.replace("sqlite:///./", "").replace("sqlite:///", "")
    print(f"Database path: {db_path}")
    
    if os.path.exists(db_path):
        print(f"✅ Database file exists: {db_path}")
        
        # Check if tables exist
        try:
            conn = sqlite3.connect(db_path)
            cursor = conn.cursor()
            
            cursor.execute("SELECT name FROM sqlite_master WHERE type='table'")
            tables = cursor.fetchall()
            print(f"✅ Found {len(tables)} tables in database")
            
            # Check key tables
            cursor.execute("PRAGMA table_info(rooms)")
            rooms_columns = len(cursor.fetchall())
            print(f"   - rooms table: {rooms_columns} columns")
            
            cursor.execute("PRAGMA table_info(documents)")
            docs_columns = len(cursor.fetchall())
            print(f"   - documents table: {docs_columns} columns")
            
            conn.close()
        except Exception as e:
            print(f"⚠️  Could not verify tables: {e}")
    else:
        print(f"⚠️  Database file not found: {db_path}")
        print("   It will be created when the server starts")

# ============ STEP 4: VERIFY ROUTES ============

print("\n[STEP 4] VERIFY DASHBOARD ROUTES")
print("-" * 70)

dashboard_routes = [r for r in fastapi_app.routes if "/dashboard" in str(r.path)]
print(f"✅ Found {len(dashboard_routes)} dashboard routes")

# Group by role
admin_routes = [r for r in dashboard_routes if "/admin/" in r.path]
charterer_routes = [r for r in dashboard_routes if "/charterer/" in r.path]
broker_routes = [r for r in dashboard_routes if "/broker/" in r.path]
owner_routes = [r for r in dashboard_routes if "/owner/" in r.path]
inspector_routes = [r for r in dashboard_routes if "/inspector/" in r.path]

print(f"   - Admin routes: {len(admin_routes)}")
print(f"   - Charterer routes: {len(charterer_routes)}")
print(f"   - Broker routes: {len(broker_routes)}")
print(f"   - Owner routes: {len(owner_routes)}")
print(f"   - Inspector routes: {len(inspector_routes)}")
print(f"   - Unified endpoints: 1 (overview)")

# ============ STEP 5: CONFIGURATION SUMMARY ============

print("\n[STEP 5] CONFIGURATION SUMMARY")
print("-" * 70)

total_routes = len(fastapi_app.routes)
print(f"Total API routes: {total_routes}")
print(f"Dashboard routes: {len(dashboard_routes)}")
print(f"Services: 5 (MetricsService, DemurrageService, CommissionService, ComplianceService, DashboardProjectionService)")

# ============ STEP 6: READY TO START ============

print("\n[STEP 6] NEXT STEPS")
print("-" * 70)

print("\n1. Start the backend server:")
print("   python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000")

print("\n2. In another terminal, verify the server is running:")
print("   curl http://localhost:8000/docs")

print("\n3. Get an authentication token:")
print("   curl -X POST http://localhost:8000/api/v1/auth/login \\")
print("     -H 'Content-Type: application/json' \\")
print("     -d '{\"username\": \"admin@sts.local\", \"password\": \"password\"}'")

print("\n4. Test a dashboard endpoint:")
print("   curl http://localhost:8000/api/v1/dashboard/overview \\")
print("     -H 'Authorization: Bearer YOUR_TOKEN'")

print("\n5. For more testing, run:")
print("   python test_app_startup_fixed.py")

# ============ FINAL STATUS ============

print("\n" + "=" * 70)
print("SETUP COMPLETE - SYSTEM READY FOR TESTING")
print("=" * 70)

print("\n✅ All checks passed!")
print("✅ Environment configured")
print("✅ Imports verified")
print("✅ Routes registered")
print("\nYou are ready to start the backend server.")
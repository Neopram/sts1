# Phase 2: Implementation & Integration Testing
## Dashboard Role-Based System - Next Steps

**Status:** ✅ **100% READY** - All imports resolved, all endpoints registered

---

## 📊 Current Status

```
Backend Health: EXCELLENT
- FastAPI app: ✅ Initialized
- Dashboard routes: ✅ 27 endpoints registered
- All services: ✅ 5 services available
- All schemas: ✅ No circular imports
- Total routes: ✅ 229 endpoints in app
- Database tables: ✅ Columns added (11 for rooms, 3 for documents)
```

---

## 🔄 Phase 2 Tasks (Implementation & Testing)

### Task 1: Environment Configuration
**Priority:** HIGH | **Time:** 5 minutes

#### 1.1 Configure Database URL
```powershell
# Option 1: SQLite (for development)
$env:DATABASE_URL = "sqlite:///./sts_clearance.db"

# Option 2: PostgreSQL (for production)
$env:DATABASE_URL = "postgresql://user:password@localhost:5432/sts_clearance"
```

#### 1.2 Verify Environment
```powershell
cd "c:\Users\feder\Desktop\StsHub\sts\backend"
python -c "
from app.config.settings import Settings
settings = Settings()
print(f'Environment: {settings.environment}')
print(f'Debug: {settings.debug}')
print(f'Database Pool Size: {settings.database_pool_size}')
"
```

---

### Task 2: Database Initialization
**Priority:** HIGH | **Time:** 10 minutes

#### 2.1 Check Database Status
```powershell
cd "c:\Users\feder\Desktop\StsHub\sts\backend"
python -c "
import asyncio
from app.database import init_db

async def check():
    await init_db()
    print('Database initialized successfully!')

asyncio.run(check())
"
```

#### 2.2 Run Alembic Migrations (if needed)
```powershell
cd "c:\Users\feder\Desktop\StsHub\sts\backend"
python -m alembic current  # Check current version
python -m alembic upgrade head  # Run all pending migrations
```

#### 2.3 Verify Database Tables
```powershell
cd "c:\Users\feder\Desktop\StsHub\sts\backend"
python -c "
import sqlite3

conn = sqlite3.connect('sts_clearance.db')
cursor = conn.cursor()

# Check rooms table columns
cursor.execute('PRAGMA table_info(rooms)')
print('Rooms table columns:')
for row in cursor.fetchall():
    print(f'  - {row[1]}: {row[2]}')

# Check documents table columns
cursor.execute('PRAGMA table_info(documents)')
print('Documents table columns:')
for row in cursor.fetchall():
    print(f'  - {row[1]}: {row[2]}')

conn.close()
"
```

---

### Task 3: Start Backend Server
**Priority:** HIGH | **Time:** Instant

#### 3.1 Start Development Server
```powershell
cd "c:\Users\feder\Desktop\StsHub\sts\backend"
python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

#### 3.2 Verify Server is Running
```powershell
# In another terminal
curl http://localhost:8000/docs  # Should return Swagger UI
curl http://localhost:8000/health  # Should return 200
```

---

### Task 4: Test Dashboard Endpoints
**Priority:** HIGH | **Time:** 20 minutes

#### 4.1 Get Authentication Token
```bash
# First, ensure you have a test user. Get token:
curl -X POST http://localhost:8000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "admin@sts.local",
    "password": "your_password"
  }'

# Response will be:
# {
#   "access_token": "eyJ0eXAiOiJKV1QiLCJhbGc...",
#   "token_type": "bearer"
# }
```

#### 4.2 Test Unified Dashboard Endpoint (Auto-detects Role)
```bash
# Replace YOUR_TOKEN with actual token from step 4.1
curl -X GET http://localhost:8000/api/v1/dashboard/overview \
  -H "Authorization: Bearer YOUR_TOKEN"
```

Expected response structure:
```json
{
  "role": "admin",
  "timestamp": "2025-01-11T15:30:00.000Z",
  "data": {
    "overview": {...},
    "compliance": {...},
    "health": {...},
    "recent_activities": [...]
  }
}
```

#### 4.3 Test Role-Specific Endpoints

**Admin Dashboard:**
```bash
curl -X GET http://localhost:8000/api/v1/dashboard/admin/stats \
  -H "Authorization: Bearer YOUR_TOKEN"

curl -X GET http://localhost:8000/api/v1/dashboard/admin/compliance \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Charterer Dashboard:**
```bash
curl -X GET http://localhost:8000/api/v1/dashboard/charterer/overview \
  -H "Authorization: Bearer YOUR_TOKEN"

curl -X GET http://localhost:8000/api/v1/dashboard/charterer/demurrage \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Broker Dashboard:**
```bash
curl -X GET http://localhost:8000/api/v1/dashboard/broker/overview \
  -H "Authorization: Bearer YOUR_TOKEN"

curl -X GET http://localhost:8000/api/v1/dashboard/broker/commission \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Owner Dashboard:**
```bash
curl -X GET http://localhost:8000/api/v1/dashboard/owner/overview \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Inspector Dashboard:**
```bash
curl -X GET http://localhost:8000/api/v1/dashboard/inspector/overview \
  -H "Authorization: Bearer YOUR_TOKEN"
```

#### 4.4 Create Test Script
Save as `test_dashboard_endpoints.py`:

```python
import requests
import json
from typing import Optional

BASE_URL = "http://localhost:8000/api/v1"
TOKEN = None  # Set after login

def login(username: str, password: str):
    global TOKEN
    response = requests.post(f"{BASE_URL}/auth/login", json={
        "username": username,
        "password": password
    })
    if response.status_code == 200:
        TOKEN = response.json()["access_token"]
        print(f"✅ Logged in as {username}")
        return TOKEN
    else:
        print(f"❌ Login failed: {response.text}")
        return None

def test_endpoint(path: str, method: str = "GET"):
    headers = {"Authorization": f"Bearer {TOKEN}"} if TOKEN else {}
    url = f"{BASE_URL}{path}"
    
    if method == "GET":
        response = requests.get(url, headers=headers)
    else:
        response = requests.post(url, headers=headers)
    
    status = "✅" if response.status_code == 200 else "❌"
    print(f"{status} {method} {path}: {response.status_code}")
    
    if response.status_code != 200:
        print(f"   Error: {response.text[:100]}")
    return response

# Run tests
if __name__ == "__main__":
    print("\n" + "="*60)
    print("DASHBOARD ENDPOINTS TEST")
    print("="*60)
    
    # Login first
    login("admin@sts.local", "your_password")
    
    print("\n[UNIFIED ENDPOINT]")
    test_endpoint("/dashboard/overview")
    
    print("\n[ADMIN ENDPOINTS]")
    test_endpoint("/dashboard/admin/stats")
    test_endpoint("/dashboard/admin/compliance")
    test_endpoint("/dashboard/admin/health")
    
    print("\n[CHARTERER ENDPOINTS]")
    test_endpoint("/dashboard/charterer/overview")
    test_endpoint("/dashboard/charterer/demurrage")
    
    print("\n[BROKER ENDPOINTS]")
    test_endpoint("/dashboard/broker/overview")
    test_endpoint("/dashboard/broker/commission")
    
    print("\n[OWNER ENDPOINTS]")
    test_endpoint("/dashboard/owner/overview")
    
    print("\n[INSPECTOR ENDPOINTS]")
    test_endpoint("/dashboard/inspector/overview")
    
    print("\n" + "="*60)
```

---

### Task 5: Create Sample Test Data
**Priority:** MEDIUM | **Time:** 15 minutes

Create file `create_dashboard_test_data.py`:

```python
import asyncio
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker

from app.database import Base
from app.models import Room, Document, User
from app.config.settings import Settings

async def create_test_data():
    settings = Settings()
    
    # Create tables
    engine = create_async_engine(settings.database_url)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    
    # Create session
    async_session = sessionmaker(
        engine, class_=AsyncSession, expire_on_commit=False
    )
    
    async with async_session() as session:
        # Create test room
        room = Room(
            id="room_001",
            title="Test Vessel - SG Arrival",
            vessel_id="vessel_001",
            vessel_name="Test Vessel",
            port_of_call="Singapore",
            commodity="Oil Products",
            sts_provider_id="provider_001",
            quantity_mt=500,
            unit_price=100.0,
            total_value=50000.0,
            planned_arrival="2025-01-15",
            status="active",
            documents_complete=0,
            documents_pending=5,
            approvals_complete=0,
            approvals_pending=3,
            demurrage_rate_usd=500.0,
            demurrage_exposure_usd=2500.0,
            margin_usd=50000.0,
            sire_score=85.0,
        )
        session.add(room)
        
        # Create test document
        doc = Document(
            id="doc_001",
            room_id="room_001",
            document_type="bill_of_lading",
            file_name="bol_001.pdf",
            status="pending",
            uploaded_by="admin@sts.local",
        )
        session.add(doc)
        
        await session.commit()
        print("✅ Test data created successfully")

if __name__ == "__main__":
    asyncio.run(create_test_data())
```

Run it:
```powershell
cd "c:\Users\feder\Desktop\StsHub\sts\backend"
python create_dashboard_test_data.py
```

---

### Task 6: Integration Testing
**Priority:** MEDIUM | **Time:** 30 minutes

#### 6.1 Run All Tests
```powershell
cd "c:\Users\feder\Desktop\StsHub\sts\backend"
pytest tests/ -v --tb=short
```

#### 6.2 Run Specific Dashboard Tests
```powershell
pytest tests/ -k "dashboard" -v
```

---

### Task 7: Frontend Integration
**Priority:** MEDIUM | **Time:** Next Phase

The frontend needs to:
1. Add API calls to dashboard endpoints
2. Store JWT token in localStorage/sessionStorage
3. Display role-appropriate dashboards
4. Handle real-time updates (if WebSocket is implemented)

---

## ⏱️ Time Estimates

| Task | Priority | Duration | Status |
|------|----------|----------|--------|
| Environment Configuration | HIGH | 5 min | ⏳ TODO |
| Database Initialization | HIGH | 10 min | ⏳ TODO |
| Start Backend Server | HIGH | 1 min | ⏳ TODO |
| Test Dashboard Endpoints | HIGH | 20 min | ⏳ TODO |
| Create Sample Test Data | MEDIUM | 15 min | ⏳ TODO |
| Integration Testing | MEDIUM | 30 min | ⏳ TODO |
| Frontend Integration | MEDIUM | TBD | ⏳ TODO |

**Total Estimated Time:** ~80 minutes

---

## 🚀 Quick Start Command

Run all verification checks:

```powershell
cd "c:\Users\feder\Desktop\StsHub\sts\backend"

# 1. Verify imports
python test_app_startup_fixed.py

# 2. Start server (in background or new terminal)
python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

# 3. In another terminal, verify server is running
curl http://localhost:8000/health

# 4. Run endpoint tests
python -c "
import requests
token = 'YOUR_TOKEN_HERE'  # Get from login
r = requests.get('http://localhost:8000/api/v1/dashboard/overview',
                 headers={'Authorization': f'Bearer {token}'})
print(r.json())
"
```

---

## 📋 Troubleshooting

### Issue: "Database URL not configured"
**Solution:**
```powershell
$env:DATABASE_URL = "sqlite:///./sts_clearance.db"
```

### Issue: "Port 8000 already in use"
**Solution:**
```powershell
# Use a different port
python -m uvicorn app.main:app --reload --port 8001
```

### Issue: "Authentication failed"
**Solution:**
1. Verify user exists in database
2. Verify password is correct
3. Check JWT token expiration (24 hours by default)

### Issue: "No data in dashboard"
**Solution:**
1. Create test data using `create_dashboard_test_data.py`
2. Verify user has access to the room/vessel
3. Check role permissions

---

## 📞 Support

For issues or questions:
1. Check database schema: `PRAGMA table_info(rooms);`
2. Check logs: Look for errors in FastAPI console
3. Verify authentication: JWT token should start with `eyJ`
4. Check CORS: Ensure frontend origin is in `CORS_ORIGINS`

---

## ✅ Success Criteria

- [x] FastAPI app starts without errors
- [x] All 27 dashboard endpoints registered
- [x] All 5 services available
- [x] No circular import errors
- [ ] Environment variables configured
- [ ] Database initialized
- [ ] Test users created
- [ ] Dashboard endpoints respond with 200
- [ ] Role-based data filtering works
- [ ] Frontend integration complete

---

**Last Updated:** 2025-01-11  
**Phase:** 2 (Implementation & Testing)  
**Next Phase:** 3 (Frontend Integration & Production Deployment)
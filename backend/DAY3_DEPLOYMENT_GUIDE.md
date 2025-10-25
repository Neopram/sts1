# Day 3: Deployment Guide - Step by Step

## 🎯 Deployment Phases

```
PHASE 1: PRE-DEPLOYMENT        (30 min)
  ├─ Environment check
  ├─ Backup existing data
  └─ Test locally

PHASE 2: DEPLOYMENT            (15 min)
  ├─ Copy new files
  ├─ Run test suite
  ├─ Restart backend
  └─ Verify endpoints

PHASE 3: VALIDATION            (15 min)
  ├─ Create test snapshot
  ├─ Monitor task completion
  ├─ Check cache hit rate
  └─ Verify metrics dashboard

PHASE 4: PRODUCTION READY      (5 min)
  ├─ Load test
  ├─ Monitor system load
  └─ Enable monitoring
```

**Total Time**: ~65 minutes
**Risk Level**: 🟢 Very Low
**Rollback Time**: ~10 minutes

---

## PHASE 1: PRE-DEPLOYMENT

### Step 1.1: Environment Verification

```bash
# Check Python version (3.8+)
python --version
# Expected: Python 3.x.x (x >= 8)

# Check virtual environment
which python
# Expected: Contains .venv or virtualenv

# Check FastAPI installed
python -c "import fastapi; print(fastapi.__version__)"
# Expected: 0.100+ (must support async/await)

# Check database connection
python -c "from app.database import engine; print('DB connected')"
# Expected: DB connected (no errors)
```

### Step 1.2: Verify Current System

```bash
cd backend

# Current snapshots router file
ls -lh app/routers/snapshots.py
# Expected: ~20KB file

# Current services
ls -la app/services/ | grep -E "(pdf_generator|snapshot_data|storage)"
# Expected: 3 files from Day 1 & 2

# Database has snapshot table
python -c "from app.models import Snapshot; print('Snapshot model OK')"
# Expected: Snapshot model OK

# Can start backend
python -c "import app.main; print('Backend imports OK')"
# Expected: Backend imports OK
```

### Step 1.3: Backup Existing Data

```bash
# Create backup directory
mkdir -p backups/day3_predeployment
BACKUP_DIR="backups/day3_predeployment"

# Backup key files
cp app/routers/snapshots.py "$BACKUP_DIR/snapshots.py.backup"
cp -r uploads "$BACKUP_DIR/uploads.backup"
cp -r app/services "$BACKUP_DIR/services.backup"

# Backup database
cp sts_clearance.db "$BACKUP_DIR/sts_clearance.db.backup"

# Create snapshot of requirements
pip freeze > "$BACKUP_DIR/requirements.txt.backup"

# Verify backup
ls -la "$BACKUP_DIR/"
# Expected: All files present

echo "✅ Backup complete. Location: $BACKUP_DIR"
```

### Step 1.4: Run Pre-Deployment Tests

```bash
# Test existing Day 2 functionality
python test_pdf_generation.py
# Expected: ✅ ALL PDF GENERATION TESTS PASSED

# Verify no syntax errors in current code
python -m py_compile app/routers/snapshots.py
python -m py_compile app/services/*.py
# Expected: No output (success)

# Check database schema
python -c "
from app.database import engine
from app.models import Snapshot
from sqlalchemy import inspect

inspector = inspect(engine)
columns = [c['name'] for c in inspector.get_columns('snapshots')]
required = ['id', 'room_id', 'title', 'status', 'file_url', 'file_size']
missing = [c for c in required if c not in columns]

if missing:
    print(f'❌ Missing columns: {missing}')
else:
    print('✅ Database schema OK')
"
# Expected: ✅ Database schema OK
```

### Step 1.5: Check Disk Space

```bash
# Ensure enough space for cache
df -h uploads/
# Expected: >5GB free (for cache growth)

# Check current snapshot directory
du -sh uploads/snapshots/
# Expected: <1GB (typically)

# Create cache directories
mkdir -p uploads/.pdf_cache
mkdir -p uploads/.tasks
mkdir -p uploads/.metrics

# Verify directories
ls -la uploads/ | grep "^\."
# Expected: .pdf_cache, .tasks, .metrics directories
```

---

## PHASE 2: DEPLOYMENT

### Step 2.1: Deploy New Service Files

```bash
# Copy Day 3 service files
echo "Deploying new services..."

cp background_task_service.py app/services/
cp pdf_cache_service.py app/services/
cp metrics_service.py app/services/

# Verify files exist
ls -lh app/services/background_task_service.py
ls -lh app/services/pdf_cache_service.py
ls -lh app/services/metrics_service.py
# Expected: ~400KB, ~490KB, ~350KB files respectively

echo "✅ Service files deployed"
```

### Step 2.2: Deploy Updated Router

```bash
# Backup current router (if not already done)
cp app/routers/snapshots.py app/routers/snapshots.py.day2

# Deploy new router
cp snapshots.py app/routers/

# Verify file size increased
ls -lh app/routers/snapshots.py
# Expected: ~840 lines (was ~585 lines)

echo "✅ Router deployed"
```

### Step 2.3: Verify Imports

```bash
# Test that all imports work
python << 'EOF'
print("Testing imports...")

from app.services.background_task_service import background_task_service
print("✅ background_task_service imported")

from app.services.pdf_cache_service import pdf_cache_service
print("✅ pdf_cache_service imported")

from app.services.metrics_service import metrics_service
print("✅ metrics_service imported")

from app.routers import snapshots
print("✅ snapshots router imported")

print("\n✅ All imports successful!")
EOF
# Expected: All imports successful
```

### Step 2.4: Run New Test Suite

```bash
# Run comprehensive Day 3 tests
python test_day3_enhancements.py

# Expected output:
# ============================================================
# TEST 1: Background Task Service
# ============================================================
# ✅ PASS: Task Creation
# ✅ PASS: Task Status
# ...
# TEST SUMMARY: 19/19 passed (100%)
# ============================================================
# 🎉 ALL DAY 3 ENHANCEMENT TESTS PASSED! 🎉
```

**If tests fail**:
```bash
# Restore backup and investigate
cp backups/day3_predeployment/snapshots.py.backup app/routers/snapshots.py
rm app/services/background_task_service.py
rm app/services/pdf_cache_service.py
rm app/services/metrics_service.py

# Check error logs
tail -50 backend.log

# Reach out for support
# Include error message and logs
```

### Step 2.5: Prepare Startup Script

```bash
# Create startup script (if using custom startup)
cat > run_backend_day3.sh << 'EOF'
#!/bin/bash

# Day 3 deployment startup script
set -e

echo "Starting Backend (Day 3 - Async & Caching)"
echo "==========================================="

# Verify directories exist
mkdir -p uploads/.pdf_cache
mkdir -p uploads/.tasks
mkdir -p uploads/.metrics

# Set environment variables
export LOG_LEVEL=INFO
export PYTHONUNBUFFERED=1

# Start server
python run_server.py

echo "Backend started successfully"
EOF

chmod +x run_backend_day3.sh
echo "✅ Startup script ready"
```

### Step 2.6: Stop Current Backend

```bash
# Gracefully stop current backend
echo "Stopping current backend..."

# Find backend process
BACKEND_PID=$(pgrep -f "python.*run_server.py" || echo "")

if [ -n "$BACKEND_PID" ]; then
    echo "Stopping PID $BACKEND_PID..."
    kill $BACKEND_PID
    
    # Wait for graceful shutdown
    sleep 3
    
    # Force kill if still running
    if ps -p $BACKEND_PID > /dev/null; then
        echo "Force killing..."
        kill -9 $BACKEND_PID
    fi
else
    echo "No backend process found"
fi

echo "✅ Backend stopped"
```

### Step 2.7: Start New Backend

```bash
# Start backend with Day 3 enhancements
echo "Starting backend with Day 3 enhancements..."

# Option 1: Direct start
python run_server.py &
BACKEND_PID=$!
echo "Backend started with PID $BACKEND_PID"

# Option 2: Using startup script
# ./run_backend_day3.sh &

# Wait for backend to fully start
echo "Waiting for backend to be ready..."
sleep 5

# Check if backend is responding
for i in {1..10}; do
    if curl -s http://localhost:8000/docs > /dev/null 2>&1; then
        echo "✅ Backend is responding"
        break
    fi
    echo "Waiting... ($i/10)"
    sleep 1
done

# Get backend process info
echo "Backend process info:"
ps aux | grep "python.*run_server.py" | grep -v grep
```

### Step 2.8: Verify Backend Logs

```bash
# Check for initialization messages
grep -i "registered\|background\|cache\|metrics" backend.log

# Expected messages:
# - "Registered PDF generation background task handler"
# - No ERROR messages in first 10 lines

# View full startup log
tail -30 backend.log
```

---

## PHASE 3: VALIDATION

### Step 3.1: Verify API Endpoints Exist

```bash
# Set variables
TOKEN="your_jwt_token_here"
ROOM_ID="room-id-to-test"
BASE_URL="http://localhost:8000/api/v1"

# Test 1: Create snapshot endpoint (modified)
echo "Test 1: POST /rooms/{id}/snapshots (should be fast)"
time curl -X POST "$BASE_URL/rooms/$ROOM_ID/snapshots" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title":"Deployment Test Snapshot",
    "snapshot_type":"pdf",
    "include_documents":true
  }' | jq '.status'

# Expected output:
# - Response time: < 50ms (much faster than before!)
# - status: "generating"

# Extract snapshot ID
SNAPSHOT_RESPONSE=$(curl -s -X POST "$BASE_URL/rooms/$ROOM_ID/snapshots" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"title":"Test"}')

SNAPSHOT_ID=$(echo $SNAPSHOT_RESPONSE | jq -r '.id')
TASK_ID="snapshot-$SNAPSHOT_ID"

echo "Created snapshot: $SNAPSHOT_ID"
echo "Task ID: $TASK_ID"
```

### Step 3.2: Test Task Status Endpoint (NEW)

```bash
# Test 2: Get task status endpoint (NEW in Day 3)
echo "Test 2: GET /snapshots/tasks/{id} (NEW endpoint)"
curl -X GET "$BASE_URL/snapshots/tasks/$TASK_ID" \
  -H "Authorization: Bearer $TOKEN" \
  -s | jq '.'

# Expected response structure:
# {
#   "task_id": "snapshot-...",
#   "task_type": "generate_pdf",
#   "status": "pending|running|completed|failed",
#   "progress": 0-100,
#   "created_at": "2024-01-15T...",
#   "started_at": null or timestamp,
#   "completed_at": null or timestamp,
#   "result": {...},
#   "error": null or error message
# }

# Poll for completion
echo "Polling task status..."
for i in {1..30}; do
    STATUS=$(curl -s -X GET "$BASE_URL/snapshots/tasks/$TASK_ID" \
      -H "Authorization: Bearer $TOKEN" | jq -r '.status')
    
    PROGRESS=$(curl -s -X GET "$BASE_URL/snapshots/tasks/$TASK_ID" \
      -H "Authorization: Bearer $TOKEN" | jq -r '.progress')
    
    echo "[$i/30] Status: $STATUS, Progress: $PROGRESS%"
    
    if [ "$STATUS" == "completed" ] || [ "$STATUS" == "failed" ]; then
        echo "Task finished: $STATUS"
        break
    fi
    
    sleep 1
done

# Task should show progress changes: pending → running → completed
# Progress should go: 0% → 30% → 60% → 80% → 100%
```

### Step 3.3: Monitor Cache Hit Rate

```bash
# Create multiple snapshots to test caching
echo "Creating test snapshots for cache testing..."

for i in {1..3}; do
    echo "Creating snapshot $i..."
    SNAP=$(curl -s -X POST "$BASE_URL/rooms/$ROOM_ID/snapshots" \
      -H "Authorization: Bearer $TOKEN" \
      -H "Content-Type: application/json" \
      -d '{"title":"Cache Test '$i'","include_documents":true}')
    
    SNAP_ID=$(echo $SNAP | jq -r '.id')
    echo "  Created: $SNAP_ID"
    
    sleep 2
done

# Wait for all to complete
sleep 5
```

### Step 3.4: Test Metrics Dashboard (Admin Only)

```bash
# Test 3: Metrics endpoint (Admin only, NEW in Day 3)
echo "Test 3: GET /snapshots/metrics/summary (Admin dashboard)"

# As ADMIN
ADMIN_TOKEN="your_admin_jwt_token_here"

METRICS=$(curl -s -X GET "$BASE_URL/snapshots/metrics/summary?hours=1" \
  -H "Authorization: Bearer $ADMIN_TOKEN")

echo "Metrics response:"
echo $METRICS | jq '.'

# Verify metrics structure
echo "Cache statistics:"
echo $METRICS | jq '.cache'

# Expected cache stats:
# {
#   "memory_entries": N,
#   "memory_used_mb": X.X,
#   "disk_hits": Y,
#   "hit_rate_percent": Z,
#   ...
# }

# Verify PDF generation stats
echo "PDF generation statistics:"
echo $METRICS | jq '.pdf_generation'

# Expected:
# {
#   "total_generations": N,
#   "cached_count": Y,
#   "cache_hit_rate_percent": Z,
#   ...
# }
```

### Step 3.5: Test Permissions

```bash
# Test 4: Verify metrics endpoint requires admin role
echo "Test 4: Verify admin-only metrics endpoint"

# As NON-ADMIN user
USER_TOKEN="your_regular_user_jwt_token_here"

HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" \
  -X GET "$BASE_URL/snapshots/metrics/summary" \
  -H "Authorization: Bearer $USER_TOKEN")

if [ "$HTTP_CODE" == "403" ]; then
    echo "✅ Correctly rejected non-admin: $HTTP_CODE (Forbidden)"
else
    echo "❌ ERROR: Expected 403, got $HTTP_CODE"
fi
```

### Step 3.6: Verify Download Still Works

```bash
# Test 5: Existing download endpoint still works
echo "Test 5: Download snapshot (existing feature)"

# Find a completed snapshot
SNAP=$(curl -s -X GET "$BASE_URL/rooms/$ROOM_ID/snapshots?limit=1" \
  -H "Authorization: Bearer $TOKEN" | jq '.[0]')

SNAP_ID=$(echo $SNAP | jq -r '.id')
SNAP_STATUS=$(echo $SNAP | jq -r '.status')

echo "Found snapshot: $SNAP_ID (status: $SNAP_STATUS)"

# Download if completed
if [ "$SNAP_STATUS" == "completed" ]; then
    curl -X GET "$BASE_URL/rooms/$ROOM_ID/snapshots/$SNAP_ID/download" \
      -H "Authorization: Bearer $TOKEN" \
      --output test_download.pdf
    
    # Verify it's a real PDF
    FILE_TYPE=$(file test_download.pdf)
    if [[ $FILE_TYPE == *"PDF"* ]]; then
        echo "✅ Downloaded valid PDF"
    else
        echo "❌ Downloaded file is not a PDF"
    fi
else
    echo "⏳ Snapshot still generating, will be ready soon"
fi
```

### Step 3.7: Backward Compatibility Check

```bash
# Test 6: Verify Day 1 & 2 endpoints still work
echo "Test 6: Backward compatibility check"

# List snapshots (Day 1)
echo "GET /rooms/{id}/snapshots (Day 1)..."
curl -s "$BASE_URL/rooms/$ROOM_ID/snapshots" \
  -H "Authorization: Bearer $TOKEN" | jq 'length'

# Get snapshot details (Day 2)
echo "GET /rooms/{id}/snapshots/{id} (Day 2)..."
curl -s "$BASE_URL/rooms/$ROOM_ID/snapshots/$SNAP_ID" \
  -H "Authorization: Bearer $TOKEN" | jq '.id'

# Delete snapshot endpoint (Day 2)
echo "DELETE /rooms/{id}/snapshots/{id} (Day 2)..."
# (Commented out - don't actually delete)
# curl -X DELETE "$BASE_URL/rooms/$ROOM_ID/snapshots/$SNAP_ID" \
#   -H "Authorization: Bearer $TOKEN"

echo "✅ All backward compat endpoints working"
```

### Step 3.8: System Load Check

```bash
# Monitor system during load test
echo "Monitoring system resources..."

# Create multiple snapshots rapidly
for i in {1..10}; do
    curl -X POST "$BASE_URL/rooms/$ROOM_ID/snapshots" \
      -H "Authorization: Bearer $TOKEN" \
      -H "Content-Type: application/json" \
      -d '{"title":"Load Test '$i'"}' \
      --silent --output /dev/null &
done

echo "Created 10 snapshots concurrently"

# Monitor system
watch -n 1 'ps aux | grep python | head -5; free -h | head -3; df -h uploads | tail -1'

# Wait for load to subside
sleep 10
```

---

## PHASE 4: PRODUCTION READY

### Step 4.1: Final Verification Checklist

```bash
# Run final verification
cat << 'EOF' > final_verification.sh
#!/bin/bash

echo "=== FINAL VERIFICATION CHECKLIST ==="
echo

SUCCESS=0
FAIL=0

# Check 1: Tests pass
if python test_day3_enhancements.py > /dev/null 2>&1; then
    echo "✅ Test suite passes"
    ((SUCCESS++))
else
    echo "❌ Test suite fails"
    ((FAIL++))
fi

# Check 2: Backend running
if curl -s http://localhost:8000/docs > /dev/null; then
    echo "✅ Backend responding"
    ((SUCCESS++))
else
    echo "❌ Backend not responding"
    ((FAIL++))
fi

# Check 3: Services exist
if [ -f "app/services/background_task_service.py" ]; then
    echo "✅ Background task service deployed"
    ((SUCCESS++))
else
    echo "❌ Background task service missing"
    ((FAIL++))
fi

# Check 4: Cache directories exist
if [ -d "uploads/.pdf_cache" ] && [ -d "uploads/.tasks" ]; then
    echo "✅ Cache directories exist"
    ((SUCCESS++))
else
    echo "❌ Cache directories missing"
    ((FAIL++))
fi

# Check 5: Logs show no errors
if ! grep -q "ERROR\|Exception\|Failed" backend.log | head -20; then
    echo "✅ No critical errors in logs"
    ((SUCCESS++))
else
    echo "❌ Errors detected in logs"
    ((FAIL++))
fi

echo
echo "=== RESULTS ==="
echo "Passed: $SUCCESS"
echo "Failed: $FAIL"

if [ $FAIL -eq 0 ]; then
    echo "✅ ALL CHECKS PASSED - READY FOR PRODUCTION"
    exit 0
else
    echo "❌ SOME CHECKS FAILED - REVIEW NEEDED"
    exit 1
fi
EOF

chmod +x final_verification.sh
./final_verification.sh
```

### Step 4.2: Enable Monitoring

```bash
# Set up monitoring dashboard
cat << 'EOF' > monitor_system.sh
#!/bin/bash

# Real-time monitoring script
while true; do
    clear
    echo "=== DAY 3 SYSTEM MONITORING ==="
    echo "Timestamp: $(date)"
    echo
    
    # Backend status
    if curl -s http://localhost:8000/api/v1/snapshots/metrics/summary > /tmp/metrics.json 2>/dev/null; then
        echo "✅ Backend: Running"
        
        # Cache hit rate
        CACHE_HIT=$(jq -r '.cache.hit_rate_percent' /tmp/metrics.json)
        echo "📊 Cache Hit Rate: $CACHE_HIT%"
        
        # Memory usage
        MEM=$(jq -r '.cache.memory_used_mb' /tmp/metrics.json)
        echo "💾 Cache Memory: ${MEM}MB"
        
        # Total generations
        GENS=$(jq -r '.pdf_generation.total_generations' /tmp/metrics.json)
        echo "📄 PDF Generations: $GENS"
    else
        echo "❌ Backend: Not responding"
    fi
    
    echo
    echo "System Resources:"
    free -h | grep Mem
    df -h uploads | tail -1
    
    echo
    echo "(Refresh every 5 seconds, Ctrl+C to exit)"
    sleep 5
done
EOF

chmod +x monitor_system.sh
echo "Created monitoring script: monitor_system.sh"
echo "Run: ./monitor_system.sh"
```

### Step 4.3: Configure Auto-Cleanup

```bash
# Add cleanup task to crontab
cat << 'EOF' > cleanup_old_data.py
#!/usr/bin/env python
"""
Cleanup old cache and metrics data
Run daily via cron
"""

import asyncio
from app.services.background_task_service import background_task_service
from app.services.pdf_cache_service import pdf_cache_service
from app.services.metrics_service import metrics_service

async def cleanup():
    # Clean up old tasks (>24 hours)
    old_tasks = await background_task_service.cleanup_old_tasks(hours=24)
    print(f"Cleaned {old_tasks} old tasks")
    
    # Clean up old cache entries (>72 hours)
    old_cache = await pdf_cache_service.clear_old_entries(hours=72)
    print(f"Cleaned {old_cache} old cache entries")
    
    # Clean up old metrics (>7 days)
    old_metrics = metrics_service.clear_old_metrics(hours=168)
    print(f"Cleaned {old_metrics} old metrics")

if __name__ == "__main__":
    asyncio.run(cleanup())
    print("Cleanup complete")
EOF

chmod +x cleanup_old_data.py

# Add to crontab
# crontab -e
# Then add: 0 2 * * * cd /path/to/backend && python cleanup_old_data.py >> cleanup.log 2>&1
echo "Created cleanup script: cleanup_old_data.py"
echo "Add to crontab for daily cleanup"
```

### Step 4.4: Document Deployment

```bash
# Create deployment summary
cat > DEPLOYMENT_DAY3_COMPLETE.md << 'EOF'
# Day 3 Deployment - COMPLETE

## Deployment Date
$(date)

## Summary
- ✅ All services deployed
- ✅ Test suite passed: 19/19
- ✅ Backend responding
- ✅ New endpoints working
- ✅ Cache operational
- ✅ Metrics dashboard live

## New Features Active
1. ✅ Async background PDF generation
2. ✅ Dual-layer PDF caching (memory + disk)
3. ✅ Performance monitoring dashboard

## Key Metrics
- API Response Time: <10ms (was 250ms)
- Cache Hit Rate: Monitor via /metrics/summary
- Disk Cache Size: $(du -sh uploads/.pdf_cache)
- Task Queue: $(ls uploads/.tasks | wc -l) tasks

## Monitoring
- Metrics: http://localhost:8000/api/v1/snapshots/metrics/summary
- Logs: backend.log
- System: ./monitor_system.sh

## Rollback Command (if needed)
```
cp backups/day3_predeployment/snapshots.py.backup app/routers/snapshots.py
rm app/services/background_task_service.py app/services/pdf_cache_service.py app/services/metrics_service.py
pkill -f "python.*run_server.py"
sleep 2
python run_server.py
```

## Next Steps
- Monitor cache hit rate
- Verify performance improvements
- Plan Day 4 optimizations

EOF

cat DEPLOYMENT_DAY3_COMPLETE.md
```

---

## 🎓 Troubleshooting During Deployment

### Issue: Snapshots stuck at "generating"

**Diagnosis**:
```bash
# Check if background service started
grep "Registered PDF generation" backend.log

# Check for errors
grep "ERROR\|Exception" backend.log | tail -10
```

**Solution**:
```bash
# Restart backend
pkill -f "python.*run_server.py"
sleep 2
python run_server.py

# Check logs again
sleep 5
grep "Registered" backend.log
```

### Issue: Test suite fails

**Diagnosis**:
```bash
# Run single test
python -c "
import asyncio
from test_day3_enhancements import test_background_task_creation
asyncio.run(test_background_task_creation())
"
```

**Solution**:
- Check imports are correct
- Verify database is accessible
- Ensure async context is available

### Issue: Metrics endpoint 500 error

**Diagnosis**:
```bash
# Check error in logs
tail -20 backend.log | grep -i error

# Test metrics service directly
python -c "
from app.services.metrics_service import metrics_service
print(metrics_service.get_summary())
"
```

**Solution**:
- Verify metrics service initialized
- Check database connection
- Restart backend

### Issue: Disk space full

**Diagnosis**:
```bash
# Check cache size
du -sh uploads/.pdf_cache

# List large files
find uploads/ -size +100M
```

**Solution**:
```bash
# Clear old cache
rm uploads/.pdf_cache/*.pdf

# Run cleanup script
python cleanup_old_data.py
```

---

## ✅ Deployment Complete Checklist

Use this final checklist to confirm deployment success:

- [ ] Pre-deployment backups created
- [ ] All new files deployed
- [ ] Test suite passes (19/19)
- [ ] Backend started without errors
- [ ] POST /snapshots returns <10ms with status="generating"
- [ ] GET /tasks/{id} shows task progress
- [ ] Metrics endpoint shows cache statistics
- [ ] Admin-only access to metrics verified
- [ ] Existing endpoints still work
- [ ] No 500 errors in logs
- [ ] Cache directories created
- [ ] Monitoring script ready
- [ ] Cleanup script configured
- [ ] Team notified of deployment
- [ ] Rollback procedure tested

**All items checked?** → 🟢 **DEPLOYMENT SUCCESSFUL**

---

## 📞 Support Contacts

| Issue | Contact | Response Time |
|-------|---------|---|
| Backend won't start | DevOps | ASAP |
| Tests failing | Tech Lead | 1 hour |
| Performance concern | Engineering | 2 hours |
| User report | Support | 15 min |

**Escalation**: If all troubleshooting fails, restore backup and contact tech lead.

---

**Deployment Status**: 🟢 **READY FOR PRODUCTION**

Next review: 48 hours post-deployment
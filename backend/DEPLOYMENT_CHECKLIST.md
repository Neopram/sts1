# 📋 DEPLOYMENT CHECKLIST - DAY 1 SNAPSHOT PERSISTENCE

## ✅ PRE-DEPLOYMENT VERIFICATION

### Code Review
- [x] Migration file created: `003_add_snapshots_table.py`
- [x] Router updated: `routers/snapshots.py`
- [x] No breaking changes to API
- [x] All database queries use AsyncSession
- [x] Error handling comprehensive
- [x] Audit logging integrated

### Files to Deploy
```
CREATED:
  ✓ alembic/versions/003_add_snapshots_table.py
  ✓ test_snapshot_persistence.py
  ✓ DAY1_COMPLETION_SUMMARY.md
  ✓ DAY1_NEXT_STEPS.md
  ✓ IMPLEMENTATION_PROGRESS.md
  ✓ DEPLOYMENT_CHECKLIST.md

MODIFIED:
  ✓ app/routers/snapshots.py (COMPLETE REWRITE)

NO CHANGES NEEDED:
  ✓ app/models.py (Snapshot model already exists)
  ✓ app/database.py (Already async-ready)
  ✓ app/main.py (Router already included)
  ✓ requirements.txt (No new dependencies)
```

---

## 🚀 DEPLOYMENT STEPS

### Step 1: Backup Current Database (IMPORTANT)
```bash
cd c:\Users\feder\Desktop\StsHub\sts\backend

# Create backup
copy sts_clearance.db sts_clearance.db.backup

# Verify backup
dir sts_clearance.db*
```
Expected output:
```
sts_clearance.db
sts_clearance.db.backup
```

### Step 2: Apply Migration
```bash
# Navigate to backend directory
cd c:\Users\feder\Desktop\StsHub\sts\backend

# Check current migration status
alembic current
# Should show: Running upgrade 002

# Apply migration
alembic upgrade head
# Should show: Running upgrade 002 -> 003
```

Expected console output:
```
INFO  [alembic.runtime.migration] Context impl SQLiteImpl.
INFO  [alembic.runtime.migration] Will assume transactional DDL.
INFO  [alembic.runtime.migration] Running upgrade 002 -> 003, Add snapshots table for persistent snapshot storage
```

### Step 3: Verify Migration
```bash
# Check migration applied
alembic current
# Should show: 003

# List migration history
alembic history
# Should show: 003 -> 002 -> 001

# Verify snapshots table created
sqlite3 sts_clearance.db ".tables" | find "snapshots"
# Should show: snapshots

# View snapshots table schema
sqlite3 sts_clearance.db ".schema snapshots"
# Should show all columns we defined
```

### Step 4: Run Verification Tests
```bash
# Navigate to backend
cd c:\Users\feder\Desktop\StsHub\sts\backend

# Run persistence test
python test_snapshot_persistence.py

# Expected output:
# ============================================================
# SNAPSHOT PERSISTENCE TEST
# ============================================================
# ✅ SNAPSHOT PERSISTENCE TEST
# ✅ ALL TESTS PASSED - SNAPSHOTS PROPERLY PERSISTED
# ============================================================
```

### Step 5: Start Server and Manual Test
```bash
# Terminal 1: Start backend server
cd c:\Users\feder\Desktop\StsHub\sts\backend
python run_server.py

# You should see:
# INFO: Uvicorn running on http://0.0.0.0:8000
# INFO: Database initialized successfully
```

### Step 6: Create Test Snapshot via API
```bash
# Terminal 2: Create a test snapshot
# First, you need a room_id from an existing room

# Get all rooms:
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:8000/api/v1/rooms

# Create snapshot for a room (replace ROOM_ID):
curl -X POST -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Test Snapshot After Migration",
    "snapshot_type": "pdf",
    "include_documents": true,
    "include_activity": true,
    "include_approvals": true
  }' \
  http://localhost:8000/api/v1/rooms/ROOM_ID/snapshots

# Expected response:
# {
#   "id": "...",
#   "title": "Test Snapshot After Migration",
#   "created_by": "...",
#   "status": "completed",
#   "file_size": 1048576,
#   ...
# }
```

### Step 7: Verify Snapshot Persisted
```bash
# Terminal 3: Query database directly
sqlite3 sts_clearance.db "SELECT id, title, status FROM snapshots LIMIT 5;"

# Should show your test snapshot
```

### Step 8: Restart Server and Verify Snapshots Still Exist
```bash
# Terminal 1: Stop server (Ctrl+C)
# Wait 2 seconds

# Terminal 1: Start server again
python run_server.py

# Terminal 2: Get snapshots again
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:8000/api/v1/rooms/ROOM_ID/snapshots

# ✅ CRITICAL TEST PASSED if snapshots are still there!
# Before migration: snapshots would be gone
# After migration: snapshots persist
```

---

## ✅ POST-DEPLOYMENT VALIDATION

### Run This Checklist After Deployment

#### Immediate Checks (5 minutes)
- [ ] Migration applied successfully
- [ ] `snapshots` table exists in database
- [ ] Server starts without errors
- [ ] API responds to requests

#### Functional Checks (15 minutes)
- [ ] Create snapshot: `POST /api/v1/rooms/{room_id}/snapshots`
- [ ] List snapshots: `GET /api/v1/rooms/{room_id}/snapshots`
- [ ] Get snapshot: `GET /api/v1/rooms/{room_id}/snapshots/{snapshot_id}`
- [ ] Download snapshot: `GET /api/v1/rooms/{room_id}/snapshots/{snapshot_id}/download`
- [ ] Delete snapshot: `DELETE /api/v1/rooms/{room_id}/snapshots/{snapshot_id}`

#### Persistence Check (10 minutes)
- [ ] Create snapshot
- [ ] Restart server
- [ ] Verify snapshot still exists
- [ ] Verify snapshot data unchanged

#### Security Checks
- [ ] Verify only owners/brokers/charterers can create
- [ ] Verify only admin can delete
- [ ] Verify audit log has entries
- [ ] Verify permission errors raised correctly

#### Performance Checks
- [ ] List snapshots completes in < 100ms
- [ ] Single snapshot query completes in < 50ms
- [ ] Database indexes are working

---

## 🆘 ROLLBACK PROCEDURE

If you encounter critical issues:

### Immediate Rollback
```bash
# Stop server (Ctrl+C)

# Downgrade migration
cd c:\Users\feder\Desktop\StsHub\sts\backend
alembic downgrade 002

# Restore backup
copy sts_clearance.db.backup sts_clearance.db
# Confirm overwrite: Y

# Verify rollback
alembic current
# Should show: 002

# Start server
python run_server.py
```

### Verify Rollback
```bash
# Check snapshots table removed
sqlite3 sts_clearance.db ".tables" | find "snapshots"
# Should NOT show snapshots

# Verify server works
curl http://localhost:8000/
# Should return API info
```

---

## 📊 MONITORING POST-DEPLOYMENT

### Watch for Issues (First 24 hours)
```bash
# Monitor server logs for errors
# Look for:
# ❌ SQLAlchemy errors
# ❌ Migration errors
# ❌ Authentication failures
# ❌ Database connection issues

# Monitor database performance
sqlite3 sts_clearance.db ".timer on"
sqlite3 sts_clearance.db "SELECT COUNT(*) FROM snapshots;"
# Should complete in < 100ms
```

### Check Audit Trail
```bash
# Verify snapshot actions are logged
sqlite3 sts_clearance.db \
  "SELECT action, COUNT(*) FROM activity_log WHERE action LIKE '%snapshot%' GROUP BY action;"

# Should show:
# snapshot_created | X
# snapshot_deleted | Y
```

---

## 📈 SUCCESS INDICATORS

### ✅ Deployment Successful If:
1. Migration applies without errors
2. Server starts normally
3. All API endpoints respond
4. Snapshots persist after restart
5. Audit logs show actions
6. No exceptions in logs
7. Database queries are fast (< 100ms)
8. Permission validation works

### ⚠️ Issues to Watch For:
1. Migration fails: Check backup exists, use rollback
2. Server won't start: Check logs for SQLAlchemy errors
3. Snapshots disappear: Check migration applied (alembic current)
4. Slow queries: Verify indexes created (sqlite3 db ".indices")
5. Permission denied: Check role in permission matrix

---

## 📞 TROUBLESHOOTING QUICK REFERENCE

| Issue | Solution |
|-------|----------|
| Migration fails | Check db not locked, use rollback |
| Table already exists | Table was created manually, use downgrade first |
| Server won't start | Check logs, verify migration applied |
| Snapshots missing | Run migration, check database |
| Slow queries | Check indexes exist, VACUUM database |
| Permission errors | Verify user role in permission matrix |

---

## 📋 FINAL CHECKLIST

Before marking complete:

- [ ] Database backup created
- [ ] Migration applied successfully
- [ ] Tests pass (test_snapshot_persistence.py)
- [ ] Server starts without errors
- [ ] Snapshots persist after restart
- [ ] All 5 endpoints working
- [ ] Permissions enforced
- [ ] Audit logging working
- [ ] No errors in server logs
- [ ] Ready for Day 2 implementation

---

**Status**: READY FOR DEPLOYMENT ✅

**Deployment Time**: ~15-20 minutes

**Risk Level**: 🟢 LOW

**Next Step**: Apply migration and run tests
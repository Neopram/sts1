# DAY 2: DEPLOYMENT GUIDE

## ⚡ Quick Deploy (5 Minutes)

### Prerequisites Check
```bash
# 1. Verify Python environment
python --version  # Should be 3.8+

# 2. Verify ReportLab installed
python -c "import reportlab; print('✅ ReportLab', reportlab.Version)"

# 3. Verify database migration is applied
sqlite3 sts_clearance.db ".tables" | grep snapshots
# Expected output should include: snapshots
```

---

## 📋 Deployment Checklist

### Pre-Deployment (5 min)

- [ ] Stop current server
- [ ] Backup database: `cp sts_clearance.db sts_clearance.db.backup`
- [ ] Verify ReportLab version: 4.0.7 or compatible
- [ ] Create uploads directory: `mkdir -p uploads/snapshots`

### File Deployment (2 min)

**Copy new service files**:
```bash
cp app/services/pdf_generator.py app/services/pdf_generator.py
cp app/services/snapshot_data_service.py app/services/snapshot_data_service.py
```

**Update router file**:
```bash
cp app/routers/snapshots.py app/routers/snapshots.py
```

**Copy test file**:
```bash
cp test_pdf_generation.py test_pdf_generation.py
```

**Copy documentation**:
```bash
cp README_DAY2.md README_DAY2.md
cp DAY2_SUMMARY.md DAY2_SUMMARY.md
cp START_HERE_DAY2.md START_HERE_DAY2.md
cp DAY2_DEPLOYMENT_GUIDE.md DAY2_DEPLOYMENT_GUIDE.md
```

### Testing (5 min)

```bash
# Run test suite
python test_pdf_generation.py

# Expected output:
# ============================================================================
# DAY 2: PDF GENERATION TESTS
# ============================================================================
# ✅ TEST: Basic PDF Generation
# ✅ TEST: PDF Generation with Documents
# ✅ TEST: PDF Generation with Approvals
# ✅ TEST: PDF Generation with Activity Log
# ✅ TEST: Full Snapshot PDF Generation
# ✅ TEST: PDF File Storage
# ✅ TEST: PDF Generator Consistency
# ============================================================================
# ✅ ALL PDF GENERATION TESTS PASSED
# ============================================================================
```

### Server Start (1 min)

```bash
# Start server
python run_server.py

# Expected logs:
# INFO: Started server process
# INFO: Uvicorn running on http://0.0.0.0:8000
```

---

## 🧪 Post-Deployment Verification (10 min)

### 1. Create Test Snapshot

```bash
# Get authentication token first
TOKEN="your_jwt_token_here"
ROOM_ID="your_room_id_here"

# Create snapshot
curl -X POST "http://localhost:8000/api/v1/rooms/$ROOM_ID/snapshots" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Deployment Test Snapshot",
    "snapshot_type": "pdf",
    "include_documents": true,
    "include_activity": true,
    "include_approvals": true
  }'

# Response should show:
# {
#   "id": "snapshot-uuid",
#   "title": "Deployment Test Snapshot",
#   "status": "completed",
#   "file_size": 85420,  # Real size, not 1MB!
#   "download_url": "http://localhost:8000/api/v1/rooms/.../download"
# }
```

### 2. Verify File Storage

```bash
# Check files exist
ls -la uploads/snapshots/$ROOM_ID/

# Should show:
# -rw-r--r-- 1 user group 85420 Jan 22 10:30 snapshot-uuid.pdf

# Check file is valid PDF
file uploads/snapshots/$ROOM_ID/*.pdf
# Should output: PDF document, version 1.4
```

### 3. Download and Test PDF

```bash
# Download snapshot
curl -X GET "http://localhost:8000/api/v1/rooms/$ROOM_ID/snapshots/$SNAPSHOT_ID/download" \
  -H "Authorization: Bearer $TOKEN" \
  --output test_snapshot.pdf

# Verify file
file test_snapshot.pdf
# Should output: PDF document, version 1.4

# Try to open with PDF reader
# macOS: open test_snapshot.pdf
# Linux: xdg-open test_snapshot.pdf
# Windows: start test_snapshot.pdf

# Verify content:
# ✅ Title page with room information
# ✅ Room details table
# ✅ Parties table with names and roles
# ✅ Vessels information
# ✅ Documents status
# ✅ Approvals status
# ✅ Activity timeline
# ✅ Footer with confidentiality notice
```

### 4. Verify Audit Logging

```bash
# Check database for audit entries
sqlite3 sts_clearance.db "SELECT actor, action, ts FROM activity_log WHERE action LIKE '%snapshot%' ORDER BY ts DESC LIMIT 5;"

# Should show:
# user@example.com|snapshot_created|2025-01-22 10:30:45
# user@example.com|snapshot_downloaded|2025-01-22 10:31:02
```

### 5. Delete and Verify Cleanup

```bash
# Delete snapshot
curl -X DELETE "http://localhost:8000/api/v1/rooms/$ROOM_ID/snapshots/$SNAPSHOT_ID" \
  -H "Authorization: Bearer $TOKEN"

# Verify file is deleted
ls -la uploads/snapshots/$ROOM_ID/
# Should NOT show the deleted snapshot file

# Verify database record is deleted
sqlite3 sts_clearance.db "SELECT id FROM snapshots WHERE id='$SNAPSHOT_ID';"
# Should return: (no results)
```

---

## 🔄 Rollback Procedure (If Needed)

### Option 1: Quick Rollback (5 min)

If Day 2 deployment is problematic:

```bash
# 1. Stop server
# (Ctrl+C or kill process)

# 2. Restore Day 1 version of snapshots.py
git checkout HEAD~1 -- app/routers/snapshots.py

# 3. Remove new service files (optional)
# rm app/services/pdf_generator.py
# rm app/services/snapshot_data_service.py

# 4. Restart server
python run_server.py

# Old functionality should work
# - Snapshots still in database
# - API still works
# - Download returns mock content
```

### Option 2: Full Rollback (15 min)

```bash
# 1. Stop server

# 2. Restore database backup
cp sts_clearance.db.backup sts_clearance.db

# 3. Restore code
git checkout -- app/routers/snapshots.py

# 4. Restart server
python run_server.py
```

### Option 3: Clean Rollback (20 min)

```bash
# 1. Stop server

# 2. Restore database backup
cp sts_clearance.db.backup sts_clearance.db

# 3. Reset git
git reset --hard HEAD~1

# 4. Remove PDFs
rm -rf uploads/snapshots

# 5. Restart server
python run_server.py
```

---

## 📊 Monitoring Post-Deployment

### Metrics to Watch

**1. PDF Generation Performance**
```bash
# Check logs for generation times
# Expected: ~150-250ms per snapshot
tail -f logs/app.log | grep "Snapshot.*generated"
```

**2. Disk Usage**
```bash
# Monitor uploads directory
watch -n 1 'du -sh uploads/snapshots'

# Expected growth: ~50-150KB per snapshot
```

**3. Database Size**
```bash
# Monitor database size
watch -n 1 'ls -lh sts_clearance.db'

# Expected: Slight growth (~1MB per 1000 snapshots)
```

**4. Error Rates**
```bash
# Check for PDF generation errors
grep -i "error.*pdf\|error.*snapshot" logs/app.log

# Should be minimal or none
```

**5. API Response Times**
```bash
# Monitor endpoint performance
# Check logs for request times
tail -f logs/app.log | grep "snapshot"

# Expected:
# POST /snapshots: 100-300ms
# GET /snapshots: 10-50ms
# GET /snapshots/{id}/download: 50-100ms
```

---

## 🐛 Common Issues & Solutions

### Issue 1: "Module not found: pdf_generator"

**Symptoms**: Server won't start, ImportError

**Solution**:
```bash
# Verify file exists
ls app/services/pdf_generator.py

# If missing, copy it
cp path/to/pdf_generator.py app/services/

# Restart server
```

### Issue 2: "Directory not writable: uploads"

**Symptoms**: Permission denied when creating snapshots

**Solution**:
```bash
# Create directory with proper permissions
mkdir -p uploads/snapshots
chmod 755 uploads
chmod 755 uploads/snapshots

# Or change ownership
chown -R $USER:$USER uploads

# Test write access
touch uploads/snapshots/.test
rm uploads/snapshots/.test
```

### Issue 3: "PDF file not found" on download

**Symptoms**: 404 when downloading snapshot

**Solution**:
```bash
# Check database has file_url
sqlite3 sts_clearance.db "SELECT id, file_url FROM snapshots LIMIT 1;"

# Check file exists
ls uploads/snapshots/{room_id}/{snapshot_id}.pdf

# If missing, regenerate:
python scripts/regenerate_snapshots.py --snapshot-id <id>
```

### Issue 4: PDF Generation Timeout

**Symptoms**: Snapshot creation hangs or times out

**Solution**:
```bash
# Increase HTTP timeout in client
# Or implement async generation (Day 3)

# For now, check logs
tail -f logs/app.log | grep timeout

# If generation is slow, profile:
# python -m cProfile -s cumtime test_pdf_generation.py
```

### Issue 5: Large PDF Files

**Symptoms**: PDFs are 500KB+ instead of 50-150KB

**Solution**:
```bash
# Check data size
# Snapshots with many activities/documents are larger

# For now, this is expected behavior
# Day 3 will add caching and optimization
```

---

## 📈 Performance Optimization

### If PDFs Generate Slowly

1. **Reduce database queries**: Check if room has many documents/activities
2. **Index database**: Ensure snapshots table has proper indexes
3. **Increase memory**: ReportLab may need more RAM for large PDFs

### If Downloads are Slow

1. **Check disk speed**: Test with `dd if=/dev/zero of=test.img bs=1M count=100`
2. **Check network**: Verify no bandwidth bottleneck
3. **Add caching**: Consider implementing Day 3 cache layer

### If Server Load is High

1. **Implement async generation**: Move to background tasks
2. **Add PDF caching**: Reuse PDFs that don't change
3. **Rate limit**: Prevent abuse of snapshot endpoint

---

## 🔐 Security Post-Deployment

### Verify Security

```bash
# 1. Check permission validation
curl -X POST "http://localhost:8000/api/v1/rooms/$ROOM_ID/snapshots" \
  -H "Authorization: Bearer INVALID_TOKEN"
# Should return: 401 Unauthorized

# 2. Check room isolation
curl -X GET "http://localhost:8000/api/v1/rooms/$OTHER_ROOM_ID/snapshots/$SNAPSHOT_ID/download" \
  -H "Authorization: Bearer $TOKEN"
# Should return: 403 Forbidden (if user not in room)

# 3. Check audit trail
sqlite3 sts_clearance.db "SELECT COUNT(*) FROM activity_log WHERE action='snapshot_created';"
# Should show all snapshot creations are logged
```

---

## ✅ Final Validation

### Deployment is Successful If:

- [ ] All tests pass: `python test_pdf_generation.py`
- [ ] PDF files are created: `ls uploads/snapshots/*/`
- [ ] Files are valid PDFs: `file uploads/snapshots/*/*.pdf`
- [ ] Download endpoint returns real PDFs
- [ ] Audit logs show snapshot operations
- [ ] File cleanup works on deletion
- [ ] Old snapshots still accessible
- [ ] No regression in existing features
- [ ] Performance is acceptable (<500ms per operation)
- [ ] Security validation passes

---

## 📞 Support

### If You Need Help

1. **Check logs**: `tail -f logs/app.log`
2. **Review docs**: `README_DAY2.md`
3. **Run tests**: `python test_pdf_generation.py`
4. **Review code**:
   - `app/services/pdf_generator.py`
   - `app/services/snapshot_data_service.py`
   - `app/routers/snapshots.py`

### Rollback Always Available

If something goes wrong:
1. Stop server (Ctrl+C)
2. Restore backup: `cp sts_clearance.db.backup sts_clearance.db`
3. Restore code: `git checkout -- .`
4. Restart server

---

## 🚀 You're Ready!

**Total Deployment Time**: ~15-20 minutes

**Go to**: `START_HERE_DAY2.md` for quick overview

**Then**: Run tests and verify everything works

**Finally**: Move to Day 3 for further optimizations

---

*Deployment Guide v1.0*
*Created: 2025-01-22*
*Status: Ready for Production Deployment*
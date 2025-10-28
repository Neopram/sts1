# 🔒 ENDPOINT SECURITY AUDIT REPORT

**Generated:** 2025-10-27T14:27:09.742569

## 📊 SUMMARY

- ✅ Endpoints WITH permission checks: **121**
- ⚠️  Endpoints WITHOUT permission checks: **17**
- 📈 Coverage: **87.7%**

## 🚨 CRITICAL - ENDPOINTS WITHOUT PERMISSION CHECKS

These endpoints need permission enforcement added:

### 📄 `auth.py`

- **POST** `UNKNOWN` → `register`
- **GET** `UNKNOWN` → `login`

### 📄 `cache_management.py`

- **POST** `/clear` → `get_cache_statistics`

### 📄 `cockpit.py`

- **GET** `/rooms/{room_id}/snapshot.pdf` → `get_document_types`
- **POST** `/rooms/{room_id}/documents/{document_id}/approve` → `get_room_activity`

### 📄 `cockpit_fixed_final.py`

- **GET** `/rooms/{room_id}/snapshot.pdf` → `get_document_types`

### 📄 `config.py`

- **GET** `/feature-flags/{flag_key}` → `get_feature_flags`
- **PATCH** `/feature-flags/{flag_key}` → `get_feature_flag`
- **POST** `UNKNOWN` → `get_document_types`
- **GET** `/system-info` → `get_criticality_rules`

### 📄 `documents.py`

- **GET** `/rooms/{room_id}/documents/status-summary` → `get_document_types`

### 📄 `files.py`

- **GET** `/files/proxy` → `serve_static_file`

### 📄 `messages.py`

- **GET** `UNKNOWN` → `handle_read_receipt`

### 📄 `snapshots.py`

- **DELETE** `/rooms/{room_id}/snapshots/{snapshot_id}` → `_store_pdf_file`

### 📄 `weather.py`

- **POST** `/weather/cache/clear` → `get_marine_conditions_guide`

### 📄 `websocket.py`

- **UNKNOWN** `/ws/{room_id}` → `verify_room_access`
- **GET** `/ws/rooms/{room_id}/users` → `websocket_endpoint`

## ✅ ENDPOINTS WITH PERMISSION CHECKS

These endpoints have proper security:

### ✓ `activities.py` (5 secure)

### ✓ `approval_matrix.py` (2 secure)

### ✓ `approvals.py` (7 secure)

### ✓ `auth.py` (4 secure)

### ✓ `cockpit.py` (10 secure)

### ✓ `cockpit_fixed_final.py` (11 secure)

### ✓ `config.py` (4 secure)

### ✓ `documents.py` (8 secure)

### ✓ `files.py` (3 secure)

### ✓ `historical_access.py` (4 secure)

### ✓ `messages.py` (4 secure)

### ✓ `missing_documents.py` (6 secure)

### ✓ `notifications.py` (5 secure)

### ✓ `profile.py` (4 secure)

### ✓ `regional_operations.py` (3 secure)

### ✓ `rooms.py` (7 secure)

### ✓ `sanctions.py` (5 secure)

### ✓ `search.py` (4 secure)

### ✓ `settings.py` (2 secure)

### ✓ `snapshots.py` (5 secure)

### ✓ `stats.py` (2 secure)

### ✓ `users.py` (3 secure)

### ✓ `vessel_integrations.py` (6 secure)

### ✓ `vessel_sessions.py` (2 secure)

### ✓ `vessels.py` (4 secure)

### ✓ `weather.py` (1 secure)

## 🔧 ACTIONS REQUIRED

1. Review all endpoints in the **CRITICAL** section
2. Add `@require_permission(...)` decorator to each endpoint
3. Or add permission check in endpoint body
4. Re-run this script to verify

### Template for adding permissions:

```python
@router.get('/path')
@require_permission('resource.permission')
async def endpoint_name(request: Request):
    # Your code
    pass
```
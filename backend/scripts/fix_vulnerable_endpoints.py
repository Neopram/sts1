#!/usr/bin/env python3
"""
Vulnerability Fix Suggestions Generator
Generates fixes for endpoints without permission checks
"""

import logging

logger = logging.getLogger(__name__)

# Vulnerability fixes - what needs to be done in each file
VULNERABLE_ENDPOINTS = {
    "auth.py": [
        {
            "function": "register",
            "fix": "Add @require_permission() OR mark as public - registration should be public",
            "suggestion": """
@router.post('/register')  # No auth required - public endpoint
async def register(credentials: RegistrationSchema):
    # Registration logic
    pass
            """
        },
        {
            "function": "login",
            "fix": "Add @require_permission() OR mark as public - login should be public",
            "suggestion": """
@router.post('/login')  # No auth required - public endpoint
async def login(credentials: LoginSchema):
    # Login logic
    pass
            """
        },
    ],
    "cache_management.py": [
        {
            "function": "get_cache_statistics",
            "path": "/clear",
            "fix": "Add @require_permission('admin.manage_cache')",
            "suggestion": """
from app.middleware.permission_enforcer import require_permission

@router.post('/clear')
@require_permission('admin.manage_cache')
async def get_cache_statistics(request: Request):
    # Only admins can clear cache
    pass
            """
        },
    ],
    "cockpit.py": [
        {
            "function": "get_document_types",
            "path": "/rooms/{room_id}/snapshot.pdf",
            "fix": "Add @require_permission('room.access')",
            "suggestion": """
@router.get('/rooms/{room_id}/snapshot.pdf')
@require_permission('room.access')
async def get_document_types(room_id: str, request: Request):
    # Download snapshot - check room access
    pass
            """
        },
        {
            "function": "get_room_activity",
            "path": "/rooms/{room_id}/documents/{document_id}/approve",
            "fix": "Add @require_permission('document.approve')",
            "suggestion": """
@router.post('/rooms/{room_id}/documents/{document_id}/approve')
@require_permission('document.approve')
async def get_room_activity(room_id: str, document_id: str, request: Request):
    # Approve document - check permission
    pass
            """
        },
    ],
    "config.py": [
        {
            "function": "get_feature_flags",
            "path": "/feature-flags/{flag_key}",
            "fix": "Add @require_permission('config.view_feature_flags')",
            "suggestion": """
@router.get('/feature-flags/{flag_key}')
@require_permission('config.view_feature_flags')
async def get_feature_flags(flag_key: str, request: Request):
    # View feature flag
    pass
            """
        },
        {
            "function": "get_feature_flag",
            "path": "/feature-flags/{flag_key}",
            "fix": "Add @require_permission('config.manage_feature_flags')",
            "suggestion": """
@router.patch('/feature-flags/{flag_key}')
@require_permission('config.manage_feature_flags')
async def get_feature_flag(flag_key: str, request: Request):
    # Update feature flag - admin only
    pass
            """
        },
        {
            "function": "get_document_types",
            "fix": "Add @require_permission('config.view')",
            "suggestion": """
@router.post('...')
@require_permission('config.view')
async def get_document_types(request: Request):
    # Config endpoint
    pass
            """
        },
        {
            "function": "get_criticality_rules",
            "path": "/system-info",
            "fix": "Add @require_permission('admin.view')",
            "suggestion": """
@router.get('/system-info')
@require_permission('admin.view')
async def get_criticality_rules(request: Request):
    # System info - admin only
    pass
            """
        },
    ],
    "documents.py": [
        {
            "function": "get_document_types",
            "path": "/rooms/{room_id}/documents/status-summary",
            "fix": "Add @require_permission('document.list')",
            "suggestion": """
@router.get('/rooms/{room_id}/documents/status-summary')
@require_permission('document.list')
async def get_document_types(room_id: str, request: Request):
    # Get status summary
    pass
            """
        },
    ],
    "files.py": [
        {
            "function": "serve_static_file",
            "path": "/files/proxy",
            "fix": "Add @require_permission('file.read')",
            "suggestion": """
@router.get('/files/proxy')
@require_permission('file.read')
async def serve_static_file(file_path: str, request: Request):
    # Serve file - check access
    pass
            """
        },
    ],
    "messages.py": [
        {
            "function": "handle_read_receipt",
            "fix": "Add @require_permission('message.read')",
            "suggestion": """
@router.patch('...')
@require_permission('message.read')
async def handle_read_receipt(message_id: str, request: Request):
    # Mark message as read
    pass
            """
        },
    ],
    "snapshots.py": [
        {
            "function": "_store_pdf_file",
            "path": "/rooms/{room_id}/snapshots/{snapshot_id}",
            "fix": "Add @require_permission('snapshot.delete')",
            "suggestion": """
@router.delete('/rooms/{room_id}/snapshots/{snapshot_id}')
@require_permission('snapshot.delete')
async def _store_pdf_file(room_id: str, snapshot_id: str, request: Request):
    # Delete snapshot
    pass
            """
        },
    ],
    "weather.py": [
        {
            "function": "get_marine_conditions_guide",
            "path": "/weather/cache/clear",
            "fix": "Add @require_permission('admin.manage_cache')",
            "suggestion": """
@router.post('/weather/cache/clear')
@require_permission('admin.manage_cache')
async def get_marine_conditions_guide(request: Request):
    # Clear weather cache - admin only
    pass
            """
        },
    ],
    "websocket.py": [
        {
            "function": "verify_room_access",
            "path": "/ws/{room_id}",
            "fix": "Verify room access in websocket_endpoint before accepting connection",
            "suggestion": """
@router.websocket('/ws/{room_id}')
async def verify_room_access(websocket: WebSocket, room_id: str):
    # Verify auth and room access BEFORE accepting
    request = websocket.scope
    user = request.get('user')
    
    if not user:
        await websocket.close(code=4001)
        return
    
    # Check room access permission
    # ... then accept connection
    await websocket.accept()
            """
        },
        {
            "function": "websocket_endpoint",
            "path": "/ws/rooms/{room_id}/users",
            "fix": "Add authentication check",
            "suggestion": """
@router.get('/ws/rooms/{room_id}/users')
async def websocket_endpoint(room_id: str, request: Request):
    # Get WebSocket users - add auth check
    user = request.state.user if hasattr(request.state, 'user') else None
    if not user:
        raise HTTPException(status_code=401)
    pass
            """
        },
    ],
}


def generate_fixes():
    """Generate fix suggestions"""
    
    print("=" * 70)
    print("🔧 VULNERABLE ENDPOINTS - FIX SUGGESTIONS")
    print("=" * 70)
    print()
    
    total_fixes = 0
    for router_name, endpoints in sorted(VULNERABLE_ENDPOINTS.items()):
        print(f"📄 {router_name}")
        print("-" * 70)
        
        for i, endpoint in enumerate(endpoints, 1):
            total_fixes += 1
            func_name = endpoint.get('function', '?')
            path = endpoint.get('path', '?')
            fix = endpoint.get('fix', '?')
            suggestion = endpoint.get('suggestion', '')
            
            print(f"\n{i}. Function: {func_name}")
            print(f"   Path: {path}")
            print(f"   Fix: {fix}")
            if suggestion:
                print(f"   Template:")
                for line in suggestion.strip().split('\n'):
                    print(f"     {line}")
        
        print()
    
    print("=" * 70)
    print(f"📊 TOTAL FIXES NEEDED: {total_fixes}")
    print("=" * 70)
    print()
    
    # Generate detailed report file
    report_lines = [
        "# 🔧 VULNERABLE ENDPOINTS - FIX GUIDE",
        "",
        "## Instructions",
        "",
        "For each endpoint below:",
        "1. Open the router file",
        "2. Add the suggested fix",
        "3. Run audit script to verify",
        "",
    ]
    
    for router_name, endpoints in sorted(VULNERABLE_ENDPOINTS.items()):
        report_lines.append(f"## {router_name}")
        report_lines.append("")
        
        for endpoint in endpoints:
            func_name = endpoint.get('function', '?')
            path = endpoint.get('path', '?')
            fix = endpoint.get('fix', '?')
            suggestion = endpoint.get('suggestion', '')
            
            report_lines.append(f"### {func_name} ({path})")
            report_lines.append(f"**Fix:** {fix}")
            report_lines.append("")
            if suggestion:
                report_lines.append("```python")
                report_lines.extend(suggestion.strip().split('\n'))
                report_lines.append("```")
                report_lines.append("")
        
        report_lines.append("")
    
    # Save report
    output_path = "VULNERABLE_ENDPOINTS_FIXES.md"
    with open(output_path, 'w') as f:
        f.write('\n'.join(report_lines))
    
    print(f"✅ Detailed fixes saved to: {output_path}")


if __name__ == "__main__":
    generate_fixes()
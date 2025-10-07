"""
Script to check all available endpoints in the STS Clearance API
"""

import requests
import json

BASE_URL = "http://localhost:8000"

def get_openapi_spec():
    """Get the OpenAPI specification"""
    try:
        response = requests.get(f"{BASE_URL}/openapi.json")
        if response.status_code == 200:
            return response.json()
        else:
            print(f"Failed to get OpenAPI spec: {response.status_code}")
            return None
    except Exception as e:
        print(f"Error getting OpenAPI spec: {e}")
        return None

def analyze_endpoints(spec):
    """Analyze endpoints from OpenAPI spec"""
    if not spec or "paths" not in spec:
        print("No paths found in OpenAPI spec")
        return
    
    endpoints = []
    
    for path, methods in spec["paths"].items():
        for method, details in methods.items():
            if method.upper() in ["GET", "POST", "PUT", "PATCH", "DELETE"]:
                endpoints.append({
                    "method": method.upper(),
                    "path": path,
                    "summary": details.get("summary", ""),
                    "tags": details.get("tags", [])
                })
    
    # Group by tags
    by_tags = {}
    for endpoint in endpoints:
        for tag in endpoint["tags"]:
            if tag not in by_tags:
                by_tags[tag] = []
            by_tags[tag].append(endpoint)
    
    print("🔍 STS Clearance API Endpoints Analysis")
    print("=" * 60)
    
    total_endpoints = len(endpoints)
    print(f"📊 Total Endpoints: {total_endpoints}")
    print()
    
    for tag, tag_endpoints in sorted(by_tags.items()):
        print(f"📂 {tag.upper()} ({len(tag_endpoints)} endpoints)")
        print("-" * 40)
        
        for endpoint in sorted(tag_endpoints, key=lambda x: (x["path"], x["method"])):
            method_color = {
                "GET": "🟢",
                "POST": "🔵", 
                "PUT": "🟡",
                "PATCH": "🟠",
                "DELETE": "🔴"
            }.get(endpoint["method"], "⚪")
            
            print(f"  {method_color} {endpoint['method']:<6} {endpoint['path']}")
            if endpoint["summary"]:
                print(f"    └─ {endpoint['summary']}")
        print()
    
    # Check for common missing endpoints
    print("🔍 Missing Common Endpoints Check:")
    print("-" * 40)
    
    common_patterns = [
        ("GET", "/api/v1/rooms/{room_id}/parties", "Get room parties"),
        ("POST", "/api/v1/rooms/{room_id}/parties", "Add party to room"),
        ("DELETE", "/api/v1/rooms/{room_id}/parties/{party_id}", "Remove party from room"),
        ("GET", "/api/v1/rooms/{room_id}/vessels", "Get room vessels"),
        ("POST", "/api/v1/rooms/{room_id}/vessels", "Add vessel to room"),
        ("PUT", "/api/v1/rooms/{room_id}/vessels/{vessel_id}", "Update vessel"),
        ("DELETE", "/api/v1/rooms/{room_id}/vessels/{vessel_id}", "Delete vessel"),
        ("GET", "/api/v1/rooms/{room_id}/snapshots", "Get room snapshots"),
        ("POST", "/api/v1/rooms/{room_id}/snapshots", "Create room snapshot"),
        ("GET", "/api/v1/rooms/{room_id}/approvals", "Get room approvals"),
        ("POST", "/api/v1/rooms/{room_id}/approvals", "Create approval"),
        ("PUT", "/api/v1/rooms/{room_id}/approvals/{approval_id}", "Update approval"),
        ("GET", "/api/v1/users", "Get users"),
        ("PUT", "/api/v1/users/{user_id}", "Update user"),
        ("DELETE", "/api/v1/users/{user_id}", "Delete user"),
    ]
    
    existing_paths = [f"{ep['method']} {ep['path']}" for ep in endpoints]
    
    missing = []
    for method, path, desc in common_patterns:
        endpoint_key = f"{method} {path}"
        if endpoint_key not in existing_paths:
            missing.append((method, path, desc))
    
    if missing:
        print("❌ Missing endpoints:")
        for method, path, desc in missing:
            print(f"  🔴 {method:<6} {path} - {desc}")
    else:
        print("✅ All common endpoints are present!")
    
    print()
    print("🌐 API Documentation: http://localhost:8000/docs")
    print("📚 ReDoc Documentation: http://localhost:8000/redoc")

if __name__ == "__main__":
    spec = get_openapi_spec()
    if spec:
        analyze_endpoints(spec)
    else:
        print("❌ Could not analyze endpoints - server may not be running")
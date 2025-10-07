"""
Test script to verify all endpoints are working
"""

import requests
import json
from datetime import datetime, timedelta

BASE_URL = "http://localhost:8000"

def test_endpoint(method, endpoint, data=None, headers=None, expected_status=200):
    """Test an endpoint and return the result"""
    try:
        url = f"{BASE_URL}{endpoint}"
        
        if method.upper() == "GET":
            response = requests.get(url, headers=headers)
        elif method.upper() == "POST":
            response = requests.post(url, json=data, headers=headers)
        elif method.upper() == "PUT":
            response = requests.put(url, json=data, headers=headers)
        elif method.upper() == "PATCH":
            response = requests.patch(url, json=data, headers=headers)
        elif method.upper() == "DELETE":
            response = requests.delete(url, headers=headers)
        
        status_ok = response.status_code == expected_status
        
        return {
            "endpoint": endpoint,
            "method": method,
            "status_code": response.status_code,
            "expected": expected_status,
            "success": status_ok,
            "response": response.json() if response.headers.get('content-type', '').startswith('application/json') else response.text[:200]
        }
    except Exception as e:
        return {
            "endpoint": endpoint,
            "method": method,
            "success": False,
            "error": str(e)
        }

def main():
    print("🧪 Testing STS Clearance API Endpoints")
    print("=" * 50)
    
    # Test public endpoints first
    public_endpoints = [
        ("GET", "/", 200),
        ("GET", "/api/v1/config/system-info", 200),
        ("GET", "/api/v1/stats/system/health", 200),
        ("GET", "/api/v1/config/feature-flags", 200),
        ("GET", "/api/v1/config/document-types", 200),
    ]
    
    print("\n📋 Testing Public Endpoints:")
    for method, endpoint, expected in public_endpoints:
        result = test_endpoint(method, endpoint, expected_status=expected)
        status = "✅" if result["success"] else "❌"
        print(f"{status} {method} {endpoint} - {result.get('status_code', 'ERROR')}")
        if not result["success"] and "error" in result:
            print(f"   Error: {result['error']}")
    
    # Test authentication
    print("\n🔐 Testing Authentication:")
    
    # Register a test user
    register_data = {
        "email": "test@example.com",
        "password": "testpass123",
        "name": "Test User",
        "role": "owner"
    }
    
    register_result = test_endpoint("POST", "/api/v1/auth/register", register_data, expected_status=201)
    status = "✅" if register_result["success"] else "❌"
    print(f"{status} POST /api/v1/auth/register - {register_result.get('status_code', 'ERROR')}")
    
    # Login
    login_data = {
        "email": "test@example.com",
        "password": "testpass123"
    }
    
    login_result = test_endpoint("POST", "/api/v1/auth/login", login_data)
    status = "✅" if login_result["success"] else "❌"
    print(f"{status} POST /api/v1/auth/login - {login_result.get('status_code', 'ERROR')}")
    
    # Get token for authenticated requests
    token = None
    if login_result["success"] and "response" in login_result:
        try:
            # Try different token field names
            response = login_result["response"]
            token = response.get("access_token") or response.get("token")
            if token:
                print(f"   🔑 Token obtained: {token[:20]}...")
            else:
                print(f"   ⚠️  Response structure: {list(response.keys())}")
        except Exception as e:
            print(f"   ⚠️  Could not extract token: {e}")
    
    if not token:
        print("❌ Cannot continue with authenticated endpoints - no token")
        return
    
    headers = {"Authorization": f"Bearer {token}"}
    
    # Test authenticated endpoints
    print("\n🔒 Testing Authenticated Endpoints:")
    
    authenticated_endpoints = [
        ("GET", "/api/v1/auth/me", 200),
        ("GET", "/api/v1/stats/dashboard", 200),
        ("GET", "/api/v1/rooms", 200),
        ("GET", "/api/v1/search/global?q=test", 200),
        ("GET", "/api/v1/notifications", 200),
        ("GET", "/api/v1/activities", 200),
    ]
    
    for method, endpoint, expected in authenticated_endpoints:
        result = test_endpoint(method, endpoint, headers=headers, expected_status=expected)
        status = "✅" if result["success"] else "❌"
        print(f"{status} {method} {endpoint} - {result.get('status_code', 'ERROR')}")
        if not result["success"] and "error" in result:
            print(f"   Error: {result['error']}")
    
    # Test room creation
    print("\n🏠 Testing Room Creation:")
    
    room_data = {
        "title": "Test STS Operation",
        "location": "Port of Houston",
        "sts_eta": (datetime.utcnow() + timedelta(days=7)).isoformat(),
        "parties": [
            {"role": "seller", "name": "Test Seller", "email": "seller@test.com"},
            {"role": "buyer", "name": "Test Buyer", "email": "buyer@test.com"}
        ]
    }
    
    create_room_result = test_endpoint("POST", "/api/v1/rooms", room_data, headers=headers, expected_status=201)
    status = "✅" if create_room_result["success"] else "❌"
    print(f"{status} POST /api/v1/rooms - {create_room_result.get('status_code', 'ERROR')}")
    
    room_id = None
    if create_room_result["success"] and "response" in create_room_result:
        try:
            room_id = create_room_result["response"]["id"]
            print(f"   🏠 Room created: {room_id}")
        except:
            print("   ⚠️  Could not extract room ID from response")
    
    # Test room-specific endpoints if we have a room
    if room_id:
        print(f"\n🏠 Testing Room-Specific Endpoints (Room: {room_id[:8]}...):")
        
        room_endpoints = [
            ("GET", f"/api/v1/rooms/{room_id}", 200),
            ("GET", f"/api/v1/rooms/{room_id}/documents", 200),
            ("GET", f"/api/v1/rooms/{room_id}/messages", 200),
            ("GET", f"/api/v1/rooms/{room_id}/parties", 200),
            ("GET", f"/api/v1/rooms/{room_id}/vessels", 200),
            ("GET", f"/api/v1/rooms/{room_id}/approvals", 200),
            ("GET", f"/api/v1/stats/room/{room_id}/analytics", 200),
        ]
        
        for method, endpoint, expected in room_endpoints:
            result = test_endpoint(method, endpoint, headers=headers, expected_status=expected)
            status = "✅" if result["success"] else "❌"
            print(f"{status} {method} {endpoint} - {result.get('status_code', 'ERROR')}")
    
    print("\n📊 Test Summary:")
    print("All major endpoints have been tested!")
    print("Check the results above for any issues.")
    print("\n🌐 Server is running at: http://localhost:8000")
    print("📚 API Documentation: http://localhost:8000/docs")
    print("🔍 Interactive API: http://localhost:8000/redoc")

if __name__ == "__main__":
    main()
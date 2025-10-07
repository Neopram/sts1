#!/usr/bin/env python3
"""
Test CORS configuration specifically
"""

import requests
import json

BASE_URL = "http://localhost:8000/api/v1"

def test_cors_headers():
    """Test CORS headers specifically"""
    print("🌐 Testing CORS Configuration...")
    print("=" * 50)
    
    # Test 1: Preflight request (OPTIONS)
    print("1️⃣ Testing preflight requests (OPTIONS)...")
    
    headers = {
        'Origin': 'http://localhost:3000',
        'Access-Control-Request-Method': 'POST',
        'Access-Control-Request-Headers': 'Content-Type, Authorization'
    }
    
    endpoints = ['/auth/login', '/rooms', '/auth/register']
    
    for endpoint in endpoints:
        try:
            response = requests.options(f"{BASE_URL}{endpoint}", headers=headers)
            print(f"  OPTIONS {endpoint}:")
            print(f"    Status: {response.status_code}")
            print(f"    Access-Control-Allow-Origin: {response.headers.get('Access-Control-Allow-Origin', 'MISSING')}")
            print(f"    Access-Control-Allow-Methods: {response.headers.get('Access-Control-Allow-Methods', 'MISSING')}")
            print(f"    Access-Control-Allow-Headers: {response.headers.get('Access-Control-Allow-Headers', 'MISSING')}")
            print(f"    Access-Control-Allow-Credentials: {response.headers.get('Access-Control-Allow-Credentials', 'MISSING')}")
            print()
        except Exception as e:
            print(f"    ❌ Error: {e}")
    
    # Test 2: Actual request with Origin header
    print("2️⃣ Testing actual requests with Origin header...")
    
    headers_with_origin = {
        'Origin': 'http://localhost:3000',
        'Content-Type': 'application/json'
    }
    
    # Test login request
    login_data = {"email": "admin@sts.com", "password": "admin123"}
    
    try:
        response = requests.post(f"{BASE_URL}/auth/login", 
                               json=login_data, 
                               headers=headers_with_origin)
        
        print(f"  POST /auth/login with Origin header:")
        print(f"    Status: {response.status_code}")
        print(f"    Access-Control-Allow-Origin: {response.headers.get('Access-Control-Allow-Origin', 'MISSING')}")
        
        if response.status_code == 200:
            print(f"    ✅ Login successful!")
            token = response.json().get('token')
            
            # Test authenticated request
            auth_headers = {
                'Origin': 'http://localhost:3000',
                'Authorization': f'Bearer {token}',
                'Content-Type': 'application/json'
            }
            
            rooms_response = requests.get(f"{BASE_URL}/rooms", headers=auth_headers)
            print(f"  GET /rooms with auth:")
            print(f"    Status: {rooms_response.status_code}")
            print(f"    Access-Control-Allow-Origin: {rooms_response.headers.get('Access-Control-Allow-Origin', 'MISSING')}")
            
        else:
            print(f"    ❌ Login failed: {response.text}")
            
    except Exception as e:
        print(f"    ❌ Error: {e}")

def test_environment_variables():
    """Check what environment the server thinks it's running in"""
    print("\n3️⃣ Testing server environment...")
    
    try:
        # Make a request to see server response headers
        response = requests.get("http://localhost:8000/docs")
        print(f"  Server response status: {response.status_code}")
        print(f"  Server headers: {dict(response.headers)}")
        
        # Check if there are any environment-specific headers
        server_header = response.headers.get('server', 'Unknown')
        print(f"  Server: {server_header}")
        
    except Exception as e:
        print(f"  ❌ Error: {e}")

def simulate_frontend_request():
    """Simulate exactly what the frontend is doing"""
    print("\n4️⃣ Simulating frontend request flow...")
    
    # Step 1: Preflight for login
    print("  Step 1: Preflight request for login...")
    preflight_headers = {
        'Origin': 'http://localhost:3000',
        'Access-Control-Request-Method': 'POST',
        'Access-Control-Request-Headers': 'content-type'
    }
    
    try:
        preflight = requests.options(f"{BASE_URL}/auth/login", headers=preflight_headers)
        print(f"    Preflight status: {preflight.status_code}")
        
        if preflight.status_code != 200:
            print(f"    ❌ Preflight failed! This is why frontend can't login.")
            print(f"    Response: {preflight.text}")
            return
        
        # Step 2: Actual login request
        print("  Step 2: Actual login request...")
        login_headers = {
            'Origin': 'http://localhost:3000',
            'Content-Type': 'application/json'
        }
        
        login_data = {"email": "admin@sts.com", "password": "admin123"}
        login_response = requests.post(f"{BASE_URL}/auth/login", 
                                     json=login_data, 
                                     headers=login_headers)
        
        print(f"    Login status: {login_response.status_code}")
        
        if login_response.status_code == 200:
            print("    ✅ Login would work if preflight passes!")
        else:
            print(f"    ❌ Login failed: {login_response.text}")
            
    except Exception as e:
        print(f"    ❌ Error: {e}")

if __name__ == "__main__":
    test_cors_headers()
    test_environment_variables()
    simulate_frontend_request()
    
    print("\n🎯 Diagnosis:")
    print("- If preflight requests (OPTIONS) fail, CORS is the issue")
    print("- If preflight passes but actual requests fail, check authentication")
    print("- If both work here but frontend fails, check frontend request format")
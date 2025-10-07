#!/usr/bin/env python3
"""
Debug authentication issues
"""

import requests
import json

BASE_URL = "http://localhost:8000/api/v1"

def test_auth_endpoints():
    """Test authentication endpoints to debug login issues"""
    print("🔍 Debugging Authentication Issues...")
    print("=" * 50)
    
    # Test 1: Check if users exist
    print("1️⃣ Testing user registration...")
    
    test_users = [
        {"email": "admin@sts.com", "name": "Admin User", "password": "admin123", "role": "admin"},
        {"email": "owner@sts.com", "name": "Owner User", "password": "admin123", "role": "owner"},
        {"email": "test@sts.com", "name": "Test User", "password": "test123", "role": "owner"}
    ]
    
    for user in test_users:
        try:
            response = requests.post(f"{BASE_URL}/auth/register", json=user)
            if response.status_code == 201:
                print(f"  ✅ Created user: {user['email']}")
            elif response.status_code == 400:
                print(f"  ℹ️ User exists: {user['email']}")
            else:
                print(f"  ⚠️ Unexpected response for {user['email']}: {response.status_code} - {response.text}")
        except Exception as e:
            print(f"  ❌ Error registering {user['email']}: {e}")
    
    print("\n2️⃣ Testing login attempts...")
    
    # Test 2: Try different login formats
    login_attempts = [
        {"email": "admin@sts.com", "password": "admin123"},
        {"email": "owner@sts.com", "password": "admin123"},
        {"email": "test@sts.com", "password": "test123"},
        # Try different formats that frontend might be sending
        {"username": "admin@sts.com", "password": "admin123"},
        {"user": "admin@sts.com", "pass": "admin123"},
    ]
    
    for attempt in login_attempts:
        try:
            print(f"  🔑 Trying login: {attempt}")
            response = requests.post(f"{BASE_URL}/auth/login", json=attempt)
            print(f"    Status: {response.status_code}")
            
            if response.status_code == 200:
                data = response.json()
                print(f"    ✅ Success! Token: {data.get('token', 'N/A')[:20]}...")
                
                # Test the token
                headers = {"Authorization": f"Bearer {data.get('token')}"}
                test_response = requests.get(f"{BASE_URL}/rooms", headers=headers)
                print(f"    🏢 Rooms endpoint test: {test_response.status_code}")
                
            else:
                print(f"    ❌ Failed: {response.text}")
                
        except Exception as e:
            print(f"    ❌ Error: {e}")
    
    print("\n3️⃣ Testing endpoint accessibility...")
    
    # Test 3: Check endpoint responses
    endpoints = [
        "/auth/login",
        "/rooms",
        "/auth/register"
    ]
    
    for endpoint in endpoints:
        try:
            response = requests.options(f"{BASE_URL}{endpoint}")
            print(f"  OPTIONS {endpoint}: {response.status_code}")
            
            # Check CORS headers
            cors_headers = {
                'Access-Control-Allow-Origin': response.headers.get('Access-Control-Allow-Origin'),
                'Access-Control-Allow-Methods': response.headers.get('Access-Control-Allow-Methods'),
                'Access-Control-Allow-Headers': response.headers.get('Access-Control-Allow-Headers'),
            }
            print(f"    CORS: {cors_headers}")
            
        except Exception as e:
            print(f"  ❌ Error testing {endpoint}: {e}")

def check_database_users():
    """Check what users are actually in the database"""
    print("\n4️⃣ Checking database users...")
    
    try:
        # We'll use a simple approach - try to login with known credentials
        # and see what the detailed error message says
        
        response = requests.post(f"{BASE_URL}/auth/login", 
                               json={"email": "nonexistent@test.com", "password": "wrong"},
                               headers={"Content-Type": "application/json"})
        
        print(f"  Test with non-existent user: {response.status_code}")
        print(f"  Response: {response.text}")
        
    except Exception as e:
        print(f"  ❌ Error: {e}")

if __name__ == "__main__":
    test_auth_endpoints()
    check_database_users()
    
    print("\n🎯 Summary:")
    print("- If login works above, the issue might be with frontend request format")
    print("- If login fails, there might be a database or authentication issue")
    print("- Check CORS headers if frontend can't reach the API")
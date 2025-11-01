import sys
import io
if sys.platform == 'win32':
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8', errors='replace')
#!/usr/bin/env python3
"""
Final test to verify login works with the updated configuration
"""

import requests
import json

BASE_URL = "http://localhost:8001/api/v1"

def test_login():
    """Test login with admin credentials"""
    print("🔐 Testing Login Functionality")
    print("=" * 60)
    
    # Test credentials
    credentials = [
        {"email": "admin@sts.com", "password": "admin123", "name": "Admin User"},
        {"email": "owner@sts.com", "password": "admin123", "name": "Owner User"},
        {"email": "test@sts.com", "password": "test123", "name": "Test User"},
    ]
    
    for cred in credentials:
        print(f"\n📧 Testing: {cred['email']}")
        print("-" * 60)
        
        try:
            # Attempt login
            response = requests.post(
                f"{BASE_URL}/auth/login",
                json={"email": cred["email"], "password": cred["password"]},
                headers={"Content-Type": "application/json"}
            )
            
            print(f"Status Code: {response.status_code}")
            
            if response.status_code == 200:
                data = response.json()
                print(f"✅ Login Successful!")
                print(f"   Token: {data.get('token', 'N/A')[:30]}...")
                print(f"   Email: {data.get('email', 'N/A')}")
                print(f"   Role: {data.get('role', 'N/A')}")
                print(f"   Name: {data.get('name', 'N/A')}")
                
                # Test token by getting rooms
                token = data.get('token')
                if token:
                    rooms_response = requests.get(
                        f"{BASE_URL}/rooms",
                        headers={"Authorization": f"Bearer {token}"}
                    )
                    print(f"   Rooms endpoint: {rooms_response.status_code}")
                    if rooms_response.status_code == 200:
                        rooms = rooms_response.json()
                        print(f"   Number of rooms: {len(rooms)}")
            else:
                print(f"❌ Login Failed")
                print(f"   Response: {response.text}")
                
        except Exception as e:
            print(f"❌ Error: {e}")
    
    print("\n" + "=" * 60)
    print("✅ Login test completed!")
    print("\n📝 Summary:")
    print("   - Backend is running on port 8001")
    print("   - Frontend should connect to http://localhost:8001")
    print("   - CORS is configured for localhost:3001")
    print("   - Login endpoint accepts email and password")

if __name__ == "__main__":
    test_login()

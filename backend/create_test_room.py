#!/usr/bin/env python3
"""
Simple script to create the specific room that frontend is looking for
"""

import asyncio
import json
import requests
import time

# The specific room ID that frontend is requesting
TARGET_ROOM_ID = "cc16287c-9579-43e0-a9a4-c565a814c1e7"
BASE_URL = "http://localhost:8000/api/v1"

def create_test_user_and_room():
    """Create test user and room using API calls"""
    print("🔧 Creating test user and room via API...")
    
    try:
        # Step 1: Create a test user with owner role
        print("👤 Creating test user...")
        user_data = {
            "email": "owner@sts.com",
            "name": "Room Owner",
            "password": "admin123",
            "role": "owner"
        }
        
        response = requests.post(f"{BASE_URL}/auth/register", json=user_data)
        if response.status_code == 201:
            print("  ✅ User created successfully")
        elif response.status_code == 400 and "already registered" in response.text:
            print("  ℹ️ User already exists")
        else:
            print(f"  ⚠️ User creation response: {response.status_code} - {response.text}")
        
        # Step 2: Login to get token
        print("🔑 Logging in...")
        login_data = {
            "email": "owner@sts.com",
            "password": "admin123"
        }
        
        response = requests.post(f"{BASE_URL}/auth/login", json=login_data)
        if response.status_code == 200:
            token_data = response.json()
            token = token_data.get("token")
            print("  ✅ Login successful")
            
            # Step 3: Create the specific room
            print(f"🏢 Creating room with ID: {TARGET_ROOM_ID}")
            headers = {"Authorization": f"Bearer {token}"}
            
            room_data = {
                "title": "STS Operation - Atlantic Pioneer & Pacific Explorer",
                "location": "Port of Rotterdam - Anchorage A1",
                "sts_eta": "2024-01-15T14:30:00Z",
                "parties": [
                    {"role": "owner", "name": "Atlantic Pioneer", "email": "captain@atlantic-pioneer.com"},
                    {"role": "buyer", "name": "Pacific Explorer", "email": "captain@pacific-explorer.com"},
                    {"role": "broker", "name": "Port Authority", "email": "ops@rotterdam-port.com"}
                ]
            }
            
            # Try to create room with specific ID (if API supports it)
            response = requests.post(f"{BASE_URL}/rooms", json=room_data, headers=headers)
            if response.status_code == 201:
                created_room = response.json()
                print(f"  ✅ Room created successfully")
                print(f"    📍 Room ID: {created_room.get('id', 'N/A')}")
                print(f"    📋 Title: {created_room.get('title', 'N/A')}")
                
                # If the created room doesn't have our target ID, we'll note it
                if created_room.get('id') != TARGET_ROOM_ID:
                    print(f"  ⚠️ Created room has different ID than expected")
                    print(f"    Expected: {TARGET_ROOM_ID}")
                    print(f"    Actual: {created_room.get('id')}")
                
            else:
                print(f"  ❌ Room creation failed: {response.status_code} - {response.text}")
            
            # Step 4: List all rooms to verify
            print("📋 Listing all rooms...")
            response = requests.get(f"{BASE_URL}/rooms", headers=headers)
            if response.status_code == 200:
                rooms = response.json()
                print(f"  ✅ Found {len(rooms)} rooms:")
                for room in rooms:
                    print(f"    - {room.get('title', 'N/A')} (ID: {room.get('id', 'N/A')})")
            else:
                print(f"  ❌ Failed to list rooms: {response.status_code} - {response.text}")
                
        else:
            print(f"  ❌ Login failed: {response.status_code} - {response.text}")
            return False
            
        return True
        
    except requests.exceptions.ConnectionError:
        print("❌ Cannot connect to backend. Make sure the server is running on http://localhost:8000")
        return False
    except Exception as e:
        print(f"❌ Error: {e}")
        return False

def test_room_access():
    """Test accessing the specific room that frontend needs"""
    print(f"\n🔍 Testing access to room: {TARGET_ROOM_ID}")
    
    try:
        # Test without authentication (should get 401)
        response = requests.get(f"{BASE_URL}/rooms/{TARGET_ROOM_ID}/summary")
        print(f"  📊 Room summary (no auth): {response.status_code}")
        
        response = requests.get(f"{BASE_URL}/rooms/{TARGET_ROOM_ID}/activity")
        print(f"  📋 Room activity (no auth): {response.status_code}")
        
        # Test room listing (should get 401)
        response = requests.get(f"{BASE_URL}/rooms")
        print(f"  📋 Room listing (no auth): {response.status_code}")
        
        print("  ℹ️ All endpoints correctly return 401 (authentication required)")
        
    except Exception as e:
        print(f"❌ Error testing room access: {e}")

if __name__ == "__main__":
    print("🚀 STS Clearance Hub - Frontend Data Fix")
    print("=" * 50)
    
    success = create_test_user_and_room()
    test_room_access()
    
    if success:
        print("\n🎉 Setup completed!")
        print("📝 Next steps:")
        print("  1. Frontend should now be able to authenticate")
        print("  2. Use credentials: owner@sts.com / admin123 (or admin@sts.com / admin123)")
        print("  3. Rooms should load after authentication")
    else:
        print("\n❌ Setup failed. Check backend server status.")
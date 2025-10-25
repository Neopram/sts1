#!/usr/bin/env python
"""
Detailed Chat Endpoint Test with Error Logging
"""

import asyncio
import httpx
from app.database import AsyncSessionLocal
from sqlalchemy import select
from app.models import Room, Party, User
from app.dependencies import create_access_token

async def test_detailed():
    BASE_URL = "http://localhost:8001"
    
    async with AsyncSessionLocal() as session:
        # Get test data
        result = await session.execute(select(Room).limit(1))
        room = result.scalar_one_or_none()
        room_id = str(room.id)
        
        result = await session.execute(
            select(Party).where(Party.room_id == room_id).limit(1)
        )
        party = result.scalar_one_or_none()
        
        if not party:
            print("❌ No party found")
            return
        
        result = await session.execute(
            select(User).where(User.email == party.email)
        )
        user = result.scalar_one_or_none()
        
        print(f"Testing: {user.email} ({user.role})")
        print(f"Room: {room_id}")
        
        # Create token
        token = create_access_token(data={"sub": user.email, "role": user.role})
        print(f"Token: {token[:50]}...\n")
        
        # Make request with full error details
        headers = {
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json"
        }
        
        try:
            async with httpx.AsyncClient(timeout=10) as client:
                print("Making GET request...")
                response = await client.get(
                    f"{BASE_URL}/api/v1/rooms/{room_id}/messages",
                    headers=headers
                )
                
                print(f"Status: {response.status_code}")
                print(f"Response: {response.text}")
                
                if response.status_code == 200:
                    messages = response.json()
                    print(f"\n✅ SUCCESS! Found {len(messages)} messages")
                    for msg in messages:
                        print(f"  - {msg.get('sender_name')}: {msg.get('content')[:50]}")
                else:
                    print(f"\n❌ ERROR: {response.status_code}")
                    print(f"Body: {response.text}")
        
        except Exception as e:
            print(f"❌ Exception: {e}")
            import traceback
            traceback.print_exc()

asyncio.run(test_detailed())
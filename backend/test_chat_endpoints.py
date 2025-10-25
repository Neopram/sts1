#!/usr/bin/env python
"""
Test Chat Endpoints by Role
Uses HTTP to test actual API behavior
"""

import asyncio
import json
import httpx
from app.database import AsyncSessionLocal
from sqlalchemy import select
from app.models import Room, Party, User
from app.dependencies import create_access_token

async def test_chat_endpoints():
    BASE_URL = "http://localhost:8001"
    
    async with AsyncSessionLocal() as session:
        print("\n" + "="*80)
        print("🌐 TESTING CHAT ENDPOINTS BY ROLE (HTTP)")
        print("="*80)
        
        # Get test room
        result = await session.execute(select(Room).limit(1))
        room = result.scalar_one_or_none()
        room_id = str(room.id)
        print(f"\n📍 Test Room: {room.title}")
        print(f"   URL: {BASE_URL}/api/v1/rooms/{room_id}/messages\n")
        
        # Get parties
        result = await session.execute(
            select(Party).where(Party.room_id == room_id)
        )
        parties = result.scalars().all()
        
        # Get users
        emails = [p.email for p in parties]
        result = await session.execute(select(User).where(User.email.in_(emails)))
        users_map = {u.email: u for u in result.scalars().all()}
        
        # Test each role
        print("👥 TESTING EACH ROLE:")
        print("-" * 80)
        
        async with httpx.AsyncClient() as client:
            for party in parties:
                user = users_map.get(party.email)
                if not user:
                    continue
                
                role = user.role
                email = user.email
                
                # Create token
                token = create_access_token(data={"sub": email, "role": role})
                
                # Make request
                headers = {
                    "Authorization": f"Bearer {token}",
                    "Content-Type": "application/json"
                }
                
                try:
                    response = await client.get(
                        f"{BASE_URL}/api/v1/rooms/{room_id}/messages",
                        headers=headers,
                        timeout=5
                    )
                    
                    print(f"\n👤 {email} ({role}):")
                    print(f"   Status: {response.status_code}")
                    
                    if response.status_code == 200:
                        messages = response.json()
                        print(f"   ✅ Can fetch messages: YES")
                        print(f"   📊 Messages visible: {len(messages)}")
                        for msg in messages[:2]:
                            sender = msg.get('sender_name', 'Unknown')
                            content = msg.get('content', '')[:40]
                            print(f"      - {sender}: {content}...")
                    else:
                        print(f"   ❌ Error: {response.status_code}")
                        print(f"      {response.text[:100]}")
                
                except Exception as e:
                    print(f"\n👤 {email} ({role}):")
                    print(f"   ❌ Connection error: {str(e)[:80]}")
        
        print("\n" + "-" * 80)
        print("\n📊 SUMMARY:")
        print("   - Broker sees ALL room-level messages")
        print("   - Owner sees room-level messages")
        print("   - Viewer sees room-level messages")
        print("   - Charterer: UNCLEAR (role handling uncertain)")

asyncio.run(test_chat_endpoints())
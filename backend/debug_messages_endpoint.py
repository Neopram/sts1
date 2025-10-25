#!/usr/bin/env python
"""
Debug the messages endpoint to find the exact error
"""

import asyncio
import traceback
from app.database import AsyncSessionLocal
from sqlalchemy import select
from app.models import Room, Party, User, Message
from app.dependencies import get_user_accessible_vessels

async def debug():
    async with AsyncSessionLocal() as session:
        try:
            # Get test data
            result = await session.execute(select(Room).limit(1))
            room = result.scalar_one_or_none()
            room_id = str(room.id)
            print(f"Room: {room_id}")
            
            # Get a party
            result = await session.execute(
                select(Party).where(Party.room_id == room_id).limit(1)
            )
            party = result.scalar_one_or_none()
            
            # Get user
            result = await session.execute(
                select(User).where(User.email == party.email)
            )
            user = result.scalar_one_or_none()
            print(f"User: {user.email} ({user.role})")
            
            # Test get_user_accessible_vessels
            print("\nCalling get_user_accessible_vessels...")
            try:
                accessible_vessels = await get_user_accessible_vessels(room_id, user.email, session)
                print(f"✅ accessible_vessels returned: {accessible_vessels}")
            except Exception as e:
                print(f"❌ get_user_accessible_vessels failed:")
                traceback.print_exc()
                return
            
            # Now simulate the endpoint logic
            print("\nSimulating endpoint logic...")
            
            if accessible_vessels:
                print("  - Has vessel access")
            else:
                print("  - No vessel access")
                if user.role == "broker":
                    print("  - User is broker, can see room-level messages")
                else:
                    print(f"  - User is {user.role}, cannot see messages")
            
            # Get messages
            print("\nFetching messages...")
            result = await session.execute(
                select(Message).where(Message.room_id == room_id, Message.vessel_id.is_(None))
            )
            messages = result.scalars().all()
            print(f"✅ Found {len(messages)} room-level messages")
            
            for msg in messages[:3]:
                print(f"  - {msg.sender_name}: {msg.content[:40]}...")
            
            print("\n✅ ALL TESTS PASSED")
        
        except Exception as e:
            print(f"\n❌ ERROR: {e}")
            traceback.print_exc()

asyncio.run(debug())
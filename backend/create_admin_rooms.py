#!/usr/bin/env python3
"""
Create sample rooms for admin user
"""

import asyncio
from datetime import datetime, timedelta
from sqlalchemy import select
from app.database import get_async_session
from app.models import Room, User, Party

async def create_admin_rooms():
    """Create sample rooms for admin user"""
    print("🏢 Creating sample rooms for admin user...")
    
    async for session in get_async_session():
        try:
            # Get admin user
            result = await session.execute(
                select(User).where(User.email == "admin@sts.com")
            )
            admin_user = result.scalar_one_or_none()
            
            if not admin_user:
                print("❌ Admin user not found!")
                return
            
            print(f"✅ Found admin user: {admin_user.email}")
            
            # Check existing rooms
            result = await session.execute(
                select(Room).where(Room.created_by == admin_user.email)
            )
            existing_rooms = result.scalars().all()
            
            if existing_rooms:
                print(f"ℹ️  Admin already has {len(existing_rooms)} rooms")
                for room in existing_rooms:
                    print(f"   - {room.title}")
                return
            
            # Create sample rooms
            rooms_data = [
                {
                    "title": "STS Operation Alpha - Mediterranean",
                    "location": "Gibraltar Strait",
                    "sts_eta": datetime.utcnow() + timedelta(days=5),
                    "description": "Bulk carrier to tanker transfer operation"
                },
                {
                    "title": "STS Operation Beta - Atlantic",
                    "location": "Canary Islands",
                    "sts_eta": datetime.utcnow() + timedelta(days=10),
                    "description": "Container ship to container ship transfer"
                },
                {
                    "title": "STS Operation Gamma - Pacific",
                    "location": "Singapore Strait",
                    "sts_eta": datetime.utcnow() + timedelta(days=15),
                    "description": "LNG carrier transfer operation"
                },
                {
                    "title": "STS Operation Delta - North Sea",
                    "location": "Rotterdam Port",
                    "sts_eta": datetime.utcnow() + timedelta(days=7),
                    "description": "Oil tanker to oil tanker transfer"
                }
            ]
            
            created_rooms = []
            for room_data in rooms_data:
                room = Room(
                    title=room_data["title"],
                    location=room_data["location"],
                    sts_eta=room_data["sts_eta"],
                    created_by=admin_user.email,
                    status="active"
                )
                session.add(room)
                await session.flush()  # Get the room ID
                
                # Add admin as owner party
                party = Party(
                    room_id=room.id,
                    email=admin_user.email,
                    name=admin_user.name,
                    role="owner"
                )
                session.add(party)
                
                created_rooms.append(room)
                print(f"✅ Created room: {room.title}")
            
            await session.commit()
            
            print(f"\n🎉 Successfully created {len(created_rooms)} rooms for admin user!")
            print("\n📋 Rooms created:")
            for room in created_rooms:
                print(f"   - {room.title}")
                print(f"     Location: {room.location}")
                print(f"     ETA: {room.sts_eta.strftime('%Y-%m-%d')}")
            
        except Exception as e:
            print(f"❌ Error: {e}")
            await session.rollback()
            raise
        finally:
            await session.close()
        break

if __name__ == "__main__":
    asyncio.run(create_admin_rooms())

#!/usr/bin/env python3
"""
Script to create test data and fix frontend loading issues
"""

import asyncio
import json
import uuid
from datetime import datetime, timedelta
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from app.models import User, Room, Vessel, Document, ActivityLog
from app.database import Base
import bcrypt

DATABASE_URL = "sqlite+aiosqlite:///./sts_clearance.db"

async def create_test_data():
    """Create comprehensive test data for frontend"""
    print("🔧 Creating test data for frontend...")
    
    # Create async engine and session
    engine = create_async_engine(DATABASE_URL, echo=False)
    async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    
    async with async_session() as session:
        try:
            # Create test users
            print("👥 Creating test users...")
            
            # Hash password
            password_hash = bcrypt.hashpw("admin123".encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
            
            users_data = [
                {
                    "id": str(uuid.uuid4()),
                    "email": "admin@sts.com",
                    "name": "System Administrator",
                    "password_hash": password_hash,
                    "role": "admin",
                    "is_active": True
                },
                {
                    "id": str(uuid.uuid4()),
                    "email": "operator@sts.com", 
                    "name": "STS Operator",
                    "password_hash": password_hash,
                    "role": "operator",
                    "is_active": True
                },
                {
                    "id": str(uuid.uuid4()),
                    "email": "viewer@sts.com",
                    "name": "Port Viewer",
                    "password_hash": password_hash,
                    "role": "viewer", 
                    "is_active": True
                }
            ]
            
            created_users = []
            for user_data in users_data:
                # Check if user exists
                existing = await session.get(User, user_data["id"])
                if not existing:
                    user = User(**user_data)
                    session.add(user)
                    created_users.append(user)
                    print(f"  ✅ Created user: {user_data['email']}")
                else:
                    created_users.append(existing)
                    print(f"  ℹ️ User exists: {user_data['email']}")
            
            await session.commit()
            
            # Create test vessels
            print("🚢 Creating test vessels...")
            
            vessels_data = [
                {
                    "id": str(uuid.uuid4()),
                    "name": "MV Atlantic Pioneer",
                    "imo": "IMO9876543",
                    "flag": "Panama",
                    "vessel_type": "Tanker",
                    "dwt": 75000,
                    "built_year": 2018
                },
                {
                    "id": str(uuid.uuid4()),
                    "name": "MV Pacific Explorer", 
                    "imo": "IMO9876544",
                    "flag": "Liberia",
                    "vessel_type": "Bulk Carrier",
                    "dwt": 82000,
                    "built_year": 2020
                }
            ]
            
            created_vessels = []
            for vessel_data in vessels_data:
                existing = await session.get(Vessel, vessel_data["id"])
                if not existing:
                    vessel = Vessel(**vessel_data)
                    session.add(vessel)
                    created_vessels.append(vessel)
                    print(f"  ✅ Created vessel: {vessel_data['name']}")
                else:
                    created_vessels.append(existing)
                    print(f"  ℹ️ Vessel exists: {vessel_data['name']}")
            
            await session.commit()
            
            # Create test rooms
            print("🏢 Creating test rooms...")
            
            # Use the specific room ID that frontend is looking for
            target_room_id = "cc16287c-9579-43e0-a9a4-c565a814c1e7"
            
            rooms_data = [
                {
                    "id": target_room_id,  # Use the exact ID frontend is requesting
                    "title": "STS Operation - Atlantic Pioneer & Pacific Explorer",
                    "location": "Port of Rotterdam - Anchorage A1",
                    "status": "active",
                    "parties": ["Atlantic Pioneer", "Pacific Explorer", "Port Authority"],
                    "created_by": created_users[0].id,
                    "created_at": datetime.utcnow(),
                    "updated_at": datetime.utcnow()
                },
                {
                    "id": str(uuid.uuid4()),
                    "title": "STS Operation - Emergency Transfer",
                    "location": "Port of Singapore - Zone B",
                    "status": "pending",
                    "parties": ["Emergency Vessel", "Support Vessel"],
                    "created_by": created_users[1].id,
                    "created_at": datetime.utcnow(),
                    "updated_at": datetime.utcnow()
                }
            ]
            
            created_rooms = []
            for room_data in rooms_data:
                existing = await session.get(Room, room_data["id"])
                if not existing:
                    room = Room(**room_data)
                    session.add(room)
                    created_rooms.append(room)
                    print(f"  ✅ Created room: {room_data['title']}")
                    print(f"    📍 ID: {room_data['id']}")
                else:
                    created_rooms.append(existing)
                    print(f"  ℹ️ Room exists: {room_data['title']}")
            
            await session.commit()
            
            # Create test activities for the target room
            print("📋 Creating test activities...")
            
            activities_data = [
                {
                    "id": str(uuid.uuid4()),
                    "room_id": target_room_id,
                    "user_id": created_users[0].id,
                    "action": "room_created",
                    "details": {"message": "STS operation room created"},
                    "timestamp": datetime.utcnow()
                },
                {
                    "id": str(uuid.uuid4()),
                    "room_id": target_room_id,
                    "user_id": created_users[1].id,
                    "action": "vessel_added",
                    "details": {"vessel": "Atlantic Pioneer", "message": "Vessel added to operation"},
                    "timestamp": datetime.utcnow() + timedelta(minutes=5)
                }
            ]
            
            for activity_data in activities_data:
                existing = await session.get(ActivityLog, activity_data["id"])
                if not existing:
                    activity = ActivityLog(**activity_data)
                    session.add(activity)
                    print(f"  ✅ Created activity: {activity_data['action']}")
            
            await session.commit()
            
            print("\n🎉 Test data creation completed successfully!")
            print(f"📊 Summary:")
            print(f"  - Users: {len(users_data)}")
            print(f"  - Vessels: {len(vessels_data)}")
            print(f"  - Rooms: {len(rooms_data)}")
            print(f"  - Activities: {len(activities_data)}")
            print(f"\n🔑 Login credentials:")
            print(f"  - admin@sts.com / admin123")
            print(f"  - operator@sts.com / admin123")
            print(f"  - viewer@sts.com / admin123")
            print(f"\n🏢 Target room ID: {target_room_id}")
            
        except Exception as e:
            print(f"❌ Error creating test data: {e}")
            await session.rollback()
            raise
        finally:
            await session.close()
    
    await engine.dispose()

if __name__ == "__main__":
    asyncio.run(create_test_data())
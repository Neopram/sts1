#!/usr/bin/env python3
"""Debug script to check documents and versions in database"""

import asyncio
import sys
from sqlalchemy import select
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker

# Add backend to path
sys.path.insert(0, 'c:/Users/feder/Desktop/StsHub/sts/backend')

from app.models import Document, DocumentVersion, User, Room, Party, Vessel
from app.database import DATABASE_URL

async def debug_documents():
    # Create async engine
    engine = create_async_engine(DATABASE_URL)
    async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    
    async with async_session() as session:
        # Get admin user
        print("=" * 60)
        print("ADMIN USER")
        print("=" * 60)
        admin_result = await session.execute(
            select(User).where(User.email == "admin@sts.com")
        )
        admin = admin_result.scalar_one_or_none()
        if admin:
            print(f"ID: {admin.id}")
            print(f"Email: {admin.email}")
            print(f"Role: {admin.role}")
            print(f"Company: {admin.company}")
        else:
            print("Admin user not found")
        
        # Get rooms
        print("\n" + "=" * 60)
        print("ROOMS")
        print("=" * 60)
        rooms_result = await session.execute(select(Room))
        rooms = rooms_result.scalars().all()
        print(f"Total rooms: {len(rooms)}")
        for room in rooms:
            print(f"  - {room.id}")
        
        # Use specific room from logs or first room
        target_room = "4864508d-8f7e-4bf7-bf02-dc1fdb0746b4"
        if rooms:
            room_id = target_room  # Use the room from the logs
            print(f"\nUsing room: {room_id}")
            
            # Get parties in room
            print("\n" + "=" * 60)
            print(f"PARTIES IN ROOM {room_id}")
            print("=" * 60)
            parties_result = await session.execute(
                select(Party).where(Party.room_id == room_id)
            )
            parties = parties_result.scalars().all()
            print(f"Total parties: {len(parties)}")
            for party in parties:
                print(f"  - {party.email}: {party.role}")
            
            # Get vessels in room
            print("\n" + "=" * 60)
            print(f"VESSELS IN ROOM {room_id}")
            print("=" * 60)
            vessels_result = await session.execute(
                select(Vessel).where(Vessel.room_id == room_id)
            )
            vessels = vessels_result.scalars().all()
            print(f"Total vessels: {len(vessels)}")
            for vessel in vessels:
                print(f"  - {vessel.id}: {vessel.imo} (charterer: {vessel.charterer})")
            
            # Get documents in room
            print("\n" + "=" * 60)
            print(f"DOCUMENTS IN ROOM {room_id}")
            print("=" * 60)
            from sqlalchemy.orm import joinedload
            docs_result = await session.execute(
                select(Document)
                .where(Document.room_id == room_id)
                .options(joinedload(Document.versions))
            )
            docs = docs_result.unique().scalars().all()
            print(f"Total documents: {len(docs)}")
            for doc in docs:
                print(f"  - ID: {doc.id}")
                print(f"    Type ID: {doc.type_id}")
                print(f"    Vessel ID: {doc.vessel_id}")
                print(f"    Status: {doc.status}")
                print(f"    Uploaded by: {doc.uploaded_by}")
                print(f"    Uploaded at: {doc.uploaded_at}")
                print(f"    Versions count: {len(doc.versions) if doc.versions else 0}")
                if doc.versions:
                    for ver in doc.versions:
                        print(f"      - Version {ver.id}: {ver.file_url}")

if __name__ == "__main__":
    asyncio.run(debug_documents())
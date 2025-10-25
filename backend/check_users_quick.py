#!/usr/bin/env python3
import asyncio
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))

from app.database import get_async_session
from app.models import User, Room, Document
from sqlalchemy import select

async def check():
    async for session in get_async_session():
        # Get users
        users_result = await session.execute(select(User))
        users = users_result.scalars().all()
        print(f"Found {len(users)} users:")
        for u in users:
            print(f"  - {u.email} (role: {u.role})")
        
        # Get rooms
        rooms_result = await session.execute(select(Room))
        rooms = rooms_result.scalars().all()
        print(f"\nFound {len(rooms)} rooms:")
        for r in rooms:
            room_name = getattr(r, 'name', 'unknown') or getattr(r, 'operation', 'unknown')
            print(f"  - {room_name} (id: {r.id})")
        
        # Get documents
        docs_result = await session.execute(select(Document))
        docs = docs_result.scalars().all()
        print(f"\nFound {len(docs)} documents:")
        for d in docs:
            print(f"  - {d.id} (status: {d.status}, vessel_id: {d.vessel_id})")
        
        break

asyncio.run(check())
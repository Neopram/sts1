#!/usr/bin/env python3
"""
Simple script to check rooms in database
"""

import asyncio
from app.database import get_async_session
from app.models import Room
from sqlalchemy import select

async def main():
    async for session in get_async_session():
        try:
            result = await session.execute(select(Room))
            rooms = result.scalars().all()
            print(f"Found {len(rooms)} rooms:")
            for room in rooms:
                print(f"- {room.id}: {room.title}")
        except Exception as e:
            print(f"Error: {e}")
        finally:
            await session.close()
        break

if __name__ == "__main__":
    asyncio.run(main())

import asyncio
from app.database import get_async_session
from app.models import Party
from sqlalchemy import select

async def check_parties():
    async for session in get_async_session():
        result = await session.execute(select(Party).where(Party.email == 'admin@sts.com'))
        parties = result.scalars().all()
        print('Parties for admin@sts.com:')
        for party in parties:
            print(f'  Room ID: {party.room_id}, Role: {party.role}, Name: {party.name}')
        break

if __name__ == "__main__":
    asyncio.run(check_parties())

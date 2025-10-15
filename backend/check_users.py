import asyncio
from app.database import get_async_session
from app.models import User
from sqlalchemy import select

async def check_users():
    async for session in get_async_session():
        result = await session.execute(select(User))
        users = result.scalars().all()
        for user in users:
            print(f'{user.email}: {user.password_hash}')
        break

if __name__ == "__main__":
    asyncio.run(check_users())

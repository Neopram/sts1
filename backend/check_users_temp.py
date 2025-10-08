import asyncio
from sqlalchemy import text
from app.database import get_async_session

async def check_users():
    async for session in get_async_session():
        result = await session.execute(text('SELECT email, name, role FROM users'))
        users = result.fetchall()
        print('Users in database:')
        if users:
            for user in users:
                print(f'  - Email: {user[0]}, Name: {user[1]}, Role: {user[2]}')
        else:
            print('  No users found!')
        break

if __name__ == "__main__":
    asyncio.run(check_users())

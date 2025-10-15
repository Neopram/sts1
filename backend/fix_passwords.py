import asyncio
import bcrypt
from app.database import get_async_session
from app.models import User
from sqlalchemy import select, update

async def fix_passwords():
    """Fix passwords for users that don't have them set"""
    async for session in get_async_session():
        try:
            # Get all users
            result = await session.execute(select(User))
            users = result.scalars().all()

            password_map = {
                'admin@sts.com': 'admin123',
                'owner@sts.com': 'owner123',
                'charterer@sts.com': 'charterer123',
                'broker@sts.com': 'broker123',
                'viewer@sts.com': 'viewer123',
                'test@sts.com': 'test123'
            }

            for user in users:
                if user.email in password_map and not user.password_hash:
                    # Hash the password
                    hashed_password = bcrypt.hashpw(password_map[user.email].encode('utf-8'), bcrypt.gensalt())
                    # Update the user
                    await session.execute(
                        update(User).where(User.email == user.email).values(
                            password_hash=hashed_password.decode('utf-8')
                        )
                    )
                    print(f"Fixed password for: {user.email}")

            await session.commit()
            print("✅ Passwords fixed successfully!")

        except Exception as e:
            print(f"Error fixing passwords: {e}")
            await session.rollback()
        finally:
            await session.close()
        break

if __name__ == "__main__":
    asyncio.run(fix_passwords())

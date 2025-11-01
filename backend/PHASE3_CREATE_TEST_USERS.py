import sys
import io
if sys.platform == 'win32':
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8', errors='replace')
"""
PHASE 3: CREATE TEST USERS FOR ALL ROLES
========================================
Creates test users for each role to enable comprehensive endpoint testing.
Idempotent - safe to run multiple times.

Roles Created:
- admin@stsclearance.com (ADMIN)
- charterer@stsclearance.com (CHARTERER)
- broker@stsclearance.com (BROKER)
- owner@stsclearance.com (SHIPOWNER)
- inspector@stsclearance.com (INSPECTOR)
- viewer@stsclearance.com (VIEWER)

All passwords: role123
"""

import asyncio
import logging
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from sqlalchemy import select

import sys
sys.path.insert(0, "c:\\Users\\feder\\Desktop\\StsHub\\sts\\backend")

from app.models import User
from app.config.settings import Settings
from app.database import get_async_session_factory

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Test users to create
TEST_USERS = [
    {
        "email": "admin@stsclearance.com",
        "password": "admin123",
        "full_name": "Admin User",
        "role": "admin",
        "is_active": True,
    },
    {
        "email": "charterer@stsclearance.com",
        "password": "charterer123",
        "full_name": "Charterer User",
        "role": "charterer",
        "is_active": True,
    },
    {
        "email": "broker@stsclearance.com",
        "password": "broker123",
        "full_name": "Broker User",
        "role": "broker",
        "is_active": True,
    },
    {
        "email": "owner@stsclearance.com",
        "password": "owner123",
        "full_name": "Shipowner User",
        "role": "owner",
        "is_active": True,
    },
    {
        "email": "inspector@stsclearance.com",
        "password": "inspector123",
        "full_name": "Inspector User",
        "role": "inspector",
        "is_active": True,
    },
    {
        "email": "viewer@stsclearance.com",
        "password": "viewer123",
        "full_name": "Viewer User",
        "role": "viewer",
        "is_active": True,
    },
]


async def create_test_users():
    """Create test users in database"""
    settings = Settings()
    
    try:
        # Get session factory
        engine = create_async_engine(
            settings.database_url,
            echo=False,
            pool_pre_ping=True,
        )
        
        async_session = sessionmaker(
            engine,
            class_=AsyncSession,
            expire_on_commit=False,
        )
        
        async with async_session() as session:
            print("\n" + "=" * 80)
            print("🛠️  CREATING TEST USERS")
            print("=" * 80)
            
            for user_data in TEST_USERS:
                try:
                    # Check if user exists
                    stmt = select(User).where(User.email == user_data["email"])
                    result = await session.execute(stmt)
                    existing_user = result.scalar_one_or_none()
                    
                    if existing_user:
                        print(f"✓ {user_data['email']} ({user_data['role']}) - Already exists")
                    else:
                        # Create new user
                        new_user = User(
                            email=user_data["email"],
                            full_name=user_data["full_name"],
                            role=user_data["role"],
                            is_active=user_data["is_active"],
                        )
                        new_user.set_password(user_data["password"])
                        
                        session.add(new_user)
                        await session.commit()
                        print(f"✅ {user_data['email']} ({user_data['role']}) - Created")
                        
                except Exception as e:
                    await session.rollback()
                    print(f"❌ {user_data['email']} - Error: {str(e)}")
            
            print("=" * 80)
            print("✅ Test user creation completed!")
            print("\n📝 LOGIN CREDENTIALS:")
            print("-" * 80)
            for user in TEST_USERS:
                print(f"{user['email']:<35} | {user['password']:<15} | {user['role'].upper()}")
            print("=" * 80)
        
        await engine.dispose()
        
    except Exception as e:
        logger.error(f"Error creating test users: {e}")
        raise


if __name__ == "__main__":
    try:
        asyncio.run(create_test_users())
    except KeyboardInterrupt:
        print("\n⚠️  Operation cancelled by user")
        sys.exit(0)
    except Exception as e:
        print(f"\n❌ Fatal error: {e}")
        sys.exit(1)
import sys
import io
if sys.platform == 'win32':
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8', errors='replace')
#!/usr/bin/env python3
"""
Script to create test users for all roles in the STS Clearance Hub system
"""

import asyncio
import sys
from pathlib import Path

# Add the project root to the Python path
sys.path.insert(0, str(Path(__file__).parent))

from app.database import get_async_session, init_db
from app.models import User
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker
from passlib.hash import bcrypt
import os

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite+aiosqlite:///./sts_clearance.db")

TEST_USERS = [
    {
        "email": "admin@sts.com",
        "name": "Admin User",
        "role": "admin",
        "password": "password123",
        "company": "STS Admin"
    },
    {
        "email": "broker@sts.com",
        "name": "Broker User",
        "role": "broker",
        "password": "password123",
        "company": "Trading Broker Inc"
    },
    {
        "email": "owner@sts.com",
        "name": "Vessel Owner",
        "role": "owner",
        "password": "password123",
        "company": "Shipping Company Ltd"
    },
    {
        "email": "seller@sts.com",
        "name": "Seller",
        "role": "seller",
        "password": "password123",
        "company": "Trading Seller Co"
    },
    {
        "email": "buyer@sts.com",
        "name": "Buyer",
        "role": "buyer",
        "password": "password123",
        "company": "Buyer Corporation"
    },
    {
        "email": "viewer@sts.com",
        "name": "Viewer User",
        "role": "viewer",
        "password": "password123",
        "company": "Viewer Organization"
    }
]

async def create_test_users():
    """Create test users for all roles"""
    
    # Create async engine
    engine = create_async_engine(
        DATABASE_URL,
        echo=False,
        future=True,
        connect_args={"timeout": 30} if "sqlite" in DATABASE_URL else {}
    )
    
    # Create session factory
    async_session = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    
    try:
        # Initialize database
        print("✓ Initializing database...")
        await init_db(engine)
        
        async with async_session() as session:
            print(f"\n📝 Creating {len(TEST_USERS)} test users...\n")
            
            for user_data in TEST_USERS:
                try:
                    # Check if user already exists
                    result = await session.execute(
                        select(User).where(User.email == user_data["email"]).limit(1)
                    )
                    existing_user = result.scalar_one_or_none()
                    
                    if existing_user:
                        print(f"⏭️  {user_data['email']} - Already exists")
                        continue
                    
                    # Hash password
                    hashed_password = bcrypt.hashpw(
                        user_data["password"].encode('utf-8'),
                        bcrypt.gensalt()
                    )
                    
                    # Create user
                    user = User(
                        email=user_data["email"],
                        name=user_data["name"],
                        role=user_data["role"],
                        company=user_data["company"],
                        password_hash=hashed_password.decode('utf-8'),
                        is_active=True
                    )
                    session.add(user)
                    await session.flush()
                    
                    print(f"✅ {user_data['email']} ({user_data['role']}) - Created")
                    
                except Exception as e:
                    print(f"❌ Error creating {user_data['email']}: {e}")
                    continue
            
            # Commit all changes
            await session.commit()
        
        print(f"\n✓ Test users created successfully!")
        print("\n📋 Available Test Credentials:")
        print("-" * 60)
        for user in TEST_USERS:
            print(f"  Email: {user['email']:<25} Role: {user['role']:<10}")
            print(f"  Password: {user['password']}")
            print()
        
    except Exception as e:
        print(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()
    finally:
        await engine.dispose()

if __name__ == "__main__":
    print("🚀 STS Clearance Hub - Test User Creation")
    print("=" * 60)
    asyncio.run(create_test_users())
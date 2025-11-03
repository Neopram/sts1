#!/usr/bin/env python
"""
Initialize database tables and create demo users for testing
"""
import asyncio
import os
import sys
sys.path.insert(0, os.path.dirname(__file__))

from app.database import engine, AsyncSessionLocal
from app.models import Base, User
from passlib.hash import bcrypt
from sqlalchemy import select
import uuid

async def initialize_database():
    """Initialize all database tables"""
    print("\n=== INITIALIZING DATABASE ===")
    try:
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)
        print("✓ Database tables created successfully")
        return True
    except Exception as e:
        print(f"✗ Error creating database tables: {e}")
        import traceback
        traceback.print_exc()
        return False

async def create_demo_users():
    """Create demo users for testing"""
    print("\n=== CREATING DEMO USERS ===")
    
    demo_users = [
        {
            "email": "admin@sts.com",
            "name": "Admin User",
            "role": "admin",
            "company": "STS Admin"
        },
        {
            "email": "broker@sts.com",
            "name": "Broker User",
            "role": "broker",
            "company": "STS Broker"
        },
        {
            "email": "owner@sts.com",
            "name": "Owner User",
            "role": "owner",
            "company": "STS Owner"
        },
        {
            "email": "seller@sts.com",
            "name": "Seller User",
            "role": "seller",
            "company": "STS Seller"
        },
        {
            "email": "buyer@sts.com",
            "name": "Buyer User",
            "role": "buyer",
            "company": "STS Buyer"
        },
        {
            "email": "viewer@sts.com",
            "name": "Viewer User",
            "role": "viewer",
            "company": "STS Viewer"
        },
    ]
    
    password = "password123"
    hashed_password = bcrypt.hash(password)
    
    async with AsyncSessionLocal() as session:
        try:
            for user_data in demo_users:
                # Check if user exists
                result = await session.execute(
                    select(User).where(User.email == user_data["email"])
                )
                existing_user = result.scalar_one_or_none()
                
                if not existing_user:
                    # Create user
                    user = User(
                        id=str(uuid.uuid4()),
                        email=user_data["email"],
                        name=user_data["name"],
                        role=user_data["role"],
                        company=user_data["company"],
                        password_hash=hashed_password,
                        is_active=True
                    )
                    session.add(user)
                    print(f"  ✓ Created user: {user_data['email']} ({user_data['role']})")
                else:
                    print(f"  - User already exists: {user_data['email']}")
            
            await session.commit()
            print("\n✓ Demo users created/verified successfully")
            return True
        except Exception as e:
            await session.rollback()
            print(f"✗ Error creating demo users: {e}")
            import traceback
            traceback.print_exc()
            return False

async def verify_database():
    """Verify database is ready"""
    print("\n=== VERIFYING DATABASE ===")
    try:
        async with AsyncSessionLocal() as session:
            result = await session.execute(select(User))
            users = result.scalars().all()
            print(f"✓ Users table accessible: {len(users)} users found")
            
            if len(users) > 0:
                print("\nUsers in database:")
                for user in users:
                    print(f"  - {user.email} ({user.role})")
            
            return True
    except Exception as e:
        print(f"✗ Error verifying database: {e}")
        import traceback
        traceback.print_exc()
        return False

async def main():
    print("╔════════════════════════════════════════════════════════════════╗")
    print("║           DATABASE INITIALIZATION SCRIPT                       ║")
    print("╚════════════════════════════════════════════════════════════════╝")
    
    # Initialize database
    if not await initialize_database():
        return False
    
    # Create demo users
    if not await create_demo_users():
        return False
    
    # Verify
    if not await verify_database():
        return False
    
    print("\n✅ Database initialization completed successfully!")
    print("   You can now login with:")
    print("   Email: admin@sts.com / broker@sts.com / etc.")
    print("   Password: password123")
    
    return True

if __name__ == "__main__":
    success = asyncio.run(main())
    sys.exit(0 if success else 1)
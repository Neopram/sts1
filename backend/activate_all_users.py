#!/usr/bin/env python3
"""
Complete User Activation Script
Creates and activates all 7 roles with test users
All users have password: SecurePassword@123
"""

import asyncio
import sys
from datetime import datetime, timedelta
from sqlalchemy import select, delete, update
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from passlib.hash import bcrypt
from app.models import User, Party, Room
from app.database import DATABASE_URL

# All users to create - 1 per role
USERS_TO_CREATE = [
    {
        "email": "admin@stshub.com",
        "name": "Admin User",
        "company": "STS Hub",
        "role": "admin",
        "password": "SecurePassword@123",
    },
    {
        "email": "broker@stshub.com",
        "name": "John Broker",
        "company": "Global Brokers Ltd",
        "role": "broker",
        "password": "SecurePassword@123",
    },
    {
        "email": "owner@stshub.com",
        "name": "Captain Owner",
        "company": "Vessel Owners Inc",
        "role": "owner",
        "password": "SecurePassword@123",
    },
    {
        "email": "charterer@stshub.com",
        "name": "Charter Manager",
        "company": "Charter Operations Co",
        "role": "charterer",
        "password": "SecurePassword@123",
    },
    {
        "email": "seller@stshub.com",
        "name": "Product Seller",
        "company": "Supply Chain Ltd",
        "role": "seller",
        "password": "SecurePassword@123",
    },
    {
        "email": "buyer@stshub.com",
        "name": "Procurement Officer",
        "company": "Retail Corp",
        "role": "buyer",
        "password": "SecurePassword@123",
    },
    {
        "email": "viewer@stshub.com",
        "name": "View Only User",
        "company": "Audit Firm",
        "role": "viewer",
        "password": "SecurePassword@123",
    },
]


async def main():
    """Main function to activate all users"""
    try:
        # Create async engine
        engine = create_async_engine(DATABASE_URL, echo=False)
        
        # Create session factory
        AsyncSessionLocal = sessionmaker(
            engine, class_=AsyncSession, expire_on_commit=False
        )
        
        async with AsyncSessionLocal() as session:
            print("=" * 80)
            print("🔐 STS HUB - COMPLETE USER ACTIVATION")
            print("=" * 80)
            print()
            
            # Delete existing test users first
            print("🗑️  Cleaning up existing test users...")
            for user_data in USERS_TO_CREATE:
                await session.execute(
                    delete(User).where(User.email == user_data["email"])
                )
            await session.commit()
            print("✅ Cleanup complete")
            print()
            
            # Create all users
            print("👥 Creating users...")
            print("-" * 80)
            
            created_users = []
            for user_data in USERS_TO_CREATE:
                # Hash password using passlib bcrypt context
                hashed_pwd = bcrypt.hash(user_data["password"])
                
                # Create user
                new_user = User(
                    email=user_data["email"],
                    name=user_data["name"],
                    company=user_data["company"],
                    role=user_data["role"],
                    password_hash=hashed_pwd,
                    is_active=True,
                    last_login=datetime.utcnow() - timedelta(hours=1),
                )
                
                session.add(new_user)
                created_users.append(new_user)
                
                print(f"  ✓ {user_data['role']:12} | {user_data['email']:25} | {user_data['name']}")
            
            await session.flush()
            await session.commit()
            print("-" * 80)
            print(f"✅ {len(created_users)} users created successfully")
            print()
            
            # Verify all users can be retrieved
            print("🔍 Verifying users...")
            print("-" * 80)
            
            result = await session.execute(select(User).order_by(User.role))
            all_users = result.scalars().all()
            
            for user in all_users:
                try:
                    verified = bcrypt.verify("SecurePassword@123", user.password_hash)
                except Exception:
                    verified = False
                status = "✓" if verified else "✗"
                print(f"  {status} {user.role:12} | {user.email:25} | Active: {user.is_active}")
            
            print("-" * 80)
            print(f"✅ {len(all_users)} users verified")
            print()
            
            # Summary
            print("=" * 80)
            print("📊 SUMMARY")
            print("=" * 80)
            print(f"Total Users: {len(all_users)}")
            print(f"All Roles Active: {', '.join([u.role for u in all_users])}")
            print(f"Default Password: SecurePassword@123")
            print()
            print("🎯 Next Steps:")
            print("  1. Start the backend server")
            print("  2. Test login with any user above")
            print("  3. Verify each role's dashboard loads correctly")
            print("  4. Create test data (operations, documents, etc.)")
            print()
            print("=" * 80)
            
    except Exception as e:
        print(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
    finally:
        await engine.dispose()


if __name__ == "__main__":
    asyncio.run(main())
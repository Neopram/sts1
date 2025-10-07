#!/usr/bin/env python3
"""
Check what users actually exist in the database
"""

import asyncio
import sys
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from sqlalchemy import text

DATABASE_URL = "sqlite+aiosqlite:///./sts_clearance.db"

async def check_database_users():
    """Check what users are in the database"""
    print("🔍 Checking database users...")
    
    engine = create_async_engine(DATABASE_URL, echo=False)
    async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    
    try:
        async with async_session() as session:
            # Check if users table exists
            result = await session.execute(text("SELECT name FROM sqlite_master WHERE type='table' AND name='users'"))
            table_exists = result.fetchone()
            
            if not table_exists:
                print("❌ Users table does not exist!")
                return
            
            print("✅ Users table exists")
            
            # Get all users
            result = await session.execute(text("SELECT id, email, name, role, is_active, password_hash FROM users"))
            users = result.fetchall()
            
            print(f"\n📊 Found {len(users)} users in database:")
            print("-" * 80)
            
            for user in users:
                user_id, email, name, role, is_active, password_hash = user
                print(f"ID: {user_id}")
                print(f"Email: {email}")
                print(f"Name: {name}")
                print(f"Role: {role}")
                print(f"Active: {is_active}")
                print(f"Has Password: {'Yes' if password_hash else 'No'}")
                print(f"Password Hash: {password_hash[:20]}..." if password_hash else "No password hash")
                print("-" * 40)
            
            # Test password verification for known users
            print("\n🔑 Testing password verification...")
            
            test_credentials = [
                ("admin@sts.com", "admin123"),
                ("owner@sts.com", "admin123"),
                ("test@sts.com", "test123")
            ]
            
            for email, password in test_credentials:
                # Get user
                result = await session.execute(text("SELECT password_hash FROM users WHERE email = :email"), {"email": email})
                user_row = result.fetchone()
                
                if user_row:
                    stored_hash = user_row[0]
                    print(f"  {email}: Hash exists - {stored_hash[:20]}...")
                    
                    # Test with bcrypt
                    try:
                        import bcrypt
                        is_valid = bcrypt.checkpw(password.encode('utf-8'), stored_hash.encode('utf-8'))
                        print(f"    Password '{password}' is {'✅ VALID' if is_valid else '❌ INVALID'}")
                    except Exception as e:
                        print(f"    ❌ Error checking password: {e}")
                else:
                    print(f"  {email}: ❌ User not found")
            
    except Exception as e:
        print(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()
    finally:
        await engine.dispose()

if __name__ == "__main__":
    asyncio.run(check_database_users())
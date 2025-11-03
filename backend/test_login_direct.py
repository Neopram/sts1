#!/usr/bin/env python
"""
Test login logic directly without HTTP
"""
import asyncio
import os
import sys
sys.path.insert(0, os.path.dirname(__file__))

from app.database import AsyncSessionLocal
from app.models import User
from passlib.hash import bcrypt
from sqlalchemy import select
from app.dependencies import create_access_token

async def test_login_direct():
    """Test login logic directly"""
    print("=== DIRECT LOGIN TEST ===\n")
    
    email = "admin@sts.com"
    password = "password123"
    
    try:
        print(f"1. Creating async session...")
        async with AsyncSessionLocal() as session:
            print(f"✓ Session created\n")
            
            print(f"2. Querying user: {email}")
            result = await session.execute(
                select(User).where(User.email == email).limit(1)
            )
            user = result.scalar_one_or_none()
            print(f"✓ Query executed\n")
            
            if not user:
                print(f"❌ User not found: {email}")
                return False
            
            print(f"3. User found:")
            print(f"   ID: {user.id}")
            print(f"   Email: {user.email}")
            print(f"   Name: {user.name}")
            print(f"   Role: {user.role}")
            print(f"   Has password hash: {bool(user.password_hash)}\n")
            
            print(f"4. Verifying password...")
            if user.password_hash:
                try:
                    verified = bcrypt.verify(password, user.password_hash)
                    print(f"✓ Password verification result: {verified}\n")
                    
                    if not verified:
                        print(f"❌ Password incorrect")
                        return False
                except Exception as e:
                    print(f"❌ Password verification error: {e}\n")
                    import traceback
                    traceback.print_exc()
                    return False
            
            print(f"5. Creating access token...")
            try:
                token = create_access_token({"sub": user.email, "role": user.role})
                print(f"✓ Token created successfully")
                print(f"   Token: {token[:50]}...\n")
            except Exception as e:
                print(f"❌ Error creating token: {e}")
                import traceback
                traceback.print_exc()
                return False
            
            print(f"✅ LOGIN SUCCESSFUL!")
            print(f"   Email: {user.email}")
            print(f"   Role: {user.role}")
            print(f"   Name: {user.name}")
            return True
    
    except Exception as e:
        print(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    success = asyncio.run(test_login_direct())
    sys.exit(0 if success else 1)
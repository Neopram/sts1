import sys
import io
if sys.platform == 'win32':
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8', errors='replace')
#!/usr/bin/env python3
"""Test login endpoint directly"""
import asyncio
import sys
import os
sys.path.insert(0, os.path.dirname(__file__))

from app.database import AsyncSessionLocal
from sqlalchemy import select
from app.models import User
from passlib.hash import bcrypt

async def test_login():
    async with AsyncSessionLocal() as session:
        try:
            # Find user
            result = await session.execute(select(User).where(User.email == "admin@sts.com").limit(1))
            user = result.scalar_one_or_none()
            
            if user:
                print(f"✅ Usuario encontrado: {user.email}")
                print(f"  - Name: {user.name}")
                print(f"  - Role: {user.role}")
                print(f"  - Password hash exists: {bool(user.password_hash)}")
                
                # Test password
                if user.password_hash:
                    test_password = "admin123"
                    is_valid = bcrypt.verify(test_password, user.password_hash)
                    print(f"  - Password verification: {'✅ VALID' if is_valid else '❌ INVALID'}")
                else:
                    print("  - No password hash set")
            else:
                print("❌ Usuario no encontrado")
                
        except Exception as e:
            print(f"❌ Error: {e}")
            import traceback
            traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(test_login())
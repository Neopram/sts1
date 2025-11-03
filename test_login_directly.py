import sys
import asyncio
sys.path.insert(0, 'backend')

from sqlalchemy import select
from passlib.hash import bcrypt
from app.database import AsyncSessionLocal
from app.models import User
from app.dependencies import create_access_token
from app.schemas import TokenResponse

async def test_login():
    email = "admin@sts.com"
    password = "password123"
    
    async with AsyncSessionLocal() as session:
        try:
            print(f"[TEST] Finding user {email}...")
            result = await session.execute(select(User).where(User.email == email).limit(1))
            user = result.scalar_one_or_none()
            
            if not user:
                print(f"[TEST] User not found!")
                return
            
            print(f"[TEST] User found: {user.email}, role: {user.role}")
            print(f"[TEST] Password hash: {user.password_hash[:30]}...")
            
            print(f"[TEST] Verifying password...")
            verified = bcrypt.verify(password, user.password_hash)
            print(f"[TEST] Password verified: {verified}")
            
            if not verified:
                print(f"[TEST] Password verification failed!")
                return
            
            print(f"[TEST] Creating token...")
            token = create_access_token({"sub": user.email, "role": user.role})
            print(f"[TEST] Token created: {token[:30]}...")
            
            print(f"[TEST] Creating TokenResponse...")
            response = TokenResponse(
                token=token, email=user.email, role=user.role, name=user.name
            )
            print(f"[TEST] Response created: {response}")
            print(f"[TEST] Response dict: {response.dict()}")
            
            print(f"[TEST] SUCCESS!")
            
        except Exception as e:
            print(f"[TEST] Error: {e}")
            import traceback
            traceback.print_exc()

asyncio.run(test_login())
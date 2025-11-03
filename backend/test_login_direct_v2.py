"""Direct test of login logic to identify the exact error"""
import asyncio
import sys
from sqlalchemy import select
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker

# Add backend to path
sys.path.insert(0, '.')

from app.models import User
from app.security import verify_password, create_access_token
from app.database import get_database_url

async def test_login():
    print("🔍 Testing login logic directly...\n")
    
    # Create async engine
    db_url = get_database_url()
    print(f"📊 Database URL: {db_url}\n")
    
    engine = create_async_engine(db_url, echo=False)
    async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    
    async with async_session() as session:
        try:
            # Test 1: Query user
            print("✅ Test 1: Query user from database")
            result = await session.execute(
                select(User).where(User.email == "admin@sts.com").limit(1)
            )
            user = result.scalar_one_or_none()
            
            if not user:
                print("   ❌ User not found")
                return
            
            print(f"   ✅ Found user: {user.email} ({user.role})")
            print(f"   Password hash: {user.password_hash[:30]}..." if user.password_hash else "   No hash")
            
            # Test 2: Verify password
            print("\n✅ Test 2: Verify password")
            if user.password_hash:
                try:
                    verified = verify_password("password123", user.password_hash)
                    if verified:
                        print("   ✅ Password verified!")
                    else:
                        print("   ❌ Password verification failed")
                        return
                except Exception as e:
                    print(f"   ❌ Password verification error: {e}")
                    import traceback
                    traceback.print_exc()
                    return
            else:
                print("   ⚠️  No password hash, would allow login")
            
            # Test 3: Create token
            print("\n✅ Test 3: Create access token")
            try:
                token = create_access_token({"sub": user.email, "role": user.role})
                print(f"   ✅ Token created: {token[:50]}...")
            except Exception as e:
                print(f"   ❌ Token creation error: {e}")
                import traceback
                traceback.print_exc()
                return
            
            print("\n✅ All tests passed!")
            
        except Exception as e:
            print(f"❌ Error: {e}")
            import traceback
            traceback.print_exc()
    
    await engine.dispose()

if __name__ == "__main__":
    asyncio.run(test_login())
#!/usr/bin/env python3
"""
Create demo rooms and data for sellers to have STS operations to work with
"""
import asyncio
import sys
from datetime import datetime, timedelta
import uuid

# Add backend to path
sys.path.insert(0, 'backend')

from app.models import Room, Party, User, Session
from app.database import get_async_session, async_engine, Base
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy import select
from sqlalchemy.orm import sessionmaker


async def main():
    print("\n🔧 Creating demo rooms for sellers and buyers...")
    print("=" * 60)
    
    try:
        # Create tables if they don't exist
        async with async_engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)
        print("✓ Database tables created/verified")
        
        # Create a new async session
        async_session = sessionmaker(
            async_engine, class_=AsyncSession, expire_on_commit=False
        )
        
        async with async_session() as session:
            # Check if we already have a room for sellers
            result = await session.execute(
                select(Room).limit(1)
            )
            existing_rooms = result.scalars().all()
            
            if existing_rooms:
                print(f"✓ Found {len(existing_rooms)} existing room(s)")
                
                # Check if seller is in any room
                result = await session.execute(
                    select(Party).where(Party.email == 'seller@sts.com')
                )
                seller_parties = result.scalars().all()
                
                if seller_parties:
                    print(f"✓ Seller already has {len(seller_parties)} room(s)")
                    return
            
            print("\n📍 Creating new demo STS operation...")
            
            # Create a room
            room = Room(
                id=str(uuid.uuid4()),
                title="Crude Oil STS Transfer - Singapore",
                location="Singapore Strait",
                sts_eta=datetime.utcnow() + timedelta(days=5),
                status="active",
                created_at=datetime.utcnow(),
                updated_at=datetime.utcnow(),
            )
            session.add(room)
            await session.flush()
            
            print(f"  ✓ Room: {room.title}")
            print(f"  ✓ Location: {room.location}")
            print(f"  ✓ ETA: {room.sts_eta.strftime('%Y-%m-%d %H:%M UTC')}")
            
            # Add seller as party
            seller_party = Party(
                room_id=room.id,
                email='seller@sts.com',
                role='seller',
                name='Demo Seller',
                joined_at=datetime.utcnow(),
            )
            session.add(seller_party)
            print(f"  ✓ Added: seller@sts.com (seller)")
            
            # Add buyer as party
            buyer_party = Party(
                room_id=room.id,
                email='buyer@sts.com',
                role='buyer',
                name='Demo Buyer',
                joined_at=datetime.utcnow(),
            )
            session.add(buyer_party)
            print(f"  ✓ Added: buyer@sts.com (buyer)")
            
            # Add broker as party
            broker_party = Party(
                room_id=room.id,
                email='broker@sts.com',
                role='broker',
                name='Demo Broker',
                joined_at=datetime.utcnow(),
            )
            session.add(broker_party)
            print(f"  ✓ Added: broker@sts.com (broker)")
            
            # Add owner (shipowner) as party
            owner_party = Party(
                room_id=room.id,
                email='owner@sts.com',
                role='owner',
                name='Demo Vessel Owner',
                joined_at=datetime.utcnow(),
            )
            session.add(owner_party)
            print(f"  ✓ Added: owner@sts.com (owner)")
            
            # Add charterer as party
            charterer_party = Party(
                room_id=room.id,
                email='charterer@sts.com',
                role='charterer',
                name='Demo Charterer',
                joined_at=datetime.utcnow(),
            )
            session.add(charterer_party)
            print(f"  ✓ Added: charterer@sts.com (charterer)")
            
            # Add admin as party
            admin_party = Party(
                room_id=room.id,
                email='admin@sts.com',
                role='admin',
                name='Demo Administrator',
                joined_at=datetime.utcnow(),
            )
            session.add(admin_party)
            print(f"  ✓ Added: admin@sts.com (admin)")
            
            # Commit
            await session.commit()
            
            print("\n✅ Demo room created successfully!")
            print(f"   Room ID: {room.id}")
            print(f"   Participants: 6 users across all demo roles")
            
    except Exception as e:
        print(f'\n❌ Error: {e}')
        import traceback
        traceback.print_exc()
        sys.exit(1)
    finally:
        await async_engine.dispose()


if __name__ == '__main__':
    asyncio.run(main())
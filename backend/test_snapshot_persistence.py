"""
Quick test script to verify snapshot persistence implementation
Run this after applying the migration to confirm everything works
"""

import asyncio
import json
import logging
from datetime import datetime
from sqlalchemy import select

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


async def test_snapshot_persistence():
    """
    Test that snapshots are properly persisted to database
    """
    from app.database import AsyncSessionLocal, init_db
    from app.models import Snapshot, Room, Party
    import uuid

    try:
        logger.info("=" * 60)
        logger.info("SNAPSHOT PERSISTENCE TEST")
        logger.info("=" * 60)

        # Initialize database
        logger.info("\n1. Initializing database...")
        await init_db()
        logger.info("   ✅ Database initialized")

        # Create async session
        async with AsyncSessionLocal() as session:
            # Create test room and party
            logger.info("\n2. Creating test room and party...")
            
            room_id = str(uuid.uuid4())
            party_email = f"test-user-{datetime.now().timestamp()}@example.com"
            
            room = Room(
                id=room_id,
                title="Test Room for Snapshot Persistence",
                location="Port of Singapore",
                sts_eta=datetime.utcnow(),
                created_by="test@example.com",
                description="Test room for verifying snapshot persistence",
                status="active",
            )
            
            party = Party(
                id=str(uuid.uuid4()),
                room_id=room_id,
                role="owner",
                name="Test User",
                email=party_email,
            )
            
            session.add(room)
            session.add(party)
            await session.flush()
            logger.info(f"   ✅ Created test room: {room_id}")
            logger.info(f"   ✅ Created test party: {party_email}")

            # Test 1: Create snapshot
            logger.info("\n3. Testing snapshot creation...")
            
            snapshot_id = str(uuid.uuid4())
            snapshot_data = json.dumps({
                "include_documents": True,
                "include_activity": True,
                "include_approvals": True,
            })
            
            snapshot = Snapshot(
                id=snapshot_id,
                room_id=room_id,
                title="Test Snapshot - Persistence Check",
                created_by=party_email,
                status="completed",
                file_size=1024 * 1024,
                snapshot_type="pdf",
                data=snapshot_data,
            )
            
            session.add(snapshot)
            await session.commit()
            logger.info(f"   ✅ Snapshot created and committed: {snapshot_id}")

            # Test 2: Verify snapshot persisted (new session)
            logger.info("\n4. Verifying persistence in new session...")
            
            async with AsyncSessionLocal() as new_session:
                stmt = select(Snapshot).where(Snapshot.id == snapshot_id)
                result = await new_session.execute(stmt)
                fetched_snapshot = result.scalar_one_or_none()
                
                if fetched_snapshot:
                    logger.info("   ✅ Snapshot retrieved from database!")
                    logger.info(f"      - ID: {fetched_snapshot.id}")
                    logger.info(f"      - Title: {fetched_snapshot.title}")
                    logger.info(f"      - Room ID: {fetched_snapshot.room_id}")
                    logger.info(f"      - Status: {fetched_snapshot.status}")
                    logger.info(f"      - Created By: {fetched_snapshot.created_by}")
                    logger.info(f"      - File Size: {fetched_snapshot.file_size} bytes")
                    logger.info(f"      - Type: {fetched_snapshot.snapshot_type}")
                else:
                    logger.error("   ❌ Snapshot NOT found in database!")
                    return False

            # Test 3: Test listing snapshots
            logger.info("\n5. Testing snapshot listing...")
            
            async with AsyncSessionLocal() as new_session:
                stmt = (
                    select(Snapshot)
                    .where(Snapshot.room_id == room_id)
                    .order_by(Snapshot.created_at.desc())
                )
                result = await new_session.execute(stmt)
                snapshots = result.scalars().all()
                
                logger.info(f"   ✅ Found {len(snapshots)} snapshot(s) for room")
                for snap in snapshots:
                    logger.info(f"      - {snap.id}: {snap.title} (status: {snap.status})")

            # Test 4: Test update
            logger.info("\n6. Testing snapshot update...")
            
            async with AsyncSessionLocal() as new_session:
                stmt = select(Snapshot).where(Snapshot.id == snapshot_id)
                result = await new_session.execute(stmt)
                snapshot_to_update = result.scalar_one_or_none()
                
                if snapshot_to_update:
                    snapshot_to_update.status = "updated"
                    snapshot_to_update.file_url = "snapshots/room123/snapshot456.pdf"
                    await new_session.commit()
                    logger.info("   ✅ Snapshot updated successfully")
                    
                    # Verify update
                    stmt = select(Snapshot).where(Snapshot.id == snapshot_id)
                    result = await new_session.execute(stmt)
                    updated = result.scalar_one_or_none()
                    logger.info(f"      - New status: {updated.status}")
                    logger.info(f"      - New file_url: {updated.file_url}")

            # Test 5: Test deletion
            logger.info("\n7. Testing snapshot deletion...")
            
            async with AsyncSessionLocal() as new_session:
                stmt = select(Snapshot).where(Snapshot.id == snapshot_id)
                result = await new_session.execute(stmt)
                snapshot_to_delete = result.scalar_one_or_none()
                
                if snapshot_to_delete:
                    await new_session.delete(snapshot_to_delete)
                    await new_session.commit()
                    logger.info("   ✅ Snapshot deleted successfully")
                    
                    # Verify deletion
                    stmt = select(Snapshot).where(Snapshot.id == snapshot_id)
                    result = await new_session.execute(stmt)
                    deleted = result.scalar_one_or_none()
                    if not deleted:
                        logger.info("   ✅ Deletion verified - snapshot no longer exists")
                    else:
                        logger.error("   ❌ Deletion failed - snapshot still exists")
                        return False

        logger.info("\n" + "=" * 60)
        logger.info("✅ ALL TESTS PASSED - SNAPSHOTS PROPERLY PERSISTED")
        logger.info("=" * 60)
        return True

    except Exception as e:
        logger.error(f"\n❌ TEST FAILED: {e}", exc_info=True)
        return False


async def main():
    """Run all tests"""
    success = await test_snapshot_persistence()
    
    if not success:
        exit(1)


if __name__ == "__main__":
    asyncio.run(main())
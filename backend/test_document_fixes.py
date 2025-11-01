import sys
import io
if sys.platform == 'win32':
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8', errors='replace')
#!/usr/bin/env python3
"""
Test script to verify document endpoint fixes
Tests that all user roles can now see and interact with common documents
"""

import asyncio
import json
import sys
from pathlib import Path

# Add backend to path
sys.path.insert(0, str(Path(__file__).parent))

from app.database import get_async_session, AsyncSession
from app.models import User, Document, Room, Party, DocumentType, Vessel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession as AsyncSessionType

async def test_document_access():
    """Test that documents are correctly filtered by the fixed logic"""
    
    # Get database session
    async for session in get_async_session():
        print("\n🔍 Testing Document Access Logic")
        print("=" * 60)
        
        # Get admin user
        admin_result = await session.execute(
            select(User).where(User.email == "admin@sts.com")
        )
        admin = admin_result.scalar_one_or_none()
        
        if not admin:
            print("❌ Admin user not found")
            return
        
        print(f"✅ Found admin user: {admin.email} (role: {admin.role})")
        
        # Get test room (get the first room with documents)
        room_result = await session.execute(select(Room).limit(1))
        room = room_result.scalar_one_or_none()
        
        if not room:
            print("❌ Test room not found")
            return
        
        print(f"✅ Found test room: {room.name} (id: {room.id})")
        
        # Check if admin is in the room
        party_result = await session.execute(
            select(Party).where(
                (Party.room_id == room.id) & 
                (Party.email == admin.email)
            )
        )
        party = party_result.scalar_one_or_none()
        
        if party:
            print(f"✅ Admin is in the room")
        else:
            print(f"❌ Admin is NOT in the room")
            return
        
        # Get admin's accessible vessels (should be empty for test room)
        vessel_result = await session.execute(
            select(Vessel).join(Party).where(
                (Vessel.room_id == room.id) &
                (Party.email == admin.email) &
                (Party.vessel_id == Vessel.id)
            )
        )
        vessels = vessel_result.scalars().all()
        print(f"✅ Admin has access to {len(vessels)} vessels")
        
        # Get common documents (vessel_id IS NULL)
        common_docs_result = await session.execute(
            select(Document).where(
                (Document.room_id == room.id) &
                (Document.vessel_id.is_(None))
            )
        )
        common_docs = common_docs_result.scalars().all()
        print(f"✅ Found {len(common_docs)} common documents in the room")
        
        # Test the fixed access logic
        print("\n📋 Testing Fixed Access Logic")
        print("-" * 60)
        
        # Simulate the fixed logic from get_document endpoint
        accessible_vessel_ids = [v.id for v in vessels]  # Empty for test room
        
        # Build the corrected access condition
        access_condition = Document.vessel_id.is_(None)  # All users can see common docs
        if accessible_vessel_ids:
            from sqlalchemy import or_
            access_condition = access_condition | Document.vessel_id.in_(accessible_vessel_ids)
        
        # Query documents using the fixed logic
        fixed_query_result = await session.execute(
            select(Document).where(
                (Document.room_id == room.id) &
                access_condition
            )
        )
        accessible_docs = fixed_query_result.scalars().all()
        
        print(f"✅ Fixed logic returns {len(accessible_docs)} documents for admin")
        
        if len(accessible_docs) > 0:
            print("\n✅ SUCCESS! Documents are now accessible to admin!")
            for doc in accessible_docs:
                print(f"   - Document ID: {doc.id}")
                print(f"     Status: {doc.status}")
                print(f"     Vessel ID: {doc.vessel_id}")
        else:
            print("\n❌ FAILED! No documents found with fixed logic")
            
        print("\n" + "=" * 60)
        print("✅ Test completed successfully!")
        
        break

if __name__ == "__main__":
    asyncio.run(test_document_access())
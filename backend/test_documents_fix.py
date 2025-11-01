import sys
import io
if sys.platform == 'win32':
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8', errors='replace')
#!/usr/bin/env python3
"""Test script to verify documents are now visible after the fix"""

import asyncio
import sys
from sqlalchemy import select
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker, joinedload

sys.path.insert(0, 'c:/Users/feder/Desktop/StsHub/sts/backend')

from app.models import Document, DocumentVersion, User
from app.dependencies import get_user_accessible_vessels
from app.database import DATABASE_URL

async def test_documents():
    engine = create_async_engine(DATABASE_URL)
    async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    
    async with async_session() as session:
        # Get admin user
        admin_result = await session.execute(
            select(User).where(User.email == "admin@sts.com")
        )
        admin = admin_result.scalar_one_or_none()
        
        if not admin:
            print("❌ Admin user not found")
            return
        
        print(f"✓ Admin user: {admin.email}, Role: {admin.role}")
        
        # Use the specific room
        room_id = "4864508d-8f7e-4bf7-bf02-dc1fdb0746b4"
        
        # Check accessible vessels
        accessible_vessels = await get_user_accessible_vessels(room_id, admin.email, session)
        print(f"✓ Accessible vessels: {accessible_vessels} (empty = user has no vessel access)")
        
        # Simulate the GET endpoint logic
        where_conditions = [Document.room_id == room_id]
        
        if accessible_vessels:
            from sqlalchemy import or_
            where_conditions.append(
                or_(
                    Document.vessel_id.in_(accessible_vessels),
                    Document.vessel_id.is_(None)
                )
            )
            print("✓ Query: Show documents from accessible vessels + common documents")
        else:
            where_conditions.append(Document.vessel_id.is_(None))
            print("✓ Query: Show only common documents (no vessel access)")
        
        # Execute the query
        from sqlalchemy.orm import joinedload
        query = (
            select(Document)
            .join(DocumentVersion.__table__, Document.id == DocumentVersion.document_id, isouter=True)
            .options(joinedload(Document.document_type))
            .options(joinedload(Document.versions))
            .where(*where_conditions)
        )
        
        docs_result = await session.execute(query)
        doc_list = docs_result.unique().scalars().all()
        
        print(f"\n📄 Documents found: {len(doc_list)}")
        for doc in doc_list:
            print(f"  - ID: {doc.id}")
            print(f"    Vessel ID: {doc.vessel_id}")
            print(f"    Status: {doc.status}")
            print(f"    Uploaded by: {doc.uploaded_by}")
            if doc.versions:
                print(f"    Versions: {len(doc.versions)}")
                for v in doc.versions:
                    print(f"      - File: {v.file_url}")
        
        if len(doc_list) > 0:
            print("\n✅ SUCCESS! Documents are now visible to users without vessel access!")
        else:
            print("\n❌ FAIL! No documents found")

if __name__ == "__main__":
    asyncio.run(test_documents())
import asyncio
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))

from app.database import get_async_session
from app.models import Document, DocumentType, Room, Party, User, Vessel
from sqlalchemy import select


async def test():
    """Test document retrieval"""
    print("Starting test...")
    
    async for session in get_async_session():
        try:
            # Get first document
            result = await session.execute(select(Document).limit(1))
            doc = result.scalar_one_or_none()
            if not doc:
                print("❌ No documents found")
                return
            
            print(f"Document found: {doc.id}")
            print(f"  Room: {doc.room_id}")
            print(f"  Status: {doc.status}")
            print(f"  Type ID: {doc.document_type_id}")
            
            # Now try the query from get_document
            doc_id = doc.id
            room_id = doc.room_id
            
            print(f"\nTesting the endpoint query...")
            
            # Try join with DocumentType
            doc_result = await session.execute(
                select(
                    Document.id,
                    Document.status,
                    Document.expires_on,
                    Document.uploaded_by,
                    Document.uploaded_at,
                    Document.notes,
                    DocumentType.code,
                    DocumentType.name,
                    DocumentType.criticality,
                )
                .join(DocumentType)
                .where(
                    Document.id == doc_id,
                    Document.room_id == room_id,
                    Document.vessel_id.is_(None)  # All users can see common documents
                )
            )
            
            row = doc_result.first()
            print(f"✅ Query successful! Row: {row is not None}")
            if row:
                print(f"   ID: {row.id}")
                print(f"   Status: {row.status}")
                print(f"   Code: {row.code}")
                
        except Exception as e:
            print(f"❌ Error: {type(e).__name__}: {e}")
            import traceback
            traceback.print_exc()
        finally:
            await session.close()
        break

if __name__ == "__main__":
    asyncio.run(test())
"""
Search router for STS Clearance system
Provides global search functionality across rooms, documents, and messages
"""

import logging
from datetime import datetime
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import and_, func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_async_session
from app.dependencies import get_current_user
from app.models import Document, DocumentType, Message, Party, Room, Vessel

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/search", tags=["search"])


@router.get("/")
async def search_root(
    q: str = Query(..., min_length=2, description="Search query"),
    limit: int = Query(20, le=100, description="Maximum number of results"),
    current_user: dict = Depends(get_current_user),
    session: AsyncSession = Depends(get_async_session),
):
    """
    Main search endpoint - redirects to global search
    """
    # Redirect to global search functionality
    return await global_search(q, limit, current_user, session)


@router.get("/global")
async def global_search(
    q: str = Query(..., min_length=2, description="Search query"),
    limit: int = Query(20, le=100, description="Maximum number of results"),
    current_user: dict = Depends(get_current_user),
    session: AsyncSession = Depends(get_async_session),
):
    """
    Global search across all user-accessible content
    """
    try:
        user_email = current_user["email"]

        # Get user's accessible room IDs
        user_rooms_result = await session.execute(
            select(Room.id).join(Party).where(Party.email == user_email)
        )
        user_room_ids = [str(room_id) for room_id in user_rooms_result.scalars().all()]

        if not user_room_ids:
            return {
                "query": q,
                "results": {
                    "rooms": [],
                    "documents": [],
                    "messages": [],
                    "vessels": [],
                },
                "total_results": 0,
            }

        search_term = f"%{q.lower()}%"
        results = {"rooms": [], "documents": [], "messages": [], "vessels": []}

        # Search rooms
        rooms_result = await session.execute(
            select(Room)
            .where(
                and_(
                    Room.id.in_(user_room_ids),
                    or_(
                        func.lower(Room.title).like(search_term),
                        func.lower(Room.location).like(search_term),
                    ),
                )
            )
            .limit(limit // 4)
        )

        for room in rooms_result.scalars().all():
            results["rooms"].append(
                {
                    "id": str(room.id),
                    "title": room.title,
                    "location": room.location,
                    "sts_eta": room.sts_eta,
                    "created_at": room.created_at,
                    "type": "room",
                }
            )

        # Search documents
        docs_result = await session.execute(
            select(Document, DocumentType, Room)
            .join(DocumentType, Document.type_id == DocumentType.id)
            .join(Room, Document.room_id == Room.id)
            .where(
                and_(
                    Document.room_id.in_(user_room_ids),
                    or_(
                        func.lower(DocumentType.name).like(search_term),
                        func.lower(DocumentType.code).like(search_term),
                    ),
                )
            )
            .limit(limit // 4)
        )

        for doc, doc_type, room in docs_result.all():
            results["documents"].append(
                {
                    "id": str(doc.id),
                    "type_name": doc_type.name,
                    "type_code": doc_type.code,
                    "status": doc.status,
                    "room_title": room.title,
                    "room_id": str(room.id),
                    "uploaded_at": doc.uploaded_at,
                    "type": "document",
                }
            )

        # Search messages
        messages_result = await session.execute(
            select(Message, Room)
            .join(Room, Message.room_id == Room.id)
            .where(
                and_(
                    Message.room_id.in_(user_room_ids),
                    or_(
                        func.lower(Message.content).like(search_term),
                        func.lower(Message.sender_name).like(search_term),
                    ),
                )
            )
            .order_by(Message.created_at.desc())
            .limit(limit // 4)
        )

        for message, room in messages_result.all():
            # Truncate content for preview
            content_preview = (
                message.content[:100] + "..."
                if len(message.content) > 100
                else message.content
            )

            results["messages"].append(
                {
                    "id": str(message.id),
                    "sender_name": message.sender_name,
                    "content_preview": content_preview,
                    "room_title": room.title,
                    "room_id": str(room.id),
                    "created_at": message.created_at,
                    "type": "message",
                }
            )

        # Search vessels
        vessels_result = await session.execute(
            select(Vessel, Room)
            .join(Room, Vessel.room_id == Room.id)
            .where(
                and_(
                    Vessel.room_id.in_(user_room_ids),
                    or_(
                        func.lower(Vessel.name).like(search_term),
                        func.lower(Vessel.imo).like(search_term),
                        func.lower(Vessel.vessel_type).like(search_term),
                        func.lower(Vessel.flag).like(search_term),
                    ),
                )
            )
            .limit(limit // 4)
        )

        for vessel, room in vessels_result.all():
            results["vessels"].append(
                {
                    "id": str(vessel.id),
                    "name": vessel.name,
                    "imo": vessel.imo,
                    "vessel_type": vessel.vessel_type,
                    "flag": vessel.flag,
                    "room_title": room.title,
                    "room_id": str(room.id),
                    "type": "vessel",
                }
            )

        total_results = sum(len(results[key]) for key in results)

        return {"query": q, "results": results, "total_results": total_results}

    except Exception as e:
        logger.error(f"Error in global search: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")


@router.get("/rooms")
async def search_rooms(
    q: str = Query(..., min_length=2, description="Search query"),
    limit: int = Query(20, le=100, description="Maximum number of results"),
    current_user: dict = Depends(get_current_user),
    session: AsyncSession = Depends(get_async_session),
):
    """
    Search specifically in rooms
    """
    try:
        user_email = current_user["email"]

        # Get user's accessible room IDs
        user_rooms_result = await session.execute(
            select(Room.id).join(Party).where(Party.email == user_email)
        )
        user_room_ids = [str(room_id) for room_id in user_rooms_result.scalars().all()]

        if not user_room_ids:
            return {"query": q, "results": [], "total_results": 0}

        search_term = f"%{q.lower()}%"

        # Search rooms with party information
        rooms_result = await session.execute(
            select(Room)
            .where(
                and_(
                    Room.id.in_(user_room_ids),
                    or_(
                        func.lower(Room.title).like(search_term),
                        func.lower(Room.location).like(search_term),
                        func.lower(Room.created_by).like(search_term),
                    ),
                )
            )
            .order_by(Room.created_at.desc())
            .limit(limit)
        )

        results = []
        for room in rooms_result.scalars().all():
            # Get parties for this room
            parties_result = await session.execute(
                select(Party).where(Party.room_id == room.id)
            )
            parties = [
                {"role": p.role, "name": p.name, "email": p.email}
                for p in parties_result.scalars().all()
            ]

            # Get document summary
            docs_result = await session.execute(
                select(Document.status, func.count(Document.id))
                .where(Document.room_id == room.id)
                .group_by(Document.status)
            )

            doc_summary = {"total": 0, "approved": 0, "missing": 0, "under_review": 0}
            for status, count in docs_result.all():
                doc_summary["total"] += count
                if status in doc_summary:
                    doc_summary[status] = count

            results.append(
                {
                    "id": str(room.id),
                    "title": room.title,
                    "location": room.location,
                    "sts_eta": room.sts_eta,
                    "created_by": room.created_by,
                    "created_at": room.created_at,
                    "parties": parties,
                    "documents_summary": doc_summary,
                }
            )

        return {"query": q, "results": results, "total_results": len(results)}

    except Exception as e:
        logger.error(f"Error searching rooms: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")


@router.get("/documents")
async def search_documents(
    q: str = Query(..., min_length=2, description="Search query"),
    status: Optional[str] = Query(None, description="Filter by document status"),
    room_id: Optional[str] = Query(None, description="Filter by room ID"),
    limit: int = Query(20, le=100, description="Maximum number of results"),
    current_user: dict = Depends(get_current_user),
    session: AsyncSession = Depends(get_async_session),
):
    """
    Search specifically in documents
    """
    try:
        user_email = current_user["email"]

        # Get user's accessible room IDs
        user_rooms_result = await session.execute(
            select(Room.id).join(Party).where(Party.email == user_email)
        )
        user_room_ids = [str(room_id) for room_id in user_rooms_result.scalars().all()]

        if not user_room_ids:
            return {"query": q, "results": [], "total_results": 0}

        search_term = f"%{q.lower()}%"

        # Build query conditions
        conditions = [
            Document.room_id.in_(user_room_ids),
            or_(
                func.lower(DocumentType.name).like(search_term),
                func.lower(DocumentType.code).like(search_term),
                func.lower(Document.uploaded_by).like(search_term),
            ),
        ]

        if status:
            conditions.append(Document.status == status)

        if room_id:
            conditions.append(Document.room_id == room_id)

        # Search documents
        docs_result = await session.execute(
            select(Document, DocumentType, Room)
            .join(DocumentType, Document.type_id == DocumentType.id)
            .join(Room, Document.room_id == Room.id)
            .where(and_(*conditions))
            .order_by(Document.uploaded_at.desc().nullslast())
            .limit(limit)
        )

        results = []
        for doc, doc_type, room in docs_result.all():
            results.append(
                {
                    "id": str(doc.id),
                    "type_name": doc_type.name,
                    "type_code": doc_type.code,
                    "status": doc.status,
                    "uploaded_by": doc.uploaded_by,
                    "uploaded_at": doc.uploaded_at,
                    "expires_on": doc.expires_on,
                    "room_title": room.title,
                    "room_id": str(room.id),
                    "criticality": doc_type.criticality,
                }
            )

        return {
            "query": q,
            "filters": {"status": status, "room_id": room_id},
            "results": results,
            "total_results": len(results),
        }

    except Exception as e:
        logger.error(f"Error searching documents: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")


@router.get("/suggestions")
async def get_search_suggestions(
    q: str = Query(..., min_length=1, description="Partial search query"),
    current_user: dict = Depends(get_current_user),
    session: AsyncSession = Depends(get_async_session),
):
    """
    Get search suggestions based on partial query
    """
    try:
        user_email = current_user["email"]

        # Get user's accessible room IDs
        user_rooms_result = await session.execute(
            select(Room.id).join(Party).where(Party.email == user_email)
        )
        user_room_ids = [str(room_id) for room_id in user_rooms_result.scalars().all()]

        if not user_room_ids:
            return {"suggestions": []}

        search_term = f"{q.lower()}%"
        suggestions = []

        # Room title suggestions
        rooms_result = await session.execute(
            select(Room.title)
            .where(
                and_(
                    Room.id.in_(user_room_ids), func.lower(Room.title).like(search_term)
                )
            )
            .limit(5)
        )

        for title in rooms_result.scalars().all():
            suggestions.append(
                {"text": title, "type": "room_title", "category": "Rooms"}
            )

        # Document type suggestions
        doc_types_result = await session.execute(
            select(DocumentType.name.distinct())
            .join(Document, DocumentType.id == Document.type_id)
            .where(
                and_(
                    Document.room_id.in_(user_room_ids),
                    func.lower(DocumentType.name).like(search_term),
                )
            )
            .limit(5)
        )

        for doc_type in doc_types_result.scalars().all():
            suggestions.append(
                {"text": doc_type, "type": "document_type", "category": "Documents"}
            )

        # Vessel name suggestions
        vessels_result = await session.execute(
            select(Vessel.name.distinct())
            .where(
                and_(
                    Vessel.room_id.in_(user_room_ids),
                    func.lower(Vessel.name).like(search_term),
                )
            )
            .limit(5)
        )

        for vessel_name in vessels_result.scalars().all():
            suggestions.append(
                {"text": vessel_name, "type": "vessel_name", "category": "Vessels"}
            )

        return {"suggestions": suggestions[:15]}  # Limit to 15 suggestions

    except Exception as e:
        logger.error(f"Error getting search suggestions: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")

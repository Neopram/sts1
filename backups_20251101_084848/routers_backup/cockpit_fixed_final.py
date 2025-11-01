"""
API router for Missing & Expiring Documents Cockpit
Handles document management, status updates, and PDF generation
"""

import io
import logging
from datetime import datetime, timedelta
from typing import List, Optional

from fastapi import (APIRouter, Depends, File, Form, HTTPException, UploadFile,
                     status)
from fastapi.responses import FileResponse, StreamingResponse
from sqlalchemy import select, update, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_async_session
from app.dependencies import (cockpit_enabled, get_current_user, log_activity,
                              require_owner_permission, require_room_access)
from app.models import Document, DocumentType, DocumentVersion, Room
from app.schemas import (DocumentResponse, DocumentTypeResponse,
                         DocumentUpdateRequest, DocumentUploadRequest,
                         RoomSummaryResponse)
from app.services.criticality_scorer import criticality_scorer
from app.services.expiry_extractor import expiry_extractor
from app.services.pdf_generator import pdf_generator
from app.services.storage_service import storage_service

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1", tags=["cockpit"])


@router.get("/rooms/{room_id}/summary", response_model=RoomSummaryResponse)
async def get_room_summary(
    room_id: str,
    session: AsyncSession = Depends(get_async_session),
    current_user: dict = Depends(get_current_user),
    _: bool = Depends(cockpit_enabled),
):
    """
    Get comprehensive summary of room status including blockers and progress
    """
    try:
        # Verify user has access to room
        await require_room_access(room_id, current_user.email, session)

        # Get room information
        room_result = await session.execute(select(Room).where(Room.id == room_id))
        room = room_result.scalar_one_or_none()

        if not room:
            raise HTTPException(status_code=404, detail="Room not found")

        # Get all documents for the room
        docs_result = await session.execute(
            select(
                Document.id,
                Document.status,
                Document.expires_on,
                Document.uploaded_by,
                Document.uploaded_at,
                Document.notes,
                DocumentType.code.label("type_code"),
                DocumentType.name.label("type_name"),
                DocumentType.required,
                DocumentType.criticality,
            )
            .join(DocumentType)
            .where(Document.room_id == room_id)
        )

        documents = []
        for row in docs_result:
            doc_dict = {
                "id": row.id,
                "type_code": row.type_code,
                "type_name": row.type_name,
                "status": row.status,
                "expires_on": row.expires_on,
                "uploaded_by": row.uploaded_by,
                "uploaded_at": row.uploaded_at,
                "notes": row.notes,
                "required": row.required,
                "criticality": row.criticality,
                "criticality_score": 0,  # Will be calculated by scorer
            }
            documents.append(DocumentResponse(**doc_dict))

        # Calculate progress and get blockers
        progress = criticality_scorer.calculate_progress(documents)
        blockers = criticality_scorer.get_blockers(documents)
        expiring_soon = criticality_scorer.get_expiring_soon(documents)

        # Convert to response format
        blockers_response = []
        for blocker in blockers:
            blockers_response.append(
                {
                    "id": str(blocker.id),
                    "type_code": blocker.type_code,
                    "type_name": blocker.type_name,
                    "status": blocker.status,
                    "criticality": blocker.criticality,
                    "criticality_score": blocker.criticality_score,
                    "expires_on": blocker.expires_on,
                    "uploaded_by": blocker.uploaded_by,
                    "uploaded_at": blocker.uploaded_at,
                    "notes": blocker.notes,
                    "required": blocker.required,
                }
            )

        expiring_response = []
        for expiring in expiring_soon:
            expiring_response.append(
                {
                    "id": str(expiring.id),
                    "type_code": expiring.type_code,
                    "type_name": expiring.type_name,
                    "status": expiring.status,
                    "criticality": expiring.criticality,
                    "criticality_score": expiring.criticality_score,
                    "expires_on": expiring.expires_on,
                    "uploaded_by": expiring.uploaded_by,
                    "uploaded_at": expiring.uploaded_at,
                    "notes": expiring.notes,
                    "required": expiring.required,
                }
            )

        return RoomSummaryResponse(
            room_id=room.id,
            title=room.title,
            location=room.location,
            sts_eta=room.sts_eta,
            progress_percentage=progress,
            total_required_docs=len([d for d in documents if d.required]),
            resolved_required_docs=len(
                [d for d in documents if d.required and d.status == "approved"]
            ),
            blockers=blockers_response,
            expiring_soon=expiring_response,
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting room summary: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")


# Endpoint moved to documents.py to avoid duplication


@router.post("/rooms/{room_id}/documents/upload")
async def upload_document(
    room_id: str,
    file: UploadFile = File(...),
    document_type: str = Form(...),
    notes: Optional[str] = Form(None),
    expires_on: Optional[str] = Form(None),
    current_user: dict = Depends(get_current_user),
    session: AsyncSession = Depends(get_async_session),
    _: bool = Depends(cockpit_enabled),
):
    """
    Upload a new document to a room
    """
    try:
        user_email = current_user.email
        # Verify user has access to room
        await require_room_access(room_id, user_email, session)

        # Validate file type
        if not file.filename or not file.content_type:
            raise HTTPException(status_code=400, detail="Invalid file")

        # Get document type
        doc_type_result = await session.execute(
            select(DocumentType).where(DocumentType.code == document_type)
        )
        doc_type = doc_type_result.scalar_one_or_none()

        if not doc_type:
            raise HTTPException(status_code=400, detail="Invalid document type")

        # Parse expiry date if provided
        expiry_date = None
        if expires_on:
            try:
                expiry_date = datetime.fromisoformat(expires_on.replace("Z", "+00:00"))
            except ValueError:
                raise HTTPException(
                    status_code=400, detail="Invalid expiry date format"
                )

        # Store file
        file_url = await storage_service.store_file(file, room_id)

        # Create document record
        document = Document(
            room_id=room_id,
            type_id=doc_type.id,
            status="under_review",
            expires_on=expiry_date,
            uploaded_by=user_email,
            uploaded_at=datetime.utcnow(),
            notes=notes,
        )

        session.add(document)
        await session.flush()  # Get the document ID

        # Create document version
        version = DocumentVersion(
            document_id=document.id,
            file_url=file_url,
            sha256=await storage_service.calculate_sha256(file),
            size_bytes=file.size,
            mime=file.content_type,
        )

        session.add(version)
        await session.commit()

        # Log activity
        await log_activity(
            room_id,
            user_email,
            "document_uploaded",
            {"document_type": document_type, "filename": file.filename},
        )

        return {
            "message": "Document uploaded successfully",
            "document_id": str(document.id),
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error uploading document: {e}")
        await session.rollback()
        raise HTTPException(status_code=500, detail="Internal server error")


@router.patch("/rooms/{room_id}/documents/{document_id}")
async def update_document(
    room_id: str,
    document_id: str,
    update_data: DocumentUpdateRequest,
    current_user: dict = Depends(get_current_user),
    session: AsyncSession = Depends(get_async_session),
    _: bool = Depends(cockpit_enabled),
):
    """
    Update document status and metadata
    """
    try:
        # Verify user has access to room
        await require_room_access(room_id, user_email, session)

        # Get document
        doc_result = await session.execute(
            select(Document).where(
                Document.id == document_id, Document.room_id == room_id
            )
        )
        document = doc_result.scalar_one_or_none()

        if not document:
            raise HTTPException(status_code=404, detail="Document not found")

        # Update document
        update_values = {}
        if update_data.status is not None:
            update_values["status"] = update_data.status
        if update_data.notes is not None:
            update_values["notes"] = update_data.notes
        if update_data.expires_on is not None:
            update_values["expires_on"] = update_data.expires_on

        if update_values:
            await session.execute(
                update(Document)
                .where(Document.id == document_id)
                .values(**update_values)
            )
            await session.commit()

        # Log activity
        await log_activity(
            room_id,
            user_email,
            "document_updated",
            {"document_id": document_id, "changes": update_values},
        )

        return {"message": "Document updated successfully"}

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating document: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")


@router.get("/rooms/{room_id}/documents/{document_id}")
async def get_document(
    room_id: str,
    document_id: str,
    current_user: dict = Depends(get_current_user),
    session: AsyncSession = Depends(get_async_session),
    _: bool = Depends(cockpit_enabled),
):
    """
    Get specific document details
    """
    try:
        # Verify user has access to room
        await require_room_access(room_id, user_email, session)

        # Get document with type information
        doc_result = await session.execute(
            select(
                Document.id,
                Document.status,
                Document.expires_on,
                Document.uploaded_by,
                Document.uploaded_at,
                Document.notes,
                DocumentType.code.label("type_code"),
                DocumentType.name.label("type_name"),
                DocumentType.required,
                DocumentType.criticality,
            )
            .join(DocumentType)
            .where(Document.id == document_id, Document.room_id == room_id)
        )

        document = doc_result.scalar_one_or_none()
        if not document:
            raise HTTPException(status_code=404, detail="Document not found")

        # Convert to response format
        doc_dict = {
            "id": document.id,
            "type_code": document.type_code,
            "type_name": document.type_name,
            "status": document.status,
            "expires_on": document.expires_on,
            "uploaded_by": document.uploaded_by,
            "uploaded_at": document.uploaded_at,
            "notes": document.notes,
            "required": document.required,
            "criticality": document.criticality,
            "criticality_score": criticality_scorer.calculate_document_score(
                DocumentResponse(**doc_dict)
            ),
        }

        return DocumentResponse(**doc_dict)

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting document: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")


@router.get("/rooms/{room_id}/documents/{document_id}/download")
async def download_document(
    room_id: str,
    document_id: str,
    current_user: dict = Depends(get_current_user),
    session: AsyncSession = Depends(get_async_session),
    _: bool = Depends(cockpit_enabled),
):
    """
    Download a specific document file
    """
    try:
        # Verify user has access to room
        await require_room_access(room_id, user_email, session)

        # Get document version
        version_result = await session.execute(
            select(DocumentVersion)
            .join(Document)
            .where(
                DocumentVersion.document_id == document_id, Document.room_id == room_id
            )
        )
        version = version_result.scalar_one_or_none()

        if not version:
            raise HTTPException(status_code=404, detail="Document version not found")

        # Get file from storage
        file_data = await storage_service.get_file(version.file_url)

        # Log download activity
        await log_activity(
            room_id, user_email, "document_downloaded", {"document_id": document_id}
        )

        return StreamingResponse(
            io.BytesIO(file_data),
            media_type=version.mime,
            headers={
                "Content-Disposition": f"attachment; filename=document_{document_id}"
            },
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error downloading document: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")


@router.get("/document-types", response_model=List[DocumentTypeResponse])
async def get_document_types(
    session: AsyncSession = Depends(get_async_session),
    _: bool = Depends(cockpit_enabled),
):
    """
    Get all available document types
    """
    try:
        result = await session.execute(select(DocumentType))
        document_types = result.scalars().all()

        return [
            DocumentTypeResponse(
                id=dt.id,
                code=dt.code,
                name=dt.name,
                required=dt.required,
                criticality=dt.criticality,
            )
            for dt in document_types
        ]

    except Exception as e:
        logger.error(f"Error getting document types: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")


@router.get("/rooms/{room_id}/snapshot.pdf")
async def generate_snapshot(
    room_id: str,
    current_user: dict = Depends(get_current_user),
    session: AsyncSession = Depends(get_async_session),
    _: bool = Depends(cockpit_enabled),
):
    """
    Generate PDF snapshot of room status
    """
    try:
        user_email = current_user.email

        # Verify user has access to room
        await require_room_access(room_id, user_email, session)

        # Get room summary data
        summary_response = await get_room_summary(room_id, session, current_user, _)

        # Convert to dict for PDF generator
        room_data = {
            "room_id": str(summary_response.room_id),
            "title": summary_response.title,
            "location": summary_response.location,
            "sts_eta": summary_response.sts_eta.isoformat() if summary_response.sts_eta else None,
            "progress_percentage": summary_response.progress_percentage,
            "total_required_docs": summary_response.total_required_docs,
            "resolved_required_docs": summary_response.resolved_required_docs,
            "blockers": summary_response.blockers,
            "expiring_soon": summary_response.expiring_soon,
        }

        # Generate PDF
        pdf_data = pdf_generator.generate_room_snapshot(room_data)

        # Log activity
        await log_activity(room_id, user_email, "snapshot_generated", {"format": "pdf"})

        return StreamingResponse(
            io.BytesIO(pdf_data),
            media_type="application/pdf",
            headers={
                "Content-Disposition": f"attachment; filename=sts-snapshot-{room_id}.pdf"
            },
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error generating snapshot: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")


@router.get("/rooms/{room_id}/activity", response_model=List[dict])
async def get_room_activity(
    room_id: str,
    limit: int = 50,
    current_user: dict = Depends(get_current_user),
    session: AsyncSession = Depends(get_async_session),
    _: bool = Depends(cockpit_enabled),
):
    """
    Get recent activity for a room
    """
    try:
        # Verify user has access to room
        await require_room_access(room_id, user_email, session)

        # Get activity logs
        from app.models import ActivityLog

        result = await session.execute(
            select(ActivityLog)
            .where(ActivityLog.room_id == room_id)
            .order_by(ActivityLog.ts.desc())
            .limit(limit)
        )

        activities = result.scalars().all()

        return [
            {
                "id": str(activity.id),
                "actor": activity.actor,
                "action": activity.action,
                "meta_json": activity.meta_json,
                "ts": activity.ts,
            }
            for activity in activities
        ]

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting room activity: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")


@router.post("/rooms/{room_id}/documents/{document_id}/approve")
async def approve_document(
    room_id: str,
    document_id: str,
    current_user: dict = Depends(get_current_user),
    session: AsyncSession = Depends(get_async_session),
    _: bool = Depends(cockpit_enabled),
):
    """
    Approve a document (requires owner permission)
    """
    try:
        # Verify user has owner permission
        await require_owner_permission(room_id, user_email, session)

        # Update document status
        await update_document(
            room_id,
            document_id,
            DocumentUpdateRequest(status="approved"),
            user_email,
            session,
            _,
        )

        # Log approval activity
        await log_activity(
            room_id, user_email, "document_approved", {"document_id": document_id}
        )

        return {"message": "Document approved successfully"}

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error approving document: {e}")
        await session.rollback()
        raise HTTPException(status_code=500, detail="Internal server error")


@router.post("/rooms/{room_id}/documents/{document_id}/reject")
async def reject_document(
    room_id: str,
    document_id: str,
    reason: str = Form(...),
    current_user: dict = Depends(get_current_user),
    session: AsyncSession = Depends(get_async_session),
    _: bool = Depends(cockpit_enabled),
):
    """
    Reject a document (requires owner permission)
    """
    try:
        # Verify user has owner permission
        await require_owner_permission(room_id, user_email, session)

        # Update document status and add rejection reason
        await update_document(
            room_id,
            document_id,
            DocumentUpdateRequest(
                status="missing", notes=f"Rejected by {user_email}: {reason}"
            ),
            user_email,
            session,
            _,
        )

        # Log rejection activity
        await log_activity(
            room_id,
            user_email,
            "document_rejected",
            {"document_id": document_id, "reason": reason},
        )

        return {"message": "Document rejected successfully"}

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error rejecting document: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")


@router.get("/cockpit/summary")
async def get_cockpit_summary(
    current_user: dict = Depends(get_current_user),
    session: AsyncSession = Depends(get_async_session)
):
    """
    Get overall cockpit summary across all rooms
    """
    try:
        # This would typically get summary across all user-accessible rooms
        # For now, return a basic summary
        return {
            "message": "Cockpit summary endpoint",
            "user": current_user.email,
            "note": "Full implementation needed for cross-room summary"
        }
    except Exception as e:
        logger.error(f"Error getting cockpit summary: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")


@router.get("/cockpit/analytics")
async def get_cockpit_analytics(
    current_user: dict = Depends(get_current_user),
    session: AsyncSession = Depends(get_async_session)
):
    """
    Get analytics data for the cockpit dashboard
    """
    try:
        # Get basic analytics
        rooms_count = await session.scalar(select(func.count(Room.id)))
        documents_count = await session.scalar(select(func.count(Document.id)))
        
        # Get document status distribution
        status_result = await session.execute(
            select(Document.status, func.count(Document.id))
            .group_by(Document.status)
        )
        status_distribution = {row[0]: row[1] for row in status_result}
        
        return {
            "total_rooms": rooms_count or 0,
            "total_documents": documents_count or 0,
            "document_status_distribution": status_distribution,
            "user": current_user.email,
            "generated_at": datetime.utcnow().isoformat()
        }
    except Exception as e:
        logger.error(f"Error getting cockpit analytics: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")


@router.get("/cockpit/alerts")
async def get_cockpit_alerts(
    current_user: dict = Depends(get_current_user),
    session: AsyncSession = Depends(get_async_session)
):
    """
    Get system alerts and notifications for the cockpit
    """
    try:
        alerts = []
        
        # Check for expiring documents
        expiring_soon = await session.execute(
            select(Document, Room.title)
            .join(Room)
            .where(
                Document.expires_on.isnot(None),
                Document.expires_on <= (datetime.utcnow() + timedelta(days=30)).date()
            )
            .limit(10)
        )
        
        for doc, room_title in expiring_soon:
            alerts.append({
                "type": "document_expiring",
                "severity": "warning",
                "message": f"Document expiring soon in room '{room_title}'",
                "document_id": str(doc.id),
                "expires_on": doc.expires_on.isoformat() if doc.expires_on else None
            })
        
        # Check for missing required documents
        missing_docs = await session.execute(
            select(Room.title, func.count(Document.id))
            .outerjoin(Document)
            .group_by(Room.id, Room.title)
            .having(func.count(Document.id) < 5)  # Assuming 5 is minimum required
            .limit(5)
        )
        
        for room_title, doc_count in missing_docs:
            alerts.append({
                "type": "missing_documents",
                "severity": "error",
                "message": f"Room '{room_title}' has only {doc_count} documents",
                "room_title": room_title
            })
        
        return {
            "alerts": alerts,
            "total_alerts": len(alerts),
            "user": current_user.email,
            "generated_at": datetime.utcnow().isoformat()
        }
    except Exception as e:
        logger.error(f"Error getting cockpit alerts: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")
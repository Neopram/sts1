"""
Documents router for STS Clearance system
Handles document management, uploads, and approvals
"""

import logging
from datetime import datetime
from typing import List, Optional

from fastapi import (APIRouter, Depends, File, Form, HTTPException, UploadFile,
                     status)
from fastapi.responses import FileResponse
from pydantic import BaseModel
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

# Pydantic models for request/response
class DocumentStatusUpdate(BaseModel):
    status: str
    comments: Optional[str] = None

from app.database import get_async_session
from app.dependencies import (get_current_user, log_activity,
                              require_room_access)
from app.models import Document, DocumentType, Party, Room
from app.services.file_service import file_service

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1", tags=["documents"])


# Basic documents endpoint (requires authentication)
@router.get("/documents")
async def get_documents(
    current_user: dict = Depends(get_current_user),
    session: AsyncSession = Depends(get_async_session)
):
    """
    Get all documents (requires authentication)
    This endpoint requires user authentication and will return 401 if not authenticated
    """
    # This endpoint requires authentication via get_current_user dependency
    # If we reach here, the user is authenticated
    return {"message": "Documents endpoint - authentication required", "user": current_user["email"]}


# Request/Response schemas
class DocumentResponse(BaseModel):
    id: str
    type_code: str
    type_name: str
    status: str
    expires_on: Optional[datetime] = None
    uploaded_by: Optional[str] = None
    uploaded_at: Optional[datetime] = None
    notes: Optional[str] = None
    file_url: Optional[str] = None
    criticality: str


class UpdateDocumentRequest(BaseModel):
    status: Optional[str] = None
    expires_on: Optional[datetime] = None
    notes: Optional[str] = None


class DocumentTypeResponse(BaseModel):
    id: str
    code: str
    name: str
    required: bool
    criticality: str


@router.get("/rooms/{room_id}/documents", response_model=List[DocumentResponse])
async def get_room_documents(
    room_id: str,
    current_user: dict = Depends(get_current_user),
    session: AsyncSession = Depends(get_async_session),
):
    """
    Get all documents for a room
    """
    try:
        user_email = current_user["email"]

        # Verify user has access to room
        await require_room_access(room_id, user_email, session)

        # Get all documents for the room with their types
        docs_result = await session.execute(
            select(
                Document.id,
                Document.status,
                Document.expires_on,
                Document.uploaded_by,
                Document.uploaded_at,
                Document.notes,
                Document.file_url,
                DocumentType.code,
                DocumentType.name,
                DocumentType.criticality,
            )
            .join(DocumentType)
            .where(Document.room_id == room_id)
        )

        documents = []
        for row in docs_result:
            documents.append(
                DocumentResponse(
                    id=str(row.id),
                    type_code=row.code,
                    type_name=row.name,
                    status=row.status,
                    expires_on=row.expires_on,
                    uploaded_by=row.uploaded_by,
                    uploaded_at=row.uploaded_at,
                    notes=row.notes,
                    file_url=row.file_url,
                    criticality=row.criticality,
                )
            )

        return documents

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting room documents: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")


@router.get("/rooms/{room_id}/documents/{document_id}", response_model=DocumentResponse)
async def get_document(
    room_id: str,
    document_id: str,
    current_user: dict = Depends(get_current_user),
    session: AsyncSession = Depends(get_async_session),
):
    """
    Get specific document information
    """
    try:
        user_email = current_user["email"]

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
                Document.file_url,
                DocumentType.code,
                DocumentType.name,
                DocumentType.criticality,
            )
            .join(DocumentType)
            .where(Document.id == document_id, Document.room_id == room_id)
        )

        row = doc_result.first()
        if not row:
            raise HTTPException(status_code=404, detail="Document not found")

        return DocumentResponse(
            id=str(row.id),
            type_code=row.code,
            type_name=row.name,
            status=row.status,
            expires_on=row.expires_on,
            uploaded_by=row.uploaded_by,
            uploaded_at=row.uploaded_at,
            notes=row.notes,
            file_url=row.file_url,
            criticality=row.criticality,
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting document: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")


@router.post("/rooms/{room_id}/documents/{document_id}/upload")
async def upload_document(
    room_id: str,
    document_id: str,
    file: UploadFile = File(...),
    expires_on: Optional[str] = Form(None),
    notes: Optional[str] = Form(None),
    current_user: dict = Depends(get_current_user),
    session: AsyncSession = Depends(get_async_session),
):
    """
    Upload a document file
    """
    try:
        user_email = current_user["email"]
        user_name = current_user.get("name", "Unknown User")

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

        # Save file
        file_path = await file_service.save_file(file, room_id, "documents")

        # Parse expires_on if provided
        expires_datetime = None
        if expires_on:
            try:
                expires_datetime = datetime.fromisoformat(
                    expires_on.replace("Z", "+00:00")
                )
            except ValueError:
                raise HTTPException(status_code=400, detail="Invalid expires_on format")

        # Update document
        document.file_url = f"/api/v1/files/{file_path}"
        document.status = "under_review"
        document.uploaded_by = user_email
        document.uploaded_at = datetime.utcnow()
        document.expires_on = expires_datetime
        document.notes = notes

        await session.commit()

        # Log activity
        await log_activity(
            room_id,
            user_email,
            "document_uploaded",
            {"document_id": document_id, "filename": file.filename},
        )

        return {
            "message": "Document uploaded successfully",
            "file_url": document.file_url,
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error uploading document: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")


@router.patch(
    "/rooms/{room_id}/documents/{document_id}", response_model=DocumentResponse
)
async def update_document(
    room_id: str,
    document_id: str,
    document_data: UpdateDocumentRequest,
    current_user: dict = Depends(get_current_user),
    session: AsyncSession = Depends(get_async_session),
):
    """
    Update document information
    """
    try:
        user_email = current_user["email"]

        # Verify user has access to room
        await require_room_access(room_id, user_email, session)

        # Get document with type information
        doc_result = await session.execute(
            select(Document, DocumentType)
            .join(DocumentType)
            .where(Document.id == document_id, Document.room_id == room_id)
        )

        result = doc_result.first()
        if not result:
            raise HTTPException(status_code=404, detail="Document not found")

        document, doc_type = result

        # Update document fields
        if document_data.status is not None:
            document.status = document_data.status
        if document_data.expires_on is not None:
            document.expires_on = document_data.expires_on
        if document_data.notes is not None:
            document.notes = document_data.notes

        await session.commit()

        # Log activity
        changes = {}
        if document_data.status is not None:
            changes["status"] = document_data.status
        if document_data.expires_on is not None:
            changes["expires_on"] = (
                document_data.expires_on.isoformat()
                if document_data.expires_on
                else None
            )

        await log_activity(
            room_id,
            user_email,
            "document_updated",
            {"document_id": document_id, "changes": changes},
        )

        return DocumentResponse(
            id=str(document.id),
            type_code=doc_type.code,
            type_name=doc_type.name,
            status=document.status,
            expires_on=document.expires_on,
            uploaded_by=document.uploaded_by,
            uploaded_at=document.uploaded_at,
            notes=document.notes,
            file_url=document.file_url,
            criticality=doc_type.criticality,
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating document: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")


@router.post("/rooms/{room_id}/documents/{document_id}/approve")
async def approve_document(
    room_id: str,
    document_id: str,
    current_user: dict = Depends(get_current_user),
    session: AsyncSession = Depends(get_async_session),
):
    """
    Approve a document
    """
    try:
        user_email = current_user["email"]

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

        # Update document status
        document.status = "approved"
        await session.commit()

        # Log activity
        await log_activity(
            room_id, user_email, "document_approved", {"document_id": document_id}
        )

        return {"message": "Document approved successfully"}

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error approving document: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")


@router.post("/rooms/{room_id}/documents/{document_id}/reject")
async def reject_document(
    room_id: str,
    document_id: str,
    notes: str = Form(...),
    current_user: dict = Depends(get_current_user),
    session: AsyncSession = Depends(get_async_session),
):
    """
    Reject a document
    """
    try:
        user_email = current_user["email"]

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

        # Update document status and notes
        document.status = "rejected"
        document.notes = notes
        await session.commit()

        # Log activity
        await log_activity(
            room_id,
            user_email,
            "document_rejected",
            {"document_id": document_id, "notes": notes},
        )

        return {"message": "Document rejected successfully"}

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error rejecting document: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")


@router.get("/rooms/{room_id}/documents/{document_id}/download")
async def download_document(
    room_id: str,
    document_id: str,
    current_user: dict = Depends(get_current_user),
    session: AsyncSession = Depends(get_async_session),
):
    """
    Download a document file
    """
    try:
        user_email = current_user["email"]

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

        if not document.file_url:
            raise HTTPException(status_code=404, detail="Document file not found")

        # Extract file path from URL
        file_path = document.file_url.replace("/api/v1/files/", "")
        full_path = file_service.get_file_path(file_path)

        if not full_path or not full_path.exists():
            raise HTTPException(status_code=404, detail="Document file not found")

        # Log download activity
        await log_activity(
            room_id, user_email, "document_downloaded", {"document_id": document_id}
        )

        return FileResponse(
            path=str(full_path),
            filename=full_path.name,
            media_type="application/octet-stream",
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error downloading document: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")


@router.get("/document-types", response_model=List[DocumentTypeResponse])
async def get_document_types(session: AsyncSession = Depends(get_async_session)):
    """
    Get all available document types
    """
    try:
        # Get all document types
        types_result = await session.execute(select(DocumentType))
        doc_types = types_result.scalars().all()

        return [
            DocumentTypeResponse(
                id=str(doc_type.id),
                code=doc_type.code,
                name=doc_type.name,
                required=doc_type.required,
                criticality=doc_type.criticality,
            )
            for doc_type in doc_types
        ]

    except Exception as e:
        logger.error(f"Error getting document types: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")


@router.get("/rooms/{room_id}/documents/status-summary")
async def get_documents_status_summary(
    room_id: str,
    current_user: dict = Depends(get_current_user),
    session: AsyncSession = Depends(get_async_session),
):
    """
    Get summary of document statuses for a room
    """
    try:
        user_email = current_user["email"]

        # Verify user has access to room
        await require_room_access(room_id, user_email, session)

        # Get all documents for the room
        docs_result = await session.execute(
            select(Document.status, DocumentType.criticality, DocumentType.required)
            .join(DocumentType)
            .where(Document.room_id == room_id)
        )

        documents = docs_result.all()

        # Calculate summary
        total_docs = len(documents)
        missing_count = sum(1 for doc in documents if doc.status == "missing")
        under_review_count = sum(1 for doc in documents if doc.status == "under_review")
        approved_count = sum(1 for doc in documents if doc.status == "approved")
        rejected_count = sum(1 for doc in documents if doc.status == "rejected")
        expired_count = sum(1 for doc in documents if doc.status == "expired")

        # Critical documents
        critical_docs = [doc for doc in documents if doc.criticality == "high"]
        critical_missing = sum(1 for doc in critical_docs if doc.status == "missing")
        critical_approved = sum(1 for doc in critical_docs if doc.status == "approved")

        # Required documents
        required_docs = [doc for doc in documents if doc.required]
        required_missing = sum(1 for doc in required_docs if doc.status == "missing")
        required_approved = sum(1 for doc in required_docs if doc.status == "approved")

        return {
            "total_documents": total_docs,
            "missing": missing_count,
            "under_review": under_review_count,
            "approved": approved_count,
            "rejected": rejected_count,
            "expired": expired_count,
            "critical_documents": {
                "total": len(critical_docs),
                "missing": critical_missing,
                "approved": critical_approved,
            },
            "required_documents": {
                "total": len(required_docs),
                "missing": required_missing,
                "approved": required_approved,
            },
            "completion_percentage": round(
                (approved_count / total_docs * 100) if total_docs > 0 else 0, 1
            ),
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting documents status summary: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")


@router.get("/rooms/{room_id}/documents/{doc_id}")
async def get_document_by_id(
    room_id: str,
    doc_id: str,
    current_user: dict = Depends(get_current_user),
    session: AsyncSession = Depends(get_async_session)
):
    """
    Get a specific document by ID
    """
    try:
        # Verify room access
        await require_room_access(room_id, current_user["email"], session)
        
        # Get document
        result = await session.execute(
            select(Document, DocumentType)
            .join(DocumentType, Document.type_id == DocumentType.id)
            .where(Document.id == doc_id, Document.room_id == room_id)
        )
        doc_row = result.first()
        
        if not doc_row:
            raise HTTPException(status_code=404, detail="Document not found")
        
        document, doc_type = doc_row
        
        return DocumentResponse(
            id=document.id,
            type_code=doc_type.code,
            type_name=doc_type.name,
            status=document.status,
            expires_on=document.expires_on,
            uploaded_by=document.uploaded_by,
            uploaded_at=document.uploaded_at,
            notes=document.notes,
            priority=document.priority
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting document: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")


@router.get("/rooms/{room_id}/documents/{doc_id}/download")
async def download_document(
    room_id: str,
    doc_id: str,
    current_user: dict = Depends(get_current_user),
    session: AsyncSession = Depends(get_async_session)
):
    """
    Download a document file
    """
    try:
        # Verify room access
        await require_room_access(room_id, current_user["email"], session)
        
        # Get document
        result = await session.execute(
            select(Document)
            .where(Document.id == doc_id, Document.room_id == room_id)
        )
        document = result.scalar_one_or_none()
        
        if not document:
            raise HTTPException(status_code=404, detail="Document not found")
        
        # For now, return a placeholder response
        # In a real implementation, you would serve the actual file
        return {
            "message": "Document download endpoint",
            "document_id": doc_id,
            "room_id": room_id,
            "status": document.status,
            "note": "File serving implementation needed"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error downloading document: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")


@router.put("/rooms/{room_id}/documents/{doc_id}/status")
async def update_document_status(
    room_id: str,
    doc_id: str,
    status_update: DocumentStatusUpdate,
    current_user: dict = Depends(get_current_user),
    session: AsyncSession = Depends(get_async_session)
):
    """
    Update document status
    """
    try:
        # Verify room access
        await require_room_access(room_id, current_user["email"], session)
        
        # Get document
        result = await session.execute(
            select(Document)
            .where(Document.id == doc_id, Document.room_id == room_id)
        )
        document = result.scalar_one_or_none()
        
        if not document:
            raise HTTPException(status_code=404, detail="Document not found")
        
        # Update status
        await session.execute(
            update(Document)
            .where(Document.id == doc_id)
            .values(status=status_update.status)
        )
        await session.commit()
        
        # Log activity
        await log_activity(
            room_id=room_id,
            actor=current_user["email"],
            action="document_status_updated",
            meta_json={"document_id": doc_id, "new_status": status_update.status},
            session=session
        )
        
        return {"message": "Document status updated successfully", "status": status_update.status}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating document status: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")


@router.get("/rooms/{room_id}/documents")
async def get_room_documents(
    room_id: str,
    current_user: dict = Depends(get_current_user),
    session: AsyncSession = Depends(get_async_session)
):
    """
    Get all documents for a specific room (requires authentication)
    """
    try:
        # Verify user has access to room
        await require_room_access(room_id, current_user["email"], session)
        
        # Get documents for the room
        result = await session.execute(
            select(Document, DocumentType.name.label("type_name"))
            .join(DocumentType)
            .where(Document.room_id == room_id)
        )
        
        documents = []
        for doc, type_name in result:
            documents.append({
                "id": str(doc.id),
                "type_name": type_name,
                "status": doc.status,
                "uploaded_at": doc.uploaded_at.isoformat() if doc.uploaded_at else None,
                "expires_on": doc.expires_on.isoformat() if doc.expires_on else None,
                "uploaded_by": doc.uploaded_by,
                "notes": doc.notes
            })
        
        return {
            "room_id": room_id,
            "documents": documents,
            "total": len(documents)
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting room documents: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")

"""
Documents router for STS Clearance system
Handles document management, uploads, and approvals

Uses centralized permission manager for consistent permission checking
"""

import logging
from datetime import datetime
from typing import List, Optional

from fastapi import (APIRouter, Depends, File, Form, HTTPException, UploadFile,
                     status)
from fastapi.responses import FileResponse
from pydantic import BaseModel
from sqlalchemy import select, update, or_, func, desc
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

# Pydantic models for request/response
class DocumentStatusUpdate(BaseModel):
    status: str
    comments: Optional[str] = None

from app.database import get_async_session
from app.dependencies import (get_current_user, log_activity,
                              require_room_access)
from app.models import Document, DocumentType, DocumentVersion, Party, Room, User
from app.services.file_service import file_service
from app.permission_decorators import require_permission

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1", tags=["documents"])


# Helper function to extract user info from current_user (dict or User object)
def get_user_info(current_user, include_name=False):
    """Extract email, role, and optionally name from current_user (dict or User object)"""
    if isinstance(current_user, dict):
        email = current_user.get("email") or current_user.get("user_email")
        role = current_user.get("role") or current_user.get("user_role")
        name = current_user.get("name") or current_user.get("user_name", "")
        if include_name:
            return email, role, name
        return email, role
    else:
        if include_name:
            return current_user.email, current_user.role, current_user.name
        return current_user.email, current_user.role


# Basic documents endpoint (requires authentication)
@router.get("/documents")
async def get_documents(
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_async_session)
):
    """
    Get all documents (requires authentication)
    This endpoint requires user authentication and will return 401 if not authenticated
    """
    # This endpoint requires authentication via get_current_user dependency
    # If we reach here, the user is authenticated
    user_email, _ = get_user_info(current_user)
    return {"message": "Documents endpoint - authentication required", "user": user_email}


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
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_async_session),
):
    """
    Get all documents for a room, filtered by user's vessel access
    """
    try:
        user_email, _ = get_user_info(current_user)

        # Verify user has access to room
        await require_room_access(room_id, user_email, session)

        # Get user's accessible vessel IDs
        from app.dependencies import get_user_accessible_vessels
        accessible_vessel_ids = await get_user_accessible_vessels(room_id, user_email, session)

        # Build query based on vessel access
        from sqlalchemy.orm import joinedload
        
        where_conditions = [Document.room_id == room_id]
        
        # All users in a room can see common documents (vessel_id IS NULL)
        # Users with vessel access also see their vessel-specific documents
        if accessible_vessel_ids:
            # User has access to specific vessels - show documents from those vessels + common documents
            where_conditions.append(
                or_(
                    Document.vessel_id.in_(accessible_vessel_ids),
                    Document.vessel_id.is_(None)
                )
            )
        else:
            # User has no vessel access - show only common documents (room-level)
            # This includes all parties in the room, not just brokers
            where_conditions.append(Document.vessel_id.is_(None))

        # Get documents with their document type eagerly loaded - optimized query
        query = (
            select(Document)
            .join(DocumentType)
            .options(joinedload(Document.document_type))
            .options(joinedload(Document.versions))
            .where(*where_conditions)
            .order_by(Document.created_at.desc())  # Order for consistency
        )
        
        docs_result = await session.execute(query)
        doc_list = docs_result.unique().scalars().all()

        documents = []
        for doc in doc_list:
            # Get file_url from latest version (versions are ordered by created_at DESC)
            file_url = None
            if doc.versions:
                file_url = doc.versions[0].file_url
            
            documents.append(
                DocumentResponse(
                    id=str(doc.id),
                    type_code=doc.document_type.code,
                    type_name=doc.document_type.name,
                    status=doc.status,
                    expires_on=doc.expires_on,
                    uploaded_by=doc.uploaded_by,
                    uploaded_at=doc.uploaded_at,
                    notes=doc.notes,
                    file_url=file_url,
                    criticality=doc.document_type.criticality,
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
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_async_session),
):
    """
    Get specific document information
    Validates user has access to the specific document
    """
    try:
        user_email, _ = get_user_info(current_user)

        # Verify user has access to room
        await require_room_access(room_id, user_email, session)

        # ✅ VALIDATION: Get user's accessible vessel IDs to filter documents
        from app.dependencies import get_user_accessible_vessels
        accessible_vessel_ids = await get_user_accessible_vessels(room_id, user_email, session)

        # Get document with type information - validate vessel access
        # All room members can see common documents (vessel_id IS NULL)
        # Users with vessel access also see their vessel-specific documents
        access_condition = Document.vessel_id.is_(None)  # All users can see common documents
        if accessible_vessel_ids:
            access_condition = access_condition | Document.vessel_id.in_(accessible_vessel_ids)
        
        doc_result = await session.execute(
            select(Document)
            .options(
                selectinload(Document.document_type),
                selectinload(Document.versions)
            )
            .where(
                Document.id == document_id, 
                Document.room_id == room_id,
                access_condition
            )
        )

        doc = doc_result.unique().scalar_one_or_none()
        if not doc:
            raise HTTPException(status_code=403, detail="Access denied to this document")

        # Get file_url from latest version
        file_url = None
        if doc.versions:
            file_url = doc.versions[0].file_url

        return DocumentResponse(
            id=str(doc.id),
            type_code=doc.document_type.code,
            type_name=doc.document_type.name,
            status=doc.status,
            expires_on=doc.expires_on,
            uploaded_by=doc.uploaded_by,
            uploaded_at=doc.uploaded_at,
            notes=doc.notes,
            file_url=file_url,
            criticality=doc.document_type.criticality,
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting document: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")


@router.post("/rooms/{room_id}/documents/upload")
async def create_and_upload_document(
    room_id: str,
    file: UploadFile = File(...),
    type_id: Optional[str] = Form(None),
    document_type: Optional[str] = Form(None),  # Support both type_id and document_type code
    notes: Optional[str] = Form(None),
    expires_on: Optional[str] = Form(None),
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_async_session),
):
    """
    Upload a new document to a room (creates document if it doesn't exist)
    """
    try:
        user_email, _ = get_user_info(current_user)
        
        # Verify user has access to room
        await require_room_access(room_id, user_email, session)

        # Validate file
        if not file.filename or not file.content_type:
            raise HTTPException(status_code=400, detail="Invalid file")

        # Get document type - support both type_id and document_type code
        doc_type = None
        if type_id:
            doc_type_result = await session.execute(
                select(DocumentType).where(DocumentType.id == type_id)
            )
            doc_type = doc_type_result.scalar_one_or_none()
        elif document_type:
            doc_type_result = await session.execute(
                select(DocumentType).where(DocumentType.code == document_type)
            )
            doc_type = doc_type_result.scalar_one_or_none()
        
        if not doc_type:
            raise HTTPException(status_code=400, detail="Invalid document type - provide type_id or document_type")

        # Parse expiry date if provided
        expiry_date = None
        if expires_on:
            try:
                expiry_date = datetime.fromisoformat(expires_on.replace("Z", "+00:00"))
            except ValueError:
                raise HTTPException(status_code=400, detail="Invalid expiry date format")

        # Save file
        file_path = await file_service.save_file(file, room_id, "documents")
        file_url = f"/api/v1/files/{file_path}"

        # Check if document already exists for this type in this room
        existing_doc_result = await session.execute(
            select(Document).where(
                Document.room_id == room_id,
                Document.type_id == doc_type.id
            )
        )
        existing_doc = existing_doc_result.scalar_one_or_none()

        if existing_doc:
            # Update existing document
            document = existing_doc
            document.status = "under_review"
            document.uploaded_by = user_email
            document.uploaded_at = datetime.utcnow()
            document.expires_on = expiry_date
            if notes:
                document.notes = notes
        else:
            # Create new document
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
        import hashlib
        file_content = await file.read()
        await file.seek(0)
        sha256_hash = hashlib.sha256(file_content).hexdigest()

        doc_version = DocumentVersion(
            document_id=document.id,
            file_url=file_url,
            sha256=sha256_hash,
            size_bytes=len(file_content),
            mime=file.content_type or "application/octet-stream",
        )
        session.add(doc_version)

        await session.commit()

        # Log activity
        await log_activity(
            room_id,
            user_email,
            "document_uploaded",
            {"document_id": str(document.id), "filename": file.filename},
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


@router.post("/rooms/{room_id}/documents/{document_id}/upload")
async def upload_document(
    room_id: str,
    document_id: str,
    file: UploadFile = File(...),
    expires_on: Optional[str] = Form(None),
    notes: Optional[str] = Form(None),
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_async_session),
):
    """
    Upload a document file
    """
    try:
        user_email, user_role, user_name = get_user_info(current_user, include_name=True)

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
        file_url = f"/api/v1/files/{file_path}"

        # Parse expires_on if provided
        expires_datetime = None
        if expires_on:
            try:
                expires_datetime = datetime.fromisoformat(
                    expires_on.replace("Z", "+00:00")
                )
            except ValueError:
                raise HTTPException(status_code=400, detail="Invalid expires_on format")

        # Update document metadata
        document.status = "under_review"
        document.uploaded_by = user_email
        document.uploaded_at = datetime.utcnow()
        document.expires_on = expires_datetime
        document.notes = notes

        # Create document version with file info
        # For now, using placeholder SHA256 and size - these should come from file_service
        doc_version = DocumentVersion(
            document_id=document.id,
            file_url=file_url,
            sha256="",  # Could be calculated from file_service
            size_bytes=0,  # Could come from file_service
            mime=file.content_type or "application/octet-stream"
        )
        session.add(doc_version)

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
            "file_url": file_url,
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
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_async_session),
):
    """
    Update document information
    """
    try:
        user_email, _ = get_user_info(current_user)

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

        # Get file_url from latest version
        file_url = None
        if document.versions:
            file_url = document.versions[0].file_url

        return DocumentResponse(
            id=str(document.id),
            type_code=doc_type.code,
            type_name=doc_type.name,
            status=document.status,
            expires_on=document.expires_on,
            uploaded_by=document.uploaded_by,
            uploaded_at=document.uploaded_at,
            notes=document.notes,
            file_url=file_url,
            criticality=doc_type.criticality,
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating document: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")


@router.post("/rooms/{room_id}/documents/{document_id}/approve")
@require_permission("documents", "approve")
async def approve_document(
    room_id: str,
    document_id: str,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_async_session),
):
    """
    Approve a document
    Only Owner, Broker, and Charterer roles can approve documents
    
    Permission validation is handled by @require_permission decorator
    """
    try:
        user_email, _ = get_user_info(current_user)

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
@require_permission("documents", "reject")
async def reject_document(
    room_id: str,
    document_id: str,
    notes: str = Form(...),
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_async_session),
):
    """
    Reject a document
    Only Owner, Broker, and Charterer roles can reject documents
    
    Permission validation is handled by @require_permission decorator
    """
    try:
        user_email, _ = get_user_info(current_user)

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
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_async_session),
):
    """
    Download a document file
    Validates user has access to the specific document
    """
    try:
        user_email, _ = get_user_info(current_user)

        # Verify user has access to room
        await require_room_access(room_id, user_email, session)

        # ✅ VALIDATION: Get user's accessible vessel IDs to filter documents
        from app.dependencies import get_user_accessible_vessels
        accessible_vessel_ids = await get_user_accessible_vessels(room_id, user_email, session)

        # Get document - validate vessel access
        # All room members can see common documents (vessel_id IS NULL)
        # Users with vessel access also see their vessel-specific documents
        access_condition = Document.vessel_id.is_(None)  # All users can see common documents
        if accessible_vessel_ids:
            access_condition = access_condition | Document.vessel_id.in_(accessible_vessel_ids)
        
        doc_result = await session.execute(
            select(Document).where(
                Document.id == document_id, 
                Document.room_id == room_id,
                access_condition
            )
        )
        document = doc_result.scalar_one_or_none()

        if not document:
            raise HTTPException(status_code=403, detail="Access denied to this document")

        # Get file_url from latest version
        if not document.versions or len(document.versions) == 0:
            raise HTTPException(status_code=404, detail="Document file not found")
        
        file_url = document.versions[0].file_url

        # Extract file path from URL
        file_path = file_url.replace("/api/v1/files/", "")
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
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_async_session),
):
    """
    Get summary of document statuses for a room
    Filters documents by user's accessible vessels
    """
    try:
        user_email, _ = get_user_info(current_user)

        # Verify user has access to room
        await require_room_access(room_id, user_email, session)

        # ✅ VALIDATION: Get user's accessible vessel IDs to filter documents
        from app.dependencies import get_user_accessible_vessels
        accessible_vessel_ids = await get_user_accessible_vessels(room_id, user_email, session)

        # Build query based on vessel access
        # All room members can see common documents (vessel_id IS NULL)
        # Users with vessel access also see their vessel-specific documents
        if accessible_vessel_ids:
            # User has access to specific vessels - filter documents by vessel + common documents
            docs_result = await session.execute(
                select(Document.status, DocumentType.criticality, DocumentType.required)
                .join(DocumentType)
                .where(
                    Document.room_id == room_id,
                    (Document.vessel_id.in_(accessible_vessel_ids) | Document.vessel_id.is_(None))
                )
            )
        else:
            # User has no vessel access - show only common documents (room-level)
            # This includes all parties in the room, not just brokers
            docs_result = await session.execute(
                select(Document.status, DocumentType.criticality, DocumentType.required)
                .join(DocumentType)
                .where(Document.room_id == room_id, Document.vessel_id.is_(None))
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


# ============ DOCUMENT VERSIONS ENDPOINTS ============

class DocumentVersionResponse(BaseModel):
    id: str
    document_id: str
    file_url: str
    sha256: str
    created_at: datetime
    size_bytes: int
    mime: str


@router.get("/documents/{document_id}/versions", response_model=List[DocumentVersionResponse])
async def get_document_versions(
    document_id: str,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_async_session),
):
    """
    Get all versions of a document.
    """
    try:
        user_email, _ = get_user_info(current_user)

        # Get document and verify access
        doc_result = await session.execute(
            select(Document).where(Document.id == document_id)
        )
        document = doc_result.scalar_one_or_none()

        if not document:
            raise HTTPException(status_code=404, detail="Document not found")

        # Verify user has access to room
        await require_room_access(str(document.room_id), user_email, session)

        # Get all versions
        versions_result = await session.execute(
            select(DocumentVersion)
            .where(DocumentVersion.document_id == document_id)
            .order_by(desc(DocumentVersion.created_at))
        )
        versions = versions_result.scalars().all()

        return [
            DocumentVersionResponse(
                id=str(v.id),
                document_id=str(v.document_id),
                file_url=v.file_url,
                sha256=v.sha256,
                created_at=v.created_at,
                size_bytes=v.size_bytes,
                mime=v.mime,
            )
            for v in versions
        ]

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting document versions {document_id}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Internal server error")


@router.post("/documents/{document_id}/versions")
async def create_document_version(
    document_id: str,
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_async_session),
):
    """
    Create a new version of an existing document.
    """
    try:
        user_email, _ = get_user_info(current_user)

        # Get document and verify access
        doc_result = await session.execute(
            select(Document).where(Document.id == document_id)
        )
        document = doc_result.scalar_one_or_none()

        if not document:
            raise HTTPException(status_code=404, detail="Document not found")

        # Verify user has access to room
        await require_room_access(str(document.room_id), user_email, session)

        # Upload file and create version
        file_path = await file_service.save_file(file, str(document.room_id))
        
        import hashlib
        file_content = await file.read()
        await file.seek(0)
        sha256_hash = hashlib.sha256(file_content).hexdigest()

        # Create new version
        new_version = DocumentVersion(
            document_id=document_id,
            file_url=file_path,
            sha256=sha256_hash,
            size_bytes=len(file_content),
            mime=file.content_type or "application/octet-stream",
        )

        session.add(new_version)
        
        # Update document metadata
        document.uploaded_by = user_email
        document.uploaded_at = datetime.utcnow()
        
        await session.commit()
        await session.refresh(new_version)

        logger.info(f"Created new version for document {document_id} by {user_email}")

        return DocumentVersionResponse(
            id=str(new_version.id),
            document_id=str(new_version.document_id),
            file_url=new_version.file_url,
            sha256=new_version.sha256,
            created_at=new_version.created_at,
            size_bytes=new_version.size_bytes,
            mime=new_version.mime,
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating document version {document_id}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Internal server error")


# ============ DOCUMENT QUERY ENDPOINTS ============

@router.get("/documents/expiring-soon")
async def get_expiring_documents(
    days: int = 7,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_async_session),
):
    """
    Get documents that are expiring within the specified number of days.
    """
    try:
        user_email, _ = get_user_info(current_user)
        from datetime import timedelta

        # Calculate expiry threshold
        threshold_date = datetime.utcnow() + timedelta(days=days)

        # Get user's rooms
        user_rooms_result = await session.execute(
            select(Room.id)
            .join(Party, Room.id == Party.room_id)
            .where(Party.email == user_email)
        )
        user_room_ids = [str(r[0]) for r in user_rooms_result.all()]

        if not user_room_ids:
            return []

        # Get expiring documents
        expiring_docs_result = await session.execute(
            select(Document, DocumentType)
            .join(DocumentType)
            .where(
                Document.room_id.in_(user_room_ids),
                Document.expires_on.isnot(None),
                Document.expires_on <= threshold_date,
                Document.status != "expired",
            )
            .order_by(Document.expires_on.asc())
        )
        expiring_docs = expiring_docs_result.all()

        return [
            {
                "id": str(doc.id),
                "room_id": str(doc.room_id),
                "type_code": doc_type.code,
                "type_name": doc_type.name,
                "status": doc.status,
                "expires_on": doc.expires_on.isoformat() if doc.expires_on else None,
                "days_until_expiry": (doc.expires_on - datetime.utcnow()).days if doc.expires_on else None,
            }
            for doc, doc_type in expiring_docs
        ]

    except Exception as e:
        logger.error(f"Error getting expiring documents: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Internal server error")


@router.get("/documents/critical-path/{room_id}")
async def get_critical_path_documents(
    room_id: str,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_async_session),
):
    """
    Get all critical path documents for a room.
    """
    try:
        user_email, _ = get_user_info(current_user)

        # Verify user has access to room
        await require_room_access(room_id, user_email, session)

        # Get critical path documents
        critical_docs_result = await session.execute(
            select(Document, DocumentType)
            .join(DocumentType)
            .where(
                Document.room_id == room_id,
                Document.critical_path == True,  # noqa: E712
            )
            .order_by(DocumentType.criticality.desc())
        )
        critical_docs = critical_docs_result.all()

        return [
            {
                "id": str(doc.id),
                "room_id": str(doc.room_id),
                "type_code": doc_type.code,
                "type_name": doc_type.name,
                "status": doc.status,
                "priority": doc.priority,
                "expires_on": doc.expires_on.isoformat() if doc.expires_on else None,
                "criticality": doc_type.criticality,
            }
            for doc, doc_type in critical_docs
        ]

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting critical path documents for room {room_id}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Internal server error")




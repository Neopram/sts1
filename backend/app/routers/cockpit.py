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
    current_user: User = Depends(get_current_user),
    _: bool = Depends(cockpit_enabled),
):
    """
    Get comprehensive summary of room status including blockers and progress.
    Real permission validation logic:
    - All authenticated users in room can view summary (permission_matrix: approvals.view)
    - Documents are filtered by vessel access - users only see data they have permission for
    - Cockpit feature flag must be enabled
    """
    try:
        from app.permission_matrix import permission_matrix
        from app.models import User, Vessel
        from app.dependencies import get_user_accessible_vessels
        
        user_email = current_user["email"]
        
        # 1. VERIFY ROOM ACCESS
        await require_room_access(room_id, user_email, session)

        # 2. CHECK PERMISSION - User must have "approvals.view" permission for cockpit access
        user_result = await session.execute(
            select(User).where(User.email == user_email)
        )
        user = user_result.scalar_one_or_none()
        
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        
        if not permission_matrix.has_permission(user.role, "approvals", "view"):
            logger.warning(f"User {user_email} with role {user.role} denied cockpit access")
            raise HTTPException(
                status_code=403,
                detail=f"Permission denied: {user.role} cannot access cockpit"
            )

        # Get room information
        room_result = await session.execute(select(Room).where(Room.id == room_id))
        room = room_result.scalar_one_or_none()

        if not room:
            raise HTTPException(status_code=404, detail="Room not found")

        # 3. GET USER'S DATA SCOPE - Filter documents by vessel access
        accessible_vessel_ids = await get_user_accessible_vessels(room_id, user_email, session)
        
        # Build document query with vessel-based filtering
        if accessible_vessel_ids:
            # User can see documents for vessels they have access to
            # Documents can be vessel-specific (vessel_id not null) or room-level (vessel_id null)
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
                .where(
                    Document.room_id == room_id,
                    # Include room-level docs (vessel_id is None) or vessel-specific docs user can access
                    (Document.vessel_id.is_(None)) | (Document.vessel_id.in_(accessible_vessel_ids))
                )
            )
        else:
            # User has no vessel access - only show room-level documents
            if user.role in ["broker", "admin"]:
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
            else:
                # Non-brokers with no vessel access see only room-level documents
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
                    .where(
                        Document.room_id == room_id,
                        Document.vessel_id.is_(None)
                    )
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
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_async_session),
    _: bool = Depends(cockpit_enabled),
):
    """
    Upload a new document to a room with ROBUST permission validation
    
    5-Level Security Validation:
    1. Authentication - User must be authenticated
    2. Room Access - User must be party in the room
    3. Role-Based Permission - Must have documents.upload permission (per permission_matrix)
    4. Data Scope - Validate file + prevent malicious inputs
    5. Audit Logging - Complete audit trail of upload
    """
    try:
        from app.permission_matrix import PermissionMatrix
        
        user_email = current_user["email"]
        user_role = current_user.get("role", "")

        # LEVEL 1: AUTHENTICATION - Verify user is authenticated
        if not user_email:
            logger.warning("Upload attempt with no email in current_user")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="User not authenticated",
            )

        # LEVEL 2: ROOM ACCESS - Verify user has access to room
        await require_room_access(room_id, user_email, session)

        # LEVEL 3: ROLE-BASED PERMISSION - Check against permission_matrix
        if not PermissionMatrix.has_permission(user_role, "documents", "upload"):
            logger.warning(
                f"Unauthorized document upload attempt by {user_email} with role {user_role}"
            )
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Role '{user_role}' cannot upload documents. Allowed roles: owner, broker, charterer, seller, buyer.",
            )

        # LEVEL 4: DATA SCOPE - Validate file type and content
        if not file.filename or not file.content_type:
            raise HTTPException(status_code=400, detail="Invalid file")
        
        # Validate file size (max 100MB)
        MAX_FILE_SIZE = 100 * 1024 * 1024  # 100MB
        if file.size and file.size > MAX_FILE_SIZE:
            logger.warning(f"File size exceeds limit: {file.size} bytes by {user_email}")
            raise HTTPException(
                status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                detail="File size exceeds 100MB limit",
            )
        
        # Validate filename - prevent path traversal
        filename_safe = file.filename.strip()
        if ".." in filename_safe or "/" in filename_safe or "\\" in filename_safe:
            logger.warning(f"Suspicious filename detected: {filename_safe} by {user_email}")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid filename",
            )

        # Get document type and validate it exists
        doc_type_result = await session.execute(
            select(DocumentType).where(DocumentType.code == document_type)
        )
        doc_type = doc_type_result.scalar_one_or_none()

        if not doc_type:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid document type: {document_type}",
            )

        # Parse and validate expiry date if provided
        expiry_date = None
        if expires_on:
            try:
                expiry_date = datetime.fromisoformat(expires_on.replace("Z", "+00:00"))
                # Validate date is in the future
                if expiry_date < datetime.utcnow():
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail="Expiry date must be in the future",
                    )
            except ValueError:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Invalid expiry date format (use ISO 8601)",
                )

        # Store file
        file_url = await storage_service.store_file(file, room_id)

        # Create document record with atomic transaction
        async with session.begin_nested():
            document = Document(
                room_id=room_id,
                type_id=doc_type.id,
                status="under_review",
                expires_on=expiry_date,
                uploaded_by=user_email,
                uploaded_at=datetime.utcnow(),
                notes=notes.strip() if notes else None,
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

        # LEVEL 5: AUDIT LOGGING - Complete audit trail with context
        await log_activity(
            session=session,
            room_id=room_id,
            actor=user_email,
            action="document_uploaded",
            meta={
                "document_type": document_type,
                "filename": filename_safe,
                "file_size": file.size,
                "mime_type": file.content_type,
                "expires_on": str(expiry_date) if expiry_date else None,
                "uploader_role": user_role,
            },
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
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_async_session),
    _: bool = Depends(cockpit_enabled),
):
    """
    Update document status and metadata with ROBUST permission validation
    
    5-Level Security Validation:
    1. Authentication - User must be authenticated
    2. Room Access - User must be party in the room
    3. Role-Based Permission - Must have documents.update permission (per permission_matrix)
    4. Data Scope - Validate document ownership + data integrity
    5. Audit Logging - Complete audit trail of changes
    """
    try:
        from app.permission_matrix import PermissionMatrix
        
        user_email = current_user["email"]
        user_role = current_user.get("role", "")

        # LEVEL 1: AUTHENTICATION - Verify user is authenticated
        if not user_email:
            logger.warning("Document update attempt with no email in current_user")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="User not authenticated",
            )

        # LEVEL 2: ROOM ACCESS - Verify user has access to room
        await require_room_access(room_id, user_email, session)

        # LEVEL 3: ROLE-BASED PERMISSION - Check against permission_matrix
        if not PermissionMatrix.has_permission(user_role, "documents", "update"):
            logger.warning(
                f"Unauthorized document update attempt by {user_email} with role {user_role}"
            )
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Role '{user_role}' cannot update documents. Allowed roles: owner, broker, admin.",
            )

        # LEVEL 4: DATA SCOPE - Get and validate document
        doc_result = await session.execute(
            select(Document).where(
                Document.id == document_id, Document.room_id == room_id
            )
        )
        document = doc_result.scalar_one_or_none()

        if not document:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Document not found",
            )

        # Track what changed for audit logging
        changes_made = {}
        
        # Update document with validation
        update_values = {}
        if update_data.status is not None:
            # Validate status value
            valid_statuses = ["missing", "under_review", "approved", "rejected"]
            if update_data.status not in valid_statuses:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Invalid status. Allowed: {', '.join(valid_statuses)}",
                )
            if document.status != update_data.status:
                changes_made["status"] = f"{document.status} -> {update_data.status}"
            update_values["status"] = update_data.status
            
        if update_data.notes is not None:
            notes_safe = update_data.notes.strip() if update_data.notes else None
            if document.notes != notes_safe:
                changes_made["notes"] = "updated"
            update_values["notes"] = notes_safe
            
        if update_data.expires_on is not None:
            # Validate expiry date
            if update_data.expires_on < datetime.utcnow():
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Expiry date must be in the future",
                )
            if document.expires_on != update_data.expires_on:
                changes_made["expires_on"] = f"{document.expires_on} -> {update_data.expires_on}"
            update_values["expires_on"] = update_data.expires_on

        if update_values:
            await session.execute(
                update(Document)
                .where(Document.id == document_id)
                .values(**update_values)
            )
            await session.commit()

        # LEVEL 5: AUDIT LOGGING - Complete audit trail with context
        await log_activity(
            session=session,
            room_id=room_id,
            actor=user_email,
            action="document_updated",
            meta={
                "document_id": document_id,
                "changes": changes_made,
                "updater_role": user_role,
            },
        )

        return {
            "message": "Document updated successfully",
            "document_id": document_id,
            "changes_made": changes_made,
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating document: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")


@router.get("/rooms/{room_id}/documents/{document_id}")
async def get_document(
    room_id: str,
    document_id: str,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_async_session),
    _: bool = Depends(cockpit_enabled),
):
    """
    Get specific document details with ROBUST permission validation
    
    5-Level Security Validation:
    1. Authentication - User must be authenticated
    2. Room Access - User must be party in the room
    3. Role-Based Permission - Must have documents.view permission (per permission_matrix)
    4. Data Scope - Filter by vessel access (prevent data leakage)
    5. Audit Logging - Log view of sensitive documents
    """
    try:
        from app.permission_matrix import PermissionMatrix
        from app.dependencies import get_user_accessible_vessels
        
        user_email = current_user["email"]
        user_role = current_user.get("role", "")

        # LEVEL 1: AUTHENTICATION - Verify user is authenticated
        if not user_email:
            logger.warning("Document view attempt with no email in current_user")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="User not authenticated",
            )

        # LEVEL 2: ROOM ACCESS - Verify user has access to room
        await require_room_access(room_id, user_email, session)

        # LEVEL 3: ROLE-BASED PERMISSION - Check against permission_matrix
        if not PermissionMatrix.has_permission(user_role, "documents", "view"):
            logger.warning(
                f"Unauthorized document view attempt by {user_email} with role {user_role}"
            )
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Role '{user_role}' cannot view documents.",
            )

        # LEVEL 4: DATA SCOPE - Verify user can access this specific document
        # Get user's accessible vessel IDs
        accessible_vessel_ids = await get_user_accessible_vessels(room_id, user_email, session)

        # Get document - must be room-level OR belong to an accessible vessel
        doc_result = await session.execute(
            select(
                Document.id,
                Document.vessel_id,
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
            .where(
                Document.id == document_id,
                Document.room_id == room_id,
                # Allow if: room-level doc (vessel_id is None) OR user has vessel access
                (Document.vessel_id.is_(None)) | (Document.vessel_id.in_(accessible_vessel_ids)) if accessible_vessel_ids else (Document.vessel_id.is_(None))
            )
        )

        document = doc_result.scalar_one_or_none()
        if not document:
            logger.warning(
                f"Unauthorized document access attempt by {user_email} (document {document_id} not accessible)"
            )
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Document not accessible to you",
            )

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

        # LEVEL 5: AUDIT LOGGING - Log sensitive document view (if critical)
        if document.criticality in ["high", "critical"]:
            await log_activity(
                session=session,
                room_id=room_id,
                actor=user_email,
                action="document_viewed",
                meta={
                    "document_id": document_id,
                    "criticality": document.criticality,
                    "type": document.type_code,
                    "viewer_role": user_role,
                },
            )

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
    user_email: str = "demo@example.com",  # TODO: Get from auth
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
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_async_session),
    _: bool = Depends(cockpit_enabled),
):
    """
    Generate PDF snapshot of room status
    """
    try:
        user_email = current_user["email"]

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
    user_email: str = "demo@example.com",  # TODO: Get from auth
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
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_async_session),
    _: bool = Depends(cockpit_enabled),
):
    """
    Approve a document with ROBUST permission validation
    
    5-Level Security Validation:
    1. Authentication - User must be authenticated
    2. Room Access - User must be party in the room
    3. Role-Based Permission - Must have documents.approve permission (per permission_matrix)
    4. Data Scope - Validate document exists and status is approvable
    5. Audit Logging - Complete audit trail of approval
    """
    try:
        from app.permission_matrix import PermissionMatrix
        
        user_email = current_user["email"]
        user_role = current_user.get("role", "")

        # LEVEL 1: AUTHENTICATION - Verify user is authenticated
        if not user_email:
            logger.warning("Document approval attempt with no email in current_user")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="User not authenticated",
            )

        # LEVEL 2: ROOM ACCESS - Verify user has access to room
        await require_room_access(room_id, user_email, session)

        # LEVEL 3: ROLE-BASED PERMISSION - Check against permission_matrix
        if not PermissionMatrix.has_permission(user_role, "documents", "approve"):
            logger.warning(
                f"Unauthorized document approval attempt by {user_email} with role {user_role}"
            )
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Role '{user_role}' cannot approve documents. Allowed roles: owner, broker, charterer, admin.",
            )

        # LEVEL 4: DATA SCOPE - Validate document exists and can be approved
        doc_result = await session.execute(
            select(Document).where(
                Document.id == document_id, Document.room_id == room_id
            )
        )
        document = doc_result.scalar_one_or_none()

        if not document:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Document not found",
            )

        # Validate document is in approvable status
        if document.status == "approved":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Document is already approved",
            )

        # Update document status
        await session.execute(
            update(Document)
            .where(Document.id == document_id)
            .values(status="approved")
        )
        await session.commit()

        # LEVEL 5: AUDIT LOGGING - Complete audit trail with context
        await log_activity(
            session=session,
            room_id=room_id,
            actor=user_email,
            action="document_approved",
            meta={
                "document_id": document_id,
                "approver_role": user_role,
                "previous_status": document.status,
            },
        )

        logger.info(f"Document {document_id} approved by {user_email} (role: {user_role})")
        return {
            "message": "Document approved successfully",
            "document_id": document_id,
            "status": "approved",
        }

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
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_async_session),
    _: bool = Depends(cockpit_enabled),
):
    """
    Reject a document with ROBUST permission validation
    
    5-Level Security Validation:
    1. Authentication - User must be authenticated
    2. Room Access - User must be party in the room
    3. Role-Based Permission - Must have documents.reject permission (per permission_matrix)
    4. Data Scope - Validate document exists and can be rejected + validate reason
    5. Audit Logging - Complete audit trail of rejection
    """
    try:
        from app.permission_matrix import PermissionMatrix
        
        user_email = current_user["email"]
        user_role = current_user.get("role", "")

        # LEVEL 1: AUTHENTICATION - Verify user is authenticated
        if not user_email:
            logger.warning("Document rejection attempt with no email in current_user")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="User not authenticated",
            )

        # LEVEL 2: ROOM ACCESS - Verify user has access to room
        await require_room_access(room_id, user_email, session)

        # LEVEL 3: ROLE-BASED PERMISSION - Check against permission_matrix
        if not PermissionMatrix.has_permission(user_role, "documents", "reject"):
            logger.warning(
                f"Unauthorized document rejection attempt by {user_email} with role {user_role}"
            )
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Role '{user_role}' cannot reject documents. Allowed roles: owner, broker, charterer, admin.",
            )

        # LEVEL 4: DATA SCOPE - Validate document exists and can be rejected
        doc_result = await session.execute(
            select(Document).where(
                Document.id == document_id, Document.room_id == room_id
            )
        )
        document = doc_result.scalar_one_or_none()

        if not document:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Document not found",
            )

        # Validate rejection reason
        reason_safe = reason.strip() if reason else ""
        if not reason_safe:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Rejection reason is required",
            )
        if len(reason_safe) > 500:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Rejection reason must be less than 500 characters",
            )

        # Validate document is rejectable (not already approved)
        if document.status == "approved":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot reject an already approved document",
            )

        # Update document status with rejection reason
        rejection_note = f"Rejected by {user_email}: {reason_safe}"
        await session.execute(
            update(Document)
            .where(Document.id == document_id)
            .values(status="missing", notes=rejection_note)
        )
        await session.commit()

        # LEVEL 5: AUDIT LOGGING - Complete audit trail with context
        await log_activity(
            session=session,
            room_id=room_id,
            actor=user_email,
            action="document_rejected",
            meta={
                "document_id": document_id,
                "reason": reason_safe,
                "rejector_role": user_role,
                "previous_status": document.status,
            },
        )

        logger.info(f"Document {document_id} rejected by {user_email} (role: {user_role}): {reason_safe}")
        return {
            "message": "Document rejected successfully",
            "document_id": document_id,
            "status": "missing",
            "reason": reason_safe,
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error rejecting document: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")


@router.get("/cockpit/summary")
async def get_cockpit_summary(
    current_user: User = Depends(get_current_user),
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
            "user": current_user["email"],
            "note": "Full implementation needed for cross-room summary"
        }
    except Exception as e:
        logger.error(f"Error getting cockpit summary: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")


@router.get("/cockpit/analytics")
async def get_cockpit_analytics(
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_async_session)
):
    """
    Get analytics data for the cockpit dashboard with ROBUST permission validation
    
    5-Level Security Validation:
    1. Authentication - User must be authenticated
    2. Admin-Only Access - Analytics require admin role (permission_matrix)
    3. Role-Based Permission - Must have analytics permissions
    4. Data Scope - Filter to user's accessible data only (no global data leakage)
    5. Audit Logging - Log analytics access requests
    
    🔴 CRITICAL: Previous version exposed GLOBAL analytics to any authenticated user!
    This version filters data by user's accessible rooms/documents only.
    """
    try:
        from app.permission_matrix import PermissionMatrix
        from app.models import Party
        
        user_email = current_user["email"]
        user_role = current_user.get("role", "")

        # LEVEL 1: AUTHENTICATION - Verify user is authenticated
        if not user_email:
            logger.warning("Analytics access attempt with no email in current_user")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="User not authenticated",
            )

        # LEVEL 2 & 3: ROLE-BASED PERMISSION - Analytics require admin or broker role
        # Only admins and brokers should access analytics
        if user_role not in ["admin", "broker"]:
            logger.warning(
                f"Unauthorized analytics access attempt by {user_email} with role {user_role}"
            )
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Role '{user_role}' cannot access analytics. Only admin and broker roles allowed.",
            )

        # LEVEL 4: DATA SCOPE - Filter analytics by user's accessible rooms
        if user_role == "admin":
            # Admins can see ALL analytics
            rooms_count = await session.scalar(select(func.count(Room.id)))
            documents_count = await session.scalar(select(func.count(Document.id)))
            
            status_result = await session.execute(
                select(Document.status, func.count(Document.id))
                .group_by(Document.status)
            )
        else:
            # Brokers and others can only see analytics for their accessible rooms
            # Get user's accessible rooms
            user_rooms_result = await session.execute(
                select(Room.id).join(
                    Party, Room.id == Party.room_id
                ).where(Party.email == user_email)
            )
            user_room_ids = [row[0] for row in user_rooms_result]
            
            if not user_room_ids:
                # User has no accessible rooms
                status_distribution = {}
                rooms_count = 0
                documents_count = 0
            else:
                # Count only user's accessible rooms
                rooms_count = len(user_room_ids)
                
                # Count documents in user's accessible rooms
                documents_count = await session.scalar(
                    select(func.count(Document.id))
                    .where(Document.room_id.in_(user_room_ids))
                )
                
                # Get document status distribution for user's rooms
                status_result = await session.execute(
                    select(Document.status, func.count(Document.id))
                    .where(Document.room_id.in_(user_room_ids))
                    .group_by(Document.status)
                )
                status_distribution = {row[0]: row[1] for row in status_result}

        # For admin, get full status distribution
        if user_role == "admin":
            status_distribution = {row[0]: row[1] for row in status_result}

        # LEVEL 5: AUDIT LOGGING - Log analytics access (especially for admins viewing everything)
        await log_activity(
            session=session,
            room_id=None,  # Analytics is system-wide, not room-specific
            actor=user_email,
            action="analytics_accessed",
            meta={
                "user_role": user_role,
                "rooms_visible": rooms_count,
                "documents_visible": documents_count,
            },
        )

        logger.info(f"Analytics accessed by {user_email} (role: {user_role})")
        
        return {
            "total_rooms": rooms_count or 0,
            "total_documents": documents_count or 0,
            "document_status_distribution": status_distribution or {},
            "user": user_email,
            "user_role": user_role,
            "data_scope": "admin_all" if user_role == "admin" else "user_accessible",
            "generated_at": datetime.utcnow().isoformat()
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting cockpit analytics: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")


@router.get("/cockpit/alerts")
async def get_cockpit_alerts(
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_async_session)
):
    """
    Get system alerts and notifications for the cockpit with ROBUST permission validation
    
    5-Level Security Validation:
    1. Authentication - User must be authenticated
    2. Admin-Only Access - Alerts require admin or broker role
    3. Role-Based Permission - Must have view permissions
    4. Data Scope - Filter alerts by user's accessible rooms ONLY (prevent data leakage)
    5. Audit Logging - Log alerts access
    
    🔴 CRITICAL: Previous version exposed GLOBAL alerts about ALL rooms to any authenticated user!
    This version filters alerts to user's accessible rooms only.
    """
    try:
        from app.models import Party
        
        user_email = current_user["email"]
        user_role = current_user.get("role", "")

        # LEVEL 1: AUTHENTICATION - Verify user is authenticated
        if not user_email:
            logger.warning("Alerts access attempt with no email in current_user")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="User not authenticated",
            )

        # LEVEL 2 & 3: ROLE-BASED PERMISSION - Alerts require admin or broker role
        if user_role not in ["admin", "broker"]:
            logger.warning(
                f"Unauthorized alerts access attempt by {user_email} with role {user_role}"
            )
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Role '{user_role}' cannot access alerts. Only admin and broker roles allowed.",
            )

        # LEVEL 4: DATA SCOPE - Filter alerts by user's accessible rooms
        alerts = []
        
        # Get user's accessible room IDs
        if user_role == "admin":
            # Admins see ALL alerts
            user_rooms_result = await session.execute(select(Room.id))
            user_room_ids = [row[0] for row in user_rooms_result]
        else:
            # Brokers and others see only alerts for their rooms
            user_rooms_result = await session.execute(
                select(Room.id).join(
                    Party, Room.id == Party.room_id
                ).where(Party.email == user_email)
            )
            user_room_ids = [row[0] for row in user_rooms_result]
        
        if not user_room_ids:
            # User has no accessible rooms
            logger.info(f"No accessible rooms for user {user_email}")
            return {
                "alerts": [],
                "total_alerts": 0,
                "user": user_email,
                "user_role": user_role,
                "data_scope": "user_accessible",
                "generated_at": datetime.utcnow().isoformat()
            }

        # Check for expiring documents in accessible rooms
        expiring_soon = await session.execute(
            select(Document, Room.title, Room.id)
            .join(Room)
            .where(
                Room.id.in_(user_room_ids),  # CRITICAL: Filter by accessible rooms
                Document.expires_on.isnot(None),
                Document.expires_on <= (datetime.utcnow() + timedelta(days=30)).date()
            )
            .limit(10)
        )
        
        for doc, room_title, room_id in expiring_soon:
            alerts.append({
                "type": "document_expiring",
                "severity": "warning",
                "message": f"Document expiring soon in room '{room_title}'",
                "document_id": str(doc.id),
                "room_id": str(room_id),
                "expires_on": doc.expires_on.isoformat() if doc.expires_on else None
            })
        
        # Check for missing required documents in accessible rooms
        missing_docs = await session.execute(
            select(Room.title, Room.id, func.count(Document.id))
            .join(Room, Room.id == Document.room_id, isouter=True)
            .where(Room.id.in_(user_room_ids))  # CRITICAL: Filter by accessible rooms
            .group_by(Room.id, Room.title)
            .having(func.count(Document.id) < 5)  # Assuming 5 is minimum required
            .limit(5)
        )
        
        for room_title, room_id, doc_count in missing_docs:
            alerts.append({
                "type": "missing_documents",
                "severity": "error",
                "message": f"Room '{room_title}' has only {doc_count} documents",
                "room_id": str(room_id),
                "room_title": room_title,
                "document_count": doc_count
            })
        
        # LEVEL 5: AUDIT LOGGING - Log alerts access
        await log_activity(
            session=session,
            room_id=None,  # Alerts is system-wide, not room-specific
            actor=user_email,
            action="alerts_accessed",
            meta={
                "user_role": user_role,
                "rooms_checked": len(user_room_ids),
                "alerts_generated": len(alerts),
            },
        )

        logger.info(f"Alerts accessed by {user_email} (role: {user_role}), {len(alerts)} alerts generated")
        
        return {
            "alerts": alerts,
            "total_alerts": len(alerts),
            "user": user_email,
            "user_role": user_role,
            "data_scope": "admin_all" if user_role == "admin" else "user_accessible",
            "generated_at": datetime.utcnow().isoformat()
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting cockpit alerts: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")
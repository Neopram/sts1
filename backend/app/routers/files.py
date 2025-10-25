"""
File handling router for STS Clearance system
Handles file uploads, downloads, and static file serving
"""

import hashlib
import logging
import os
import uuid
from datetime import datetime
from pathlib import Path

import aiofiles
from fastapi import (APIRouter, Depends, File, Form, HTTPException, UploadFile,
                     status)
from fastapi.responses import FileResponse
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_async_session
from app.dependencies import get_current_user, require_room_access
from app.models import Document, DocumentVersion, Room

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1", tags=["files"])

# Create uploads directory
UPLOADS_DIR = Path("uploads")
UPLOADS_DIR.mkdir(exist_ok=True)


@router.post("/rooms/{room_id}/documents/{document_id}/upload")
async def upload_document_file(
    room_id: str,
    document_id: str,
    file: UploadFile = File(...),
    current_user: dict = Depends(get_current_user),
    session: AsyncSession = Depends(get_async_session),
):
    """
    Upload a file for a document
    """
    try:
        user_email = current_user.email

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

        # Validate file type
        allowed_extensions = {".pdf", ".doc", ".docx", ".jpg", ".jpeg", ".png", ".txt"}
        file_extension = Path(file.filename).suffix.lower()

        if file_extension not in allowed_extensions:
            raise HTTPException(
                status_code=400,
                detail=f"File type not allowed. Allowed types: {', '.join(allowed_extensions)}",
            )

        # Create file path
        file_id = str(uuid.uuid4())
        safe_filename = f"{file_id}_{file.filename}"
        file_path = UPLOADS_DIR / room_id / safe_filename
        file_path.parent.mkdir(parents=True, exist_ok=True)

        # Read and save file
        content = await file.read()

        # Calculate SHA256 hash
        sha256_hash = hashlib.sha256(content).hexdigest()

        # Save file
        async with aiofiles.open(file_path, "wb") as f:
            await f.write(content)

        # Create document version
        doc_version = DocumentVersion(
            document_id=document_id,
            file_url=str(file_path),
            sha256=sha256_hash,
            size_bytes=len(content),
        )
        session.add(doc_version)

        # Update document status
        document.status = "under_review"
        document.uploaded_by = user_email
        document.uploaded_at = datetime.utcnow()

        await session.commit()

        # Log activity
        from app.dependencies import log_activity

        await log_activity(
            room_id,
            user_email,
            "document_uploaded",
            {
                "document_id": document_id,
                "filename": file.filename,
                "size_bytes": len(content),
                "file_type": file_extension,
            },
        )

        # Send notification via WebSocket
        from app.websocket_manager import manager

        await manager.send_notification_to_room(
            room_id,
            "document_uploaded",
            "Document Uploaded",
            f"New document '{file.filename}' has been uploaded",
            {"document_id": document_id, "filename": file.filename},
        )

        return {
            "message": "File uploaded successfully",
            "file_id": file_id,
            "filename": file.filename,
            "size_bytes": len(content),
            "sha256": sha256_hash,
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error uploading file: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")


@router.get("/rooms/{room_id}/documents/{document_id}/download")
async def download_document_file(
    room_id: str,
    document_id: str,
    current_user: dict = Depends(get_current_user),
    session: AsyncSession = Depends(get_async_session),
):
    """
    Download the latest version of a document file
    """
    try:
        user_email = current_user.email

        # Verify user has access to room
        await require_room_access(room_id, user_email, session)

        # Get latest document version
        version_result = await session.execute(
            select(DocumentVersion)
            .where(DocumentVersion.document_id == document_id)
            .order_by(DocumentVersion.created_at.desc())
            .limit(1)
        )
        doc_version = version_result.scalar_one_or_none()

        if not doc_version:
            raise HTTPException(status_code=404, detail="Document file not found")

        file_path = Path(doc_version.file_url)

        if not file_path.exists():
            raise HTTPException(status_code=404, detail="File not found on disk")

        # Extract original filename from path
        original_filename = (
            file_path.name.split("_", 1)[1] if "_" in file_path.name else file_path.name
        )

        return FileResponse(
            path=str(file_path),
            filename=original_filename,
            media_type="application/octet-stream",
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error downloading file: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")


@router.get("/files/{file_path:path}")
async def serve_static_file(file_path: str):
    """
    Serve static files (for development only)
    """
    try:
        full_path = UPLOADS_DIR / file_path

        if not full_path.exists() or not full_path.is_file():
            raise HTTPException(status_code=404, detail="File not found")

        # Security check - ensure file is within uploads directory
        if not str(full_path.resolve()).startswith(str(UPLOADS_DIR.resolve())):
            raise HTTPException(status_code=403, detail="Access denied")

        return FileResponse(path=str(full_path))

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error serving static file: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")


@router.get("/files/proxy")
async def proxy_document_file(
    url: str,
    current_user: dict = Depends(get_current_user),
):
    """
    Proxy endpoint to serve S3 files or other URLs
    Provides CORS-friendly access to files from different storage backends
    """
    try:
        import boto3
        
        # Parse S3 URL
        if not url.startswith("s3://"):
            raise HTTPException(status_code=400, detail="Invalid URL")
        
        parts = url.replace("s3://", "").split("/", 1)
        if len(parts) != 2:
            raise HTTPException(status_code=400, detail="Invalid S3 URL format")
        
        bucket, key = parts
        
        # Create S3 client
        s3_client = boto3.client("s3")
        
        # Generate presigned URL for browser access
        presigned_url = s3_client.generate_presigned_url(
            "get_object",
            Params={"Bucket": bucket, "Key": key},
            ExpiresIn=3600  # 1 hour
        )
        
        return {"url": presigned_url}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error proxying file: {e}")
        raise HTTPException(status_code=500, detail="Failed to access file")


@router.delete("/rooms/{room_id}/documents/{document_id}/files/{version_id}")
async def delete_document_file(
    room_id: str,
    document_id: str,
    version_id: str,
    current_user: dict = Depends(get_current_user),
    session: AsyncSession = Depends(get_async_session),
):
    """
    Delete a specific version of a document file
    """
    try:
        user_email = current_user.email

        # Verify user has access to room
        await require_room_access(room_id, user_email, session)

        # Check user permissions (only owners and brokers can delete files)
        from app.dependencies import get_user_party

        party = await get_user_party(room_id, user_email, session)

        if not party or party.role not in ["owner", "broker"]:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only owners and brokers can delete document files",
            )

        # Get document version
        version_result = await session.execute(
            select(DocumentVersion).where(
                DocumentVersion.id == version_id,
                DocumentVersion.document_id == document_id,
            )
        )
        doc_version = version_result.scalar_one_or_none()

        if not doc_version:
            raise HTTPException(status_code=404, detail="Document version not found")

        # Delete file from disk
        file_path = Path(doc_version.file_url)
        if file_path.exists():
            file_path.unlink()

        # Delete from database
        from sqlalchemy import delete as delete_stmt
        await session.execute(delete_stmt(DocumentVersion).where(DocumentVersion.id == version_id))
        await session.commit()

        # Log activity
        from app.dependencies import log_activity

        await log_activity(
            room_id,
            user_email,
            "document_file_deleted",
            {"document_id": document_id, "version_id": version_id},
        )

        return {"message": "Document file deleted successfully"}

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting document file: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")

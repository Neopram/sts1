"""
Snapshots router for STS Clearance system
Handles room status snapshots and historical records
"""

import io
import logging
import uuid
from datetime import datetime, timedelta
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_async_session
from app.dependencies import (get_current_user, log_activity,
                              require_room_access)
from app.services.pdf_generator import pdf_generator
from app.permission_decorators import require_permission

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1", tags=["snapshots"])


# Snapshot model (we'll add this to models.py later)
class Snapshot:
    def __init__(
        self,
        id: str,
        room_id: str,
        title: str,
        created_by: str,
        created_at: datetime,
        status: str = "completed",
        file_size: int = 0,
        snapshot_type: str = "pdf",
        download_url: str = None,
        data: dict = None,
    ):
        self.id = id
        self.room_id = room_id
        self.title = title
        self.created_by = created_by
        self.created_at = created_at
        self.status = status
        self.file_size = file_size
        self.snapshot_type = snapshot_type
        self.download_url = (
            download_url or f"/api/v1/rooms/{room_id}/snapshots/{id}/download"
        )
        self.data = data or {}


# In-memory snapshot storage (in production, this should be in database)
snapshots_storage = {}


# Request/Response schemas
class SnapshotResponse(BaseModel):
    id: str
    title: str
    created_by: str
    created_at: datetime
    status: str
    file_size: int
    snapshot_type: str
    download_url: str


class CreateSnapshotRequest(BaseModel):
    title: Optional[str] = None
    snapshot_type: str = "pdf"
    include_documents: bool = True
    include_activity: bool = True
    include_approvals: bool = True


@router.get("/rooms/{room_id}/snapshots", response_model=List[SnapshotResponse])
async def get_room_snapshots(
    room_id: str,
    limit: int = 20,
    offset: int = 0,
    current_user: dict = Depends(get_current_user),
    session: AsyncSession = Depends(get_async_session),
):
    """
    Get all snapshots for a room
    """
    try:
        user_email = current_user["email"]

        # Verify user has access to room
        await require_room_access(room_id, user_email, session)

        # Get snapshots from storage
        room_snapshots = snapshots_storage.get(room_id, [])

        # Sort by created_at (newest first) and apply pagination
        sorted_snapshots = sorted(
            room_snapshots, key=lambda x: x.created_at, reverse=True
        )
        paginated_snapshots = sorted_snapshots[offset : offset + limit]

        # Convert to response format
        response = []
        for snapshot in paginated_snapshots:
            response.append(
                SnapshotResponse(
                    id=snapshot.id,
                    title=snapshot.title,
                    created_by=snapshot.created_by,
                    created_at=snapshot.created_at,
                    status=snapshot.status,
                    file_size=snapshot.file_size,
                    snapshot_type=snapshot.snapshot_type,
                    download_url=snapshot.download_url,
                )
            )

        return response

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting room snapshots: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")


@router.post("/rooms/{room_id}/snapshots", response_model=SnapshotResponse)
async def create_snapshot(
    room_id: str,
    snapshot_data: CreateSnapshotRequest,
    current_user: dict = Depends(get_current_user),
    session: AsyncSession = Depends(get_async_session),
):
    """
    Create a new snapshot of room status with ROBUST permission validation
    
    5-Level Security Validation:
    1. Authentication - User must be authenticated
    2. Room Access - User must be party in the room
    3. Role-Based Permission - Owner/broker/charterer/admin can create (per permission_matrix)
    4. Data Scope - Validate snapshot options and prevent conflicts
    5. Audit Logging - Complete audit trail
    """
    try:
        from app.permission_matrix import PermissionMatrix
        
        user_email = current_user["email"]
        user_role = current_user.get("role", "")
        user_name = current_user.get("name", "Unknown User")

        # LEVEL 1: AUTHENTICATION
        user_check = await session.execute(
            select(Party).where(Party.email == user_email).limit(1)
        )
        if user_check.scalar_one_or_none() is None and user_role != "admin":
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="User not found in system",
            )

        # LEVEL 2: ROOM ACCESS
        await require_room_access(room_id, user_email, session)

        # LEVEL 3: ROLE-BASED PERMISSION
        if not PermissionMatrix.has_permission(user_role, "snapshots", "create"):
            logger.warning(
                f"Unauthorized snapshot creation attempt by {user_email} with role {user_role}"
            )
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Role '{user_role}' cannot create snapshots. Only owners, brokers, charterers, and admins can.",
            )

        # LEVEL 4: DATA SCOPE - Validate snapshot options
        valid_types = ["pdf", "json", "csv"]
        if snapshot_data.snapshot_type not in valid_types:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid snapshot type. Must be one of: {', '.join(valid_types)}",
            )

        # Generate title if not provided
        if snapshot_data.title:
            title = snapshot_data.title.strip()
            if len(title) == 0:
                title = f"Room Status Snapshot - {datetime.now().strftime('%Y-%m-%d %H:%M')}"
        else:
            title = f"Room Status Snapshot - {datetime.now().strftime('%Y-%m-%d %H:%M')}"

        # Create snapshot record
        snapshot_id = str(uuid.uuid4())
        snapshot = Snapshot(
            id=snapshot_id,
            room_id=room_id,
            title=title,
            created_by=user_email,
            created_at=datetime.utcnow(),
            status="generating",
            snapshot_type=snapshot_data.snapshot_type,
            data={
                "include_documents": snapshot_data.include_documents,
                "include_activity": snapshot_data.include_activity,
                "include_approvals": snapshot_data.include_approvals,
            },
        )

        # Store snapshot
        if room_id not in snapshots_storage:
            snapshots_storage[room_id] = []
        snapshots_storage[room_id].append(snapshot)

        # Simulate snapshot generation (in production, this would be async)
        try:
            # Mock file size
            snapshot.file_size = 1024 * 1024  # 1MB
            snapshot.status = "completed"
            logger.info(f"Snapshot {snapshot_id} generated successfully for room {room_id}")
        except Exception as gen_error:
            logger.error(f"Error generating snapshot {snapshot_id}: {gen_error}")
            snapshot.status = "failed"

        # LEVEL 5: AUDIT LOGGING
        await log_activity(
            session=session,
            room_id=room_id,
            actor=user_email,
            action="snapshot_created",
            meta={
                "snapshot_id": snapshot_id,
                "snapshot_title": title,
                "snapshot_type": snapshot_data.snapshot_type,
                "created_by_role": user_role,
                "options": {
                    "include_documents": snapshot_data.include_documents,
                    "include_activity": snapshot_data.include_activity,
                    "include_approvals": snapshot_data.include_approvals,
                },
            },
        )

        logger.info(
            f"Snapshot '{title}' ({snapshot_id}) created in room {room_id} by {user_email}"
        )

        return SnapshotResponse(
            id=snapshot.id,
            title=snapshot.title,
            created_by=snapshot.created_by,
            created_at=snapshot.created_at,
            status=snapshot.status,
            file_size=snapshot.file_size,
            snapshot_type=snapshot.snapshot_type,
            download_url=snapshot.download_url,
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating snapshot: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Internal server error")


@router.get("/rooms/{room_id}/snapshots/{snapshot_id}", response_model=SnapshotResponse)
async def get_snapshot(
    room_id: str,
    snapshot_id: str,
    current_user: dict = Depends(get_current_user),
    session: AsyncSession = Depends(get_async_session),
):
    """
    Get specific snapshot information
    """
    try:
        user_email = current_user["email"]

        # Verify user has access to room
        await require_room_access(room_id, user_email, session)

        # Find snapshot
        room_snapshots = snapshots_storage.get(room_id, [])
        snapshot = next((s for s in room_snapshots if s.id == snapshot_id), None)

        if not snapshot:
            raise HTTPException(status_code=404, detail="Snapshot not found")

        return SnapshotResponse(
            id=snapshot.id,
            title=snapshot.title,
            created_by=snapshot.created_by,
            created_at=snapshot.created_at,
            status=snapshot.status,
            file_size=snapshot.file_size,
            snapshot_type=snapshot.snapshot_type,
            download_url=snapshot.download_url,
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting snapshot: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")


@router.get("/rooms/{room_id}/snapshots/{snapshot_id}/download")
async def download_snapshot(
    room_id: str,
    snapshot_id: str,
    current_user: dict = Depends(get_current_user),
    session: AsyncSession = Depends(get_async_session),
):
    """
    Download a snapshot file
    """
    try:
        user_email = current_user["email"]

        # Verify user has access to room
        await require_room_access(room_id, user_email, session)

        # Find snapshot
        room_snapshots = snapshots_storage.get(room_id, [])
        snapshot = next((s for s in room_snapshots if s.id == snapshot_id), None)

        if not snapshot:
            raise HTTPException(status_code=404, detail="Snapshot not found")

        if snapshot.status != "completed":
            raise HTTPException(
                status_code=400, detail="Snapshot is not ready for download"
            )

        # Generate PDF content (mock for now)
        if snapshot.snapshot_type == "pdf":
            # In production, this would retrieve the actual file
            pdf_content = b"Mock PDF content for snapshot " + snapshot.id.encode()

            # Log download activity
            await log_activity(
                room_id, user_email, "snapshot_downloaded", {"snapshot_id": snapshot.id}
            )

            return StreamingResponse(
                io.BytesIO(pdf_content),
                media_type="application/pdf",
                headers={
                    "Content-Disposition": f"attachment; filename=snapshot-{snapshot.id}.pdf"
                },
            )
        else:
            raise HTTPException(status_code=400, detail="Unsupported snapshot type")

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error downloading snapshot: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")


@router.delete("/rooms/{room_id}/snapshots/{snapshot_id}")
async def delete_snapshot(
    room_id: str,
    snapshot_id: str,
    current_user: dict = Depends(get_current_user),
    session: AsyncSession = Depends(get_async_session),
):
    """
    Delete a snapshot with ROBUST permission validation
    
    5-Level Security Validation:
    1. Authentication - User must be authenticated
    2. Room Access - User must be party in the room
    3. Role-Based Permission - Only admin can delete (per permission_matrix)
    4. Data Scope - Validate snapshot exists before deletion
    5. Audit Logging - Complete audit trail
    """
    try:
        from app.permission_matrix import PermissionMatrix
        
        user_email = current_user["email"]
        user_role = current_user.get("role", "")

        # LEVEL 1: AUTHENTICATION
        user_check = await session.execute(
            select(Party).where(Party.email == user_email).limit(1)
        )
        if user_check.scalar_one_or_none() is None and user_role != "admin":
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="User not found in system",
            )

        # LEVEL 2: ROOM ACCESS
        await require_room_access(room_id, user_email, session)

        # LEVEL 3: ROLE-BASED PERMISSION - Only admin can delete
        if not PermissionMatrix.has_permission(user_role, "snapshots", "delete"):
            logger.warning(
                f"Unauthorized snapshot deletion attempt by {user_email} with role {user_role}"
            )
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Role '{user_role}' cannot delete snapshots. Only admins can delete.",
            )

        # LEVEL 4: DATA SCOPE - Find and validate snapshot
        room_snapshots = snapshots_storage.get(room_id, [])
        
        snapshot_to_delete = None
        for snapshot in room_snapshots:
            if snapshot.id == snapshot_id:
                snapshot_to_delete = snapshot
                break

        if not snapshot_to_delete:
            raise HTTPException(status_code=404, detail="Snapshot not found in this room")

        # Get snapshot details for audit log
        snapshot_title = snapshot_to_delete.title
        snapshot_type = snapshot_to_delete.snapshot_type

        # Delete snapshot
        snapshots_storage[room_id] = [s for s in room_snapshots if s.id != snapshot_id]

        # LEVEL 5: AUDIT LOGGING
        await log_activity(
            session=session,
            room_id=room_id,
            actor=user_email,
            action="snapshot_deleted",
            meta={
                "snapshot_id": snapshot_id,
                "snapshot_title": snapshot_title,
                "snapshot_type": snapshot_type,
                "deleted_by_role": user_role,
            },
        )

        logger.warning(
            f"Snapshot '{snapshot_title}' ({snapshot_id}) permanently deleted from room {room_id} by {user_email}"
        )

        return {"message": "Snapshot deleted successfully"}

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting snapshot {snapshot_id}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Internal server error")


@router.get("/rooms/{room_id}/snapshots/{snapshot_id}/status")
async def get_snapshot_status(
    room_id: str,
    snapshot_id: str,
    current_user: dict = Depends(get_current_user),
    session: AsyncSession = Depends(get_async_session),
):
    """
    Get snapshot generation status
    """
    try:
        user_email = current_user["email"]

        # Verify user has access to room
        await require_room_access(room_id, user_email, session)

        # Find snapshot
        room_snapshots = snapshots_storage.get(room_id, [])
        snapshot = next((s for s in room_snapshots if s.id == snapshot_id), None)

        if not snapshot:
            raise HTTPException(status_code=404, detail="Snapshot not found")

        return {
            "id": snapshot.id,
            "status": snapshot.status,
            "created_at": snapshot.created_at,
            "file_size": snapshot.file_size if snapshot.status == "completed" else None,
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting snapshot status: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")


# Initialize demo snapshots
def init_demo_snapshots():
    """Initialize some demo snapshots"""
    # Demo room ID (this should match actual room IDs in your system)
    demo_room_id = "demo-room-1"

    snapshots = [
        Snapshot(
            id=str(uuid.uuid4()),
            room_id=demo_room_id,
            title="Room Status Snapshot",
            created_by="demo@example.com",
            created_at=datetime.now() - timedelta(minutes=30),
            status="completed",
            file_size=1024 * 1024,  # 1MB
            snapshot_type="pdf",
        ),
        Snapshot(
            id=str(uuid.uuid4()),
            room_id=demo_room_id,
            title="Previous Status Snapshot",
            created_by="demo@example.com",
            created_at=datetime.now() - timedelta(hours=2),
            status="completed",
            file_size=1024 * 1024,  # 1MB
            snapshot_type="pdf",
        ),
    ]

    snapshots_storage[demo_room_id] = snapshots


# Initialize demo snapshots on module load
init_demo_snapshots()

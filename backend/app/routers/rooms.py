"""
Rooms router for STS Clearance system
Handles room management and access control
"""

import logging
import uuid
from datetime import datetime
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy import delete, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_async_session
from app.dependencies import get_current_user, log_activity
from app.models import (ActivityLog, Approval, Document, DocumentType, Message,
                        Party, Room, Snapshot, User, Vessel)
from app.schemas import PartyRole, RoomResponse
from app.permission_decorators import require_permission

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1", tags=["rooms"])


# Request schemas for room management
class CreateRoomRequest(BaseModel):
    title: str
    location: str
    sts_eta: datetime
    parties: List[dict]  # [{"role": "owner", "name": "...", "email": "..."}]


class UpdateRoomRequest(BaseModel):
    title: Optional[str] = None
    location: Optional[str] = None
    sts_eta: Optional[datetime] = None


class AddPartyRequest(BaseModel):
    role: PartyRole
    name: str
    email: str


@router.get("/rooms", response_model=List[RoomResponse])
async def get_rooms(
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_async_session),
):
    """
    Get all rooms accessible to the user
    """
    try:
        user_email = current_user.email

        # Get all rooms where user is a party
        rooms_result = await session.execute(
            select(Room)
            .join(Party, Room.id == Party.room_id)
            .where(Party.email == user_email)
        )

        rooms = rooms_result.scalars().all()

        # Convert to response format
        response = []
        for room in rooms:
            response.append(
                RoomResponse(
                    id=str(room.id),
                    title=room.title,
                    location=room.location,
                    sts_eta=room.sts_eta,
                )
            )

        return response

    except Exception as e:
        logger.error(f"Error getting rooms: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")


@router.get("/rooms/{room_id}", response_model=RoomResponse)
async def get_room(
    room_id: str,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_async_session),
):
    """
    Get specific room information
    """
    try:
        user_email = current_user.email

        # Get room and verify user access
        room_result = await session.execute(
            select(Room)
            .join(Party, Room.id == Party.room_id)
            .where(Room.id == room_id, Party.email == user_email)
        )

        room = room_result.scalar_one_or_none()

        if not room:
            raise HTTPException(status_code=404, detail="Room not found")

        return RoomResponse(
            id=str(room.id),
            title=room.title,
            location=room.location,
            sts_eta=room.sts_eta,
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting room: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")


@router.post("/rooms", response_model=RoomResponse)
async def create_room(
    room_data: CreateRoomRequest,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_async_session),
):
    """
    Create a new room with ROBUST permission validation and audit logging
    
    5-Level Security Validation:
    1. Authentication - User must be authenticated
    2. Role-Based Permission - Must be broker or admin (per permission_matrix)
    3. Input Validation - Validate room data
    4. Transaction Safety - Atomic creation of room and initial structure
    5. Audit Logging - Complete audit trail
    """
    try:
        from app.permission_matrix import PermissionMatrix
        
        user_email = current_user.email
        user_role = current_user.role
        user_name = current_user.name

        # LEVEL 1: AUTHENTICATION - Verify user is authenticated and exists in database
        user_result = await session.execute(
            select(Party).where(Party.email == user_email).limit(1)
        )
        user_exists = user_result.scalar_one_or_none() is not None
        
        if not user_exists and user_role != "admin":
            logger.warning(f"Unauthenticated room creation attempt by {user_email}")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="User not found in system",
            )

        # LEVEL 2: ROLE-BASED PERMISSION - Check against permission_matrix
        if not PermissionMatrix.has_permission(user_role, "rooms", "create"):
            logger.warning(
                f"Unauthorized room creation attempt by {user_email} with role {user_role}"
            )
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Role '{user_role}' cannot create rooms. Only brokers and admins can create rooms.",
            )

        # LEVEL 3: INPUT VALIDATION
        if not room_data.title or len(room_data.title.strip()) == 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Room title is required",
            )
        if not room_data.location or len(room_data.location.strip()) == 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Room location is required",
            )
        if not room_data.sts_eta:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="STS ETA is required",
            )

        # LEVEL 4: TRANSACTION SAFETY - Atomic room creation with initial structure
        async with session.begin_nested():
            try:
                # Create room
                room = Room(
                    title=room_data.title.strip(),
                    location=room_data.location.strip(),
                    sts_eta=room_data.sts_eta,
                    created_by=user_email,
                )

                session.add(room)
                await session.flush()  # Get the room ID

                # Add creator as owner party
                creator_party = Party(
                    room_id=room.id,
                    role="owner",
                    name=user_name,
                    email=user_email,
                )
                session.add(creator_party)

                # Add other parties to the room
                for party_data in room_data.parties:
                    # Skip if party email is same as creator
                    if party_data.get("email", "").lower() == user_email.lower():
                        continue

                    party = Party(
                        room_id=room.id,
                        role=party_data.get("role", "buyer"),
                        name=party_data.get("name", ""),
                        email=party_data.get("email", "").lower(),
                    )
                    session.add(party)

                # Create default documents for the room
                doc_types_result = await session.execute(select(DocumentType))
                doc_types = doc_types_result.scalars().all()

                for doc_type in doc_types:
                    document = Document(
                        room_id=room.id, type_id=doc_type.id, status="missing"
                    )
                    session.add(document)

                await session.commit()

            except Exception as tx_error:
                await session.rollback()
                logger.error(f"Transaction failed creating room: {str(tx_error)}")
                raise HTTPException(
                    status_code=500, detail="Failed to create room"
                )

        # LEVEL 5: AUDIT LOGGING - Complete audit trail with context
        await log_activity(
            session=session,
            room_id=str(room.id),
            actor=user_email,
            action="room_created",
            meta={
                "title": room_data.title,
                "location": room_data.location,
                "sts_eta": str(room_data.sts_eta),
                "parties_count": len(room_data.parties),
                "creator_role": user_role,
            },
        )

        logger.info(
            f"Room '{room_data.title}' created successfully by {user_email} (role: {user_role})"
        )

        return RoomResponse(
            id=str(room.id),
            title=room.title,
            location=room.location,
            sts_eta=room.sts_eta,
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating room: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Internal server error")


@router.patch("/rooms/{room_id}", response_model=RoomResponse)
async def update_room(
    room_id: str,
    room_data: UpdateRoomRequest,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_async_session),
):
    """
    Update room information with ROBUST permission validation
    
    5-Level Security Validation:
    1. Authentication - User must be authenticated
    2. Room Access - User must be party in the room
    3. Role-Based Permission - Must be broker or admin (per permission_matrix)
    4. Data Scope - Only owners/brokers can update; validate changes
    5. Audit Logging - Complete audit trail of changes
    """
    try:
        from app.permission_matrix import PermissionMatrix
        
        user_email = current_user.email
        user_role = current_user.role

        # LEVEL 1: AUTHENTICATION
        user_check = await session.execute(
            select(Party).where(Party.email == user_email).limit(1)
        )
        if user_check.scalar_one_or_none() is None and user_role != "admin":
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="User not found in system",
            )

        # LEVEL 2: ROOM ACCESS - Verify user is party in room
        user_party_result = await session.execute(
            select(Party).where(
                Party.room_id == room_id, Party.email == user_email
            )
        )
        user_party = user_party_result.scalar_one_or_none()

        if not user_party:
            logger.warning(
                f"Unauthorized update attempt for room {room_id} by {user_email}"
            )
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You do not have access to this room",
            )

        # Get room
        room_result = await session.execute(select(Room).where(Room.id == room_id))
        room = room_result.scalar_one_or_none()

        if not room:
            raise HTTPException(status_code=404, detail="Room not found")

        # LEVEL 3: ROLE-BASED PERMISSION - Check against permission_matrix
        if not PermissionMatrix.has_permission(user_role, "rooms", "update"):
            logger.warning(
                f"Unauthorized room update attempt by {user_email} with role {user_role}"
            )
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Role '{user_role}' cannot update rooms. Only brokers and admins can update.",
            )

        # LEVEL 4: DATA SCOPE - Validate and prepare changes
        update_data = {}
        if room_data.title is not None:
            title = room_data.title.strip()
            if len(title) == 0:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Room title cannot be empty",
                )
            update_data["title"] = title

        if room_data.location is not None:
            location = room_data.location.strip()
            if len(location) == 0:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Room location cannot be empty",
                )
            update_data["location"] = location

        if room_data.sts_eta is not None:
            update_data["sts_eta"] = room_data.sts_eta

        # Apply changes
        if update_data:
            for key, value in update_data.items():
                setattr(room, key, value)

            await session.commit()

            # LEVEL 5: AUDIT LOGGING - Track all changes with context
            await log_activity(
                session=session,
                room_id=room_id,
                actor=user_email,
                action="room_updated",
                meta={
                    "changes": update_data,
                    "updater_role": user_role,
                    "updater_email": user_email,
                },
            )

            logger.info(
                f"Room {room_id} updated by {user_email} (role: {user_role}): {list(update_data.keys())}"
            )
        else:
            logger.debug(f"No changes for room {room_id}")

        return RoomResponse(
            id=str(room.id),
            title=room.title,
            location=room.location,
            sts_eta=room.sts_eta,
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating room {room_id}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Internal server error")


@router.delete("/rooms/{room_id}")
async def delete_room(
    room_id: str,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_async_session),
):
    """
    Delete a room with ROBUST permission validation and cascade safety
    
    5-Level Security Validation:
    1. Authentication - User must be authenticated
    2. Room Access - User must be party in the room
    3. Role-Based Permission - Only admin can delete (per permission_matrix)
    4. Data Scope - Cascade deletion of all related data with transaction safety
    5. Audit Logging - Log deletion with full context
    """
    try:
        from app.permission_matrix import PermissionMatrix
        from app.models import DocumentVersion
        
        user_email = current_user.email
        user_role = current_user.role

        # LEVEL 1: AUTHENTICATION
        user_check = await session.execute(
            select(Party).where(Party.email == user_email).limit(1)
        )
        if user_check.scalar_one_or_none() is None and user_role != "admin":
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="User not found in system",
            )

        # Get room first
        room_result = await session.execute(select(Room).where(Room.id == room_id))
        room = room_result.scalar_one_or_none()

        if not room:
            raise HTTPException(status_code=404, detail="Room not found")

        # LEVEL 2: ROOM ACCESS - Verify user is party in room
        user_party_result = await session.execute(
            select(Party).where(
                Party.room_id == room_id, Party.email == user_email
            )
        )
        user_party = user_party_result.scalar_one_or_none()

        if not user_party:
            logger.warning(
                f"Unauthorized delete attempt for room {room_id} by {user_email}"
            )
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You do not have access to this room",
            )

        # LEVEL 3: ROLE-BASED PERMISSION - Check against permission_matrix (only admin)
        if not PermissionMatrix.has_permission(user_role, "rooms", "delete"):
            logger.warning(
                f"Unauthorized room deletion attempt by {user_email} with role {user_role}"
            )
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Role '{user_role}' cannot delete rooms. Only admins can delete rooms.",
            )

        # LEVEL 4: DATA SCOPE - Cascade deletion with transaction safety
        room_title = room.title  # Save for audit log
        deletion_meta = {
            "room_title": room_title,
            "room_id": room_id,
            "deleted_by": user_email,
            "deleted_by_role": user_role,
        }

        async with session.begin_nested():
            try:
                # Delete in correct order to avoid foreign key violations
                
                # Count items for audit report
                deletion_meta["documents_deleted"] = await session.scalar(
                    select(func.count(Document.id)).where(Document.room_id == room_id)
                )
                deletion_meta["vessels_deleted"] = await session.scalar(
                    select(func.count(Vessel.id)).where(Vessel.room_id == room_id)
                )
                deletion_meta["parties_deleted"] = await session.scalar(
                    select(func.count(Party.id)).where(Party.room_id == room_id)
                )
                deletion_meta["activities_deleted"] = await session.scalar(
                    select(func.count(ActivityLog.id)).where(
                        ActivityLog.room_id == room_id
                    )
                )

                # 1. Delete document versions first (references documents)
                await session.execute(
                    delete(DocumentVersion).where(
                        DocumentVersion.document_id.in_(
                            select(Document.id).where(Document.room_id == room_id)
                        )
                    )
                )

                # 2. Delete activity logs
                await session.execute(
                    delete(ActivityLog).where(ActivityLog.room_id == room_id)
                )

                # 3. Delete messages
                await session.execute(delete(Message).where(Message.room_id == room_id))

                # 4. Delete approvals
                await session.execute(
                    delete(Approval).where(Approval.room_id == room_id)
                )

                # 5. Delete snapshots
                await session.execute(
                    delete(Snapshot).where(Snapshot.room_id == room_id)
                )

                # 6. Delete documents
                await session.execute(
                    delete(Document).where(Document.room_id == room_id)
                )

                # 7. Delete vessels
                await session.execute(delete(Vessel).where(Vessel.room_id == room_id))

                # 8. Delete parties
                await session.execute(delete(Party).where(Party.room_id == room_id))

                # 9. Finally delete the room
                await session.execute(delete(Room).where(Room.id == room_id))

                # Commit the nested transaction
                await session.commit()

                logger.info(
                    f"Room {room_id} cascade deletion completed. Deleted: "
                    f"{deletion_meta.get('documents_deleted', 0)} docs, "
                    f"{deletion_meta.get('vessels_deleted', 0)} vessels, "
                    f"{deletion_meta.get('parties_deleted', 0)} parties"
                )

            except Exception as delete_error:
                # Rollback nested transaction
                await session.rollback()
                logger.error(
                    f"Cascade delete failed for room {room_id}: {str(delete_error)}",
                    exc_info=True,
                )
                raise HTTPException(
                    status_code=500, detail="Failed to delete room with dependencies"
                )

        # LEVEL 5: AUDIT LOGGING - Log deletion with full context
        try:
            await log_activity(
                session=session,
                room_id=room_id,
                actor=user_email,
                action="room_deleted",
                meta=deletion_meta,
            )
        except Exception as audit_error:
            logger.warning(f"Failed to log room deletion: {audit_error}")

        # Clean up filesystem files (outside transaction)
        import os
        import shutil

        uploads_path = f"uploads/room_{room_id}"
        if os.path.exists(uploads_path):
            try:
                shutil.rmtree(uploads_path, ignore_errors=True)
                logger.info(f"Cleaned up filesystem for room {room_id}")
            except Exception as fs_error:
                logger.warning(f"Failed to cleanup filesystem for {room_id}: {fs_error}")

        logger.warning(
            f"Room '{room_title}' ({room_id}) permanently deleted by {user_email} (role: {user_role})"
        )

        return {
            "status": "deleted",
            "room_id": room_id,
            "message": "Room and all associated data deleted successfully",
            "summary": deletion_meta,
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting room {room_id}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Internal server error")


@router.get("/rooms/{room_id}/parties")
async def get_room_parties(
    room_id: str,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_async_session),
):
    """
    Get all parties in a room
    """
    try:
        user_email = current_user.email

        # Verify user has access to room
        room_result = await session.execute(
            select(Room)
            .join(Party, Room.id == Party.room_id)
            .where(Room.id == room_id, Party.email == user_email)
        )
        room = room_result.scalar_one_or_none()

        if not room:
            raise HTTPException(
                status_code=404, detail="Room not found or access denied"
            )

        # Get all parties
        parties_result = await session.execute(
            select(Party).where(Party.room_id == room_id)
        )
        parties = parties_result.scalars().all()

        return [
            {
                "id": str(party.id),
                "role": party.role,
                "name": party.name,
                "email": party.email,
            }
            for party in parties
        ]

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting room parties: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")


@router.post("/rooms/{room_id}/parties")
async def add_party_to_room(
    room_id: str,
    party_data: AddPartyRequest,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_async_session),
):
    """
    Add a party to a room with ROBUST permission validation
    
    5-Level Security Validation:
    1. Authentication - User must be authenticated
    2. Room Access - User must be party in the room
    3. Role-Based Permission - User must be broker or admin (per permission_matrix)
    4. Data Scope - Validate party data and prevent duplicates
    5. Audit Logging - Complete audit trail
    """
    try:
        from app.permission_matrix import PermissionMatrix
        
        user_email = current_user.email
        user_role = current_user.role

        # LEVEL 1: AUTHENTICATION
        user_check = await session.execute(
            select(Party).where(Party.email == user_email).limit(1)
        )
        if user_check.scalar_one_or_none() is None and user_role != "admin":
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="User not found in system",
            )

        # LEVEL 2: ROOM ACCESS - Verify user is party in room
        user_party_result = await session.execute(
            select(Party).where(
                Party.room_id == room_id, Party.email == user_email
            )
        )
        user_party = user_party_result.scalar_one_or_none()

        if not user_party:
            logger.warning(
                f"Unauthorized party management attempt for room {room_id} by {user_email}"
            )
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You do not have access to this room",
            )

        # LEVEL 3: ROLE-BASED PERMISSION - Check against permission_matrix
        if not PermissionMatrix.has_permission(user_role, "rooms", "manage_parties"):
            logger.warning(
                f"Unauthorized party management attempt by {user_email} with role {user_role}"
            )
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Role '{user_role}' cannot manage parties. Only brokers and admins can.",
            )

        # LEVEL 4: DATA SCOPE - Validate party data
        new_party_email = party_data.email.lower().strip()
        
        if not new_party_email or "@" not in new_party_email:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Valid email address is required",
            )

        if not party_data.name or len(party_data.name.strip()) == 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Party name is required",
            )

        if new_party_email == user_email.lower():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot add yourself as a party",
            )

        # Check if party already exists
        existing_party_result = await session.execute(
            select(Party).where(
                Party.room_id == room_id, Party.email == new_party_email
            )
        )
        existing_party = existing_party_result.scalar_one_or_none()

        if existing_party:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Party already exists in this room",
            )

        # Validate role
        valid_roles = ["owner", "broker", "charterer", "seller", "buyer"]
        if party_data.role not in valid_roles:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid role. Must be one of: {', '.join(valid_roles)}",
            )

        # Add new party
        new_party = Party(
            room_id=room_id,
            role=party_data.role,
            name=party_data.name.strip(),
            email=new_party_email,
        )

        session.add(new_party)
        await session.commit()

        # LEVEL 5: AUDIT LOGGING
        await log_activity(
            session=session,
            room_id=room_id,
            actor=user_email,
            action="party_added",
            meta={
                "party_email": new_party_email,
                "party_role": party_data.role,
                "added_by_role": user_role,
            },
        )

        logger.info(
            f"Party {new_party_email} (role: {party_data.role}) added to room {room_id} by {user_email}"
        )

        return {
            "message": "Party added successfully",
            "party": {
                "id": str(new_party.id),
                "role": new_party.role,
                "name": new_party.name,
                "email": new_party.email,
            },
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error adding party to room: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")


@router.delete("/rooms/{room_id}/parties/{party_id}")
async def remove_party_from_room(
    room_id: str,
    party_id: str,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_async_session),
):
    """
    Remove a party from a room with ROBUST permission validation
    
    5-Level Security Validation:
    1. Authentication - User must be authenticated
    2. Room Access - User must be party in the room
    3. Role-Based Permission - User must be broker or admin (per permission_matrix)
    4. Data Scope - Cannot remove last owner; validate party exists
    5. Audit Logging - Complete audit trail
    """
    try:
        from app.permission_matrix import PermissionMatrix
        
        user_email = current_user.email
        user_role = current_user.role

        # LEVEL 1: AUTHENTICATION
        user_check = await session.execute(
            select(Party).where(Party.email == user_email).limit(1)
        )
        if user_check.scalar_one_or_none() is None and user_role != "admin":
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="User not found in system",
            )

        # LEVEL 2: ROOM ACCESS - Verify user is party in room
        user_party_result = await session.execute(
            select(Party).where(
                Party.room_id == room_id, Party.email == user_email
            )
        )
        user_party = user_party_result.scalar_one_or_none()

        if not user_party:
            logger.warning(
                f"Unauthorized party removal attempt for room {room_id} by {user_email}"
            )
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You do not have access to this room",
            )

        # LEVEL 3: ROLE-BASED PERMISSION - Check against permission_matrix
        if not PermissionMatrix.has_permission(user_role, "rooms", "manage_parties"):
            logger.warning(
                f"Unauthorized party removal attempt by {user_email} with role {user_role}"
            )
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Role '{user_role}' cannot manage parties. Only brokers and admins can.",
            )

        # LEVEL 4: DATA SCOPE - Validate party and business rules
        party_result = await session.execute(
            select(Party).where(Party.id == party_id, Party.room_id == room_id)
        )
        party = party_result.scalar_one_or_none()

        if not party:
            raise HTTPException(status_code=404, detail="Party not found in this room")

        # Prevent removing the last owner
        if party.role == "owner":
            owners_count_result = await session.execute(
                select(func.count(Party.id)).where(
                    Party.room_id == room_id, Party.role == "owner"
                )
            )
            owners_count = owners_count_result.scalar() or 0

            if owners_count <= 1:
                logger.warning(
                    f"Attempt to remove last owner {party.email} from room {room_id}"
                )
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Cannot remove the last owner from the room. Room must have at least one owner.",
                )

        # Prevent self-removal
        if party.email.lower() == user_email.lower():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot remove yourself from the room",
            )

        # Remove party
        party_email = party.email
        party_role = party.role
        
        await session.delete(party)
        await session.commit()

        # LEVEL 5: AUDIT LOGGING
        await log_activity(
            session=session,
            room_id=room_id,
            actor=user_email,
            action="party_removed",
            meta={
                "party_email": party_email,
                "party_role": party_role,
                "removed_by_role": user_role,
            },
        )

        logger.info(
            f"Party {party_email} (role: {party_role}) removed from room {room_id} by {user_email}"
        )

        return {"message": "Party removed successfully"}

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error removing party from room {room_id}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Internal server error")

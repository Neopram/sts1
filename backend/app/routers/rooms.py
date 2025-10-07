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
from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_async_session
from app.dependencies import get_current_user, log_activity
from app.models import (ActivityLog, Approval, Document, DocumentType, Message,
                        Party, Room, Snapshot, Vessel)
from app.schemas import PartyRole, RoomResponse

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
    current_user: dict = Depends(get_current_user),
    session: AsyncSession = Depends(get_async_session),
):
    """
    Get all rooms accessible to the user
    """
    try:
        user_email = current_user["email"]

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
    current_user: dict = Depends(get_current_user),
    session: AsyncSession = Depends(get_async_session),
):
    """
    Get specific room information
    """
    try:
        user_email = current_user["email"]

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
    current_user: dict = Depends(get_current_user),
    session: AsyncSession = Depends(get_async_session),
):
    """
    Create a new room (only owners and brokers can create rooms)
    """
    try:
        user_email = current_user["email"]
        user_role = current_user.get("role", "")

        # Check if user has permission to create rooms
        from app.dependencies import get_user_role_permissions

        permissions = get_user_role_permissions(user_role)

        if not permissions.get("can_create_rooms", False):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You don't have permission to create rooms. Only owners and brokers can create rooms.",
            )

        # Create room
        room = Room(
            title=room_data.title,
            location=room_data.location,
            sts_eta=room_data.sts_eta,
            created_by=user_email,
        )

        session.add(room)
        await session.flush()  # Get the room ID

        # Add creator as party (owner role)
        creator_party = Party(
            room_id=room.id, role="owner", name=current_user["name"], email=user_email
        )
        session.add(creator_party)

        # Add parties to the room
        for party_data in room_data.parties:
            # Skip if party email is same as creator
            if party_data["email"] == user_email:
                continue

            party = Party(
                room_id=room.id,
                role=party_data["role"],
                name=party_data["name"],
                email=party_data["email"],
            )
            session.add(party)

        # Create default documents for the room
        doc_types_result = await session.execute(select(DocumentType))
        doc_types = doc_types_result.scalars().all()

        for doc_type in doc_types:
            document = Document(room_id=room.id, type_id=doc_type.id, status="missing")
            session.add(document)

        await session.commit()

        # Log activity
        await log_activity(
            session=session,
            room_id=str(room.id),
            actor=current_user["name"],
            action="room_created",
            meta={"title": room_data.title, "location": room_data.location},
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
        logger.error(f"Error creating room: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")


@router.patch("/rooms/{room_id}", response_model=RoomResponse)
async def update_room(
    room_id: str,
    room_data: UpdateRoomRequest,
    current_user: dict = Depends(get_current_user),
    session: AsyncSession = Depends(get_async_session),
):
    """
    Update room information (only room creator or owners can update)
    """
    try:
        user_email = current_user["email"]

        # Get room and verify user access
        room_result = await session.execute(select(Room).where(Room.id == room_id))
        room = room_result.scalar_one_or_none()

        if not room:
            raise HTTPException(status_code=404, detail="Room not found")

        # Check if user has permission to update
        if room.created_by != user_email:
            # Check if user is an owner in this room
            party_result = await session.execute(
                select(Party).where(
                    Party.room_id == room_id,
                    Party.email == user_email,
                    Party.role == "owner",
                )
            )
            party = party_result.scalar_one_or_none()

            if not party:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Only room creator or owners can update room",
                )

        # Update room fields
        update_data = {}
        if room_data.title is not None:
            update_data["title"] = room_data.title
        if room_data.location is not None:
            update_data["location"] = room_data.location
        if room_data.sts_eta is not None:
            update_data["sts_eta"] = room_data.sts_eta

        if update_data:
            for key, value in update_data.items():
                setattr(room, key, value)

            await session.commit()

            # Log activity
            await log_activity(
                room_id, user_email, "room_updated", {"changes": update_data}
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
        logger.error(f"Error updating room: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")


@router.delete("/rooms/{room_id}")
async def delete_room(
    room_id: str,
    current_user: dict = Depends(get_current_user),
    session: AsyncSession = Depends(get_async_session),
):
    """
    Delete a room (only room creator can delete)
    Enhanced with proper transaction handling and cascade deletion
    """
    try:
        user_email = current_user["email"]

        # Get room and verify user is creator
        room_result = await session.execute(select(Room).where(Room.id == room_id))
        room = room_result.scalar_one_or_none()

        if not room:
            raise HTTPException(status_code=404, detail="Room not found")

        if room.created_by != user_email:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only room creator can delete room",
            )

        # Use nested transaction for atomic deletion
        async with session.begin_nested():
            try:
                # Delete in correct order to avoid foreign key violations

                # 1. Delete document versions first (references documents)
                from app.models import DocumentVersion

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
                await session.delete(room)

                # Commit the nested transaction
                await session.commit()

                # Clean up filesystem files (outside transaction)
                import os
                import shutil

                uploads_path = f"uploads/room_{room_id}"
                if os.path.exists(uploads_path):
                    shutil.rmtree(uploads_path, ignore_errors=True)

                # Log successful deletion
                await log_activity(
                    session=session,
                    room_id=room_id,
                    actor=user_email,
                    action="room_deleted",
                    meta={"room_title": room.title},
                )

                logger.info(f"Room {room_id} successfully deleted by {user_email}")

                return {
                    "status": "deleted",
                    "room_id": room_id,
                    "message": "Room and all associated data deleted successfully",
                }

            except Exception as delete_error:
                # Rollback nested transaction
                await session.rollback()
                logger.error(
                    f"Cascade delete failed for room {room_id}: {str(delete_error)}"
                )
                raise HTTPException(
                    status_code=500, detail="Failed to delete room with dependencies"
                )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting room {room_id}: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")


@router.get("/rooms/{room_id}/parties")
async def get_room_parties(
    room_id: str,
    current_user: dict = Depends(get_current_user),
    session: AsyncSession = Depends(get_async_session),
):
    """
    Get all parties in a room
    """
    try:
        user_email = current_user["email"]

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
    current_user: dict = Depends(get_current_user),
    session: AsyncSession = Depends(get_async_session),
):
    """
    Add a party to a room (only owners and brokers can add parties)
    """
    try:
        user_email = current_user["email"]

        # Verify user has permission to add parties
        party_result = await session.execute(
            select(Party).where(
                Party.room_id == room_id,
                Party.email == user_email,
                Party.role.in_(["owner", "broker"]),
            )
        )
        user_party = party_result.scalar_one_or_none()

        if not user_party:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only owners and brokers can add parties",
            )

        # Check if party already exists
        existing_party_result = await session.execute(
            select(Party).where(
                Party.room_id == room_id, Party.email == party_data.email
            )
        )
        existing_party = existing_party_result.scalar_one_or_none()

        if existing_party:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Party already exists in this room",
            )

        # Add new party
        new_party = Party(
            room_id=room_id,
            role=party_data.role,
            name=party_data.name,
            email=party_data.email,
        )

        session.add(new_party)
        await session.commit()

        # Log activity
        await log_activity(
            room_id,
            user_email,
            "party_added",
            {"party_email": party_data.email, "party_role": party_data.role},
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
    current_user: dict = Depends(get_current_user),
    session: AsyncSession = Depends(get_async_session),
):
    """
    Remove a party from a room (only owners and brokers can remove parties)
    """
    try:
        user_email = current_user["email"]

        # Verify user has permission to remove parties
        user_party_result = await session.execute(
            select(Party).where(
                Party.room_id == room_id,
                Party.email == user_email,
                Party.role.in_(["owner", "broker"]),
            )
        )
        user_party = user_party_result.scalar_one_or_none()

        if not user_party:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only owners and brokers can remove parties",
            )

        # Get party to remove
        party_result = await session.execute(
            select(Party).where(Party.id == party_id, Party.room_id == room_id)
        )
        party = party_result.scalar_one_or_none()

        if not party:
            raise HTTPException(status_code=404, detail="Party not found")

        # Don't allow removing the last owner
        if party.role == "owner":
            owners_count_result = await session.execute(
                select(Party).where(Party.room_id == room_id, Party.role == "owner")
            )
            owners_count = len(owners_count_result.scalars().all())

            if owners_count <= 1:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Cannot remove the last owner from the room",
                )

        # Remove party
        await session.delete(party)
        await session.commit()

        # Log activity
        await log_activity(
            room_id,
            user_email,
            "party_removed",
            {"party_email": party.email, "party_role": party.role},
        )

        return {"message": "Party removed successfully"}

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error removing party from room: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")

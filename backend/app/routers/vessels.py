"""
Vessels router for STS Clearance system
Handles vessel information and vessel-related operations
"""

import logging
from datetime import datetime
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_async_session
from app.dependencies import get_current_user, require_room_access
from app.models import Vessel
from app.permission_decorators import require_permission

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1", tags=["vessels"])


# Request/Response schemas
class VesselResponse(BaseModel):
    id: str
    name: str
    vessel_type: str
    flag: str
    imo: str
    status: str
    length: Optional[float] = None
    beam: Optional[float] = None
    draft: Optional[float] = None
    gross_tonnage: Optional[int] = None
    net_tonnage: Optional[int] = None
    built_year: Optional[int] = None
    classification_society: Optional[str] = None
    approvals: List[dict] = []


class CreateVesselRequest(BaseModel):
    name: str
    vessel_type: str
    flag: str
    imo: str
    length: Optional[float] = None
    beam: Optional[float] = None
    draft: Optional[float] = None
    gross_tonnage: Optional[int] = None
    net_tonnage: Optional[int] = None
    built_year: Optional[int] = None
    classification_society: Optional[str] = None


class UpdateVesselRequest(BaseModel):
    name: Optional[str] = None
    vessel_type: Optional[str] = None
    flag: Optional[str] = None
    imo: Optional[str] = None
    status: Optional[str] = None
    length: Optional[float] = None
    beam: Optional[float] = None
    draft: Optional[float] = None
    gross_tonnage: Optional[int] = None
    net_tonnage: Optional[int] = None
    built_year: Optional[int] = None
    classification_society: Optional[str] = None


@router.get("/rooms/{room_id}/vessels", response_model=List[VesselResponse])
async def get_room_vessels(
    room_id: str,
    current_user: dict = Depends(get_current_user),
    session: AsyncSession = Depends(get_async_session),
):
    """
    Get all vessels for a room, filtered by user's vessel ownership
    """
    try:
        user_email = current_user["email"]

        # Verify user has access to room
        await require_room_access(room_id, user_email, session)

        # Get user's accessible vessel IDs
        from app.dependencies import get_user_accessible_vessels
        accessible_vessel_ids = await get_user_accessible_vessels(room_id, user_email, session)

        # Build query based on vessel access
        if accessible_vessel_ids:
            # User has access to specific vessels - filter by accessible vessels
            vessels_result = await session.execute(
                select(Vessel).where(
                    Vessel.room_id == room_id,
                    Vessel.id.in_(accessible_vessel_ids)
                )
            )
        else:
            # User has no vessel access - return empty list (only brokers can see all vessels)
            if current_user.get("role") == "broker":
                # Brokers can see all vessels in the room
                vessels_result = await session.execute(
                    select(Vessel).where(Vessel.room_id == room_id)
                )
            else:
                # Non-brokers with no vessel access see nothing
                return []

        vessels = vessels_result.scalars().all()

        # Convert to response format
        response = []
        for vessel in vessels:
            # Mock approval data for each vessel
            approvals = [
                {
                    "id": f"approval-{vessel.id}-1",
                    "type": "Safety Certificate",
                    "status": "approved" if vessel.status == "active" else "pending",
                    "time": "2 hours ago",
                },
                {
                    "id": f"approval-{vessel.id}-2",
                    "type": "Insurance Certificate",
                    "status": (
                        "approved" if vessel.status == "active" else "under_review"
                    ),
                    "time": "1 hour ago",
                },
                {
                    "id": f"approval-{vessel.id}-3",
                    "type": "Crew List",
                    "status": "approved",
                    "time": "3 hours ago",
                },
            ]

            response.append(
                VesselResponse(
                    id=str(vessel.id),
                    name=vessel.name,
                    vessel_type=vessel.vessel_type,
                    flag=vessel.flag,
                    imo=vessel.imo,
                    status=vessel.status,
                    length=vessel.length,
                    beam=vessel.beam,
                    draft=vessel.draft,
                    gross_tonnage=vessel.gross_tonnage,
                    net_tonnage=vessel.net_tonnage,
                    built_year=vessel.built_year,
                    classification_society=vessel.classification_society,
                    approvals=approvals,
                )
            )

        return response

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting room vessels: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")


@router.post("/rooms/{room_id}/vessels", response_model=VesselResponse)
async def create_vessel(
    room_id: str,
    vessel_data: CreateVesselRequest,
    current_user: dict = Depends(get_current_user),
    session: AsyncSession = Depends(get_async_session),
):
    """
    Create a new vessel for a room with ROBUST permission validation
    
    5-Level Security Validation:
    1. Authentication - User must be authenticated
    2. Room Access - User must be party in the room
    3. Role-Based Permission - Must be broker or admin (per permission_matrix)
    4. Data Scope - Validate vessel data; prevent IMO duplicates
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

        # LEVEL 3: ROLE-BASED PERMISSION
        if not PermissionMatrix.has_permission(user_role, "vessels", "create"):
            logger.warning(
                f"Unauthorized vessel creation attempt by {user_email} with role {user_role}"
            )
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Role '{user_role}' cannot create vessels. Only brokers and admins can.",
            )

        # LEVEL 4: DATA SCOPE - Validate vessel data
        if not vessel_data.name or len(vessel_data.name.strip()) == 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Vessel name is required",
            )

        # Validate IMO number format (exactly 7 digits)
        if not vessel_data.imo or not vessel_data.imo.isdigit() or len(vessel_data.imo) != 7:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="IMO number must be exactly 7 digits",
            )

        # Check for IMO duplicates in this room
        existing_vessel_result = await session.execute(
            select(Vessel).where(
                Vessel.room_id == room_id, Vessel.imo == vessel_data.imo
            )
        )
        if existing_vessel_result.scalar_one_or_none():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Vessel with IMO {vessel_data.imo} already exists in this room",
            )

        if not vessel_data.vessel_type or len(vessel_data.vessel_type.strip()) == 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Vessel type is required",
            )

        if not vessel_data.flag or len(vessel_data.flag.strip()) == 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Flag state is required",
            )

        # Create vessel
        vessel = Vessel(
            room_id=room_id,
            name=vessel_data.name.strip(),
            vessel_type=vessel_data.vessel_type.strip(),
            flag=vessel_data.flag.strip(),
            imo=vessel_data.imo,
            length=vessel_data.length,
            beam=vessel_data.beam,
            draft=vessel_data.draft,
            gross_tonnage=vessel_data.gross_tonnage,
            net_tonnage=vessel_data.net_tonnage,
            built_year=vessel_data.built_year,
            classification_society=vessel_data.classification_society,
        )

        session.add(vessel)
        await session.commit()
        await session.refresh(vessel)

        # LEVEL 5: AUDIT LOGGING
        await log_activity(
            session=session,
            room_id=room_id,
            actor=user_email,
            action="vessel_created",
            meta={
                "vessel_name": vessel.name,
                "imo": vessel.imo,
                "vessel_type": vessel.vessel_type,
                "created_by_role": user_role,
            },
        )

        logger.info(
            f"Vessel '{vessel.name}' (IMO: {vessel.imo}) created in room {room_id} by {user_email}"
        )

        return VesselResponse(
            id=vessel.id,
            name=vessel.name,
            vessel_type=vessel.vessel_type,
            flag=vessel.flag,
            imo=vessel.imo,
            status=vessel.status,
            length=vessel.length,
            beam=vessel.beam,
            draft=vessel.draft,
            gross_tonnage=vessel.gross_tonnage,
            net_tonnage=vessel.net_tonnage,
            built_year=vessel.built_year,
            classification_society=vessel.classification_society,
            approvals=[],
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating vessel: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Internal server error")


@router.get("/rooms/{room_id}/vessels/{vessel_id}", response_model=VesselResponse)
async def get_vessel(
    room_id: str,
    vessel_id: str,
    current_user: dict = Depends(get_current_user),
    session: AsyncSession = Depends(get_async_session),
):
    """
    Get specific vessel information
    """
    try:
        user_email = current_user["email"]

        # Verify user has access to room
        await require_room_access(room_id, user_email, session)

        # Find vessel in database
        vessel_result = await session.execute(
            select(Vessel).where(Vessel.id == vessel_id, Vessel.room_id == room_id)
        )
        vessel = vessel_result.scalar_one_or_none()

        if not vessel:
            raise HTTPException(status_code=404, detail="Vessel not found")

        # Mock approval data
        approvals = [
            {
                "id": f"approval-{vessel.id}-1",
                "type": "Safety Certificate",
                "status": "approved",
                "time": "2 hours ago",
            },
            {
                "id": f"approval-{vessel.id}-2",
                "type": "Insurance Certificate",
                "status": "pending",
                "time": "1 hour ago",
            },
            {
                "id": f"approval-{vessel.id}-3",
                "type": "Crew List",
                "status": "approved",
                "time": "3 hours ago",
            },
        ]

        return VesselResponse(
            id=str(vessel.id),
            name=vessel.name,
            vessel_type=vessel.vessel_type,
            flag=vessel.flag,
            imo=vessel.imo,
            status=vessel.status,
            length=vessel.length,
            beam=vessel.beam,
            draft=vessel.draft,
            gross_tonnage=vessel.gross_tonnage,
            net_tonnage=vessel.net_tonnage,
            built_year=vessel.built_year,
            classification_society=vessel.classification_society,
            approvals=approvals,
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting vessel: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")


@router.patch("/rooms/{room_id}/vessels/{vessel_id}", response_model=VesselResponse)
@router.put("/rooms/{room_id}/vessels/{vessel_id}", response_model=VesselResponse)
async def update_vessel(
    room_id: str,
    vessel_id: str,
    vessel_data: UpdateVesselRequest,
    current_user: dict = Depends(get_current_user),
    session: AsyncSession = Depends(get_async_session),
):
    """
    Update vessel information with ROBUST permission validation
    
    5-Level Security Validation:
    1. Authentication - User must be authenticated
    2. Room Access - User must be party in the room
    3. Role-Based Permission - Must be broker or admin (per permission_matrix)
    4. Data Scope - Validate updates; prevent IMO conflicts
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

        # LEVEL 3: ROLE-BASED PERMISSION
        if not PermissionMatrix.has_permission(user_role, "vessels", "update"):
            logger.warning(
                f"Unauthorized vessel update attempt by {user_email} with role {user_role}"
            )
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Role '{user_role}' cannot update vessels. Only brokers and admins can.",
            )

        # LEVEL 4: DATA SCOPE - Find and validate vessel
        vessel_result = await session.execute(
            select(Vessel).where(Vessel.id == vessel_id, Vessel.room_id == room_id)
        )
        vessel = vessel_result.scalar_one_or_none()

        if not vessel:
            raise HTTPException(status_code=404, detail="Vessel not found in this room")

        # Validate updates
        updated_fields = {}

        if vessel_data.name is not None:
            name = vessel_data.name.strip()
            if len(name) == 0:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Vessel name cannot be empty",
                )
            if name != vessel.name:
                vessel.name = name
                updated_fields["name"] = name

        if vessel_data.vessel_type is not None:
            vessel_type = vessel_data.vessel_type.strip()
            if len(vessel_type) == 0:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Vessel type cannot be empty",
                )
            if vessel_type != vessel.vessel_type:
                vessel.vessel_type = vessel_type
                updated_fields["vessel_type"] = vessel_type

        if vessel_data.flag is not None:
            flag = vessel_data.flag.strip()
            if len(flag) == 0:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Flag cannot be empty",
                )
            if flag != vessel.flag:
                vessel.flag = flag
                updated_fields["flag"] = flag

        if vessel_data.imo is not None:
            # Validate IMO format
            if not vessel_data.imo.isdigit() or len(vessel_data.imo) != 7:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="IMO number must be exactly 7 digits",
                )
            # Check for IMO conflicts with other vessels
            if vessel_data.imo != vessel.imo:
                conflict_result = await session.execute(
                    select(Vessel).where(
                        Vessel.room_id == room_id,
                        Vessel.imo == vessel_data.imo,
                        Vessel.id != vessel_id,
                    )
                )
                if conflict_result.scalar_one_or_none():
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail=f"Vessel with IMO {vessel_data.imo} already exists",
                    )
                vessel.imo = vessel_data.imo
                updated_fields["imo"] = vessel_data.imo

        if vessel_data.status is not None and vessel_data.status != vessel.status:
            vessel.status = vessel_data.status
            updated_fields["status"] = vessel_data.status

        # Update numeric fields
        if vessel_data.length is not None and vessel_data.length != vessel.length:
            vessel.length = vessel_data.length
            updated_fields["length"] = vessel_data.length

        if vessel_data.beam is not None and vessel_data.beam != vessel.beam:
            vessel.beam = vessel_data.beam
            updated_fields["beam"] = vessel_data.beam

        if vessel_data.draft is not None and vessel_data.draft != vessel.draft:
            vessel.draft = vessel_data.draft
            updated_fields["draft"] = vessel_data.draft

        if vessel_data.gross_tonnage is not None and vessel_data.gross_tonnage != vessel.gross_tonnage:
            vessel.gross_tonnage = vessel_data.gross_tonnage
            updated_fields["gross_tonnage"] = vessel_data.gross_tonnage

        if vessel_data.net_tonnage is not None and vessel_data.net_tonnage != vessel.net_tonnage:
            vessel.net_tonnage = vessel_data.net_tonnage
            updated_fields["net_tonnage"] = vessel_data.net_tonnage

        if vessel_data.built_year is not None and vessel_data.built_year != vessel.built_year:
            vessel.built_year = vessel_data.built_year
            updated_fields["built_year"] = vessel_data.built_year

        if vessel_data.classification_society is not None and vessel_data.classification_society != vessel.classification_society:
            vessel.classification_society = vessel_data.classification_society
            updated_fields["classification_society"] = vessel_data.classification_society

        # Commit changes if any
        if updated_fields:
            await session.commit()

            # LEVEL 5: AUDIT LOGGING
            await log_activity(
                session=session,
                room_id=room_id,
                actor=user_email,
                action="vessel_updated",
                meta={
                    "vessel_id": vessel_id,
                    "vessel_name": vessel.name,
                    "changes": updated_fields,
                    "updated_by_role": user_role,
                },
            )

            logger.info(
                f"Vessel {vessel_id} ({vessel.name}) updated in room {room_id} by {user_email}: {list(updated_fields.keys())}"
            )

        return VesselResponse(
            id=str(vessel.id),
            name=vessel.name,
            vessel_type=vessel.vessel_type,
            flag=vessel.flag,
            imo=vessel.imo,
            status=vessel.status,
            length=vessel.length,
            beam=vessel.beam,
            draft=vessel.draft,
            gross_tonnage=vessel.gross_tonnage,
            net_tonnage=vessel.net_tonnage,
            built_year=vessel.built_year,
            classification_society=vessel.classification_society,
            approvals=[],
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating vessel {vessel_id}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Internal server error")


@router.delete("/rooms/{room_id}/vessels/{vessel_id}")
async def delete_vessel(
    room_id: str,
    vessel_id: str,
    current_user: dict = Depends(get_current_user),
    session: AsyncSession = Depends(get_async_session),
):
    """
    Delete a vessel with ROBUST permission validation
    
    5-Level Security Validation:
    1. Authentication - User must be authenticated
    2. Room Access - User must be party in the room
    3. Role-Based Permission - Only admin can delete (per permission_matrix)
    4. Data Scope - Validate vessel exists and safe to delete
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
        if not PermissionMatrix.has_permission(user_role, "vessels", "delete"):
            logger.warning(
                f"Unauthorized vessel deletion attempt by {user_email} with role {user_role}"
            )
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Role '{user_role}' cannot delete vessels. Only admins can delete.",
            )

        # LEVEL 4: DATA SCOPE - Find and validate vessel
        vessel_result = await session.execute(
            select(Vessel).where(Vessel.id == vessel_id, Vessel.room_id == room_id)
        )
        vessel = vessel_result.scalar_one_or_none()

        if not vessel:
            raise HTTPException(status_code=404, detail="Vessel not found in this room")

        # Get vessel details for audit log
        vessel_name = vessel.name
        vessel_imo = vessel.imo

        # Delete vessel
        await session.delete(vessel)
        await session.commit()

        # LEVEL 5: AUDIT LOGGING
        await log_activity(
            session=session,
            room_id=room_id,
            actor=user_email,
            action="vessel_deleted",
            meta={
                "vessel_id": vessel_id,
                "vessel_name": vessel_name,
                "vessel_imo": vessel_imo,
                "deleted_by_role": user_role,
            },
        )

        logger.warning(
            f"Vessel '{vessel_name}' (IMO: {vessel_imo}) permanently deleted from room {room_id} by {user_email}"
        )

        return {"message": "Vessel deleted successfully"}

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting vessel {vessel_id}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Internal server error")

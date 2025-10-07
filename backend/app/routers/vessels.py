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

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1", tags=["vessels"])


# Vessel model (we'll add this to models.py later)
class Vessel:
    def __init__(
        self,
        id: str,
        room_id: str,
        name: str,
        vessel_type: str,
        flag: str,
        imo: str,
        status: str = "active",
        length: float = None,
        beam: float = None,
        draft: float = None,
        gross_tonnage: int = None,
        net_tonnage: int = None,
        built_year: int = None,
        classification_society: str = None,
    ):
        self.id = id
        self.room_id = room_id
        self.name = name
        self.vessel_type = vessel_type
        self.flag = flag
        self.imo = imo
        self.status = status
        self.length = length
        self.beam = beam
        self.draft = draft
        self.gross_tonnage = gross_tonnage
        self.net_tonnage = net_tonnage
        self.built_year = built_year
        self.classification_society = classification_society


# In-memory vessel storage (in production, this should be in database)
vessels_storage = {}


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
    Get all vessels for a room
    """
    try:
        user_email = current_user["email"]

        # Verify user has access to room
        await require_room_access(room_id, user_email, session)

        # Get vessels from storage
        room_vessels = vessels_storage.get(room_id, [])

        # Convert to response format
        response = []
        for vessel in room_vessels:
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
    Create a new vessel for a room
    """
    try:
        user_email = current_user["email"]

        # Verify user has access to room
        await require_room_access(room_id, user_email, session)

        # Validate IMO number format (7 digits)
        if not vessel_data.imo.isdigit() or len(vessel_data.imo) != 7:
            raise HTTPException(
                status_code=400, detail="IMO number must be exactly 7 digits"
            )

        # Check if vessel with same IMO already exists in room
        existing_vessel_result = await session.execute(
            select(Vessel).where(
                Vessel.room_id == room_id, Vessel.imo == vessel_data.imo
            )
        )
        existing_vessel = existing_vessel_result.scalar_one_or_none()

        if existing_vessel:
            raise HTTPException(
                status_code=400, detail="Vessel with this IMO already exists in room"
            )

        # Create vessel
        vessel = Vessel(
            room_id=room_id,
            name=vessel_data.name,
            vessel_type=vessel_data.vessel_type,
            flag=vessel_data.flag,
            imo=vessel_data.imo,
            length=vessel_data.length,
            beam=vessel_data.beam,
            draft=vessel_data.draft,
            gross_tonnage=vessel_data.gross_tonnage,
            net_tonnage=vessel_data.net_tonnage,
            built_year=vessel_data.built_year,
            classification_society=vessel_data.classification_society,
        )

        # Save to database
        session.add(vessel)
        await session.commit()
        await session.refresh(vessel)

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
        logger.error(f"Error creating vessel: {e}")
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

        # Find vessel
        room_vessels = vessels_storage.get(room_id, [])
        vessel = next((v for v in room_vessels if v.id == vessel_id), None)

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
    Update vessel information
    """
    try:
        user_email = current_user["email"]

        # Verify user has access to room
        await require_room_access(room_id, user_email, session)

        # Find vessel
        room_vessels = vessels_storage.get(room_id, [])
        vessel = next((v for v in room_vessels if v.id == vessel_id), None)

        if not vessel:
            raise HTTPException(status_code=404, detail="Vessel not found")

        # Update vessel fields
        if vessel_data.name is not None:
            vessel.name = vessel_data.name
        if vessel_data.vessel_type is not None:
            vessel.vessel_type = vessel_data.vessel_type
        if vessel_data.flag is not None:
            vessel.flag = vessel_data.flag
        if vessel_data.imo is not None:
            vessel.imo = vessel_data.imo
        if vessel_data.status is not None:
            vessel.status = vessel_data.status
        if vessel_data.length is not None:
            vessel.length = vessel_data.length
        if vessel_data.beam is not None:
            vessel.beam = vessel_data.beam
        if vessel_data.draft is not None:
            vessel.draft = vessel_data.draft
        if vessel_data.gross_tonnage is not None:
            vessel.gross_tonnage = vessel_data.gross_tonnage
        if vessel_data.net_tonnage is not None:
            vessel.net_tonnage = vessel_data.net_tonnage
        if vessel_data.built_year is not None:
            vessel.built_year = vessel_data.built_year
        if vessel_data.classification_society is not None:
            vessel.classification_society = vessel_data.classification_society

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
        logger.error(f"Error updating vessel: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")


@router.delete("/rooms/{room_id}/vessels/{vessel_id}")
async def delete_vessel(
    room_id: str,
    vessel_id: str,
    current_user: dict = Depends(get_current_user),
    session: AsyncSession = Depends(get_async_session),
):
    """
    Delete a vessel
    """
    try:
        user_email = current_user["email"]

        # Verify user has access to room
        await require_room_access(room_id, user_email, session)

        # Find and remove vessel
        room_vessels = vessels_storage.get(room_id, [])
        original_count = len(room_vessels)

        vessels_storage[room_id] = [v for v in room_vessels if v.id != vessel_id]

        new_count = len(vessels_storage[room_id])

        if new_count < original_count:
            return {"message": "Vessel deleted successfully"}
        else:
            raise HTTPException(status_code=404, detail="Vessel not found")

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting vessel: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")


# Initialize demo vessels
def init_demo_vessels():
    """Initialize some demo vessels"""
    import uuid

    # Demo room ID (this should match actual room IDs in your system)
    demo_room_id = "demo-room-1"

    vessels = [
        Vessel(
            id=str(uuid.uuid4()),
            room_id=demo_room_id,
            name="MV Ocean Star",
            vessel_type="Bulk Carrier",
            flag="Panama",
            imo="IMO1234567",
            status="active",
            length=180.5,
            beam=32.2,
            draft=12.8,
            gross_tonnage=25000,
            net_tonnage=15000,
            built_year=2015,
            classification_society="DNV GL",
        ),
        Vessel(
            id=str(uuid.uuid4()),
            room_id=demo_room_id,
            name="MV Sea Explorer",
            vessel_type="Container Ship",
            flag="Marshall Islands",
            imo="IMO7654321",
            status="active",
            length=220.0,
            beam=36.0,
            draft=14.5,
            gross_tonnage=45000,
            net_tonnage=28000,
            built_year=2018,
            classification_society="ABS",
        ),
    ]

    vessels_storage[demo_room_id] = vessels


# Initialize demo vessels on module load
init_demo_vessels()

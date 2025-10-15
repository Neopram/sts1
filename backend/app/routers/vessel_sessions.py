"""
Vessel sessions router for STS Clearance system
Handles multi-vessel session creation and management
"""

import logging
from typing import List, Optional
from uuid import uuid4

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_async_session
from app.dependencies import get_current_user, require_room_access
from app.models import Room, Vessel, VesselPair

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1", tags=["vessel-sessions"])


# Request/Response schemas
class VesselPairRequest(BaseModel):
    mother_vessel_id: str
    receiving_vessel_id: str
    operation_type: str = "STS"  # STS, bunkering, etc.


class VesselPairResponse(BaseModel):
    id: str
    mother_vessel_id: str
    mother_vessel_name: str
    receiving_vessel_id: str
    receiving_vessel_name: str
    operation_type: str
    status: str
    created_at: str


class MultiVesselSessionRequest(BaseModel):
    title: str
    location: str
    sts_eta: str
    vessel_pairs: List[VesselPairRequest]
    description: Optional[str] = None


class MultiVesselSessionResponse(BaseModel):
    room_id: str
    title: str
    location: str
    sts_eta: str
    vessel_pairs: List[VesselPairResponse]
    total_vessels: int
    description: Optional[str] = None


@router.post("/vessel-sessions", response_model=MultiVesselSessionResponse)
async def create_multi_vessel_session(
    session_data: MultiVesselSessionRequest,
    current_user: dict = Depends(get_current_user),
    session: AsyncSession = Depends(get_async_session),
):
    """
    Create a new multi-vessel STS session with multiple vessel pairs
    """
    try:
        user_email = current_user["email"]
        user_role = current_user.get("role", "")

        # Only brokers and owners can create multi-vessel sessions
        if user_role not in ["broker", "owner"]:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only brokers and owners can create multi-vessel sessions"
            )

        # Validate vessel pairs
        if not session_data.vessel_pairs:
            raise HTTPException(
                status_code=400,
                detail="At least one vessel pair is required"
            )

        # Validate all vessels exist and user has access
        vessel_ids = set()
        for pair in session_data.vessel_pairs:
            vessel_ids.add(pair.mother_vessel_id)
            vessel_ids.add(pair.receiving_vessel_id)

        # Check vessel ownership based on user role
        user_company = current_user.get("company", "")
        accessible_vessels = []

        for vessel_id in vessel_ids:
            vessel_result = await session.execute(
                select(Vessel).where(Vessel.id == vessel_id)
            )
            vessel = vessel_result.scalar_one_or_none()

            if not vessel:
                raise HTTPException(
                    status_code=404,
                    detail=f"Vessel {vessel_id} not found"
                )

            # Check ownership permissions
            if user_role == "broker":
                # Brokers can use any vessel
                accessible_vessels.append(vessel)
            elif user_role == "owner":
                # Owners can only use their own vessels
                if vessel.owner and vessel.owner.lower() in user_company.lower():
                    accessible_vessels.append(vessel)
                else:
                    raise HTTPException(
                        status_code=status.HTTP_403_FORBIDDEN,
                        detail=f"You don't have permission to use vessel {vessel.name}"
                    )
            else:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Insufficient permissions to create vessel sessions"
                )

        # Create the room
        room = Room(
            title=session_data.title,
            location=session_data.location,
            sts_eta=session_data.sts_eta,
            created_by=user_email,
            description=session_data.description,
            status="active"
        )

        session.add(room)
        await session.flush()  # Get room ID

        # Create vessel pairs
        vessel_pairs = []
        for pair_data in session_data.vessel_pairs:
            # Get vessel details
            mother_result = await session.execute(
                select(Vessel).where(Vessel.id == pair_data.mother_vessel_id)
            )
            mother_vessel = mother_result.scalar_one()

            receiving_result = await session.execute(
                select(Vessel).where(Vessel.id == pair_data.receiving_vessel_id)
            )
            receiving_vessel = receiving_result.scalar_one()

            # Create vessel pair
            vessel_pair = VesselPair(
                room_id=room.id,
                mother_vessel_id=pair_data.mother_vessel_id,
                receiving_vessel_id=pair_data.receiving_vessel_id,
                operation_type=pair_data.operation_type,
                status="active"
            )

            session.add(vessel_pair)
            await session.flush()

            vessel_pairs.append(
                VesselPairResponse(
                    id=str(vessel_pair.id),
                    mother_vessel_id=str(vessel_pair.mother_vessel_id),
                    mother_vessel_name=mother_vessel.name,
                    receiving_vessel_id=str(vessel_pair.receiving_vessel_id),
                    receiving_vessel_name=receiving_vessel.name,
                    operation_type=vessel_pair.operation_type,
                    status=vessel_pair.status,
                    created_at=vessel_pair.created_at.isoformat()
                )
            )

        await session.commit()

        return MultiVesselSessionResponse(
            room_id=str(room.id),
            title=room.title,
            location=room.location,
            sts_eta=room.sts_eta.isoformat() if hasattr(room.sts_eta, 'isoformat') else room.sts_eta,
            vessel_pairs=vessel_pairs,
            total_vessels=len(vessel_ids),
            description=room.description
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating multi-vessel session: {e}")
        await session.rollback()
        raise HTTPException(status_code=500, detail="Internal server error")


@router.get("/rooms/{room_id}/vessel-pairs", response_model=List[VesselPairResponse])
async def get_room_vessel_pairs(
    room_id: str,
    current_user: dict = Depends(get_current_user),
    session: AsyncSession = Depends(get_async_session),
):
    """
    Get all vessel pairs for a room
    """
    try:
        user_email = current_user["email"]

        # Verify user has access to room
        await require_room_access(room_id, user_email, session)

        # Get vessel pairs with vessel details
        pairs_result = await session.execute(
            select(
                VesselPair,
                Vessel.name.label("mother_name")
            )
            .join(Vessel, VesselPair.mother_vessel_id == Vessel.id)
            .where(VesselPair.room_id == room_id)
        )

        vessel_pairs = []
        for row in pairs_result:
            vessel_pair = row.VesselPair
            mother_name = row.mother_name

            # Get receiving vessel name
            receiving_result = await session.execute(
                select(Vessel.name).where(Vessel.id == vessel_pair.receiving_vessel_id)
            )
            receiving_name = receiving_result.scalar_one()

            vessel_pairs.append(
                VesselPairResponse(
                    id=str(vessel_pair.id),
                    mother_vessel_id=str(vessel_pair.mother_vessel_id),
                    mother_vessel_name=mother_name,
                    receiving_vessel_id=str(vessel_pair.receiving_vessel_id),
                    receiving_vessel_name=receiving_name,
                    operation_type=vessel_pair.operation_type,
                    status=vessel_pair.status,
                    created_at=vessel_pair.created_at.isoformat()
                )
            )

        return vessel_pairs

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting room vessel pairs: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")


@router.get("/vessel-sessions/my-sessions")
async def get_my_vessel_sessions(
    current_user: dict = Depends(get_current_user),
    session: AsyncSession = Depends(get_async_session),
):
    """
    Get vessel sessions where user has vessels involved
    """
    try:
        user_email = current_user["email"]
        user_role = current_user.get("role", "")
        user_company = current_user.get("company", "")

        # Build query based on user role
        if user_role == "broker":
            # Brokers see all sessions
            rooms_result = await session.execute(
                select(Room).where(Room.status == "active")
            )
        elif user_role == "owner":
            # Owners see sessions with their vessels
            rooms_result = await session.execute(
                select(Room)
                .join(Vessel)
                .where(
                    Room.status == "active",
                    Vessel.owner.ilike(f"%{user_company}%")
                )
                .distinct()
            )
        elif user_role == "charterer":
            # Charterers see sessions with their chartered vessels
            rooms_result = await session.execute(
                select(Room)
                .join(Vessel)
                .where(
                    Room.status == "active",
                    Vessel.charterer.ilike(f"%{user_company}%")
                )
                .distinct()
            )
        else:
            # Other roles see no sessions
            return {"sessions": [], "total": 0}

        rooms = rooms_result.scalars().all()

        sessions = []
        for room in rooms:
            # Count vessel pairs for this room
            pairs_count = await session.execute(
                select(VesselPair).where(VesselPair.room_id == room.id)
            )
            vessel_pairs_count = len(pairs_count.scalars().all())

            sessions.append({
                "room_id": str(room.id),
                "title": room.title,
                "location": room.location,
                "sts_eta": room.sts_eta.isoformat() if hasattr(room.sts_eta, 'isoformat') else room.sts_eta,
                "vessel_pairs_count": vessel_pairs_count,
                "description": room.description,
                "created_by": room.created_by,
                "created_at": room.created_at.isoformat()
            })

        return {
            "sessions": sessions,
            "total": len(sessions)
        }

    except Exception as e:
        logger.error(f"Error getting my vessel sessions: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")

"""
Historical Access router for STS Clearance system
Handles privacy-protected historical views and data access
"""

import logging
from datetime import datetime, timedelta
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel
from sqlalchemy import desc, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_async_session
from app.dependencies import get_current_user
from app.models import Room, Vessel, Document, Approval, Message

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1", tags=["historical-access"])


# Request/Response schemas
class HistoricalRoomSummary(BaseModel):
    id: str
    title: str
    location: str
    sts_eta: Optional[datetime] = None
    created_at: datetime
    status: str
    vessel_count: int
    last_activity: Optional[datetime] = None
    user_role: str  # User's role in this historical operation


class HistoricalVesselData(BaseModel):
    id: str
    name: str
    imo: str
    owner: Optional[str] = None
    charterer: Optional[str] = None
    operation_status: str
    documents_count: int
    approvals_count: int
    messages_count: int


class HistoricalOperationDetails(BaseModel):
    room: HistoricalRoomSummary
    vessels: List[HistoricalVesselData]
    user_accessible_vessels: List[str]  # IMO numbers user can access
    total_vessels: int
    accessible_vessels: int


class PrivacySettings(BaseModel):
    allow_historical_access: bool = True
    data_retention_days: int = 365
    share_with_charterer: bool = False
    share_with_broker: bool = True


@router.get("/historical/operations", response_model=List[HistoricalRoomSummary])
async def get_historical_operations(
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
    current_user: dict = Depends(get_current_user),
    session: AsyncSession = Depends(get_async_session),
):
    """
    Get historical operations that the user has access to
    """
    try:
        user_email = current_user.email
        user_role = current_user.role
        user_company = current_user.get("company", "")

        # Get rooms that are completed or older than 30 days
        thirty_days_ago = datetime.utcnow() - timedelta(days=30)

        rooms_query = select(Room).where(
            (Room.status == 'completed') |
            (Room.created_at < thirty_days_ago)
        ).order_by(desc(Room.created_at)).limit(limit).offset(offset)

        rooms_result = await session.execute(rooms_query)
        rooms = rooms_result.scalars().all()

        historical_operations = []

        for room in rooms:
            # Check if user has access to any vessels in this room
            user_accessible_vessels = await _get_user_accessible_vessels(
                session, str(room.id), user_email, user_role, user_company
            )

            if user_accessible_vessels:
                # Get vessel count and last activity
                vessels_result = await session.execute(
                    select(Vessel).where(Vessel.room_id == room.id)
                )
                vessels = vessels_result.scalars().all()

                # Get last activity from messages, approvals, or documents
                last_activity = await _get_room_last_activity(session, str(room.id))

                # Determine user's role in this historical operation
                user_role_in_operation = await _determine_user_role_in_operation(
                    session, str(room.id), user_email, user_role, user_company
                )

                historical_operations.append(HistoricalRoomSummary(
                    id=str(room.id),
                    title=room.title,
                    location=room.location,
                    sts_eta=room.sts_eta,
                    created_at=room.created_at,
                    status=room.status,
                    vessel_count=len(vessels),
                    last_activity=last_activity,
                    user_role=user_role_in_operation
                ))

        return historical_operations

    except Exception as e:
        logger.error(f"Error getting historical operations: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")


@router.get("/historical/operations/{room_id}", response_model=HistoricalOperationDetails)
async def get_historical_operation_details(
    room_id: str,
    current_user: dict = Depends(get_current_user),
    session: AsyncSession = Depends(get_async_session),
):
    """
    Get detailed historical data for a specific operation
    """
    try:
        user_email = current_user.email
        user_role = current_user.role
        user_company = current_user.get("company", "")

        # Verify user has access to this historical operation
        user_accessible_vessels = await _get_user_accessible_vessels(
            session, room_id, user_email, user_role, user_company
        )

        if not user_accessible_vessels:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied to this historical operation"
            )

        # Get room details
        room_result = await session.execute(
            select(Room).where(Room.id == room_id)
        )
        room = room_result.scalar_one_or_none()

        if not room:
            raise HTTPException(status_code=404, detail="Historical operation not found")

        # Get all vessels in the room
        vessels_result = await session.execute(
            select(Vessel).where(Vessel.room_id == room_id)
        )
        all_vessels = vessels_result.scalars().all()

        # Build vessel data with privacy filtering
        vessels_data = []
        for vessel in all_vessels:
            vessel_imo = vessel.imo

            # Check if user can access this vessel's data
            can_access = vessel_imo in user_accessible_vessels

            if can_access:
                # Get counts for accessible data
                documents_count = await _get_vessel_data_count(session, room_id, vessel.id, Document)
                approvals_count = await _get_vessel_data_count(session, room_id, vessel.id, Approval)
                messages_count = await _get_vessel_data_count(session, room_id, vessel.id, Message)

                vessels_data.append(HistoricalVesselData(
                    id=str(vessel.id),
                    name=vessel.name,
                    imo=vessel_imo,
                    owner=vessel.owner,
                    charterer=vessel.charterer,
                    operation_status=vessel.status,
                    documents_count=documents_count,
                    approvals_count=approvals_count,
                    messages_count=messages_count
                ))
            else:
                # Show limited data for inaccessible vessels
                vessels_data.append(HistoricalVesselData(
                    id=str(vessel.id),
                    name="[Access Restricted]",
                    imo="[Access Restricted]",
                    owner=None,
                    charterer=None,
                    operation_status="restricted",
                    documents_count=0,
                    approvals_count=0,
                    messages_count=0
                ))

        # Get last activity
        last_activity = await _get_room_last_activity(session, room_id)

        # Determine user's role
        user_role_in_operation = await _determine_user_role_in_operation(
            session, room_id, user_email, user_role, user_company
        )

        room_summary = HistoricalRoomSummary(
            id=str(room.id),
            title=room.title,
            location=room.location,
            sts_eta=room.sts_eta,
            created_at=room.created_at,
            status=room.status,
            vessel_count=len(all_vessels),
            last_activity=last_activity,
            user_role=user_role_in_operation
        )

        return HistoricalOperationDetails(
            room=room_summary,
            vessels=vessels_data,
            user_accessible_vessels=user_accessible_vessels,
            total_vessels=len(all_vessels),
            accessible_vessels=len(user_accessible_vessels)
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting historical operation details: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")


@router.get("/historical/operations/{room_id}/vessel/{vessel_id}/data")
async def get_historical_vessel_data(
    room_id: str,
    vessel_id: str,
    data_type: str = Query(..., regex="^(documents|approvals|messages)$"),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    current_user: dict = Depends(get_current_user),
    session: AsyncSession = Depends(get_async_session),
):
    """
    Get historical data for a specific vessel (documents, approvals, or messages)
    """
    try:
        user_email = current_user.email
        user_role = current_user.role
        user_company = current_user.get("company", "")

        # Verify user has access to this vessel
        vessel = await _get_vessel_by_id(session, vessel_id)
        if not vessel:
            raise HTTPException(status_code=404, detail="Vessel not found")

        can_access = await _user_can_access_vessel(
            session, vessel, user_email, user_role, user_company
        )

        if not can_access:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied to this vessel's historical data"
            )

        # Get data based on type
        if data_type == "documents":
            data = await _get_vessel_documents(session, room_id, vessel_id, limit, offset)
        elif data_type == "approvals":
            data = await _get_vessel_approvals(session, room_id, vessel_id, limit, offset)
        elif data_type == "messages":
            data = await _get_vessel_messages(session, room_id, vessel_id, limit, offset)
        else:
            raise HTTPException(status_code=400, detail="Invalid data type")

        return {
            "vessel_id": vessel_id,
            "vessel_name": vessel.name,
            "data_type": data_type,
            "data": data,
            "limit": limit,
            "offset": offset
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting historical vessel data: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")


@router.get("/privacy/settings", response_model=PrivacySettings)
async def get_privacy_settings(
    current_user: dict = Depends(get_current_user),
    session: AsyncSession = Depends(get_async_session),
):
    """
    Get user's privacy settings for historical data
    """
    try:
        user_email = current_user.email

        # For now, return default settings
        # In a real implementation, this would be stored in user preferences
        return PrivacySettings()

    except Exception as e:
        logger.error(f"Error getting privacy settings: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")


@router.put("/privacy/settings")
async def update_privacy_settings(
    settings: PrivacySettings,
    current_user: dict = Depends(get_current_user),
    session: AsyncSession = Depends(get_async_session),
):
    """
    Update user's privacy settings for historical data
    """
    try:
        user_email = current_user.email

        # In a real implementation, this would update user preferences in database
        # For now, just return success
        return {
            "message": "Privacy settings updated successfully",
            "settings": settings
        }

    except Exception as e:
        logger.error(f"Error updating privacy settings: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")


# Helper functions
async def _get_user_accessible_vessels(
    session: AsyncSession,
    room_id: str,
    user_email: str,
    user_role: str,
    user_company: str
) -> List[str]:
    """Get list of vessel IMOs the user can access"""
    vessels_result = await session.execute(
        select(Vessel).where(Vessel.room_id == room_id)
    )
    vessels = vessels_result.scalars().all()

    accessible_imos = []

    for vessel in vessels:
        can_access = await _user_can_access_vessel(
            session, vessel, user_email, user_role, user_company
        )
        if can_access:
            accessible_imos.append(vessel.imo)

    return accessible_imos


async def _user_can_access_vessel(
    session: AsyncSession,
    vessel: Vessel,
    user_email: str,
    user_role: str,
    user_company: str
) -> bool:
    """Check if user can access a specific vessel"""
    if user_role == "broker":
        return True
    elif user_role == "owner":
        return vessel.owner and user_company.lower() in vessel.owner.lower()
    elif user_role == "charterer":
        return vessel.charterer and user_company.lower() in vessel.charterer.lower()
    else:
        return False


async def _get_room_last_activity(session: AsyncSession, room_id: str) -> Optional[datetime]:
    """Get the last activity timestamp for a room"""
    # Check messages first
    messages_result = await session.execute(
        select(Message.created_at)
        .where(Message.room_id == room_id)
        .order_by(desc(Message.created_at))
        .limit(1)
    )
    message_time = messages_result.scalar_one_or_none()

    # Check approvals
    approvals_result = await session.execute(
        select(Approval.updated_at)
        .where(Approval.room_id == room_id)
        .order_by(desc(Approval.updated_at))
        .limit(1)
    )
    approval_time = approvals_result.scalar_one_or_none()

    # Check documents
    documents_result = await session.execute(
        select(Document.uploaded_at)
        .where(Document.room_id == room_id)
        .order_by(desc(Document.uploaded_at))
        .limit(1)
    )
    document_time = documents_result.scalar_one_or_none()

    # Return the most recent activity
    times = [t for t in [message_time, approval_time, document_time] if t is not None]
    return max(times) if times else None


async def _determine_user_role_in_operation(
    session: AsyncSession,
    room_id: str,
    user_email: str,
    user_role: str,
    user_company: str
) -> str:
    """Determine the user's role in a historical operation"""
    if user_role == "broker":
        return "broker"

    # Check if user was involved as owner or charterer
    vessels_result = await session.execute(
        select(Vessel).where(Vessel.room_id == room_id)
    )
    vessels = vessels_result.scalars().all()

    for vessel in vessels:
        if user_role == "owner" and vessel.owner and user_company.lower() in vessel.owner.lower():
            return "owner"
        if user_role == "charterer" and vessel.charterer and user_company.lower() in vessel.charterer.lower():
            return "charterer"

    return "viewer"


async def _get_vessel_data_count(session: AsyncSession, room_id: str, vessel_id: str, model_class) -> int:
    """Get count of data items for a vessel"""
    result = await session.execute(
        select(model_class).where(
            model_class.room_id == room_id,
            model_class.vessel_id == vessel_id
        )
    )
    return len(result.scalars().all())


async def _get_vessel_by_id(session: AsyncSession, vessel_id: str) -> Optional[Vessel]:
    """Get vessel by ID"""
    result = await session.execute(
        select(Vessel).where(Vessel.id == vessel_id)
    )
    return result.scalar_one_or_none()


async def _get_vessel_documents(session: AsyncSession, room_id: str, vessel_id: str, limit: int, offset: int):
    """Get historical documents for a vessel"""
    result = await session.execute(
        select(Document)
        .where(Document.room_id == room_id, Document.vessel_id == vessel_id)
        .order_by(desc(Document.uploaded_at))
        .limit(limit)
        .offset(offset)
    )
    documents = result.scalars().all()

    return [{
        "id": str(doc.id),
        "type_name": doc.document_type.name if doc.document_type else "Unknown",
        "status": doc.status,
        "uploaded_at": doc.uploaded_at.isoformat() if doc.uploaded_at else None,
        "uploaded_by": doc.uploaded_by
    } for doc in documents]


async def _get_vessel_approvals(session: AsyncSession, room_id: str, vessel_id: str, limit: int, offset: int):
    """Get historical approvals for a vessel"""
    result = await session.execute(
        select(Approval)
        .where(Approval.room_id == room_id, Approval.vessel_id == vessel_id)
        .order_by(desc(Approval.updated_at))
        .limit(limit)
        .offset(offset)
    )
    approvals = result.scalars().all()

    return [{
        "id": str(approval.id),
        "party_name": approval.party.name if approval.party else "Unknown",
        "party_role": approval.party.role if approval.party else "Unknown",
        "status": approval.status,
        "updated_at": approval.updated_at.isoformat() if approval.updated_at else None
    } for approval in approvals]


async def _get_vessel_messages(session: AsyncSession, room_id: str, vessel_id: str, limit: int, offset: int):
    """Get historical messages for a vessel"""
    result = await session.execute(
        select(Message)
        .where(Message.room_id == room_id, Message.vessel_id == vessel_id)
        .order_by(desc(Message.created_at))
        .limit(limit)
        .offset(offset)
    )
    messages = result.scalars().all()

    return [{
        "id": str(msg.id),
        "sender_name": msg.sender_name,
        "content": msg.content,
        "message_type": msg.message_type,
        "created_at": msg.created_at.isoformat() if msg.created_at else None
    } for msg in messages]

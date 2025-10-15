"""
Regional Operations router for STS Clearance system
Handles filtered operations by user involvement and regional views
"""

import logging
from datetime import datetime, timedelta
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel
from sqlalchemy import desc, select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_async_session
from app.dependencies import get_current_user
from app.models import Room, Vessel, VesselPair

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1", tags=["regional-operations"])


# Request/Response schemas
class RegionalOperation(BaseModel):
    id: str
    title: str
    location: str
    region: str
    sts_eta: Optional[datetime] = None
    status: str
    vessel_count: int
    user_vessels: int  # Number of vessels user is involved with
    last_activity: Optional[datetime] = None
    priority: str  # high, medium, low based on user's involvement


class RegionalSummary(BaseModel):
    region: str
    total_operations: int
    active_operations: int
    user_operations: int
    upcoming_operations: int  # Next 7 days
    critical_operations: int  # Require immediate attention


class RegionalDashboard(BaseModel):
    user_summary: dict
    regional_summary: List[RegionalSummary]
    operations: List[RegionalOperation]
    upcoming_deadlines: List[dict]
    recent_activity: List[dict]


class OperationFilter(BaseModel):
    region: Optional[str] = None
    status: Optional[str] = None
    date_from: Optional[datetime] = None
    date_to: Optional[datetime] = None
    vessel_type: Optional[str] = None
    priority: Optional[str] = None


@router.get("/regional/dashboard", response_model=RegionalDashboard)
async def get_regional_dashboard(
    current_user: dict = Depends(get_current_user),
    session: AsyncSession = Depends(get_async_session),
):
    """
    Get regional dashboard with filtered operations based on user involvement
    """
    try:
        user_email = current_user["email"]
        user_role = current_user.get("role", "")
        user_company = current_user.get("company", "")

        # Get user's accessible vessels across all regions
        user_vessels = await _get_user_vessels_across_regions(
            session, user_email, user_role, user_company
        )

        # Get operations filtered by user access
        operations = await _get_user_regional_operations(
            session, user_email, user_role, user_company
        )

        # Calculate regional summary
        regional_summary = await _calculate_regional_summary(session, operations)

        # Get upcoming deadlines
        upcoming_deadlines = await _get_upcoming_deadlines(session, user_vessels)

        # Get recent activity
        recent_activity = await _get_recent_activity(session, user_vessels)

        # User summary
        user_summary = {
            "total_vessels": len(user_vessels),
            "active_operations": len([op for op in operations if op['status'] == 'active']),
            "upcoming_operations": len([op for op in operations if op.get('is_upcoming', False)]),
            "regions_covered": len(set(op['region'] for op in operations)),
            "role": user_role
        }

        return RegionalDashboard(
            user_summary=user_summary,
            regional_summary=regional_summary,
            operations=operations,
            upcoming_deadlines=upcoming_deadlines,
            recent_activity=recent_activity
        )

    except Exception as e:
        logger.error(f"Error getting regional dashboard: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")


@router.get("/regional/operations", response_model=List[RegionalOperation])
async def get_regional_operations(
    region: Optional[str] = None,
    status_filter: Optional[str] = None,
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    current_user: dict = Depends(get_current_user),
    session: AsyncSession = Depends(get_async_session),
):
    """
    Get operations filtered by region and user involvement
    """
    try:
        user_email = current_user["email"]
        user_role = current_user.get("role", "")
        user_company = current_user.get("company", "")

        # Build query filters
        query_filters = []

        if region:
            # Extract region from location (simplified - in real app might have dedicated region field)
            query_filters.append(Room.location.ilike(f"%{region}%"))

        if status_filter:
            query_filters.append(Room.status == status_filter)

        # Get rooms with filters
        rooms_query = select(Room).where(*query_filters).order_by(desc(Room.created_at))

        rooms_result = await session.execute(rooms_query)
        rooms = rooms_result.scalars().all()

        operations = []

        for room in rooms:
            # Check user access to this operation
            user_vessels_in_room = await _get_user_vessels_in_room(
                session, str(room.id), user_email, user_role, user_company
            )

            if user_vessels_in_room:
                # Get vessel count
                vessels_result = await session.execute(
                    select(func.count(Vessel.id)).where(Vessel.room_id == room.id)
                )
                vessel_count = vessels_result.scalar_one()

                # Determine region (simplified)
                operation_region = _extract_region_from_location(room.location)

                # Get last activity
                last_activity = await _get_room_last_activity(session, str(room.id))

                # Calculate priority based on user involvement
                priority = _calculate_operation_priority(len(user_vessels_in_room), room.status)

                operations.append(RegionalOperation(
                    id=str(room.id),
                    title=room.title,
                    location=room.location,
                    region=operation_region,
                    sts_eta=room.sts_eta,
                    status=room.status,
                    vessel_count=vessel_count,
                    user_vessels=len(user_vessels_in_room),
                    last_activity=last_activity,
                    priority=priority
                ))

        # Apply pagination
        paginated_operations = operations[offset:offset + limit]

        return paginated_operations

    except Exception as e:
        logger.error(f"Error getting regional operations: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")


@router.get("/regional/operations/{room_id}/vessels")
async def get_operation_vessels_by_region(
    room_id: str,
    current_user: dict = Depends(get_current_user),
    session: AsyncSession = Depends(get_async_session),
):
    """
    Get vessels in an operation that the user has access to
    """
    try:
        user_email = current_user["email"]
        user_role = current_user.get("role", "")
        user_company = current_user.get("company", "")

        # Get all vessels in the room
        vessels_result = await session.execute(
            select(Vessel).where(Vessel.room_id == room_id)
        )
        all_vessels = vessels_result.scalars().all()

        user_accessible_vessels = []
        restricted_vessels = []

        for vessel in all_vessels:
            can_access = await _user_can_access_vessel(
                session, vessel, user_email, user_role, user_company
            )

            vessel_data = {
                "id": str(vessel.id),
                "name": vessel.name,
                "imo": vessel.imo,
                "vessel_type": vessel.vessel_type,
                "status": vessel.status,
                "region": _extract_region_from_location(vessel.room.location) if vessel.room else "Unknown"
            }

            if can_access:
                # Add ownership info for accessible vessels
                vessel_data.update({
                    "owner": vessel.owner,
                    "charterer": vessel.charterer,
                    "access_level": "full"
                })
                user_accessible_vessels.append(vessel_data)
            else:
                # Restricted view for inaccessible vessels
                vessel_data.update({
                    "owner": "[Restricted]",
                    "charterer": "[Restricted]",
                    "access_level": "restricted"
                })
                restricted_vessels.append(vessel_data)

        return {
            "room_id": room_id,
            "user_accessible_vessels": user_accessible_vessels,
            "restricted_vessels": restricted_vessels,
            "total_vessels": len(all_vessels),
            "accessible_count": len(user_accessible_vessels)
        }

    except Exception as e:
        logger.error(f"Error getting operation vessels: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")


@router.get("/regional/statistics")
async def get_regional_statistics(
    current_user: dict = Depends(get_current_user),
    session: AsyncSession = Depends(get_async_session),
):
    """
    Get regional statistics for user's operations
    """
    try:
        user_email = current_user["email"]
        user_role = current_user.get("role", "")
        user_company = current_user.get("company", "")

        # Get user's vessels grouped by region
        user_vessels = await _get_user_vessels_across_regions(
            session, user_email, user_role, user_company
        )

        # Group by region
        region_stats = {}
        for vessel in user_vessels:
            region = vessel.get('region', 'Unknown')
            if region not in region_stats:
                region_stats[region] = {
                    "region": region,
                    "vessel_count": 0,
                    "active_operations": 0,
                    "completed_operations": 0,
                    "upcoming_operations": 0
                }
            region_stats[region]["vessel_count"] += 1

        # Get operation counts per region
        operations = await _get_user_regional_operations(
            session, user_email, user_role, user_company
        )

        for op in operations:
            region = op['region']
            if region in region_stats:
                if op['status'] == 'active':
                    region_stats[region]["active_operations"] += 1
                elif op['status'] == 'completed':
                    region_stats[region]["completed_operations"] += 1

                # Check if upcoming (next 7 days)
                if op.get('sts_eta'):
                    eta = datetime.fromisoformat(op['sts_eta']) if isinstance(op['sts_eta'], str) else op['sts_eta']
                    if eta and (eta - datetime.utcnow()).days <= 7:
                        region_stats[region]["upcoming_operations"] += 1

        return {
            "regional_statistics": list(region_stats.values()),
            "total_regions": len(region_stats),
            "total_vessels": len(user_vessels),
            "total_operations": len(operations)
        }

    except Exception as e:
        logger.error(f"Error getting regional statistics: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")


# Helper functions
async def _get_user_vessels_across_regions(
    session: AsyncSession,
    user_email: str,
    user_role: str,
    user_company: str
) -> List[dict]:
    """Get all vessels user has access to across regions"""
    # Get all active rooms
    rooms_result = await session.execute(
        select(Room).where(Room.status.in_(['active', 'pending']))
    )
    rooms = rooms_result.scalars().all()

    user_vessels = []

    for room in rooms:
        vessels_result = await session.execute(
            select(Vessel).where(Vessel.room_id == room.id)
        )
        vessels = vessels_result.scalars().all()

        for vessel in vessels:
            can_access = await _user_can_access_vessel(
                session, vessel, user_email, user_role, user_company
            )

            if can_access:
                user_vessels.append({
                    "id": str(vessel.id),
                    "name": vessel.name,
                    "imo": vessel.imo,
                    "room_id": str(room.id),
                    "region": _extract_region_from_location(room.location),
                    "status": vessel.status
                })

    return user_vessels


async def _get_user_regional_operations(
    session: AsyncSession,
    user_email: str,
    user_role: str,
    user_company: str
) -> List[dict]:
    """Get operations user has access to with regional info"""
    rooms_result = await session.execute(
        select(Room).order_by(desc(Room.created_at))
    )
    rooms = rooms_result.scalars().all()

    operations = []

    for room in rooms:
        user_vessels = await _get_user_vessels_in_room(
            session, str(room.id), user_email, user_role, user_company
        )

        if user_vessels:
            # Get vessel count
            vessels_result = await session.execute(
                select(func.count(Vessel.id)).where(Vessel.room_id == room.id)
            )
            vessel_count = vessels_result.scalar_one()

            # Get last activity
            last_activity = await _get_room_last_activity(session, str(room.id))

            # Check if upcoming
            is_upcoming = False
            if room.sts_eta:
                days_until_eta = (room.sts_eta - datetime.utcnow()).days
                is_upcoming = 0 <= days_until_eta <= 7

            operations.append({
                "id": str(room.id),
                "title": room.title,
                "location": room.location,
                "region": _extract_region_from_location(room.location),
                "sts_eta": room.sts_eta.isoformat() if room.sts_eta else None,
                "status": room.status,
                "vessel_count": vessel_count,
                "user_vessels": len(user_vessels),
                "last_activity": last_activity.isoformat() if last_activity else None,
                "is_upcoming": is_upcoming
            })

    return operations


async def _calculate_regional_summary(session: AsyncSession, operations: List[dict]) -> List[RegionalSummary]:
    """Calculate summary statistics by region"""
    region_stats = {}

    for op in operations:
        region = op['region']
        if region not in region_stats:
            region_stats[region] = RegionalSummary(
                region=region,
                total_operations=0,
                active_operations=0,
                user_operations=0,
                upcoming_operations=0,
                critical_operations=0
            )

        region_stats[region].total_operations += 1
        region_stats[region].user_operations += 1

        if op['status'] == 'active':
            region_stats[region].active_operations += 1

        if op.get('is_upcoming', False):
            region_stats[region].upcoming_operations += 1

        # Critical operations (active with upcoming ETA)
        if op['status'] == 'active' and op.get('is_upcoming', False):
            region_stats[region].critical_operations += 1

    return list(region_stats.values())


async def _get_upcoming_deadlines(session: AsyncSession, user_vessels: List[dict]) -> List[dict]:
    """Get upcoming deadlines for user's vessels"""
    upcoming_deadlines = []

    for vessel in user_vessels:
        # Get documents with upcoming expiration
        from app.models import Document
        docs_result = await session.execute(
            select(Document)
            .where(
                Document.vessel_id == vessel['id'],
                Document.expires_on.isnot(None),
                Document.expires_on > datetime.utcnow(),
                Document.expires_on <= datetime.utcnow() + timedelta(days=30)
            )
            .order_by(Document.expires_on)
            .limit(5)
        )
        documents = docs_result.scalars().all()

        for doc in documents:
            upcoming_deadlines.append({
                "type": "document_expiry",
                "vessel_name": vessel['name'],
                "vessel_imo": vessel['imo'],
                "document_type": doc.document_type.name if doc.document_type else "Unknown",
                "due_date": doc.expires_on.isoformat(),
                "days_remaining": (doc.expires_on - datetime.utcnow()).days,
                "priority": "high" if (doc.expires_on - datetime.utcnow()).days <= 7 else "medium"
            })

    # Sort by due date and limit to top 10
    upcoming_deadlines.sort(key=lambda x: x['due_date'])
    return upcoming_deadlines[:10]


async def _get_recent_activity(session: AsyncSession, user_vessels: List[dict]) -> List[dict]:
    """Get recent activity across user's vessels"""
    recent_activity = []

    vessel_ids = [v['id'] for v in user_vessels]

    if not vessel_ids:
        return recent_activity

    # Get recent messages
    from app.models import Message
    messages_result = await session.execute(
        select(Message, Vessel)
        .join(Vessel, Message.vessel_id == Vessel.id)
        .where(Message.vessel_id.in_(vessel_ids))
        .order_by(desc(Message.created_at))
        .limit(10)
    )

    for message, vessel in messages_result:
        recent_activity.append({
            "type": "message",
            "vessel_name": vessel.name,
            "vessel_imo": vessel.imo,
            "activity": f"New message from {message.sender_name}",
            "timestamp": message.created_at.isoformat(),
            "details": message.content[:100] + "..." if len(message.content) > 100 else message.content
        })

    # Get recent approvals
    from app.models import Approval
    approvals_result = await session.execute(
        select(Approval, Vessel)
        .join(Vessel, Approval.vessel_id == Vessel.id)
        .where(Approval.vessel_id.in_(vessel_ids))
        .order_by(desc(Approval.updated_at))
        .limit(10)
    )

    for approval, vessel in approvals_result:
        recent_activity.append({
            "type": "approval",
            "vessel_name": vessel.name,
            "vessel_imo": vessel.imo,
            "activity": f"Approval {approval.status} by {approval.party.name if approval.party else 'Unknown'}",
            "timestamp": approval.updated_at.isoformat(),
            "details": f"Status: {approval.status}"
        })

    # Sort by timestamp and limit
    recent_activity.sort(key=lambda x: x['timestamp'], reverse=True)
    return recent_activity[:15]


async def _get_user_vessels_in_room(
    session: AsyncSession,
    room_id: str,
    user_email: str,
    user_role: str,
    user_company: str
) -> List[Vessel]:
    """Get vessels user has access to in a specific room"""
    vessels_result = await session.execute(
        select(Vessel).where(Vessel.room_id == room_id)
    )
    vessels = vessels_result.scalars().all()

    accessible_vessels = []
    for vessel in vessels:
        can_access = await _user_can_access_vessel(
            session, vessel, user_email, user_role, user_company
        )
        if can_access:
            accessible_vessels.append(vessel)

    return accessible_vessels


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


def _extract_region_from_location(location: str) -> str:
    """Extract region from location string (simplified implementation)"""
    location_lower = location.lower()

    # Common maritime regions
    if any(keyword in location_lower for keyword in ['singapore', 'malaysia', 'indonesia', 'thailand']):
        return "Southeast Asia"
    elif any(keyword in location_lower for keyword in ['china', 'japan', 'korea', 'taiwan']):
        return "East Asia"
    elif any(keyword in location_lower for keyword in ['india', 'sri lanka', 'bangladesh']):
        return "South Asia"
    elif any(keyword in location_lower for keyword in ['middle east', 'oman', 'uae', 'qatar']):
        return "Middle East"
    elif any(keyword in location_lower for keyword in ['europe', 'mediterranean', 'atlantic']):
        return "Europe/Mediterranean"
    elif any(keyword in location_lower for keyword in ['africa', 'cape town', 'durban']):
        return "Africa"
    elif any(keyword in location_lower for keyword in ['america', 'pacific', 'atlantic']):
        return "Americas"
    else:
        return "Global"


async def _get_room_last_activity(session: AsyncSession, room_id: str) -> Optional[datetime]:
    """Get the last activity timestamp for a room"""
    from app.models import Message, Approval, Document

    # Check messages
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

    # Return the most recent
    times = [t for t in [message_time, approval_time, document_time] if t is not None]
    return max(times) if times else None


def _calculate_operation_priority(user_vessels_count: int, status: str) -> str:
    """Calculate operation priority based on user involvement"""
    if status == 'active' and user_vessels_count > 1:
        return "high"
    elif status == 'active':
        return "medium"
    elif user_vessels_count > 1:
        return "medium"
    else:
        return "low"

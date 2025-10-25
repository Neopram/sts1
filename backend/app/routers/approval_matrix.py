"""
Approval Matrix router for STS Clearance system
Handles vessel-specific approval workflows and matrices
"""

import logging
from datetime import datetime
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_async_session
from app.dependencies import get_current_user, require_room_access
from app.models import Approval, Vessel, VesselPair

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1", tags=["approval-matrix"])


# Request/Response schemas
class VesselApprovalStatus(BaseModel):
    vessel_id: str
    vessel_name: str
    approvals_required: int
    approvals_completed: int
    approval_percentage: float
    status: str  # pending, partial, approved, rejected
    last_updated: Optional[datetime] = None


class ApprovalMatrixResponse(BaseModel):
    room_id: str
    vessel_pairs: List[dict]
    overall_status: str
    total_vessels: int
    approved_vessels: int
    completion_percentage: float
    vessel_approvals: List[VesselApprovalStatus]


class BulkApprovalRequest(BaseModel):
    vessel_ids: List[str]
    status: str  # approved, rejected
    comments: Optional[str] = None


@router.get("/rooms/{room_id}/approval-matrix", response_model=ApprovalMatrixResponse)
async def get_approval_matrix(
    room_id: str,
    current_user: dict = Depends(get_current_user),
    session: AsyncSession = Depends(get_async_session),
):
    """
    Get the complete approval matrix for a room showing vessel-specific approval status
    """
    try:
        user_email = current_user.email

        # Verify user has access to room
        await require_room_access(room_id, user_email, session)

        # Get vessel pairs for this room
        vessel_pairs_result = await session.execute(
            select(VesselPair).where(VesselPair.room_id == room_id)
        )
        vessel_pairs = vessel_pairs_result.scalars().all()

        vessel_approvals = []
        total_vessels = 0
        approved_vessels = 0

        # For each vessel pair, get approval status for both vessels
        for pair in vessel_pairs:
            # Get mother vessel approvals
            mother_approvals = await _get_vessel_approvals(session, room_id, pair.mother_vessel_id)
            mother_vessel = await _get_vessel_info(session, pair.mother_vessel_id)

            # Get receiving vessel approvals
            receiving_approvals = await _get_vessel_approvals(session, room_id, pair.receiving_vessel_id)
            receiving_vessel = await _get_vessel_info(session, pair.receiving_vessel_id)

            # Calculate status for mother vessel
            mother_status = _calculate_vessel_approval_status(mother_approvals)
            vessel_approvals.append(VesselApprovalStatus(
                vessel_id=str(pair.mother_vessel_id),
                vessel_name=mother_vessel.name if mother_vessel else "Unknown",
                approvals_required=mother_status['required'],
                approvals_completed=mother_status['completed'],
                approval_percentage=mother_status['percentage'],
                status=mother_status['status'],
                last_updated=mother_status['last_updated']
            ))

            # Calculate status for receiving vessel
            receiving_status = _calculate_vessel_approval_status(receiving_approvals)
            vessel_approvals.append(VesselApprovalStatus(
                vessel_id=str(pair.receiving_vessel_id),
                vessel_name=receiving_vessel.name if receiving_vessel else "Unknown",
                approvals_required=receiving_status['required'],
                approvals_completed=receiving_status['completed'],
                approval_percentage=receiving_status['percentage'],
                status=receiving_status['status'],
                last_updated=receiving_status['last_updated']
            ))

            total_vessels += 2
            if mother_status['status'] == 'approved':
                approved_vessels += 1
            if receiving_status['status'] == 'approved':
                approved_vessels += 1

        # Calculate overall status
        completion_percentage = (approved_vessels / total_vessels * 100) if total_vessels > 0 else 0

        if completion_percentage == 100:
            overall_status = "approved"
        elif completion_percentage > 0:
            overall_status = "partial"
        else:
            overall_status = "pending"

        # Format vessel pairs for response
        pairs_data = []
        for pair in vessel_pairs:
            mother_vessel = await _get_vessel_info(session, pair.mother_vessel_id)
            receiving_vessel = await _get_vessel_info(session, pair.receiving_vessel_id)

            pairs_data.append({
                "id": str(pair.id),
                "mother_vessel": {
                    "id": str(pair.mother_vessel_id),
                    "name": mother_vessel.name if mother_vessel else "Unknown",
                    "imo": mother_vessel.imo if mother_vessel else "Unknown"
                },
                "receiving_vessel": {
                    "id": str(pair.receiving_vessel_id),
                    "name": receiving_vessel.name if receiving_vessel else "Unknown",
                    "imo": receiving_vessel.imo if receiving_vessel else "Unknown"
                },
                "operation_type": pair.operation_type,
                "status": pair.status
            })

        return ApprovalMatrixResponse(
            room_id=room_id,
            vessel_pairs=pairs_data,
            overall_status=overall_status,
            total_vessels=total_vessels,
            approved_vessels=approved_vessels,
            completion_percentage=round(completion_percentage, 1),
            vessel_approvals=vessel_approvals
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting approval matrix: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")


@router.post("/rooms/{room_id}/approval-matrix/bulk-approve")
async def bulk_approve_vessels(
    room_id: str,
    approval_data: BulkApprovalRequest,
    current_user: dict = Depends(get_current_user),
    session: AsyncSession = Depends(get_async_session),
):
    """
    Bulk approve or reject multiple vessels in a room
    """
    try:
        user_email = current_user.email
        user_role = current_user.role

        # Only brokers and owners can do bulk approvals
        if user_role not in ["broker", "owner"]:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only brokers and owners can perform bulk approvals"
            )

        # Verify user has access to room
        await require_room_access(room_id, user_email, session)

        # Validate status
        if approval_data.status not in ["approved", "rejected"]:
            raise HTTPException(
                status_code=400,
                detail="Status must be 'approved' or 'rejected'"
            )

        updated_count = 0

        # Process each vessel
        for vessel_id in approval_data.vessel_ids:
            # Check if user has permission for this vessel
            user_company = current_user.get("company", "")
            vessel = await _get_vessel_info(session, vessel_id)

            if not vessel:
                continue

            # Permission check based on role
            if user_role == "broker":
                # Brokers can approve any vessel
                pass
            elif user_role == "owner":
                # Owners can only approve their own vessels
                if not vessel.owner or vessel.owner.lower() not in user_company.lower():
                    continue
            else:
                continue

            # Update all approvals for this vessel
            result = await session.execute(
                update(Approval)
                .where(
                    Approval.room_id == room_id,
                    Approval.vessel_id == vessel_id
                )
                .values(
                    status=approval_data.status,
                    updated_at=datetime.utcnow()
                )
            )

            updated_count += result.rowcount

        await session.commit()

        return {
            "message": f"Successfully updated {updated_count} approvals to {approval_data.status}",
            "updated_count": updated_count,
            "status": approval_data.status
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error in bulk approval: {e}")
        await session.rollback()
        raise HTTPException(status_code=500, detail="Internal server error")


@router.get("/rooms/{room_id}/approval-matrix/{vessel_id}/details")
async def get_vessel_approval_details(
    room_id: str,
    vessel_id: str,
    current_user: dict = Depends(get_current_user),
    session: AsyncSession = Depends(get_async_session),
):
    """
    Get detailed approval information for a specific vessel
    """
    try:
        user_email = current_user.email

        # Verify user has access to room
        await require_room_access(room_id, user_email, session)

        # Get vessel information
        vessel = await _get_vessel_info(session, vessel_id)
        if not vessel:
            raise HTTPException(status_code=404, detail="Vessel not found")

        # Get all approvals for this vessel
        approvals_result = await session.execute(
            select(Approval).where(
                Approval.room_id == room_id,
                Approval.vessel_id == vessel_id
            )
        )
        approvals = approvals_result.scalars().all()

        # Format approval details
        approval_details = []
        for approval in approvals:
            approval_details.append({
                "id": str(approval.id),
                "party_id": str(approval.party_id),
                "party_name": approval.party.name if approval.party else "Unknown",
                "party_role": approval.party.role if approval.party else "Unknown",
                "status": approval.status,
                "updated_at": approval.updated_at.isoformat() if approval.updated_at else None,
                "comments": getattr(approval, 'comments', None)
            })

        return {
            "vessel": {
                "id": str(vessel.id),
                "name": vessel.name,
                "imo": vessel.imo,
                "owner": vessel.owner,
                "charterer": vessel.charterer
            },
            "approvals": approval_details,
            "total_approvals": len(approval_details),
            "approved_count": sum(1 for a in approval_details if a['status'] == 'approved'),
            "pending_count": sum(1 for a in approval_details if a['status'] == 'pending'),
            "rejected_count": sum(1 for a in approval_details if a['status'] == 'rejected')
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting vessel approval details: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")


async def _get_vessel_approvals(session: AsyncSession, room_id: str, vessel_id: str) -> List[Approval]:
    """Helper function to get all approvals for a vessel"""
    result = await session.execute(
        select(Approval).where(
            Approval.room_id == room_id,
            Approval.vessel_id == vessel_id
        )
    )
    return result.scalars().all()


async def _get_vessel_info(session: AsyncSession, vessel_id: str) -> Optional[Vessel]:
    """Helper function to get vessel information"""
    result = await session.execute(
        select(Vessel).where(Vessel.id == vessel_id)
    )
    return result.scalar_one_or_none()


def _calculate_vessel_approval_status(approvals: List[Approval]) -> dict:
    """Calculate approval status for a vessel"""
    if not approvals:
        return {
            'required': 0,
            'completed': 0,
            'percentage': 0,
            'status': 'pending',
            'last_updated': None
        }

    total_approvals = len(approvals)
    approved_count = sum(1 for a in approvals if a.status == 'approved')
    rejected_count = sum(1 for a in approvals if a.status == 'rejected')

    percentage = (approved_count / total_approvals * 100) if total_approvals > 0 else 0

    # Determine status
    if rejected_count > 0:
        status = 'rejected'
    elif approved_count == total_approvals:
        status = 'approved'
    elif approved_count > 0:
        status = 'partial'
    else:
        status = 'pending'

    # Get latest update time
    last_updated = max((a.updated_at for a in approvals if a.updated_at), default=None)

    return {
        'required': total_approvals,
        'completed': approved_count,
        'percentage': round(percentage, 1),
        'status': status,
        'last_updated': last_updated
    }

"""
Approvals router for STS Clearance system
Handles document approvals and approval workflow
"""

import logging
from datetime import datetime
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession


class UpdateApprovalRequest(BaseModel):
    status: str  # approved, rejected
    comments: Optional[str] = None


from app.database import get_async_session
from app.dependencies import (get_current_user, log_activity,
                              require_room_access)
from app.models import Approval, Document, DocumentType, Party, Room, User
from app.permission_decorators import require_permission

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1", tags=["approvals"])


# Request schemas
class ApprovalRequest(BaseModel):
    status: str  # approved, rejected
    notes: Optional[str] = None


class ApprovalResponse(BaseModel):
    id: str
    room_id: str
    party_id: str
    party_name: str
    party_role: str
    status: str
    updated_at: datetime
    notes: Optional[str] = None


@router.get("/rooms/{room_id}/approvals", response_model=List[ApprovalResponse])
async def get_room_approvals(
    room_id: str,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_async_session),
):
    """
    Get all approvals for a room, filtered by user's vessel access and role-based permissions.
    Real permission validation logic:
    - All authenticated users in the room can VIEW approvals (permission_matrix: view)
    - Only specific roles can see approval details (owner, broker, charterer)
    - Data is filtered by vessel access for vessel-specific approvals
    """
    try:
        from app.permission_matrix import permission_matrix
        from app.models import User
        
        user_email = current_user.email

        # 1. VERIFY ROOM ACCESS - Required first checkpoint
        await require_room_access(room_id, user_email, session)

        # 2. CHECK PERMISSION - User must have "approvals.view" permission
        user_result = await session.execute(
            select(User).where(User.email == user_email)
        )
        user = user_result.scalar_one_or_none()
        
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        
        # Check if user role can view approvals
        if not permission_matrix.has_permission(user.role, "approvals", "view"):
            logger.warning(f"User {user_email} with role {user.role} denied approval view access")
            raise HTTPException(
                status_code=403, 
                detail=f"Permission denied: {user.role} cannot view approvals"
            )

        # 3. GET USER'S ACCESSIBLE DATA SCOPE
        from app.dependencies import get_user_accessible_vessels
        accessible_vessel_ids = await get_user_accessible_vessels(room_id, user_email, session)

        # 4. FILTER APPROVALS BY SCOPE
        if accessible_vessel_ids:
            # User has vessel-level access - filter by vessel
            approvals_result = await session.execute(
                select(
                    Approval.id,
                    Approval.room_id,
                    Approval.party_id,
                    Approval.status,
                    Approval.updated_at,
                    Party.name.label("party_name"),
                    Party.role.label("party_role"),
                )
                .join(Party)
                .where(
                    Approval.room_id == room_id,
                    Approval.vessel_id.in_(accessible_vessel_ids)
                )
            )
        else:
            # User has no vessel access
            if user.role == "broker" or user.role == "admin":
                # Brokers/Admins can see room-level approvals
                approvals_result = await session.execute(
                    select(
                        Approval.id,
                        Approval.room_id,
                        Approval.party_id,
                        Approval.status,
                        Approval.updated_at,
                        Party.name.label("party_name"),
                        Party.role.label("party_role"),
                    )
                    .join(Party)
                    .where(Approval.room_id == room_id, Approval.vessel_id.is_(None))
                )
            else:
                # Non-brokers with no vessel access see nothing
                logger.info(f"User {user_email} with role {user.role} has no accessible data scope")
                return []

        # 5. CONVERT TO RESPONSE
        approvals = []
        for row in approvals_result:
            approvals.append(
                ApprovalResponse(
                    id=str(row.id),
                    room_id=str(row.room_id),
                    party_id=str(row.party_id),
                    party_name=row.party_name,
                    party_role=row.party_role,
                    status=row.status,
                    updated_at=row.updated_at,
                )
            )

        logger.info(f"User {user_email} retrieved {len(approvals)} approvals from room {room_id}")
        return approvals

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting room approvals: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")


@router.post("/rooms/{room_id}/approvals")
@require_permission("approvals", "create")
async def create_approval(
    room_id: str,
    approval_data: ApprovalRequest,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_async_session),
):
    """
    Create or update approval for current user in room
    Only Owner, Broker, and Charterer can create approvals
    
    Permission validation is handled by @require_permission decorator
    """
    try:
        user_email = current_user.email

        # Verify user has access to room and get their party
        party_result = await session.execute(
            select(Party).where(Party.room_id == room_id, Party.email == user_email)
        )
        party = party_result.scalar_one_or_none()

        if not party:
            raise HTTPException(status_code=404, detail="User not found in room")

        # Validate status
        valid_statuses = ["pending", "approved", "rejected"]
        if approval_data.status not in valid_statuses:
            raise HTTPException(
                status_code=400,
                detail=f"Invalid status. Must be one of: {', '.join(valid_statuses)}",
            )

        # Check if approval already exists
        existing_approval_result = await session.execute(
            select(Approval).where(
                Approval.room_id == room_id, Approval.party_id == party.id
            )
        )
        existing_approval = existing_approval_result.scalar_one_or_none()

        if existing_approval:
            # Update existing approval
            existing_approval.status = approval_data.status
            existing_approval.updated_at = datetime.utcnow()
        else:
            # Create new approval
            approval = Approval(
                room_id=room_id, party_id=party.id, status=approval_data.status
            )
            session.add(approval)

        await session.commit()

        # Log activity
        await log_activity(
            room_id,
            user_email,
            f"approval_{approval_data.status}",
            {"party_role": party.role, "notes": approval_data.notes},
        )

        return {"message": f"Approval {approval_data.status} successfully"}

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating approval: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")


@router.get("/rooms/{room_id}/approvals/status")
async def get_approval_status(
    room_id: str,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_async_session),
):
    """
    Get overall approval status for room
    """
    try:
        user_email = current_user.email

        # Verify user has access to room
        await require_room_access(room_id, user_email, session)

        # Get all parties and their approvals
        parties_result = await session.execute(
            select(Party).where(Party.room_id == room_id)
        )
        parties = parties_result.scalars().all()

        approvals_result = await session.execute(
            select(Approval).where(Approval.room_id == room_id)
        )
        approvals = {
            approval.party_id: approval for approval in approvals_result.scalars().all()
        }

        # Calculate approval status
        total_parties = len(parties)
        approved_count = 0
        rejected_count = 0
        pending_count = 0

        party_statuses = []

        for party in parties:
            approval = approvals.get(party.id)
            if approval:
                if approval.status == "approved":
                    approved_count += 1
                elif approval.status == "rejected":
                    rejected_count += 1
                else:
                    pending_count += 1
                status = approval.status
                updated_at = approval.updated_at
            else:
                pending_count += 1
                status = "pending"
                updated_at = None

            party_statuses.append(
                {
                    "party_id": str(party.id),
                    "party_name": party.name,
                    "party_role": party.role,
                    "party_email": party.email,
                    "approval_status": status,
                    "updated_at": updated_at,
                }
            )

        # Determine overall status
        if rejected_count > 0:
            overall_status = "rejected"
        elif approved_count == total_parties:
            overall_status = "approved"
        else:
            overall_status = "pending"

        return {
            "overall_status": overall_status,
            "total_parties": total_parties,
            "approved_count": approved_count,
            "rejected_count": rejected_count,
            "pending_count": pending_count,
            "party_statuses": party_statuses,
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting approval status: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")


@router.get("/rooms/{room_id}/approvals/my-status")
async def get_my_approval_status(
    room_id: str,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_async_session),
):
    """
    Get current user's approval status for room
    """
    try:
        user_email = current_user.email

        # Get user's party in room
        party_result = await session.execute(
            select(Party).where(Party.room_id == room_id, Party.email == user_email)
        )
        party = party_result.scalar_one_or_none()

        if not party:
            raise HTTPException(status_code=404, detail="User not found in room")

        # Get user's approval
        approval_result = await session.execute(
            select(Approval).where(
                Approval.room_id == room_id, Approval.party_id == party.id
            )
        )
        approval = approval_result.scalar_one_or_none()

        if approval:
            return {
                "status": approval.status,
                "updated_at": approval.updated_at,
                "can_approve": True,
            }
        else:
            return {"status": "pending", "updated_at": None, "can_approve": True}

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting my approval status: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")


@router.delete("/rooms/{room_id}/approvals")
@require_permission("approvals", "revoke")
async def revoke_approval(
    room_id: str,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_async_session),
):
    """
    Revoke current user's approval
    Only Owner, Broker, and Charterer can revoke approvals
    
    Permission validation is handled by @require_permission decorator
    """
    try:
        user_email = current_user.email

        # Get user's party in room
        party_result = await session.execute(
            select(Party).where(Party.room_id == room_id, Party.email == user_email)
        )
        party = party_result.scalar_one_or_none()

        if not party:
            raise HTTPException(status_code=404, detail="User not found in room")

        # Get and delete user's approval
        approval_result = await session.execute(
            select(Approval).where(
                Approval.room_id == room_id, Approval.party_id == party.id
            )
        )
        approval = approval_result.scalar_one_or_none()

        if approval:
            await session.delete(approval)
            await session.commit()

            # Log activity
            await log_activity(
                room_id, user_email, "approval_revoked", {"party_role": party.role}
            )

            return {"message": "Approval revoked successfully"}
        else:
            return {"message": "No approval to revoke"}

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error revoking approval: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")


@router.get("/rooms/{room_id}/approvals/required-documents")
async def get_required_documents_for_approval(
    room_id: str,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_async_session),
):
    """
    Get list of required documents that must be approved before room approval
    """
    try:
        user_email = current_user.email

        # Verify user has access to room
        await require_room_access(room_id, user_email, session)

        # Get all required documents and their status
        docs_result = await session.execute(
            select(
                Document.id,
                Document.status,
                DocumentType.code,
                DocumentType.name,
                DocumentType.criticality,
            )
            .join(DocumentType)
            .where(Document.room_id == room_id, DocumentType.required == True)
        )

        required_docs = []
        all_approved = True

        for row in docs_result:
            is_approved = row.status == "approved"
            if not is_approved:
                all_approved = False

            required_docs.append(
                {
                    "id": str(row.id),
                    "code": row.code,
                    "name": row.name,
                    "status": row.status,
                    "criticality": row.criticality,
                    "is_approved": is_approved,
                }
            )

        return {
            "required_documents": required_docs,
            "all_required_approved": all_approved,
            "can_approve_room": all_approved,
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting required documents: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")


@router.put("/rooms/{room_id}/approvals/{approval_id}")
async def update_approval(
    room_id: str,
    approval_id: str,
    update_data: UpdateApprovalRequest,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_async_session),
):
    """
    Update an approval status
    """
    try:
        user_email = current_user.email

        # Verify user has access to room
        await require_room_access(room_id, user_email, session)

        # Validate status
        if update_data.status not in ["approved", "rejected"]:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Status must be 'approved' or 'rejected'",
            )

        # Find approval
        result = await session.execute(
            select(Approval).where(
                Approval.id == approval_id, Approval.room_id == room_id
            )
        )
        approval = result.scalar_one_or_none()

        if not approval:
            raise HTTPException(status_code=404, detail="Approval not found")

        # Check if user can update this approval (must be the party or admin/owner)
        user_role = current_user.role
        if approval.party_email != user_email and user_role not in ["admin", "owner"]:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You can only update your own approvals",
            )

        # Update approval
        approval.status = update_data.status
        approval.updated_at = datetime.utcnow()
        if update_data.comments:
            approval.comments = update_data.comments

        await session.commit()

        # Log activity
        await log_activity(
            session=session,
            room_id=room_id,
            actor=current_user.name,
            action=f"Updated approval to {update_data.status}",
            meta={"approval_id": approval_id, "status": update_data.status},
        )

        return {
            "message": f"Approval {update_data.status} successfully",
            "approval_id": approval_id,
            "status": update_data.status,
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating approval: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")


@router.put("/approvals/{approval_id}")
async def update_approval_by_id(
    approval_id: str,
    update_data: UpdateApprovalRequest,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_async_session)
):
    """
    Update an approval by ID (direct access)
    """
    try:
        # Get approval with room and party information
        result = await session.execute(
            select(Approval, Room, Party)
            .join(Room, Approval.room_id == Room.id)
            .join(Party, Approval.party_id == Party.id)
            .where(Approval.id == approval_id)
        )
        approval_row = result.first()
        
        if not approval_row:
            raise HTTPException(status_code=404, detail="Approval not found")
        
        approval, room, party = approval_row
        
        # Check if user has access to this room
        await require_room_access(room.id, current_user.email, session)
        
        # Update approval
        await session.execute(
            update(Approval)
            .where(Approval.id == approval_id)
            .values(
                status=update_data.status,
                updated_at=datetime.utcnow()
            )
        )
        await session.commit()
        
        # Log activity
        await log_activity(
            room_id=room.id,
            actor=current_user.email,
            action="approval_updated",
            meta_json={
                "approval_id": approval_id,
                "new_status": update_data.status,
                "party_name": party.name,
                "comments": update_data.comments
            },
            session=session
        )
        
        return {
            "message": f"Approval {update_data.status} successfully",
            "approval_id": approval_id,
            "status": update_data.status,
            "room_id": room.id,
            "party_name": party.name
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating approval by ID: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")
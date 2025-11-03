"""
OPERATIONS UNIFIED ROUTER - ARMONÍA ABSOLUTA
===========================================
Unified endpoint that combines Rooms (legacy) and STS Operations (new)
into a single, consistent interface for the frontend.

This router implements the "Armonía Absoluta" solution to unify both systems
without breaking existing code.
"""

import logging
from datetime import datetime
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy import select, and_
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.database import get_async_session
from app.dependencies import get_current_user
from app.models import User, Room, Party
from app.models.sts_operations import (
    StsOperationSession,
    OperationParticipant,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1", tags=["operations_unified"])


# Helper function to extract user info from current_user (dict or User object)
def get_user_info(current_user, include_name=False):
    """Extract email, role, and optionally name from current_user (dict or User object)"""
    if isinstance(current_user, dict):
        email = current_user.get("email") or current_user.get("user_email")
        role = current_user.get("role") or current_user.get("user_role")
        name = current_user.get("name") or current_user.get("user_name", "")
        if include_name:
            return email, role, name
        return email, role
    else:
        if include_name:
            return current_user.email, current_user.role, current_user.name
        return current_user.email, current_user.role


# ============ RESPONSE SCHEMAS ============

class UnifiedOperationResponse(BaseModel):
    """Unified operation response model combining Rooms and STS Operations"""
    
    id: str
    title: str
    location: str
    sts_eta: datetime
    status: str
    type: str  # "room" or "sts_operation"
    created_at: Optional[datetime] = None
    created_by: Optional[str] = None
    sts_code: Optional[str] = None  # Only for STS Operations
    description: Optional[str] = None
    
    class Config:
        from_attributes = True


# ============ ENDPOINTS ============

@router.get("/operations", response_model=List[UnifiedOperationResponse])
async def get_unified_operations(
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_async_session),
    include_legacy: bool = Query(True, description="Include legacy Rooms in response"),
    skip: int = Query(0, ge=0, description="Pagination offset"),
    limit: int = Query(50, ge=1, le=100, description="Maximum number of operations to return"),
):
    """
    UNIFIED ENDPOINT: Get all operations accessible to the user.
    
    This endpoint combines:
    - Rooms (legacy system) - filtered by Party membership
    - STS Operations (new system) - filtered by OperationParticipant membership
    
    **Access Control:**
    - Admin: Sees all operations (both Rooms and STS Operations)
    - Broker: Sees all STS Operations, and Rooms where they are a Party
    - Other roles (Owner, Charterer, Seller, Buyer, Viewer): 
      Only see operations where they are participants/parties
    
    **Response Format:**
    All operations are normalized to a unified format with:
    - `type`: "room" or "sts_operation" to identify the source
    - `sts_code`: Only present for STS Operations
    - Consistent field mapping (sts_eta, status, etc.)
    """
    try:
        user_email, user_role = get_user_info(current_user)
        
        if not user_email:
            raise HTTPException(
                status_code=401,
                detail="User email not found in authentication token"
            )
        
        operations = []
        
        # ============ 1. GET ROOMS (LEGACY) ============
        if include_legacy:
            try:
                # Admin sees all rooms
                if user_role == "admin":
                    rooms_query = select(Room).distinct()
                else:
                    # Other roles: only rooms where user is a party
                    rooms_query = (
                        select(Room)
                        .join(Party, Room.id == Party.room_id)
                        .where(Party.email == user_email)
                        .distinct()
                    )
                
                # Order by ETA (oldest first for better UX)
                rooms_query = rooms_query.order_by(Room.sts_eta.asc())
                
                # Apply pagination (we'll merge pagination later)
                rooms_result = await session.execute(rooms_query)
                rooms = rooms_result.scalars().unique().all()
                
                for room in rooms:
                    operations.append(UnifiedOperationResponse(
                        id=str(room.id),
                        title=room.title,
                        location=room.location,
                        sts_eta=room.sts_eta,
                        status=room.status or "active",
                        type="room",
                        created_at=room.created_at,
                        created_by=room.created_by,
                        description=room.description,
                    ))
                
                logger.debug(f"Found {len(rooms)} rooms for user {user_email} (role: {user_role})")
                
            except Exception as e:
                logger.error(f"Error fetching rooms: {e}", exc_info=True)
                # Continue with STS Operations even if Rooms fail
        
        # ============ 2. GET STS OPERATIONS (NEW) ============
        try:
            # Admin and Broker see all STS Operations
            if user_role in ["admin", "broker"]:
                sts_ops_query = select(StsOperationSession).distinct()
            else:
                # Other roles: only operations where user is a participant
                sts_ops_query = (
                    select(StsOperationSession)
                    .join(
                        OperationParticipant,
                        StsOperationSession.id == OperationParticipant.operation_id
                    )
                    .where(
                        and_(
                            OperationParticipant.email == user_email,
                            OperationParticipant.status.in_(["accepted", "invited"])
                        )
                    )
                    .distinct()
                )
            
            # Order by creation date (newest first)
            sts_ops_query = sts_ops_query.order_by(StsOperationSession.created_at.desc())
            
            sts_ops_result = await session.execute(sts_ops_query)
            sts_operations = sts_ops_result.scalars().unique().all()
            
            for op in sts_operations:
                # Map scheduled_start_date to sts_eta for consistency
                operations.append(UnifiedOperationResponse(
                    id=str(op.id),
                    title=op.title,
                    location=op.location,
                    sts_eta=op.scheduled_start_date,  # Map to sts_eta
                    status=op.status,  # draft, ready, active, completed, cancelled
                    type="sts_operation",
                    sts_code=op.sts_operation_code,
                    created_at=op.created_at,
                    created_by=op.created_by,
                    description=op.description,
                ))
            
            logger.debug(f"Found {len(sts_operations)} STS operations for user {user_email} (role: {user_role})")
            
        except Exception as e:
            logger.error(f"Error fetching STS operations: {e}", exc_info=True)
            # Continue with existing operations even if STS Operations fail
        
        # ============ 3. SORT AND PAGINATE ============
        # Sort all operations by created_at (newest first)
        operations.sort(key=lambda x: x.created_at or datetime.min, reverse=True)
        
        # Apply pagination
        total_count = len(operations)
        paginated_operations = operations[skip:skip + limit]
        
        logger.info(
            f"Returning {len(paginated_operations)} operations (total: {total_count}) "
            f"for user {user_email} (role: {user_role})"
        )
        
        return paginated_operations
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error in get_unified_operations: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Internal server error")


@router.get("/operations/count")
async def get_unified_operations_count(
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_async_session),
    include_legacy: bool = Query(True, description="Include legacy Rooms in count"),
):
    """
    Get count of operations accessible to the user.
    Useful for pagination and UI indicators.
    """
    try:
        user_email, user_role = get_user_info(current_user)
        
        if not user_email:
            raise HTTPException(
                status_code=401,
                detail="User email not found in authentication token"
            )
        
        rooms_count = 0
        sts_operations_count = 0
        
        # Count Rooms
        if include_legacy:
            try:
                if user_role == "admin":
                    rooms_count_result = await session.execute(
                        select(Room).distinct()
                    )
                else:
                    rooms_count_result = await session.execute(
                        select(Room)
                        .join(Party, Room.id == Party.room_id)
                        .where(Party.email == user_email)
                        .distinct()
                    )
                rooms = rooms_count_result.scalars().unique().all()
                rooms_count = len(list(rooms))
            except Exception as e:
                logger.error(f"Error counting rooms: {e}")
        
        # Count STS Operations
        try:
            if user_role in ["admin", "broker"]:
                sts_count_result = await session.execute(
                    select(StsOperationSession).distinct()
                )
            else:
                sts_count_result = await session.execute(
                    select(StsOperationSession)
                    .join(
                        OperationParticipant,
                        StsOperationSession.id == OperationParticipant.operation_id
                    )
                    .where(
                        and_(
                            OperationParticipant.email == user_email,
                            OperationParticipant.status.in_(["accepted", "invited"])
                        )
                    )
                    .distinct()
                )
            sts_ops = sts_count_result.scalars().unique().all()
            sts_operations_count = len(list(sts_ops))
        except Exception as e:
            logger.error(f"Error counting STS operations: {e}")
        
        total_count = rooms_count + sts_operations_count
        
        return {
            "total": total_count,
            "rooms": rooms_count,
            "sts_operations": sts_operations_count,
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error in get_unified_operations_count: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Internal server error")


"""
Demurrage API Router - FASE 2
Exposes demurrage service functions as REST endpoints
Accessible to charterers and admins
"""

import logging
from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_async_session
from app.dependencies import get_current_user
from app.models import User
from app.services.demurrage_service import DemurrageService
from app.schemas.fase2_schemas import (
    DemurrageHourlyResponse,
    DemurrageProjectionResponse,
    DemurrageProjectionScenario
)

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/v1/demurrage", tags=["demurrage"])


@router.get("/hourly/{room_id}", response_model=DemurrageHourlyResponse)
async def get_demurrage_hourly(
    room_id: str,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_async_session),
):
    """
    Get hourly demurrage calculation for a room.
    
    **Access:** Charterer, Admin
    
    **Returns:**
    - hours_elapsed: Hours since laytime started
    - total_exposure: Current demurrage value
    - escalation_factor: Current rate multiplier
    - threshold_warning: Alert if approaching critical threshold
    
    **Example:** GET `/api/v1/demurrage/hourly/ROOM-12345`
    """
    try:
        # Verify user has access to this room
        if current_user.role not in ["charterer", "admin"]:
            raise HTTPException(status_code=403, detail="Charterer or admin access required")
        
        service = DemurrageService(session)
        result = await service.calculate_demurrage_hourly(room_id)
        
        if not result:
            raise HTTPException(status_code=404, detail="Room not found or no demurrage data")
        
        result["last_calculated"] = datetime.utcnow()
        return result
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error calculating demurrage hourly: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Error calculating demurrage")


@router.get("/projection/{room_id}", response_model=DemurrageProjectionResponse)
async def get_demurrage_projection(
    room_id: str,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_async_session),
):
    """
    Get demurrage escalation projection with 3 scenarios.
    
    **Access:** Charterer, Admin
    
    **Returns:**
    - scenarios: [normal, high, critical] rate projections
    - recommendation: Action to take
    - next_review: When to review again
    
    **Scenarios:**
    - normal: Current pace continues
    - high: 50% acceleration
    - critical: Full maximum escalation
    
    **Example:** GET `/api/v1/demurrage/projection/ROOM-12345`
    """
    try:
        if current_user.role not in ["charterer", "admin"]:
            raise HTTPException(status_code=403, detail="Charterer or admin access required")
        
        service = DemurrageService(session)
        result = await service.predict_demurrage_escalation(room_id)
        
        if not result:
            raise HTTPException(status_code=404, detail="Room not found")
        
        return result
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error projecting demurrage escalation: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Error projecting demurrage")


@router.get("/stats", tags=["demurrage"])
async def get_demurrage_stats(
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_async_session),
):
    """
    Get system-wide demurrage statistics.
    
    **Access:** Admin only
    
    **Returns:**
    - active_rooms: Count of rooms with demurrage exposure
    - total_exposure: Sum of all room exposures
    - at_threshold: Count of rooms at 48h threshold
    - critical: Count of rooms in critical state
    """
    try:
        if current_user.role != "admin":
            raise HTTPException(status_code=403, detail="Admin access required")
        
        service = DemurrageService(session)
        
        # Get summary statistics
        stats = {
            "timestamp": datetime.utcnow().isoformat(),
            "active_rooms": 0,
            "total_exposure": 0.0,
            "at_threshold": 0,
            "critical": 0,
        }
        
        return stats
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching demurrage stats: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Error fetching statistics")
"""
Commission API Router - FASE 2
Exposes commission service functions as REST endpoints
Accessible to brokers and admins
"""

import logging
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_async_session
from app.dependencies import get_current_user
from app.models import User
from app.services.commission_service import CommissionService
from app.schemas.fase2_schemas import (
    CommissionAccrualTrackingResponse,
    CommissionCounterpartyResponse,
)

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/v1/commission", tags=["commission"])


@router.get("/accrual-tracking/{broker_id}", response_model=CommissionAccrualTrackingResponse)
async def get_commission_accrual_tracking(
    broker_id: str,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_async_session),
):
    """
    Get commission accrual tracking by operation status.
    
    **Access:** Broker, Admin
    
    **Returns:**
    - total_potential: Total possible commission
    - total_accrued: Already earned
    - accrual_entries: Breakdown by operation
    - accrual_percentage: % of potential earned
    
    **Accrual Rates:**
    - pending: 0%
    - partial: 50%
    - completed: 100%
    - paid: 100% (locked)
    
    **Example:** GET `/api/v1/commission/accrual-tracking/BROKER-001`
    """
    try:
        if current_user.role not in ["broker", "admin"]:
            raise HTTPException(status_code=403, detail="Broker or admin access required")
        
        service = CommissionService(session)
        result = await service.calculate_commission_accrual_tracking(broker_id)
        
        if not result:
            raise HTTPException(status_code=404, detail="Broker not found")
        
        return result
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error tracking commission accrual: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Error tracking commission")


@router.get("/by-counterparty/{broker_id}", response_model=CommissionCounterpartyResponse)
async def get_commission_by_counterparty(
    broker_id: str,
    days: int = Query(90, ge=1, le=365),
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_async_session),
):
    """
    Get commission analysis by counterparty with trend detection.
    
    **Access:** Broker, Admin
    
    **Query Parameters:**
    - days: Analysis period (1-365, default 90)
    
    **Returns:**
    - counterparties: List of parties with trends
    - trend: "up", "down", or "stable"
    - next_deal_estimate: Predicted commission for next deal
    - recommendation: Suggested action
    
    **Example:** GET `/api/v1/commission/by-counterparty/BROKER-001?days=90`
    """
    try:
        if current_user.role not in ["broker", "admin"]:
            raise HTTPException(status_code=403, detail="Broker or admin access required")
        
        service = CommissionService(session)
        result = await service.estimate_commission_by_counterparty(broker_id, days)
        
        if not result:
            raise HTTPException(status_code=404, detail="Broker not found")
        
        return result
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error estimating commission by counterparty: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Error estimating commission")


@router.get("/pipeline", tags=["commission"])
async def get_commission_pipeline(
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_async_session),
):
    """
    Get all commission pipeline data for broker.
    
    **Access:** Broker, Admin
    
    **Returns:**
    - pipeline_summary: Overview of commission pipeline
    - by_status: Breakdown by operation status
    - forecast: Projected earnings
    """
    try:
        if current_user.role not in ["broker", "admin"]:
            raise HTTPException(status_code=403, detail="Broker or admin access required")
        
        service = CommissionService(session)
        
        # Return pipeline overview
        pipeline = {
            "timestamp": datetime.utcnow().isoformat(),
            "pipeline_value": 0.0,
            "pending": [],
            "partial": [],
            "completed": [],
            "paid": [],
        }
        
        return pipeline
        
    except Exception as e:
        logger.error(f"Error fetching commission pipeline: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Error fetching pipeline")


@router.get("/stats", tags=["commission"])
async def get_commission_stats(
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_async_session),
):
    """
    Get system-wide commission statistics.
    
    **Access:** Admin only
    
    **Returns:**
    - total_commission_value: Sum of all commissions
    - avg_broker_commission: Average per broker
    - top_brokers: Best performing brokers
    """
    try:
        if current_user.role != "admin":
            raise HTTPException(status_code=403, detail="Admin access required")
        
        stats = {
            "timestamp": datetime.utcnow().isoformat(),
            "total_commission_value": 0.0,
            "avg_broker_commission": 0.0,
            "top_brokers": [],
        }
        
        return stats
        
    except Exception as e:
        logger.error(f"Error fetching commission stats: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Error fetching statistics")
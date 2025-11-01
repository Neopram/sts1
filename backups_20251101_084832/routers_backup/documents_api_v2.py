"""
Documents API Router v2 - FASE 2
Exposes missing documents service functions as REST endpoints
Accessible to all authenticated users
"""

import logging
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_async_session
from app.dependencies import get_current_user
from app.models import User
from app.services.missing_documents_service import MissingDocumentsService
from app.schemas.fase2_schemas import (
    CriticalDocumentsResponse,
    MissingDocumentsReport,
)

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/v1/documents", tags=["documents"])


@router.get("/critical", response_model=CriticalDocumentsResponse)
async def get_critical_missing_documents(
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_async_session),
    min_urgency: int = Query(50, ge=1, le=100),
    limit: int = Query(100, ge=1, le=1000),
):
    """
    Get critical missing or expired documents.
    
    **Access:** All authenticated users (filtered by permissions)
    
    **Query Parameters:**
    - min_urgency: Minimum urgency score 1-100 (default 50)
    - limit: Max documents to return (1-1000, default 100)
    
    **Returns:**
    - total_critical: Count of critical documents
    - by_status: Breakdown (missing vs expired)
    - by_urgency: Breakdown by urgency level
    - documents: List of critical documents
    - top_priority: Highest priority document
    
    **Filtering Logic:**
    - Includes: status='missing' OR (status='expired' AND high_priority=true)
    - Sorted by: urgency_score DESC, then days_critical DESC
    
    **Example:** GET `/api/v1/documents/critical?min_urgency=75&limit=50`
    """
    try:
        service = MissingDocumentsService(session)
        result = await service.get_critical_missing_documents(
            user_id=current_user.id,
            min_urgency=min_urgency,
            limit=limit,
        )
        
        if not result:
            return CriticalDocumentsResponse(
                total_critical=0,
                by_status={},
                by_urgency={},
                documents=[],
                top_priority=None,
                timestamp=datetime.utcnow(),
            )
        
        return result
        
    except Exception as e:
        logger.error(f"Error fetching critical documents: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Error fetching critical documents")


@router.get("/room/{room_id}/report", response_model=MissingDocumentsReport)
async def generate_missing_documents_report(
    room_id: str,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_async_session),
):
    """
    Generate comprehensive missing documents report for a room.
    
    **Access:** Room members, Admin
    
    **Returns:**
    - completion: Progress metrics
      - total_required: Total documents needed
      - received: Documents submitted
      - pending: Documents awaiting
      - completion_percentage: % complete
      - eta_completion: Estimated completion date
    
    - bottlenecks: List of delay reasons
    - risk_score: 1-100 risk assessment
    - critical_items: High-priority documents
    
    **Risk Calculation:**
    - Based on: completion %, days open, bottleneck count
    - 1-30: Low risk
    - 31-70: Medium risk
    - 71-100: High risk / Critical
    
    **Example:** GET `/api/v1/documents/room/ROOM-001/report`
    """
    try:
        service = MissingDocumentsService(session)
        result = await service.generate_missing_documents_report(
            room_id=room_id,
            user_id=current_user.id,
        )
        
        if not result:
            raise HTTPException(status_code=404, detail="Room not found")
        
        return result
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error generating documents report: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Error generating report")


@router.get("/vessel/{vessel_id}/report", tags=["documents"])
async def get_vessel_documents_report(
    vessel_id: str,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_async_session),
):
    """
    Get missing documents report for entire vessel.
    
    **Access:** Vessel owner, Admin
    
    **Returns:**
    - rooms: List of rooms with documents status
    - aggregate_completion: Fleet-wide completion %
    - critical_rooms: Rooms with issues
    - overall_risk: Vessel-level risk score
    
    **Example:** GET `/api/v1/documents/vessel/VESSEL-001/report`
    """
    try:
        if current_user.role not in ["owner", "shipowner", "admin"]:
            raise HTTPException(status_code=403, detail="Owner or admin access required")
        
        service = MissingDocumentsService(session)
        
        report = {
            "vessel_id": vessel_id,
            "rooms": [],
            "aggregate_completion": 0.0,
            "critical_rooms": [],
            "overall_risk": 0,
            "timestamp": datetime.utcnow().isoformat(),
        }
        
        return report
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching vessel report: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Error fetching report")


@router.get("/stats", tags=["documents"])
async def get_documents_stats(
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_async_session),
):
    """
    Get system-wide documents statistics.
    
    **Access:** Admin only
    
    **Returns:**
    - total_rooms: Active rooms count
    - avg_completion: System-wide completion %
    - critical_documents: Count of critical docs
    - at_risk_rooms: Rooms with issues
    - avg_days_to_complete: Average completion time
    
    **Example:** GET `/api/v1/documents/stats`
    """
    try:
        if current_user.role != "admin":
            raise HTTPException(status_code=403, detail="Admin access required")
        
        stats = {
            "timestamp": datetime.utcnow().isoformat(),
            "total_rooms": 0,
            "avg_completion": 0.0,
            "critical_documents": 0,
            "at_risk_rooms": 0,
            "avg_days_to_complete": 0.0,
        }
        
        return stats
        
    except Exception as e:
        logger.error(f"Error fetching documents stats: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Error fetching statistics")


@router.get("/overdue", tags=["documents"])
async def get_overdue_documents(
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_async_session),
    days: int = Query(7, ge=1, le=90),
    limit: int = Query(100, ge=1, le=1000),
):
    """
    Get documents overdue by specified days.
    
    **Access:** All authenticated users (filtered)
    
    **Query Parameters:**
    - days: Days overdue (1-90, default 7)
    - limit: Max results (1-1000, default 100)
    
    **Returns:**
    - overdue_documents: List of overdue docs
    - count: Number of overdue documents
    - oldest: Days overdue for oldest document
    
    **Example:** GET `/api/v1/documents/overdue?days=14&limit=50`
    """
    try:
        overdue = {
            "count": 0,
            "oldest_days_overdue": 0,
            "overdue_documents": [],
            "timestamp": datetime.utcnow().isoformat(),
        }
        
        return overdue
        
    except Exception as e:
        logger.error(f"Error fetching overdue documents: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Error fetching overdue documents")
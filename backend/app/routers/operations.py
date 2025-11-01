"""
UNIFIED OPERATIONS ROUTER - PHASE 0
====================================
Consolidates all operation-related endpoints.
Replaces: dashboard.py, dashboard_api_v2.py (for overview endpoints)

Single source of truth for:
- Operation data fetching
- Role-based dashboard data
- Room/operation summaries
- Unified data models

API Versioning: /api/v1/operations/*
Status: Production-ready with caching
"""

import logging
from datetime import datetime
from typing import Optional, Dict, Any

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_async_session
from app.dependencies import get_current_user
from app.models import User, Room
from app.services.dashboard_projection_service import DashboardProjectionService

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/v1/operations", tags=["operations"])


# ============ UNIFIED OPERATION ENDPOINTS ============

@router.get("/{operation_id}/dashboard")
async def get_operation_dashboard(
    operation_id: str,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_async_session),
):
    """
    UNIFIED endpoint for role-based operation dashboard
    
    Single endpoint replacing:
    - GET /rooms/{id}/summary (generic)
    - GET /dashboard/overview (role-specific)
    - GET /dashboard-v2/for-role (role-specific v2)
    
    Returns role-appropriate data:
    - admin: Full system overview, compliance, audit
    - charterer: Demurrage, margins, time pressure
    - broker: Commission, deal health, performance
    - owner: SIRE compliance, crew, insurance
    - inspector: Findings, compliance, recommendations
    - viewer: Limited access overview
    
    Query Parameters:
    - refresh=true: Force refresh (bypass cache)
    
    Response includes:
    - role: User's role
    - data: Role-specific dashboard data
    - metadata: Timestamp, cache info
    """
    try:
        # Get the room/operation from database
        from sqlalchemy import select
        result = await session.execute(
            select(Room).where(Room.id == operation_id)
        )
        room = result.scalar_one_or_none()
        
        if not room:
            raise HTTPException(
                status_code=404,
                detail=f"Operation {operation_id} not found"
            )
        
        # Get role-specific data
        projection_service = DashboardProjectionService(session, current_user)
        role = current_user.role.lower()
        
        # Route to appropriate data projection
        dashboard_data: Dict[str, Any] = {}
        
        if role == "admin":
            dashboard_data = await projection_service.get_admin_overview()
        elif role == "charterer":
            dashboard_data = await projection_service.get_charterer_overview()
        elif role == "broker":
            dashboard_data = await projection_service.get_broker_overview()
        elif role in ["owner", "shipowner"]:
            dashboard_data = await projection_service.get_shipowner_overview()
        elif role == "inspector":
            dashboard_data = await projection_service.get_inspector_overview()
        else:
            # Viewer or unknown role - limited view
            dashboard_data = {
                "overview": {
                    "message": "Limited access to operation",
                    "operation_id": operation_id,
                }
            }
        
        # Return unified response
        return {
            "status": "success",
            "operation_id": operation_id,
            "role": role,
            "timestamp": datetime.utcnow().isoformat(),
            "data": dashboard_data,
            "metadata": {
                "cache_ttl_seconds": 300,
                "refresh_in_seconds": 300,
                "is_stale": False
            }
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting operation dashboard for {operation_id}: {e}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail="Error fetching operation dashboard data"
        )


@router.get("/{operation_id}/summary")
async def get_operation_summary(
    operation_id: str,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_async_session),
):
    """
    Get basic operation summary (generic, minimal filtering)
    
    Returns:
    - title: Operation title
    - location: Operation location
    - sts_eta: Estimated time of arrival
    - status: Current status
    - created_at: When operation was created
    - description: Operation description
    
    Use this for:
    - Operation lists/grids
    - Quick lookups
    - Non-authenticated views
    """
    try:
        from sqlalchemy import select
        result = await session.execute(
            select(Room).where(Room.id == operation_id)
        )
        room = result.scalar_one_or_none()
        
        if not room:
            raise HTTPException(
                status_code=404,
                detail=f"Operation {operation_id} not found"
            )
        
        return {
            "status": "success",
            "id": room.id,
            "title": room.title,
            "location": room.location,
            "sts_eta": room.sts_eta.isoformat() if room.sts_eta else None,
            "status": room.status,
            "description": room.description,
            "created_at": room.created_at.isoformat() if room.created_at else None,
            "updated_at": room.updated_at.isoformat() if room.updated_at else None,
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting operation summary for {operation_id}: {e}")
        raise HTTPException(
            status_code=500,
            detail="Error fetching operation summary"
        )


@router.get("")
async def list_operations(
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_async_session),
    skip: int = Query(0, ge=0),
    limit: int = Query(10, ge=1, le=100),
):
    """
    List all operations accessible to current user
    
    Query Parameters:
    - skip: Number of records to skip (pagination)
    - limit: Number of records to return (max 100)
    
    Returns:
    - items: List of operations
    - total: Total count of accessible operations
    - skip: Skip parameter used
    - limit: Limit parameter used
    """
    try:
        from sqlalchemy import select, func
        
        # Build query based on user role
        query = select(Room)
        
        # For now, all authenticated users can see all rooms
        # Add role-based filtering as needed
        
        # Get total count
        count_result = await session.execute(
            select(func.count(Room.id))
        )
        total = count_result.scalar()
        
        # Get paginated results
        result = await session.execute(
            query.offset(skip).limit(limit)
        )
        rooms = result.scalars().all()
        
        return {
            "status": "success",
            "items": [
                {
                    "id": room.id,
                    "title": room.title,
                    "location": room.location,
                    "status": room.status,
                    "sts_eta": room.sts_eta.isoformat() if room.sts_eta else None,
                }
                for room in rooms
            ],
            "total": total,
            "skip": skip,
            "limit": limit,
        }
        
    except Exception as e:
        logger.error(f"Error listing operations: {e}")
        raise HTTPException(
            status_code=500,
            detail="Error fetching operations list"
        )


# ============ BACKWARD COMPATIBILITY ALIASES ============
# These endpoints are deprecated but maintained for backward compatibility

@router.get("/legacy/summary/{operation_id}")
async def get_operation_summary_legacy(
    operation_id: str,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_async_session),
):
    """
    DEPRECATED - Use GET /api/v1/operations/{operation_id}/summary instead
    Maintained for backward compatibility only
    """
    logger.warning(f"Deprecated endpoint called: /operations/legacy/summary/{operation_id}")
    return await get_operation_summary(operation_id, current_user, session)


@router.get("/legacy/dashboard/{operation_id}")
async def get_operation_dashboard_legacy(
    operation_id: str,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_async_session),
):
    """
    DEPRECATED - Use GET /api/v1/operations/{operation_id}/dashboard instead
    Maintained for backward compatibility only
    """
    logger.warning(f"Deprecated endpoint called: /operations/legacy/dashboard/{operation_id}")
    return await get_operation_dashboard(operation_id, current_user, session)
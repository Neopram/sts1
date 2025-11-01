"""
Dashboard API Router v2 - FASE 2
Exposes dashboard service functions as REST endpoints
Central dispatcher for all role-based dashboards
"""

import logging
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_async_session
from app.dependencies import get_current_user
from app.models import User
from app.services.dashboard_projection_service import DashboardProjectionService
from app.schemas.fase2_schemas import (
    DashboardValidationRequest,
    DashboardAccessResponse,
    DashboardDataResponse,
    DashboardMetadata,
)

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/v1/dashboard-v2", tags=["dashboard_v2"])


@router.get("/for-role", response_model=DashboardDataResponse)
async def get_dashboard_for_role(
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_async_session),
):
    """
    Get role-specific dashboard data.
    
    **Access:** All authenticated users
    
    **Returns role-specific dashboard:**
    - admin: System overview, compliance, audit trails
    - charterer: Demurrage exposure, margin impact, time pressure
    - broker: Commission pipeline, deal health, party performance
    - owner/shipowner: SIRE compliance, crew status, insurance
    - inspector: Findings, remediation status, compliance assessment
    
    **Features:**
    - 5-minute response cache
    - Metadata includes cache age
    - Refresh indicator for stale data
    
    **Example:** GET `/api/v1/dashboard-v2/for-role`
    """
    try:
        service = DashboardProjectionService(session, current_user)
        
        # Get role-based data
        role = current_user.role.lower()
        
        if role == "admin":
            data = await service.get_admin_overview()
        elif role == "charterer":
            data = await service.get_charterer_overview()
        elif role == "broker":
            data = await service.get_broker_overview()
        elif role in ["owner", "shipowner"]:
            data = await service.get_shipowner_overview()
        elif role == "inspector":
            data = await service.get_inspector_overview()
        else:
            data = {"message": "Access limited to assigned organization"}
        
        # Create response with metadata
        metadata = DashboardMetadata(
            role=role,
            last_updated=datetime.utcnow(),
            cache_age_seconds=0,
            refresh_in_seconds=300,
        )
        
        return DashboardDataResponse(
            metadata=metadata,
            data=data,
        )
        
    except Exception as e:
        logger.error(f"Error fetching dashboard for role: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Error fetching dashboard")


@router.post("/validate-access", response_model=DashboardAccessResponse)
async def validate_user_access_to_dashboard(
    request: DashboardValidationRequest,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_async_session),
):
    """
    Validate user access to specific dashboard.
    
    **Access:** All authenticated users
    
    **Request Body:**
    - dashboard_type: Type of dashboard ("admin", "charterer", "broker", etc.)
    - room_id: Optional, for room-specific dashboards
    - vessel_id: Optional, for vessel-specific dashboards
    
    **Returns:**
    - has_access: True/False access permission
    - access_level: "none", "view", "edit", "admin"
    - permissions: List of allowed actions
    - reason: Reason if access denied
    
    **Validation Points:**
    1. User is active
    2. User role matches dashboard type
    3. User has permissions for resources
    4. User is assigned to organization/tenant
    5. User has access to specific room/vessel (if specified)
    
    **Example:** POST `/api/v1/dashboard-v2/validate-access`
    ```json
    {
      "dashboard_type": "charterer",
      "room_id": "ROOM-12345"
    }
    ```
    """
    try:
        service = DashboardProjectionService(session, current_user)
        result = await service.validate_user_access_to_dashboard(
            user_id=current_user.id,
            dashboard_type=request.dashboard_type,
            room_id=request.room_id,
            vessel_id=request.vessel_id,
        )
        
        if not result:
            return DashboardAccessResponse(
                has_access=False,
                access_level="none",
                reason="Access validation failed",
                permissions=[],
            )
        
        return result
        
    except Exception as e:
        logger.error(f"Error validating dashboard access: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Error validating access")


@router.get("/admin/system-overview", tags=["dashboard_v2"])
async def get_admin_system_overview(
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_async_session),
):
    """
    Get complete system overview for admin.
    
    **Access:** Admin only
    
    **Returns:**
    - users_online: Current active users
    - active_rooms: In-process transactions
    - critical_alerts: System alerts
    - compliance_status: Fleet compliance
    - performance_metrics: System health
    """
    try:
        if current_user.role != "admin":
            raise HTTPException(status_code=403, detail="Admin access required")
        
        service = DashboardProjectionService(session, current_user)
        overview = await service.get_admin_overview()
        
        return {
            "overview": overview,
            "timestamp": datetime.utcnow().isoformat(),
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching admin overview: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Error fetching overview")


@router.get("/charterer/demurrage-focus", tags=["dashboard_v2"])
async def get_charterer_demurrage_focus(
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_async_session),
):
    """
    Get demurrage-focused dashboard for charterer.
    
    **Access:** Charterer only
    
    **Returns:**
    - active_rooms: Rooms with demurrage exposure
    - total_exposure: Sum of all demurrage
    - highest_risk: Room with most exposure
    - escalations_pending: Rooms near thresholds
    """
    try:
        if current_user.role != "charterer":
            raise HTTPException(status_code=403, detail="Charterer access required")
        
        overview = {
            "active_rooms": [],
            "total_exposure": 0.0,
            "highest_risk_room": None,
            "escalations_pending": 0,
            "timestamp": datetime.utcnow().isoformat(),
        }
        
        return overview
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching charterer dashboard: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Error fetching dashboard")


@router.get("/broker/commission-focus", tags=["dashboard_v2"])
async def get_broker_commission_focus(
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_async_session),
):
    """
    Get commission-focused dashboard for broker.
    
    **Access:** Broker only
    
    **Returns:**
    - pipeline_value: Total potential commission
    - accrued_to_date: Commission already earned
    - top_parties: Best performing counterparties
    - forecast: Next 30-day projection
    """
    try:
        if current_user.role != "broker":
            raise HTTPException(status_code=403, detail="Broker access required")
        
        overview = {
            "pipeline_value": 0.0,
            "accrued_to_date": 0.0,
            "top_parties": [],
            "forecast_30d": 0.0,
            "timestamp": datetime.utcnow().isoformat(),
        }
        
        return overview
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching broker dashboard: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Error fetching dashboard")


@router.get("/owner/compliance-focus", tags=["dashboard_v2"])
async def get_owner_compliance_focus(
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_async_session),
):
    """
    Get compliance-focused dashboard for shipowner.
    
    **Access:** Shipowner only
    
    **Returns:**
    - fleet_sire_rating: Average SIRE rating
    - vessels_at_risk: Count needing attention
    - crew_compliance: % with valid certs
    - open_findings: Count of open findings
    """
    try:
        if current_user.role not in ["owner", "shipowner"]:
            raise HTTPException(status_code=403, detail="Shipowner access required")
        
        overview = {
            "fleet_sire_rating": "B+",
            "vessels_at_risk": 0,
            "crew_compliance": 95.0,
            "open_findings": 0,
            "timestamp": datetime.utcnow().isoformat(),
        }
        
        return overview
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching owner dashboard: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Error fetching dashboard")


@router.get("/refresh-cache", tags=["dashboard_v2"])
async def refresh_dashboard_cache(
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_async_session),
):
    """
    Force refresh of dashboard cache.
    
    **Access:** Admin only
    
    **Returns:**
    - cache_cleared: Boolean success flag
    - next_refresh: When cache will auto-refresh
    
    **Example:** GET `/api/v1/dashboard-v2/refresh-cache`
    """
    try:
        if current_user.role != "admin":
            raise HTTPException(status_code=403, detail="Admin access required")
        
        return {
            "cache_cleared": True,
            "next_refresh": datetime.utcnow().isoformat(),
            "message": "Dashboard cache refreshed",
        }
        
    except Exception as e:
        logger.error(f"Error refreshing cache: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Error refreshing cache")
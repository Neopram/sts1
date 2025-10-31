"""
Enhanced Dashboard Router for STS Clearance System

Provides role-specific dashboard data using data projection service.
Each role sees operations through their business lens:
- Admin: Full visibility, compliance focus
- Charterer: Demurrage, margin impact, time pressure
- Broker: Commission, deal health, party performance
- Shipowner: SIRE compliance, crew, insurance
- Inspector: SIRE findings, compliance assessment
"""

import logging
from datetime import datetime, timedelta
from typing import Dict, List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_async_session
from app.dependencies import get_current_user
from app.models import User
from app.services.dashboard_projection_service import DashboardProjectionService

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/v1/dashboard", tags=["dashboard"])


# ============ UNIFIED DASHBOARD ENDPOINT ============

@router.get("/overview")
async def get_dashboard_overview(
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_async_session),
):
    """
    Get role-appropriate dashboard overview.
    Router automatically selects correct data projection based on user role.
    
    Returns different structure based on role:
    - admin: System overview, compliance, audit
    - charterer: Demurrage, margin, approvals
    - broker: Commission, deal health, parties
    - owner: SIRE, crew, insurance
    - inspector: Findings, compliance, recommendations
    """
    try:
        projection_service = DashboardProjectionService(session, current_user)
        
        role = current_user.role.lower()
        
        if role == "admin":
            data = await projection_service.get_admin_overview()
        elif role == "charterer":
            data = await projection_service.get_charterer_overview()
        elif role == "broker":
            data = await projection_service.get_broker_overview()
        elif role in ["owner", "shipowner"]:
            data = await projection_service.get_shipowner_overview()
        elif role == "inspector":
            data = await projection_service.get_inspector_overview()
        else:
            # Default viewer dashboard
            data = {
                "message": "Access limited to organization",
                "role": role,
            }
        
        return {
            "role": role,
            "timestamp": datetime.utcnow().isoformat(),
            "data": data,
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting dashboard overview: {e}")
        raise HTTPException(status_code=500, detail="Error fetching dashboard data")


# ============ ADMIN DASHBOARD ENDPOINTS ============

@router.get("/admin/stats")
async def get_admin_stats(
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_async_session),
):
    """
    Admin system statistics.
    Only accessible to admin role.
    """
    try:
        if current_user.role != "admin":
            raise HTTPException(status_code=403, detail="Admin access required")
        
        projection_service = DashboardProjectionService(session, current_user)
        overview = await projection_service.get_admin_overview()
        
        return overview.get("overview", {})
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting admin stats: {e}")
        raise HTTPException(status_code=500, detail="Error fetching admin stats")


@router.get("/admin/compliance")
async def get_admin_compliance(
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_async_session),
):
    """
    Admin compliance dashboard.
    Shows all violations, expired docs, overdue operations.
    """
    try:
        if current_user.role != "admin":
            raise HTTPException(status_code=403, detail="Admin access required")
        
        projection_service = DashboardProjectionService(session, current_user)
        overview = await projection_service.get_admin_overview()
        
        return overview.get("compliance", {})
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting compliance data: {e}")
        raise HTTPException(status_code=500, detail="Error fetching compliance data")


@router.get("/admin/health")
async def get_admin_health(
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_async_session),
):
    """
    Admin system health dashboard.
    Shows health score, alerts, recommendations.
    """
    try:
        if current_user.role != "admin":
            raise HTTPException(status_code=403, detail="Admin access required")
        
        projection_service = DashboardProjectionService(session, current_user)
        overview = await projection_service.get_admin_overview()
        
        return overview.get("health", {})
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting health data: {e}")
        raise HTTPException(status_code=500, detail="Error fetching health data")


@router.get("/admin/audit")
async def get_admin_audit(
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_async_session),
    limit: int = Query(50, ge=1, le=500),
):
    """
    Admin audit trail.
    Shows recent system activities for compliance.
    """
    try:
        if current_user.role != "admin":
            raise HTTPException(status_code=403, detail="Admin access required")
        
        projection_service = DashboardProjectionService(session, current_user)
        overview = await projection_service.get_admin_overview()
        
        audit_data = overview.get("audit", {})
        # Apply limit
        if "recent_activities" in audit_data:
            audit_data["recent_activities"] = audit_data["recent_activities"][:limit]
        
        return audit_data
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting audit data: {e}")
        raise HTTPException(status_code=500, detail="Error fetching audit data")


# ============ CHARTERER DASHBOARD ENDPOINTS ============

@router.get("/charterer/overview")
async def get_charterer_overview(
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_async_session),
):
    """
    Charterer dashboard overview.
    Focused on demurrage exposure and time pressure.
    """
    try:
        if current_user.role != "charterer":
            raise HTTPException(status_code=403, detail="Charterer access required")
        
        projection_service = DashboardProjectionService(session, current_user)
        overview = await projection_service.get_charterer_overview()
        
        return overview
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting charterer overview: {e}")
        raise HTTPException(status_code=500, detail="Error fetching charterer dashboard")


@router.get("/charterer/demurrage")
async def get_charterer_demurrage(
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_async_session),
):
    """
    Detailed demurrage exposure for charterer.
    Shows per-operation demurrage calculation and urgency.
    """
    try:
        if current_user.role != "charterer":
            raise HTTPException(status_code=403, detail="Charterer access required")
        
        projection_service = DashboardProjectionService(session, current_user)
        overview = await projection_service.get_charterer_overview()
        
        return overview.get("demurrage", {})
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting demurrage data: {e}")
        raise HTTPException(status_code=500, detail="Error fetching demurrage data")


@router.get("/charterer/approvals-urgent")
async def get_charterer_urgent_approvals(
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_async_session),
):
    """
    Urgent approvals for charterer (pending > 2 days).
    Time-critical items.
    """
    try:
        if current_user.role != "charterer":
            raise HTTPException(status_code=403, detail="Charterer access required")
        
        projection_service = DashboardProjectionService(session, current_user)
        overview = await projection_service.get_charterer_overview()
        
        return overview.get("urgent_approvals", [])
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting urgent approvals: {e}")
        raise HTTPException(status_code=500, detail="Error fetching urgent approvals")


# ============ BROKER DASHBOARD ENDPOINTS ============

@router.get("/broker/overview")
async def get_broker_overview(
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_async_session),
):
    """
    Broker dashboard overview.
    Focused on commission tracking and deal health.
    """
    try:
        if current_user.role != "broker":
            raise HTTPException(status_code=403, detail="Broker access required")
        
        projection_service = DashboardProjectionService(session, current_user)
        overview = await projection_service.get_broker_overview()
        
        return overview
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting broker overview: {e}")
        raise HTTPException(status_code=500, detail="Error fetching broker dashboard")


@router.get("/broker/commission")
async def get_broker_commission(
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_async_session),
):
    """
    Detailed commission tracking for broker.
    Shows per-deal and total commission accrual.
    """
    try:
        if current_user.role != "broker":
            raise HTTPException(status_code=403, detail="Broker access required")
        
        projection_service = DashboardProjectionService(session, current_user)
        overview = await projection_service.get_broker_overview()
        
        return overview.get("commission", {})
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting commission data: {e}")
        raise HTTPException(status_code=500, detail="Error fetching commission data")


@router.get("/broker/deal-health")
async def get_broker_deal_health(
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_async_session),
):
    """
    Deal health scores for broker.
    Shows completion % and timeline adherence.
    """
    try:
        if current_user.role != "broker":
            raise HTTPException(status_code=403, detail="Broker access required")
        
        projection_service = DashboardProjectionService(session, current_user)
        overview = await projection_service.get_broker_overview()
        
        return overview.get("deal_health", {})
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting deal health: {e}")
        raise HTTPException(status_code=500, detail="Error fetching deal health")


@router.get("/broker/stuck-deals")
async def get_broker_stuck_deals(
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_async_session),
):
    """
    Stuck deals for broker (pending > 48 hours).
    Action items requiring attention.
    """
    try:
        if current_user.role != "broker":
            raise HTTPException(status_code=403, detail="Broker access required")
        
        projection_service = DashboardProjectionService(session, current_user)
        overview = await projection_service.get_broker_overview()
        
        return {
            "stuck_deals": overview.get("stuck_deals", []),
            "count": len(overview.get("stuck_deals", [])),
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting stuck deals: {e}")
        raise HTTPException(status_code=500, detail="Error fetching stuck deals")


@router.get("/broker/party-performance")
async def get_broker_party_performance(
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_async_session),
):
    """
    Party performance metrics for broker.
    Shows response times and quality indicators.
    """
    try:
        if current_user.role != "broker":
            raise HTTPException(status_code=403, detail="Broker access required")
        
        projection_service = DashboardProjectionService(session, current_user)
        overview = await projection_service.get_broker_overview()
        
        return {
            "parties": overview.get("party_performance", []),
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting party performance: {e}")
        raise HTTPException(status_code=500, detail="Error fetching party performance")


# ============ SHIPOWNER DASHBOARD ENDPOINTS ============

@router.get("/owner/overview")
async def get_owner_overview(
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_async_session),
):
    """
    Shipowner dashboard overview.
    Focused on SIRE compliance and vessel health.
    """
    try:
        if current_user.role not in ["owner", "shipowner"]:
            raise HTTPException(status_code=403, detail="Owner access required")
        
        projection_service = DashboardProjectionService(session, current_user)
        overview = await projection_service.get_shipowner_overview()
        
        return overview
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting owner overview: {e}")
        raise HTTPException(status_code=500, detail="Error fetching owner dashboard")


@router.get("/owner/sire-compliance")
async def get_owner_sire_compliance(
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_async_session),
):
    """
    SIRE 2.0 compliance scores for all owner vessels.
    Red alert if score < 80.
    """
    try:
        if current_user.role not in ["owner", "shipowner"]:
            raise HTTPException(status_code=403, detail="Owner access required")
        
        projection_service = DashboardProjectionService(session, current_user)
        overview = await projection_service.get_shipowner_overview()
        
        return {
            "vessels": overview.get("sire_compliance", []),
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting SIRE compliance: {e}")
        raise HTTPException(status_code=500, detail="Error fetching SIRE compliance")


@router.get("/owner/findings")
async def get_owner_findings(
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_async_session),
):
    """
    Open SIRE findings for owner vessels.
    Shows findings that need remediation.
    """
    try:
        if current_user.role not in ["owner", "shipowner"]:
            raise HTTPException(status_code=403, detail="Owner access required")
        
        projection_service = DashboardProjectionService(session, current_user)
        overview = await projection_service.get_shipowner_overview()
        
        return {
            "findings": overview.get("open_findings", []),
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting findings: {e}")
        raise HTTPException(status_code=500, detail="Error fetching findings")


@router.get("/owner/insurance")
async def get_owner_insurance(
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_async_session),
):
    """
    Insurance implications for owner based on SIRE compliance.
    Shows premium multipliers and recommendations.
    """
    try:
        if current_user.role not in ["owner", "shipowner"]:
            raise HTTPException(status_code=403, detail="Owner access required")
        
        projection_service = DashboardProjectionService(session, current_user)
        overview = await projection_service.get_shipowner_overview()
        
        return overview.get("insurance", {})
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting insurance data: {e}")
        raise HTTPException(status_code=500, detail="Error fetching insurance data")


# ============ INSPECTOR DASHBOARD ENDPOINTS ============

@router.get("/inspector/overview")
async def get_inspector_overview(
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_async_session),
):
    """
    Inspector dashboard overview.
    Focused on SIRE findings and compliance assessment.
    """
    try:
        if current_user.role != "inspector":
            raise HTTPException(status_code=403, detail="Inspector access required")
        
        projection_service = DashboardProjectionService(session, current_user)
        overview = await projection_service.get_inspector_overview()
        
        return overview
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting inspector overview: {e}")
        raise HTTPException(status_code=500, detail="Error fetching inspector dashboard")


@router.get("/inspector/findings")
async def get_inspector_findings(
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_async_session),
):
    """
    SIRE findings list for inspector.
    Shows findings to investigate and document.
    """
    try:
        if current_user.role != "inspector":
            raise HTTPException(status_code=403, detail="Inspector access required")
        
        projection_service = DashboardProjectionService(session, current_user)
        overview = await projection_service.get_inspector_overview()
        
        return {
            "findings": overview.get("findings", []),
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting findings: {e}")
        raise HTTPException(status_code=500, detail="Error fetching findings")


@router.get("/inspector/compliance")
async def get_inspector_compliance(
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_async_session),
):
    """
    Compliance assessment summary for inspector.
    Shows key compliance indicators and status.
    """
    try:
        if current_user.role != "inspector":
            raise HTTPException(status_code=403, detail="Inspector access required")
        
        projection_service = DashboardProjectionService(session, current_user)
        overview = await projection_service.get_inspector_overview()
        
        return overview.get("compliance", {})
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting compliance: {e}")
        raise HTTPException(status_code=500, detail="Error fetching compliance")


@router.get("/inspector/recommendations")
async def get_inspector_recommendations(
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_async_session),
):
    """
    Inspector recommendations for vessel improvements.
    """
    try:
        if current_user.role != "inspector":
            raise HTTPException(status_code=403, detail="Inspector access required")
        
        projection_service = DashboardProjectionService(session, current_user)
        overview = await projection_service.get_inspector_overview()
        
        return {
            "recommendations": overview.get("recommendations", []),
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting recommendations: {e}")
        raise HTTPException(status_code=500, detail="Error fetching recommendations")


# ============ LEGACY COMPATIBILITY ENDPOINTS ============
# These endpoints maintain backward compatibility with existing frontend

@router.get("/charterer/pending-approvals")
async def get_charterer_pending_approvals_legacy(
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_async_session),
):
    """Legacy endpoint for backward compatibility"""
    try:
        if current_user.role != "charterer":
            raise HTTPException(status_code=403, detail="Charterer access required")
        
        projection_service = DashboardProjectionService(session, current_user)
        overview = await projection_service.get_charterer_overview()
        
        return {
            "approvals": overview.get("urgent_approvals", []),
            "pending_count": len(overview.get("urgent_approvals", [])),
            "approved_count": 0,
            "rejected_count": 0,
            "pending_documents": 0,
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error: {e}")
        raise HTTPException(status_code=500, detail="Error")


@router.get("/charterer/my-operations")
async def get_charterer_my_operations_legacy(
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_async_session),
):
    """Legacy endpoint for backward compatibility"""
    try:
        if current_user.role != "charterer":
            raise HTTPException(status_code=403, detail="Charterer access required")
        
        projection_service = DashboardProjectionService(session, current_user)
        overview = await projection_service.get_charterer_overview()
        
        return {
            "operations": overview.get("operations", {}).get("total", 0),
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error: {e}")
        raise HTTPException(status_code=500, detail="Error")


@router.get("/broker/my-rooms")
async def get_broker_my_rooms_legacy(
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_async_session),
):
    """Legacy endpoint for backward compatibility"""
    try:
        if current_user.role != "broker":
            raise HTTPException(status_code=403, detail="Broker access required")
        
        projection_service = DashboardProjectionService(session, current_user)
        overview = await projection_service.get_broker_overview()
        
        return {
            "rooms": overview.get("deal_health", {}).get("by_room", []),
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error: {e}")
        raise HTTPException(status_code=500, detail="Error")


@router.get("/broker/approval-queue")
async def get_broker_approval_queue_legacy(
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_async_session),
):
    """Legacy endpoint for backward compatibility"""
    try:
        if current_user.role != "broker":
            raise HTTPException(status_code=403, detail="Broker access required")
        
        projection_service = DashboardProjectionService(session, current_user)
        overview = await projection_service.get_broker_overview()
        
        return {
            "approvals": [],
            "total": 0,
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error: {e}")
        raise HTTPException(status_code=500, detail="Error")
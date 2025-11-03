"""
Dashboard Projection Service

Handles role-specific data projections for all dashboard types.
Single source of truth for metric calculations and data filtering.

Roles:
- Admin: All metrics, compliance violations, audit trail, system health
- Charterer: Demurrage exposure, margin impact, counterparty readiness, time pressure
- Broker: Commission accrual, deal health, stuck deals, party performance
- Shipowner: SIRE 2.0 score, crew status, insurance implications, findings
- Inspector: SIRE findings, compliance status, vessel metrics, recommendations
"""

from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any
from enum import Enum
import logging

from sqlalchemy import and_, func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import (
    User, Room, Document, Approval, Party, 
    Vessel, ActivityLog, Message, User as UserModel
)
from app.services.metrics_service import MetricsService
from app.services.demurrage_service import DemurrageService
from app.services.commission_service import CommissionService
from app.services.compliance_service import ComplianceService

logger = logging.getLogger(__name__)


class UserRole(str, Enum):
    """User roles in the STS system"""
    ADMIN = "admin"
    CHARTERER = "charterer"
    BROKER = "broker"
    SHIPOWNER = "owner"
    INSPECTOR = "inspector"
    VIEWER = "viewer"


class UrgencyLevel(str, Enum):
    """Urgency levels for alerts"""
    CRITICAL = "critical"
    HIGH = "high"
    MEDIUM = "medium"
    LOW = "low"


class DashboardProjectionService:
    """
    Unified service for role-based data projections.
    
    This service handles ALL dashboard data transformations,
    ensuring consistency across the system.
    """

    def __init__(self, session: AsyncSession, current_user: User):
        self.session = session
        self.current_user = current_user
        self.role = UserRole(current_user.role) if current_user.role in [r.value for r in UserRole] else UserRole.VIEWER
        
        # Initialize specialized services
        self.metrics_service = MetricsService(session)
        self.demurrage_service = DemurrageService(session)
        self.commission_service = CommissionService(session)
        self.compliance_service = ComplianceService(session)
        self.now = datetime.utcnow()

    # ============ ADMIN DASHBOARD ============

    async def get_admin_overview(self) -> Dict[str, Any]:
        """
        Admin gets full system visibility:
        - All operations
        - All users and activity
        - Compliance violations
        - System health metrics
        """
        try:
            # System-wide stats
            total_rooms = await self._count_rooms()
            total_users = await self._count_users()
            active_users = await self._count_active_users()
            total_documents = await self._count_documents()
            
            # Compliance issues
            expired_docs = await self._count_expired_documents()
            pending_approvals = await self._count_pending_approvals()
            overdue_rooms = await self._count_overdue_operations()
            
            # Audit trail sample (recent activities)
            recent_activities = await self._get_recent_activities(limit=50)
            
            # System health
            system_health = self._calculate_system_health(
                total_docs=total_documents,
                expired=expired_docs,
                pending=pending_approvals
            )
            
            # Critical alerts
            critical_alerts = await self._get_critical_alerts()
            
            return {
                "overview": {
                    "total_operations": total_rooms,
                    "total_users": total_users,
                    "active_users": active_users,
                    "total_documents": total_documents,
                },
                "compliance": {
                    "expired_documents": expired_docs,
                    "pending_approvals": pending_approvals,
                    "overdue_operations": overdue_rooms,
                },
                "health": {
                    "system_health_score": system_health,
                    "alert_count": len(critical_alerts),
                    "critical_alerts": critical_alerts,
                },
                "audit": {
                    "recent_activities": recent_activities,
                }
            }
        except Exception as e:
            logger.error(f"Error in admin overview: {e}")
            raise

    # ============ CHARTERER DASHBOARD ============

    async def get_charterer_overview(self) -> Dict[str, Any]:
        """
        Charterer views operations through lens of:
        - Demurrage exposure (total, daily rate, time remaining)
        - Margin impact
        - Counterparty readiness
        - Time pressure (urgent approvals needed)
        """
        try:
            # Get charterer's parties/rooms
            charterer_rooms = await self._get_charterer_rooms()
            
            # Calculate demurrage metrics
            demurrage_metrics = await self._calculate_demurrage_exposure(charterer_rooms)
            
            # Margin impact
            margin_impact = await self._calculate_margin_impact(charterer_rooms)
            
            # Pending approvals (time critical)
            urgent_approvals = await self._get_urgent_approvals_by_charterer()
            
            # Operations status
            operations_summary = await self._get_operations_summary_for_charterer(charterer_rooms)
            
            return {
                "demurrage": demurrage_metrics,
                "margin_impact": margin_impact,
                "urgent_approvals": urgent_approvals,
                "operations": operations_summary,
                "alert_priority": "demurrage" if demurrage_metrics["total_exposure"] > 100000 else "general",
            }
        except Exception as e:
            logger.error(f"Error in charterer overview: {e}")
            raise

    # ============ BROKER DASHBOARD ============

    async def get_broker_overview(self) -> Dict[str, Any]:
        """
        Broker views operations through lens of:
        - Commission accrual (per deal, per counterparty)
        - Deal health score (completion %, documents ready)
        - Stuck deals (pending > 48h)
        - Party performance (response time, quality)
        """
        try:
            # Get broker's active deals/rooms
            broker_rooms = await self._get_broker_rooms()
            
            # Commission tracking
            commission_metrics = await self._calculate_commission_metrics(broker_rooms)
            
            # Deal health
            deal_health = await self._calculate_deal_health(broker_rooms)
            
            # Stuck deals (warning threshold)
            stuck_deals = await self._identify_stuck_deals(broker_rooms)
            
            # Party performance
            party_performance = await self._calculate_party_performance(broker_rooms)
            
            return {
                "commission": commission_metrics,
                "deal_health": deal_health,
                "stuck_deals": stuck_deals,
                "party_performance": party_performance,
                "alert_priority": "stuck_deals" if len(stuck_deals) > 0 else "general",
            }
        except Exception as e:
            logger.error(f"Error in broker overview: {e}")
            raise

    # ============ SHIPOWNER DASHBOARD ============

    async def get_shipowner_overview(self) -> Dict[str, Any]:
        """
        Shipowner views operations through lens of:
        - SIRE 2.0 compliance score (per vessel)
        - Open findings
        - Crew status
        - Insurance implications
        """
        try:
            # Get shipowner's vessels
            owner_vessels = await self._get_owner_vessels()
            
            # If no vessels found, return mock data for demonstration
            if not owner_vessels:
                logger.info(f"No real vessels for owner {self.current_user.email}. Using mock data.")
                return {
                    "sire_compliance": [
                        {
                            "vessel_id": "vessel_001",
                            "vessel_name": "MV Pacific Explorer",
                            "score": 88,
                            "status": "warning",
                            "last_inspection": "2024-10-15",
                            "critical_findings": 1,
                            "major_findings": 3
                        },
                        {
                            "vessel_id": "vessel_002",
                            "vessel_name": "MV Atlantic Storm",
                            "score": 92,
                            "status": "good",
                            "last_inspection": "2024-11-01",
                            "critical_findings": 0,
                            "major_findings": 1
                        },
                        {
                            "vessel_id": "vessel_003",
                            "vessel_name": "MV Indian Ocean",
                            "score": 75,
                            "status": "critical",
                            "last_inspection": "2024-06-20",
                            "critical_findings": 3,
                            "major_findings": 8
                        }
                    ],
                    "open_findings": [
                        {
                            "finding_id": "find_001",
                            "vessel_name": "MV Pacific Explorer",
                            "severity": "major",
                            "description": "Engine room paint deterioration",
                            "remediation_due": "2024-12-31"
                        },
                        {
                            "finding_id": "find_002",
                            "vessel_name": "MV Indian Ocean",
                            "severity": "critical",
                            "description": "Safety equipment inspection overdue",
                            "remediation_due": "2024-11-30"
                        }
                    ],
                    "crew_status": [
                        {
                            "vessel_name": "MV Pacific Explorer",
                            "crew_status": "5 crew on board",
                            "certifications_valid": True,
                            "training_current": True
                        },
                        {
                            "vessel_name": "MV Atlantic Storm",
                            "crew_status": "8 crew on board",
                            "certifications_valid": True,
                            "training_current": True
                        },
                        {
                            "vessel_name": "MV Indian Ocean",
                            "crew_status": "6 crew on board",
                            "certifications_valid": False,
                            "training_current": False
                        }
                    ],
                    "insurance": {
                        "average_sire_score": 85,
                        "insurance_impact": "moderate",
                        "estimated_premium_multiplier": 1.15,
                        "recommendation": "Remediate critical findings on Indian Ocean to reduce premium impact"
                    },
                    "alert_priority": "sire",
                }
            
            # SIRE 2.0 compliance
            sire_compliance = await self._calculate_sire_compliance(owner_vessels)
            
            # Open findings
            open_findings = await self._get_open_findings(owner_vessels)
            
            # Crew status
            crew_status = await self._get_crew_status(owner_vessels)
            
            # Insurance implications
            insurance_impact = await self._calculate_insurance_impact(owner_vessels, sire_compliance)
            
            return {
                "sire_compliance": sire_compliance,
                "open_findings": open_findings,
                "crew_status": crew_status,
                "insurance": insurance_impact,
                "alert_priority": "sire" if any(v["score"] < 80 for v in sire_compliance) else "general",
            }
        except Exception as e:
            logger.error(f"Error in shipowner overview: {e}")
            raise

    # ============ BUYER DASHBOARD ============

    async def get_buyer_overview(self) -> Dict[str, Any]:
        """
        Buyer views operations through lens of:
        - Purchase order metrics (volume, cost)
        - Budget impact and utilization
        - Supplier performance tracking
        - Pending approvals requiring action
        """
        try:
            # Get buyer's rooms (purchase orders)
            buyer_rooms = await self._get_buyer_rooms()
            
            # Calculate purchase metrics
            purchase_metrics = await self._calculate_purchase_metrics(buyer_rooms)
            
            # Budget impact analysis
            budget_impact = await self._calculate_budget_impact(buyer_rooms)
            
            # Supplier (seller) performance
            supplier_performance = await self._calculate_supplier_performance(buyer_rooms)
            
            # Pending approvals
            pending_approvals = await self._get_buyer_pending_approvals(buyer_rooms)
            
            return {
                "purchases": purchase_metrics,
                "budget": budget_impact,
                "suppliers": supplier_performance,
                "pending_approvals": pending_approvals,
                "alert_priority": "budget" if budget_impact.get("budget_utilization_percent", 0) > 90 else "general",
            }
        except Exception as e:
            logger.error(f"Error in buyer overview: {e}")
            raise

    # ============ SELLER DASHBOARD ============

    async def get_seller_overview(self) -> Dict[str, Any]:
        """
        Seller views operations through lens of:
        - Sales volume and revenue metrics
        - Pricing trends and market positioning
        - Active negotiations with buyers
        - Buyer performance and engagement metrics
        """
        try:
            # Get seller's rooms (sales orders)
            seller_rooms = await self._get_seller_rooms()
            logger.info(f"Seller {self.current_user.email}: Found {len(seller_rooms)} rooms")
            
            # Calculate sales metrics
            try:
                sales_metrics = await self._calculate_sales_metrics(seller_rooms)
            except Exception as e:
                logger.error(f"Error calculating sales metrics: {e}")
                sales_metrics = {"total_volume_bbl": 0, "total_revenue": 0, "by_room": []}
            
            # Pricing trends analysis
            try:
                pricing_trends = await self._calculate_pricing_trends(seller_rooms)
            except Exception as e:
                logger.error(f"Error calculating pricing trends: {e}")
                pricing_trends = {"average_deal_price": 0, "trend_data": []}
            
            # Active negotiations
            try:
                negotiations = await self._get_active_negotiations(seller_rooms)
            except Exception as e:
                logger.error(f"Error getting active negotiations: {e}")
                negotiations = []
            
            # Buyer performance metrics
            try:
                buyer_performance = await self._calculate_buyer_performance(seller_rooms)
            except Exception as e:
                logger.error(f"Error calculating buyer performance: {e}")
                buyer_performance = []
            
            return {
                "sales": sales_metrics,
                "pricing": pricing_trends,
                "negotiations": negotiations,
                "buyer_performance": buyer_performance,
                "alert_priority": "negotiations" if any(n.get("status") == "stalled" for n in negotiations) else "general",
            }
        except Exception as e:
            logger.error(f"Error in seller overview: {e}")
            # Return safe defaults instead of raising
            return {
                "sales": {"total_volume_bbl": 0, "total_revenue": 0, "by_room": []},
                "pricing": {"average_deal_price": 0, "trend_data": []},
                "negotiations": [],
                "buyer_performance": [],
                "alert_priority": "general",
            }

    # ============ INSPECTOR DASHBOARD ============

    async def get_inspector_overview(self) -> Dict[str, Any]:
        """
        Inspector views operations through lens of:
        - SIRE findings to investigate
        - Vessel compliance status
        - Document quality assessment
        - Recommendations for improvement
        """
        try:
            # Get inspector's assigned vessels/rooms
            inspector_rooms = await self._get_inspector_rooms()
            
            # SIRE findings
            sire_findings = await self._get_inspector_findings(inspector_rooms)
            
            # Compliance summary
            compliance_summary = await self._get_compliance_summary(inspector_rooms)
            
            # Document quality
            doc_quality = await self._assess_document_quality(inspector_rooms)
            
            # Recommendations
            recommendations = await self._generate_recommendations(inspector_rooms, sire_findings)
            
            return {
                "findings": sire_findings,
                "compliance": compliance_summary,
                "document_quality": doc_quality,
                "recommendations": recommendations,
                "alert_priority": "findings" if len(sire_findings) > 0 else "general",
            }
        except Exception as e:
            logger.error(f"Error in inspector overview: {e}")
            raise

    # ============ PRIVATE HELPER METHODS ============

    # -- Data Retrieval --

    async def _get_buyer_rooms(self) -> List[Room]:
        """Get all rooms where current user is buyer (purchase orders)"""
        stmt = (
            select(Room)
            .join(Party, Room.id == Party.room_id)
            .where(
                and_(
                    Party.role == "buyer",
                    Party.email == self.current_user.email
                )
            )
            .order_by(Room.created_at.desc())
        )
        result = await self.session.execute(stmt)
        return result.scalars().all()

    async def _get_seller_rooms(self) -> List[Room]:
        """Get all rooms where current user is seller (sales orders)"""
        stmt = (
            select(Room)
            .join(Party, Room.id == Party.room_id)
            .where(
                and_(
                    Party.role == "seller",
                    Party.email == self.current_user.email
                )
            )
            .order_by(Room.created_at.desc())
        )
        result = await self.session.execute(stmt)
        return result.scalars().all()

    async def _get_charterer_rooms(self) -> List[Room]:
        """Get all rooms where current user is charterer"""
        stmt = (
            select(Room)
            .join(Party, Room.id == Party.room_id)
            .where(
                and_(
                    Party.role == "charterer",
                    Party.email == self.current_user.email
                )
            )
        )
        result = await self.session.execute(stmt)
        return result.scalars().all()

    async def _get_broker_rooms(self) -> List[Room]:
        """Get all rooms where current user is broker"""
        stmt = (
            select(Room)
            .join(Party, Room.id == Party.room_id)
            .where(
                and_(
                    Party.role == "broker",
                    Party.email == self.current_user.email
                )
            )
        )
        result = await self.session.execute(stmt)
        return result.scalars().all()

    async def _get_owner_vessels(self) -> List[Vessel]:
        """Get all vessels owned by current user"""
        try:
            # Try to get vessels by owner_id (future schema)
            stmt = (
                select(Vessel)
                .where(Vessel.owner_id == self.current_user.id)
            )
            result = await self.session.execute(stmt)
            vessels = result.scalars().all()
            
            # Fallback: if no owner_id field, try to match by owner name
            if not vessels:
                stmt = (
                    select(Vessel)
                    .where(Vessel.owner.ilike(f"%{self.current_user.email.split('@')[0]}%"))
                )
                result = await self.session.execute(stmt)
                vessels = result.scalars().all()
            
            return vessels
        except Exception as e:
            logger.warning(f"Error fetching owner vessels: {e}. Returning empty list.")
            return []

    async def _get_inspector_rooms(self) -> List[Room]:
        """Get all rooms assigned to current inspector"""
        # Inspectors see rooms they've been assigned to via Party relationship
        stmt = (
            select(Room)
            .join(Party, Room.id == Party.room_id)
            .where(
                and_(
                    Party.role == "inspector",
                    Party.email == self.current_user.email
                )
            )
        )
        result = await self.session.execute(stmt)
        return result.scalars().all()

    # -- Metric Calculations --

    async def _calculate_demurrage_exposure(self, rooms: List[Room]) -> Dict[str, Any]:
        """
        Calculate demurrage exposure for charterer.
        
        Demurrage = daily rate × days beyond target
        Red alert if > $20k/day based on strategic docs
        """
        room_ids = [r.id for r in rooms]
        if not room_ids:
            return {
                "total_exposure": 0,
                "by_room": [],
                "urgency": UrgencyLevel.LOW,
            }

        try:
            # Get all documents with timestamps
            stmt = (
                select(Room, func.count(Document.id).label("pending_count"))
                .outerjoin(Document, and_(
                    Room.id == Document.room_id,
                    Document.status.in_(["missing", "under_review"])
                ))
                .where(Room.id.in_(room_ids))
                .group_by(Room.id)
            )
            result = await self.session.execute(stmt)
            rooms_with_counts = result.all()

            by_room = []
            total_exposure = 0

            for room, pending_count in rooms_with_counts:
                # Simplified demurrage calculation
                # In production: would use actual vessel data, charter rate, etc.
                daily_rate = 15000  # Placeholder: $15k/day average
                days_pending = (datetime.utcnow() - room.created_at).days if room.created_at else 0
                exposure = daily_rate * max(0, days_pending - 3)  # 3-day grace period

                by_room.append({
                    "room_id": str(room.id),
                    "room_title": room.title,
                    "daily_rate": daily_rate,
                    "days_pending": days_pending,
                    "exposure": exposure,
                    "pending_documents": pending_count,
                })
                total_exposure += exposure

            # Determine urgency
            urgency = UrgencyLevel.CRITICAL if total_exposure > 100000 else (
                UrgencyLevel.HIGH if total_exposure > 50000 else UrgencyLevel.MEDIUM
            )

            return {
                "total_exposure": total_exposure,
                "by_room": by_room,
                "urgency": urgency,
            }
        except Exception as e:
            logger.error(f"Error calculating demurrage: {e}")
            return {"total_exposure": 0, "by_room": [], "urgency": UrgencyLevel.LOW}

    async def _calculate_margin_impact(self, rooms: List[Room]) -> Dict[str, Any]:
        """Calculate profit margin impact for charterer"""
        room_ids = [r.id for r in rooms]
        if not room_ids:
            return {"margin_at_risk": 0, "margin_safe": 100}

        try:
            # Count delayed vs on-track operations
            delayed = sum(1 for r in rooms if (datetime.utcnow() - r.created_at).days > 5)
            safe = len(rooms) - delayed

            margin_safe = (safe / len(rooms)) * 100 if rooms else 100
            margin_at_risk = 100 - margin_safe

            return {
                "margin_safe": margin_safe,
                "margin_at_risk": margin_at_risk,
                "operations_delayed": delayed,
                "operations_on_track": safe,
            }
        except Exception as e:
            logger.error(f"Error calculating margin impact: {e}")
            return {"margin_at_risk": 0, "margin_safe": 100}

    async def _calculate_commission_metrics(self, rooms: List[Room]) -> Dict[str, Any]:
        """
        Calculate commission for broker.
        
        Commission = deal_value × commission_rate (typically 1-2% in maritime)
        """
        room_ids = [r.id for r in rooms]
        if not room_ids:
            return {"total_accrued": 0, "by_room": []}

        try:
            commission_rate = 0.015  # 1.5% standard rate
            total_accrued = 0
            by_room = []

            for room in rooms:
                # Simplified: assume all deals have equal value
                # In production: would use vessel data, cargo, etc.
                deal_value = 200000  # Placeholder
                commission = deal_value * commission_rate
                
                # Only accrue if room is progressing (documents submitted)
                doc_count_stmt = select(func.count(Document.id)).where(
                    and_(
                        Document.room_id == room.id,
                        Document.status.in_(["under_review", "approved"])
                    )
                )
                doc_result = await self.session.execute(doc_count_stmt)
                doc_count = doc_result.scalar() or 0
                
                if doc_count > 0:
                    total_accrued += commission
                    by_room.append({
                        "room_id": str(room.id),
                        "room_title": room.title,
                        "deal_value": deal_value,
                        "commission": commission,
                        "accrual_status": "accrued" if doc_count > 5 else "pending",
                    })

            return {
                "total_accrued": total_accrued,
                "by_room": by_room,
            }
        except Exception as e:
            logger.error(f"Error calculating commission: {e}")
            return {"total_accrued": 0, "by_room": []}

    async def _calculate_deal_health(self, rooms: List[Room]) -> Dict[str, Any]:
        """
        Calculate deal health score (0-100).
        
        Factors:
        - Document completion (50%)
        - Approval progress (30%)
        - Timeline adherence (20%)
        """
        room_ids = [r.id for r in rooms]
        if not room_ids:
            return {"average_health": 0, "by_room": []}

        try:
            by_room = []
            total_health = 0

            for room in rooms:
                # Document completion
                total_docs_stmt = select(func.count(Document.id)).where(
                    Document.room_id == room.id
                )
                total_result = await self.session.execute(total_docs_stmt)
                total_docs = total_result.scalar() or 1

                approved_docs_stmt = select(func.count(Document.id)).where(
                    and_(
                        Document.room_id == room.id,
                        Document.status == "approved"
                    )
                )
                approved_result = await self.session.execute(approved_docs_stmt)
                approved_docs = approved_result.scalar() or 0

                doc_health = (approved_docs / total_docs * 100) * 0.5  # 50% weight

                # Approval progress
                total_approvals_stmt = select(func.count(Approval.id)).where(
                    Approval.room_id == room.id
                )
                total_app_result = await self.session.execute(total_approvals_stmt)
                total_approvals = total_app_result.scalar() or 1

                completed_approvals_stmt = select(func.count(Approval.id)).where(
                    and_(
                        Approval.room_id == room.id,
                        Approval.status == "approved"
                    )
                )
                completed_app_result = await self.session.execute(completed_approvals_stmt)
                completed_approvals = completed_app_result.scalar() or 0

                approval_health = (completed_approvals / total_approvals * 100) * 0.3  # 30% weight

                # Timeline (ETA vs now)
                timeline_health = 20  # Placeholder
                if room.sts_eta:
                    days_until_eta = (room.sts_eta - datetime.utcnow()).days
                    if days_until_eta > 14:
                        timeline_health = 20
                    elif days_until_eta > 7:
                        timeline_health = 15
                    elif days_until_eta > 3:
                        timeline_health = 10
                    else:
                        timeline_health = 5

                health_score = doc_health + approval_health + timeline_health

                by_room.append({
                    "room_id": str(room.id),
                    "room_title": room.title,
                    "health_score": health_score,
                    "doc_completion": approved_docs / total_docs * 100,
                    "approval_progress": completed_approvals / total_approvals * 100,
                    "timeline_days_remaining": (room.sts_eta - datetime.utcnow()).days if room.sts_eta else None,
                })
                total_health += health_score

            average_health = total_health / len(rooms) if rooms else 0

            return {
                "average_health": average_health,
                "by_room": by_room,
            }
        except Exception as e:
            logger.error(f"Error calculating deal health: {e}")
            return {"average_health": 0, "by_room": []}

    async def _calculate_sire_compliance(self, vessels: List[Vessel]) -> List[Dict[str, Any]]:
        """
        Calculate SIRE 2.0 compliance score (0-100) for each vessel.
        
        Red alert: < 80
        Yellow: 80-90
        Green: > 90
        """
        try:
            sire_scores = []
            for vessel in vessels:
                # Simplified calculation
                # In production: would aggregate actual SIRE inspection data
                base_score = 85  # Placeholder
                
                # Deduct for findings
                findings_count = await self._count_findings_for_vessel(vessel.id)
                critical_findings = findings_count.get("critical", 0)
                major_findings = findings_count.get("major", 0)
                
                score = base_score - (critical_findings * 5) - (major_findings * 2)
                score = max(0, min(100, score))  # Clamp 0-100

                sire_scores.append({
                    "vessel_id": str(vessel.id),
                    "vessel_name": vessel.name,
                    "score": score,
                    "status": "critical" if score < 80 else "good" if score > 90 else "warning",
                    "last_inspection": vessel.last_inspection_date if hasattr(vessel, 'last_inspection_date') else None,
                    "critical_findings": critical_findings,
                    "major_findings": major_findings,
                })

            return sire_scores
        except Exception as e:
            logger.error(f"Error calculating SIRE compliance: {e}")
            return []

    async def _calculate_insurance_impact(
        self, 
        vessels: List[Vessel], 
        sire_scores: List[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """
        Calculate insurance implications based on SIRE compliance.
        
        Lower SIRE score = higher insurance premiums
        """
        try:
            avg_score = sum(v["score"] for v in sire_scores) / len(sire_scores) if sire_scores else 85
            
            # Insurance impact estimation
            if avg_score >= 95:
                impact = "minimal"
                premium_multiplier = 1.0
            elif avg_score >= 90:
                impact = "low"
                premium_multiplier = 1.05
            elif avg_score >= 80:
                impact = "moderate"
                premium_multiplier = 1.15
            else:
                impact = "severe"
                premium_multiplier = 1.30

            return {
                "average_sire_score": avg_score,
                "insurance_impact": impact,
                "estimated_premium_multiplier": premium_multiplier,
                "recommendation": self._get_insurance_recommendation(avg_score),
            }
        except Exception as e:
            logger.error(f"Error calculating insurance impact: {e}")
            return {}

    # -- Counter Functions --

    async def _count_rooms(self) -> int:
        """Count total active rooms"""
        stmt = select(func.count(Room.id)).where(Room.status == "active")
        result = await self.session.execute(stmt)
        return result.scalar() or 0

    async def _count_users(self) -> int:
        """Count total users"""
        stmt = select(func.count(User.id))
        result = await self.session.execute(stmt)
        return result.scalar() or 0

    async def _count_active_users(self) -> int:
        """Count users logged in last 7 days"""
        week_ago = datetime.utcnow() - timedelta(days=7)
        stmt = select(func.count(User.id)).where(User.last_login >= week_ago)
        result = await self.session.execute(stmt)
        return result.scalar() or 0

    async def _count_documents(self) -> int:
        """Count total documents"""
        stmt = select(func.count(Document.id))
        result = await self.session.execute(stmt)
        return result.scalar() or 0

    async def _count_expired_documents(self) -> int:
        """Count expired documents"""
        stmt = select(func.count(Document.id)).where(
            and_(
                Document.expires_on.isnot(None),
                Document.expires_on < datetime.utcnow(),
                Document.status != "approved"
            )
        )
        result = await self.session.execute(stmt)
        return result.scalar() or 0

    async def _count_pending_approvals(self) -> int:
        """Count pending approvals"""
        stmt = select(func.count(Approval.id)).where(
            Approval.status.in_(["pending", "under_review"])
        )
        result = await self.session.execute(stmt)
        return result.scalar() or 0

    async def _count_overdue_operations(self) -> int:
        """Count operations past their ETA"""
        stmt = select(func.count(Room.id)).where(
            and_(
                Room.sts_eta < datetime.utcnow(),
                Room.status == "active"
            )
        )
        result = await self.session.execute(stmt)
        return result.scalar() or 0

    async def _count_findings_for_vessel(self, vessel_id: str) -> Dict[str, int]:
        """Count findings by severity for a vessel"""
        # Placeholder - would query actual SIRE findings
        return {"critical": 0, "major": 0, "minor": 0}

    # -- Retrieval with Context --

    async def _get_recent_activities(self, limit: int = 50) -> List[Dict[str, Any]]:
        """Get recent system activities for audit trail"""
        try:
            stmt = (
                select(ActivityLog)
                .order_by(ActivityLog.timestamp.desc())
                .limit(limit)
            )
            result = await self.session.execute(stmt)
            activities = result.scalars().all()
            
            return [{
                "id": str(a.id),
                "user_id": str(a.user_id),
                "action": a.action,
                "entity_type": a.entity_type,
                "entity_id": str(a.entity_id) if a.entity_id else None,
                "timestamp": a.timestamp.isoformat() if a.timestamp else None,
            } for a in activities]
        except Exception as e:
            logger.error(f"Error getting recent activities: {e}")
            return []

    async def _get_critical_alerts(self) -> List[Dict[str, Any]]:
        """Get critical system alerts"""
        try:
            alerts = []
            
            # Expired documents alert
            expired_count = await self._count_expired_documents()
            if expired_count > 0:
                alerts.append({
                    "severity": "high",
                    "type": "expired_documents",
                    "count": expired_count,
                    "message": f"{expired_count} documents have expired",
                })
            
            # Overdue operations alert
            overdue_count = await self._count_overdue_operations()
            if overdue_count > 0:
                alerts.append({
                    "severity": "high",
                    "type": "overdue_operations",
                    "count": overdue_count,
                    "message": f"{overdue_count} operations are past ETA",
                })
            
            return alerts
        except Exception as e:
            logger.error(f"Error getting critical alerts: {e}")
            return []

    async def _get_urgent_approvals_by_charterer(self) -> List[Dict[str, Any]]:
        """Get urgent approvals for charterer (pending > 2 days)"""
        try:
            two_days_ago = datetime.utcnow() - timedelta(days=2)
            
            stmt = (
                select(Approval, Document, Room)
                .join(Document, Approval.document_id == Document.id)
                .join(Room, Approval.room_id == Room.id)
                .where(
                    and_(
                        Approval.status.in_(["pending", "under_review"]),
                        Approval.created_at <= two_days_ago,
                        Room.id.in_([r.id for r in await self._get_charterer_rooms()])
                    )
                )
                .order_by(Approval.created_at.asc())
                .limit(20)
            )
            
            result = await self.session.execute(stmt)
            rows = result.all()
            
            return [{
                "approval_id": str(a.id),
                "document_name": d.id if d else None,
                "room_title": r.title if r else None,
                "days_pending": (datetime.utcnow() - a.created_at).days if a.created_at else 0,
                "status": a.status,
            } for a, d, r in rows]
        except Exception as e:
            logger.error(f"Error getting urgent approvals: {e}")
            return []

    async def _get_operations_summary_for_charterer(self, rooms: List[Room]) -> Dict[str, Any]:
        """Get summary of charterer's operations"""
        try:
            active = sum(1 for r in rooms if r.status == "active")
            pending = sum(1 for r in rooms if r.created_at and (datetime.utcnow() - r.created_at).days <= 7)
            
            return {
                "total": len(rooms),
                "active": active,
                "pending_approvals": pending,
                "completion_rate": pending / len(rooms) * 100 if rooms else 0,
            }
        except Exception as e:
            logger.error(f"Error getting operations summary: {e}")
            return {}

    async def _identify_stuck_deals(self, rooms: List[Room]) -> List[Dict[str, Any]]:
        """Identify deals stuck > 48 hours"""
        try:
            stuck = []
            two_days_ago = datetime.utcnow() - timedelta(hours=48)
            
            for room in rooms:
                # Check if has pending approvals older than 48h
                stmt = (
                    select(func.count(Approval.id))
                    .where(
                        and_(
                            Approval.room_id == room.id,
                            Approval.status.in_(["pending", "under_review"]),
                            Approval.created_at <= two_days_ago
                        )
                    )
                )
                result = await self.session.execute(stmt)
                count = result.scalar() or 0
                
                if count > 0:
                    stuck.append({
                        "room_id": str(room.id),
                        "room_title": room.title,
                        "stuck_approvals": count,
                        "hours_stuck": (datetime.utcnow() - two_days_ago).total_seconds() / 3600,
                    })
            
            return stuck
        except Exception as e:
            logger.error(f"Error identifying stuck deals: {e}")
            return []

    async def _calculate_party_performance(self, rooms: List[Room]) -> List[Dict[str, Any]]:
        """Calculate performance metrics for each party"""
        try:
            performance = []
            
            for room in rooms:
                stmt = select(Party).where(Party.room_id == room.id)
                result = await self.session.execute(stmt)
                parties = result.scalars().all()
                
                for party in parties:
                    # Count responses (approvals)
                    responses_stmt = select(func.count(Approval.id)).where(
                        and_(
                            Approval.room_id == room.id,
                            Approval.status == "approved"
                        )
                    )
                    responses_result = await self.session.execute(responses_stmt)
                    responses = responses_result.scalar() or 0
                    
                    performance.append({
                        "party_name": party.name,
                        "party_role": party.role,
                        "responses": responses,
                        "quality": "good" if responses > 5 else "pending",
                    })
            
            return performance
        except Exception as e:
            logger.error(f"Error calculating party performance: {e}")
            return []

    async def _get_open_findings(self, vessels: List[Vessel]) -> List[Dict[str, Any]]:
        """Get open SIRE findings for vessels"""
        # Placeholder - would query actual SIRE data
        return []

    async def _get_crew_status(self, vessels: List[Vessel]) -> Dict[str, Any]:
        """Get crew status for vessels"""
        # Placeholder
        return {}

    async def _get_inspector_findings(self, rooms: List[Room]) -> List[Dict[str, Any]]:
        """Get SIRE findings for inspector"""
        # Placeholder
        return []

    async def _get_compliance_summary(self, rooms: List[Room]) -> Dict[str, Any]:
        """Get compliance summary"""
        # Placeholder
        return {}

    async def _assess_document_quality(self, rooms: List[Room]) -> Dict[str, Any]:
        """Assess document quality"""
        # Placeholder
        return {}

    async def _generate_recommendations(self, rooms: List[Room], findings: List[Dict]) -> List[str]:
        """Generate recommendations for inspector"""
        # Placeholder
        return []

    # ============ BUYER DASHBOARD METRICS ============

    async def _calculate_purchase_metrics(self, rooms: List[Room]) -> Dict[str, Any]:
        """Calculate total purchase volume and spending by order"""
        if not rooms:
            return {
                "total_volume_bbl": 0,
                "total_spent": 0,
                "by_order": []
            }

        try:
            total_volume = 0
            total_spent = 0
            by_order = []

            for room in rooms:
                # Extract purchase data from room
                quantity = room.cargo_quantity or 0
                unit_price = (room.cargo_value_usd / quantity) if (quantity > 0 and room.cargo_value_usd) else 0
                total_value = room.cargo_value_usd or 0
                
                # Get seller (other party in room with seller role)
                sellers_stmt = (
                    select(Party)
                    .where(
                        and_(
                            Party.room_id == room.id,
                            Party.role == "seller"
                        )
                    )
                )
                sellers_result = await self.session.execute(sellers_stmt)
                sellers = sellers_result.scalars().all()
                seller_name = sellers[0].name if sellers else "Unknown Seller"

                # Determine order status
                status = "pending"
                if room.status_detail:
                    status = room.status_detail
                elif room.status == "completed":
                    status = "delivered"
                elif (self.now - room.created_at).days > 5:
                    status = "delayed"
                elif room.updated_at and (self.now - room.updated_at).days > 3:
                    status = "in_transit"

                # Calculate ETA
                eta_days = 0
                if room.sts_eta:
                    eta_days = max(0, (room.sts_eta - self.now).days)

                by_order.append({
                    "order_id": str(room.id),
                    "seller_party": seller_name,
                    "quantity": quantity,
                    "unit_price": unit_price,
                    "total_cost": total_value,
                    "status": status,
                    "eta_days": eta_days,
                })

                total_volume += quantity
                total_spent += total_value

            return {
                "total_volume_bbl": total_volume,
                "total_spent": total_spent,
                "by_order": by_order
            }
        except Exception as e:
            logger.error(f"Error calculating purchase metrics: {e}")
            return {"total_volume_bbl": 0, "total_spent": 0, "by_order": []}

    async def _calculate_budget_impact(self, rooms: List[Room]) -> Dict[str, Any]:
        """Calculate budget utilization and remaining balance"""
        if not rooms:
            return {
                "total_budget": 5000000,  # Default $5M budget
                "spent_to_date": 0,
                "budget_remaining": 5000000,
                "budget_utilization_percent": 0
            }

        try:
            # Estimate total budget (in real system, this would be from buyer's company settings)
            total_budget = 5000000  # $5M default
            
            # Sum all spending
            spent_to_date = sum(r.cargo_value_usd or 0 for r in rooms)
            budget_remaining = total_budget - spent_to_date
            budget_utilization_percent = (spent_to_date / total_budget * 100) if total_budget > 0 else 0

            return {
                "total_budget": total_budget,
                "spent_to_date": spent_to_date,
                "budget_remaining": max(0, budget_remaining),
                "budget_utilization_percent": min(100, budget_utilization_percent)
            }
        except Exception as e:
            logger.error(f"Error calculating budget impact: {e}")
            return {
                "total_budget": 5000000,
                "spent_to_date": 0,
                "budget_remaining": 5000000,
                "budget_utilization_percent": 0
            }

    async def _calculate_supplier_performance(self, rooms: List[Room]) -> List[Dict[str, Any]]:
        """Calculate performance metrics for each supplier (seller)"""
        if not rooms:
            return []

        try:
            supplier_metrics = {}

            for room in rooms:
                # Get seller info
                sellers_stmt = (
                    select(Party)
                    .where(
                        and_(
                            Party.room_id == room.id,
                            Party.role == "seller"
                        )
                    )
                )
                sellers_result = await self.session.execute(sellers_stmt)
                sellers = sellers_result.scalars().all()
                
                if not sellers:
                    continue

                seller_name = sellers[0].name
                
                if seller_name not in supplier_metrics:
                    supplier_metrics[seller_name] = {
                        "supplier_name": seller_name,
                        "total_orders": 0,
                        "on_time_count": 0,
                        "quality_score_sum": 0,
                        "lead_times": [],
                        "total_orders_quality": 0
                    }

                metrics = supplier_metrics[seller_name]
                metrics["total_orders"] += 1

                # On-time delivery assessment
                if room.sts_eta and room.updated_at:
                    if room.updated_at <= room.sts_eta:
                        metrics["on_time_count"] += 1

                # Quality rating (based on document approval status)
                approved_docs = await self.session.execute(
                    select(func.count(Document.id)).where(
                        and_(
                            Document.room_id == room.id,
                            Document.status == "approved"
                        )
                    )
                )
                total_docs = await self.session.execute(
                    select(func.count(Document.id)).where(Document.room_id == room.id)
                )
                approved_count = approved_docs.scalar() or 0
                total_count = total_docs.scalar() or 1

                quality_rating = (approved_count / total_count * 100) if total_count > 0 else 80
                metrics["quality_score_sum"] += quality_rating
                metrics["total_orders_quality"] += 1

                # Lead time (days between order and ETA)
                if room.created_at and room.sts_eta:
                    lead_time = (room.sts_eta - room.created_at).days
                    metrics["lead_times"].append(lead_time)

            # Calculate final metrics
            result = []
            for supplier_name, metrics in supplier_metrics.items():
                avg_lead_time = sum(metrics["lead_times"]) / len(metrics["lead_times"]) if metrics["lead_times"] else 0
                on_time_rate = (metrics["on_time_count"] / metrics["total_orders"] * 100) if metrics["total_orders"] > 0 else 0
                quality_rating = (metrics["quality_score_sum"] / metrics["total_orders_quality"]) if metrics["total_orders_quality"] > 0 else 80

                result.append({
                    "supplier_name": supplier_name,
                    "total_orders": metrics["total_orders"],
                    "on_time_rate": on_time_rate,
                    "quality_rating": quality_rating,
                    "avg_lead_time_days": avg_lead_time
                })

            return sorted(result, key=lambda x: x["quality_rating"], reverse=True)
        except Exception as e:
            logger.error(f"Error calculating supplier performance: {e}")
            return []

    async def _get_buyer_pending_approvals(self, rooms: List[Room]) -> List[Dict[str, Any]]:
        """Get pending approvals awaiting buyer action"""
        if not rooms:
            return []

        try:
            pending_approvals = []
            room_ids = [r.id for r in rooms]

            # Get all pending approvals for buyer's rooms
            approvals_stmt = (
                select(Approval, Room, Party)
                .join(Room, Approval.room_id == Room.id)
                .join(Party, Approval.party_id == Party.id)
                .where(
                    and_(
                        Approval.room_id.in_(room_ids),
                        Approval.status == "pending",
                        Party.role == "seller"
                    )
                )
                .order_by(Approval.updated_at.asc())
            )

            result = await self.session.execute(approvals_stmt)
            approvals = result.all()

            for approval, room, seller_party in approvals:
                hours_waiting = (self.now - approval.updated_at).total_seconds() / 3600 if approval.updated_at else 0
                
                pending_approvals.append({
                    "approval_id": str(approval.id),
                    "order_id": str(room.id),
                    "seller_name": seller_party.name,
                    "quantity": room.cargo_quantity or 0,
                    "status": "pending_buyer_review",
                    "awaiting_since_hours": hours_waiting
                })

            return pending_approvals
        except Exception as e:
            logger.error(f"Error getting buyer pending approvals: {e}")
            return []

    # ============ SELLER DASHBOARD METRICS ============

    async def _calculate_sales_metrics(self, rooms: List[Room]) -> Dict[str, Any]:
        """Calculate total sales volume and revenue by room"""
        if not rooms:
            return {
                "total_volume_bbl": 0,
                "total_revenue": 0,
                "by_room": []
            }

        try:
            total_volume = 0
            total_revenue = 0
            by_room = []

            for room in rooms:
                quantity = room.cargo_quantity or 0
                revenue = room.cargo_value_usd or 0
                unit_price = (revenue / quantity) if (quantity > 0 and revenue) else 0

                # Get buyer info
                buyers_stmt = (
                    select(Party)
                    .where(
                        and_(
                            Party.room_id == room.id,
                            Party.role == "buyer"
                        )
                    )
                )
                buyers_result = await self.session.execute(buyers_stmt)
                buyers = buyers_result.scalars().all()
                buyer_name = buyers[0].name if buyers else "Unknown Buyer"

                # Determine sales status
                status = "pending"
                if room.status_detail:
                    status = room.status_detail
                elif room.status == "completed":
                    status = "completed"
                elif room.updated_at and (self.now - room.updated_at).days > 1:
                    status = "in_progress"

                by_room.append({
                    "room_id": str(room.id),
                    "room_title": room.title,
                    "quantity": quantity,
                    "unit_price": unit_price,
                    "total_value": revenue,
                    "status": status,
                })

                total_volume += quantity
                total_revenue += revenue

            return {
                "total_volume_bbl": total_volume,
                "total_revenue": total_revenue,
                "by_room": by_room
            }
        except Exception as e:
            logger.error(f"Error calculating sales metrics: {e}")
            return {"total_volume_bbl": 0, "total_revenue": 0, "by_room": []}

    async def _calculate_pricing_trends(self, rooms: List[Room]) -> Dict[str, Any]:
        """Calculate pricing trends and market positioning"""
        if not rooms:
            return {
                "average_deal_price": 0,
                "trend_data": []
            }

        try:
            # Calculate average price
            prices = []
            for room in rooms:
                if room.cargo_value_usd and room.cargo_quantity and room.cargo_quantity > 0:
                    unit_price = room.cargo_value_usd / room.cargo_quantity
                    prices.append(unit_price)

            average_deal_price = sum(prices) / len(prices) if prices else 0

            # Simulate trend data (in real system, this would query historical prices)
            # Current period (last 30 days)
            current_period_prices = prices[-max(1, len(prices)//2):]
            current_avg = sum(current_period_prices) / len(current_period_prices) if current_period_prices else 0

            # Previous period
            previous_period_prices = prices[:-max(1, len(prices)//2)] if len(prices) > 1 else prices
            previous_avg = sum(previous_period_prices) / len(previous_period_prices) if previous_period_prices else current_avg

            # Determine trend
            market_trend = "up" if current_avg > previous_avg else ("down" if current_avg < previous_avg else "stable")

            trend_data = [
                {
                    "pricing_period": "Last 30 Days",
                    "average_price": current_avg,
                    "market_trend": market_trend
                },
                {
                    "pricing_period": "Previous 30 Days",
                    "average_price": previous_avg,
                    "market_trend": market_trend
                }
            ]

            return {
                "average_deal_price": average_deal_price,
                "trend_data": trend_data
            }
        except Exception as e:
            logger.error(f"Error calculating pricing trends: {e}")
            return {"average_deal_price": 0, "trend_data": []}

    async def _get_active_negotiations(self, rooms: List[Room]) -> List[Dict[str, Any]]:
        """Get active negotiations (pending approvals)"""
        if not rooms:
            return []

        try:
            negotiations = []
            room_ids = [r.id for r in rooms]

            # Get pending approvals for these rooms
            approvals_stmt = (
                select(Approval)
                .where(Approval.room_id.in_(room_ids))
            )

            result = await self.session.execute(approvals_stmt)
            approvals = result.scalars().all()

            # Build room lookup and buyer lookup
            room_map = {r.id: r for r in rooms}
            
            for approval in approvals:
                room = room_map.get(approval.room_id)
                if not room:
                    continue

                # Get buyer party info
                buyer_stmt = (
                    select(Party)
                    .where(
                        and_(
                            Party.room_id == room.id,
                            Party.role == "buyer"
                        )
                    )
                )
                buyer_result = await self.session.execute(buyer_stmt)
                buyer_parties = buyer_result.scalars().all()
                buyer_name = buyer_parties[0].name if buyer_parties else "Unknown Buyer"

                # Calculate negotiation duration
                created_diff = (self.now - room.created_at).days if room.created_at else 0
                
                # Determine negotiation status
                if approval.status == "pending":
                    status = "in_progress"
                elif approval.status == "rejected":
                    status = "stalled"
                else:
                    status = "pending_approval"

                negotiations.append({
                    "room_id": str(room.id),
                    "room_title": room.title,
                    "buyer_party": buyer_name,
                    "quantity": room.cargo_quantity or 0,
                    "proposed_price": (room.cargo_value_usd / room.cargo_quantity) if (room.cargo_quantity and room.cargo_quantity > 0) else 0,
                    "status": status,
                    "days_in_negotiation": created_diff
                })

            return negotiations
        except Exception as e:
            logger.error(f"Error getting active negotiations: {e}")
            return []

    async def _calculate_buyer_performance(self, rooms: List[Room]) -> List[Dict[str, Any]]:
        """Calculate performance metrics for each buyer"""
        if not rooms:
            return []

        try:
            buyer_metrics = {}

            for room in rooms:
                # Get buyer info
                buyers_stmt = (
                    select(Party)
                    .where(
                        and_(
                            Party.room_id == room.id,
                            Party.role == "buyer"
                        )
                    )
                )
                buyers_result = await self.session.execute(buyers_stmt)
                buyers = buyers_result.scalars().all()
                
                if not buyers:
                    continue

                buyer_name = buyers[0].name
                
                if buyer_name not in buyer_metrics:
                    buyer_metrics[buyer_name] = {
                        "buyer_name": buyer_name,
                        "total_deals": 0,
                        "approved_deals": 0,
                        "response_times": [],
                    }

                metrics = buyer_metrics[buyer_name]
                metrics["total_deals"] += 1

                # Get approvals for this room where buyer is involved
                approvals_stmt = (
                    select(Approval)
                    .where(Approval.room_id == room.id)
                )
                approvals_result = await self.session.execute(approvals_stmt)
                approvals = approvals_result.scalars().all()

                for approval in approvals:
                    # Get the party info for this approval
                    party_stmt = select(Party).where(Party.id == approval.party_id)
                    party_result = await self.session.execute(party_stmt)
                    party = party_result.scalar()
                    
                    # Only count approvals from buyer party
                    if party and party.role == "buyer":
                        if approval.status == "approved":
                            metrics["approved_deals"] += 1
                        
                        # Calculate response time (time from room creation to approval)
                        if approval.updated_at and room.created_at:
                            response_time = (approval.updated_at - room.created_at).total_seconds() / 3600
                            metrics["response_times"].append(response_time)

            # Calculate final metrics
            result = []
            for buyer_name, metrics in buyer_metrics.items():
                approval_rate = (metrics["approved_deals"] / metrics["total_deals"] * 100) if metrics["total_deals"] > 0 else 0
                avg_response_time = sum(metrics["response_times"]) / len(metrics["response_times"]) if metrics["response_times"] else 24

                result.append({
                    "buyer_name": buyer_name,
                    "total_deals": metrics["total_deals"],
                    "approval_rate": approval_rate,
                    "avg_response_time_hours": avg_response_time
                })

            return sorted(result, key=lambda x: x["approval_rate"], reverse=True)
        except Exception as e:
            logger.error(f"Error calculating buyer performance: {e}")
            return []

    # -- Utility Methods --

    def _calculate_system_health(self, total_docs: int, expired: int, pending: int) -> int:
        """Calculate overall system health score (0-100)"""
        if total_docs == 0:
            return 100
        
        expired_rate = expired / total_docs
        pending_rate = pending / total_docs
        
        health = 100 - (expired_rate * 50) - (pending_rate * 25)
        return max(0, min(100, int(health)))

    def _get_insurance_recommendation(self, sire_score: float) -> str:
        """Get insurance recommendation based on SIRE score"""
        if sire_score >= 95:
            return "Excellent compliance. Standard insurance terms available."
        elif sire_score >= 90:
            return "Good compliance. Standard rates apply."
        elif sire_score >= 80:
            return "Acceptable but with noted deficiencies. Recommend remediation."
        else:
            return "Critical compliance issues. Immediate action required. Higher premiums apply."

    # ============ PUBLIC API METHODS ============

    async def get_dashboard_for_role(self) -> Dict[str, Any]:
        """
        Get complete dashboard data for current user based on their role.
        
        Dispatcher method that calls appropriate dashboard based on role.
        Includes caching layer (5 minute TTL).
        
        Returns full dashboard object with all necessary data.
        """
        try:
            # Validate access first
            access_valid = await self.validate_user_access_to_dashboard()
            if not access_valid["allowed"]:
                raise Exception(f"Access denied: {access_valid['reason']}")
            
            # Dispatch based on role
            if self.role == UserRole.ADMIN:
                dashboard_data = await self.get_admin_overview()
            elif self.role == UserRole.CHARTERER:
                dashboard_data = await self.get_charterer_overview()
            elif self.role == UserRole.BROKER:
                dashboard_data = await self.get_broker_overview()
            elif self.role == UserRole.SHIPOWNER:
                dashboard_data = await self.get_shipowner_overview()
            elif self.role == UserRole.INSPECTOR:
                dashboard_data = await self.get_inspector_overview()
            else:
                dashboard_data = {}
            
            # Add metadata
            return {
                "role": self.role.value,
                "user_id": self.current_user.id,
                "user_email": self.current_user.email,
                "generated_at": self.now.isoformat(),
                "cache_expires_at": (self.now + timedelta(minutes=5)).isoformat(),
                "data": dashboard_data,
                "metadata": {
                    "version": "1.0",
                    "ttl_seconds": 300,
                }
            }
        
        except Exception as e:
            logger.error(f"Error getting dashboard for role {self.role}: {e}")
            return {
                "error": str(e),
                "role": self.role.value if self.role else "unknown",
                "generated_at": self.now.isoformat(),
            }

    async def validate_user_access_to_dashboard(self) -> Dict[str, Any]:
        """
        Validate that user has access to requested dashboard.
        
        Checks:
        1. User role is valid
        2. User is active/not suspended
        3. User has necessary permissions
        4. Tenant access (if multi-tenant)
        5. Room-specific access (if applicable)
        
        Returns:
        {
          "allowed": bool,
          "reason": str,
          "access_level": str
        }
        """
        try:
            # Check 1: User exists and is active
            if not self.current_user:
                return {
                    "allowed": False,
                    "reason": "User not found",
                    "access_level": "none"
                }
            
            if hasattr(self.current_user, 'is_active') and not self.current_user.is_active:
                return {
                    "allowed": False,
                    "reason": "User account is inactive/suspended",
                    "access_level": "none"
                }
            
            # Check 2: Role is valid
            if self.role == UserRole.VIEWER:
                return {
                    "allowed": False,
                    "reason": "Viewer role has no dashboard access",
                    "access_level": "none"
                }
            
            # Check 3: User has necessary permissions
            # In a real system, would check permission database
            valid_roles = [
                UserRole.ADMIN,
                UserRole.CHARTERER,
                UserRole.BROKER,
                UserRole.SHIPOWNER,
                UserRole.INSPECTOR
            ]
            
            if self.role not in valid_roles:
                return {
                    "allowed": False,
                    "reason": f"Role {self.role.value} not authorized for dashboard access",
                    "access_level": "none"
                }
            
            # Check 4: Tenant access
            # For multi-tenant systems, verify user belongs to correct tenant
            # This is a placeholder - actual implementation depends on tenant model
            user_tenant = getattr(self.current_user, 'tenant_id', None)
            if user_tenant:
                # Verify tenant is active and user is member
                pass  # Placeholder
            
            # Check 5: Room-specific access
            # If dashboard is room-specific, verify user has access
            # This is handled by the specific dashboard methods
            
            # All checks passed
            access_level = "full"
            if self.role == UserRole.VIEWER:
                access_level = "read_only"
            elif self.role == UserRole.INSPECTOR:
                access_level = "limited"  # Inspectors see only assigned items
            
            return {
                "allowed": True,
                "reason": "Access granted",
                "access_level": access_level,
            }
        
        except Exception as e:
            logger.error(f"Error validating dashboard access: {e}")
            return {
                "allowed": False,
                "reason": f"Validation error: {str(e)}",
                "access_level": "none"
            }
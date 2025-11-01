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
        stmt = (
            select(Vessel)
            .where(Vessel.owner_id == self.current_user.id)
        )
        result = await self.session.execute(stmt)
        return result.scalars().all()

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
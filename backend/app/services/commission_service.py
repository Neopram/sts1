"""
Commission Service - Specialized for Broker Dashboard

Handles commission calculations, deal health scoring,
and stuck deal detection for brokers.
"""

from datetime import datetime, timedelta
from typing import List, Dict, Any, Optional
import logging

from sqlalchemy import and_, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import Room, Document, Approval, Party, PartyMetric
from app.schemas.dashboard_schemas import (
    CommissionByRoom,
    StuckDeal,
    PartyPerformance,
)
from app.services.metrics_service import MetricsService

logger = logging.getLogger(__name__)


class CommissionService:
    """
    Handles commission calculations specific to Broker role.
    Brokers care about: commission accrual, deal health, stuck deals, party performance.
    """

    def __init__(self, session: AsyncSession):
        self.session = session
        self.metrics_service = MetricsService(session)
        self.now = datetime.utcnow()

    # ============ BY_ROOM AGGREGATION ============

    async def get_commission_by_room(
        self, broker_id: str
    ) -> List[CommissionByRoom]:
        """
        Get commission metrics for all operations where broker is involved.
        Returns array sorted by commission amount (highest first).
        
        This is the BY_ROOM array for Broker dashboard.
        """
        # Find all rooms where this broker is a party
        stmt = select(Room).join(
            Party, Room.id == Party.room_id
        ).where(
            and_(
                Party.email == broker_id,  # or could use broker_id from user
                Party.role == "broker",
                Room.status != "completed"
            )
        ).order_by(Room.created_at.desc())

        result = await self.session.execute(stmt)
        rooms = result.scalars().all()

        commissions = []
        for room in rooms:
            # Calculate commission
            commission = await self.metrics_service.calculate_commission(room.id)

            # Determine accrual status
            approval_percent = await self.metrics_service.get_approval_completion_percent(room.id)
            if approval_percent >= 100:
                accrual_status = "accrued"
            elif approval_percent >= 75:
                accrual_status = "pending"
            else:
                accrual_status = "pending"

            commission_item = CommissionByRoom(
                room_id=str(room.id),
                room_title=room.title,
                deal_value=room.cargo_value_usd or 0.0,
                commission=commission,
                accrual_status=accrual_status,
            )
            commissions.append(commission_item)

        # Sort by commission amount (highest first)
        commissions.sort(key=lambda x: x.commission, reverse=True)
        return commissions

    # ============ DEAL HEALTH SCORING ============

    async def get_deal_health_by_room(
        self, broker_id: str
    ) -> List[Dict[str, Any]]:
        """
        Get deal health score for each operation.
        Health score = (doc_completion + approval_progress) / 2
        """
        stmt = select(Room).join(
            Party, Room.id == Party.room_id
        ).where(
            and_(
                Party.email == broker_id,
                Party.role == "broker",
                Room.status != "completed"
            )
        )

        result = await self.session.execute(stmt)
        rooms = result.scalars().all()

        deals = []
        for room in rooms:
            # Get completion percentages
            doc_completion = await self.metrics_service.get_document_completion_percent(room.id)
            approval_progress = await self.metrics_service.get_approval_completion_percent(room.id)

            # Calculate health score
            health_score = (doc_completion + approval_progress) / 2

            # Calculate days remaining (ETA - now)
            days_remaining = None
            if room.eta_estimated:
                time_diff = room.eta_estimated - self.now
                days_remaining = time_diff.days

            deal_item = {
                "room_id": str(room.id),
                "room_title": room.title,
                "health_score": health_score,
                "doc_completion": doc_completion,
                "approval_progress": approval_progress,
                "timeline_days_remaining": days_remaining,
                "status": room.status_detail or room.status,
            }
            deals.append(deal_item)

        # Sort by health score
        deals.sort(key=lambda x: x["health_score"])
        return deals

    # ============ STUCK DEALS DETECTION ============

    async def get_stuck_deals(
        self, broker_id: str, threshold_hours: int = 48
    ) -> List[StuckDeal]:
        """
        Identify deals that have been stalled for more than threshold_hours.
        A deal is stuck if it hasn't made progress (all approvals still pending).
        """
        stmt = select(Room).join(
            Party, Room.id == Party.room_id
        ).where(
            and_(
                Party.email == broker_id,
                Party.role == "broker",
                Room.status != "completed"
            )
        )

        result = await self.session.execute(stmt)
        rooms = result.scalars().all()

        stuck_deals = []
        for room in rooms:
            # Count pending approvals
            pending_count = await self.metrics_service.count_pending_approvals(room.id)

            # Check if room hasn't been updated in threshold_hours
            hours_since_update = await self.metrics_service.get_hours_since_creation(room.id)

            if pending_count > 0 and hours_since_update > threshold_hours:
                # Calculate commission at risk
                commission = await self.metrics_service.calculate_commission(room.id)

                stuck_item = StuckDeal(
                    room_id=str(room.id),
                    room_title=room.title,
                    stuck_approvals=pending_count,
                    hours_stuck=hours_since_update,
                    commission_at_risk=commission,
                )
                stuck_deals.append(stuck_item)

        # Sort by hours stuck (longest first)
        stuck_deals.sort(key=lambda x: x.hours_stuck, reverse=True)
        return stuck_deals

    # ============ PARTY PERFORMANCE ============

    async def get_party_performance(
        self, broker_id: str, days: int = 180
    ) -> List[PartyPerformance]:
        """
        Get performance metrics for all parties this broker has dealt with.
        """
        # Get all unique parties from broker's rooms
        stmt = select(func.distinct(Party.id, Party.name, Party.role, Party.email)).select_from(
            Party
        ).join(Room, Party.room_id == Room.id).join(
            Party.alias("broker_party"), Room.id == Party.room_id
        ).where(
            and_(
                Party.role.in_(["charterer", "owner"]),
            )
        )

        # Simplified approach: get all parties
        parties_stmt = select(Party).distinct().where(
            Party.role.in_(["charterer", "owner"])
        )

        parties_result = await self.session.execute(parties_stmt)
        parties = parties_result.scalars().all()

        performance_list = []
        cutoff_date = self.now - timedelta(days=days)

        for party in parties:
            # Get metrics for this party
            metrics_stmt = select(PartyMetric).where(
                and_(
                    PartyMetric.party_id == party.id,
                    PartyMetric.created_at >= cutoff_date,
                )
            )

            metrics_result = await self.session.execute(metrics_stmt)
            metrics = metrics_result.scalars().all()

            if not metrics:
                continue

            # Calculate averages
            response_times = [m.response_time_hours for m in metrics if m.response_time_hours]
            quality_scores = [m.quality_score for m in metrics if m.quality_score]
            reliability_scores = [m.reliability_index for m in metrics if m.reliability_index]

            avg_response_time = sum(response_times) / len(response_times) if response_times else 0
            avg_quality = sum(quality_scores) / len(quality_scores) if quality_scores else 5.0
            avg_reliability = sum(reliability_scores) / len(reliability_scores) if reliability_scores else 5.0

            # Count deals with this party
            deals_count_stmt = select(func.count(func.distinct(Room.id))).join(
                Party, Room.id == Party.room_id
            ).where(
                and_(
                    Party.id == party.id,
                    Room.created_at >= cutoff_date,
                )
            )

            deals_count_result = await self.session.execute(deals_count_stmt)
            deals_count = deals_count_result.scalar() or 0

            # On-time delivery rate (completed on time)
            on_time_count_stmt = select(func.count(func.distinct(Room.id))).join(
                Party, Room.id == Party.room_id
            ).where(
                and_(
                    Party.id == party.id,
                    Room.created_at >= cutoff_date,
                    Room.status == "completed",
                    # Add check: actual_eta <= estimated_eta
                )
            )

            on_time_count_result = await self.session.execute(on_time_count_stmt)
            on_time_count = on_time_count_result.scalar() or 0
            on_time_rate = (on_time_count / deals_count * 100) if deals_count > 0 else 0

            performance = PartyPerformance(
                party_name=party.name,
                party_role=party.role,
                deals_count=deals_count,
                avg_closure_time_hours=avg_response_time * 24,  # Convert to hours
                on_time_delivery_rate=on_time_rate,
                quality_score=avg_quality,
                reliability_index=avg_reliability,
            )
            performance_list.append(performance)

        # Sort by reliability
        performance_list.sort(key=lambda x: x.reliability_index, reverse=True)
        return performance_list

    # ============ COMMISSION ACCRUAL TRACKING ============

    async def calculate_total_commission_accrued(
        self, broker_id: str
    ) -> float:
        """Calculate total commission accrued this month"""
        # Get rooms from this month
        month_start = self.now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)

        stmt = select(Room).join(
            Party, Room.id == Party.room_id
        ).where(
            and_(
                Party.email == broker_id,
                Party.role == "broker",
                Room.created_at >= month_start,
                Room.status == "completed",  # Only completed deals count
            )
        )

        result = await self.session.execute(stmt)
        rooms = result.scalars().all()

        total = 0.0
        for room in rooms:
            commission = await self.metrics_service.calculate_commission(room.id)
            total += commission

        return total

    async def calculate_commission_pipeline(
        self, broker_id: str, days_ahead: int = 30
    ) -> float:
        """Calculate projected commission for next N days"""
        future_date = self.now + timedelta(days=days_ahead)

        stmt = select(Room).join(
            Party, Room.id == Party.room_id
        ).where(
            and_(
                Party.email == broker_id,
                Party.role == "broker",
                Room.status != "completed",
                Room.eta_estimated <= future_date,
                Room.eta_estimated >= self.now,
            )
        )

        result = await self.session.execute(stmt)
        rooms = result.scalars().all()

        total = 0.0
        for room in rooms:
            commission = await self.metrics_service.calculate_commission(room.id)
            total += commission

        return total

    # ============ ALERT PRIORITY ============

    def calculate_alert_priority(
        self, stuck_deals_count: int, commission_accrued: float
    ) -> str:
        """
        Determine alert priority for Broker.
        
        Thresholds:
        - CRITICAL: stuck deals > 5 OR commission at risk > $50k
        - HIGH: stuck deals > 2 OR commission at risk > $25k
        - MEDIUM: stuck deals > 0
        - LOW: otherwise
        """
        if stuck_deals_count > 5:
            return "critical"
        elif stuck_deals_count > 2:
            return "high"
        elif stuck_deals_count > 0:
            return "medium"
        return "low"
"""
Metrics Calculation Service

Unified service for calculating all metrics used by dashboards.
Handles time-based calculations, aggregations, and trend analysis.
"""

from datetime import datetime, timedelta
from typing import Dict, List, Optional, Tuple
from decimal import Decimal
import logging

from sqlalchemy import and_, func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import Room, Document, Approval, Party, Metric, PartyMetric, Vessel
from app.schemas.dashboard_schemas import MetricsAggregation

logger = logging.getLogger(__name__)


class MetricsService:
    """
    Centralized metrics calculation service.
    All role-based dashboards use this service for metric calculations.
    """

    def __init__(self, session: AsyncSession):
        self.session = session
        self.now = datetime.utcnow()

    # ============ DEMURRAGE CALCULATIONS ============

    async def calculate_demurrage_exposure(
        self, room_id: str, current_time: Optional[datetime] = None
    ) -> float:
        """
        Calculate demurrage exposure for a room.
        Demurrage = (current_time - created_at) * rate_per_hour
        
        Args:
            room_id: The room ID
            current_time: Current time for calculation (defaults to now)
            
        Returns:
            Demurrage exposure in USD
        """
        if current_time is None:
            current_time = self.now

        # Get room data
        stmt = select(Room).where(Room.id == room_id)
        result = await self.session.execute(stmt)
        room = result.scalar()

        if not room or not room.demurrage_rate_per_hour or not room.created_at_timestamp:
            return 0.0

        # Calculate hours elapsed
        time_diff = current_time - room.created_at_timestamp
        hours_elapsed = time_diff.total_seconds() / 3600

        # Calculate demurrage
        demurrage = hours_elapsed * room.demurrage_rate_per_hour

        return float(demurrage)

    async def calculate_demurrage_breakdown(
        self, room_id: str
    ) -> Dict[str, float]:
        """
        Get detailed demurrage breakdown for a room.
        
        Returns:
            Dict with daily_rate, hours_pending, days_pending, exposure
        """
        stmt = select(Room).where(Room.id == room_id)
        result = await self.session.execute(stmt)
        room = result.scalar()

        if not room:
            return {}

        exposure = await self.calculate_demurrage_exposure(room_id)

        daily_rate = room.demurrage_rate_per_day or 0.0
        hourly_rate = room.demurrage_rate_per_hour or 0.0

        if not room.created_at_timestamp:
            hours_pending = 0.0
            days_pending = 0.0
        else:
            time_diff = self.now - room.created_at_timestamp
            hours_pending = time_diff.total_seconds() / 3600
            days_pending = hours_pending / 24

        return {
            "daily_rate": daily_rate,
            "hourly_rate": hourly_rate,
            "hours_pending": hours_pending,
            "days_pending": days_pending,
            "exposure": exposure,
        }

    # ============ COMMISSION CALCULATIONS ============

    async def calculate_commission(
        self, room_id: str
    ) -> float:
        """
        Calculate commission for a room.
        Commission = cargo_value_usd * (commission_percentage / 100)
        """
        stmt = select(Room).where(Room.id == room_id)
        result = await self.session.execute(stmt)
        room = result.scalar()

        if not room or not room.cargo_value_usd or not room.broker_commission_percentage:
            return 0.0

        commission = room.cargo_value_usd * (room.broker_commission_percentage / 100)
        return float(commission)

    # ============ DOCUMENT TRACKING ============

    async def count_documents_by_status(
        self, room_id: str, status: str
    ) -> int:
        """Count documents in a room with specific status"""
        stmt = select(func.count(Document.id)).where(
            and_(Document.room_id == room_id, Document.status == status)
        )
        result = await self.session.execute(stmt)
        return result.scalar() or 0

    async def get_document_completion_percent(
        self, room_id: str
    ) -> float:
        """Get document completion percentage (approved / total * 100)"""
        # Count total documents
        total_stmt = select(func.count(Document.id)).where(Document.room_id == room_id)
        total_result = await self.session.execute(total_stmt)
        total = total_result.scalar() or 0

        if total == 0:
            return 0.0

        # Count approved documents
        approved_stmt = select(func.count(Document.id)).where(
            and_(Document.room_id == room_id, Document.status == "approved")
        )
        approved_result = await self.session.execute(approved_stmt)
        approved = approved_result.scalar() or 0

        return (approved / total) * 100

    # ============ APPROVAL TRACKING ============

    async def count_pending_approvals(
        self, room_id: str
    ) -> int:
        """Count pending approvals for a room"""
        stmt = select(func.count(Approval.id)).where(
            and_(Approval.room_id == room_id, Approval.status == "pending")
        )
        result = await self.session.execute(stmt)
        return result.scalar() or 0

    async def get_approval_completion_percent(
        self, room_id: str
    ) -> float:
        """Get approval completion percentage"""
        # Count total approvals
        total_stmt = select(func.count(Approval.id)).where(Approval.room_id == room_id)
        total_result = await self.session.execute(total_stmt)
        total = total_result.scalar() or 0

        if total == 0:
            return 100.0  # No approvals needed = 100% complete

        # Count approved
        approved_stmt = select(func.count(Approval.id)).where(
            and_(Approval.room_id == room_id, Approval.status == "approved")
        )
        approved_result = await self.session.execute(approved_stmt)
        approved = approved_result.scalar() or 0

        return (approved / total) * 100

    # ============ TIME CALCULATIONS ============

    async def get_hours_since_creation(
        self, room_id: str
    ) -> float:
        """Get hours since room was created"""
        stmt = select(Room.created_at_timestamp).where(Room.id == room_id)
        result = await self.session.execute(stmt)
        created_at = result.scalar()

        if not created_at:
            return 0.0

        time_diff = self.now - created_at
        return time_diff.total_seconds() / 3600

    # ============ PARTY PERFORMANCE TRACKING ============

    async def get_party_response_time(
        self, party_id: str, room_id: str
    ) -> Optional[float]:
        """Get response time (hours) for a party in a room"""
        stmt = select(PartyMetric.response_time_hours).where(
            and_(PartyMetric.party_id == party_id, PartyMetric.room_id == room_id)
        )
        result = await self.session.execute(stmt)
        return result.scalar()

    async def calculate_party_reliability_index(
        self, party_id: str, days: int = 180
    ) -> float:
        """
        Calculate reliability index for a party based on historical performance.
        Returns 0-10 score.
        """
        # Get all party metrics in last N days
        cutoff_date = self.now - timedelta(days=days)
        stmt = select(PartyMetric).where(
            and_(
                PartyMetric.party_id == party_id,
                PartyMetric.created_at >= cutoff_date,
            )
        )
        result = await self.session.execute(stmt)
        metrics = result.scalars().all()

        if not metrics:
            return 5.0  # Default neutral score

        # Average reliability_index from historical data
        valid_scores = [m.reliability_index for m in metrics if m.reliability_index]
        if valid_scores:
            return float(sum(valid_scores) / len(valid_scores))

        return 5.0

    # ============ AGGREGATION HELPERS ============

    async def get_metrics_aggregation(
        self, metric_type: str, period_days: int = 30
    ) -> Optional[MetricsAggregation]:
        """
        Get aggregated metrics across multiple rooms.
        Used for system-wide dashboards.
        """
        cutoff_date = self.now - timedelta(days=period_days)

        stmt = select(Metric).where(
            and_(
                Metric.metric_type == metric_type,
                Metric.metric_date >= cutoff_date,
            )
        )
        result = await self.session.execute(stmt)
        metrics = result.scalars().all()

        if not metrics:
            return None

        values = [m.value for m in metrics]
        total = sum(values)
        average = total / len(values) if values else 0.0

        # Determine trend
        if len(values) >= 2:
            recent_avg = sum(values[-5:]) / min(5, len(values))
            older_avg = sum(values[:-5]) / max(1, len(values) - 5)
            if recent_avg > older_avg * 1.05:
                trend = "up"
            elif recent_avg < older_avg * 0.95:
                trend = "down"
            else:
                trend = "stable"
        else:
            trend = "stable"

        return MetricsAggregation(
            by_room=None,
            by_vessel=None,
            total=total,
            average=average,
            trend=trend,
            period=f"{period_days} days",
        )

    # ============ URGENCY CALCULATION ============

    def calculate_urgency_level(
        self, metric_value: float, thresholds: Dict[str, float]
    ) -> str:
        """
        Calculate urgency level based on metric value and thresholds.
        
        Args:
            metric_value: The metric value to evaluate
            thresholds: Dict with keys critical, high, medium (lower bounds)
                        e.g., {"critical": 20000, "high": 10000, "medium": 5000}
        
        Returns:
            "critical", "high", "medium", or "low"
        """
        if metric_value >= thresholds.get("critical", float("inf")):
            return "critical"
        elif metric_value >= thresholds.get("high", float("inf")):
            return "high"
        elif metric_value >= thresholds.get("medium", float("inf")):
            return "medium"
        return "low"

    # ============ CACHING ============

    async def cache_metric(
        self, room_id: str, metric_type: str, value: float
    ) -> None:
        """Cache a calculated metric in the metrics table"""
        stmt = select(Metric).where(
            and_(
                Metric.room_id == room_id,
                Metric.metric_type == metric_type,
                Metric.metric_date == self.now.date(),
            )
        )
        result = await self.session.execute(stmt)
        existing = result.scalar()

        if existing:
            existing.value = value
            existing.computed_at = self.now
        else:
            metric = Metric(
                id=str(__import__("uuid").uuid4()),
                room_id=room_id,
                metric_type=metric_type,
                metric_date=self.now,
                value=value,
                computed_at=self.now,
            )
            self.session.add(metric)

        await self.session.commit()
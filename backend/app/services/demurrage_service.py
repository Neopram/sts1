"""
Demurrage Service - Specialized for Charterer Dashboard

Handles demurrage exposure calculations, margin impact analysis,
and urgency-driven alerting for charterers.
"""

from datetime import datetime, timedelta
from typing import List, Dict, Any, Optional
import logging

from sqlalchemy import and_, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import Room, Document, Approval, Party
from app.schemas.dashboard_schemas import (
    DemurrageByRoom,
    MarginImpact,
    UrgentApproval,
    OperationsSummary,
)
from app.services.metrics_service import MetricsService

logger = logging.getLogger(__name__)


class DemurrageService:
    """
    Handles demurrage calculations specific to Charterer role.
    Charterers care about: demurrage exposure, margin impact, time pressure.
    """

    def __init__(self, session: AsyncSession):
        self.session = session
        self.metrics_service = MetricsService(session)
        self.now = datetime.utcnow()

    # ============ BY_ROOM AGGREGATION ============

    async def get_demurrage_by_room(
        self, charterer_email: str
    ) -> List[DemurrageByRoom]:
        """
        Get demurrage metrics for all operations where charterer is a party.
        Returns array sorted by exposure (highest first).
        
        This is the BY_ROOM array for Charterer dashboard.
        """
        # Find all rooms where this charterer is a party
        stmt = select(Room).join(
            Party, Room.id == Party.room_id
        ).where(
            and_(
                Party.email == charterer_email,
                Party.role == "charterer",
                Room.status != "completed"  # Only active operations
            )
        ).order_by(Room.created_at.desc())

        result = await self.session.execute(stmt)
        rooms = result.scalars().all()

        demurrages = []
        for room in rooms:
            # Calculate demurrage exposure
            exposure = await self.metrics_service.calculate_demurrage_exposure(room.id)

            # Count pending documents
            pending_docs_stmt = select(func.count(Document.id)).where(
                and_(
                    Document.room_id == room.id,
                    Document.status.in_(["missing", "under_review"])
                )
            )
            pending_docs_result = await self.session.execute(pending_docs_stmt)
            pending_docs = pending_docs_result.scalar() or 0

            # Get time elapsed
            hours_elapsed = await self.metrics_service.get_hours_since_creation(room.id)
            days_pending = hours_elapsed / 24

            demurrage_item = DemurrageByRoom(
                room_id=str(room.id),
                room_title=room.title,
                daily_rate=room.demurrage_rate_per_day or 0.0,
                days_pending=days_pending,
                exposure=exposure,
                pending_documents=pending_docs,
            )
            demurrages.append(demurrage_item)

        # Sort by exposure (highest first - most urgent)
        demurrages.sort(key=lambda x: x.exposure, reverse=True)
        return demurrages

    # ============ MARGIN IMPACT ANALYSIS ============

    async def calculate_margin_impact(
        self, charterer_email: str
    ) -> MarginImpact:
        """
        Calculate margin impact across all operations for a charterer.
        
        Returns metrics on:
        - How much margin is safe
        - How much is at risk due to delays
        - Count of delayed vs on-track operations
        """
        # Get all operations
        stmt = select(Room).join(
            Party, Room.id == Party.room_id
        ).where(
            and_(
                Party.email == charterer_email,
                Party.role == "charterer",
                Room.status != "completed"
            )
        )

        result = await self.session.execute(stmt)
        rooms = result.scalars().all()

        total_cargo_value = 0.0
        total_demurrage = 0.0
        delayed_count = 0
        on_track_count = 0

        for room in rooms:
            # Add cargo value
            if room.cargo_value_usd:
                total_cargo_value += room.cargo_value_usd

            # Add demurrage exposure
            exposure = await self.metrics_service.calculate_demurrage_exposure(room.id)
            total_demurrage += exposure

            # Check if delayed (has pending documents)
            pending_docs_stmt = select(func.count(Document.id)).where(
                and_(
                    Document.room_id == room.id,
                    Document.status.in_(["missing", "under_review"])
                )
            )
            pending_docs_result = await self.session.execute(pending_docs_stmt)
            pending_docs = pending_docs_result.scalar() or 0

            if pending_docs > 0:
                delayed_count += 1
            else:
                on_track_count += 1

        # Calculate margins
        # Assuming target margin is 2-3% of cargo value
        target_margin = total_cargo_value * 0.025  # 2.5% target
        margin_safe = max(0, target_margin - total_demurrage)
        margin_at_risk = max(0, total_demurrage - margin_safe)

        return MarginImpact(
            margin_safe=margin_safe,
            margin_at_risk=margin_at_risk,
            operations_delayed=delayed_count,
            operations_on_track=on_track_count,
        )

    # ============ URGENT APPROVALS ============

    async def get_urgent_approvals(
        self, charterer_email: str, threshold_days: float = 2.0
    ) -> List[UrgentApproval]:
        """
        Get approvals that have been pending longer than threshold.
        These are CRITICAL for Charterer as they impact demurrage.
        """
        # Find rooms for this charterer
        rooms_stmt = select(Room).join(
            Party, Room.id == Party.room_id
        ).where(
            and_(
                Party.email == charterer_email,
                Party.role == "charterer",
                Room.status != "completed"
            )
        )

        rooms_result = await self.session.execute(rooms_stmt)
        rooms = rooms_result.scalars().all()
        room_ids = [room.id for room in rooms]

        if not room_ids:
            return []

        # Find pending approvals
        approvals_stmt = select(Approval).where(
            and_(
                Approval.room_id.in_(room_ids),
                Approval.status == "pending"
            )
        )

        approvals_result = await self.session.execute(approvals_stmt)
        approvals = approvals_result.scalars().all()

        urgent_items = []
        for approval in approvals:
            # Get room info
            room = next((r for r in rooms if r.id == approval.room_id), None)
            if not room:
                continue

            # Get document info
            docs_stmt = select(Document).where(Document.room_id == approval.room_id)
            docs_result = await self.session.execute(docs_stmt)
            docs = docs_result.scalars().all()

            # Calculate days pending
            if approval.updated_at:
                days_pending = (self.now - approval.updated_at).days
            else:
                days_pending = 0

            # Only include if pending longer than threshold
            if days_pending >= threshold_days:
                urgency_level = "critical" if days_pending > 5 else ("high" if days_pending > 3 else "medium")

                urgent_item = UrgentApproval(
                    approval_id=str(approval.id),
                    document_name="Document Approval",
                    room_title=room.title,
                    days_pending=float(days_pending),
                    status=approval.status,
                    urgency=urgency_level,
                )
                urgent_items.append(urgent_item)

        # Sort by days pending (highest first)
        urgent_items.sort(key=lambda x: x.days_pending, reverse=True)
        return urgent_items

    # ============ OPERATIONS SUMMARY ============

    async def get_operations_summary(
        self, charterer_email: str
    ) -> OperationsSummary:
        """Get summary of all operations for charterer"""
        # Count total active operations
        total_stmt = select(func.count(Room.id)).join(
            Party, Room.id == Party.room_id
        ).where(
            and_(
                Party.email == charterer_email,
                Party.role == "charterer",
                Room.status != "completed"
            )
        )

        total_result = await self.session.execute(total_stmt)
        total = total_result.scalar() or 0

        # Count ACTIVE (in transfer)
        active_stmt = select(func.count(Room.id)).join(
            Party, Room.id == Party.room_id
        ).where(
            and_(
                Party.email == charterer_email,
                Party.role == "charterer",
                Room.status_detail == "active"
            )
        )

        active_result = await self.session.execute(active_stmt)
        active = active_result.scalar() or 0

        # Count pending approvals
        pending_stmt = select(func.count(Approval.id)).join(
            Room, Approval.room_id == Room.id
        ).join(
            Party, Room.id == Party.room_id
        ).where(
            and_(
                Party.email == charterer_email,
                Party.role == "charterer",
                Approval.status == "pending"
            )
        )

        pending_result = await self.session.execute(pending_stmt)
        pending_approvals = pending_result.scalar() or 0

        # Calculate completion rate (rooms with all approvals done)
        if total == 0:
            completion_rate = 100.0
        else:
            completed_stmt = select(func.count(func.distinct(Room.id))).join(
                Party, Room.id == Party.room_id
            ).join(
                Approval, Room.id == Approval.room_id
            ).where(
                and_(
                    Party.email == charterer_email,
                    Party.role == "charterer",
                    Approval.status == "approved"
                )
            )

            completed_result = await self.session.execute(completed_stmt)
            completed = completed_result.scalar() or 0
            completion_rate = (completed / total * 100) if total > 0 else 0.0

        return OperationsSummary(
            total=total,
            active=active,
            pending_approvals=pending_approvals,
            completion_rate=completion_rate,
        )

    # ============ ALERT PRIORITY ============

    def calculate_alert_priority(
        self, total_exposure: float, delayed_count: int, urgent_approvals_count: int
    ) -> str:
        """
        Determine alert priority based on demurrage exposure and delays.
        
        Thresholds:
        - CRITICAL: exposure > $20k/day OR urgent approvals > 5
        - HIGH: exposure > $10k/day OR delayed operations > 3
        - MEDIUM: exposure > $5k/day OR delayed operations > 0
        - LOW: otherwise
        """
        if total_exposure > 20000 or urgent_approvals_count > 5:
            return "critical"
        elif total_exposure > 10000 or delayed_count > 3:
            return "high"
        elif total_exposure > 5000 or delayed_count > 0:
            return "medium"
        return "low"
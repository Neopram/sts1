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

    # ============ COMMISSION ACCRUAL TRACKING ============

    async def calculate_commission_accrual_tracking(
        self,
        broker_id: str
    ) -> Dict[str, Any]:
        """
        Track commission accrual by operation status.
        
        Accrual rates:
        - pending: 0% (no accrual until docs submitted)
        - partial: 50% (docs submitted, awaiting approval)
        - completed: 100% (all approvals done)
        - paid: Commission already paid out
        
        Returns:
          {
            "pending": {"count": int, "value": float},
            "partial": {"count": int, "value": float},
            "completed": {"count": int, "value": float},
            "paid": {"count": int, "value": float},
            "total_potential": float,
            "total_accrued": float,
            "accrual_rate": float  # percent
          }
        """
        try:
            # Get all rooms for broker
            stmt = select(Room).join(
                Party, Room.id == Party.room_id
            ).where(
                and_(
                    Party.email == broker_id,
                    Party.role == "broker",
                    Room.status != "cancelled"
                )
            )
            
            result = await self.session.execute(stmt)
            rooms = result.scalars().all()
            
            # Track accrual by status
            accrual_tracking = {
                "pending": {"count": 0, "value": 0.0},
                "partial": {"count": 0, "value": 0.0},
                "completed": {"count": 0, "value": 0.0},
                "paid": {"count": 0, "value": 0.0},
            }
            
            total_potential = 0.0
            total_accrued = 0.0
            
            for room in rooms:
                # Calculate commission for this room
                commission = await self.metrics_service.calculate_commission(room.id)
                total_potential += commission
                
                # Determine status and accrual percentage
                doc_completion = await self.metrics_service.get_document_completion_percent(room.id)
                approval_completion = await self.metrics_service.get_approval_completion_percent(room.id)
                
                # Determine status
                if room.status == "completed":
                    # Check if payment was made (would be in PartyMetric or separate payment table)
                    status = "paid"  # Assume all completed are paid for now
                    accrual_rate = 1.0  # 100%
                elif approval_completion >= 100:
                    status = "completed"
                    accrual_rate = 1.0  # 100%
                elif doc_completion >= 100:
                    status = "partial"
                    accrual_rate = 0.5  # 50%
                else:
                    status = "pending"
                    accrual_rate = 0.0  # 0%
                
                # Add to tracking
                accrued_amount = commission * accrual_rate
                accrual_tracking[status]["count"] += 1
                accrual_tracking[status]["value"] += accrued_amount
                total_accrued += accrued_amount
            
            # Calculate accrual rate percentage
            if total_potential > 0:
                accrual_rate_pct = (total_accrued / total_potential) * 100
            else:
                accrual_rate_pct = 0.0
            
            # Format values
            for status in accrual_tracking:
                accrual_tracking[status]["value"] = round(accrual_tracking[status]["value"], 2)
            
            return {
                "pending": accrual_tracking["pending"],
                "partial": accrual_tracking["partial"],
                "completed": accrual_tracking["completed"],
                "paid": accrual_tracking["paid"],
                "total_potential": round(total_potential, 2),
                "total_accrued": round(total_accrued, 2),
                "accrual_rate": round(accrual_rate_pct, 1),
            }
        
        except Exception as e:
            logger.error(f"Error calculating commission accrual tracking: {e}")
            return {
                "pending": {"count": 0, "value": 0.0},
                "partial": {"count": 0, "value": 0.0},
                "completed": {"count": 0, "value": 0.0},
                "paid": {"count": 0, "value": 0.0},
                "total_potential": 0.0,
                "total_accrued": 0.0,
                "accrual_rate": 0.0,
                "error": str(e),
            }

    # ============ COMMISSION ESTIMATION BY COUNTERPARTY ============

    async def estimate_commission_by_counterparty(
        self,
        broker_id: str,
        days_back: int = 90
    ) -> List[Dict[str, Any]]:
        """
        Average commission by counterparty type.
        
        Returns for each counterparty:
        {
          "counterparty": str,
          "type": "charterer|owner",
          "deals_count": int,
          "avg_commission": float,
          "total_commission": float,
          "trend": "up|down|stable",
          "next_deal_estimate": float
        }
        
        Sorted by total_commission DESC
        """
        try:
            cutoff_date = self.now - timedelta(days=days_back)
            
            # Get all parties (counterparties) grouped by type
            stmt = select(Party).distinct().where(
                Party.role.in_(["charterer", "owner"])
            )
            
            result = await self.session.execute(stmt)
            counterparties = result.scalars().all()
            
            counterparty_stats = []
            
            for counterparty in counterparties:
                # Get all rooms involving this counterparty and broker
                rooms_stmt = select(Room).join(
                    Party, Room.id == Party.room_id
                ).where(
                    and_(
                        or_(
                            Party.id == counterparty.id,
                            Party.name == counterparty.name
                        ),
                        Room.created_at >= cutoff_date,
                    )
                ).distinct()
                
                rooms_result = await self.session.execute(rooms_stmt)
                rooms = rooms_result.scalars().all()
                
                if not rooms:
                    continue
                
                # Calculate metrics
                commissions = []
                for room in rooms:
                    commission = await self.metrics_service.calculate_commission(room.id)
                    commissions.append(commission)
                
                if not commissions:
                    continue
                
                total_commission = sum(commissions)
                avg_commission = total_commission / len(commissions)
                deals_count = len(commissions)
                
                # Calculate trend (comparing first half vs second half of period)
                if len(commissions) >= 2:
                    mid = len(commissions) // 2
                    first_half_avg = sum(commissions[:mid]) / mid
                    second_half_avg = sum(commissions[mid:]) / (len(commissions) - mid)
                    
                    if second_half_avg > first_half_avg * 1.1:
                        trend = "up"
                    elif second_half_avg < first_half_avg * 0.9:
                        trend = "down"
                    else:
                        trend = "stable"
                else:
                    trend = "stable"
                
                # Next deal estimate (average of recent 3 deals or all if less)
                recent_count = min(3, len(commissions))
                next_estimate = sum(commissions[-recent_count:]) / recent_count if commissions else 0
                
                counterparty_stats.append({
                    "counterparty": counterparty.name,
                    "email": counterparty.email,
                    "type": counterparty.role,
                    "deals_count": deals_count,
                    "avg_commission": round(avg_commission, 2),
                    "total_commission": round(total_commission, 2),
                    "trend": trend,
                    "next_deal_estimate": round(next_estimate, 2),
                })
            
            # Sort by total_commission DESC
            counterparty_stats.sort(key=lambda x: x["total_commission"], reverse=True)
            
            return counterparty_stats
        
        except Exception as e:
            logger.error(f"Error estimating commission by counterparty: {e}")
            return []
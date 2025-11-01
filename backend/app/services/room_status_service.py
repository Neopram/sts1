"""
Room Status Service - Manages room status transitions and timeline phases

Handles state transitions for STS operations, validates transitions by role,
and automatically calculates timeline phases based on operation state.
"""

from datetime import datetime, timedelta
from typing import List, Dict, Any, Optional, Set
import logging

from sqlalchemy import and_, select, update, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import Room, Document, Approval, Party, ActivityLog
from app.services.audit_service import AuditService

logger = logging.getLogger(__name__)


class RoomStatusService:
    """
    Manages room status transitions and timeline phase calculations.
    Provides role-based validation for state changes.
    """

    # Valid status values
    STATUS_PENDING = "pending"
    STATUS_READY = "ready"
    STATUS_ACTIVE = "active"
    STATUS_COMPLETED = "completed"
    STATUS_CANCELLED = "cancelled"
    STATUS_ON_HOLD = "on_hold"

    # Timeline phases
    PHASE_PRE_DOCS = "pre_docs"  # Before documents uploaded
    PHASE_DOCS_PENDING = "docs_pending"  # Documents uploaded, pending approvals
    PHASE_READY = "ready"  # All documents approved, ready to start
    PHASE_ACTIVE = "active"  # Operation in progress
    PHASE_COMPLETED = "completed"  # Operation finished
    PHASE_CANCELLED = "cancelled"  # Operation cancelled

    # Status transition matrix: {current_status: [allowed_next_statuses]}
    STATUS_TRANSITIONS = {
        STATUS_PENDING: [STATUS_READY, STATUS_ACTIVE, STATUS_CANCELLED],
        STATUS_READY: [STATUS_ACTIVE, STATUS_CANCELLED],
        STATUS_ACTIVE: [STATUS_COMPLETED, STATUS_ON_HOLD],
        STATUS_ON_HOLD: [STATUS_ACTIVE, STATUS_CANCELLED],
        STATUS_COMPLETED: [],  # Terminal state
        STATUS_CANCELLED: [],  # Terminal state
    }

    # Role-based permissions for transitions
    # Format: {role: {transition: allowed}}
    ROLE_PERMISSIONS = {
        "admin": {
            "all": True,  # Admin can do everything
        },
        "charterer": {
            "pending_to_ready": True,
            "ready_to_active": True,
            "active_to_completed": True,
        },
        "owner": {
            "pending_to_ready": True,
            "ready_to_active": True,
            "active_to_completed": True,
        },
        "broker": {
            "pending_to_ready": True,
            "ready_to_active": True,
        },
        "viewer": {
            "all": False,  # Viewers cannot make transitions
        },
    }

    def __init__(self, session: AsyncSession):
        self.session = session
        self.audit_service = AuditService(session)

    # ============ STATUS TRANSITIONS ============

    async def transition_room_status(
        self,
        room_id: str,
        new_status: str,
        user_email: str,
        user_role: str,
        reason: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        Transition a room to a new status with role-based validation.

        Args:
            room_id: Room ID to transition
            new_status: Target status
            user_email: Email of user making the transition
            user_role: Role of user making the transition
            reason: Optional reason for the transition

        Returns:
            Dict with transition result and updated room data

        Raises:
            ValueError: If transition is not allowed
        """
        # Get current room
        stmt = select(Room).where(Room.id == room_id)
        result = await self.session.execute(stmt)
        room = result.scalar_one_or_none()

        if not room:
            raise ValueError(f"Room {room_id} not found")

        current_status = room.status or self.STATUS_PENDING

        # Validate transition
        if not await self.validate_transition(
            current_status, new_status, user_role
        ):
            raise ValueError(
                f"Transition from {current_status} to {new_status} "
                f"is not allowed for role {user_role}"
            )

        # Update room status
        update_stmt = (
            update(Room)
            .where(Room.id == room_id)
            .values(
                status=new_status,
                status_detail=new_status,
                updated_at=datetime.utcnow(),
            )
        )
        await self.session.execute(update_stmt)

        # Recalculate timeline phase
        timeline_phase = await self.calculate_timeline_phase(room_id)
        if timeline_phase:
            update_stmt = (
                update(Room)
                .where(Room.id == room_id)
                .values(timeline_phase=timeline_phase)
            )
            await self.session.execute(update_stmt)

        # Log activity
        await self.audit_service.log_activity(
            room_id=room_id,
            user_email=user_email,
            activity_type="status_change",
            description=f"Room status changed from {current_status} to {new_status}",
            metadata={
                "old_status": current_status,
                "new_status": new_status,
                "reason": reason,
                "user_role": user_role,
            },
        )

        # Refresh room
        await self.session.refresh(room)

        logger.info(
            f"Room {room_id} status transitioned from {current_status} to {new_status} by {user_email}"
        )

        return {
            "success": True,
            "room_id": room_id,
            "old_status": current_status,
            "new_status": new_status,
            "timeline_phase": timeline_phase,
            "updated_at": datetime.utcnow().isoformat(),
        }

    async def validate_transition(
        self, current_status: str, new_status: str, user_role: str
    ) -> bool:
        """
        Validate if a status transition is allowed for a given role.

        Args:
            current_status: Current room status
            new_status: Desired new status
            user_role: Role of user attempting transition

        Returns:
            True if transition is allowed, False otherwise
        """
        # Check if transition is in allowed transitions
        allowed_next = self.STATUS_TRANSITIONS.get(current_status, [])
        if new_status not in allowed_next:
            logger.warning(
                f"Transition from {current_status} to {new_status} not in allowed list"
            )
            return False

        # Check role permissions
        if user_role == "admin":
            return True  # Admin can do everything

        if user_role == "viewer":
            return False  # Viewers cannot make transitions

        # Build transition key
        transition_key = f"{current_status}_to_{new_status}"

        # Check role-specific permissions
        role_perms = self.ROLE_PERMISSIONS.get(user_role, {})
        if "all" in role_perms:
            return role_perms["all"]

        return role_perms.get(transition_key, False)

    async def get_allowed_transitions(
        self, room_id: str, user_role: str
    ) -> List[str]:
        """
        Get list of allowed status transitions for a room based on user role.

        Args:
            room_id: Room ID
            user_role: Role of user

        Returns:
            List of allowed next statuses
        """
        stmt = select(Room).where(Room.id == room_id)
        result = await self.session.execute(stmt)
        room = result.scalar_one_or_none()

        if not room:
            return []

        current_status = room.status or self.STATUS_PENDING

        # Get all possible transitions
        all_allowed = self.STATUS_TRANSITIONS.get(current_status, [])

        # Filter by role permissions
        if user_role == "admin":
            return all_allowed

        if user_role == "viewer":
            return []

        allowed = []
        for next_status in all_allowed:
            if await self.validate_transition(current_status, next_status, user_role):
                allowed.append(next_status)

        return allowed

    # ============ TIMELINE PHASE CALCULATION ============

    async def calculate_timeline_phase(self, room_id: str) -> Optional[str]:
        """
        Calculate timeline phase based on room state, documents, and approvals.

        Args:
            room_id: Room ID

        Returns:
            Timeline phase string or None
        """
        stmt = select(Room).where(Room.id == room_id)
        result = await self.session.execute(stmt)
        room = result.scalar_one_or_none()

        if not room:
            return None

        status = room.status or self.STATUS_PENDING

        # Terminal states
        if status == self.STATUS_COMPLETED:
            return self.PHASE_COMPLETED
        if status == self.STATUS_CANCELLED:
            return self.PHASE_CANCELLED

        # Check document status
        docs_stmt = select(func.count(Document.id)).where(
            Document.room_id == room_id
        )
        docs_result = await self.session.execute(docs_stmt)
        total_docs = docs_result.scalar() or 0

        if total_docs == 0:
            return self.PHASE_PRE_DOCS

        # Check if all documents are approved
        pending_docs_stmt = select(func.count(Document.id)).where(
            and_(
                Document.room_id == room_id,
                Document.status.in_(["missing", "under_review"])
            )
        )
        pending_docs_result = await self.session.execute(pending_docs_stmt)
        pending_docs = pending_docs_result.scalar() or 0

        if pending_docs > 0:
            return self.PHASE_DOCS_PENDING

        # All documents approved
        if status == self.STATUS_READY:
            return self.PHASE_READY

        if status == self.STATUS_ACTIVE:
            return self.PHASE_ACTIVE

        # Default to docs_pending if we have documents but not all approved
        return self.PHASE_DOCS_PENDING

    # ============ AUTO-TRANSITION ON CONDITIONS ============

    async def auto_transition_on_condition(
        self, room_id: str
    ) -> Optional[Dict[str, Any]]:
        """
        Automatically transition room status based on conditions.

        Conditions:
        - If all documents approved and status is pending/ready -> ready
        - If operation started (has actual ETA) -> active
        - If operation completed (has completion data) -> completed

        Args:
            room_id: Room ID

        Returns:
            Dict with transition result or None if no transition occurred
        """
        stmt = select(Room).where(Room.id == room_id)
        result = await self.session.execute(stmt)
        room = result.scalar_one_or_none()

        if not room:
            return None

        current_status = room.status or self.STATUS_PENDING

        # Check if all documents are approved
        if current_status in [self.STATUS_PENDING]:
            # Count pending documents
            pending_docs_stmt = select(func.count(Document.id)).where(
                and_(
                    Document.room_id == room_id,
                    Document.status.in_(["missing", "under_review"])
                )
            )
            pending_docs_result = await self.session.execute(pending_docs_stmt)
            pending_docs = pending_docs_result.scalar() or 0

            if pending_docs == 0:
                # All documents approved, transition to ready
                return await self.transition_room_status(
                    room_id=room_id,
                    new_status=self.STATUS_READY,
                    user_email="system",
                    user_role="admin",
                    reason="Auto-transition: All documents approved",
                )

        # Check if operation has actual ETA and should be active
        if current_status == self.STATUS_READY and room.eta_actual:
            if room.eta_actual <= datetime.utcnow():
                return await self.transition_room_status(
                    room_id=room_id,
                    new_status=self.STATUS_ACTIVE,
                    user_email="system",
                    user_role="admin",
                    reason="Auto-transition: Operation started (ETA reached)",
                )

        return None

    # ============ ROOM STATUS HELPERS ============

    async def get_room_status_info(self, room_id: str) -> Dict[str, Any]:
        """
        Get comprehensive status information for a room.

        Args:
            room_id: Room ID

        Returns:
            Dict with status details, allowed transitions, timeline phase
        """
        stmt = select(Room).where(Room.id == room_id)
        result = await self.session.execute(stmt)
        room = result.scalar_one_or_none()

        if not room:
            raise ValueError(f"Room {room_id} not found")

        # Get document counts
        total_docs_stmt = select(func.count(Document.id)).where(
            Document.room_id == room_id
        )
        total_docs_result = await self.session.execute(total_docs_stmt)
        total_docs = total_docs_result.scalar() or 0

        pending_docs_stmt = select(func.count(Document.id)).where(
            and_(
                Document.room_id == room_id,
                Document.status.in_(["missing", "under_review"])
            )
        )
        pending_docs_result = await self.session.execute(pending_docs_stmt)
        pending_docs = pending_docs_result.scalar() or 0

        # Calculate timeline phase
        timeline_phase = await self.calculate_timeline_phase(room_id)

        return {
            "room_id": room_id,
            "status": room.status or self.STATUS_PENDING,
            "status_detail": room.status_detail,
            "timeline_phase": timeline_phase,
            "total_documents": total_docs,
            "pending_documents": pending_docs,
            "created_at": room.created_at.isoformat() if room.created_at else None,
            "updated_at": room.updated_at.isoformat() if room.updated_at else None,
        }


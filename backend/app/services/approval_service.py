"""
Approval Service - Manages multi-step approval workflows

Handles creation of approval workflows, step-by-step approvals,
and tracking workflow completion status.
"""

from datetime import datetime
from typing import List, Dict, Any, Optional
import logging

from sqlalchemy import and_, select, update, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import (
    ApprovalWorkflow,
    Room,
    Document,
    Approval,
    Party,
    ActivityLog,
)
from app.services.audit_service import AuditService
from app.services.notification_service import NotificationService

logger = logging.getLogger(__name__)


class ApprovalService:
    """
    Manages multi-step approval workflows for operations, documents, and mutual signoffs.
    """

    WORKFLOW_TYPE_DOCUMENT = "document"
    WORKFLOW_TYPE_OPERATION = "operation"
    WORKFLOW_TYPE_MUTUAL_SIGNOFF = "mutual_signoff"

    STATUS_PENDING = "pending"
    STATUS_APPROVED = "approved"
    STATUS_REJECTED = "rejected"

    def __init__(self, session: AsyncSession):
        self.session = session
        self.audit_service = AuditService(session)
        self.notification_service = NotificationService(session)

    # ============ WORKFLOW CREATION ============

    async def create_approval_workflow(
        self,
        room_id: str,
        workflow_type: str,
        total_steps: int,
        document_id: Optional[str] = None,
        approvers: Optional[List[Dict[str, Any]]] = None,
    ) -> Dict[str, Any]:
        """
        Create a new multi-step approval workflow.

        Args:
            room_id: Room ID
            workflow_type: Type of workflow (document/operation/mutual_signoff)
            total_steps: Total number of approval steps
            document_id: Optional document ID (for document workflows)
            approvers: Optional list of approvers per step

        Returns:
            Dict with workflow data
        """
        # Verify room exists
        room_stmt = select(Room).where(Room.id == room_id)
        room_result = await self.session.execute(room_stmt)
        room = room_result.scalar_one_or_none()

        if not room:
            raise ValueError(f"Room {room_id} not found")

        # Verify document exists if provided
        if document_id:
            doc_stmt = select(Document).where(Document.id == document_id)
            doc_result = await self.session.execute(doc_stmt)
            document = doc_result.scalar_one_or_none()

            if not document:
                raise ValueError(f"Document {document_id} not found")

        # Create workflow
        workflow = ApprovalWorkflow(
            room_id=room_id,
            document_id=document_id,
            workflow_type=workflow_type,
            status=self.STATUS_PENDING,
            current_step=1,
            total_steps=total_steps,
        )

        self.session.add(workflow)
        await self.session.commit()
        await self.session.refresh(workflow)

        # Create initial approval records for first step
        if approvers:
            for approver in approvers:
                # Find party by email or role
                party_stmt = select(Party).where(
                    and_(
                        Party.room_id == room_id,
                        Party.email == approver.get("email")
                    )
                )
                party_result = await self.session.execute(party_stmt)
                party = party_result.scalar_one_or_none()

                if party:
                    approval = Approval(
                        room_id=room_id,
                        party_id=party.id,
                        status=self.STATUS_PENDING,
                    )
                    self.session.add(approval)

            await self.session.commit()

        logger.info(
            f"Created approval workflow {workflow.id} for room {room_id}, type {workflow_type}"
        )

        return {
            "workflow_id": str(workflow.id),
            "room_id": room_id,
            "document_id": document_id,
            "workflow_type": workflow_type,
            "status": workflow.status,
            "current_step": workflow.current_step,
            "total_steps": workflow.total_steps,
            "created_at": workflow.created_at.isoformat() if workflow.created_at else None,
        }

    # ============ WORKFLOW STEPS ============

    async def get_workflow_steps(
        self, workflow_id: str
    ) -> List[Dict[str, Any]]:
        """
        Get all steps in an approval workflow with their status.

        Args:
            workflow_id: Workflow ID

        Returns:
            List of workflow steps with approval status
        """
        workflow_stmt = select(ApprovalWorkflow).where(
            ApprovalWorkflow.id == workflow_id
        )
        workflow_result = await self.session.execute(workflow_stmt)
        workflow = workflow_result.scalar_one_or_none()

        if not workflow:
            raise ValueError(f"Workflow {workflow_id} not found")

        # Get all approvals for this room/workflow
        approvals_stmt = select(Approval).where(Approval.room_id == workflow.room_id)
        approvals_result = await self.session.execute(approvals_stmt)
        approvals = approvals_result.scalars().all()

        # Build steps list
        steps = []
        for step_num in range(1, (workflow.total_steps or 1) + 1):
            step_status = "pending"
            if step_num < workflow.current_step:
                step_status = "approved"
            elif step_num == workflow.current_step:
                # Check if current step approvals are complete
                step_approvals = [
                    a for a in approvals if a.status == self.STATUS_APPROVED
                ]
                if len(step_approvals) > 0:
                    step_status = "in_progress"

            steps.append({
                "step_number": step_num,
                "status": step_status,
                "is_current": step_num == workflow.current_step,
                "is_completed": step_num < workflow.current_step,
            })

        return steps

    async def get_workflow_info(
        self, workflow_id: str
    ) -> Dict[str, Any]:
        """
        Get comprehensive workflow information.

        Args:
            workflow_id: Workflow ID

        Returns:
            Dict with workflow details
        """
        workflow_stmt = select(ApprovalWorkflow).where(
            ApprovalWorkflow.id == workflow_id
        )
        workflow_result = await self.session.execute(workflow_stmt)
        workflow = workflow_result.scalar_one_or_none()

        if not workflow:
            raise ValueError(f"Workflow {workflow_id} not found")

        steps = await self.get_workflow_steps(workflow_id)
        all_approved = await self.check_all_approvals_complete(workflow_id)

        return {
            "workflow_id": str(workflow.id),
            "room_id": str(workflow.room_id),
            "document_id": str(workflow.document_id) if workflow.document_id else None,
            "workflow_type": workflow.workflow_type,
            "status": workflow.status,
            "current_step": workflow.current_step,
            "total_steps": workflow.total_steps,
            "steps": steps,
            "all_approved": all_approved,
            "created_at": workflow.created_at.isoformat() if workflow.created_at else None,
            "completed_at": workflow.completed_at.isoformat() if workflow.completed_at else None,
        }

    # ============ STEP APPROVAL ============

    async def approve_step(
        self,
        workflow_id: str,
        step_id: int,
        user_email: str,
        user_role: str,
        comments: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        Approve a specific step in the workflow.

        Args:
            workflow_id: Workflow ID
            step_id: Step number to approve
            user_email: Email of user approving
            user_role: Role of user
            comments: Optional comments

        Returns:
            Dict with approval result
        """
        workflow_stmt = select(ApprovalWorkflow).where(
            ApprovalWorkflow.id == workflow_id
        )
        workflow_result = await self.session.execute(workflow_stmt)
        workflow = workflow_result.scalar_one_or_none()

        if not workflow:
            raise ValueError(f"Workflow {workflow_id} not found")

        # Validate step
        if step_id < 1 or step_id > (workflow.total_steps or 1):
            raise ValueError(f"Invalid step number: {step_id}")

        if step_id != workflow.current_step:
            raise ValueError(
                f"Step {step_id} is not the current step ({workflow.current_step})"
            )

        # Find party for user
        party_stmt = select(Party).where(
            and_(
                Party.room_id == workflow.room_id,
                Party.email == user_email
            )
        )
        party_result = await self.session.execute(party_stmt)
        party = party_result.scalar_one_or_none()

        if not party:
            raise ValueError(f"User {user_email} is not a party in this room")

        # Find or create approval
        approval_stmt = select(Approval).where(
            and_(
                Approval.room_id == workflow.room_id,
                Approval.party_id == party.id,
                Approval.status == self.STATUS_PENDING
            )
        )
        approval_result = await self.session.execute(approval_stmt)
        approval = approval_result.scalar_one_or_none()

        if not approval:
            # Create new approval
            approval = Approval(
                room_id=workflow.room_id,
                party_id=party.id,
                status=self.STATUS_PENDING,
            )
            self.session.add(approval)
            await self.session.flush()

        # Update approval status
        approval.status = self.STATUS_APPROVED
        approval.updated_at = datetime.utcnow()
        await self.session.commit()

        # Check if all approvals for this step are complete
        pending_approvals_stmt = select(func.count(Approval.id)).where(
            and_(
                Approval.room_id == workflow.room_id,
                Approval.status == self.STATUS_PENDING
            )
        )
        pending_result = await self.session.execute(pending_approvals_stmt)
        pending_count = pending_result.scalar() or 0

        # If all approvals for current step are done, advance workflow
        if pending_count == 0:
            if workflow.current_step < (workflow.total_steps or 1):
                # Advance to next step
                workflow.current_step += 1
            else:
                # All steps completed
                workflow.status = self.STATUS_APPROVED
                workflow.completed_at = datetime.utcnow()

            await self.session.commit()

        # Log activity
        await self.audit_service.log_activity(
            room_id=str(workflow.room_id),
            user_email=user_email,
            activity_type="approval_step_approved",
            description=f"Approved step {step_id} of workflow {workflow_id}",
            metadata={
                "workflow_id": str(workflow.id),
                "step_id": step_id,
                "comments": comments,
                "user_role": user_role,
            },
        )

        logger.info(
            f"Step {step_id} approved for workflow {workflow_id} by {user_email}"
        )

        return {
            "success": True,
            "workflow_id": str(workflow.id),
            "step_id": step_id,
            "current_step": workflow.current_step,
            "status": workflow.status,
            "all_steps_complete": workflow.status == self.STATUS_APPROVED,
        }

    async def reject_step(
        self,
        workflow_id: str,
        step_id: int,
        user_email: str,
        user_role: str,
        reason: str,
    ) -> Dict[str, Any]:
        """
        Reject a specific step in the workflow.

        Args:
            workflow_id: Workflow ID
            step_id: Step number to reject
            user_email: Email of user rejecting
            user_role: Role of user
            reason: Reason for rejection

        Returns:
            Dict with rejection result
        """
        workflow_stmt = select(ApprovalWorkflow).where(
            ApprovalWorkflow.id == workflow_id
        )
        workflow_result = await self.session.execute(workflow_stmt)
        workflow = workflow_result.scalar_one_or_none()

        if not workflow:
            raise ValueError(f"Workflow {workflow_id} not found")

        # Validate step
        if step_id != workflow.current_step:
            raise ValueError(
                f"Step {step_id} is not the current step ({workflow.current_step})"
            )

        # Find party for user
        party_stmt = select(Party).where(
            and_(
                Party.room_id == workflow.room_id,
                Party.email == user_email
            )
        )
        party_result = await self.session.execute(party_stmt)
        party = party_result.scalar_one_or_none()

        if not party:
            raise ValueError(f"User {user_email} is not a party in this room")

        # Update workflow status to rejected
        workflow.status = self.STATUS_REJECTED
        workflow.completed_at = datetime.utcnow()

        # Update approval status
        approval_stmt = select(Approval).where(
            and_(
                Approval.room_id == workflow.room_id,
                Approval.party_id == party.id
            )
        )
        approval_result = await self.session.execute(approval_stmt)
        approval = approval_result.scalar_one_or_none()

        if approval:
            approval.status = self.STATUS_REJECTED
            approval.updated_at = datetime.utcnow()

        await self.session.commit()

        # Log activity
        await self.audit_service.log_activity(
            room_id=str(workflow.room_id),
            user_email=user_email,
            activity_type="approval_step_rejected",
            description=f"Rejected step {step_id} of workflow {workflow_id}",
            metadata={
                "workflow_id": str(workflow.id),
                "step_id": step_id,
                "reason": reason,
                "user_role": user_role,
            },
        )

        logger.info(
            f"Step {step_id} rejected for workflow {workflow_id} by {user_email}: {reason}"
        )

        return {
            "success": True,
            "workflow_id": str(workflow.id),
            "step_id": step_id,
            "status": workflow.status,
            "reason": reason,
        }

    # ============ WORKFLOW COMPLETION ============

    async def check_all_approvals_complete(self, workflow_id: str) -> bool:
        """
        Check if all approvals in a workflow are complete.

        Args:
            workflow_id: Workflow ID

        Returns:
            True if all approvals are complete, False otherwise
        """
        workflow_stmt = select(ApprovalWorkflow).where(
            ApprovalWorkflow.id == workflow_id
        )
        workflow_result = await self.session.execute(workflow_stmt)
        workflow = workflow_result.scalar_one_or_none()

        if not workflow:
            return False

        return workflow.status == self.STATUS_APPROVED

    async def get_workflows_by_room(
        self, room_id: str, status: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        """
        Get all workflows for a room.

        Args:
            room_id: Room ID
            status: Optional status filter

        Returns:
            List of workflow data
        """
        stmt = select(ApprovalWorkflow).where(
            ApprovalWorkflow.room_id == room_id
        )

        if status:
            stmt = stmt.where(ApprovalWorkflow.status == status)

        result = await self.session.execute(stmt)
        workflows = result.scalars().all()

        return [
            {
                "workflow_id": str(w.id),
                "room_id": str(w.room_id),
                "document_id": str(w.document_id) if w.document_id else None,
                "workflow_type": w.workflow_type,
                "status": w.status,
                "current_step": w.current_step,
                "total_steps": w.total_steps,
                "created_at": w.created_at.isoformat() if w.created_at else None,
                "completed_at": w.completed_at.isoformat() if w.completed_at else None,
            }
            for w in workflows
        ]


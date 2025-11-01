"""
STS OPERATION SERVICE - PHASE 1
================================
Core business logic for STS operations.

Handles:
- Operation creation (multi-step wizard)
- Participant management
- Vessel assignment
- STS code generation
- Email notifications
"""

import logging
import uuid
from datetime import datetime, timedelta
from typing import List, Dict, Optional, Any
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_

from app.models.sts_operations import (
    StsOperationSession,
    OperationParticipant,
    OperationVessel,
    StsOperationCode,
)

logger = logging.getLogger(__name__)


class StsOperationService:
    """Service for managing STS operations"""

    def __init__(self, session: AsyncSession):
        self.session = session

    async def create_operation_draft(
        self,
        title: str,
        location: str,
        scheduled_start_date: datetime,
        scheduled_end_date: Optional[datetime] = None,
        region: Optional[str] = None,
        created_by: Optional[str] = None,
        q88_enabled: bool = False,
        q88_operation_id: Optional[str] = None,
    ) -> StsOperationSession:
        """
        Create a new STS operation in DRAFT status.
        
        Step 1 of multi-step wizard:
        - Basic operation information
        - Date ranges
        - Location
        """
        try:
            # Generate STS Operation Code
            operation_code = await self._generate_operation_code()

            operation = StsOperationSession(
                title=title,
                location=location,
                region=region or self._extract_region(location),
                scheduled_start_date=scheduled_start_date,
                scheduled_end_date=scheduled_end_date,
                sts_operation_code=operation_code,
                created_by=created_by,
                q88_enabled=q88_enabled,
                q88_operation_id=q88_operation_id,
                status="draft",
            )

            self.session.add(operation)
            await self.session.flush()

            logger.info(f"Created STS operation draft: {operation.id} (code: {operation_code})")
            return operation

        except Exception as e:
            logger.error(f"Error creating operation draft: {e}", exc_info=True)
            raise

    async def add_participant(
        self,
        operation_id: str,
        participant_type: str,
        role: str,
        name: str,
        email: str,
        organization: Optional[str] = None,
        phone: Optional[str] = None,
        position: Optional[str] = None,
    ) -> OperationParticipant:
        """
        Add a participant to the operation.
        
        Step 2-4 of wizard:
        - Trading company staff
        - Broker staff
        - Shipowner staff
        
        Supports multiple participants per operation.
        """
        try:
            # Verify operation exists
            operation = await self._get_operation(operation_id)
            if not operation:
                raise ValueError(f"Operation {operation_id} not found")

            participant = OperationParticipant(
                operation_id=operation_id,
                participant_type=participant_type,
                role=role,
                name=name,
                email=email,
                organization=organization,
                phone=phone,
                position=position,
                status="invited",
                invitation_sent_at=datetime.utcnow(),
            )

            self.session.add(participant)
            await self.session.flush()

            logger.info(
                f"Added participant to operation {operation_id}: {email} ({role})"
            )
            return participant

        except Exception as e:
            logger.error(f"Error adding participant: {e}", exc_info=True)
            raise

    async def add_vessel(
        self,
        operation_id: str,
        vessel_name: str,
        vessel_imo: str,
        vessel_role: str,
        assigned_to_party: str,
        assigned_to_email: Optional[str] = None,
        mmsi: Optional[str] = None,
        vessel_type: Optional[str] = None,
        flag: Optional[str] = None,
        gross_tonnage: Optional[float] = None,
        vessel_id: Optional[str] = None,
        documents_required: Optional[Dict[str, str]] = None,
    ) -> OperationVessel:
        """
        Add a vessel to the operation.
        
        Step 5 of wizard:
        - Mother vessels (assigned to trading company)
        - Daughter vessels (assigned to shipowner)
        
        Also stores document requirements for the vessel.
        """
        try:
            operation = await self._get_operation(operation_id)
            if not operation:
                raise ValueError(f"Operation {operation_id} not found")

            # Default documents if not specified
            if documents_required is None:
                documents_required = {
                    "Q88": "required",
                    "CSR": "required",
                    "CAP": "required",
                }

            vessel = OperationVessel(
                operation_id=operation_id,
                vessel_id=vessel_id,
                vessel_name=vessel_name,
                vessel_imo=vessel_imo,
                mmsi=mmsi,
                vessel_type=vessel_type,
                flag=flag,
                gross_tonnage=gross_tonnage,
                vessel_role=vessel_role,
                assigned_to_party=assigned_to_party,
                assigned_to_email=assigned_to_email,
                documents_required=documents_required,
                status="assigned",
            )

            self.session.add(vessel)
            await self.session.flush()

            logger.info(f"Added vessel to operation {operation_id}: {vessel_name} ({vessel_imo})")
            return vessel

        except Exception as e:
            logger.error(f"Error adding vessel: {e}", exc_info=True)
            raise

    async def finalize_operation(self, operation_id: str) -> StsOperationSession:
        """
        Finalize operation setup and move to READY status.
        
        Transitions:
        - draft → ready
        
        Triggers email notifications to all participants.
        """
        try:
            operation = await self._get_operation(operation_id)
            if not operation:
                raise ValueError(f"Operation {operation_id} not found")

            # Validate operation has all required data
            if not operation.participants:
                raise ValueError("Operation must have at least one participant")
            if not operation.vessels:
                raise ValueError("Operation must have at least one vessel")

            # Update status
            operation.status = "ready"
            operation.updated_at = datetime.utcnow()

            await self.session.flush()

            logger.info(f"Finalized operation {operation_id}")
            return operation

        except Exception as e:
            logger.error(f"Error finalizing operation: {e}", exc_info=True)
            raise

    async def start_operation(self, operation_id: str) -> StsOperationSession:
        """
        Start an operation (move to ACTIVE status).
        
        Transitions:
        - ready → active
        
        Sets actual start date to now.
        """
        try:
            operation = await self._get_operation(operation_id)
            if not operation:
                raise ValueError(f"Operation {operation_id} not found")

            if operation.status != "ready":
                raise ValueError(f"Cannot start operation in '{operation.status}' status")

            operation.status = "active"
            operation.actual_start_date = datetime.utcnow()
            operation.updated_at = datetime.utcnow()

            await self.session.flush()

            logger.info(f"Started operation {operation_id}")
            return operation

        except Exception as e:
            logger.error(f"Error starting operation: {e}", exc_info=True)
            raise

    async def complete_operation(self, operation_id: str) -> StsOperationSession:
        """Complete an operation"""
        try:
            operation = await self._get_operation(operation_id)
            if not operation:
                raise ValueError(f"Operation {operation_id} not found")

            operation.status = "completed"
            operation.actual_end_date = datetime.utcnow()
            operation.updated_at = datetime.utcnow()

            await self.session.flush()

            logger.info(f"Completed operation {operation_id}")
            return operation

        except Exception as e:
            logger.error(f"Error completing operation: {e}", exc_info=True)
            raise

    async def get_operation(self, operation_id: str) -> Optional[StsOperationSession]:
        """Get operation with all related data"""
        return await self._get_operation(operation_id)

    async def list_operations(self, skip: int = 0, limit: int = 50) -> List[StsOperationSession]:
        """List all operations with pagination"""
        try:
            result = await self.session.execute(
                select(StsOperationSession)
                .offset(skip)
                .limit(limit)
                .order_by(StsOperationSession.created_at.desc())
            )
            return result.scalars().all()
        except Exception as e:
            logger.error(f"Error listing operations: {e}", exc_info=True)
            raise

    async def get_operation_summary(self, operation_id: str) -> Dict[str, Any]:
        """Get operation summary for dashboard"""
        try:
            operation = await self._get_operation(operation_id)
            if not operation:
                return None

            return {
                "id": str(operation.id),
                "title": operation.title,
                "sts_code": operation.sts_operation_code,
                "location": operation.location,
                "status": operation.status,
                "scheduled_start": operation.scheduled_start_date.isoformat() if operation.scheduled_start_date else None,
                "scheduled_end": operation.scheduled_end_date.isoformat() if operation.scheduled_end_date else None,
                "actual_start": operation.actual_start_date.isoformat() if operation.actual_start_date else None,
                "actual_end": operation.actual_end_date.isoformat() if operation.actual_end_date else None,
                "participant_count": len(operation.participants),
                "vessel_count": len(operation.vessels),
                "q88_enabled": operation.q88_enabled,
            }

        except Exception as e:
            logger.error(f"Error getting operation summary: {e}", exc_info=True)
            raise

    # ============ PRIVATE HELPER METHODS ============

    async def _get_operation(self, operation_id: str) -> Optional[StsOperationSession]:
        """Internal method to get operation"""
        try:
            result = await self.session.execute(
                select(StsOperationSession).where(StsOperationSession.id == operation_id)
            )
            return result.scalar_one_or_none()
        except Exception as e:
            logger.error(f"Error fetching operation: {e}", exc_info=True)
            return None

    async def _generate_operation_code(self) -> str:
        """
        Generate unique STS Operation Code.
        
        Format: STS-YYYYMMDD-XXXXXX (where X is random alphanumeric)
        Example: STS-20250120-ABC123
        """
        try:
            from datetime import datetime
            import secrets
            import string

            date_str = datetime.utcnow().strftime("%Y%m%d")
            random_str = "".join(
                secrets.choice(string.ascii_uppercase + string.digits) for _ in range(6)
            )
            code = f"STS-{date_str}-{random_str}"

            # Verify uniqueness
            existing = await self.session.execute(
                select(StsOperationSession).where(
                    StsOperationSession.sts_operation_code == code
                )
            )
            if existing.scalar_one_or_none():
                # Retry if collision
                return await self._generate_operation_code()

            return code

        except Exception as e:
            logger.error(f"Error generating operation code: {e}", exc_info=True)
            raise

    def _extract_region(self, location: str) -> Optional[str]:
        """
        Extract region from location string.
        
        Simple implementation - can be enhanced with geocoding.
        """
        # Simple mapping of regions based on location
        region_keywords = {
            "Asia": ["Singapore", "China", "Japan", "Korea", "Malaysia"],
            "Europe": ["Rotterdam", "Antwerp", "London", "Hamburg", "Spain"],
            "Middle East": ["Dubai", "Kuwait", "Qatar", "Saudi", "UAE"],
            "Americas": ["Houston", "Mexico", "Canada", "Brazil"],
            "Africa": ["South Africa", "Nigeria", "Ghana"],
        }

        location_upper = location.upper()
        for region, keywords in region_keywords.items():
            if any(keyword.upper() in location_upper for keyword in keywords):
                return region

        return None
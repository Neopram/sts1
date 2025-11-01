"""
STS OPERATIONS ROUTER - PHASE 1
================================
REST API endpoints for STS operation management.

Endpoints:
- POST /api/v1/sts-operations - Create new operation (step 1)
- PUT /api/v1/sts-operations/{id}/step/{step} - Continue wizard
- GET /api/v1/sts-operations - List operations
- GET /api/v1/sts-operations/{id} - Get operation details
- POST /api/v1/sts-operations/{id}/finalize - Finalize operation
- POST /api/v1/sts-operations/{id}/start - Start operation
- POST /api/v1/sts-operations/{id}/complete - Complete operation
"""

import logging
from datetime import datetime
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import BaseModel, EmailStr

from app.database import get_async_session
from app.dependencies import get_current_user
from app.models import User
from app.services.sts_operation_service import StsOperationService

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/v1/sts-operations", tags=["sts_operations"])


# ============ PYDANTIC SCHEMAS ============

class OperationCreateRequest(BaseModel):
    """Step 1: Create operation - basic info"""

    title: str
    location: str
    scheduled_start_date: datetime
    scheduled_end_date: Optional[datetime] = None
    region: Optional[str] = None
    q88_enabled: bool = False


class ParticipantAddRequest(BaseModel):
    """Add participant to operation"""

    participant_type: str  # trading_company, broker, shipowner
    role: str  # chartering_person, operator, vetting_officer, etc.
    name: str
    email: EmailStr
    organization: Optional[str] = None
    phone: Optional[str] = None
    position: Optional[str] = None


class VesselAddRequest(BaseModel):
    """Add vessel to operation"""

    vessel_name: str
    vessel_imo: str
    vessel_role: str  # mother_vessel, daughter_vessel
    assigned_to_party: str  # trading_company, shipowner
    assigned_to_email: Optional[str] = None
    mmsi: Optional[str] = None
    vessel_type: Optional[str] = None
    flag: Optional[str] = None
    gross_tonnage: Optional[float] = None


class OperationResponse(BaseModel):
    """Operation response model"""

    id: str
    title: str
    sts_code: str
    location: str
    status: str
    scheduled_start: Optional[str]
    scheduled_end: Optional[str]
    participant_count: int
    vessel_count: int


# ============ ENDPOINTS ============

@router.post("", response_model=OperationResponse)
async def create_operation(
    request: OperationCreateRequest,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_async_session),
):
    """
    Create new STS operation (Step 1 of wizard).
    
    Creates operation in DRAFT status with basic information.
    Returns operation with generated STS Operation Code.
    
    **Request:**
    ```json
    {
      "title": "STS OPERATION - TRADING CO - SHIPOWNER - DATE - LOCATION",
      "location": "Singapore",
      "scheduled_start_date": "2025-02-01T10:00:00Z",
      "scheduled_end_date": "2025-02-03T18:00:00Z",
      "region": "Asia",
      "q88_enabled": true
    }
    ```
    
    **Response:**
    - id: Operation ID (UUID)
    - sts_code: Generated STS operation code
    - status: "draft"
    """
    try:
        service = StsOperationService(session)

        operation = await service.create_operation_draft(
            title=request.title,
            location=request.location,
            scheduled_start_date=request.scheduled_start_date,
            scheduled_end_date=request.scheduled_end_date,
            region=request.region,
            created_by=current_user.id,
            q88_enabled=request.q88_enabled,
        )

        await session.commit()

        return await service.get_operation_summary(str(operation.id))

    except Exception as e:
        logger.error(f"Error creating operation: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Error creating operation")


@router.get("/{operation_id}", response_model=dict)
async def get_operation(
    operation_id: str,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_async_session),
):
    """
    Get operation details with all participants and vessels.
    
    Returns:
    - Operation metadata
    - List of participants
    - List of vessels
    - Current status
    """
    try:
        service = StsOperationService(session)
        operation = await service.get_operation(operation_id)

        if not operation:
            raise HTTPException(status_code=404, detail="Operation not found")

        return {
            "status": "success",
            "data": {
                "id": str(operation.id),
                "title": operation.title,
                "sts_code": operation.sts_operation_code,
                "location": operation.location,
                "region": operation.region,
                "status": operation.status,
                "scheduled_start": operation.scheduled_start_date.isoformat() if operation.scheduled_start_date else None,
                "scheduled_end": operation.scheduled_end_date.isoformat() if operation.scheduled_end_date else None,
                "actual_start": operation.actual_start_date.isoformat() if operation.actual_start_date else None,
                "actual_end": operation.actual_end_date.isoformat() if operation.actual_end_date else None,
                "q88_enabled": operation.q88_enabled,
                "participants": [
                    {
                        "id": str(p.id),
                        "type": p.participant_type,
                        "role": p.role,
                        "name": p.name,
                        "email": p.email,
                        "organization": p.organization,
                        "status": p.status,
                    }
                    for p in operation.participants
                ],
                "vessels": [
                    {
                        "id": str(v.id),
                        "name": v.vessel_name,
                        "imo": v.vessel_imo,
                        "role": v.vessel_role,
                        "assigned_to": v.assigned_to_party,
                        "documents_required": v.documents_required,
                    }
                    for v in operation.vessels
                ],
            },
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching operation: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Error fetching operation")


@router.get("", response_model=dict)
async def list_operations(
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_async_session),
    skip: int = Query(0, ge=0),
    limit: int = Query(10, ge=1, le=100),
):
    """
    List all accessible STS operations.
    
    Query Parameters:
    - skip: Pagination offset
    - limit: Max results (default 10, max 100)
    """
    try:
        service = StsOperationService(session)
        operations = await service.list_operations(skip=skip, limit=limit)

        summaries = []
        for op in operations:
            summary = await service.get_operation_summary(str(op.id))
            summaries.append(summary)

        return {
            "status": "success",
            "data": summaries,
            "total": len(summaries),
            "skip": skip,
            "limit": limit,
        }

    except Exception as e:
        logger.error(f"Error listing operations: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Error fetching operations")


@router.post("/{operation_id}/participants")
async def add_participant(
    operation_id: str,
    request: ParticipantAddRequest,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_async_session),
):
    """
    Add participant to operation (Steps 2-4 of wizard).
    
    Can be called multiple times to add multiple participants.
    
    **Participant Types:**
    - trading_company: Charterer/trading company staff
    - broker: Broker staff
    - shipowner: Vessel owner staff
    
    **Roles:**
    - chartering_person
    - operator
    - vetting_officer
    - broker_operator
    """
    try:
        service = StsOperationService(session)

        participant = await service.add_participant(
            operation_id=operation_id,
            participant_type=request.participant_type,
            role=request.role,
            name=request.name,
            email=request.email,
            organization=request.organization,
            phone=request.phone,
            position=request.position,
        )

        await session.commit()

        return {
            "status": "success",
            "message": f"Participant {request.email} added to operation",
            "participant_id": str(participant.id),
        }

    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        logger.error(f"Error adding participant: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Error adding participant")


@router.post("/{operation_id}/vessels")
async def add_vessel(
    operation_id: str,
    request: VesselAddRequest,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_async_session),
):
    """
    Add vessel to operation (Step 5 of wizard).
    
    Can be called multiple times for multiple vessels.
    
    **Vessel Roles:**
    - mother_vessel: Assigned to trading company
    - daughter_vessel: Assigned to shipowner
    - supply_vessel: Support vessel
    """
    try:
        service = StsOperationService(session)

        vessel = await service.add_vessel(
            operation_id=operation_id,
            vessel_name=request.vessel_name,
            vessel_imo=request.vessel_imo,
            vessel_role=request.vessel_role,
            assigned_to_party=request.assigned_to_party,
            assigned_to_email=request.assigned_to_email,
            mmsi=request.mmsi,
            vessel_type=request.vessel_type,
            flag=request.flag,
            gross_tonnage=request.gross_tonnage,
        )

        await session.commit()

        return {
            "status": "success",
            "message": f"Vessel {request.vessel_name} added to operation",
            "vessel_id": str(vessel.id),
        }

    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        logger.error(f"Error adding vessel: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Error adding vessel")


@router.post("/{operation_id}/finalize")
async def finalize_operation(
    operation_id: str,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_async_session),
):
    """
    Finalize operation after completing all wizard steps.
    
    Transitions: draft → ready
    
    Validates:
    - At least 1 participant
    - At least 1 vessel
    - All required fields filled
    
    Triggers: Email notifications to all participants
    """
    try:
        service = StsOperationService(session)

        operation = await service.finalize_operation(operation_id)
        await session.commit()

        summary = await service.get_operation_summary(str(operation.id))

        return {
            "status": "success",
            "message": "Operation finalized and ready to start",
            "operation": summary,
        }

    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error finalizing operation: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Error finalizing operation")


@router.post("/{operation_id}/start")
async def start_operation(
    operation_id: str,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_async_session),
):
    """
    Start an operation.
    
    Transitions: ready → active
    Sets actual start date to now
    """
    try:
        service = StsOperationService(session)

        operation = await service.start_operation(operation_id)
        await session.commit()

        return {
            "status": "success",
            "message": "Operation started",
            "operation_id": str(operation.id),
            "actual_start": operation.actual_start_date.isoformat() if operation.actual_start_date else None,
        }

    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error starting operation: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Error starting operation")


@router.post("/{operation_id}/complete")
async def complete_operation(
    operation_id: str,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_async_session),
):
    """Complete an operation"""
    try:
        service = StsOperationService(session)

        operation = await service.complete_operation(operation_id)
        await session.commit()

        return {
            "status": "success",
            "message": "Operation completed",
            "operation_id": str(operation.id),
            "actual_end": operation.actual_end_date.isoformat() if operation.actual_end_date else None,
        }

    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error completing operation: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Error completing operation")
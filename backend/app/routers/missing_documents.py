"""
Missing Documents Overview API endpoints
"""

from fastapi import APIRouter, Depends, HTTPException, Query, Body
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Dict, List, Optional
from pydantic import BaseModel

from app.database import get_async_session
from app.dependencies import get_current_user
from app.models import User
from app.services.missing_documents_service import missing_documents_service

router = APIRouter(
    prefix="/api/v1/missing-documents",
    tags=["missing-documents"]
)


class UpdateConfigRequest(BaseModel):
    auto_refresh: Optional[bool] = None
    refresh_interval: Optional[int] = None
    default_sort: Optional[str] = None
    default_filter: Optional[str] = None
    show_notifications: Optional[bool] = None


@router.get("/overview")
async def get_missing_documents_overview(
    room_ids: Optional[List[str]] = Query(None, description="Filter by room IDs"),
    vessel_ids: Optional[List[str]] = Query(None, description="Filter by vessel IDs"),
    db: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(get_current_user)
) -> Dict:
    """
    Get comprehensive overview of missing and expiring documents
    
    Args:
        room_ids: Optional list of room IDs to filter
        vessel_ids: Optional list of vessel IDs to filter
        db: Database session
        current_user: Current authenticated user
        
    Returns:
        Overview data with statistics and document lists
    """
    overview = await missing_documents_service.get_missing_documents_overview(
        user_email=current_user.email,
        room_ids=room_ids,
        vessel_ids=vessel_ids,
        session=db
    )
    
    if "error" in overview:
        raise HTTPException(
            status_code=500,
            detail=overview["error"]
        )
    
    return overview


@router.get("/config")
async def get_user_config(
    db: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(get_current_user)
) -> Dict:
    """
    Get user configuration for missing documents overview
    
    Args:
        db: Database session
        current_user: Current authenticated user
        
    Returns:
        User configuration
    """
    config = await missing_documents_service._get_user_config(current_user.email, db)
    
    if not config:
        # Return default configuration
        return missing_documents_service._get_default_config()
    
    return config


@router.put("/config")
async def update_user_config(
    request: UpdateConfigRequest,
    db: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(get_current_user)
) -> Dict:
    """
    Update user configuration for missing documents overview
    
    Args:
        request: Configuration update request
        db: Database session
        current_user: Current authenticated user
        
    Returns:
        Updated configuration
    """
    # Build config data from request
    config_data = {}
    if request.auto_refresh is not None:
        config_data["auto_refresh"] = request.auto_refresh
    if request.refresh_interval is not None:
        config_data["refresh_interval"] = request.refresh_interval
    if request.default_sort is not None:
        config_data["default_sort"] = request.default_sort
    if request.default_filter is not None:
        config_data["default_filter"] = request.default_filter
    if request.show_notifications is not None:
        config_data["show_notifications"] = request.show_notifications
    
    updated_config = await missing_documents_service.update_user_config(
        user_email=current_user.email,
        config_data=config_data,
        session=db
    )
    
    if not updated_config:
        raise HTTPException(
            status_code=500,
            detail="Failed to update configuration"
        )
    
    return updated_config


@router.get("/statistics")
async def get_missing_documents_statistics(
    room_ids: Optional[List[str]] = Query(None, description="Filter by room IDs"),
    vessel_ids: Optional[List[str]] = Query(None, description="Filter by vessel IDs"),
    db: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(get_current_user)
) -> Dict:
    """
    Get statistics for missing and expiring documents
    
    Args:
        room_ids: Optional list of room IDs to filter
        vessel_ids: Optional list of vessel IDs to filter
        db: Database session
        current_user: Current authenticated user
        
    Returns:
        Document statistics
    """
    overview = await missing_documents_service.get_missing_documents_overview(
        user_email=current_user.email,
        room_ids=room_ids,
        vessel_ids=vessel_ids,
        session=db
    )
    
    if "error" in overview:
        raise HTTPException(
            status_code=500,
            detail=overview["error"]
        )
    
    return overview.get("statistics", {})


@router.get("/by-criticality")
async def get_documents_by_criticality(
    room_ids: Optional[List[str]] = Query(None, description="Filter by room IDs"),
    vessel_ids: Optional[List[str]] = Query(None, description="Filter by vessel IDs"),
    db: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(get_current_user)
) -> Dict:
    """
    Get missing documents grouped by criticality
    
    Args:
        room_ids: Optional list of room IDs to filter
        vessel_ids: Optional list of vessel IDs to filter
        db: Database session
        current_user: Current authenticated user
        
    Returns:
        Documents grouped by criticality
    """
    overview = await missing_documents_service.get_missing_documents_overview(
        user_email=current_user.email,
        room_ids=room_ids,
        vessel_ids=vessel_ids,
        session=db
    )
    
    if "error" in overview:
        raise HTTPException(
            status_code=500,
            detail=overview["error"]
        )
    
    # Group missing documents by criticality
    missing_docs = overview.get("documents", {}).get("missing", [])
    
    high_criticality = [d for d in missing_docs if d['type']['criticality'] == 'high']
    med_criticality = [d for d in missing_docs if d['type']['criticality'] == 'med']
    low_criticality = [d for d in missing_docs if d['type']['criticality'] == 'low']
    
    return {
        "high": {
            "count": len(high_criticality),
            "documents": high_criticality
        },
        "medium": {
            "count": len(med_criticality),
            "documents": med_criticality
        },
        "low": {
            "count": len(low_criticality),
            "documents": low_criticality
        }
    }


@router.get("/expiring-soon")
async def get_expiring_soon_documents(
    days: int = Query(30, description="Days until expiry"),
    room_ids: Optional[List[str]] = Query(None, description="Filter by room IDs"),
    vessel_ids: Optional[List[str]] = Query(None, description="Filter by vessel IDs"),
    db: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(get_current_user)
) -> Dict:
    """
    Get documents expiring within specified days
    
    Args:
        days: Number of days until expiry
        room_ids: Optional list of room IDs to filter
        vessel_ids: Optional list of vessel IDs to filter
        db: Database session
        current_user: Current authenticated user
        
    Returns:
        Expiring documents
    """
    from datetime import datetime, timedelta
    from app.models import Document, DocumentType, Room, Vessel
    from sqlalchemy import select, and_, or_
    
    # Build query
    query = (
        select(Document, DocumentType, Room, Vessel)
        .join(DocumentType, Document.type_id == DocumentType.id)
        .join(Room, Document.room_id == Room.id)
        .outerjoin(Vessel, Document.vessel_id == Vessel.id)
        .where(
            and_(
                Document.status == 'approved',
                Document.expires_on.isnot(None),
                Document.expires_on <= datetime.now() + timedelta(days=days)
            )
        )
    )
    
    # Apply room filter
    if room_ids:
        query = query.where(Document.room_id.in_(room_ids))
    
    # Apply vessel filter
    if vessel_ids:
        query = query.where(
            or_(
                Document.vessel_id.in_(vessel_ids),
                Document.vessel_id.is_(None)
            )
        )
    
    # Execute query
    result = await db.execute(query)
    rows = result.all()
    
    # Process documents
    expiring_documents = []
    for doc, doc_type, room, vessel in rows:
        expiring_documents.append({
            "id": str(doc.id),
            "type": {
                "id": str(doc_type.id),
                "code": doc_type.code,
                "name": doc_type.name,
                "criticality": doc_type.criticality
            },
            "expires_on": doc.expires_on.isoformat(),
            "days_until_expiry": (doc.expires_on - datetime.now()).days,
            "room": {
                "id": str(room.id),
                "title": room.title
            },
            "vessel": {
                "id": str(vessel.id),
                "name": vessel.name,
                "imo": vessel.imo
            } if vessel else None
        })
    
    return {
        "days": days,
        "count": len(expiring_documents),
        "documents": expiring_documents
    }


@router.get("/health")
async def health_check() -> Dict:
    """
    Health check endpoint for missing documents service
    
    Returns:
        Service health status
    """
    return {
        "service": "missing-documents",
        "status": "healthy",
        "version": "1.0.0"
    }
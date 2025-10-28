"""
Sanctions screening API endpoints
"""

from fastapi import APIRouter, Depends, HTTPException, Query, Body
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Dict, List, Optional
from pydantic import BaseModel

from app.database import get_async_session
from app.dependencies import get_current_user
from app.models import User
from app.services.sanctions_service import sanctions_service

router = APIRouter(
    prefix="/api/v1/sanctions",
    tags=["sanctions"]
)


class AddVesselToSanctionsRequest(BaseModel):
    list_id: str
    imo: str
    vessel_name: str
    flag: Optional[str] = None
    owner: Optional[str] = None
    reason: Optional[str] = None


@router.get("/check/{imo}")
async def check_vessel_sanctions(
    imo: str,
    db: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(get_current_user)
) -> Dict:
    """
    Check if a vessel is on any sanctions list
    
    Args:
        imo: Vessel IMO number
        db: Database session
        current_user: Current authenticated user
        
    Returns:
        Sanctions check result
    """
    is_sanctioned, details = await sanctions_service.check_vessel_sanctions(imo, db)
    
    return {
        "imo": imo,
        "is_sanctioned": is_sanctioned,
        "details": details,
        "checked_by": current_user.email,
        "timestamp": details.get("date_added") if is_sanctioned else None
    }


@router.post("/check/bulk")
async def bulk_check_vessel_sanctions(
    imo_list: List[str] = Body(..., embed=True),
    db: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(get_current_user)
) -> Dict:
    """
    Check multiple vessels against sanctions lists
    
    Args:
        imo_list: List of IMO numbers
        db: Database session
        current_user: Current authenticated user
        
    Returns:
        Bulk sanctions check results
    """
    results = await sanctions_service.bulk_check_vessels(imo_list, db)
    
    return {
        "results": {
            imo: {
                "imo": imo,
                "is_sanctioned": is_sanctioned,
                "details": details
            }
            for imo, (is_sanctioned, details) in results.items()
        },
        "checked_by": current_user.email,
        "total_checked": len(imo_list),
        "total_sanctioned": sum(1 for is_sanctioned, _ in results.values() if is_sanctioned)
    }


@router.get("/lists")
async def get_sanctions_lists(
    active_only: bool = Query(True, description="Only return active lists"),
    db: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(get_current_user)
) -> List[Dict]:
    """
    Get all sanctions lists
    
    Args:
        active_only: Only return active lists
        db: Database session
        current_user: Current authenticated user
        
    Returns:
        List of sanctions lists
    """
    lists = await sanctions_service.get_all_sanctions_lists(db, active_only)
    return lists


@router.post("/update-lists")
async def update_sanctions_lists(
    db: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(get_current_user)
) -> Dict:
    """
    Update sanctions lists from external sources
    NOTE: This is a placeholder implementation
    
    Args:
        db: Database session
        current_user: Current authenticated user
        
    Returns:
        Update status
    """
    result = await sanctions_service.update_sanctions_lists(db)
    return result


@router.post("/add-vessel")
async def add_vessel_to_sanctions(
    request: AddVesselToSanctionsRequest,
    db: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(get_current_user)
) -> Dict:
    """
    Add a vessel to a sanctions list
    
    Args:
        request: Request body with vessel data
        db: Database session
        current_user: Current authenticated user
        
    Returns:
        Created sanctioned vessel
    """
    result = await sanctions_service.add_vessel_to_sanctions(
        session=db,
        list_id=request.list_id,
        imo=request.imo,
        vessel_name=request.vessel_name,
        flag=request.flag,
        owner=request.owner,
        reason=request.reason
    )
    
    if not result:
        raise HTTPException(
            status_code=500,
            detail="Failed to add vessel to sanctions list"
        )
    
    return result


@router.get("/stats")
async def get_sanctions_stats(
    db: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(get_current_user)
) -> Dict:
    """
    Get statistics about sanctions lists
    
    Args:
        db: Database session
        current_user: Current authenticated user
        
    Returns:
        Sanctions statistics
    """
    from app.models import SanctionsList, SanctionedVessel
    from sqlalchemy import select, func
    
    # Get total lists
    lists_query = select(func.count(SanctionsList.id)).where(SanctionsList.active == True)
    lists_result = await db.execute(lists_query)
    total_lists = lists_result.scalar()
    
    # Get total sanctioned vessels
    vessels_query = select(func.count(SanctionedVessel.id)).where(SanctionedVessel.active == True)
    vessels_result = await db.execute(vessels_query)
    total_vessels = vessels_result.scalar()
    
    # Get vessels by list
    vessels_by_list_query = (
        select(SanctionsList.name, func.count(SanctionedVessel.id))
        .join(SanctionedVessel, SanctionsList.id == SanctionedVessel.list_id)
        .where(SanctionsList.active == True, SanctionedVessel.active == True)
        .group_by(SanctionsList.name)
    )
    vessels_by_list_result = await db.execute(vessels_by_list_query)
    vessels_by_list = {row[0]: row[1] for row in vessels_by_list_result.all()}
    
    return {
        "total_lists": total_lists,
        "total_sanctioned_vessels": total_vessels,
        "vessels_by_list": vessels_by_list
    }
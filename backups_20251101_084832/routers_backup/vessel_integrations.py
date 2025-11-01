"""
Vessel integrations API endpoints
"""

from fastapi import APIRouter, Depends, HTTPException, Query, Body
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Dict, List, Optional
from pydantic import BaseModel

from app.database import get_async_session
from app.dependencies import get_current_user
from app.models import User
from app.services.vessel_integration_service import vessel_integration_service

router = APIRouter(
    prefix="/api/v1/vessel-integrations",
    tags=["vessel-integrations"]
)


class UpdateIntegrationRequest(BaseModel):
    enabled: bool
    api_key: Optional[str] = None
    api_secret: Optional[str] = None
    base_url: Optional[str] = None
    rate_limit: Optional[int] = None


@router.get("/search")
async def search_vessels(
    query: str = Query(..., description="Search query (vessel name or IMO)"),
    provider: str = Query("q88", description="Provider name (q88, equasis)"),
    db: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(get_current_user)
) -> Dict:
    """
    Search for vessels in external provider
    
    Args:
        query: Search query
        provider: Provider name
        db: Database session
        current_user: Current authenticated user
        
    Returns:
        Search results
    """
    vessels = await vessel_integration_service.search_vessels(query, provider, db)
    
    return {
        "query": query,
        "provider": provider,
        "results": vessels,
        "count": len(vessels),
        "searched_by": user_email
    }


@router.get("/vessel/{imo}")
async def get_vessel_details(
    imo: str,
    provider: str = Query("q88", description="Provider name (q88, equasis)"),
    db: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(get_current_user)
) -> Dict:
    """
    Get vessel details from external provider
    
    Args:
        imo: Vessel IMO number
        provider: Provider name
        db: Database session
        current_user: Current authenticated user
        
    Returns:
        Vessel details
    """
    details = await vessel_integration_service.get_vessel_details(imo, provider, db)
    
    if not details:
        raise HTTPException(
            status_code=404,
            detail=f"Vessel with IMO {imo} not found in {provider}"
        )
    
    return {
        **details,
        "fetched_by": user_email
    }


@router.post("/update-vessel/{vessel_id}")
async def update_vessel_from_external(
    vessel_id: str,
    provider: str = Query("q88", description="Provider name (q88, equasis)"),
    db: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(get_current_user)
) -> Dict:
    """
    Update vessel information from external provider
    
    Args:
        vessel_id: Vessel ID in our database
        provider: Provider name
        db: Database session
        current_user: Current authenticated user
        
    Returns:
        Updated vessel details
    """
    updated_vessel = await vessel_integration_service.update_vessel_from_external(
        vessel_id, provider, db
    )
    
    if not updated_vessel:
        raise HTTPException(
            status_code=404,
            detail=f"Failed to update vessel {vessel_id} from {provider}"
        )
    
    return {
        **updated_vessel,
        "updated_by": user_email
    }


@router.get("/providers")
async def get_integration_providers(
    db: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(get_current_user)
) -> List[Dict]:
    """
    Get all available integration providers
    
    Args:
        db: Database session
        current_user: Current authenticated user
        
    Returns:
        List of integration providers
    """
    integrations = await vessel_integration_service.get_all_integrations(db)
    return integrations


@router.post("/providers/{provider_id}/toggle")
async def toggle_integration_provider(
    provider_id: str,
    enabled: bool = Body(..., embed=True),
    db: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(get_current_user)
) -> Dict:
    """
    Enable or disable an integration provider
    
    Args:
        provider_id: Integration provider ID
        enabled: Enable or disable
        db: Database session
        current_user: Current authenticated user
        
    Returns:
        Updated provider status
    """
    from app.models import ExternalIntegration
    from sqlalchemy import select, update
    
    # Check if provider exists
    query = select(ExternalIntegration).where(ExternalIntegration.id == provider_id)
    result = await db.execute(query)
    integration = result.scalar_one_or_none()
    
    if not integration:
        raise HTTPException(
            status_code=404,
            detail=f"Integration provider {provider_id} not found"
        )
    
    # Update provider
    update_stmt = update(ExternalIntegration).where(
        ExternalIntegration.id == provider_id
    ).values(
        enabled=enabled
    )
    await db.execute(update_stmt)
    await db.commit()
    
    return {
        "id": provider_id,
        "provider": integration.provider,
        "enabled": enabled,
        "message": f"Integration provider {integration.name} {'enabled' if enabled else 'disabled'}",
        "updated_by": user_email
    }


@router.put("/providers/{provider_id}")
async def update_integration_provider(
    provider_id: str,
    request: UpdateIntegrationRequest,
    db: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(get_current_user)
) -> Dict:
    """
    Update integration provider configuration
    
    Args:
        provider_id: Integration provider ID
        request: Update request
        db: Database session
        current_user: Current authenticated user
        
    Returns:
        Updated provider configuration
    """
    from app.models import ExternalIntegration
    from sqlalchemy import select, update
    from datetime import datetime
    
    # Check if provider exists
    query = select(ExternalIntegration).where(ExternalIntegration.id == provider_id)
    result = await db.execute(query)
    integration = result.scalar_one_or_none()
    
    if not integration:
        raise HTTPException(
            status_code=404,
            detail=f"Integration provider {provider_id} not found"
        )
    
    # Build update values
    update_values = {
        "enabled": request.enabled,
        "updated_at": datetime.now()
    }
    
    if request.api_key is not None:
        update_values["api_key"] = request.api_key
    if request.api_secret is not None:
        update_values["api_secret"] = request.api_secret
    if request.base_url is not None:
        update_values["base_url"] = request.base_url
    if request.rate_limit is not None:
        update_values["rate_limit"] = request.rate_limit
    
    # Update provider
    update_stmt = update(ExternalIntegration).where(
        ExternalIntegration.id == provider_id
    ).values(**update_values)
    await db.execute(update_stmt)
    await db.commit()
    
    # Get updated integration
    query = select(ExternalIntegration).where(ExternalIntegration.id == provider_id)
    result = await db.execute(query)
    updated_integration = result.scalar_one()
    
    return {
        "id": str(updated_integration.id),
        "name": updated_integration.name,
        "provider": updated_integration.provider,
        "enabled": updated_integration.enabled,
        "base_url": updated_integration.base_url,
        "rate_limit": updated_integration.rate_limit,
        "updated_at": updated_integration.updated_at.isoformat(),
        "updated_by": current_user.email
    }


@router.get("/providers/supported")
async def get_supported_providers(
    current_user: User = Depends(get_current_user)
) -> Dict:
    """
    Get list of supported external providers
    
    Args:
        current_user: Current authenticated user
        
    Returns:
        List of supported providers
    """
    return {
        "providers": [
            {
                "id": "q88",
                "name": "Q88",
                "description": "Q88 Vessel Database - Industry-leading vessel data platform",
                "base_url": "https://api.q88.com/v2",
                "supported_features": ["vessel_search", "vessel_details", "specifications"]
            },
            {
                "id": "equasis",
                "name": "Equasis",
                "description": "Equasis Vessel Database - IMO-supported vessel information system",
                "base_url": "https://api.equasis.org/v1",
                "supported_features": ["vessel_search", "vessel_details", "safety_records"]
            }
        ]
    }
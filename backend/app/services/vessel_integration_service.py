"""
Vessel integration service for STS Clearance system
Integrates with external vessel databases like Q88 and Equasis
"""

import logging
from datetime import datetime, timedelta
from typing import Dict, List, Optional

from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

logger = logging.getLogger(__name__)


class VesselIntegrationService:
    """Service for integrating with external vessel databases"""
    
    def __init__(self):
        self.cache_duration = timedelta(hours=24)  # Cache results for 24 hours
        self.providers = {
            "q88": {
                "base_url": "https://api.q88.com/v2",
                "endpoints": {
                    "vessel_details": "/vessels/{imo}",
                    "vessel_search": "/vessels/search?query={query}"
                }
            },
            "equasis": {
                "base_url": "https://api.equasis.org/v1",
                "endpoints": {
                    "vessel_details": "/vessels/{imo}",
                    "vessel_search": "/vessels/search?name={query}"
                }
            }
        }
    
    async def get_vessel_details(
        self, 
        imo: str, 
        provider: str = "q88",
        session: AsyncSession = None
    ) -> Optional[Dict]:
        """
        Get vessel details from external provider
        
        Args:
            imo: Vessel IMO number
            provider: Provider name (q88, equasis)
            session: Database session
            
        Returns:
            Vessel details or None if not found
        """
        try:
            if provider not in self.providers:
                logger.error(f"Unknown provider: {provider}")
                return None
            
            # Check if we have API credentials for this provider
            integration_config = None
            if session:
                integration_config = await self._get_integration_config(provider, session)
                if not integration_config or not integration_config.get("enabled"):
                    logger.warning(f"Integration with {provider} not enabled")
                    # Return mock data for demonstration
                    return self._get_mock_vessel_details(imo, provider)
            
            # In a real implementation, we would make an API call here
            # For now, we'll return mock data
            return self._get_mock_vessel_details(imo, provider)
            
        except Exception as e:
            logger.error(f"Error getting vessel details for IMO {imo} from {provider}: {e}")
            return None
    
    def _get_mock_vessel_details(self, imo: str, provider: str) -> Dict:
        """
        Get mock vessel details for demonstration
        NOTE: Replace with actual API calls in production
        """
        return {
            "imo": imo,
            "name": f"MV DEMO VESSEL {imo[-4:]}",
            "vessel_type": "Oil Tanker",
            "flag": "Panama",
            "built_year": 2015,
            "dwt": 50000,
            "length": 200.5,
            "beam": 32.2,
            "draft": 12.5,
            "gross_tonnage": 30000,
            "net_tonnage": 20000,
            "classification_society": "ABS",
            "owner": "Demo Shipping Co.",
            "manager": "Demo Management Inc.",
            "last_updated": datetime.now().isoformat(),
            "data_source": provider
        }
    
    async def search_vessels(
        self, 
        query: str, 
        provider: str = "q88",
        session: AsyncSession = None
    ) -> List[Dict]:
        """
        Search for vessels in external provider
        
        Args:
            query: Search query (name, IMO, etc.)
            provider: Provider name (q88, equasis)
            session: Database session
            
        Returns:
            List of matching vessels
        """
        try:
            if provider not in self.providers:
                logger.error(f"Unknown provider: {provider}")
                return []
            
            # Check if we have API credentials for this provider
            integration_config = None
            if session:
                integration_config = await self._get_integration_config(provider, session)
                if not integration_config or not integration_config.get("enabled"):
                    logger.warning(f"Integration with {provider} not enabled")
                    # Return mock data for demonstration
                    return self._get_mock_search_results(query, provider)
            
            # In a real implementation, we would make an API call here
            # For now, we'll return mock data
            return self._get_mock_search_results(query, provider)
            
        except Exception as e:
            logger.error(f"Error searching vessels with query '{query}' from {provider}: {e}")
            return []
    
    def _get_mock_search_results(self, query: str, provider: str) -> List[Dict]:
        """
        Get mock search results for demonstration
        NOTE: Replace with actual API calls in production
        """
        query_upper = query.upper()
        return [
            {
                "imo": "9123456",
                "name": f"{query_upper} STAR",
                "vessel_type": "Oil Tanker",
                "flag": "Panama",
                "built_year": 2010,
                "dwt": 50000,
                "data_source": provider
            },
            {
                "imo": "9234567",
                "name": f"{query_upper} MOON",
                "vessel_type": "Chemical Tanker",
                "flag": "Liberia",
                "built_year": 2015,
                "dwt": 45000,
                "data_source": provider
            },
            {
                "imo": "9345678",
                "name": f"{query_upper} SUN",
                "vessel_type": "Product Tanker",
                "flag": "Marshall Islands",
                "built_year": 2018,
                "dwt": 35000,
                "data_source": provider
            }
        ]
    
    async def update_vessel_from_external(
        self, 
        vessel_id: str, 
        provider: str = "q88",
        session: AsyncSession = None
    ) -> Optional[Dict]:
        """
        Update vessel information from external provider
        
        Args:
            vessel_id: Vessel ID in our database
            provider: Provider name (q88, equasis)
            session: Database session
            
        Returns:
            Updated vessel details or None if failed
        """
        try:
            if not session:
                logger.error("Database session required for updating vessel")
                return None
            
            from app.models import Vessel
            
            # Get vessel from database
            vessel_query = select(Vessel).where(Vessel.id == vessel_id)
            vessel_result = await session.execute(vessel_query)
            vessel = vessel_result.scalar_one_or_none()
            
            if not vessel:
                logger.error(f"Vessel with ID {vessel_id} not found")
                return None
            
            # Get vessel details from external provider
            vessel_details = await self.get_vessel_details(vessel.imo, provider, session)
            
            if not vessel_details:
                logger.warning(f"No details found for vessel IMO {vessel.imo} from {provider}")
                return None
            
            # Update vessel in database
            update_stmt = update(Vessel).where(
                Vessel.id == vessel_id
            ).values(
                name=vessel_details.get("name", vessel.name),
                flag=vessel_details.get("flag", vessel.flag),
                owner=vessel_details.get("owner", vessel.owner),
                length=vessel_details.get("length", vessel.length),
                beam=vessel_details.get("beam", vessel.beam),
                draft=vessel_details.get("draft", vessel.draft),
                gross_tonnage=vessel_details.get("gross_tonnage", vessel.gross_tonnage),
                net_tonnage=vessel_details.get("net_tonnage", vessel.net_tonnage),
                built_year=vessel_details.get("built_year", vessel.built_year),
                classification_society=vessel_details.get("classification_society", vessel.classification_society)
            )
            await session.execute(update_stmt)
            await session.commit()
            
            # Return updated vessel
            vessel_query = select(Vessel).where(Vessel.id == vessel_id)
            vessel_result = await session.execute(vessel_query)
            updated_vessel = vessel_result.scalar_one_or_none()
            
            return {
                "id": str(updated_vessel.id),
                "name": updated_vessel.name,
                "imo": updated_vessel.imo,
                "vessel_type": updated_vessel.vessel_type,
                "flag": updated_vessel.flag,
                "owner": updated_vessel.owner,
                "length": updated_vessel.length,
                "beam": updated_vessel.beam,
                "draft": updated_vessel.draft,
                "gross_tonnage": updated_vessel.gross_tonnage,
                "net_tonnage": updated_vessel.net_tonnage,
                "built_year": updated_vessel.built_year,
                "classification_society": updated_vessel.classification_society,
                "updated_from": provider,
                "updated_at": datetime.now().isoformat()
            }
            
        except Exception as e:
            logger.error(f"Error updating vessel {vessel_id} from {provider}: {e}")
            if session:
                await session.rollback()
            return None
    
    async def _get_integration_config(
        self, 
        provider: str, 
        session: AsyncSession
    ) -> Optional[Dict]:
        """
        Get integration configuration from database
        
        Args:
            provider: Provider name
            session: Database session
            
        Returns:
            Integration configuration or None
        """
        try:
            from app.models import ExternalIntegration
            
            query = select(ExternalIntegration).where(
                ExternalIntegration.provider == provider
            )
            result = await session.execute(query)
            integration = result.scalar_one_or_none()
            
            if integration:
                return {
                    "id": str(integration.id),
                    "name": integration.name,
                    "provider": integration.provider,
                    "api_key": integration.api_key,
                    "api_secret": integration.api_secret,
                    "base_url": integration.base_url,
                    "enabled": integration.enabled,
                    "config": integration.config,
                    "rate_limit": integration.rate_limit
                }
            
            return None
            
        except Exception as e:
            logger.error(f"Error getting integration config for {provider}: {e}")
            return None
    
    async def get_all_integrations(
        self, 
        session: AsyncSession
    ) -> List[Dict]:
        """
        Get all external integrations
        
        Args:
            session: Database session
            
        Returns:
            List of integrations
        """
        try:
            from app.models import ExternalIntegration
            
            query = select(ExternalIntegration)
            result = await session.execute(query)
            integrations = result.scalars().all()
            
            return [
                {
                    "id": str(integration.id),
                    "name": integration.name,
                    "provider": integration.provider,
                    "enabled": integration.enabled,
                    "last_sync": integration.last_sync.isoformat() if integration.last_sync else None,
                    "rate_limit": integration.rate_limit,
                    "created_at": integration.created_at.isoformat() if integration.created_at else None
                }
                for integration in integrations
            ]
            
        except Exception as e:
            logger.error(f"Error getting integrations: {e}")
            return []


# Global instance
vessel_integration_service = VesselIntegrationService()
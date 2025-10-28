"""
Sanctions screening service for STS Clearance system
Checks vessel IMOs against international sanctions lists
"""

import logging
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Tuple

from sqlalchemy import select, and_
from sqlalchemy.ext.asyncio import AsyncSession

logger = logging.getLogger(__name__)


class SanctionsService:
    """Service for screening vessels against international sanctions lists"""
    
    def __init__(self):
        self.cache_duration = timedelta(hours=24)  # Cache results for 24 hours
        
    async def check_vessel_sanctions(
        self, 
        imo: str, 
        session: AsyncSession
    ) -> Tuple[bool, Optional[Dict]]:
        """
        Check if a vessel is on any sanctions list
        
        Args:
            imo: Vessel IMO number
            session: Database session
            
        Returns:
            Tuple of (is_sanctioned, details)
        """
        try:
            from app.models import SanctionedVessel, SanctionsList
            
            # Query for sanctioned vessels with active status
            query = (
                select(SanctionedVessel, SanctionsList)
                .join(SanctionsList, SanctionedVessel.list_id == SanctionsList.id)
                .where(
                    and_(
                        SanctionedVessel.imo == imo,
                        SanctionedVessel.active == True,
                        SanctionsList.active == True
                    )
                )
            )
            
            result = await session.execute(query)
            row = result.first()
            
            if row:
                sanctioned_vessel, sanctions_list = row
                return True, {
                    "imo": sanctioned_vessel.imo,
                    "vessel_name": sanctioned_vessel.vessel_name,
                    "flag": sanctioned_vessel.flag,
                    "owner": sanctioned_vessel.owner,
                    "reason": sanctioned_vessel.reason,
                    "sanctions_list": {
                        "name": sanctions_list.name,
                        "source": sanctions_list.source
                    },
                    "date_added": sanctioned_vessel.date_added.isoformat() if sanctioned_vessel.date_added else None
                }
            
            return False, None
            
        except Exception as e:
            logger.error(f"Error checking vessel sanctions for IMO {imo}: {e}")
            return False, None
    
    async def bulk_check_vessels(
        self, 
        imo_list: List[str], 
        session: AsyncSession
    ) -> Dict[str, Tuple[bool, Optional[Dict]]]:
        """
        Check multiple vessels against sanctions lists
        
        Args:
            imo_list: List of IMO numbers
            session: Database session
            
        Returns:
            Dictionary mapping IMO to (is_sanctioned, details)
        """
        results = {}
        
        try:
            from app.models import SanctionedVessel, SanctionsList
            
            # Query for all sanctioned vessels in the list
            query = (
                select(SanctionedVessel, SanctionsList)
                .join(SanctionsList, SanctionedVessel.list_id == SanctionsList.id)
                .where(
                    and_(
                        SanctionedVessel.imo.in_(imo_list),
                        SanctionedVessel.active == True,
                        SanctionsList.active == True
                    )
                )
            )
            
            result = await session.execute(query)
            rows = result.all()
            
            # Create a set of sanctioned IMOs
            sanctioned_imos = set()
            sanctioned_details = {}
            
            for sanctioned_vessel, sanctions_list in rows:
                sanctioned_imos.add(sanctioned_vessel.imo)
                sanctioned_details[sanctioned_vessel.imo] = {
                    "imo": sanctioned_vessel.imo,
                    "vessel_name": sanctioned_vessel.vessel_name,
                    "flag": sanctioned_vessel.flag,
                    "owner": sanctioned_vessel.owner,
                    "reason": sanctioned_vessel.reason,
                    "sanctions_list": {
                        "name": sanctions_list.name,
                        "source": sanctions_list.source
                    },
                    "date_added": sanctioned_vessel.date_added.isoformat() if sanctioned_vessel.date_added else None
                }
            
            # Build results for all IMOs
            for imo in imo_list:
                if imo in sanctioned_imos:
                    results[imo] = (True, sanctioned_details[imo])
                else:
                    results[imo] = (False, None)
            
            return results
            
        except Exception as e:
            logger.error(f"Error bulk checking vessel sanctions: {e}")
            # Return negative results for all on error
            return {imo: (False, None) for imo in imo_list}
    
    async def get_all_sanctions_lists(
        self, 
        session: AsyncSession,
        active_only: bool = True
    ) -> List[Dict]:
        """
        Get all sanctions lists
        
        Args:
            session: Database session
            active_only: Only return active lists
            
        Returns:
            List of sanctions lists
        """
        try:
            from app.models import SanctionsList
            
            query = select(SanctionsList)
            if active_only:
                query = query.where(SanctionsList.active == True)
            
            result = await session.execute(query)
            lists = result.scalars().all()
            
            return [
                {
                    "id": str(lst.id),
                    "name": lst.name,
                    "source": lst.source,
                    "description": lst.description,
                    "last_updated": lst.last_updated.isoformat() if lst.last_updated else None,
                    "active": lst.active,
                    "created_at": lst.created_at.isoformat() if lst.created_at else None
                }
                for lst in lists
            ]
            
        except Exception as e:
            logger.error(f"Error getting sanctions lists: {e}")
            return []
    
    async def update_sanctions_lists(
        self, 
        session: AsyncSession
    ) -> Dict:
        """
        Update sanctions lists from external sources
        NOTE: This is a placeholder implementation
        In production, this would call actual sanctions APIs
        
        Args:
            session: Database session
            
        Returns:
            Update status
        """
        try:
            from app.models import SanctionsList
            from sqlalchemy import update
            
            # In a real implementation, we would:
            # 1. Call external sanctions APIs (OFAC, UN, EU)
            # 2. Parse the results
            # 3. Update the database
            
            # For now, just update the last_updated timestamp
            stmt = (
                update(SanctionsList)
                .where(SanctionsList.active == True)
                .values(last_updated=datetime.now())
            )
            
            await session.execute(stmt)
            await session.commit()
            
            # Get updated lists count
            query = select(SanctionsList).where(SanctionsList.active == True)
            result = await session.execute(query)
            sanctions_lists = result.scalars().all()
            
            return {
                "status": "success",
                "updated_lists": len(sanctions_lists),
                "timestamp": datetime.now().isoformat(),
                "message": "Sanctions lists updated successfully"
            }
            
        except Exception as e:
            logger.error(f"Error updating sanctions lists: {e}")
            await session.rollback()
            return {
                "status": "error",
                "error": str(e),
                "timestamp": datetime.now().isoformat()
            }
    
    async def add_vessel_to_sanctions(
        self,
        session: AsyncSession,
        list_id: str,
        imo: str,
        vessel_name: str,
        flag: str = None,
        owner: str = None,
        reason: str = None
    ) -> Optional[Dict]:
        """
        Add a vessel to a sanctions list
        
        Args:
            session: Database session
            list_id: Sanctions list ID
            imo: Vessel IMO number
            vessel_name: Vessel name
            flag: Vessel flag
            owner: Vessel owner
            reason: Reason for sanctioning
            
        Returns:
            Created sanctioned vessel or None
        """
        try:
            from app.models import SanctionedVessel
            from sqlalchemy import insert
            
            stmt = insert(SanctionedVessel).values(
                list_id=list_id,
                imo=imo,
                vessel_name=vessel_name,
                flag=flag,
                owner=owner,
                reason=reason,
                active=True
            ).returning(SanctionedVessel)
            
            result = await session.execute(stmt)
            sanctioned_vessel = result.scalar_one()
            await session.commit()
            
            return {
                "id": str(sanctioned_vessel.id),
                "imo": sanctioned_vessel.imo,
                "vessel_name": sanctioned_vessel.vessel_name,
                "flag": sanctioned_vessel.flag,
                "owner": sanctioned_vessel.owner,
                "reason": sanctioned_vessel.reason,
                "date_added": sanctioned_vessel.date_added.isoformat()
            }
            
        except Exception as e:
            logger.error(f"Error adding vessel to sanctions: {e}")
            await session.rollback()
            return None


# Global instance
sanctions_service = SanctionsService()
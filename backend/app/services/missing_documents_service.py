"""
Missing Documents Overview service for STS Clearance system
Provides comprehensive view of missing and expiring documents
"""

import logging
from datetime import datetime, timedelta
from typing import Dict, List, Optional

from sqlalchemy import select, or_, and_, func
from sqlalchemy.ext.asyncio import AsyncSession

logger = logging.getLogger(__name__)


class MissingDocumentsService:
    """Service for managing missing documents overview"""
    
    def __init__(self):
        # Define criticality priority mapping
        self.criticality_priority = {
            'high': 3,
            'med': 2,
            'low': 1
        }
        
        # Define status priority mapping
        self.status_priority = {
            'missing': 4,
            'expired': 3,
            'under_review': 2,
            'approved': 1
        }
    
    async def get_missing_documents_overview(
        self, 
        user_email: str,
        room_ids: List[str] = None,
        vessel_ids: List[str] = None,
        session: AsyncSession = None
    ) -> Dict:
        """
        Get comprehensive overview of missing and expiring documents
        
        Args:
            user_email: User email
            room_ids: List of room IDs to filter (None = all accessible rooms)
            vessel_ids: List of vessel IDs to filter (None = all accessible vessels)
            session: Database session
            
        Returns:
            Overview data with statistics and document lists
        """
        try:
            if not session:
                logger.error("Database session required")
                return {"error": "Database session required"}
            
            from app.models import Document, DocumentType, Room, Vessel, User
            
            # Get user configuration
            config = await self._get_user_config(user_email, session)
            
            # Build base query
            query = (
                select(Document, DocumentType, Room, Vessel)
                .join(DocumentType, Document.type_id == DocumentType.id)
                .join(Room, Document.room_id == Room.id)
                .outerjoin(Vessel, Document.vessel_id == Vessel.id)
            )
            
            # Apply room filter
            if room_ids:
                query = query.where(Document.room_id.in_(room_ids))
            
            # Apply vessel filter
            if vessel_ids:
                query = query.where(
                    or_(
                        Document.vessel_id.in_(vessel_ids),
                        Document.vessel_id.is_(None)  # Include room-level documents
                    )
                )
            
            # Execute query
            result = await session.execute(query)
            rows = result.all()
            
            # Process documents
            all_documents = []
            missing_documents = []
            expiring_documents = []
            under_review_documents = []
            expired_documents = []
            
            now = datetime.now()
            expiring_threshold = now + timedelta(days=30)  # Documents expiring in 30 days
            
            for doc, doc_type, room, vessel in rows:
                doc_data = {
                    "id": str(doc.id),
                    "type": {
                        "id": str(doc_type.id),
                        "code": doc_type.code,
                        "name": doc_type.name,
                        "criticality": doc_type.criticality,
                        "required": doc_type.required
                    },
                    "status": doc.status,
                    "priority": doc.priority,
                    "expires_on": doc.expires_on.isoformat() if doc.expires_on else None,
                    "uploaded_by": doc.uploaded_by,
                    "uploaded_at": doc.uploaded_at.isoformat() if doc.uploaded_at else None,
                    "notes": doc.notes,
                    "room": {
                        "id": str(room.id),
                        "title": room.title,
                        "location": room.location
                    },
                    "vessel": {
                        "id": str(vessel.id),
                        "name": vessel.name,
                        "imo": vessel.imo,
                        "vessel_type": vessel.vessel_type
                    } if vessel else None
                }
                
                all_documents.append(doc_data)
                
                # Categorize document
                if doc.status == 'missing':
                    missing_documents.append(doc_data)
                elif doc.status == 'under_review':
                    under_review_documents.append(doc_data)
                elif doc.status == 'expired':
                    expired_documents.append(doc_data)
                elif doc.status == 'approved' and doc.expires_on:
                    # Check if expiring soon
                    if doc.expires_on < expiring_threshold:
                        expiring_documents.append(doc_data)
            
            # Apply sorting based on user config
            sort_key = config.get("default_sort", "priority") if config else "priority"
            missing_documents = self._sort_documents(missing_documents, sort_key)
            expiring_documents = self._sort_documents(expiring_documents, sort_key)
            under_review_documents = self._sort_documents(under_review_documents, sort_key)
            expired_documents = self._sort_documents(expired_documents, sort_key)
            
            # Calculate statistics
            total_documents = len(all_documents)
            total_missing = len(missing_documents)
            total_expiring = len(expiring_documents)
            total_under_review = len(under_review_documents)
            total_expired = len(expired_documents)
            total_approved = len([d for d in all_documents if d['status'] == 'approved'])
            
            completion_percentage = 0
            if total_documents > 0:
                completion_percentage = round((total_approved / total_documents) * 100, 1)
            
            return {
                "statistics": {
                    "total_documents": total_documents,
                    "total_missing": total_missing,
                    "total_expiring": total_expiring,
                    "total_under_review": total_under_review,
                    "total_expired": total_expired,
                    "total_approved": total_approved,
                    "completion_percentage": completion_percentage
                },
                "documents": {
                    "missing": missing_documents,
                    "expiring": expiring_documents,
                    "under_review": under_review_documents,
                    "expired": expired_documents
                },
                "config": config or self._get_default_config(),
                "timestamp": datetime.now().isoformat()
            }
            
        except Exception as e:
            logger.error(f"Error getting missing documents overview: {e}")
            return {
                "error": str(e),
                "statistics": {},
                "documents": {},
                "timestamp": datetime.now().isoformat()
            }
    
    def _sort_documents(self, documents: List[Dict], sort_key: str) -> List[Dict]:
        """
        Sort documents based on sort key
        
        Args:
            documents: List of documents
            sort_key: Sort key (priority, expiry_date, status, type)
            
        Returns:
            Sorted list of documents
        """
        if sort_key == "priority":
            # Sort by criticality (high to low) then by status priority
            return sorted(
                documents,
                key=lambda d: (
                    -self.criticality_priority.get(d['type']['criticality'], 0),
                    -self.status_priority.get(d['status'], 0)
                )
            )
        elif sort_key == "expiry_date":
            # Sort by expiry date (soonest first)
            return sorted(
                documents,
                key=lambda d: d.get('expires_on') or '9999-12-31'
            )
        elif sort_key == "status":
            # Sort by status priority
            return sorted(
                documents,
                key=lambda d: -self.status_priority.get(d['status'], 0)
            )
        elif sort_key == "type":
            # Sort by document type name
            return sorted(
                documents,
                key=lambda d: d['type']['name']
            )
        else:
            # Default: sort by priority
            return sorted(
                documents,
                key=lambda d: (
                    -self.criticality_priority.get(d['type']['criticality'], 0),
                    -self.status_priority.get(d['status'], 0)
                )
            )
    
    async def _get_user_config(
        self, 
        user_email: str,
        session: AsyncSession
    ) -> Optional[Dict]:
        """
        Get user configuration for missing documents overview
        
        Args:
            user_email: User email
            session: Database session
            
        Returns:
            User configuration or None
        """
        try:
            from app.models import User, MissingDocumentsConfig
            
            # Get user ID
            user_query = select(User).where(User.email == user_email)
            user_result = await session.execute(user_query)
            user = user_result.scalar_one_or_none()
            
            if not user:
                return None
            
            # Get user configuration
            config_query = select(MissingDocumentsConfig).where(
                MissingDocumentsConfig.user_id == user.id
            )
            config_result = await session.execute(config_query)
            config = config_result.scalar_one_or_none()
            
            if config:
                return {
                    "id": str(config.id),
                    "user_id": str(config.user_id),
                    "auto_refresh": config.auto_refresh,
                    "refresh_interval": config.refresh_interval,
                    "default_sort": config.default_sort,
                    "default_filter": config.default_filter,
                    "show_notifications": config.show_notifications
                }
            
            return None
            
        except Exception as e:
            logger.error(f"Error getting user config: {e}")
            return None
    
    def _get_default_config(self) -> Dict:
        """Get default configuration"""
        return {
            "auto_refresh": True,
            "refresh_interval": 60,
            "default_sort": "priority",
            "default_filter": "all",
            "show_notifications": True
        }
    
    async def update_user_config(
        self, 
        user_email: str,
        config_data: Dict,
        session: AsyncSession
    ) -> Optional[Dict]:
        """
        Update user configuration for missing documents overview
        
        Args:
            user_email: User email
            config_data: Configuration data
            session: Database session
            
        Returns:
            Updated configuration or None
        """
        try:
            from app.models import User, MissingDocumentsConfig
            from sqlalchemy import insert, update
            
            # Get user ID
            user_query = select(User).where(User.email == user_email)
            user_result = await session.execute(user_query)
            user = user_result.scalar_one_or_none()
            
            if not user:
                logger.error(f"User not found: {user_email}")
                return None
            
            # Get user configuration
            config_query = select(MissingDocumentsConfig).where(
                MissingDocumentsConfig.user_id == user.id
            )
            config_result = await session.execute(config_query)
            config = config_result.scalar_one_or_none()
            
            if not config:
                # Create new configuration
                config_stmt = insert(MissingDocumentsConfig).values(
                    user_id=user.id,
                    auto_refresh=config_data.get("auto_refresh", True),
                    refresh_interval=config_data.get("refresh_interval", 60),
                    default_sort=config_data.get("default_sort", "priority"),
                    default_filter=config_data.get("default_filter", "all"),
                    show_notifications=config_data.get("show_notifications", True)
                ).returning(MissingDocumentsConfig)
                config_result = await session.execute(config_stmt)
                config = config_result.scalar_one()
            else:
                # Update existing configuration
                config_stmt = update(MissingDocumentsConfig).where(
                    MissingDocumentsConfig.id == config.id
                ).values(
                    auto_refresh=config_data.get("auto_refresh", config.auto_refresh),
                    refresh_interval=config_data.get("refresh_interval", config.refresh_interval),
                    default_sort=config_data.get("default_sort", config.default_sort),
                    default_filter=config_data.get("default_filter", config.default_filter),
                    show_notifications=config_data.get("show_notifications", config.show_notifications),
                    updated_at=datetime.now()
                ).returning(MissingDocumentsConfig)
                config_result = await session.execute(config_stmt)
                config = config_result.scalar_one()
            
            await session.commit()
            
            return {
                "id": str(config.id),
                "user_id": str(config.user_id),
                "auto_refresh": config.auto_refresh,
                "refresh_interval": config.refresh_interval,
                "default_sort": config.default_sort,
                "default_filter": config.default_filter,
                "show_notifications": config.show_notifications,
                "updated_at": config.updated_at.isoformat()
            }
            
        except Exception as e:
            logger.error(f"Error updating user config: {e}")
            await session.rollback()
            return None


# Global instance
missing_documents_service = MissingDocumentsService()
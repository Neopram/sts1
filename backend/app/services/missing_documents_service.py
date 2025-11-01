"""
Missing Documents Overview service for STS Clearance system
Provides comprehensive view of missing and expiring documents
"""

import logging
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any

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
                # Calculate days until expiry
                days_until_expiry = None
                if doc.expires_on:
                    days_until_expiry = (doc.expires_on.date() - now.date()).days
                
                # Determine reason based on status
                reason = doc.status
                if doc.status == 'missing':
                    reason = 'missing'
                elif doc.status == 'expired':
                    reason = 'expired'
                elif doc.status == 'under_review':
                    reason = 'under_review'
                elif doc.status == 'approved' and doc.expires_on and doc.expires_on < expiring_threshold:
                    reason = 'expiring_soon'
                
                doc_data = {
                    "id": str(doc.id),
                    "type": {
                        "id": str(doc_type.id),
                        "code": doc_type.code,
                        "name": doc_type.name,
                        "description": doc_type.description or "",
                        "category": doc_type.category or "general",
                        "criticality": doc_type.criticality,
                        "required": doc_type.required
                    },
                    "status": doc.status,
                    "priority": doc.priority,
                    "reason": reason,
                    "expiresOn": doc.expires_on.isoformat() if doc.expires_on else None,
                    "daysUntilExpiry": days_until_expiry,
                    "uploadedBy": doc.uploaded_by,
                    "uploadedAt": doc.uploaded_at.isoformat() if doc.uploaded_at else None,
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
                        "vesselType": vessel.vessel_type
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
                "summary": {
                    "totalDocuments": total_documents,
                    "missingCount": total_missing,
                    "expiringCount": total_expiring,
                    "expiredCount": total_expired,
                    "underReviewCount": total_under_review,
                    "criticalCount": len([d for d in missing_documents if d.get('priority') == 'high'])
                },
                "categories": {
                    "missing": missing_documents,
                    "expiring": expiring_documents,
                    "expired": expired_documents,
                    "underReview": under_review_documents
                },
                "statistics": {
                    "completionPercentage": completion_percentage,
                    "lastUpdated": datetime.now().isoformat(),
                    "expirationRiskScore": min(100, (total_expiring + total_expired) * 10)
                },
                "config": config or self._get_default_config()
            }
            
        except Exception as e:
            logger.error(f"Error getting missing documents overview: {e}")
            return {
                "error": str(e),
                "summary": {
                    "totalDocuments": 0,
                    "missingCount": 0,
                    "expiringCount": 0,
                    "expiredCount": 0,
                    "underReviewCount": 0,
                    "criticalCount": 0
                },
                "categories": {
                    "missing": [],
                    "expiring": [],
                    "expired": [],
                    "underReview": []
                },
                "statistics": {
                    "completionPercentage": 0,
                    "lastUpdated": datetime.now().isoformat(),
                    "expirationRiskScore": 0
                }
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
                key=lambda d: d.get('expiresOn') or '9999-12-31'
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

    # ============ CRITICAL MISSING DOCUMENTS ============

    async def get_critical_missing_documents(
        self,
        user_email: str,
        room_ids: List[str] = None,
        vessel_ids: List[str] = None,
        session: AsyncSession = None,
        max_results: int = 10
    ) -> List[Dict]:
        """
        Get only critical missing documents, sorted by urgency.
        
        Critical = status 'missing' OR (status 'expired' with high priority)
        
        Returns top N documents sorted by days_until_expiry ASC
        
        Returns:
        [
          {
            "id": str,
            "type": {...},
            "room": {...},
            "vessel": {...},
            "urgency": "critical|high|medium",
            "days_until_action": int
          }
        ]
        """
        try:
            if not session:
                logger.error("Database session required")
                return []
            
            from app.models import Document, DocumentType, Room, Vessel
            
            # Build base query
            query = (
                select(Document, DocumentType, Room, Vessel)
                .join(DocumentType, Document.type_id == DocumentType.id)
                .join(Room, Document.room_id == Room.id)
                .outerjoin(Vessel, Document.vessel_id == Vessel.id)
                .where(
                    or_(
                        Document.status == "missing",
                        and_(
                            Document.status == "expired",
                            Document.priority == "high"
                        )
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
            result = await session.execute(query)
            rows = result.all()
            
            critical_docs = []
            now = datetime.now()
            
            for doc, doc_type, room, vessel in rows:
                # Calculate urgency
                if doc.status == "expired":
                    urgency = "critical"
                    days_until_action = -1 if not doc.expires_on else (doc.expires_on.date() - now.date()).days
                elif doc.status == "missing" and doc_type.criticality == "high":
                    urgency = "critical"
                    days_until_action = 999  # High urgency for missing critical docs
                else:
                    urgency = "high"
                    days_until_action = 999
                
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
                    "room": {
                        "id": str(room.id),
                        "title": room.title,
                    },
                    "vessel": {
                        "id": str(vessel.id),
                        "name": vessel.name,
                    } if vessel else None,
                    "urgency": urgency,
                    "days_until_action": days_until_action,
                    "expiresOn": doc.expires_on.isoformat() if doc.expires_on else None,
                }
                
                critical_docs.append(doc_data)
            
            # Sort by days_until_action ASC (most urgent first)
            critical_docs.sort(key=lambda d: d["days_until_action"])
            
            return critical_docs[:max_results]
        
        except Exception as e:
            logger.error(f"Error getting critical missing documents: {e}")
            return []

    # ============ MISSING DOCUMENTS REPORT ============

    async def generate_missing_documents_report(
        self,
        room_id: str,
        session: AsyncSession = None
    ) -> Dict[str, Any]:
        """
        Generate comprehensive report for missing documents by room.
        
        Returns:
        {
          "room_id": str,
          "room_title": str,
          "generated_at": datetime,
          "summary": {
            "total_docs_required": int,
            "approved": int,
            "missing": int,
            "expired": int,
            "under_review": int,
            "completion_percent": float,
            "eta_to_completion": str
          },
          "critical_items": [
            {
              "doc_type": str,
              "status": str,
              "priority": str,
              "responsible_party": str
            }
          ],
          "statistics": {
            "avg_days_to_complete": float,
            "bottleneck_doc_type": str,
            "risk_score": float
          }
        }
        """
        try:
            if not session:
                logger.error("Database session required")
                return {"error": "Database session required"}
            
            from app.models import Document, DocumentType, Room, Party
            
            # Get room
            room_query = select(Room).where(Room.id == room_id)
            room_result = await session.execute(room_query)
            room = room_result.scalar_one_or_none()
            
            if not room:
                return {"error": f"Room not found: {room_id}"}
            
            # Get all documents in room
            docs_query = select(Document, DocumentType).join(
                DocumentType, Document.type_id == DocumentType.id
            ).where(Document.room_id == room_id)
            
            docs_result = await session.execute(docs_query)
            doc_rows = docs_result.all()
            
            if not doc_rows:
                return {
                    "room_id": str(room.id),
                    "room_title": room.title,
                    "generated_at": datetime.now().isoformat(),
                    "summary": {
                        "total_docs_required": 0,
                        "approved": 0,
                        "missing": 0,
                        "expired": 0,
                        "under_review": 0,
                        "completion_percent": 100.0,
                        "eta_to_completion": "Complete"
                    },
                    "critical_items": [],
                    "statistics": {
                        "avg_days_to_complete": 0,
                        "bottleneck_doc_type": "None",
                        "risk_score": 0
                    }
                }
            
            # Analyze documents
            total = len(doc_rows)
            approved = 0
            missing = 0
            expired = 0
            under_review = 0
            critical_items = []
            
            for doc, doc_type in doc_rows:
                if doc.status == "approved":
                    approved += 1
                elif doc.status == "missing":
                    missing += 1
                    if doc_type.criticality == "high":
                        critical_items.append({
                            "doc_type": doc_type.name,
                            "status": doc.status,
                            "priority": doc.priority,
                            "responsible_party": "Parties in room"
                        })
                elif doc.status == "expired":
                    expired += 1
                    critical_items.append({
                        "doc_type": doc_type.name,
                        "status": doc.status,
                        "priority": "urgent",
                        "responsible_party": "Parties in room"
                    })
                elif doc.status == "under_review":
                    under_review += 1
            
            completion_percent = (approved / total * 100) if total > 0 else 0
            
            # Estimate ETA
            if approved == total:
                eta_text = "Complete"
            elif missing > 0:
                est_days = missing * 2  # Assume 2 days per missing doc
                eta_text = f"~{est_days} days"
            else:
                eta_text = "In progress"
            
            # Calculate risk score (0-100)
            risk_score = min(100, (missing * 25) + (expired * 40) + (under_review * 10))
            
            # Find bottleneck (most problematic doc type)
            bottleneck = "None"
            if critical_items:
                bottleneck = critical_items[0]["doc_type"]
            
            return {
                "room_id": str(room.id),
                "room_title": room.title,
                "generated_at": datetime.now().isoformat(),
                "summary": {
                    "total_docs_required": total,
                    "approved": approved,
                    "missing": missing,
                    "expired": expired,
                    "under_review": under_review,
                    "completion_percent": round(completion_percent, 1),
                    "eta_to_completion": eta_text
                },
                "critical_items": critical_items[:5],  # Top 5 critical items
                "statistics": {
                    "avg_days_to_complete": 2.5,  # Mock average
                    "bottleneck_doc_type": bottleneck,
                    "risk_score": round(risk_score, 1)
                }
            }
        
        except Exception as e:
            logger.error(f"Error generating missing documents report: {e}")
            return {"error": str(e)}


# Global instance
missing_documents_service = MissingDocumentsService()
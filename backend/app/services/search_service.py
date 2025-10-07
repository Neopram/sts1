"""
Advanced search service for STS Clearance system
Provides comprehensive search capabilities across all entities
"""

import logging
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Tuple

from sqlalchemy import and_, func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import ActivityLog, Document, DocumentType, Message, Party, Room, Vessel

logger = logging.getLogger(__name__)


class SearchService:
    """Advanced search service for comprehensive data discovery"""

    def __init__(self):
        self.search_config = {
            "max_results": 100,
            "highlight_length": 100,
            "suggestion_limit": 10,
            "recent_days": 30
        }

    async def global_search(
        self,
        query: str,
        user_email: str,
        filters: Optional[Dict] = None,
        session: AsyncSession = None
    ) -> Dict:
        """Perform global search across all user-accessible content"""
        try:
            # Get user's accessible rooms
            user_room_ids = await self._get_user_accessible_rooms(user_email, session)
            
            if not user_room_ids:
                return self._empty_search_result(query)

            search_term = f"%{query.lower()}%"
            filters = filters or {}
            
            # Execute parallel searches
            results = {
                "rooms": await self._search_rooms(search_term, user_room_ids, filters, session),
                "documents": await self._search_documents(search_term, user_room_ids, filters, session),
                "messages": await self._search_messages(search_term, user_room_ids, filters, session),
                "vessels": await self._search_vessels(search_term, user_room_ids, filters, session),
                "activities": await self._search_activities(search_term, user_room_ids, filters, session)
            }

            # Calculate total results and add metadata
            total_results = sum(len(results[key]) for key in results)
            
            return {
                "query": query,
                "results": results,
                "total_results": total_results,
                "filters_applied": filters,
                "search_timestamp": datetime.utcnow().isoformat()
            }

        except Exception as e:
            logger.error(f"Error in global search: {e}")
            return self._empty_search_result(query)

    async def search_with_facets(
        self,
        query: str,
        user_email: str,
        session: AsyncSession = None
    ) -> Dict:
        """Search with faceted results for better filtering"""
        try:
            user_room_ids = await self._get_user_accessible_rooms(user_email, session)
            
            if not user_room_ids:
                return self._empty_search_result(query)

            search_term = f"%{query.lower()}%"
            
            # Get results with facets
            results = await self.global_search(query, user_email, {}, session)
            
            # Add facets for filtering
            facets = await self._generate_search_facets(search_term, user_room_ids, session)
            
            results["facets"] = facets
            return results

        except Exception as e:
            logger.error(f"Error in faceted search: {e}")
            return self._empty_search_result(query)

    async def get_search_suggestions(
        self,
        partial_query: str,
        user_email: str,
        session: AsyncSession = None
    ) -> List[Dict]:
        """Get search suggestions based on partial query"""
        try:
            if len(partial_query) < 2:
                return []

            user_room_ids = await self._get_user_accessible_rooms(user_email, session)
            
            if not user_room_ids:
                return []

            search_term = f"{partial_query.lower()}%"
            suggestions = []

            # Room title suggestions
            rooms_result = await session.execute(
                select(Room.title.distinct())
                .where(
                    and_(
                        Room.id.in_(user_room_ids),
                        func.lower(Room.title).like(search_term)
                    )
                )
                .limit(self.search_config["suggestion_limit"])
            )

            for title in rooms_result.scalars().all():
                suggestions.append({
                    "text": title,
                    "type": "room_title",
                    "category": "Rooms",
                    "relevance": 1.0
                })

            # Document type suggestions
            doc_types_result = await session.execute(
                select(DocumentType.name.distinct())
                .join(Document, DocumentType.id == Document.type_id)
                .where(
                    and_(
                        Document.room_id.in_(user_room_ids),
                        func.lower(DocumentType.name).like(search_term)
                    )
                )
                .limit(self.search_config["suggestion_limit"])
            )

            for doc_type in doc_types_result.scalars().all():
                suggestions.append({
                    "text": doc_type,
                    "type": "document_type",
                    "category": "Documents",
                    "relevance": 0.9
                })

            # Vessel name suggestions
            vessels_result = await session.execute(
                select(Vessel.name.distinct())
                .where(
                    and_(
                        Vessel.room_id.in_(user_room_ids),
                        func.lower(Vessel.name).like(search_term)
                    )
                )
                .limit(self.search_config["suggestion_limit"])
            )

            for vessel_name in vessels_result.scalars().all():
                suggestions.append({
                    "text": vessel_name,
                    "type": "vessel_name",
                    "category": "Vessels",
                    "relevance": 0.8
                })

            # Sort by relevance and limit
            suggestions.sort(key=lambda x: x["relevance"], reverse=True)
            return suggestions[:self.search_config["suggestion_limit"]]

        except Exception as e:
            logger.error(f"Error getting search suggestions: {e}")
            return []

    async def get_recent_searches(
        self,
        user_email: str,
        limit: int = 10
    ) -> List[str]:
        """Get recent search queries for a user"""
        try:
            # In a real implementation, this would query a search history table
            # For now, return empty list
            return []

        except Exception as e:
            logger.error(f"Error getting recent searches: {e}")
            return []

    async def _get_user_accessible_rooms(
        self,
        user_email: str,
        session: AsyncSession
    ) -> List[str]:
        """Get list of room IDs accessible by user"""
        try:
            user_rooms_result = await session.execute(
                select(Room.id).join(Party).where(Party.email == user_email)
            )
            return [str(room_id) for room_id in user_rooms_result.scalars().all()]

        except Exception as e:
            logger.error(f"Error getting user accessible rooms: {e}")
            return []

    async def _search_rooms(
        self,
        search_term: str,
        user_room_ids: List[str],
        filters: Dict,
        session: AsyncSession
    ) -> List[Dict]:
        """Search rooms"""
        try:
            conditions = [
                Room.id.in_(user_room_ids),
                or_(
                    func.lower(Room.title).like(search_term),
                    func.lower(Room.location).like(search_term),
                    func.lower(Room.description).like(search_term)
                )
            ]

            if filters.get("room_status"):
                conditions.append(Room.status == filters["room_status"])

            result = await session.execute(
                select(Room)
                .where(and_(*conditions))
                .limit(self.search_config["max_results"] // 5)
            )

            return [
                {
                    "id": str(room.id),
                    "title": room.title,
                    "location": room.location,
                    "description": room.description,
                    "status": room.status,
                    "sts_eta": room.sts_eta,
                    "created_at": room.created_at,
                    "type": "room",
                    "relevance_score": self._calculate_relevance(room.title, search_term)
                }
                for room in result.scalars().all()
            ]

        except Exception as e:
            logger.error(f"Error searching rooms: {e}")
            return []

    async def _search_documents(
        self,
        search_term: str,
        user_room_ids: List[str],
        filters: Dict,
        session: AsyncSession
    ) -> List[Dict]:
        """Search documents"""
        try:
            conditions = [
                Document.room_id.in_(user_room_ids),
                or_(
                    func.lower(DocumentType.name).like(search_term),
                    func.lower(DocumentType.code).like(search_term),
                    func.lower(Document.uploaded_by).like(search_term),
                    func.lower(Document.notes).like(search_term)
                )
            ]

            if filters.get("document_status"):
                conditions.append(Document.status == filters["document_status"])

            if filters.get("criticality"):
                conditions.append(DocumentType.criticality == filters["criticality"])

            result = await session.execute(
                select(Document, DocumentType, Room)
                .join(DocumentType, Document.type_id == DocumentType.id)
                .join(Room, Document.room_id == Room.id)
                .where(and_(*conditions))
                .limit(self.search_config["max_results"] // 5)
            )

            return [
                {
                    "id": str(doc.id),
                    "type_name": doc_type.name,
                    "type_code": doc_type.code,
                    "status": doc.status,
                    "priority": doc.priority,
                    "criticality": doc_type.criticality,
                    "room_title": room.title,
                    "room_id": str(room.id),
                    "uploaded_by": doc.uploaded_by,
                    "uploaded_at": doc.uploaded_at,
                    "expires_on": doc.expires_on,
                    "type": "document",
                    "relevance_score": self._calculate_relevance(doc_type.name, search_term)
                }
                for doc, doc_type, room in result.all()
            ]

        except Exception as e:
            logger.error(f"Error searching documents: {e}")
            return []

    async def _search_messages(
        self,
        search_term: str,
        user_room_ids: List[str],
        filters: Dict,
        session: AsyncSession
    ) -> List[Dict]:
        """Search messages"""
        try:
            conditions = [
                Message.room_id.in_(user_room_ids),
                or_(
                    func.lower(Message.content).like(search_term),
                    func.lower(Message.sender_name).like(search_term)
                )
            ]

            if filters.get("date_from"):
                conditions.append(Message.created_at >= filters["date_from"])

            if filters.get("date_to"):
                conditions.append(Message.created_at <= filters["date_to"])

            result = await session.execute(
                select(Message, Room)
                .join(Room, Message.room_id == Room.id)
                .where(and_(*conditions))
                .order_by(Message.created_at.desc())
                .limit(self.search_config["max_results"] // 5)
            )

            return [
                {
                    "id": str(message.id),
                    "sender_name": message.sender_name,
                    "sender_email": message.sender_email,
                    "content_preview": self._truncate_text(message.content, self.search_config["highlight_length"]),
                    "room_title": room.title,
                    "room_id": str(room.id),
                    "created_at": message.created_at,
                    "type": "message",
                    "relevance_score": self._calculate_relevance(message.content, search_term)
                }
                for message, room in result.all()
            ]

        except Exception as e:
            logger.error(f"Error searching messages: {e}")
            return []

    async def _search_vessels(
        self,
        search_term: str,
        user_room_ids: List[str],
        filters: Dict,
        session: AsyncSession
    ) -> List[Dict]:
        """Search vessels"""
        try:
            conditions = [
                Vessel.room_id.in_(user_room_ids),
                or_(
                    func.lower(Vessel.name).like(search_term),
                    func.lower(Vessel.imo).like(search_term),
                    func.lower(Vessel.vessel_type).like(search_term),
                    func.lower(Vessel.flag).like(search_term)
                )
            ]

            if filters.get("vessel_type"):
                conditions.append(Vessel.vessel_type == filters["vessel_type"])

            if filters.get("flag"):
                conditions.append(Vessel.flag == filters["flag"])

            result = await session.execute(
                select(Vessel, Room)
                .join(Room, Vessel.room_id == Room.id)
                .where(and_(*conditions))
                .limit(self.search_config["max_results"] // 5)
            )

            return [
                {
                    "id": str(vessel.id),
                    "name": vessel.name,
                    "imo": vessel.imo,
                    "vessel_type": vessel.vessel_type,
                    "flag": vessel.flag,
                    "status": vessel.status,
                    "room_title": room.title,
                    "room_id": str(room.id),
                    "type": "vessel",
                    "relevance_score": self._calculate_relevance(vessel.name, search_term)
                }
                for vessel, room in result.all()
            ]

        except Exception as e:
            logger.error(f"Error searching vessels: {e}")
            return []

    async def _search_activities(
        self,
        search_term: str,
        user_room_ids: List[str],
        filters: Dict,
        session: AsyncSession
    ) -> List[Dict]:
        """Search activity logs"""
        try:
            conditions = [
                ActivityLog.room_id.in_(user_room_ids),
                or_(
                    func.lower(ActivityLog.action).like(search_term),
                    func.lower(ActivityLog.actor).like(search_term)
                )
            ]

            if filters.get("action_type"):
                conditions.append(ActivityLog.action == filters["action_type"])

            result = await session.execute(
                select(ActivityLog, Room)
                .join(Room, ActivityLog.room_id == Room.id)
                .where(and_(*conditions))
                .order_by(ActivityLog.ts.desc())
                .limit(self.search_config["max_results"] // 5)
            )

            return [
                {
                    "id": str(activity.id),
                    "action": activity.action,
                    "actor": activity.actor,
                    "room_title": room.title,
                    "room_id": str(room.id),
                    "timestamp": activity.ts,
                    "meta": activity.meta_json,
                    "type": "activity",
                    "relevance_score": self._calculate_relevance(activity.action, search_term)
                }
                for activity, room in result.all()
            ]

        except Exception as e:
            logger.error(f"Error searching activities: {e}")
            return []

    async def _generate_search_facets(
        self,
        search_term: str,
        user_room_ids: List[str],
        session: AsyncSession
    ) -> Dict:
        """Generate search facets for filtering"""
        try:
            facets = {
                "document_status": {},
                "criticality": {},
                "vessel_type": {},
                "room_status": {}
            }

            # Document status facets
            doc_status_result = await session.execute(
                select(Document.status, func.count(Document.id))
                .where(Document.room_id.in_(user_room_ids))
                .group_by(Document.status)
            )

            for status, count in doc_status_result.all():
                facets["document_status"][status] = count

            # Criticality facets
            criticality_result = await session.execute(
                select(DocumentType.criticality, func.count(Document.id))
                .join(Document, DocumentType.id == Document.type_id)
                .where(Document.room_id.in_(user_room_ids))
                .group_by(DocumentType.criticality)
            )

            for criticality, count in criticality_result.all():
                facets["criticality"][criticality] = count

            return facets

        except Exception as e:
            logger.error(f"Error generating search facets: {e}")
            return {}

    def _calculate_relevance(self, text: str, search_term: str) -> float:
        """Calculate relevance score for search results"""
        try:
            if not text or not search_term:
                return 0.0

            text_lower = text.lower()
            search_lower = search_term.lower().replace('%', '')

            # Exact match gets highest score
            if search_lower in text_lower:
                return 1.0

            # Partial match gets lower score
            words = search_lower.split()
            matches = sum(1 for word in words if word in text_lower)
            return matches / len(words) if words else 0.0

        except Exception:
            return 0.0

    def _truncate_text(self, text: str, max_length: int) -> str:
        """Truncate text to specified length with ellipsis"""
        if not text:
            return ""
        
        if len(text) <= max_length:
            return text
        
        return text[:max_length] + "..."

    def _empty_search_result(self, query: str) -> Dict:
        """Return empty search result"""
        return {
            "query": query,
            "results": {
                "rooms": [],
                "documents": [],
                "messages": [],
                "vessels": [],
                "activities": []
            },
            "total_results": 0,
            "filters_applied": {},
            "search_timestamp": datetime.utcnow().isoformat()
        }


# Global instance
search_service = SearchService()

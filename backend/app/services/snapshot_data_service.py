"""
Snapshot Data Service
Gathers and prepares data for snapshot generation
"""

import json
import logging
from typing import Any, Dict, Optional

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import joinedload

from app.models import (
    Room,
    Party,
    Vessel,
    Document,
    DocumentType,
    Approval,
    ActivityLog,
)

logger = logging.getLogger(__name__)


class SnapshotDataService:
    """
    Service to gather and prepare data for snapshot generation
    """

    @staticmethod
    async def gather_room_snapshot_data(
        room_id: str,
        session: AsyncSession,
        include_documents: bool = True,
        include_activity: bool = True,
        include_approvals: bool = True,
        created_by: str = "system",
        snapshot_id: str = "unknown",
    ) -> Dict[str, Any]:
        """
        Gather all data needed for a room snapshot

        Args:
            room_id: Room ID
            session: AsyncSession
            include_documents: Include documents in snapshot
            include_activity: Include activity log in snapshot
            include_approvals: Include approvals in snapshot
            created_by: User who created the snapshot
            snapshot_id: Snapshot ID for metadata

        Returns:
            Dictionary with all room snapshot data
        """
        try:
            # Get room information
            room_stmt = select(Room).where(Room.id == room_id)
            room_result = await session.execute(room_stmt)
            room = room_result.scalar_one_or_none()

            if not room:
                logger.warning(f"Room {room_id} not found for snapshot data gathering")
                return {}

            # Get parties
            parties_stmt = select(Party).where(Party.room_id == room_id)
            parties_result = await session.execute(parties_stmt)
            parties = parties_result.scalars().all()

            parties_data = [
                {
                    "id": p.id,
                    "name": p.name,
                    "email": p.email,
                    "role": p.role,
                    "company": "N/A",  # Not in model, but included for completeness
                }
                for p in parties
            ]

            # Get vessels
            vessels_stmt = select(Vessel).where(Vessel.room_id == room_id)
            vessels_result = await session.execute(vessels_stmt)
            vessels = vessels_result.scalars().all()

            vessels_data = [
                {
                    "id": v.id,
                    "name": v.name,
                    "vessel_type": v.vessel_type,
                    "flag": v.flag,
                    "imo": v.imo,
                    "owner": v.owner or "N/A",
                    "charterer": v.charterer or "N/A",
                    "status": v.status,
                    "length": v.length,
                    "beam": v.beam,
                    "draft": v.draft,
                    "gross_tonnage": v.gross_tonnage,
                    "net_tonnage": v.net_tonnage,
                    "built_year": v.built_year,
                    "classification_society": v.classification_society or "N/A",
                }
                for v in vessels
            ]

            # Build response
            snapshot_data = {
                "id": room.id,
                "title": room.title,
                "location": room.location,
                "status": room.status,
                "sts_eta": room.sts_eta.isoformat() if room.sts_eta else "N/A",
                "created_at": room.created_at.isoformat() if room.created_at else "N/A",
                "created_by": room.created_by,
                "description": room.description or "N/A",
                "parties": parties_data,
                "vessels": vessels_data,
                "generated_by": created_by,
                "snapshot_id": snapshot_id,
            }

            # Get documents if requested
            if include_documents:
                documents = await SnapshotDataService._gather_documents(
                    room_id, session
                )
                snapshot_data["documents"] = documents

            # Get approvals if requested
            if include_approvals:
                approvals = await SnapshotDataService._gather_approvals(
                    room_id, session
                )
                snapshot_data["approvals"] = approvals

            # Get activity log if requested
            if include_activity:
                activities = await SnapshotDataService._gather_activities(
                    room_id, session
                )
                snapshot_data["activities"] = activities

            logger.info(
                f"Gathered snapshot data for room {room_id} - "
                f"Parties: {len(parties_data)}, Vessels: {len(vessels_data)}, "
                f"Documents: {len(snapshot_data.get('documents', []))}, "
                f"Activities: {len(snapshot_data.get('activities', []))}"
            )

            return snapshot_data

        except Exception as e:
            logger.error(f"Error gathering snapshot data for room {room_id}: {e}", exc_info=True)
            raise

    @staticmethod
    async def _gather_documents(room_id: str, session: AsyncSession) -> list:
        """Gather document information for room"""
        try:
            # Get documents with their types
            documents_stmt = (
                select(Document)
                .where(Document.room_id == room_id)
                .options(joinedload(Document.document_type))
            )
            documents_result = await session.execute(documents_stmt)
            documents = documents_result.unique().scalars().all()

            documents_data = [
                {
                    "id": d.id,
                    "type_id": d.type_id,
                    "type_name": d.document_type.name if d.document_type else "Unknown",
                    "status": d.status,
                    "uploaded_by": d.uploaded_by or "—",
                    "uploaded_at": d.uploaded_at.isoformat() if d.uploaded_at else "—",
                    "expires_on": d.expires_on.isoformat() if d.expires_on else "—",
                    "notes": d.notes or "",
                    "priority": d.priority,
                }
                for d in documents
            ]

            logger.debug(f"Gathered {len(documents_data)} documents for room {room_id}")
            return documents_data

        except Exception as e:
            logger.warning(f"Error gathering documents for room {room_id}: {e}")
            return []

    @staticmethod
    async def _gather_approvals(room_id: str, session: AsyncSession) -> list:
        """Gather approval information for room"""
        try:
            # Get approvals with party information
            approvals_stmt = (
                select(Approval)
                .where(Approval.room_id == room_id)
                .options(joinedload(Approval.party))
            )
            approvals_result = await session.execute(approvals_stmt)
            approvals = approvals_result.unique().scalars().all()

            approvals_data = [
                {
                    "id": a.id,
                    "party_id": a.party_id,
                    "party_name": a.party.name if a.party else "Unknown",
                    "party_role": a.party.role if a.party else "Unknown",
                    "party_email": a.party.email if a.party else "N/A",
                    "status": a.status,
                    "updated_at": a.updated_at.isoformat() if a.updated_at else "N/A",
                }
                for a in approvals
            ]

            logger.debug(f"Gathered {len(approvals_data)} approvals for room {room_id}")
            return approvals_data

        except Exception as e:
            logger.warning(f"Error gathering approvals for room {room_id}: {e}")
            return []

    @staticmethod
    async def _gather_activities(
        room_id: str, session: AsyncSession, limit: int = 100
    ) -> list:
        """Gather activity log for room"""
        try:
            # Get recent activities
            activities_stmt = (
                select(ActivityLog)
                .where(ActivityLog.room_id == room_id)
                .order_by(ActivityLog.ts.desc())
                .limit(limit)
            )
            activities_result = await session.execute(activities_stmt)
            activities = activities_result.scalars().all()

            activities_data = [
                {
                    "id": a.id,
                    "actor": a.actor,
                    "action": a.action,
                    "meta_json": a.meta_json or "{}",
                    "ts": a.ts.isoformat() if a.ts else "N/A",
                }
                for a in activities
            ]

            logger.debug(f"Gathered {len(activities_data)} activities for room {room_id}")
            return list(reversed(activities_data))  # Reverse to show oldest first

        except Exception as e:
            logger.warning(f"Error gathering activities for room {room_id}: {e}")
            return []


# Global service instance
snapshot_data_service = SnapshotDataService()
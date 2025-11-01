"""
Statistics router for STS Clearance system
Provides system-wide statistics and analytics
"""

import logging
from datetime import datetime, timedelta
from typing import Dict, List

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import and_, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_async_session
from app.dependencies import get_current_user
from app.models import (ActivityLog, Approval, Document, DocumentType, Message,
                        Party, Room)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/stats", tags=["statistics"])


@router.get("/dashboard")
async def get_dashboard_stats(
    current_user: dict = Depends(get_current_user),
    session: AsyncSession = Depends(get_async_session),
):
    """
    Get dashboard statistics for the current user
    """
    try:
        user_email = current_user.email

        # Get user's rooms
        user_rooms_result = await session.execute(
            select(Room.id).join(Party).where(Party.email == user_email)
        )
        user_room_ids = [str(room_id) for room_id in user_rooms_result.scalars().all()]

        if not user_room_ids:
            return {
                "total_rooms": 0,
                "active_operations": 0,
                "pending_approvals": 0,
                "documents_summary": {
                    "total": 0,
                    "approved": 0,
                    "missing": 0,
                    "under_review": 0,
                },
                "recent_activity": [],
                "upcoming_deadlines": [],
            }

        # Total rooms
        total_rooms = len(user_room_ids)

        # Active operations (rooms with ETA in future)
        active_ops_result = await session.execute(
            select(func.count(Room.id)).where(
                and_(Room.id.in_(user_room_ids), Room.sts_eta > datetime.utcnow())
            )
        )
        active_operations = active_ops_result.scalar()

        # Pending approvals
        pending_approvals_result = await session.execute(
            select(func.count(Approval.id)).where(
                and_(Approval.room_id.in_(user_room_ids), Approval.status == "pending")
            )
        )
        pending_approvals = pending_approvals_result.scalar()

        # Documents summary
        docs_result = await session.execute(
            select(Document.status, func.count(Document.id))
            .where(Document.room_id.in_(user_room_ids))
            .group_by(Document.status)
        )

        documents_summary = {"total": 0, "approved": 0, "missing": 0, "under_review": 0}
        for status, count in docs_result.all():
            documents_summary["total"] += count
            if status in documents_summary:
                documents_summary[status] = count

        # Recent activity (last 7 days)
        recent_activity_result = await session.execute(
            select(ActivityLog)
            .where(
                and_(
                    ActivityLog.room_id.in_(user_room_ids),
                    ActivityLog.ts >= datetime.utcnow() - timedelta(days=7),
                )
            )
            .order_by(ActivityLog.ts.desc())
            .limit(10)
        )

        recent_activity = []
        for activity in recent_activity_result.scalars().all():
            recent_activity.append(
                {
                    "id": str(activity.id),
                    "actor": activity.actor,
                    "action": activity.action,
                    "timestamp": activity.ts,
                    "room_id": str(activity.room_id),
                }
            )

        # Upcoming deadlines (documents expiring in next 30 days)
        upcoming_deadlines_result = await session.execute(
            select(Document, DocumentType, Room)
            .join(DocumentType, Document.type_id == DocumentType.id)
            .join(Room, Document.room_id == Room.id)
            .where(
                and_(
                    Document.room_id.in_(user_room_ids),
                    Document.expires_on.isnot(None),
                    Document.expires_on <= datetime.utcnow() + timedelta(days=30),
                    Document.expires_on > datetime.utcnow(),
                )
            )
            .order_by(Document.expires_on)
            .limit(10)
        )

        upcoming_deadlines = []
        for doc, doc_type, room in upcoming_deadlines_result.all():
            days_until_expiry = (doc.expires_on - datetime.utcnow()).days
            upcoming_deadlines.append(
                {
                    "document_id": str(doc.id),
                    "document_type": doc_type.name,
                    "room_title": room.title,
                    "room_id": str(room.id),
                    "expires_on": doc.expires_on,
                    "days_until_expiry": days_until_expiry,
                }
            )

        return {
            "total_rooms": total_rooms,
            "active_operations": active_operations,
            "pending_approvals": pending_approvals,
            "documents_summary": documents_summary,
            "recent_activity": recent_activity,
            "upcoming_deadlines": upcoming_deadlines,
        }

    except Exception as e:
        logger.error(f"Error getting dashboard stats: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")


@router.get("/room/{room_id}/analytics")
async def get_room_analytics(
    room_id: str,
    current_user: dict = Depends(get_current_user),
    session: AsyncSession = Depends(get_async_session),
):
    """
    Get detailed analytics for a specific room
    """
    try:
        user_email = current_user.email

        # Verify user has access to room
        from app.dependencies import require_room_access

        await require_room_access(room_id, user_email, session)

        # Get room info
        room_result = await session.execute(select(Room).where(Room.id == room_id))
        room = room_result.scalar_one_or_none()

        if not room:
            raise HTTPException(status_code=404, detail="Room not found")

        # Document completion rate
        docs_result = await session.execute(
            select(Document.status, func.count(Document.id))
            .where(Document.room_id == room_id)
            .group_by(Document.status)
        )

        doc_stats = {"total": 0, "approved": 0, "missing": 0, "under_review": 0}
        for status, count in docs_result.all():
            doc_stats["total"] += count
            if status in doc_stats:
                doc_stats[status] = count

        completion_rate = (
            (doc_stats["approved"] / doc_stats["total"] * 100)
            if doc_stats["total"] > 0
            else 0
        )

        # Party participation
        parties_result = await session.execute(
            select(Party).where(Party.room_id == room_id)
        )
        parties = parties_result.scalars().all()

        party_stats = {}
        for party in parties:
            party_stats[party.role] = party_stats.get(party.role, 0) + 1

        # Message activity (last 30 days)
        messages_result = await session.execute(
            select(func.count(Message.id)).where(
                and_(
                    Message.room_id == room_id,
                    Message.created_at >= datetime.utcnow() - timedelta(days=30),
                )
            )
        )
        message_count = messages_result.scalar()

        # Activity timeline (last 30 days)
        activity_result = await session.execute(
            select(ActivityLog)
            .where(
                and_(
                    ActivityLog.room_id == room_id,
                    ActivityLog.ts >= datetime.utcnow() - timedelta(days=30),
                )
            )
            .order_by(ActivityLog.ts.desc())
        )

        activities = []
        for activity in activity_result.scalars().all():
            activities.append(
                {
                    "id": str(activity.id),
                    "actor": activity.actor,
                    "action": activity.action,
                    "timestamp": activity.ts,
                }
            )

        # Approval status
        approvals_result = await session.execute(
            select(Approval.status, func.count(Approval.id))
            .where(Approval.room_id == room_id)
            .group_by(Approval.status)
        )

        approval_stats = {"pending": 0, "approved": 0, "rejected": 0}
        for status, count in approvals_result.all():
            if status in approval_stats:
                approval_stats[status] = count

        return {
            "room_info": {
                "id": str(room.id),
                "title": room.title,
                "location": room.location,
                "sts_eta": room.sts_eta,
                "created_at": room.created_at,
            },
            "document_stats": doc_stats,
            "completion_rate": round(completion_rate, 2),
            "party_stats": party_stats,
            "message_count_30d": message_count,
            "approval_stats": approval_stats,
            "recent_activities": activities[:20],  # Last 20 activities
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting room analytics: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")


@router.get("/system/health")
async def get_system_health(session: AsyncSession = Depends(get_async_session)):
    """
    Get system health statistics (public endpoint)
    """
    try:
        # Total rooms
        total_rooms_result = await session.execute(select(func.count(Room.id)))
        total_rooms = total_rooms_result.scalar()

        # Active operations
        active_ops_result = await session.execute(
            select(func.count(Room.id)).where(Room.sts_eta > datetime.utcnow())
        )
        active_operations = active_ops_result.scalar()

        # Total documents
        total_docs_result = await session.execute(select(func.count(Document.id)))
        total_documents = total_docs_result.scalar()

        # Messages in last 24h
        messages_24h_result = await session.execute(
            select(func.count(Message.id)).where(
                Message.created_at >= datetime.utcnow() - timedelta(hours=24)
            )
        )
        messages_24h = messages_24h_result.scalar()

        return {
            "status": "healthy",
            "timestamp": datetime.utcnow(),
            "stats": {
                "total_rooms": total_rooms,
                "active_operations": active_operations,
                "total_documents": total_documents,
                "messages_24h": messages_24h,
            },
        }

    except Exception as e:
        logger.error(f"Error getting system health: {e}")
        return {"status": "unhealthy", "timestamp": datetime.utcnow(), "error": str(e)}

"""
Dependencies for FastAPI endpoints
Handles database sessions, feature flags, and user permissions
"""

import json
import logging
from typing import Optional

from fastapi import Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_async_session
from app.models import DocumentType, FeatureFlag, Party, Room, User
from app.schemas import PartyRole

logger = logging.getLogger(__name__)


async def check_feature_flag(
    flag_key: str, session: AsyncSession = Depends(get_async_session)
) -> bool:
    """
    Check if a feature flag is enabled

    Args:
        flag_key: Feature flag key to check
        session: Database session

    Returns:
        True if enabled, False otherwise
    """
    try:
        result = await session.execute(
            select(FeatureFlag).where(FeatureFlag.key == flag_key)
        )
        feature_flag = result.scalar_one_or_none()

        if not feature_flag:
            logger.warning(f"Feature flag {flag_key} not found, defaulting to disabled")
            return False

        return feature_flag.enabled
    except Exception as e:
        logger.error(f"Error checking feature flag {flag_key}: {e}")
        return False


async def require_cockpit_feature(
    session: AsyncSession = Depends(get_async_session),
) -> bool:
    """
    Require the cockpit feature flag to be enabled

    Args:
        session: Database session

    Returns:
        True if enabled

    Raises:
        HTTPException: If feature flag is disabled
    """
    enabled = await check_feature_flag("cockpit_missing_expiring_docs", session)
    if not enabled:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Missing & Expiring Documents Cockpit is not enabled",
        )
    return True


# Alias for backward compatibility
cockpit_enabled = require_cockpit_feature


async def get_user_party(
    room_id: str, user_email: str, session: AsyncSession = Depends(get_async_session)
) -> Optional[Party]:
    """
    Get user's party information for a specific room

    Args:
        room_id: Room identifier
        user_email: User's email address
        session: Database session

    Returns:
        Party object or None if not found
    """
    try:
        result = await session.execute(
            select(Party).where(Party.room_id == room_id, Party.email == user_email)
        )
        return result.scalar_one_or_none()
    except Exception as e:
        logger.error(f"Error getting user party: {e}")
        return None


async def get_user_accessible_vessels(
    room_id: str, user_email: str, session: AsyncSession
) -> list[str]:
    """
    Get list of vessel IDs that the user has access to based on their role and vessel ownership

    Args:
        room_id: Room identifier
        user_email: User's email address
        session: Database session

    Returns:
        List of vessel IDs the user can access
    """
    try:
        from app.models import Vessel, User

        # Get user role
        user_result = await session.execute(
            select(User).where(User.email == user_email)
        )
        user = user_result.scalar_one_or_none()

        if not user:
            return []

        user_role = user.role

        # Get all vessels in the room
        vessels_result = await session.execute(
            select(Vessel).where(Vessel.room_id == room_id)
        )
        vessels = vessels_result.scalars().all()

        accessible_vessel_ids = []

        for vessel in vessels:
            # Brokers see everything
            if user_role == "broker":
                accessible_vessel_ids.append(str(vessel.id))
                continue

            # Charterers see vessels under their charter
            if user_role == "charterer":
                if vessel.charterer and vessel.charterer.lower() in user.company.lower():
                    accessible_vessel_ids.append(str(vessel.id))
                continue

            # Owners see only their vessels
            if user_role == "owner":
                if vessel.owner and vessel.owner.lower() in user.company.lower():
                    accessible_vessel_ids.append(str(vessel.id))
                continue

            # Other roles (seller, buyer) - no vessel-specific access for now
            # They can see room-level data but not vessel-specific data

        return accessible_vessel_ids

    except Exception as e:
        logger.error(f"Error getting user accessible vessels: {e}")
        return []


async def require_room_access(
    room_id: str, user_email: str, session: AsyncSession
) -> bool:
    """
    Require user to have access to a specific room

    Args:
        room_id: Room identifier
        user_email: User's email address
        session: Database session

    Returns:
        True if user has access

    Raises:
        HTTPException: If user doesn't have access
    """
    try:
        # Check if room exists
        room_result = await session.execute(select(Room).where(Room.id == room_id))
        room = room_result.scalar_one_or_none()

        if not room:
            raise HTTPException(status_code=404, detail="Room not found")

        # Check if user is a party in the room
        party = await get_user_party(room_id, user_email, session)

        if not party:
            # Check if user is the room creator
            if room.created_by == user_email:
                # Auto-add room creator as owner party
                from app.models import Party, User

                user_result = await session.execute(
                    select(User).where(User.email == user_email)
                )
                user = user_result.scalar_one_or_none()

                if user:
                    new_party = Party(
                        room_id=room_id, role="owner", name=user.name, email=user.email
                    )
                    session.add(new_party)
                    await session.commit()
                    return True

            # For demo/development purposes, auto-add any authenticated user as a viewer party
            # This allows testing without manually adding users to parties
            from app.models import User

            user_result = await session.execute(
                select(User).where(User.email == user_email)
            )
            user = user_result.scalar_one_or_none()

            if user:
                # Check if this is a demo/development environment
                import os
                if os.getenv("DEBUG", "false").lower() == "true" or os.getenv("DEMO_MODE", "false").lower() == "true":
                    new_party = Party(
                        room_id=room_id, role="viewer", name=user.name, email=user.email
                    )
                    session.add(new_party)
                    await session.commit()
                    logger.info(f"Auto-added user {user_email} as viewer to room {room_id} for demo purposes")
                    return True

            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied: User is not a party in this room",
            )

        return True

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error checking room access: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Internal server error",
        )


async def require_owner_permission(
    room_id: str, user_email: str, session: AsyncSession = Depends(get_async_session)
) -> Party:
    """
    Require user to have owner permission for a specific room

    Args:
        room_id: Room identifier
        user_email: User's email address
        session: Database session

    Returns:
        Party object if user has owner permission

    Raises:
        HTTPException: If user doesn't have owner permission
    """
    try:
        # Check if user has access to the room
        await require_room_access(room_id, user_email, session)

        # Get user's party information
        party = await get_user_party(room_id, user_email, session)

        if not party:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied: User party not found",
            )

        # Check if user has owner role
        if party.role != PartyRole.OWNER:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied: Owner permission required",
            )

        return party

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error checking owner permission: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Internal server error",
        )


async def log_activity(
    room_id: str,
    actor: str,
    action: str,
    meta: dict,
    session: Optional[AsyncSession] = None,
) -> None:
    """
    Log an activity in the activity log

    Args:
        room_id: Room identifier
        actor: User performing the action
        action: Action being performed
        meta: Additional metadata about the action
        session: Database session (optional, will create new if not provided)
    """
    try:
        from app.models import ActivityLog

        # Create new session if not provided
        if session is None:
            from app.database import get_async_session

            async for db_session in get_async_session():
                session = db_session
                break

        # Create activity log entry
        activity_log = ActivityLog(
            room_id=room_id,
            actor=actor,
            action=action,
            meta_json=json.dumps(meta) if meta else None,
        )

        session.add(activity_log)
        await session.commit()

        logger.info(f"Activity logged: {actor} performed {action} in room {room_id}")

    except Exception as e:
        logger.error(f"Error logging activity: {e}")
        # Don't raise exception as this is not critical for the main operation


async def require_charterer_permission(
    room_id: str, user_email: str, session: AsyncSession = Depends(get_async_session)
) -> Party:
    """
    Require user to have charterer permission for a specific room

    Args:
        room_id: Room identifier
        user_email: User's email address
        session: Database session

    Returns:
        Party object if user has charterer permission

    Raises:
        HTTPException: If user doesn't have charterer permission
    """
    try:
        # Check if user has access to the room
        await require_room_access(room_id, user_email, session)

        # Get user's party information
        party = await get_user_party(room_id, user_email, session)

        if not party:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied: User party not found",
            )

        # Check if user has charterer role
        if party.role != PartyRole.CHARTERER:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied: Charterer permission required",
            )

        return party

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error checking charterer permission: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Internal server error",
        )


async def require_broker_permission(
    room_id: str, user_email: str, session: AsyncSession = Depends(get_async_session)
) -> Party:
    """
    Require user to have broker permission for a specific room

    Args:
        room_id: Room identifier
        user_email: User's email address
        session: Database session

    Returns:
        Party object if user has broker permission

    Raises:
        HTTPException: If user doesn't have broker permission
    """
    try:
        # Check if user has access to the room
        await require_room_access(room_id, user_email, session)

        # Get user's party information
        party = await get_user_party(room_id, user_email, session)

        if not party:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied: User party not found",
            )

        # Check if user has broker role
        if party.role != PartyRole.BROKER:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied: Broker permission required",
            )

        return party

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error checking broker permission: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Internal server error",
        )


async def require_any_party_permission(
    room_id: str, user_email: str, session: AsyncSession = Depends(get_async_session)
) -> Party:
    """
    Require user to be any party in a specific room

    Args:
        room_id: Room identifier
        user_email: User's email address
        session: Database session

    Returns:
        Party object if user is a party

    Raises:
        HTTPException: If user is not a party
    """
    try:
        # Check if user has access to the room
        await require_room_access(room_id, user_email, session)

        # Get user's party information
        party = await get_user_party(room_id, user_email, session)

        if not party:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied: User party not found",
            )

        return party

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error checking party permission: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Internal server error",
        )


async def get_room_info(
    room_id: str, session: AsyncSession = Depends(get_async_session)
) -> Room:
    """
    Get room information by ID

    Args:
        room_id: Room identifier
        session: Database session

    Returns:
        Room object

    Raises:
        HTTPException: If room not found
    """
    try:
        result = await session.execute(select(Room).where(Room.id == room_id))
        room = result.scalar_one_or_none()

        if not room:
            raise HTTPException(status_code=404, detail="Room not found")

        return room

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting room info: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Internal server error",
        )


async def validate_document_type(
    document_type_code: str, session: AsyncSession = Depends(get_async_session)
) -> DocumentType:
    """
    Validate that a document type exists and is valid

    Args:
        document_type_code: Document type code to validate
        session: Database session

    Returns:
        DocumentType object if valid

    Raises:
        HTTPException: If document type is invalid
    """
    try:
        from app.models import DocumentType

        result = await session.execute(
            select(DocumentType).where(DocumentType.code == document_type_code)
        )
        document_type = result.scalar_one_or_none()

        if not document_type:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid document type: {document_type_code}",
            )

        return document_type

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error validating document type: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Internal server error",
        )


import os
from datetime import datetime, timedelta

import jwt
# OAuth2 authentication dependencies
from fastapi.security import OAuth2PasswordBearer

# OAuth2 scheme for token authentication
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login")

# JWT configuration
SECRET_KEY = os.getenv("SECRET_KEY", "sts-clearance-hub-secret-key-2024")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24 * 7  # 7 days


def create_access_token(data: dict, expires_delta: timedelta = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt


async def get_current_user(
    token: str = Depends(oauth2_scheme),
    session: AsyncSession = Depends(get_async_session),
) -> User:
    """
    Get current authenticated user as SQLAlchemy object
    """
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        email: str = payload.get("sub")
        if email is None:
            raise credentials_exception
    except jwt.PyJWTError:
        raise credentials_exception

    # CAMBIO: Retornar objeto User, no diccionario
    result = await session.execute(select(User).where(User.email == email).limit(1))
    user = result.scalar_one_or_none()
    if user is None:
        raise credentials_exception
    # Retornar el objeto User completo
    return user


def get_user_role_permissions(role: str) -> dict:
    """
    Get permissions for a user role
    """
    permissions = {
        "admin": {
            "can_create_rooms": True,
            "can_edit_rooms": True,
            "can_delete_rooms": True,
            "can_add_parties": True,
            "can_remove_parties": True,
            "can_upload_documents": True,
            "can_approve_documents": True,
            "can_create_snapshots": True,
        },
        "owner": {
            "can_create_rooms": True,
            "can_edit_rooms": True,
            "can_delete_rooms": True,
            "can_add_parties": True,
            "can_remove_parties": True,
            "can_upload_documents": True,
            "can_approve_documents": True,
            "can_create_snapshots": True,
        },
        "broker": {
            "can_create_rooms": True,
            "can_edit_rooms": True,
            "can_delete_rooms": False,
            "can_add_parties": True,
            "can_remove_parties": True,
            "can_upload_documents": True,
            "can_approve_documents": True,
            "can_create_snapshots": True,
        },
        "seller": {
            "can_create_rooms": False,
            "can_edit_rooms": False,
            "can_delete_rooms": False,
            "can_add_parties": False,
            "can_remove_parties": False,
            "can_upload_documents": True,
            "can_approve_documents": True,
            "can_create_snapshots": False,
        },
        "buyer": {
            "can_create_rooms": False,
            "can_edit_rooms": False,
            "can_delete_rooms": False,
            "can_add_parties": False,
            "can_remove_parties": False,
            "can_upload_documents": True,
            "can_approve_documents": True,
            "can_create_snapshots": False,
        },
        "charterer": {
            "can_create_rooms": False,
            "can_edit_rooms": False,
            "can_delete_rooms": False,
            "can_add_parties": False,
            "can_remove_parties": False,
            "can_upload_documents": True,
            "can_approve_documents": True,
            "can_create_snapshots": False,
        },
    }

    return permissions.get(role, {})

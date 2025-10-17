"""
Permission Decorators for FastAPI Endpoints
Provides reusable decorators for permission validation
"""

import functools
import logging
from typing import Callable, Optional

from fastapi import Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_async_session
from app.dependencies import get_current_user
from app.permission_manager import permission_manager

logger = logging.getLogger(__name__)


def require_permission(resource: str, action: str):
    """
    Decorator to require specific permission for an endpoint

    Args:
        resource: Resource name (documents, approvals, users, etc.)
        action: Action name (view, approve, delete, etc.)

    Usage:
        @router.post("/documents/{id}/approve")
        @require_permission("documents", "approve")
        async def approve_document(...):
            # No manual permission check needed
            pass
    """

    def decorator(func: Callable) -> Callable:
        @functools.wraps(func)
        async def wrapper(*args, **kwargs):
            # Extract dependencies from kwargs
            current_user: dict = kwargs.get("current_user")
            session: AsyncSession = kwargs.get("session")
            room_id: str = kwargs.get("room_id")

            if not current_user:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Not authenticated",
                )

            if not session:
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail="Database session not available",
                )

            user_email = current_user.get("email")

            # Check permission
            allowed, error_msg = await permission_manager.check_permission(
                user_email=user_email,
                resource=resource,
                action=action,
                room_id=room_id or "system",
                session=session,
                audit=True,
            )

            if not allowed:
                logger.warning(
                    f"Permission denied: {user_email} tried to {action} {resource} in room {room_id}"
                )
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail=error_msg
                    or f"Permission denied to {action} {resource}",
                )

            # Permission granted, proceed with endpoint logic
            return await func(*args, **kwargs)

        return wrapper

    return decorator


def require_vessel_access(param_name: str = "vessel_id"):
    """
    Decorator to require access to a specific vessel

    Args:
        param_name: Name of the path/query parameter containing vessel_id

    Usage:
        @router.get("/vessels/{vessel_id}/documents")
        @require_vessel_access("vessel_id")
        async def get_vessel_documents(vessel_id: str, ...):
            # User automatically validated for vessel access
            pass
    """

    def decorator(func: Callable) -> Callable:
        @functools.wraps(func)
        async def wrapper(*args, **kwargs):
            # Extract dependencies
            current_user: dict = kwargs.get("current_user")
            session: AsyncSession = kwargs.get("session")
            room_id: str = kwargs.get("room_id")
            vessel_id: str = kwargs.get(param_name)

            if not current_user:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Not authenticated",
                )

            if not vessel_id:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Missing {param_name}",
                )

            user_email = current_user.get("email")

            # Check vessel access
            allowed, error_msg = await permission_manager.check_vessel_access(
                user_email=user_email,
                vessel_id=vessel_id,
                room_id=room_id or "system",
                session=session,
                audit=True,
            )

            if not allowed:
                logger.warning(
                    f"Vessel access denied: {user_email} tried to access vessel {vessel_id} in room {room_id}"
                )
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail=error_msg or "Access denied to vessel",
                )

            # Access granted, proceed
            return await func(*args, **kwargs)

        return wrapper

    return decorator


def require_any_permission(permissions: list[tuple[str, str]]):
    """
    Decorator to require ANY of the specified permissions

    Args:
        permissions: List of (resource, action) tuples

    Usage:
        @router.get("/documents/{id}")
        @require_any_permission([
            ("documents", "view"),
            ("documents", "download")
        ])
        async def get_document(...):
            pass
    """

    def decorator(func: Callable) -> Callable:
        @functools.wraps(func)
        async def wrapper(*args, **kwargs):
            current_user: dict = kwargs.get("current_user")
            session: AsyncSession = kwargs.get("session")
            room_id: str = kwargs.get("room_id")

            if not current_user:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Not authenticated",
                )

            user_email = current_user.get("email")

            # Check if user has ANY of the permissions
            has_any_permission = False
            for resource, action in permissions:
                allowed, _ = await permission_manager.check_permission(
                    user_email=user_email,
                    resource=resource,
                    action=action,
                    room_id=room_id or "system",
                    session=session,
                    audit=False,  # Don't audit each check, only the final result
                )

                if allowed:
                    has_any_permission = True
                    break

            if not has_any_permission:
                permission_str = ", ".join([f"{r}.{a}" for r, a in permissions])
                logger.warning(
                    f"Permission denied: {user_email} needs one of {permission_str}"
                )
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail=f"Requires one of: {permission_str}",
                )

            # At least one permission granted, proceed
            return await func(*args, **kwargs)

        return wrapper

    return decorator


def require_all_permissions(permissions: list[tuple[str, str]]):
    """
    Decorator to require ALL of the specified permissions

    Args:
        permissions: List of (resource, action) tuples

    Usage:
        @router.post("/documents/{id}/approve")
        @require_all_permissions([
            ("documents", "approve"),
            ("documents", "view")
        ])
        async def approve_document(...):
            pass
    """

    def decorator(func: Callable) -> Callable:
        @functools.wraps(func)
        async def wrapper(*args, **kwargs):
            current_user: dict = kwargs.get("current_user")
            session: AsyncSession = kwargs.get("session")
            room_id: str = kwargs.get("room_id")

            if not current_user:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Not authenticated",
                )

            user_email = current_user.get("email")

            # Check if user has ALL permissions
            missing_permissions = []
            for resource, action in permissions:
                allowed, error_msg = await permission_manager.check_permission(
                    user_email=user_email,
                    resource=resource,
                    action=action,
                    room_id=room_id or "system",
                    session=session,
                    audit=False,
                )

                if not allowed:
                    missing_permissions.append(f"{resource}.{action}")

            if missing_permissions:
                logger.warning(
                    f"Permission denied: {user_email} missing {missing_permissions}"
                )
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail=f"Missing permissions: {', '.join(missing_permissions)}",
                )

            # All permissions granted, proceed
            return await func(*args, **kwargs)

        return wrapper

    return decorator


def require_role(*allowed_roles: str):
    """
    Decorator to require specific roles

    Args:
        allowed_roles: Role names that are allowed (owner, broker, admin, etc.)

    Usage:
        @router.delete("/users/{user_id}")
        @require_role("admin")
        async def delete_user(...):
            pass

        @router.post("/rooms")
        @require_role("admin", "broker")
        async def create_room(...):
            pass
    """

    def decorator(func: Callable) -> Callable:
        @functools.wraps(func)
        async def wrapper(*args, **kwargs):
            current_user: dict = kwargs.get("current_user")

            if not current_user:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Not authenticated",
                )

            user_role = current_user.get("role")

            if user_role not in allowed_roles:
                roles_str = ", ".join(allowed_roles)
                logger.warning(
                    f"Role check failed: {current_user.get('email')} has role '{user_role}', "
                    f"required: {roles_str}"
                )
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail=f"Requires one of these roles: {roles_str}",
                )

            # Role check passed, proceed
            return await func(*args, **kwargs)

        return wrapper

    return decorator
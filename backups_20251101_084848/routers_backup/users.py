"""
Users router for STS Clearance system
Handles user management operations
"""

import logging
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy import desc, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_async_session
from app.dependencies import get_current_user, get_user_role_permissions
from app.models import User
from app.permission_decorators import require_role
from app.permission_manager import PermissionManager

logger = logging.getLogger(__name__)
permission_manager = PermissionManager()

router = APIRouter(prefix="/api/v1", tags=["users"])


# Response schemas
class UserResponse(BaseModel):
    id: str
    email: str
    name: str
    role: str
    created_at: str


class UpdateUserRequest(BaseModel):
    name: Optional[str] = None
    role: Optional[str] = None


@router.get("/users", response_model=List[UserResponse])
async def get_users(
    limit: int = 50,
    offset: int = 0,
    role_filter: Optional[str] = None,
    current_user: dict = Depends(get_current_user),
    session: AsyncSession = Depends(get_async_session),
):
    """
    Get all users (admin and owner only)
    """
    try:
        user_role = current_user.role

        # Check permissions
        if user_role not in ["admin", "owner"]:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only admins and owners can view all users",
            )

        # Build query
        query = select(User)

        if role_filter:
            query = query.where(User.role == role_filter)

        query = query.order_by(desc(User.created_at)).offset(offset).limit(limit)

        result = await session.execute(query)
        users = result.scalars().all()

        return [
            UserResponse(
                id=str(user.id),
                email=user.email,
                name=user.name,
                role=user.role,
                created_at=user.created_at.isoformat(),
            )
            for user in users
        ]

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting users: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")


@router.get("/users/{user_id}", response_model=UserResponse)
async def get_user(
    user_id: str,
    current_user: dict = Depends(get_current_user),
    session: AsyncSession = Depends(get_async_session),
):
    """
    Get user by ID (admin, owner, or self only)
    """
    try:
        user_role = current_user.role
        user_email = current_user.email

        # Get target user
        result = await session.execute(select(User).where(User.id == user_id))
        target_user = result.scalar_one_or_none()

        if not target_user:
            raise HTTPException(status_code=404, detail="User not found")

        # Check permissions (admin, owner, or self)
        if user_role not in ["admin", "owner"] and target_user.email != user_email:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You can only view your own profile",
            )

        return UserResponse(
            id=str(target_user.id),
            email=target_user.email,
            name=target_user.name,
            role=target_user.role,
            created_at=target_user.created_at.isoformat(),
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting user: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")


@router.put("/users/{user_id}", response_model=UserResponse)
async def update_user(
    user_id: str,
    update_data: UpdateUserRequest,
    current_user: dict = Depends(get_current_user),
    session: AsyncSession = Depends(get_async_session),
):
    """
    Update user (admin, owner, or self only)
    
    Permission rules:
    - Self: Can edit own name only
    - Admin/Owner: Can edit anyone's profile and change roles
    - Role changes: Requires admin/owner permission
    """
    try:
        user_role = current_user.role
        user_email = current_user.email

        # Get target user
        result = await session.execute(select(User).where(User.id == user_id))
        target_user = result.scalar_one_or_none()

        if not target_user:
            raise HTTPException(status_code=404, detail="User not found")

        # ✅ PERMISSION CHECK - Using PermissionManager for complex logic
        is_self = target_user.email == user_email
        can_edit_others = user_role in ["admin", "owner"]

        # Check if trying to edit someone else's profile
        if not is_self and not can_edit_others:
            # Log permission denial
            await permission_manager.check_permission(
                user_email, "users", "update", None, session, audit=True
            )
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You can only edit your own profile",
            )

        # Check role change permission
        if update_data.role and update_data.role != target_user.role:
            # Audit role change attempt
            allowed, error = await permission_manager.check_permission(
                user_email, "users", "change_role", None, session, audit=True
            )
            
            if not can_edit_others:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Only admins and owners can change user roles",
                )

            # Validate role
            valid_roles = ["owner", "seller", "buyer", "charterer", "broker", "admin"]
            if update_data.role not in valid_roles:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Invalid role. Must be one of: {', '.join(valid_roles)}",
                )

        # Update fields
        if update_data.name is not None:
            target_user.name = update_data.name

        if update_data.role is not None:
            target_user.role = update_data.role

        await session.commit()

        return UserResponse(
            id=str(target_user.id),
            email=target_user.email,
            name=target_user.name,
            role=target_user.role,
            created_at=target_user.created_at.isoformat(),
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating user: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")


@router.delete("/users/{user_id}")
@require_role("admin")
async def delete_user(
    user_id: str,
    current_user: dict = Depends(get_current_user),
    session: AsyncSession = Depends(get_async_session),
):
    """
    Delete user (admin only)
    
    Permission validation is handled by @require_role decorator
    """
    try:
        user_role = current_user.role
        user_email = current_user.email

        # Get target user
        result = await session.execute(select(User).where(User.id == user_id))
        target_user = result.scalar_one_or_none()

        if not target_user:
            raise HTTPException(status_code=404, detail="User not found")

        # Prevent self-deletion
        if target_user.email == user_email:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="You cannot delete your own account",
            )

        from sqlalchemy import delete as delete_stmt
        await session.execute(delete_stmt(User).where(User.id == user_id))
        await session.commit()

        return {"message": "User deleted successfully"}

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting user: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")

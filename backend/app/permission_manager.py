"""
Centralized Permission Manager for STS Clearance Hub
Handles permission checks, vessel access, and audit logging
"""

import logging
from typing import Optional, Tuple

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import User, Vessel, Party
from app.permission_matrix import PermissionMatrix

logger = logging.getLogger(__name__)


class PermissionManager:
    """
    Central permission manager for handling all permission-related operations
    Integrates with PermissionMatrix and provides audit logging
    """

    def __init__(self):
        self.permission_matrix = PermissionMatrix()

    async def check_permission(
        self,
        user_email: str,
        resource: str,
        action: str,
        room_id: str,
        session: AsyncSession,
        audit: bool = True,
    ) -> Tuple[bool, Optional[str]]:
        """
        Check if user has permission to perform an action on a resource

        Args:
            user_email: User's email address
            resource: Resource name (documents, approvals, users, etc.)
            action: Action to perform (view, approve, delete, etc.)
            room_id: Room context
            session: Database session
            audit: Whether to audit this permission check

        Returns:
            Tuple of (allowed: bool, error_message: Optional[str])
        """
        try:
            # Get user role
            user = await self._get_user(user_email, session)
            if not user:
                error_msg = f"User not found: {user_email}"
                if audit:
                    await self.audit_permission_check(
                        user_email, resource, action, room_id, False, error_msg, session
                    )
                return False, error_msg

            user_role = user.role

            # Check permission in matrix
            allowed, msg = self.permission_matrix.validate_permission(
                user_role, resource, action
            )

            if not allowed:
                if audit:
                    await self.audit_permission_check(
                        user_email, resource, action, room_id, False, msg, session
                    )
                return False, msg

            # If audit is enabled, log the successful permission check
            if audit:
                await self.audit_permission_check(
                    user_email, resource, action, room_id, True, None, session
                )

            return True, None

        except Exception as e:
            error_msg = f"Error checking permission: {str(e)}"
            logger.error(error_msg)
            return False, error_msg

    async def check_vessel_access(
        self,
        user_email: str,
        vessel_id: str,
        room_id: str,
        session: AsyncSession,
        audit: bool = True,
    ) -> Tuple[bool, Optional[str]]:
        """
        Check if user has access to a specific vessel

        Args:
            user_email: User's email address
            vessel_id: Vessel ID to check access for
            room_id: Room context
            session: Database session
            audit: Whether to audit this check

        Returns:
            Tuple of (allowed: bool, error_message: Optional[str])
        """
        try:
            # Get user
            user = await self._get_user(user_email, session)
            if not user:
                error_msg = f"User not found: {user_email}"
                if audit:
                    await self.audit_vessel_access_check(
                        user_email, vessel_id, room_id, False, error_msg, session
                    )
                return False, error_msg

            user_role = user.role

            # Brokers have access to all vessels
            if user_role == "broker":
                if audit:
                    await self.audit_vessel_access_check(
                        user_email, vessel_id, room_id, True, None, session
                    )
                return True, None

            # Get vessel
            vessel = await self._get_vessel(vessel_id, session)
            if not vessel:
                error_msg = f"Vessel not found: {vessel_id}"
                if audit:
                    await self.audit_vessel_access_check(
                        user_email, vessel_id, room_id, False, error_msg, session
                    )
                return False, error_msg

            # Check vessel access based on role
            allowed = await self._check_vessel_role_access(
                user, vessel, user_role, session
            )

            if allowed:
                if audit:
                    await self.audit_vessel_access_check(
                        user_email, vessel_id, room_id, True, None, session
                    )
                return True, None
            else:
                error_msg = f"Role '{user_role}' not authorized to access vessel {vessel_id}"
                if audit:
                    await self.audit_vessel_access_check(
                        user_email, vessel_id, room_id, False, error_msg, session
                    )
                return False, error_msg

        except Exception as e:
            error_msg = f"Error checking vessel access: {str(e)}"
            logger.error(error_msg)
            return False, error_msg

    async def get_accessible_vessels(
        self,
        user_email: str,
        room_id: str,
        session: AsyncSession,
    ) -> list[str]:
        """
        Get list of vessels the user has access to

        Args:
            user_email: User's email address
            room_id: Room context
            session: Database session

        Returns:
            List of accessible vessel IDs
        """
        try:
            user = await self._get_user(user_email, session)
            if not user:
                return []

            user_role = user.role

            # Brokers can access all vessels
            if user_role == "broker":
                vessels_result = await session.execute(
                    select(Vessel.id).where(Vessel.room_id == room_id)
                )
                return [str(v) for v in vessels_result.scalars().all()]

            # Get vessels based on role
            vessels_result = await session.execute(
                select(Vessel).where(Vessel.room_id == room_id)
            )
            vessels = vessels_result.scalars().all()

            accessible_vessel_ids = []
            for vessel in vessels:
                allowed = await self._check_vessel_role_access(
                    user, vessel, user_role, session
                )
                if allowed:
                    accessible_vessel_ids.append(str(vessel.id))

            return accessible_vessel_ids

        except Exception as e:
            logger.error(f"Error getting accessible vessels: {str(e)}")
            return []

    async def audit_permission_check(
        self,
        user_email: str,
        resource: str,
        action: str,
        room_id: str,
        allowed: bool,
        error_message: Optional[str],
        session: AsyncSession,
    ) -> None:
        """
        Audit a permission check (success or failure)

        Args:
            user_email: User who made the request
            resource: Resource being accessed
            action: Action being performed
            room_id: Room context
            allowed: Whether permission was granted
            error_message: Error message if denied
            session: Database session
        """
        try:
            from app.services.audit_service import AuditService

            audit_service = AuditService()

            action_type = (
                f"permission_granted_{resource}_{action}"
                if allowed
                else f"permission_denied_{resource}_{action}"
            )

            meta_data = {
                "user_email": user_email,
                "resource": resource,
                "action": action,
                "allowed": allowed,
            }

            if error_message:
                meta_data["error"] = error_message

            await audit_service.log_activity(
                room_id=room_id,
                actor=user_email,
                action=action_type,
                meta_json=meta_data,
                session=session,
            )

        except Exception as e:
            logger.warning(f"Error auditing permission check: {str(e)}")

    async def audit_vessel_access_check(
        self,
        user_email: str,
        vessel_id: str,
        room_id: str,
        allowed: bool,
        error_message: Optional[str],
        session: AsyncSession,
    ) -> None:
        """
        Audit a vessel access check (success or failure)

        Args:
            user_email: User who made the request
            vessel_id: Vessel being accessed
            room_id: Room context
            allowed: Whether access was granted
            error_message: Error message if denied
            session: Database session
        """
        try:
            from app.services.audit_service import AuditService

            audit_service = AuditService()

            action_type = (
                f"vessel_access_granted" if allowed else f"vessel_access_denied"
            )

            meta_data = {
                "user_email": user_email,
                "vessel_id": vessel_id,
                "allowed": allowed,
            }

            if error_message:
                meta_data["error"] = error_message

            await audit_service.log_activity(
                room_id=room_id,
                actor=user_email,
                action=action_type,
                meta_json=meta_data,
                session=session,
            )

        except Exception as e:
            logger.warning(f"Error auditing vessel access check: {str(e)}")

    # Private helper methods

    async def _get_user(
        self, user_email: str, session: AsyncSession
    ) -> Optional[User]:
        """Get user by email"""
        try:
            result = await session.execute(select(User).where(User.email == user_email))
            return result.scalar_one_or_none()
        except Exception as e:
            logger.error(f"Error getting user: {str(e)}")
            return None

    async def _get_vessel(
        self, vessel_id: str, session: AsyncSession
    ) -> Optional[Vessel]:
        """Get vessel by ID"""
        try:
            result = await session.execute(select(Vessel).where(Vessel.id == vessel_id))
            return result.scalar_one_or_none()
        except Exception as e:
            logger.error(f"Error getting vessel: {str(e)}")
            return None

    async def _check_vessel_role_access(
        self, user: User, vessel: Vessel, user_role: str, session: AsyncSession
    ) -> bool:
        """
        Check if user's role allows access to vessel

        Args:
            user: User object
            vessel: Vessel object
            user_role: User's role
            session: Database session

        Returns:
            True if access is allowed, False otherwise
        """
        try:
            if user_role == "owner":
                # Owners can access their own vessels
                if vessel.owner and vessel.owner.lower() in user.company.lower():
                    return True

            elif user_role == "charterer":
                # Charterers can access chartered vessels
                if vessel.charterer and vessel.charterer.lower() in user.company.lower():
                    return True

            elif user_role == "seller":
                # Sellers can access vessels they're selling
                if vessel.seller and vessel.seller.lower() in user.company.lower():
                    return True

            elif user_role == "buyer":
                # Buyers can access vessels they're buying
                if vessel.buyer and vessel.buyer.lower() in user.company.lower():
                    return True

            return False

        except Exception as e:
            logger.error(f"Error checking vessel role access: {str(e)}")
            return False


# Singleton instance for easy access
permission_manager = PermissionManager()
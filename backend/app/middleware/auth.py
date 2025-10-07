"""
JWT Authentication middleware for production
"""

import logging
import os
from datetime import datetime, timedelta
from typing import Any, Dict, Optional

import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_async_session
from app.models import User

logger = logging.getLogger(__name__)

# JWT Configuration
JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY", "sts-clearance-hub-secret-key-2024")
JWT_ALGORITHM = "HS256"
JWT_ACCESS_TOKEN_EXPIRE_MINUTES = int(
    os.getenv("JWT_ACCESS_TOKEN_EXPIRE_MINUTES", "60")
)
JWT_REFRESH_TOKEN_EXPIRE_DAYS = int(os.getenv("JWT_REFRESH_TOKEN_EXPIRE_DAYS", "30"))

security = HTTPBearer()


class JWTAuth:
    """JWT Authentication handler"""

    @staticmethod
    def create_access_token(
        data: Dict[str, Any], expires_delta: Optional[timedelta] = None
    ) -> str:
        """
        Create JWT access token

        Args:
            data: Token payload data
            expires_delta: Token expiration time

        Returns:
            JWT token string
        """
        to_encode = data.copy()

        if expires_delta:
            expire = datetime.utcnow() + expires_delta
        else:
            expire = datetime.utcnow() + timedelta(
                minutes=JWT_ACCESS_TOKEN_EXPIRE_MINUTES
            )

        to_encode.update({"exp": expire, "type": "access"})

        try:
            encoded_jwt = jwt.encode(to_encode, JWT_SECRET_KEY, algorithm=JWT_ALGORITHM)
            return encoded_jwt
        except Exception as e:
            logger.error(f"Error creating access token: {e}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Could not create access token",
            )

    @staticmethod
    def create_refresh_token(data: Dict[str, Any]) -> str:
        """
        Create JWT refresh token

        Args:
            data: Token payload data

        Returns:
            JWT refresh token string
        """
        to_encode = data.copy()
        expire = datetime.utcnow() + timedelta(days=JWT_REFRESH_TOKEN_EXPIRE_DAYS)
        to_encode.update({"exp": expire, "type": "refresh"})

        try:
            encoded_jwt = jwt.encode(to_encode, JWT_SECRET_KEY, algorithm=JWT_ALGORITHM)
            return encoded_jwt
        except Exception as e:
            logger.error(f"Error creating refresh token: {e}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Could not create refresh token",
            )

    @staticmethod
    def verify_token(token: str, token_type: str = "access") -> Dict[str, Any]:
        """
        Verify and decode JWT token

        Args:
            token: JWT token string
            token_type: Expected token type (access/refresh)

        Returns:
            Decoded token payload

        Raises:
            HTTPException: If token is invalid
        """
        try:
            payload = jwt.decode(token, JWT_SECRET_KEY, algorithms=[JWT_ALGORITHM])

            # Check token type
            if payload.get("type") != token_type:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail=f"Invalid token type. Expected {token_type}",
                    headers={"WWW-Authenticate": "Bearer"},
                )

            # Check expiration
            exp = payload.get("exp")
            if exp and datetime.fromtimestamp(exp) < datetime.utcnow():
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Token has expired",
                    headers={"WWW-Authenticate": "Bearer"},
                )

            return payload

        except jwt.InvalidTokenError as e:
            logger.warning(f"Invalid JWT token: {e}")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Could not validate credentials",
                headers={"WWW-Authenticate": "Bearer"},
            )
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Unexpected error verifying token: {e}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Internal server error during authentication",
            )


# Global JWT auth instance
jwt_auth = JWTAuth()


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    session: AsyncSession = Depends(get_async_session),
) -> Dict[str, Any]:
    """
    Get current authenticated user from JWT token

    Args:
        credentials: HTTP Bearer credentials
        session: Database session

    Returns:
        User information dictionary

    Raises:
        HTTPException: If authentication fails
    """
    # Verify token
    payload = jwt_auth.verify_token(credentials.credentials, "access")

    # Extract user info from token
    user_email = payload.get("sub")
    if not user_email:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token payload",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # Get user from database
    try:
        result = await session.execute(select(User).where(User.email == user_email))
        user = result.scalar_one_or_none()

        if not user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="User not found",
                headers={"WWW-Authenticate": "Bearer"},
            )

        return {
            "id": str(user.id),
            "email": user.email,
            "name": user.name,
            "role": user.role,
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching user from database: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Internal server error during user lookup",
        )


async def get_current_user_optional(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
    session: AsyncSession = Depends(get_async_session),
) -> Optional[Dict[str, Any]]:
    """
    Get current user if authenticated, None otherwise

    Args:
        credentials: HTTP Bearer credentials (optional)
        session: Database session

    Returns:
        User information or None
    """
    if not credentials:
        return None

    try:
        return await get_current_user(credentials, session)
    except HTTPException:
        return None


def require_roles(allowed_roles: list):
    """
    Decorator to require specific user roles

    Args:
        allowed_roles: List of allowed user roles

    Returns:
        Dependency function
    """

    async def role_checker(current_user: Dict[str, Any] = Depends(get_current_user)):
        if current_user["role"] not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Access denied. Required roles: {', '.join(allowed_roles)}",
            )
        return current_user

    return role_checker


# Role-based dependencies
require_admin = require_roles(["admin"])
require_owner_or_broker = require_roles(["owner", "broker", "admin"])
require_any_role = require_roles(["owner", "charterer", "broker", "admin", "viewer"])


class AuthMiddleware:
    """Authentication middleware for protecting routes"""

    def __init__(self, excluded_paths: Optional[list] = None):
        """
        Initialize auth middleware

        Args:
            excluded_paths: Paths to exclude from authentication
        """
        self.excluded_paths = excluded_paths or [
            "/",
            "/health",
            "/docs",
            "/redoc",
            "/openapi.json",
            "/api/v1/auth/login",
            "/api/v1/auth/register",
            "/api/v1/auth/refresh",
            "/static",
        ]

    def is_excluded_path(self, path: str) -> bool:
        """
        Check if path is excluded from authentication

        Args:
            path: Request path

        Returns:
            True if excluded, False otherwise
        """
        for excluded in self.excluded_paths:
            if path.startswith(excluded):
                return True
        return False


# Development fallback for backward compatibility
async def get_demo_user() -> Dict[str, Any]:
    """
    Get demo user for development/testing
    Only used when JWT authentication is disabled
    """
    return {
        "id": "demo-user-id",
        "email": "demo@example.com",
        "name": "Demo User",
        "role": "owner",
    }


# Environment-based user dependency
async def get_user_context(
    session: AsyncSession = Depends(get_async_session),
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
) -> Dict[str, Any]:
    """
    Get user context based on environment
    Uses JWT auth in production, demo user in development
    """
    # Check if we're in development mode
    if os.getenv("ENVIRONMENT", "development") == "development" and not credentials:
        logger.warning("Using demo user in development mode")
        return await get_demo_user()

    # Use JWT authentication
    if not credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required",
            headers={"WWW-Authenticate": "Bearer"},
        )

    return await get_current_user(credentials, session)

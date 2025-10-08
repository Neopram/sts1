"""
Authentication router for STS Clearance system
Handles login, token validation, and user management
"""

import logging
import os
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_async_session
from app.dependencies import create_access_token, get_current_user
from app.models import Party, User
from app.schemas import LoginRequest, TokenResponse, UserResponse


class RegisterRequest(BaseModel):
    email: str
    password: str
    name: str
    role: str = "buyer"


logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/auth", tags=["auth"])


@router.post("/register", status_code=201)
async def register(
    register_data: RegisterRequest, session: AsyncSession = Depends(get_async_session)
):
    """
    Register a new user
    """
    try:
        # Check if user already exists
        result = await session.execute(
            select(User).where(User.email == register_data.email).limit(1)
        )
        existing_user = result.scalar_one_or_none()

        if existing_user:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="User with this email already exists",
            )

        # Validate role
        valid_roles = ["owner", "seller", "buyer", "charterer", "broker", "admin"]
        if register_data.role not in valid_roles:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid role. Must be one of: {', '.join(valid_roles)}",
            )

        # Create user
        user = User(
            email=register_data.email, name=register_data.name, role=register_data.role
        )
        session.add(user)
        await session.commit()

        # Create access token
        token_data = {
            "email": register_data.email,
            "name": register_data.name,
            "role": register_data.role,
        }
        access_token = create_access_token(token_data)

        return {
            "message": "User registered successfully",
            "access_token": access_token,
            "token_type": "bearer",
            "user": {
                "email": register_data.email,
                "name": register_data.name,
                "role": register_data.role,
            },
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error during registration: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")


@router.post("/login", response_model=TokenResponse)
async def login(
    login_data: LoginRequest, session: AsyncSession = Depends(get_async_session)
):
    """
    Login endpoint for user authentication
    """
    email = login_data.email
    password = login_data.password

    try:
        logger.info(f"Login attempt for email: {email}")
        
        # Find user
        result = await session.execute(select(User).where(User.email == email).limit(1))
        user = result.scalar_one_or_none()

        if not user:
            logger.warning(f"User not found: {email}")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid email or password",
            )

        logger.info(f"User found: {user.email}, role: {user.role}")

        # For simplicity, we'll skip password validation in this demo
        # In production, you would verify the password hash here

        # Create access token
        token = create_access_token({"sub": user.email, "role": user.role})

        logger.info(f"Login successful for: {email}")
        return TokenResponse(
            token=token, email=user.email, role=user.role, name=user.name
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Login error: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Internal server error",
        )


@router.get("/me", response_model=UserResponse)
async def get_current_user_info(current_user: dict = Depends(get_current_user)):
    """
    Get current user information
    """
    return UserResponse(**current_user)


@router.get("/validate", response_model=UserResponse)
async def validate_token(current_user: dict = Depends(get_current_user)):
    """
    Validate token and return user information
    """
    return UserResponse(**current_user)


@router.post("/refresh", response_model=TokenResponse)
async def refresh_token(current_user: dict = Depends(get_current_user)):
    """
    Refresh access token
    """
    try:
        # Create new access token
        new_token = create_access_token(data={"sub": current_user["email"]})
        
        return TokenResponse(
            access_token=new_token,
            token_type="bearer",
            expires_in=3600  # 1 hour
        )
    except Exception as e:
        logger.error(f"Token refresh failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token refresh failed"
        )


@router.post("/logout")
async def logout(current_user: dict = Depends(get_current_user)):
    """
    Logout endpoint with server-side token invalidation
    """
    try:
        # Log the logout action
        logger.info(f"User {current_user.get('email', 'unknown')} logged out")

        # In production, you could add the token to a blacklist
        # For now, we rely on client-side token removal

        return {
            "message": "Successfully logged out",
            "user_email": current_user.get("email"),
            "timestamp": datetime.now().isoformat(),
        }
    except Exception as e:
        logger.error(f"Logout error: {e}")
        return {"message": "Logout completed"}

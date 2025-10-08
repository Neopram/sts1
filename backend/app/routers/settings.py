"""
Settings router for STS Clearance system
Handles user settings management operations
"""

import logging
from typing import Dict, Optional

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_async_session
from app.dependencies import get_current_user
from app.models import User, UserSettings

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1", tags=["settings"])


# Response schemas
class UserSettingsResponse(BaseModel):
    id: str
    user_id: str
    display_name: Optional[str]
    timezone: str
    language: str
    date_format: str
    time_format: str
    notification_settings: Dict
    appearance_settings: Dict
    security_settings: Dict
    data_settings: Dict
    created_at: str
    updated_at: str


class UpdateSettingsRequest(BaseModel):
    display_name: Optional[str] = None
    timezone: Optional[str] = None
    language: Optional[str] = None
    date_format: Optional[str] = None
    time_format: Optional[str] = None
    notification_settings: Optional[Dict] = None
    appearance_settings: Optional[Dict] = None
    security_settings: Optional[Dict] = None
    data_settings: Optional[Dict] = None


@router.get("/settings", response_model=UserSettingsResponse)
async def get_user_settings(
    current_user: dict = Depends(get_current_user),
    session: AsyncSession = Depends(get_async_session),
):
    """
    Get current user's settings
    """
    try:
        user_email = current_user.get("email", "")

        # Get user
        result = await session.execute(select(User).where(User.email == user_email))
        user = result.scalar_one_or_none()

        if not user:
            raise HTTPException(status_code=404, detail="User not found")

        # Get or create user settings
        result = await session.execute(
            select(UserSettings).where(UserSettings.user_id == user.id)
        )
        settings = result.scalar_one_or_none()

        if not settings:
            # Create default settings
            settings = UserSettings(
                user_id=user.id,
                timezone="UTC",
                language="en",
                date_format="MM/DD/YYYY",
                time_format="12h",
                notification_settings={
                    "emailNotifications": True,
                    "pushNotifications": True,
                    "smsNotifications": False,
                    "documentUpdates": True,
                    "approvalRequests": True,
                    "systemAlerts": True,
                    "weeklyDigest": False
                },
                appearance_settings={
                    "theme": "light",
                    "primaryColor": "blue",
                    "fontSize": "medium",
                    "compactMode": False,
                    "showAnimations": True
                },
                security_settings={
                    "twoFactorAuth": False,
                    "loginNotifications": True,
                    "suspiciousActivityAlerts": True,
                    "sessionTimeout": 30,
                    "requirePasswordForChanges": True
                },
                data_settings={
                    "autoBackup": True,
                    "backupFrequency": "daily",
                    "retainBackups": 30,
                    "exportFormat": "json",
                    "dataRetention": "indefinite"
                }
            )
            session.add(settings)
            await session.commit()
            await session.refresh(settings)

        return UserSettingsResponse(
            id=str(settings.id),
            user_id=str(settings.user_id),
            display_name=settings.display_name,
            timezone=settings.timezone,
            language=settings.language,
            date_format=settings.date_format,
            time_format=settings.time_format,
            notification_settings=settings.notification_settings or {},
            appearance_settings=settings.appearance_settings or {},
            security_settings=settings.security_settings or {},
            data_settings=settings.data_settings or {},
            created_at=settings.created_at.isoformat(),
            updated_at=settings.updated_at.isoformat(),
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting user settings: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")


@router.put("/settings", response_model=UserSettingsResponse)
async def update_user_settings(
    update_data: UpdateSettingsRequest,
    current_user: dict = Depends(get_current_user),
    session: AsyncSession = Depends(get_async_session),
):
    """
    Update current user's settings
    """
    try:
        user_email = current_user.get("email", "")

        # Get user
        result = await session.execute(select(User).where(User.email == user_email))
        user = result.scalar_one_or_none()

        if not user:
            raise HTTPException(status_code=404, detail="User not found")

        # Get or create user settings
        result = await session.execute(
            select(UserSettings).where(UserSettings.user_id == user.id)
        )
        settings = result.scalar_one_or_none()

        if not settings:
            # Create default settings first
            settings = UserSettings(user_id=user.id)
            session.add(settings)
            await session.flush()

        # Update fields
        if update_data.display_name is not None:
            settings.display_name = update_data.display_name
        if update_data.timezone is not None:
            settings.timezone = update_data.timezone
        if update_data.language is not None:
            settings.language = update_data.language
        if update_data.date_format is not None:
            settings.date_format = update_data.date_format
        if update_data.time_format is not None:
            settings.time_format = update_data.time_format
        if update_data.notification_settings is not None:
            settings.notification_settings = update_data.notification_settings
        if update_data.appearance_settings is not None:
            settings.appearance_settings = update_data.appearance_settings
        if update_data.security_settings is not None:
            settings.security_settings = update_data.security_settings
        if update_data.data_settings is not None:
            settings.data_settings = update_data.data_settings

        await session.commit()
        await session.refresh(settings)

        return UserSettingsResponse(
            id=str(settings.id),
            user_id=str(settings.user_id),
            display_name=settings.display_name,
            timezone=settings.timezone,
            language=settings.language,
            date_format=settings.date_format,
            time_format=settings.time_format,
            notification_settings=settings.notification_settings or {},
            appearance_settings=settings.appearance_settings or {},
            security_settings=settings.security_settings or {},
            data_settings=settings.data_settings or {},
            created_at=settings.created_at.isoformat(),
            updated_at=settings.updated_at.isoformat(),
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating user settings: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")


@router.post("/settings/export")
async def export_user_data(
    current_user: dict = Depends(get_current_user),
    session: AsyncSession = Depends(get_async_session),
):
    """
    Export user's data and settings
    """
    try:
        user_email = current_user.get("email", "")

        # Get user and settings
        result = await session.execute(select(User).where(User.email == user_email))
        user = result.scalar_one_or_none()

        if not user:
            raise HTTPException(status_code=404, detail="User not found")

        result = await session.execute(
            select(UserSettings).where(UserSettings.user_id == user.id)
        )
        settings = result.scalar_one_or_none()

        # Prepare export data
        export_data = {
            "user": {
                "id": str(user.id),
                "email": user.email,
                "name": user.name,
                "role": user.role,
                "created_at": user.created_at.isoformat(),
                "last_login": user.last_login.isoformat() if user.last_login else None,
            },
            "settings": {
                "display_name": settings.display_name if settings else None,
                "timezone": settings.timezone if settings else "UTC",
                "language": settings.language if settings else "en",
                "date_format": settings.date_format if settings else "MM/DD/YYYY",
                "time_format": settings.time_format if settings else "12h",
                "notification_settings": settings.notification_settings if settings else {},
                "appearance_settings": settings.appearance_settings if settings else {},
                "security_settings": settings.security_settings if settings else {},
                "data_settings": settings.data_settings if settings else {},
            } if settings else None,
            "export_date": "2025-01-08T12:00:00Z",  # Would be datetime.now().isoformat()
            "version": "1.0"
        }

        return export_data

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error exporting user data: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")

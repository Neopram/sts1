
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import Optional, List
import os
import uuid
import shutil
from pathlib import Path
from datetime import datetime, timedelta
import pytz

from ..database import get_async_session
from ..models import User, ActivityLog
from ..dependencies import get_current_user
from ..schemas import (
    UserProfileUpdate, 
    UserProfileResponse, 
    PasswordChange,
    SecuritySettingsResponse,
    UserPreferencesResponse,
    UserPreferencesUpdate,
    ActivityResponse
)
from passlib.hash import bcrypt

router = APIRouter(prefix="/api/v1/profile", tags=["profile"])

# Create uploads directory if it doesn't exist
UPLOAD_DIR = Path("uploads/avatars")
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

@router.get("/me", response_model=UserProfileResponse)
async def get_user_profile(current_user: User = Depends(get_current_user)):
    """Get current user's profile information"""
    return UserProfileResponse(
        id=str(current_user.id),
        email=current_user.email,
        name=current_user.name,
        role=current_user.role,
        company=current_user.company,
        phone=current_user.phone,
        location=current_user.location,
        timezone=current_user.timezone,
        bio=current_user.bio,
        avatar_url=current_user.avatar_url,
        department=current_user.department,
        position=current_user.position,
        preferences=current_user.preferences or {},
        created_at=current_user.created_at,
        last_login=current_user.last_login
    )

@router.put("/me", response_model=UserProfileResponse)
async def update_user_profile(
    profile_data: UserProfileUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_async_session)
):
    """Update current user's profile information"""
    # Update user fields
    update_data = profile_data.dict(exclude_unset=True)

    for field, value in update_data.items():
        if hasattr(current_user, field):
            setattr(current_user, field, value)

    current_user.updated_at = datetime.utcnow()
    await db.commit()
    await db.refresh(current_user)

    return UserProfileResponse(
        id=str(current_user.id),
        email=current_user.email,
        name=current_user.name,
        role=current_user.role,
        company=current_user.company,
        phone=current_user.phone,
        location=current_user.location,
        timezone=current_user.timezone,
        bio=current_user.bio,
        avatar_url=current_user.avatar_url,
        department=current_user.department,
        position=current_user.position,
        preferences=current_user.preferences or {},
        created_at=current_user.created_at,
        last_login=current_user.last_login
    )

@router.post("/change-password")
async def change_password(
    password_data: PasswordChange,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_async_session)
):
    """Change user's password"""
    # Verificar contraseña actual
    if not bcrypt.verify(password_data.current_password, current_user.password_hash):
        raise HTTPException(status_code=400, detail="Current password is incorrect")

    # Validar nueva contraseña
    if len(password_data.new_password) < 8:
        raise HTTPException(status_code=400, detail="Password must be at least 8 characters long")

    if password_data.new_password != password_data.confirm_password:
        raise HTTPException(status_code=400, detail="New passwords do not match")

    # Hash nueva contraseña
    hashed_password = bcrypt.hashpw(password_data.new_password.encode('utf-8'), bcrypt.gensalt())
    current_user.password_hash = hashed_password.decode('utf-8')
    current_user.last_password_change = datetime.utcnow()
    current_user.password_expiry_date = datetime.utcnow() + timedelta(days=90)  # Password expires in 90 days
    current_user.updated_at = datetime.utcnow()

    await db.commit()

    return {"message": "Password changed successfully"}

@router.post("/avatar")
async def upload_avatar(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_async_session)
):
    """Upload user avatar"""
    # Validate file type
    allowed_types = ["image/jpeg", "image/png", "image/gif", "image/webp"]
    if file.content_type not in allowed_types:
        raise HTTPException(status_code=400, detail="Invalid file type. Only JPEG, PNG, GIF, and WebP are allowed.")

    # Validate file size (5MB limit)
    file_size = 0
    content = await file.read()
    file_size = len(content)

    if file_size > 5 * 1024 * 1024:  # 5MB
        raise HTTPException(status_code=400, detail="File too large. Maximum size is 5MB.")

    # Generate unique filename
    file_extension = os.path.splitext(file.filename)[1]
    unique_filename = f"{uuid.uuid4()}{file_extension}"
    file_path = UPLOAD_DIR / unique_filename

    # Save file
    with open(file_path, "wb") as buffer:
        buffer.write(content)

    # Update user avatar URL
    avatar_url = f"/uploads/avatars/{unique_filename}"

    # Remove old avatar if exists
    if current_user.avatar_url:
        old_path = Path(f"uploads/avatars/{os.path.basename(current_user.avatar_url)}")
        if old_path.exists():
            old_path.unlink()

    current_user.avatar_url = avatar_url
    await db.commit()

    return {"avatar_url": avatar_url, "message": "Avatar uploaded successfully"}

@router.delete("/avatar")
async def delete_avatar(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_async_session)
):
    """Delete user avatar"""
    if current_user.avatar_url:
        # Remove file from filesystem
        file_path = Path(f"uploads/avatars/{os.path.basename(current_user.avatar_url)}")
        if file_path.exists():
            file_path.unlink()

        # Clear avatar URL in database
        current_user.avatar_url = None
        await db.commit()

    return {"message": "Avatar deleted successfully"}


# ============ SECURITY SETTINGS ENDPOINTS ============

@router.get("/security-settings", response_model=SecuritySettingsResponse)
async def get_security_settings(
    current_user: User = Depends(get_current_user)
):
    """Get current user's security settings"""
    return SecuritySettingsResponse(
        two_factor_enabled=current_user.two_factor_enabled,
        last_password_change=current_user.last_password_change,
        password_expiry_date=current_user.password_expiry_date,
        login_attempts=current_user.login_attempts,
        locked_until=current_user.locked_until
    )


@router.post("/enable-2fa")
async def enable_two_factor(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_async_session)
):
    """Enable two-factor authentication for current user"""
    current_user.two_factor_enabled = True
    current_user.updated_at = datetime.utcnow()
    await db.commit()
    
    return {
        "message": "Two-factor authentication enabled successfully",
        "two_factor_enabled": True
    }


@router.post("/disable-2fa")
async def disable_two_factor(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_async_session)
):
    """Disable two-factor authentication for current user"""
    current_user.two_factor_enabled = False
    current_user.updated_at = datetime.utcnow()
    await db.commit()
    
    return {
        "message": "Two-factor authentication disabled successfully",
        "two_factor_enabled": False
    }


# ============ PREFERENCES ENDPOINTS ============

@router.get("/preferences", response_model=UserPreferencesResponse)
async def get_preferences(
    current_user: User = Depends(get_current_user)
):
    """Get current user's preferences"""
    preferences = current_user.preferences or {}
    
    return UserPreferencesResponse(
        language=preferences.get("language", "en"),
        theme=preferences.get("theme", "light"),
        notifications=preferences.get("notifications", {
            "email": True,
            "push": True,
            "sms": False,
            "frequency": "immediate"
        }),
        privacy=preferences.get("privacy", {
            "profileVisibility": "team",
            "showEmail": True,
            "showPhone": False
        })
    )


@router.post("/preferences")
async def update_preferences(
    prefs_data: UserPreferencesUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_async_session)
):
    """Update current user's preferences"""
    preferences = current_user.preferences or {}
    update_data = prefs_data.dict(exclude_unset=True)
    
    preferences.update(update_data)
    current_user.preferences = preferences
    current_user.updated_at = datetime.utcnow()
    
    await db.commit()
    
    return UserPreferencesResponse(
        language=preferences.get("language", "en"),
        theme=preferences.get("theme", "light"),
        notifications=preferences.get("notifications", {}),
        privacy=preferences.get("privacy", {})
    )


# ============ ACTIVITY ENDPOINTS ============

@router.get("/activities", response_model=List[ActivityResponse])
async def get_user_activities(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_async_session),
    limit: int = 50,
    offset: int = 0
):
    """Get current user's activity history"""
    try:
        # Query activity logs for current user
        query = select(ActivityLog).where(
            ActivityLog.actor == current_user.email
        ).order_by(
            ActivityLog.ts.desc()
        ).limit(limit).offset(offset)
        
        result = await db.execute(query)
        activities = result.scalars().all()
        
        return [
            ActivityResponse(
                id=str(activity.id),
                action=activity.action,
                description=activity.meta_json,
                timestamp=activity.ts,
                ip_address=None,
                user_agent=None,
                location=None
            )
            for activity in activities
        ]
    except Exception as e:
        # If ActivityLog table doesn't exist or other error, return empty list
        return []


from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Optional
import os
import uuid
import shutil
from pathlib import Path
from datetime import datetime

from ..database import get_async_session
from ..models import User
from ..dependencies import get_current_user
from ..schemas import UserProfileUpdate, UserProfileResponse, PasswordChange
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

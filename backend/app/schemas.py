from datetime import datetime
from enum import Enum
from typing import Any, Dict, List, Optional
from uuid import UUID

from pydantic import BaseModel, Field, validator


class DocumentStatus(str, Enum):
    MISSING = "missing"
    UNDER_REVIEW = "under_review"
    APPROVED = "approved"
    EXPIRED = "expired"


class Criticality(str, Enum):
    HIGH = "high"
    MED = "med"
    LOW = "low"


class PartyRole(str, Enum):
    OWNER = "owner"
    SELLER = "seller"
    BUYER = "buyer"
    CHARTERER = "charterer"
    BROKER = "broker"


# Request/Response schemas
class RoomResponse(BaseModel):
    id: str
    title: str
    location: str
    sts_eta: datetime

    class Config:
        from_attributes = True


class RoomSummaryResponse(BaseModel):
    room_id: UUID
    title: str
    location: str
    sts_eta: datetime
    progress_percentage: float
    total_required_docs: int
    resolved_required_docs: int
    blockers: List[Dict[str, Any]]
    expiring_soon: List[Dict[str, Any]]

    class Config:
        from_attributes = True


class DocumentUploadRequest(BaseModel):
    notes: Optional[str] = None
    expires_on: Optional[datetime] = None


class DocumentUpdateRequest(BaseModel):
    status: DocumentStatus
    notes: Optional[str] = None
    expires_on: Optional[datetime] = None


class DocumentTypeResponse(BaseModel):
    id: UUID
    code: str
    name: str
    required: bool
    criticality: Criticality

    class Config:
        from_attributes = True


class DocumentResponse(BaseModel):
    id: UUID
    type_code: str
    type_name: str
    status: DocumentStatus
    expires_on: Optional[datetime]
    uploaded_by: Optional[str]
    uploaded_at: Optional[datetime]
    notes: Optional[str]
    required: bool
    criticality: Criticality
    criticality_score: int

    class Config:
        from_attributes = True


class ActivityLogResponse(BaseModel):
    id: UUID
    actor: str
    action: str
    meta_json: Optional[str]
    ts: datetime

    class Config:
        from_attributes = True


class FeatureFlagResponse(BaseModel):
    key: str
    enabled: bool

    class Config:
        from_attributes = True


# Internal schemas for business logic
class DocumentWithScore(BaseModel):
    document: DocumentResponse
    score: int
    days_to_expiry: Optional[int]

    class Config:
        from_attributes = True


# Authentication schemas
class LoginRequest(BaseModel):
    email: str
    password: str


class TokenResponse(BaseModel):
    token: str
    email: str
    role: str
    name: str


class UserResponse(BaseModel):
    email: str
    role: str
    name: str


# Profile schemas
class UserProfileUpdate(BaseModel):
    name: Optional[str] = None
    company: Optional[str] = None
    phone: Optional[str] = None
    location: Optional[str] = None
    timezone: Optional[str] = None
    bio: Optional[str] = None
    department: Optional[str] = None
    position: Optional[str] = None
    preferences: Optional[Dict[str, Any]] = None


class UserProfileResponse(BaseModel):
    id: str
    email: str
    name: str
    role: str
    company: Optional[str] = None
    phone: Optional[str] = None
    location: Optional[str] = None
    timezone: str
    bio: Optional[str] = None
    avatar_url: Optional[str] = None
    department: Optional[str] = None
    position: Optional[str] = None
    preferences: Dict[str, Any]
    created_at: datetime
    last_login: Optional[datetime] = None

    class Config:
        from_attributes = True


class SecuritySettingsResponse(BaseModel):
    two_factor_enabled: bool
    last_password_change: Optional[datetime] = None
    password_expiry_date: Optional[datetime] = None
    login_attempts: int
    locked_until: Optional[datetime] = None

    class Config:
        from_attributes = True


class UserPreferencesResponse(BaseModel):
    language: str = "en"
    theme: str = "light"
    notifications: Dict[str, Any]
    privacy: Dict[str, Any]

    class Config:
        from_attributes = True


class UserPreferencesUpdate(BaseModel):
    language: Optional[str] = None
    theme: Optional[str] = None
    notifications: Optional[Dict[str, Any]] = None
    privacy: Optional[Dict[str, Any]] = None


class ActivityResponse(BaseModel):
    id: str
    action: str
    description: Optional[str] = None
    timestamp: datetime
    ip_address: Optional[str] = None
    user_agent: Optional[str] = None
    location: Optional[str] = None

    class Config:
        from_attributes = True


class PasswordChange(BaseModel):
    current_password: str
    new_password: str
    confirm_password: str


# ============ PHASE 2: SETTINGS SCHEMAS ============

class EmailSettingsResponse(BaseModel):
    """Email settings for user"""
    id: Optional[UUID] = None
    user_id: Optional[UUID] = None
    notifications_enabled: bool = True
    email_frequency: str = "immediate"
    digest_enabled: bool = False
    security_alerts: bool = True
    marketing_emails: bool = False
    verified: bool = False
    verified_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class EmailSettingsUpdate(BaseModel):
    """Update email settings"""
    notifications_enabled: Optional[bool] = None
    email_frequency: Optional[str] = None
    digest_enabled: Optional[bool] = None
    security_alerts: Optional[bool] = None
    marketing_emails: Optional[bool] = None


class TwoFactorAuthResponse(BaseModel):
    """2FA status response"""
    enabled: bool = False
    verified: bool = False
    method: str = "totp"
    backup_codes_count: int = 0
    enabled_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class TwoFactorAuthSetup(BaseModel):
    """2FA setup response with QR code"""
    secret: str
    qr_code: str  # Base64 encoded
    provisioning_uri: str
    backup_codes: List[str]
    instructions: Dict[str, Any]


class TwoFactorAuthVerify(BaseModel):
    """Verify 2FA token"""
    token: str
    backup_codes: Optional[List[str]] = None


class LoginHistoryResponse(BaseModel):
    """Login history entry"""
    id: Optional[UUID] = None
    ip_address: str
    browser: Optional[str] = None
    os: Optional[str] = None
    device: Optional[str] = None
    country: Optional[str] = None
    city: Optional[str] = None
    success: bool = True
    risk_level: str = "low"
    risk_score: int = 0
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class BackupScheduleResponse(BaseModel):
    """Backup schedule configuration"""
    id: Optional[UUID] = None
    user_id: Optional[UUID] = None
    enabled: bool = False
    frequency: str = "daily"
    time_of_day: str = "00:00"
    include_documents: bool = True
    include_data: bool = True
    compression: bool = True
    retention_days: int = 30
    last_backup: Optional[datetime] = None
    next_backup: Optional[datetime] = None

    class Config:
        from_attributes = True


class BackupScheduleUpdate(BaseModel):
    """Update backup schedule"""
    enabled: Optional[bool] = None
    frequency: Optional[str] = None
    time_of_day: Optional[str] = None
    include_documents: Optional[bool] = None
    include_data: Optional[bool] = None
    compression: Optional[bool] = None
    retention_days: Optional[int] = None


class BackupMetadataResponse(BaseModel):
    """Backup file metadata"""
    id: Optional[UUID] = None
    file_name: str
    file_size: int = 0
    backup_type: str = "full"
    status: str = "completed"
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class ExportFormatResponse(BaseModel):
    """Available export format"""
    format: str
    name: str
    description: str
    icon: str


class ExportDataRequest(BaseModel):
    """Request to export data"""
    format: str  # json, csv, xml, pdf, xlsx, sql
    include_settings: bool = False
    include_documents: bool = False


class ExportResponse(BaseModel):
    """Export data response"""
    success: bool
    file_name: str
    content_type: str
    url: Optional[str] = None

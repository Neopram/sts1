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
    preferences: Dict[str, Any]
    created_at: datetime
    last_login: Optional[datetime] = None

    class Config:
        from_attributes = True


class PasswordChange(BaseModel):
    current_password: str
    new_password: str
    confirm_password: str

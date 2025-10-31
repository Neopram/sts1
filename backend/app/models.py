import os
import uuid

from sqlalchemy import (JSON, Boolean, Column, DateTime, Float, ForeignKey,
                        Integer, String, Text, UniqueConstraint, Index)
import sqlalchemy
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

# Use String for UUID in SQLite, UUID for PostgreSQL
if "sqlite" in os.getenv("DATABASE_URL", "sqlite"):
    UUIDType = String(36)

    def uuid_default():
        return str(uuid.uuid4())

else:
    from sqlalchemy.dialects.postgresql import UUID

    UUIDType = UUID(as_uuid=True)

    def uuid_default():
        return uuid.uuid4()


Base = declarative_base()


class User(Base):
    __tablename__ = "users"

    id = Column(UUIDType, primary_key=True, default=uuid_default)
    email = Column(String(255), unique=True, nullable=False)
    name = Column(String(255), nullable=False)
    role = Column(
        String(50), nullable=False
    )  # owner, seller, buyer, charterer, broker, admin, viewer
    password_hash = Column(String(128), nullable=True)  # Hashed password
    company = Column(String(255), nullable=True)
    phone = Column(String(50), nullable=True)
    location = Column(String(255), nullable=True)
    timezone = Column(String(100), default="UTC")
    bio = Column(Text, nullable=True)
    avatar_url = Column(String(500), nullable=True)
    department = Column(String(255), nullable=True)  # User department
    position = Column(String(255), nullable=True)  # User position/title
    preferences = Column(JSON, default=dict)  # User preferences like theme, notifications, etc.
    two_factor_enabled = Column(Boolean, default=False, nullable=False)  # 2FA status
    last_password_change = Column(DateTime(timezone=True), nullable=True)  # Password change tracking
    password_expiry_date = Column(DateTime(timezone=True), nullable=True)  # Password expiry
    login_attempts = Column(Integer, default=0, nullable=False)  # Failed login attempts
    locked_until = Column(DateTime(timezone=True), nullable=True)  # Account lock timestamp
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    last_login = Column(DateTime(timezone=True), nullable=True)
    updated_at = Column(DateTime(timezone=True), nullable=True)
    is_active = Column(Boolean, default=True, nullable=False)


class Room(Base):
    __tablename__ = "rooms"

    id = Column(UUIDType, primary_key=True, default=uuid_default)
    title = Column(String(255), nullable=False)
    location = Column(String(255), nullable=False)
    sts_eta = Column(DateTime, nullable=False)
    created_by = Column(String(255), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), nullable=True)
    description = Column(Text, nullable=True)
    status = Column(String(50), default='active', nullable=False)
    
    # ============ DASHBOARD METRICS FIELDS ============
    # Operational metrics for dashboard calculations
    cargo_type = Column(String(100), nullable=True)  # crude, gasoil, fuel, etc
    cargo_quantity = Column(Float, nullable=True)  # in barrels or tons
    cargo_value_usd = Column(Float, nullable=True)  # total cargo value
    demurrage_rate_per_day = Column(Float, nullable=True)  # USD/day
    demurrage_rate_per_hour = Column(Float, nullable=True)  # USD/hour
    status_detail = Column(String(50), nullable=True)  # pending, ready, active, completed
    timeline_phase = Column(String(50), nullable=True)  # pre_docs, docs_pending, ready, active
    eta_actual = Column(DateTime(timezone=True), nullable=True)  # Actual ETA
    eta_estimated = Column(DateTime(timezone=True), nullable=True)  # Estimated ETA
    created_at_timestamp = Column(DateTime(timezone=True), nullable=True)  # When operation started
    
    # Broker commission fields
    broker_commission_percentage = Column(Float, nullable=True)  # e.g., 0.5 for 0.5%
    broker_commission_amount = Column(Float, nullable=True)  # USD amount

    parties = relationship("Party", back_populates="room")
    documents = relationship("Document", back_populates="room")
    approvals = relationship("Approval", back_populates="room")
    activity_logs = relationship("ActivityLog", back_populates="room")
    messages = relationship("Message", back_populates="room")
    notifications = relationship("Notification", back_populates="room")
    vessels = relationship("Vessel", back_populates="room")
    snapshots = relationship("Snapshot", back_populates="room")
    metrics = relationship("Metric", back_populates="room", cascade="all, delete-orphan")
    party_metrics = relationship("PartyMetric", back_populates="room", cascade="all, delete-orphan")


class Party(Base):
    __tablename__ = "parties"

    id = Column(UUIDType, primary_key=True, default=uuid_default)
    room_id = Column(UUIDType, ForeignKey("rooms.id"), nullable=True)
    role = Column(String(50), nullable=False)  # owner, seller, buyer, charterer, broker
    name = Column(String(255), nullable=False)
    email = Column(String(255), nullable=False)

    room = relationship("Room", back_populates="parties")
    approvals = relationship("Approval", back_populates="party")


class DocumentType(Base):
    __tablename__ = "document_types"

    id = Column(UUIDType, primary_key=True, default=uuid_default)
    code = Column(String(50), unique=True, nullable=False)
    name = Column(String(255), nullable=False)
    required = Column(Boolean, default=True)
    criticality = Column(String(20), nullable=False)  # high, med, low

    documents = relationship("Document", back_populates="document_type")


class Document(Base):
    __tablename__ = "documents"

    id = Column(UUIDType, primary_key=True, default=uuid_default)
    room_id = Column(UUIDType, ForeignKey("rooms.id"), nullable=False)
    vessel_id = Column(UUIDType, ForeignKey("vessels.id"), nullable=True)  # Vessel-specific documents
    type_id = Column(UUIDType, ForeignKey("document_types.id"), nullable=False)
    status = Column(
        String(50), default="missing"
    )  # missing, under_review, approved, expired
    expires_on = Column(DateTime, nullable=True)
    uploaded_by = Column(String(255), nullable=True)
    uploaded_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), nullable=True)
    notes = Column(Text, nullable=True)
    priority = Column(String(20), default='normal', nullable=False)  # low, normal, high, urgent
    
    # ============ DASHBOARD TRACKING FIELDS ============
    uploaded_by_user_id = Column(UUIDType, ForeignKey("users.id"), nullable=True)
    critical_path = Column(Boolean, default=False)  # Is this critical path document?
    estimated_days_to_expire = Column(Integer, nullable=True)

    room = relationship("Room", back_populates="documents")
    vessel = relationship("Vessel", back_populates="documents")
    document_type = relationship("DocumentType", back_populates="documents")
    uploaded_by_user = relationship("User", foreign_keys=[uploaded_by_user_id], backref="uploaded_documents")
    versions = relationship(
        "DocumentVersion",
        back_populates="document",
        order_by="DocumentVersion.created_at.desc()",
    )


class DocumentVersion(Base):
    __tablename__ = "document_versions"

    id = Column(UUIDType, primary_key=True, default=uuid_default)
    document_id = Column(UUIDType, ForeignKey("documents.id"), nullable=False)
    file_url = Column(String(500), nullable=False)
    sha256 = Column(String(64), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    size_bytes = Column(Integer, nullable=False)
    mime = Column(String(100), nullable=False)

    document = relationship("Document", back_populates="versions")


class Approval(Base):
    __tablename__ = "approvals"

    id = Column(UUIDType, primary_key=True, default=uuid_default)
    room_id = Column(UUIDType, ForeignKey("rooms.id"), nullable=False)
    vessel_id = Column(UUIDType, ForeignKey("vessels.id"), nullable=True)  # Vessel-specific approvals
    party_id = Column(UUIDType, ForeignKey("parties.id"), nullable=False)
    status = Column(String(50), default="pending")  # pending, approved, rejected
    updated_at = Column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    room = relationship("Room", back_populates="approvals")
    vessel = relationship("Vessel", back_populates="approvals")
    party = relationship("Party", back_populates="approvals")


class ActivityLog(Base):
    __tablename__ = "activity_log"

    id = Column(UUIDType, primary_key=True, default=uuid_default)
    room_id = Column(UUIDType, ForeignKey("rooms.id"), nullable=False)
    actor = Column(String(255), nullable=False)
    action = Column(String(100), nullable=False)
    meta_json = Column(Text, nullable=True)
    ts = Column(DateTime(timezone=True), server_default=func.now())

    room = relationship("Room", back_populates="activity_logs")


class FeatureFlag(Base):
    __tablename__ = "feature_flags"

    key = Column(String(100), primary_key=True)
    enabled = Column(Boolean, default=False)


class Message(Base):
    __tablename__ = "messages"

    id = Column(UUIDType, primary_key=True, default=uuid_default)
    room_id = Column(UUIDType, ForeignKey("rooms.id"), nullable=False)
    vessel_id = Column(UUIDType, ForeignKey("vessels.id"), nullable=True)  # Vessel-specific messages
    sender_email = Column(String(255), nullable=False)
    sender_name = Column(String(255), nullable=False)
    content = Column(Text, nullable=False)
    message_type = Column(String(50), default="text")  # text, file, system
    attachments = Column(Text, nullable=True)  # JSON array of file URLs
    read_by = Column(Text, nullable=True)  # JSON array of user emails
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    room = relationship("Room", back_populates="messages")
    vessel = relationship("Vessel", back_populates="messages")


class Notification(Base):
    __tablename__ = "notifications"

    id = Column(UUIDType, primary_key=True, default=uuid_default)
    user_email = Column(String(255), nullable=False)
    title = Column(String(255), nullable=False)
    message = Column(Text, nullable=False)
    notification_type = Column(
        String(50), nullable=False
    )  # document_upload, approval_required, etc.
    room_id = Column(UUIDType, ForeignKey("rooms.id"), nullable=True)
    read = Column(Boolean, default=False)
    data = Column(Text, nullable=True)  # JSON data
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    room = relationship("Room", back_populates="notifications")


class Vessel(Base):
    __tablename__ = "vessels"

    id = Column(UUIDType, primary_key=True, default=uuid_default)
    room_id = Column(UUIDType, ForeignKey("rooms.id"), nullable=False)
    name = Column(String(255), nullable=False)
    vessel_type = Column(String(100), nullable=False)
    flag = Column(String(100), nullable=False)
    imo = Column(String(20), nullable=False)
    owner = Column(String(255), nullable=True)  # Vessel owner company
    charterer = Column(String(255), nullable=True)  # Vessel charterer company
    status = Column(String(50), default="active")
    length = Column(Float, nullable=True)
    beam = Column(Float, nullable=True)
    draft = Column(Float, nullable=True)
    gross_tonnage = Column(Integer, nullable=True)
    net_tonnage = Column(Integer, nullable=True)
    built_year = Column(Integer, nullable=True)
    classification_society = Column(String(100), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    room = relationship("Room", back_populates="vessels")
    documents = relationship("Document", back_populates="vessel")
    approvals = relationship("Approval", back_populates="vessel")
    messages = relationship("Message", back_populates="vessel")


class Snapshot(Base):
    __tablename__ = "snapshots"

    id = Column(UUIDType, primary_key=True, default=uuid_default)
    room_id = Column(UUIDType, ForeignKey("rooms.id"), nullable=False)
    title = Column(String(255), nullable=False)
    created_by = Column(String(255), nullable=False)
    status = Column(String(50), default="generating")  # generating, completed, failed
    file_url = Column(String(500), nullable=True)
    file_size = Column(Integer, default=0)
    snapshot_type = Column(String(50), default="pdf")
    data = Column(Text, nullable=True)  # JSON data with generation options
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    room = relationship("Room", back_populates="snapshots")


class VesselPair(Base):
    __tablename__ = "vessel_pairs"

    id = Column(UUIDType, primary_key=True, default=uuid_default)
    room_id = Column(UUIDType, ForeignKey("rooms.id"), nullable=False)
    mother_vessel_id = Column(UUIDType, ForeignKey("vessels.id"), nullable=False)
    receiving_vessel_id = Column(UUIDType, ForeignKey("vessels.id"), nullable=False)
    status = Column(String(50), default="active")  # active, completed, cancelled
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    room = relationship("Room", backref="vessel_pairs")
    mother_vessel = relationship("Vessel", foreign_keys=[mother_vessel_id], backref="mother_pairs")
    receiving_vessel = relationship("Vessel", foreign_keys=[receiving_vessel_id], backref="receiving_pairs")


class WeatherData(Base):
    __tablename__ = "weather_data"

    id = Column(UUIDType, primary_key=True, default=uuid_default)
    room_id = Column(UUIDType, ForeignKey("rooms.id"), nullable=False)
    vessel_id = Column(UUIDType, ForeignKey("vessels.id"), nullable=True)
    location = Column(String(255), nullable=False)  # Location for weather data
    weather_data = Column(JSON, nullable=False)  # Weather API response data
    fetched_at = Column(DateTime(timezone=True), server_default=func.now())
    expires_at = Column(DateTime(timezone=True), nullable=False)  # When to refetch

    room = relationship("Room", backref="weather_data")
    vessel = relationship("Vessel", backref="weather_data")


class UserMessageAccess(Base):
    """
    Granular message access permissions per user per room.
    Allows flexible role-based message visibility configuration.
    """
    __tablename__ = "user_message_access"

    id = Column(UUIDType, primary_key=True, default=uuid_default)
    user_email = Column(String(255), nullable=False)
    room_id = Column(UUIDType, ForeignKey("rooms.id"), nullable=False)
    vessel_id = Column(UUIDType, ForeignKey("vessels.id"), nullable=True)  # NULL = room-level access
    access_level = Column(String(50), nullable=False)  # "room_level", "vessel_specific", "all"
    granted_by = Column(String(255), nullable=False)
    granted_at = Column(DateTime(timezone=True), server_default=func.now())
    
    room = relationship("Room", backref="user_message_access")
    vessel = relationship("Vessel", backref="user_message_access")


class UserRolePermission(Base):
    """
    Default message permissions by role.
    Allows defining what message types each role can see by default.
    """
    __tablename__ = "user_role_permissions"

    id = Column(UUIDType, primary_key=True, default=uuid_default)
    role = Column(String(50), nullable=False, unique=True)  # owner, seller, buyer, charterer, broker, viewer
    can_see_room_level = Column(Boolean, default=True)  # Can see room-level messages
    can_see_vessel_level = Column(Boolean, default=False)  # Can see their own vessel messages
    can_see_all_vessels = Column(Boolean, default=False)  # Can see all vessel messages
    created_at = Column(DateTime(timezone=True), server_default=func.now())


# ============ DASHBOARD METRICS MODELS ============

class Metric(Base):
    """
    Computed metrics for dashboard calculations.
    One entry per room per metric type per date.
    Used for historical tracking and trend analysis.
    """
    __tablename__ = "metrics"

    id = Column(UUIDType, primary_key=True, default=uuid_default)
    room_id = Column(UUIDType, ForeignKey("rooms.id"), nullable=False, index=True)
    metric_type = Column(String(50), nullable=False)  # demurrage, commission, compliance, etc
    metric_date = Column(DateTime(timezone=True), nullable=False, index=True)
    value = Column(Float, nullable=False)  # The computed metric value
    computed_at = Column(DateTime(timezone=True), server_default=func.now())
    
    room = relationship("Room", back_populates="metrics")
    
    # Composite unique constraint
    __table_args__ = (
        sqlalchemy.UniqueConstraint('room_id', 'metric_type', 'metric_date', name='uq_metrics_room_type_date'),
    )


class PartyMetric(Base):
    """
    Performance tracking for parties (Charterer, Shipowner, Broker, etc).
    Used to calculate reliability index and performance scores.
    """
    __tablename__ = "party_metrics"

    id = Column(UUIDType, primary_key=True, default=uuid_default)
    party_id = Column(UUIDType, ForeignKey("parties.id"), nullable=False, index=True)
    room_id = Column(UUIDType, ForeignKey("rooms.id"), nullable=False, index=True)
    
    # Performance metrics
    response_time_hours = Column(Float, nullable=True)  # Hours to respond
    quality_score = Column(Float, nullable=True)  # 1-10 scale
    reliability_index = Column(Float, nullable=True)  # 1-10 scale
    last_interaction = Column(DateTime(timezone=True), nullable=True)
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    
    room = relationship("Room", back_populates="party_metrics")
    party = relationship("Party", backref="metrics")
    
    # Composite unique constraint
    __table_args__ = (
        sqlalchemy.UniqueConstraint('party_id', 'room_id', name='uq_party_metrics_party_room'),
    )


class UserSettings(Base):
    __tablename__ = "user_settings"

    id = Column(UUIDType, primary_key=True, default=uuid_default)
    user_id = Column(UUIDType, ForeignKey("users.id"), nullable=False, unique=True)

    # Profile settings
    display_name = Column(String(255), nullable=True)
    timezone = Column(String(100), default="UTC")
    language = Column(String(10), default="en")
    date_format = Column(String(20), default="MM/DD/YYYY")
    time_format = Column(String(10), default="12h")

    # Notification settings (stored as JSON)
    notification_settings = Column(JSON, default=dict)

    # Appearance settings (stored as JSON)
    appearance_settings = Column(JSON, default=dict)

    # Security settings (stored as JSON)
    security_settings = Column(JSON, default=dict)

    # Data settings (stored as JSON)
    data_settings = Column(JSON, default=dict)

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    user = relationship("User", backref="settings")


class SanctionsList(Base):
    """
    International sanctions lists for vessel screening
    """
    __tablename__ = "sanctions_lists"

    id = Column(UUIDType, primary_key=True, default=uuid_default)
    name = Column(String(255), nullable=False)
    source = Column(String(255), nullable=False)  # OFAC, UN, EU, etc.
    last_updated = Column(DateTime(timezone=True), server_default=func.now())
    active = Column(Boolean, default=True)
    description = Column(Text, nullable=True)
    api_url = Column(String(500), nullable=True)  # URL to fetch updates
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    sanctioned_vessels = relationship("SanctionedVessel", back_populates="sanctions_list")


class SanctionedVessel(Base):
    """
    Vessels on international sanctions lists
    """
    __tablename__ = "sanctioned_vessels"

    id = Column(UUIDType, primary_key=True, default=uuid_default)
    list_id = Column(UUIDType, ForeignKey("sanctions_lists.id"), nullable=False)
    imo = Column(String(20), nullable=False)
    vessel_name = Column(String(255), nullable=False)
    flag = Column(String(100), nullable=True)
    owner = Column(String(255), nullable=True)
    reason = Column(Text, nullable=True)
    date_added = Column(DateTime(timezone=True), server_default=func.now())
    last_verified = Column(DateTime(timezone=True), server_default=func.now())
    active = Column(Boolean, default=True)

    sanctions_list = relationship("SanctionsList", back_populates="sanctioned_vessels")


class ExternalIntegration(Base):
    """
    Configuration for external API integrations (Q88, Equasis, etc.)
    """
    __tablename__ = "external_integrations"

    id = Column(UUIDType, primary_key=True, default=uuid_default)
    name = Column(String(255), nullable=False)
    provider = Column(String(255), nullable=False)  # q88, equasis, etc.
    api_key = Column(String(500), nullable=True)
    api_secret = Column(String(500), nullable=True)
    base_url = Column(String(500), nullable=True)
    enabled = Column(Boolean, default=False)
    last_sync = Column(DateTime(timezone=True), nullable=True)
    config = Column(JSON, default=dict)  # Additional configuration
    rate_limit = Column(Integer, default=100)  # Requests per minute
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())


class MissingDocumentsConfig(Base):
    """
    User preferences for Missing Documents Overview
    """
    __tablename__ = "missing_documents_config"

    id = Column(UUIDType, primary_key=True, default=uuid_default)
    user_id = Column(UUIDType, ForeignKey("users.id"), nullable=False, unique=True)
    auto_refresh = Column(Boolean, default=True)
    refresh_interval = Column(Integer, default=60)  # seconds
    default_sort = Column(String(50), default='priority')  # priority, expiry_date, status, type
    default_filter = Column(String(50), default='all')  # all, missing, expiring, under_review
    show_notifications = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    user = relationship("User", backref="missing_documents_config")


# ============ PHASE 2: SETTINGS MODELS ============

class EmailSettings(Base):
    """Email notification preferences for users"""
    __tablename__ = "email_settings"

    id = Column(UUIDType, primary_key=True, default=uuid_default)
    user_id = Column(UUIDType, ForeignKey("users.id"), nullable=False, unique=True)
    notifications_enabled = Column(Boolean, default=True)
    email_frequency = Column(String(50), default='immediate')  # immediate, daily, weekly
    digest_enabled = Column(Boolean, default=False)
    security_alerts = Column(Boolean, default=True)
    marketing_emails = Column(Boolean, default=False)
    verified = Column(Boolean, default=False)
    verified_at = Column(DateTime(timezone=True), nullable=True)
    verification_token = Column(String(500), nullable=True)
    verification_token_sent_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    user = relationship("User", backref="email_settings")


class TwoFactorAuth(Base):
    """Two-factor authentication configuration"""
    __tablename__ = "two_factor_auth"

    id = Column(UUIDType, primary_key=True, default=uuid_default)
    user_id = Column(UUIDType, ForeignKey("users.id"), nullable=False, unique=True)
    method = Column(String(50), default='totp')  # totp, sms, email
    secret = Column(String(500), nullable=True)  # TOTP secret
    enabled = Column(Boolean, default=False)
    verified = Column(Boolean, default=False)
    backup_codes = Column(JSON, default=list)  # List of hashed backup codes
    phone_number = Column(String(50), nullable=True)  # For SMS method
    attempts = Column(Integer, default=0)  # Failed verification attempts
    locked_until = Column(DateTime(timezone=True), nullable=True)
    enabled_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    user = relationship("User", backref="two_factor_auth")


class LoginHistory(Base):
    """Track user login activities"""
    __tablename__ = "login_history"

    id = Column(UUIDType, primary_key=True, default=uuid_default)
    user_id = Column(UUIDType, ForeignKey("users.id"), nullable=False)
    ip_address = Column(String(50), nullable=False)
    user_agent = Column(String(500), nullable=True)
    browser = Column(String(100), nullable=True)
    os = Column(String(100), nullable=True)
    device = Column(String(100), nullable=True)
    is_mobile = Column(Boolean, default=False)
    country = Column(String(100), nullable=True)
    city = Column(String(100), nullable=True)
    latitude = Column(Float, nullable=True)
    longitude = Column(Float, nullable=True)
    timezone = Column(String(100), nullable=True)
    success = Column(Boolean, default=True)
    risk_level = Column(String(50), default='low')  # low, medium, high
    risk_score = Column(Integer, default=0)
    reason = Column(String(500), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    user = relationship("User", backref="login_history")


class BackupSchedule(Base):
    """Backup scheduling configuration"""
    __tablename__ = "backup_schedule"

    id = Column(UUIDType, primary_key=True, default=uuid_default)
    user_id = Column(UUIDType, ForeignKey("users.id"), nullable=False, unique=True)
    enabled = Column(Boolean, default=False)
    frequency = Column(String(50), default='daily')  # daily, weekly, monthly
    time_of_day = Column(String(5), default='00:00')  # HH:MM format
    day_of_week = Column(Integer, nullable=True)  # For weekly backups (0-6)
    day_of_month = Column(Integer, nullable=True)  # For monthly backups (1-31)
    last_backup = Column(DateTime(timezone=True), nullable=True)
    next_backup = Column(DateTime(timezone=True), nullable=True)
    include_documents = Column(Boolean, default=True)
    include_data = Column(Boolean, default=True)
    compression = Column(Boolean, default=True)
    retention_days = Column(Integer, default=30)
    auto_cleanup = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    user = relationship("User", backref="backup_schedule")
    backups = relationship("BackupMetadata", back_populates="schedule")


class BackupMetadata(Base):
    """Backup file metadata"""
    __tablename__ = "backup_metadata"

    id = Column(UUIDType, primary_key=True, default=uuid_default)
    schedule_id = Column(UUIDType, ForeignKey("backup_schedule.id"), nullable=False)
    user_id = Column(UUIDType, ForeignKey("users.id"), nullable=False)
    file_name = Column(String(500), nullable=False)
    file_path = Column(String(1000), nullable=False)
    file_size = Column(Integer, default=0)  # bytes
    backup_type = Column(String(50), default='full')  # full, incremental
    include_documents = Column(Boolean, default=True)
    include_data = Column(Boolean, default=True)
    compressed = Column(Boolean, default=True)
    status = Column(String(50), default='completed')  # pending, in_progress, completed, failed
    error_message = Column(String(500), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    schedule = relationship("BackupSchedule", back_populates="backups")
    user = relationship("User", backref="backups")

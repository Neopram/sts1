import os
import uuid

from sqlalchemy import (JSON, Boolean, Column, DateTime, Float, ForeignKey,
                        Integer, String, Text)
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
    preferences = Column(JSON, default=dict)  # User preferences like theme, notifications, etc.
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

    parties = relationship("Party", back_populates="room")
    documents = relationship("Document", back_populates="room")
    approvals = relationship("Approval", back_populates="room")
    activity_logs = relationship("ActivityLog", back_populates="room")
    messages = relationship("Message", back_populates="room")
    notifications = relationship("Notification", back_populates="room")
    vessels = relationship("Vessel", back_populates="room")
    snapshots = relationship("Snapshot", back_populates="room")


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

    room = relationship("Room", back_populates="documents")
    vessel = relationship("Vessel", back_populates="documents")
    document_type = relationship("DocumentType", back_populates="documents")
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

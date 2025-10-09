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
    password_hash = Column(String(255), nullable=True)  # Hashed password
    company = Column(String(255), nullable=True)
    phone = Column(String(50), nullable=True)
    location = Column(String(255), nullable=True)
    timezone = Column(String(100), default="UTC")
    bio = Column(Text, nullable=True)
    avatar_url = Column(String(500), nullable=True)
    preferences = Column(JSON, default=dict)  # User preferences like theme, notifications, etc.
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    last_login = Column(DateTime(timezone=True), nullable=True)
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
    party_id = Column(UUIDType, ForeignKey("parties.id"), nullable=False)
    status = Column(String(50), default="pending")  # pending, approved, rejected
    updated_at = Column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    room = relationship("Room", back_populates="approvals")
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
    sender_email = Column(String(255), nullable=False)
    sender_name = Column(String(255), nullable=False)
    content = Column(Text, nullable=False)
    message_type = Column(String(50), default="text")  # text, file, system
    attachments = Column(Text, nullable=True)  # JSON array of file URLs
    read_by = Column(Text, nullable=True)  # JSON array of user emails
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    room = relationship("Room", back_populates="messages")


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

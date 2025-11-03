"""
STS OPERATIONS DATA MODELS - PHASE 1
====================================
Defines database models for STS operation sessions and related entities.

Models:
- StsOperationSession: Main STS operation record
- OperationParticipant: Individual participants (trading co, broker, shipowner)
- StsOperationCode: Generated STS operation codes
- OperationVessel: Mother/daughter vessel assignments
"""

import uuid
import os
from datetime import datetime
from sqlalchemy import (
    Column, String, DateTime, Boolean, Float, Integer, ForeignKey, Text, JSON, Enum
)
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

from app.models import Base


class StsOperationSession(Base):
    """
    Main STS Operation Session record
    
    Represents a complete STS operation between trading company and shipowner.
    One operation can involve multiple vessels and many participants.
    """
    __tablename__ = "sts_operation_sessions"
    __table_args__ = {'extend_existing': True}

    id = Column(UUIDType, primary_key=True, default=uuid_default)
    
    # Basic Information
    title = Column(String(500), nullable=False, index=True)
    description = Column(Text, nullable=True)
    location = Column(String(255), nullable=False, index=True)
    region = Column(String(100), nullable=True)
    
    # Dates
    scheduled_start_date = Column(DateTime(timezone=True), nullable=False)
    scheduled_end_date = Column(DateTime(timezone=True), nullable=True)
    actual_start_date = Column(DateTime(timezone=True), nullable=True)
    actual_end_date = Column(DateTime(timezone=True), nullable=True)
    
    # STS Operation Code
    sts_operation_code = Column(String(50), unique=True, nullable=False, index=True)
    code_generated_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Q88 Integration
    q88_enabled = Column(Boolean, default=False)
    q88_operation_id = Column(String(100), nullable=True)  # External Q88 ID
    q88_last_sync = Column(DateTime(timezone=True), nullable=True)
    
    # Status
    status = Column(String(50), default="draft", index=True)  # draft, ready, active, completed, cancelled
    
    # Metadata
    created_by = Column(String(255), nullable=True)  # User who created
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    participants = relationship("OperationParticipant", back_populates="operation", cascade="all, delete-orphan")
    vessels = relationship("OperationVessel", back_populates="operation", cascade="all, delete-orphan")
    operation_codes = relationship("StsOperationCode", back_populates="operation")

    def __repr__(self):
        return f"<StsOperationSession(id={self.id}, title='{self.title}', code='{self.sts_operation_code}')>"


class OperationParticipant(Base):
    """
    STS Operation Participant
    
    Represents individual participants in an STS operation.
    Can be trading company staff, broker, shipowner staff, etc.
    """
    __tablename__ = "operation_participants"
    __table_args__ = {'extend_existing': True}

    id = Column(UUIDType, primary_key=True, default=uuid_default)
    operation_id = Column(UUIDType, ForeignKey("sts_operation_sessions.id"), nullable=False, index=True)
    
    # Participant Type (organization category)
    participant_type = Column(String(50), nullable=False, index=True)
    # Values: trading_company, broker, shipowner, inspector, other
    
    # Role within organization
    role = Column(String(50), nullable=False)
    # Values: chartering_person, operator, vetting_officer, broker_operator, etc.
    
    # Individual Information
    name = Column(String(255), nullable=False)
    email = Column(String(255), nullable=False, index=True)
    phone = Column(String(50), nullable=True)
    
    # Organization Information
    organization = Column(String(255), nullable=True)
    position = Column(String(100), nullable=True)
    
    # Status
    status = Column(String(50), default="invited")  # invited, accepted, declined, inactive
    invitation_sent_at = Column(DateTime(timezone=True), nullable=True)
    acceptance_date = Column(DateTime(timezone=True), nullable=True)
    
    # Metadata
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    operation = relationship("StsOperationSession", back_populates="participants")

    def __repr__(self):
        return f"<OperationParticipant(role='{self.role}', email='{self.email}')>"


class OperationVessel(Base):
    """
    Operation Vessel Assignment
    
    Links vessels to STS operations.
    Supports mother/daughter vessel relationships.
    """
    __tablename__ = "operation_vessels"
    __table_args__ = {'extend_existing': True}

    id = Column(UUIDType, primary_key=True, default=uuid_default)
    operation_id = Column(UUIDType, ForeignKey("sts_operation_sessions.id"), nullable=False, index=True)
    vessel_id = Column(UUIDType, ForeignKey("vessels.id"), nullable=True)
    
    # Vessel Information (cached from Q88 or manual entry)
    vessel_name = Column(String(255), nullable=False, index=True)
    vessel_imo = Column(String(20), unique=True, nullable=False, index=True)
    mmsi = Column(String(20), nullable=True)
    vessel_type = Column(String(50), nullable=True)  # tanker, bulk carrier, container, etc.
    flag = Column(String(50), nullable=True)
    gross_tonnage = Column(Float, nullable=True)
    
    # Vessel Role in Operation
    vessel_role = Column(String(50), nullable=False)
    # Values: mother_vessel, daughter_vessel, supply_vessel, support_vessel
    
    # Assignment
    assigned_to_party = Column(String(100), nullable=True)  # trading_company, shipowner, broker
    assigned_to_email = Column(String(255), nullable=True)
    
    # Status
    status = Column(String(50), default="assigned")  # assigned, pending, approved, rejected, cancelled
    documents_status = Column(String(50), default="pending")  # pending, reviewing, approved
    
    # Documents Required
    documents_required = Column(JSON, default=dict)  # {"Q88": "required", "CSR": "required", etc.}
    documents_submitted = Column(JSON, default=dict)  # {"Q88": "2025-01-20", "CSR": "2025-01-19"}
    documents_approved = Column(JSON, default=dict)  # {"Q88": "2025-01-20", "CSR": "2025-01-20"}
    
    # Metadata
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    operation = relationship("StsOperationSession", back_populates="vessels")

    def __repr__(self):
        return f"<OperationVessel(vessel_name='{self.vessel_name}', imo='{self.vessel_imo}')>"


class StsOperationCode(Base):
    """
    STS Operation Code Record
    
    Stores generated STS operation codes and their metadata.
    Used for tracking and auditing operation code generation.
    """
    __tablename__ = "sts_operation_codes"
    __table_args__ = {'extend_existing': True}

    id = Column(UUIDType, primary_key=True, default=uuid_default)
    operation_id = Column(UUIDType, ForeignKey("sts_operation_sessions.id"), nullable=False, index=True)
    
    # Code
    code = Column(String(50), unique=True, nullable=False, index=True)
    
    # Code Generation Details
    generated_by = Column(String(255), nullable=True)  # User ID who generated
    generated_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Code Status
    is_active = Column(Boolean, default=True)
    expires_at = Column(DateTime(timezone=True), nullable=True)
    
    # Additional Info
    format_version = Column(String(20), default="1.0")  # STS code format version
    notes = Column(Text, nullable=True)
    
    # Relationships
    operation = relationship("StsOperationSession", back_populates="operation_codes")

    def __repr__(self):
        return f"<StsOperationCode(code='{self.code}')>"


# Make sure models are exported
__all__ = [
    'StsOperationSession',
    'OperationParticipant',
    'OperationVessel',
    'StsOperationCode',
]
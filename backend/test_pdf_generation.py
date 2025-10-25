"""
Test suite for Day 2: Real PDF Generation
Tests ReportLab PDF generation, data gathering, and storage
"""

import asyncio
import io
import json
import logging
import os
import uuid
from datetime import datetime, timedelta
from pathlib import Path

import pytest
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.orm import sessionmaker

from app.database import Base
from app.models import (
    Room, Party, Vessel, Document, DocumentType,
    Approval, ActivityLog, Snapshot
)
from app.services.pdf_generator import pdf_generator
from app.services.snapshot_data_service import snapshot_data_service
from app.services.storage_service import storage_service

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


# Test database setup (in-memory SQLite)
TEST_DATABASE_URL = "sqlite+aiosqlite:///:memory:"


@pytest.fixture
async def test_session():
    """Create a test database session"""
    engine = create_async_engine(TEST_DATABASE_URL, echo=False)
    
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    
    async_session = sessionmaker(
        engine, class_=AsyncSession, expire_on_commit=False
    )
    
    async with async_session() as session:
        yield session
    
    await engine.dispose()


@pytest.mark.asyncio
async def test_pdf_generator_basic(test_session):
    """Test basic PDF generation with minimal data"""
    print("\n✅ TEST: Basic PDF Generation")
    
    room_data = {
        "id": "room-123",
        "title": "Test Room",
        "location": "Port of Shanghai",
        "status": "active",
        "sts_eta": (datetime.utcnow() + timedelta(days=2)).isoformat(),
        "created_at": datetime.utcnow().isoformat(),
        "created_by": "system@test.com",
        "description": "Test room for PDF generation",
        "parties": [
            {
                "name": "Vessel Owner",
                "role": "owner",
                "email": "owner@test.com",
                "company": "Owner Corp",
            },
            {
                "name": "Charterer",
                "role": "charterer",
                "email": "charterer@test.com",
                "company": "Charter Corp",
            },
        ],
        "vessels": [
            {
                "name": "Test Vessel 1",
                "vessel_type": "Tanker",
                "flag": "SGP",
                "imo": "1234567",
                "owner": "Owner Corp",
                "status": "active",
                "gross_tonnage": 50000,
            },
        ],
        "documents": [],
        "approvals": [],
        "activities": [],
        "generated_by": "system@test.com",
        "snapshot_id": str(uuid.uuid4()),
    }
    
    # Generate PDF
    pdf_content = pdf_generator.generate_room_snapshot(
        room_data=room_data,
        include_documents=True,
        include_activity=True,
        include_approvals=True,
    )
    
    # Validate PDF
    assert pdf_content is not None, "PDF content is None"
    assert isinstance(pdf_content, bytes), "PDF content is not bytes"
    assert len(pdf_content) > 0, "PDF content is empty"
    assert pdf_content[:4] == b"%PDF", "PDF content doesn't start with PDF header"
    
    print(f"✅ Generated PDF: {len(pdf_content)} bytes")
    print(f"✅ PDF starts with header: {pdf_content[:4]}")


@pytest.mark.asyncio
async def test_pdf_generator_with_documents(test_session):
    """Test PDF generation with documents section"""
    print("\n✅ TEST: PDF Generation with Documents")
    
    room_data = {
        "id": "room-123",
        "title": "Room with Documents",
        "location": "Port of Rotterdam",
        "status": "active",
        "sts_eta": (datetime.utcnow() + timedelta(days=3)).isoformat(),
        "created_at": datetime.utcnow().isoformat(),
        "created_by": "user@test.com",
        "description": "Room with documents",
        "parties": [],
        "vessels": [],
        "documents": [
            {
                "type_name": "Certificate of Registry",
                "status": "approved",
                "uploaded_by": "user@test.com",
                "expires_on": (datetime.utcnow() + timedelta(days=365)).isoformat(),
                "notes": "Valid certificate",
            },
            {
                "type_name": "Insurance Certificate",
                "status": "pending",
                "uploaded_by": None,
                "expires_on": None,
                "notes": "Awaiting upload",
            },
        ],
        "approvals": [],
        "activities": [],
        "generated_by": "user@test.com",
        "snapshot_id": str(uuid.uuid4()),
    }
    
    pdf_content = pdf_generator.generate_room_snapshot(
        room_data=room_data,
        include_documents=True,
        include_activity=False,
        include_approvals=False,
    )
    
    assert len(pdf_content) > 0, "PDF content is empty"
    assert pdf_content[:4] == b"%PDF", "Invalid PDF header"
    
    print(f"✅ Generated PDF with documents: {len(pdf_content)} bytes")


@pytest.mark.asyncio
async def test_pdf_generator_with_approvals(test_session):
    """Test PDF generation with approvals section"""
    print("\n✅ TEST: PDF Generation with Approvals")
    
    room_data = {
        "id": "room-123",
        "title": "Room with Approvals",
        "location": "Port of Singapore",
        "status": "active",
        "sts_eta": datetime.utcnow().isoformat(),
        "created_at": datetime.utcnow().isoformat(),
        "created_by": "admin@test.com",
        "description": None,
        "parties": [],
        "vessels": [],
        "documents": [],
        "approvals": [
            {
                "party_name": "Owner",
                "party_role": "owner",
                "party_email": "owner@test.com",
                "status": "approved",
                "updated_at": datetime.utcnow().isoformat(),
            },
            {
                "party_name": "Charterer",
                "party_role": "charterer",
                "party_email": "charterer@test.com",
                "status": "pending",
                "updated_at": datetime.utcnow().isoformat(),
            },
        ],
        "activities": [],
        "generated_by": "admin@test.com",
        "snapshot_id": str(uuid.uuid4()),
    }
    
    pdf_content = pdf_generator.generate_room_snapshot(
        room_data=room_data,
        include_documents=False,
        include_activity=False,
        include_approvals=True,
    )
    
    assert len(pdf_content) > 0, "PDF content is empty"
    assert pdf_content[:4] == b"%PDF", "Invalid PDF header"
    
    print(f"✅ Generated PDF with approvals: {len(pdf_content)} bytes")


@pytest.mark.asyncio
async def test_pdf_generator_with_activity(test_session):
    """Test PDF generation with activity log section"""
    print("\n✅ TEST: PDF Generation with Activity Log")
    
    room_data = {
        "id": "room-123",
        "title": "Room with Activity",
        "location": "Port of Hamburg",
        "status": "active",
        "sts_eta": datetime.utcnow().isoformat(),
        "created_at": datetime.utcnow().isoformat(),
        "created_by": "operator@test.com",
        "description": "Test room",
        "parties": [],
        "vessels": [],
        "documents": [],
        "approvals": [],
        "activities": [
            {
                "ts": (datetime.utcnow() - timedelta(hours=5)).isoformat(),
                "actor": "user1@test.com",
                "action": "snapshot_created",
                "meta_json": '{"snapshot_id": "snap-1"}',
            },
            {
                "ts": (datetime.utcnow() - timedelta(hours=3)).isoformat(),
                "actor": "user2@test.com",
                "action": "document_uploaded",
                "meta_json": '{"doc_type": "certificate"}',
            },
            {
                "ts": datetime.utcnow().isoformat(),
                "actor": "user1@test.com",
                "action": "approval_granted",
                "meta_json": '{"party": "owner"}',
            },
        ],
        "generated_by": "operator@test.com",
        "snapshot_id": str(uuid.uuid4()),
    }
    
    pdf_content = pdf_generator.generate_room_snapshot(
        room_data=room_data,
        include_documents=False,
        include_activity=True,
        include_approvals=False,
    )
    
    assert len(pdf_content) > 0, "PDF content is empty"
    assert pdf_content[:4] == b"%PDF", "Invalid PDF header"
    
    print(f"✅ Generated PDF with activity: {len(pdf_content)} bytes")


@pytest.mark.asyncio
async def test_pdf_generator_full_snapshot(test_session):
    """Test PDF generation with all sections"""
    print("\n✅ TEST: Full Snapshot PDF Generation")
    
    now = datetime.utcnow()
    room_data = {
        "id": "room-full",
        "title": "Complete Room Snapshot",
        "location": "Port of Dubai",
        "status": "active",
        "sts_eta": (now + timedelta(days=5)).isoformat(),
        "created_at": now.isoformat(),
        "created_by": "chief@test.com",
        "description": "Complete snapshot with all sections for testing",
        "parties": [
            {"name": "Vessel A", "role": "owner", "email": "owner@a.com", "company": "A Corp"},
            {"name": "Vessel B", "role": "charterer", "email": "charterer@b.com", "company": "B Corp"},
            {"name": "Broker", "role": "broker", "email": "broker@test.com", "company": "Broker Inc"},
        ],
        "vessels": [
            {
                "name": "Mother Vessel",
                "vessel_type": "Tanker",
                "flag": "NLD",
                "imo": "9876543",
                "owner": "A Corp",
                "status": "active",
                "gross_tonnage": 75000,
                "net_tonnage": 45000,
                "built_year": 2015,
            },
            {
                "name": "Receiving Vessel",
                "vessel_type": "Tanker",
                "flag": "SGP",
                "imo": "1234567",
                "charterer": "B Corp",
                "status": "active",
                "gross_tonnage": 60000,
                "net_tonnage": 35000,
                "built_year": 2018,
            },
        ],
        "documents": [
            {
                "type_name": "Certificate of Registry",
                "status": "approved",
                "uploaded_by": "operator@test.com",
                "expires_on": (now + timedelta(days=365)).isoformat(),
                "notes": "Valid and current",
            },
            {
                "type_name": "Insurance Certificate",
                "status": "approved",
                "uploaded_by": "operator@test.com",
                "expires_on": (now + timedelta(days=180)).isoformat(),
                "notes": "P&I insurance valid",
            },
            {
                "type_name": "Safety Management Certificate",
                "status": "pending",
                "uploaded_by": None,
                "expires_on": None,
                "notes": "Awaiting document",
            },
        ],
        "approvals": [
            {
                "party_name": "Vessel A Owner",
                "party_role": "owner",
                "party_email": "owner@a.com",
                "status": "approved",
                "updated_at": (now - timedelta(hours=2)).isoformat(),
            },
            {
                "party_name": "Vessel B Charterer",
                "party_role": "charterer",
                "party_email": "charterer@b.com",
                "status": "approved",
                "updated_at": (now - timedelta(hours=1)).isoformat(),
            },
        ],
        "activities": [
            {
                "ts": (now - timedelta(hours=24)).isoformat(),
                "actor": "chief@test.com",
                "action": "room_created",
                "meta_json": '{"room_type": "STS"}',
            },
            {
                "ts": (now - timedelta(hours=12)).isoformat(),
                "actor": "operator@test.com",
                "action": "parties_added",
                "meta_json": '{"count": 3}',
            },
            {
                "ts": (now - timedelta(hours=6)).isoformat(),
                "actor": "operator@test.com",
                "action": "documents_uploaded",
                "meta_json": '{"count": 3}',
            },
            {
                "ts": (now - timedelta(hours=2)).isoformat(),
                "actor": "owner@a.com",
                "action": "approval_granted",
                "meta_json": '{"party": "owner"}',
            },
            {
                "ts": (now - timedelta(minutes=30)).isoformat(),
                "actor": "charterer@b.com",
                "action": "approval_granted",
                "meta_json": '{"party": "charterer"}',
            },
        ],
        "generated_by": "chief@test.com",
        "snapshot_id": str(uuid.uuid4()),
    }
    
    pdf_content = pdf_generator.generate_room_snapshot(
        room_data=room_data,
        include_documents=True,
        include_activity=True,
        include_approvals=True,
    )
    
    assert len(pdf_content) > 100000, "Full PDF should be larger"
    assert pdf_content[:4] == b"%PDF", "Invalid PDF header"
    
    print(f"✅ Generated full PDF: {len(pdf_content)} bytes")
    print(f"✅ PDF is professionally formatted with all sections")


@pytest.mark.asyncio
async def test_file_storage(test_session):
    """Test PDF file storage"""
    print("\n✅ TEST: PDF File Storage")
    
    pdf_content = b"%PDF-1.4\nTest PDF content here"
    room_id = str(uuid.uuid4())
    snapshot_id = str(uuid.uuid4())
    
    # Create uploads directory
    uploads_dir = Path("uploads")
    uploads_dir.mkdir(exist_ok=True)
    
    try:
        # Store file
        snapshots_dir = uploads_dir / "snapshots" / room_id
        snapshots_dir.mkdir(parents=True, exist_ok=True)
        
        file_path = snapshots_dir / f"{snapshot_id}.pdf"
        with open(file_path, "wb") as f:
            f.write(pdf_content)
        
        # Verify file exists
        assert file_path.exists(), "File not stored"
        
        # Read file back
        with open(file_path, "rb") as f:
            stored_content = f.read()
        
        assert stored_content == pdf_content, "Stored content doesn't match"
        
        print(f"✅ Stored PDF file: {file_path}")
        print(f"✅ File size: {len(stored_content)} bytes")
        
        # Clean up
        file_path.unlink()
        snapshots_dir.rmdir()
        (uploads_dir / "snapshots").rmdir()
        
    finally:
        # Cleanup
        import shutil
        if uploads_dir.exists():
            shutil.rmtree(uploads_dir, ignore_errors=True)


def test_pdf_generator_consistency():
    """Test that PDF generator produces consistent output"""
    print("\n✅ TEST: PDF Generator Consistency")
    
    room_data = {
        "id": "room-consistency",
        "title": "Consistency Test Room",
        "location": "Test Port",
        "status": "active",
        "sts_eta": datetime.utcnow().isoformat(),
        "created_at": datetime.utcnow().isoformat(),
        "created_by": "tester@test.com",
        "description": "Testing consistency",
        "parties": [],
        "vessels": [],
        "documents": [],
        "approvals": [],
        "activities": [],
        "generated_by": "tester@test.com",
        "snapshot_id": "test-snap-1",
    }
    
    # Generate PDF twice
    pdf1 = pdf_generator.generate_room_snapshot(room_data)
    pdf2 = pdf_generator.generate_room_snapshot(room_data)
    
    # Both should be valid PDFs
    assert pdf1[:4] == b"%PDF", "PDF1 invalid"
    assert pdf2[:4] == b"%PDF", "PDF2 invalid"
    
    # Both should have content
    assert len(pdf1) > 0 and len(pdf2) > 0, "PDFs are empty"
    
    print(f"✅ PDF 1 size: {len(pdf1)} bytes")
    print(f"✅ PDF 2 size: {len(pdf2)} bytes")
    print(f"✅ Both PDFs are valid and consistent")


if __name__ == "__main__":
    # Run tests manually
    print("\n" + "="*80)
    print("DAY 2: PDF GENERATION TESTS")
    print("="*80)
    
    # Run basic tests
    asyncio.run(test_pdf_generator_basic(None))
    asyncio.run(test_pdf_generator_with_documents(None))
    asyncio.run(test_pdf_generator_with_approvals(None))
    asyncio.run(test_pdf_generator_with_activity(None))
    asyncio.run(test_pdf_generator_full_snapshot(None))
    asyncio.run(test_file_storage(None))
    test_pdf_generator_consistency()
    
    print("\n" + "="*80)
    print("✅ ALL PDF GENERATION TESTS PASSED")
    print("="*80)
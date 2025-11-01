"""
Comprehensive test configuration for STS Clearance Hub
Implements fixtures for all testing scenarios including maritime compliance
"""

import asyncio
import os
import shutil
import tempfile
import uuid
from datetime import datetime, timedelta
from typing import AsyncGenerator, Generator
from unittest.mock import AsyncMock, MagicMock

import pytest
import pytest_asyncio
import redis.asyncio as redis
# FastAPI and SQLAlchemy imports
from fastapi.testclient import TestClient
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.database import get_async_session
from app.dependencies import get_current_user
# Application imports
from app.main import app
from app.models import (ActivityLog, Approval, Base, Document, DocumentType,
                        Message, Notification, Party, Room, Snapshot, User,
                        Vessel)

# Test database URL - use in-memory SQLite for speed
TEST_DATABASE_URL = "sqlite+aiosqlite:///:memory:"

# Create test engine
test_engine = create_async_engine(
    TEST_DATABASE_URL,
    echo=False,
    poolclass=StaticPool,
    connect_args={"check_same_thread": False},
    future=True,
)

# Create test session factory
TestSessionLocal = sessionmaker(
    test_engine, class_=AsyncSession, expire_on_commit=False
)


@pytest.fixture(scope="session")
def event_loop() -> Generator:
    """Create an instance of the default event loop for the test session."""
    loop = asyncio.get_event_loop_policy().new_event_loop()
    yield loop
    loop.close()


@pytest_asyncio.fixture
async def db_session() -> AsyncGenerator[AsyncSession, None]:
    """Create a test database session."""
    # Create all tables
    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    # Create session
    async with TestSessionLocal() as session:
        yield session

    # Clean up
    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)


@pytest.fixture
def override_get_db(db_session: AsyncSession):
    """Override the database dependency."""

    async def _override_get_db():
        yield db_session

    return _override_get_db


@pytest.fixture
def test_client(override_get_db):
    """Create a test client with database override."""
    app.dependency_overrides[get_async_session] = override_get_db
    client = TestClient(app)
    yield client
    app.dependency_overrides.clear()

@pytest_asyncio.fixture
async def async_client(override_get_db):
    """Create an async test client with database override."""
    from httpx import AsyncClient, ASGITransport
    app.dependency_overrides[get_async_session] = override_get_db
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        yield client
    app.dependency_overrides.clear()


@pytest.fixture
def mock_redis():
    """Mock Redis client for testing."""
    mock_redis = AsyncMock()
    mock_redis.get.return_value = None
    mock_redis.set.return_value = True
    mock_redis.delete.return_value = True
    mock_redis.incr.return_value = 1
    mock_redis.expire.return_value = True
    mock_redis.ping.return_value = True
    mock_redis.info.return_value = {
        "connected_clients": 1,
        "used_memory": 1024,
        "keyspace_hits": 100,
        "keyspace_misses": 10,
    }
    return mock_redis


@pytest.fixture
def test_user():
    """Create a test user."""
    return {
        "id": str(uuid.uuid4()),
        "email": "test@maritime.com",
        "name": "Test User",
        "role": "broker",  # Changed to broker to allow room creation
    }


@pytest_asyncio.fixture
async def admin_user_in_db(db_session: AsyncSession):
    """Create an admin user in the database for testing."""
    user_id = str(uuid.uuid4())
    admin = User(
        id=user_id,
        email="admin@maritime.com",
        name="Admin User",
        role="admin",
        password_hash="hashed_test_password",
    )
    db_session.add(admin)
    await db_session.commit()
    return {
        "user_id": user_id,
        "id": user_id,
        "email": "admin@maritime.com",
        "name": "Admin User",
        "role": "admin",
    }


@pytest_asyncio.fixture
async def regular_user_in_db(db_session: AsyncSession):
    """Create a regular user in the database for testing."""
    user_id = str(uuid.uuid4())
    user = User(
        id=user_id,
        email="user@maritime.com",
        name="Regular User",
        role="user",
        password_hash="hashed_test_password",
    )
    db_session.add(user)
    await db_session.commit()
    return {
        "user_id": user_id,
        "id": user_id,
        "email": "user@maritime.com",
        "name": "Regular User",
        "role": "user",
    }


@pytest.fixture
def mock_current_user(test_user):
    """Mock current user dependency."""

    async def _mock_current_user():
        return test_user

    return _mock_current_user


@pytest_asyncio.fixture
async def authenticated_client(test_client, db_session, test_user):
    """Create an authenticated test client with user in database."""
    from app.models import User
    
    # Create user in database if not exists
    from sqlalchemy import select
    result = await db_session.execute(
        select(User).where(User.email == test_user["email"])
    )
    user = result.scalar_one_or_none()
    if not user:
        user = User(
            id=test_user["id"],
            email=test_user["email"],
            name=test_user["name"],
            role=test_user["role"],
            password_hash="test_hash",
        )
        db_session.add(user)
        await db_session.commit()
        await db_session.refresh(user)
    
    # Mock get_current_user to return dict (for compatibility)
    async def mock_current_user():
        return test_user
    
    app.dependency_overrides[get_current_user] = mock_current_user
    yield test_client
    app.dependency_overrides.clear()


@pytest_asyncio.fixture
async def sample_document_types(db_session: AsyncSession):
    """Create sample document types for testing."""
    document_types = [
        DocumentType(
            id=str(uuid.uuid4()),
            code="CERT_CLASS",
            name="Classification Certificate",
            required=True,
            criticality="high",
        ),
        DocumentType(
            id=str(uuid.uuid4()),
            code="CERT_SAFETY",
            name="Safety Certificate",
            required=True,
            criticality="high",
        ),
        DocumentType(
            id=str(uuid.uuid4()),
            code="CERT_RADIO",
            name="Radio Certificate",
            required=True,
            criticality="med",
        ),
        DocumentType(
            id=str(uuid.uuid4()),
            code="LOG_DECK",
            name="Deck Log Book",
            required=False,
            criticality="low",
        ),
    ]

    for doc_type in document_types:
        db_session.add(doc_type)

    await db_session.commit()
    return document_types


@pytest_asyncio.fixture
async def sample_room(db_session: AsyncSession, test_user):
    """Create a sample room for testing."""
    room = Room(
        id=str(uuid.uuid4()),
        title="Test STS Operation - Vessel Alpha & Beta",
        location="Singapore Anchorage",
        sts_eta=datetime.utcnow() + timedelta(days=7),
        created_by=test_user["email"],
    )

    db_session.add(room)
    await db_session.commit()
    await db_session.refresh(room)
    return room


@pytest_asyncio.fixture
async def test_room(db_session: AsyncSession, test_user):
    """Alias for sample_room for backwards compatibility."""
    from app.models import Party
    
    room = Room(
        id=str(uuid.uuid4()),
        title="Test Room",
        location="Test Location",
        sts_eta=datetime.utcnow() + timedelta(days=7),
        created_by=test_user["email"],
    )
    db_session.add(room)
    await db_session.flush()
    
    # Add test_user as a party in the room so they can access it
    party = Party(
        id=str(uuid.uuid4()),
        room_id=room.id,
        role="owner",
        name=test_user["name"],
        email=test_user["email"],
    )
    db_session.add(party)
    await db_session.commit()
    await db_session.refresh(room)
    return room


@pytest.fixture
def auth_headers(test_user):
    """Create authentication headers for testing."""
    # Create a mock token (in real app, this would be a JWT)
    return {
        "Authorization": f"Bearer mock_token_for_{test_user['email']}",
    }


@pytest_asyncio.fixture
async def authenticated_async_client(async_client, override_get_db, db_session, test_user):
    """Create an authenticated async client for testing."""
    from app.dependencies import get_current_user
    from app.models import User, Party
    
    # Create a User object for the mock
    async def mock_current_user():
        # Try to get user from database first
        from sqlalchemy import select
        result = await db_session.execute(
            select(User).where(User.email == test_user["email"])
        )
        user = result.scalar_one_or_none()
        if not user:
            # Create user if not exists
            user = User(
                id=test_user["id"],
                email=test_user["email"],
                name=test_user["name"],
                role=test_user["role"],
                password_hash="test_hash",
            )
            db_session.add(user)
            await db_session.flush()
            
            # Create a Party entry for this user (required by some endpoints)
            party = Party(
                id=str(uuid.uuid4()),
                room_id=None,  # Not associated with a specific room yet
                role=test_user["role"],
                name=test_user["name"],
                email=test_user["email"],
            )
            db_session.add(party)
            await db_session.commit()
            await db_session.refresh(user)
        else:
            # Ensure Party exists even if User exists
            party_result = await db_session.execute(
                select(Party).where(Party.email == test_user["email"]).limit(1)
            )
            party = party_result.scalar_one_or_none()
            if not party:
                party = Party(
                    id=str(uuid.uuid4()),
                    room_id=None,
                    role=test_user["role"],
                    name=test_user["name"],
                    email=test_user["email"],
                )
                db_session.add(party)
                await db_session.commit()
        return user
    
    app.dependency_overrides[get_current_user] = mock_current_user
    yield async_client
    app.dependency_overrides.clear()


@pytest.fixture
def mock_room_data():
    """Mock room data for testing."""
    return {
        "title": "New STS Operation",
        "location": "Singapore",
        "sts_eta": (datetime.utcnow() + timedelta(days=7)).isoformat(),
        "parties": [
            {
                "role": "owner",
                "name": "Test Owner",
                "email": "owner@test.com"
            },
            {
                "role": "charterer",
                "name": "Test Charterer",
                "email": "charterer@test.com"
            }
        ]
    }


@pytest_asyncio.fixture
async def test_document_types(db_session: AsyncSession):
    """Create test document types for testing."""
    document_types = [
        DocumentType(
            id=str(uuid.uuid4()),
            code="INSURANCE_CERT",
            name="Insurance Certificate",
            required=True,
            criticality="high",
        ),
        DocumentType(
            id=str(uuid.uuid4()),
            code="SAFETY_CERT",
            name="Safety Certificate",
            required=True,
            criticality="high",
        ),
    ]
    for doc_type in document_types:
        db_session.add(doc_type)
    await db_session.commit()
    return document_types


@pytest.fixture
def temp_file(temp_upload_dir):
    """Create a temporary file for testing."""
    import os
    temp_file_path = os.path.join(temp_upload_dir, "test_document.pdf")
    with open(temp_file_path, "wb") as f:
        f.write(b"Mock PDF content for testing")
    return temp_file_path


@pytest_asyncio.fixture
async def sample_parties(db_session: AsyncSession, sample_room):
    """Create sample parties for testing."""
    parties = [
        Party(
            id=str(uuid.uuid4()),
            room_id=sample_room.id,
            role="owner",
            name="Maritime Shipping Co.",
            email="owner@maritime.com",
        ),
        Party(
            id=str(uuid.uuid4()),
            room_id=sample_room.id,
            role="charterer",
            name="Global Chartering Ltd.",
            email="charterer@global.com",
        ),
        Party(
            id=str(uuid.uuid4()),
            room_id=sample_room.id,
            role="broker",
            name="Ship Brokers Inc.",
            email="broker@shipbrokers.com",
        ),
    ]

    for party in parties:
        db_session.add(party)

    await db_session.commit()
    return parties


@pytest_asyncio.fixture
async def sample_vessels(db_session: AsyncSession, sample_room):
    """Create sample vessels for testing."""
    vessels = [
        Vessel(
            id=str(uuid.uuid4()),
            room_id=sample_room.id,
            name="MV Alpha",
            vessel_type="Tanker",
            flag="Singapore",
            imo="1234567",
            status="active",
            length=200.5,
            beam=32.2,
            draft=12.8,
            gross_tonnage=50000,
            net_tonnage=30000,
            built_year=2015,
            classification_society="DNV GL",
        ),
        Vessel(
            id=str(uuid.uuid4()),
            room_id=sample_room.id,
            name="MV Beta",
            vessel_type="Bulk Carrier",
            flag="Liberia",
            imo="7654321",
            status="active",
            length=180.0,
            beam=28.5,
            draft=11.2,
            gross_tonnage=40000,
            net_tonnage=25000,
            built_year=2018,
            classification_society="ABS",
        ),
    ]

    for vessel in vessels:
        db_session.add(vessel)

    await db_session.commit()
    return vessels


@pytest_asyncio.fixture
async def sample_documents(
    db_session: AsyncSession, sample_room, sample_document_types
):
    """Create sample documents for testing."""
    documents = []

    for i, doc_type in enumerate(sample_document_types):
        status = ["missing", "under_review", "approved", "expired"][i % 4]
        expires_on = (
            datetime.utcnow() + timedelta(days=30) if status != "missing" else None
        )

        document = Document(
            id=str(uuid.uuid4()),
            room_id=sample_room.id,
            type_id=doc_type.id,
            status=status,
            expires_on=expires_on,
            uploaded_by="test@maritime.com" if status != "missing" else None,
            uploaded_at=datetime.utcnow() if status != "missing" else None,
            notes=f"Test document for {doc_type.name}",
        )

        documents.append(document)
        db_session.add(document)

    await db_session.commit()
    return documents


@pytest.fixture
async def sample_activities(db_session: AsyncSession, sample_room, test_user):
    """Create sample activity logs for testing."""
    activities = []
    base_time = datetime.utcnow() - timedelta(days=5)

    actions = [
        "room_created",
        "document_uploaded",
        "document_approved",
        "party_added",
        "vessel_added",
        "message_sent",
        "approval_requested",
    ]

    for i in range(20):
        activity = ActivityLog(
            id=str(uuid.uuid4()),
            room_id=sample_room.id,
            actor=test_user["email"],
            action=actions[i % len(actions)],
            meta_json=f'{{"test_data": "value_{i}"}}',
            ts=base_time + timedelta(hours=i * 2),
        )

        activities.append(activity)
        db_session.add(activity)

    await db_session.commit()
    return activities


@pytest.fixture
async def sample_messages(db_session: AsyncSession, sample_room, test_user):
    """Create sample messages for testing."""
    messages = []

    for i in range(5):
        message = Message(
            id=str(uuid.uuid4()),
            room_id=sample_room.id,
            sender_email=test_user["email"],
            sender_name=test_user["name"],
            content=f"Test message {i + 1} for maritime operations",
            message_type="text",
            created_at=datetime.utcnow() - timedelta(hours=i),
        )

        messages.append(message)
        db_session.add(message)

    await db_session.commit()
    return messages


@pytest.fixture
def temp_upload_dir():
    """Create a temporary directory for file uploads."""
    temp_dir = tempfile.mkdtemp()
    yield temp_dir
    shutil.rmtree(temp_dir, ignore_errors=True)


@pytest.fixture
def sample_file_content():
    """Sample file content for upload testing."""
    return b"Sample PDF content for maritime document testing"


@pytest.fixture
def mock_file_upload():
    """Mock file upload for testing."""
    return {
        "filename": "test_certificate.pdf",
        "content_type": "application/pdf",
        "size": 1024,
        "content": b"Mock PDF content",
    }


@pytest.fixture
def maritime_compliance_data():
    """Sample data for maritime compliance testing."""
    return {
        "vessel_data": {
            "imo": "1234567",
            "flag_state": "Singapore",
            "classification_society": "DNV GL",
            "built_year": 2015,
            "vessel_type": "Oil Tanker",
        },
        "required_certificates": [
            "Classification Certificate",
            "Safety Certificate",
            "Radio Certificate",
            "Load Line Certificate",
            "Tonnage Certificate",
        ],
        "port_state_requirements": {
            "singapore": ["PSC_INSPECTION", "BUNKER_DELIVERY_NOTE"],
            "rotterdam": ["EU_MRV_COMPLIANCE", "SULPHUR_CONTENT_CERT"],
            "houston": ["USCG_INSPECTION", "OPA90_CERT"],
        },
    }


@pytest.fixture
def performance_test_data():
    """Data for performance testing scenarios."""
    return {
        "large_room_count": 100,
        "documents_per_room": 50,
        "activities_per_room": 1000,
        "concurrent_users": 50,
        "load_test_duration": 60,  # seconds
    }


# Pytest configuration
def pytest_configure(config):
    """Configure pytest with custom markers."""
    config.addinivalue_line("markers", "unit: mark test as a unit test")
    config.addinivalue_line("markers", "integration: mark test as an integration test")
    config.addinivalue_line("markers", "e2e: mark test as an end-to-end test")
    config.addinivalue_line("markers", "performance: mark test as a performance test")
    config.addinivalue_line("markers", "security: mark test as a security test")
    config.addinivalue_line("markers", "maritime: mark test as maritime-specific")
    config.addinivalue_line("markers", "slow: mark test as slow running")


# Custom assertions for maritime testing
class MaritimeAssertions:
    """Custom assertions for maritime compliance testing."""

    @staticmethod
    def assert_valid_imo(imo: str):
        """Assert that IMO number is valid."""
        assert len(imo) == 7, f"IMO number must be 7 digits, got {len(imo)}"
        assert imo.isdigit(), f"IMO number must be numeric, got {imo}"

        # IMO check digit validation
        check_sum = sum(int(imo[i]) * (7 - i) for i in range(6))
        check_digit = check_sum % 10
        assert int(imo[6]) == check_digit, f"Invalid IMO check digit for {imo}"

    @staticmethod
    def assert_certificate_validity(certificate_data: dict):
        """Assert that certificate data is valid."""
        required_fields = ["name", "expires_on", "issued_by", "certificate_number"]
        for field in required_fields:
            assert field in certificate_data, f"Missing required field: {field}"

        # Check expiration date is in the future
        if certificate_data.get("expires_on"):
            expires_on = datetime.fromisoformat(
                certificate_data["expires_on"].replace("Z", "+00:00")
            )
            assert expires_on > datetime.utcnow(), "Certificate has expired"

    @staticmethod
    def assert_compliance_status(room_data: dict, expected_compliance: float):
        """Assert that room compliance meets expected level."""
        total_docs = len(room_data.get("documents", []))
        approved_docs = len(
            [d for d in room_data.get("documents", []) if d.get("status") == "approved"]
        )

        if total_docs > 0:
            compliance_rate = approved_docs / total_docs
            assert (
                compliance_rate >= expected_compliance
            ), f"Compliance rate {compliance_rate:.2%} below expected {expected_compliance:.2%}"


@pytest.fixture
def maritime_assertions():
    """Provide maritime-specific assertions."""
    return MaritimeAssertions()


# Database utilities for testing
class TestDatabaseUtils:
    """Utilities for database testing."""

    @staticmethod
    async def create_test_room_with_full_data(session: AsyncSession, user_email: str):
        """Create a complete test room with all related data."""
        # Create room
        room = Room(
            id=str(uuid.uuid4()),
            title="Complete Test STS Operation",
            location="Test Port",
            sts_eta=datetime.utcnow() + timedelta(days=10),
            created_by=user_email,
        )
        session.add(room)
        await session.flush()

        # Create parties
        parties = [
            Party(
                id=str(uuid.uuid4()),
                room_id=room.id,
                role="owner",
                name="Test Owner",
                email="owner@test.com",
            ),
            Party(
                id=str(uuid.uuid4()),
                room_id=room.id,
                role="charterer",
                name="Test Charterer",
                email="charterer@test.com",
            ),
        ]
        for party in parties:
            session.add(party)

        # Create vessels
        vessel = Vessel(
            id=str(uuid.uuid4()),
            room_id=room.id,
            name="Test Vessel",
            vessel_type="Tanker",
            flag="Test Flag",
            imo="1234567",
            status="active",
        )
        session.add(vessel)

        await session.commit()
        return room, parties, vessel


@pytest.fixture
def db_utils():
    """Provide database testing utilities."""
    return TestDatabaseUtils()

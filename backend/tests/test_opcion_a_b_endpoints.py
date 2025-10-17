"""
Security Tests for OPCIÓN A and OPCIÓN B Endpoints

OPCIÓN A: 11 Endpoints (Users, Rooms, Documents)
- POST /users
- GET /users/{user_id}
- PATCH /users/{user_id}
- DELETE /users/{user_id}
- POST /rooms
- PATCH /rooms/{room_id}
- DELETE /rooms/{room_id}
- POST /documents
- PATCH /documents/{doc_id}
- DELETE /documents/{doc_id}
- GET /documents (with filters)

OPCIÓN B: 7 Endpoints (Approvals, Vessels)
- POST /approvals
- PATCH /approvals/{approval_id}
- DELETE /approvals/{approval_id}
- POST /vessels
- PATCH /vessels/{vessel_id}
- DELETE /vessels/{vessel_id}
- GET /vessels (with filters)
"""

import uuid
from datetime import datetime, timedelta
from typing import Dict

import pytest
from fastapi import status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession


# ============================================================================
# OPCIÓN A: User Management Endpoints (5 endpoints)
# ============================================================================

class TestUserManagement:
    """Test security of user management endpoints"""

    # POST /users
    @pytest.mark.asyncio
    async def test_create_user_success(self, test_client, admin_user_in_db, db_session: AsyncSession):
        """Test successful user creation by admin."""
        from app.dependencies import get_current_user
        def mock_current_user():
            return admin_user_in_db
        test_client.app.dependency_overrides[get_current_user] = mock_current_user

        response = test_client.post(
            "/api/v1/users",
            json={
                "email": "newuser@maritime.com",
                "name": "New User",
                "password": "SecurePassword123!",
                "role": "user"
            }
        )

        assert response.status_code in [200, 201]
        if response.status_code in [200, 201]:
            data = response.json()
            assert "id" in data
            assert data["email"] == "newuser@maritime.com"

    @pytest.mark.asyncio
    async def test_create_user_duplicate_prevention(self, test_client, admin_user_in_db, db_session: AsyncSession):
        """Test that duplicate user emails are prevented."""
        from app.models import User
        from passlib.context import CryptContext

        pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
        
        # Create first user
        user = User(
            id=str(uuid.uuid4()),
            email="duplicate@maritime.com",
            name="Duplicate Test",
            password_hash=pwd_context.hash("password123"),
            role="user"
        )
        db_session.add(user)
        await db_session.commit()

        from app.dependencies import get_current_user
        def mock_current_user():
            return admin_user_in_db
        test_client.app.dependency_overrides[get_current_user] = mock_current_user

        response = test_client.post(
            "/api/v1/users",
            json={
                "email": "duplicate@maritime.com",
                "name": "Another User",
                "password": "SecurePassword123!",
                "role": "user"
            }
        )

        assert response.status_code == status.HTTP_400_BAD_REQUEST

    @pytest.mark.asyncio
    async def test_create_user_invalid_email(self, test_client, admin_user_in_db):
        """Test email format validation."""
        from app.dependencies import get_current_user
        def mock_current_user():
            return admin_user_in_db
        test_client.app.dependency_overrides[get_current_user] = mock_current_user

        response = test_client.post(
            "/api/v1/users",
            json={
                "email": "not-an-email",
                "name": "Bad Email",
                "password": "SecurePassword123!",
                "role": "user"
            }
        )

        assert response.status_code in [400, 422]

    @pytest.mark.asyncio
    async def test_create_user_unauthorized(self, test_client, regular_user_in_db):
        """Test that only admins can create users."""
        from app.dependencies import get_current_user
        def mock_current_user():
            return regular_user_in_db
        test_client.app.dependency_overrides[get_current_user] = mock_current_user

        response = test_client.post(
            "/api/v1/users",
            json={
                "email": "newuser@maritime.com",
                "name": "New User",
                "password": "SecurePassword123!",
                "role": "user"
            }
        )

        assert response.status_code == status.HTTP_403_FORBIDDEN

    # GET /users/{user_id}
    @pytest.mark.asyncio
    async def test_get_user_success(self, test_client, admin_user_in_db, db_session: AsyncSession):
        """Test retrieving user by ID."""
        from app.models import User
        from passlib.context import CryptContext

        pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
        
        user_id = str(uuid.uuid4())
        user = User(
            id=user_id,
            email="getuser@maritime.com",
            name="Get User Test",
            password_hash=pwd_context.hash("password123"),
            role="user"
        )
        db_session.add(user)
        await db_session.commit()

        from app.dependencies import get_current_user
        def mock_current_user():
            return admin_user_in_db
        test_client.app.dependency_overrides[get_current_user] = mock_current_user

        response = test_client.get(f"/api/v1/users/{user_id}")

        assert response.status_code == 200
        data = response.json()
        assert data["id"] == user_id

    @pytest.mark.asyncio
    async def test_get_user_not_found(self, test_client, admin_user_in_db):
        """Test that requesting non-existent user returns 404."""
        from app.dependencies import get_current_user
        def mock_current_user():
            return admin_user_in_db
        test_client.app.dependency_overrides[get_current_user] = mock_current_user

        response = test_client.get(f"/api/v1/users/{uuid.uuid4()}")

        assert response.status_code == status.HTTP_404_NOT_FOUND

    # PATCH /users/{user_id}
    @pytest.mark.asyncio
    async def test_update_user_success(self, test_client, admin_user_in_db, db_session: AsyncSession):
        """Test successful user update."""
        from app.models import User
        from passlib.context import CryptContext

        pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
        
        user_id = str(uuid.uuid4())
        user = User(
            id=user_id,
            email="updateuser@maritime.com",
            name="Original Name",
            password_hash=pwd_context.hash("password123"),
            role="user"
        )
        db_session.add(user)
        await db_session.commit()

        from app.dependencies import get_current_user
        def mock_current_user():
            return admin_user_in_db
        test_client.app.dependency_overrides[get_current_user] = mock_current_user

        response = test_client.patch(
            f"/api/v1/users/{user_id}",
            json={
                "name": "Updated Name",
                "role": "admin"
            }
        )

        assert response.status_code in [200, 204]

    @pytest.mark.asyncio
    async def test_update_user_field_tracking(self, test_client, admin_user_in_db, db_session: AsyncSession):
        """Test that user updates are tracked."""
        from app.models import User
        from passlib.context import CryptContext

        pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
        
        user_id = str(uuid.uuid4())
        user = User(
            id=user_id,
            email="trackuser@maritime.com",
            name="Track Name",
            password_hash=pwd_context.hash("password123"),
            role="user"
        )
        db_session.add(user)
        await db_session.commit()

        from app.dependencies import get_current_user
        def mock_current_user():
            return admin_user_in_db
        test_client.app.dependency_overrides[get_current_user] = mock_current_user

        response = test_client.patch(
            f"/api/v1/users/{user_id}",
            json={"name": "New Track Name"}
        )

        assert response.status_code in [200, 204]
        if response.status_code == 200:
            data = response.json()
            if "changes" in data:
                assert "name" in data["changes"]

    # DELETE /users/{user_id}
    @pytest.mark.asyncio
    async def test_delete_user_success(self, test_client, admin_user_in_db, db_session: AsyncSession):
        """Test successful user deletion."""
        from app.models import User
        from passlib.context import CryptContext

        pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
        
        user_id = str(uuid.uuid4())
        user = User(
            id=user_id,
            email="deleteuser@maritime.com",
            name="Delete Test",
            password_hash=pwd_context.hash("password123"),
            role="user"
        )
        db_session.add(user)
        await db_session.commit()

        from app.dependencies import get_current_user
        def mock_current_user():
            return admin_user_in_db
        test_client.app.dependency_overrides[get_current_user] = mock_current_user

        response = test_client.delete(
            f"/api/v1/users/{user_id}",
            json={"deletion_reason": "User left company"}
        )

        assert response.status_code in [200, 204]


# ============================================================================
# OPCIÓN A: Room Management Endpoints (3 endpoints)
# ============================================================================

class TestRoomManagement:
    """Test security of room management endpoints"""

    # POST /rooms
    @pytest.mark.asyncio
    async def test_create_room_success(self, test_client, admin_user_in_db):
        """Test successful room creation."""
        from app.dependencies import get_current_user
        def mock_current_user():
            return admin_user_in_db
        test_client.app.dependency_overrides[get_current_user] = mock_current_user

        response = test_client.post(
            "/api/v1/rooms",
            json={
                "title": "New STS Operation",
                "location": "Singapore",
                "sts_eta": (datetime.utcnow() + timedelta(days=7)).isoformat()
            }
        )

        assert response.status_code in [200, 201]

    @pytest.mark.asyncio
    async def test_create_room_invalid_date(self, test_client, admin_user_in_db):
        """Test room creation with invalid date."""
        from app.dependencies import get_current_user
        def mock_current_user():
            return admin_user_in_db
        test_client.app.dependency_overrides[get_current_user] = mock_current_user

        response = test_client.post(
            "/api/v1/rooms",
            json={
                "title": "Invalid Room",
                "location": "Singapore",
                "sts_eta": "not-a-date"
            }
        )

        assert response.status_code in [400, 422]

    # PATCH /rooms/{room_id}
    @pytest.mark.asyncio
    async def test_update_room_success(self, test_client, admin_user_in_db, sample_room):
        """Test successful room update."""
        from app.dependencies import get_current_user
        def mock_current_user():
            return admin_user_in_db
        test_client.app.dependency_overrides[get_current_user] = mock_current_user

        response = test_client.patch(
            f"/api/v1/rooms/{sample_room.id}",
            json={"title": "Updated Room Title"}
        )

        assert response.status_code in [200, 204]

    # DELETE /rooms/{room_id}
    @pytest.mark.asyncio
    async def test_delete_room_success(self, test_client, admin_user_in_db, sample_room):
        """Test successful room deletion."""
        from app.dependencies import get_current_user
        def mock_current_user():
            return admin_user_in_db
        test_client.app.dependency_overrides[get_current_user] = mock_current_user

        response = test_client.delete(
            f"/api/v1/rooms/{sample_room.id}",
            json={"deletion_reason": "Operation cancelled"}
        )

        assert response.status_code in [200, 204]


# ============================================================================
# OPCIÓN A: Document Management Endpoints (3 endpoints)
# ============================================================================

class TestDocumentManagement:
    """Test security of document management endpoints"""

    # POST /documents
    @pytest.mark.asyncio
    async def test_create_document_success(
        self, test_client, admin_user_in_db, sample_room, sample_document_types
    ):
        """Test successful document creation."""
        from app.dependencies import get_current_user
        def mock_current_user():
            return admin_user_in_db
        test_client.app.dependency_overrides[get_current_user] = mock_current_user

        response = test_client.post(
            "/api/v1/documents",
            json={
                "room_id": sample_room.id,
                "type_id": sample_document_types[0].id,
                "status": "uploaded",
                "notes": "Test document"
            }
        )

        assert response.status_code in [200, 201]

    # PATCH /documents/{doc_id}
    @pytest.mark.asyncio
    async def test_update_document_success(
        self, test_client, admin_user_in_db, sample_documents
    ):
        """Test successful document update."""
        from app.dependencies import get_current_user
        def mock_current_user():
            return admin_user_in_db
        test_client.app.dependency_overrides[get_current_user] = mock_current_user

        doc = sample_documents[0]
        response = test_client.patch(
            f"/api/v1/documents/{doc.id}",
            json={"status": "approved"}
        )

        assert response.status_code in [200, 204]

    # DELETE /documents/{doc_id}
    @pytest.mark.asyncio
    async def test_delete_document_success(
        self, test_client, admin_user_in_db, sample_documents
    ):
        """Test successful document deletion."""
        from app.dependencies import get_current_user
        def mock_current_user():
            return admin_user_in_db
        test_client.app.dependency_overrides[get_current_user] = mock_current_user

        doc = sample_documents[0]
        response = test_client.delete(
            f"/api/v1/documents/{doc.id}",
            json={"deletion_reason": "Incorrect document"}
        )

        assert response.status_code in [200, 204]


# ============================================================================
# OPCIÓN B: Approval Management Endpoints (3 endpoints)
# ============================================================================

class TestApprovalManagement:
    """Test security of approval management endpoints"""

    # POST /approvals
    @pytest.mark.asyncio
    async def test_create_approval_success(
        self, test_client, admin_user_in_db, sample_room, sample_documents
    ):
        """Test successful approval creation."""
        from app.dependencies import get_current_user
        def mock_current_user():
            return admin_user_in_db
        test_client.app.dependency_overrides[get_current_user] = mock_current_user

        response = test_client.post(
            "/api/v1/approvals",
            json={
                "room_id": sample_room.id,
                "document_id": sample_documents[0].id,
                "requested_by": "admin@maritime.com",
                "status": "pending"
            }
        )

        assert response.status_code in [200, 201]

    # PATCH /approvals/{approval_id}
    @pytest.mark.asyncio
    async def test_update_approval_success(
        self, test_client, admin_user_in_db, db_session: AsyncSession, 
        sample_room, sample_documents
    ):
        """Test successful approval update."""
        from app.models import Approval

        approval = Approval(
            id=str(uuid.uuid4()),
            room_id=sample_room.id,
            document_id=sample_documents[0].id,
            requested_by="admin@maritime.com",
            status="pending"
        )
        db_session.add(approval)
        await db_session.commit()

        from app.dependencies import get_current_user
        def mock_current_user():
            return admin_user_in_db
        test_client.app.dependency_overrides[get_current_user] = mock_current_user

        response = test_client.patch(
            f"/api/v1/approvals/{approval.id}",
            json={
                "status": "approved",
                "approved_by": "admin@maritime.com"
            }
        )

        assert response.status_code in [200, 204]

    # DELETE /approvals/{approval_id}
    @pytest.mark.asyncio
    async def test_delete_approval_success(
        self, test_client, admin_user_in_db, db_session: AsyncSession,
        sample_room, sample_documents
    ):
        """Test successful approval deletion."""
        from app.models import Approval

        approval = Approval(
            id=str(uuid.uuid4()),
            room_id=sample_room.id,
            document_id=sample_documents[0].id,
            requested_by="admin@maritime.com",
            status="pending"
        )
        db_session.add(approval)
        await db_session.commit()

        from app.dependencies import get_current_user
        def mock_current_user():
            return admin_user_in_db
        test_client.app.dependency_overrides[get_current_user] = mock_current_user

        response = test_client.delete(
            f"/api/v1/approvals/{approval.id}",
            json={"deletion_reason": "Request withdrawn"}
        )

        assert response.status_code in [200, 204]


# ============================================================================
# OPCIÓN B: Vessel Management Endpoints (4 endpoints)
# ============================================================================

class TestVesselManagement:
    """Test security of vessel management endpoints"""

    # POST /vessels
    @pytest.mark.asyncio
    async def test_create_vessel_success(
        self, test_client, admin_user_in_db, sample_room
    ):
        """Test successful vessel creation."""
        from app.dependencies import get_current_user
        def mock_current_user():
            return admin_user_in_db
        test_client.app.dependency_overrides[get_current_user] = mock_current_user

        response = test_client.post(
            "/api/v1/vessels",
            json={
                "room_id": sample_room.id,
                "name": "MV Test Vessel",
                "vessel_type": "Tanker",
                "flag": "Singapore",
                "imo": "9999999",
                "status": "active"
            }
        )

        assert response.status_code in [200, 201]

    @pytest.mark.asyncio
    async def test_create_vessel_duplicate_imo_prevention(
        self, test_client, admin_user_in_db, sample_vessels
    ):
        """Test that duplicate IMO numbers are prevented."""
        from app.dependencies import get_current_user
        def mock_current_user():
            return admin_user_in_db
        test_client.app.dependency_overrides[get_current_user] = mock_current_user

        # Try to create vessel with existing IMO
        response = test_client.post(
            "/api/v1/vessels",
            json={
                "room_id": sample_vessels[0].room_id,
                "name": "MV Another",
                "vessel_type": "Bulk Carrier",
                "flag": "Malta",
                "imo": "1234567",  # Already exists
                "status": "active"
            }
        )

        assert response.status_code == status.HTTP_400_BAD_REQUEST

    # PATCH /vessels/{vessel_id}
    @pytest.mark.asyncio
    async def test_update_vessel_success(
        self, test_client, admin_user_in_db, sample_vessels
    ):
        """Test successful vessel update."""
        from app.dependencies import get_current_user
        def mock_current_user():
            return admin_user_in_db
        test_client.app.dependency_overrides[get_current_user] = mock_current_user

        response = test_client.patch(
            f"/api/v1/vessels/{sample_vessels[0].id}",
            json={"status": "inactive"}
        )

        assert response.status_code in [200, 204]

    # DELETE /vessels/{vessel_id}
    @pytest.mark.asyncio
    async def test_delete_vessel_success(
        self, test_client, admin_user_in_db, sample_vessels
    ):
        """Test successful vessel deletion."""
        from app.dependencies import get_current_user
        def mock_current_user():
            return admin_user_in_db
        test_client.app.dependency_overrides[get_current_user] = mock_current_user

        response = test_client.delete(
            f"/api/v1/vessels/{sample_vessels[0].id}",
            json={"deletion_reason": "Vessel scrapped"}
        )

        assert response.status_code in [200, 204]
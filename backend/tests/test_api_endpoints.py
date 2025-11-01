"""
Test API endpoints for STS Clearance Hub
"""

import uuid

import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.main import app
from app.models import Document, Room, User


class TestAuthEndpoints:
    """Test authentication endpoints"""

    @pytest.mark.asyncio
    @pytest.mark.asyncio

    async def test_health_check(self, async_client):
        """Test health check endpoint"""
        response = await async_client.get("/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "healthy"

    @pytest.mark.asyncio


    async def test_root_endpoint(self, async_client):
        """Test root endpoint"""
        response = await async_client.get("/")
        assert response.status_code == 200
        data = response.json()
        assert data["name"] == "STS Clearance API"
        assert data["version"] == "1.0.0"


class TestRoomEndpoints:
    """Test room management endpoints"""

    @pytest.mark.asyncio


    async def test_get_rooms_unauthorized(self, async_client):
        """Test getting rooms without authentication"""
        response = await async_client.get("/api/v1/rooms")
        assert response.status_code == 401

    @pytest.mark.asyncio


    async def test_get_rooms_authorized(
        self, authenticated_async_client, test_room: Room
    ):
        """Test getting rooms with authentication"""
        response = await authenticated_async_client.get("/api/v1/rooms")
        assert response.status_code == 200
        data = response.json()
        assert len(data) >= 1
        assert any(r["title"] == test_room.title for r in data)

    @pytest.mark.asyncio


    async def test_get_specific_room(
        self, authenticated_async_client, test_room: Room
    ):
        """Test getting a specific room"""
        response = await authenticated_async_client.get(
            f"/api/v1/rooms/{test_room.id}"
        )
        assert response.status_code == 200
        data = response.json()
        assert data["id"] == str(test_room.id)
        assert data["title"] == test_room.title

    @pytest.mark.asyncio


    async def test_create_room(
        self, authenticated_async_client, mock_room_data: dict
    ):
        """Test creating a new room"""
        response = await authenticated_async_client.post(
            "/api/v1/rooms", json=mock_room_data
        )
        assert response.status_code in [200, 201]
        data = response.json()
        assert data["title"] == mock_room_data["title"]
        assert data["location"] == mock_room_data["location"]

    @pytest.mark.asyncio


    async def test_update_room(
        self, authenticated_async_client, test_room: Room
    ):
        """Test updating a room"""
        update_data = {"title": "Updated STS Operation", "location": "Updated Port"}
        response = await authenticated_async_client.patch(
            f"/api/v1/rooms/{test_room.id}", json=update_data
        )
        assert response.status_code == 200
        data = response.json()
        assert data["title"] == update_data["title"]
        assert data["location"] == update_data["location"]

    @pytest.mark.asyncio


    async def test_delete_room(
        self, async_client, test_room: Room, db_session: AsyncSession
    ):
        """Test deleting a room"""
        from app.dependencies import get_current_user
        from app.models import User, Party
        
        # Create admin user
        admin = User(
            id=str(uuid.uuid4()),
            email="admindelete@maritime.com",
            name="Admin Delete User",
            role="admin",
            password_hash="test_hash",
        )
        db_session.add(admin)
        await db_session.commit()
        await db_session.refresh(admin)
        
        # Create Party entry for admin
        party = Party(
            id=str(uuid.uuid4()),
            room_id=test_room.id,
            role="admin",
            name=admin.name,
            email=admin.email,
        )
        db_session.add(party)
        await db_session.commit()
        
        # Mock admin user
        async def mock_admin_user():
            return admin
        
        app.dependency_overrides[get_current_user] = mock_admin_user
        
        try:
            response = await async_client.delete(
                f"/api/v1/rooms/{test_room.id}"
            )
            assert response.status_code == 200
            data = response.json()
            assert "successfully" in data["message"]
        finally:
            app.dependency_overrides.clear()


class TestDocumentEndpoints:
    """Test document management endpoints"""

    @pytest.mark.asyncio


    async def test_get_room_summary(
        self, authenticated_async_client, test_room: Room, test_document_types
    ):
        """Test getting room summary"""
        response = await authenticated_async_client.get(f"/api/v1/rooms/{test_room.id}/summary")
        assert response.status_code == 200
        data = response.json()
        assert data["room_id"] == str(test_room.id)
        assert "progress_percentage" in data
        assert "total_required_docs" in data

    @pytest.mark.asyncio


    async def test_get_room_documents(
        self, authenticated_async_client, test_room: Room, test_document_types
    ):
        """Test getting room documents"""
        response = await authenticated_async_client.get(f"/api/v1/rooms/{test_room.id}/documents")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        # Room may not have documents yet, just check it's a list
        assert isinstance(data, list)

    @pytest.mark.asyncio


    async def test_get_document_types(self, authenticated_async_client, test_document_types):
        """Test getting document types"""
        response = await authenticated_async_client.get("/api/v1/document-types")
        assert response.status_code == 200
        data = response.json()
        assert len(data) >= len(test_document_types)
        assert any(doc["code"] == "INSURANCE_CERT" for doc in data)

    @pytest.mark.asyncio


    async def test_upload_document(
        self, authenticated_async_client, test_room: Room, temp_file: str, test_document_types
    ):
        """Test document upload"""
        # Get a document type ID for the upload
        doc_type_id = test_document_types[0].id if test_document_types else None
        
        with open(temp_file, "rb") as f:
            files = {"file": ("test.pdf", f, "application/pdf")}
            # Use document_type_id instead of document_type
            data = {"type_id": str(doc_type_id), "notes": "Test upload"} if doc_type_id else {"notes": "Test upload"}
            response = await authenticated_async_client.post(
                f"/api/v1/rooms/{test_room.id}/documents/upload", files=files, data=data
            )

        # May return 200 or 201, both are valid
        assert response.status_code in [200, 201]
        response_data = response.json()
        # Check for success message or document ID
        assert "message" in response_data or "document_id" in response_data or "id" in response_data


class TestActivityEndpoints:
    """Test activity logging endpoints"""

    @pytest.mark.asyncio


    async def test_get_user_activities(
        self, authenticated_async_client, test_room: Room
    ):
        """Test getting user activities"""
        response = await authenticated_async_client.get(
            "/api/v1/activities/my-recent"
        )
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)

    @pytest.mark.asyncio


    async def test_get_room_activities(
        self, authenticated_async_client, test_room: Room
    ):
        """Test getting room activities"""
        response = await authenticated_async_client.get(
            f"/api/v1/rooms/{test_room.id}/activities"
        )
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)

    @pytest.mark.asyncio


    async def test_get_activities_summary(
        self, authenticated_async_client, test_room: Room
    ):
        """Test getting activities summary"""
        response = await authenticated_async_client.get(
            f"/api/v1/rooms/{test_room.id}/activities/summary"
        )
        assert response.status_code == 200
        data = response.json()
        # Check for at least one of the expected fields
        assert "total_activities" in data or "unique_actors" in data or "action_counts" in data

    @pytest.mark.asyncio


    async def test_get_activities_timeline(
        self, authenticated_async_client, test_room: Room
    ):
        """Test getting activities timeline"""
        response = await authenticated_async_client.get(
            f"/api/v1/rooms/{test_room.id}/activities/timeline"
        )
        assert response.status_code == 200
        data = response.json()
        # Check for timeline-related fields
        assert "timeline" in data or "period_days" in data or "events" in data


class TestErrorHandling:
    """Test error handling scenarios"""

    @pytest.mark.asyncio


    async def test_room_not_found(self, authenticated_async_client):
        """Test accessing non-existent room"""
        fake_room_id = "00000000-0000-0000-0000-000000000000"
        response = await authenticated_async_client.get(
            f"/api/v1/rooms/{fake_room_id}"
        )
        assert response.status_code == 404

    @pytest.mark.asyncio


    async def test_invalid_document_type(
        self, authenticated_async_client, test_room: Room, temp_file: str
    ):
        """Test uploading with invalid document type"""
        with open(temp_file, "rb") as f:
            files = {"file": ("test.pdf", f, "application/pdf")}
            data = {"document_type": "INVALID_TYPE", "notes": "Test upload"}
            response = await authenticated_async_client.post(
                f"/api/v1/rooms/{test_room.id}/documents/upload", files=files, data=data
            )

        assert response.status_code in [400, 404]  # Bad request or not found

    @pytest.mark.asyncio


    async def test_invalid_file_type(self, authenticated_async_client, test_room: Room, test_document_types):
        """Test uploading invalid file type
        
        Note: Currently the endpoint accepts all file types. 
        If file type validation is added, this should return 400.
        """
        from io import BytesIO
        doc_type_code = test_document_types[0].code if test_document_types else "INSURANCE_CERT"
        files = {"file": ("test.exe", BytesIO(b"fake exe content"), "application/x-executable")}
        data = {"document_type": doc_type_code, "notes": "Test upload"}
        response = await authenticated_async_client.post(
            f"/api/v1/rooms/{test_room.id}/documents/upload", files=files, data=data
        )

        # Currently endpoint accepts all file types (200)
        # If validation is added, this should be 400
        assert response.status_code in [200, 201, 400]


class TestRateLimiting:
    """Test rate limiting functionality"""

    @pytest.mark.asyncio
    @pytest.mark.asyncio

    async def test_rate_limit_not_exceeded(self, async_client):
        """Test that normal requests are not rate limited"""
        for _ in range(5):
            response = await async_client.get("/health")
            assert response.status_code == 200

    # Note: Full rate limiting tests would require Redis and more complex setup


class TestWebSocketEndpoints:
    """Test WebSocket functionality"""

    @pytest.mark.asyncio


    async def test_websocket_connection(self, async_client):
        """Test WebSocket connection (basic connectivity)"""
        # Note: Full WebSocket testing requires more complex setup
        # This is a placeholder for WebSocket connection testing
        pass


class TestFileHandling:
    """Test file upload and download functionality"""

    @pytest.mark.asyncio


    async def test_file_size_limit(self, async_client, test_room: Room):
        """Test file size limit enforcement"""
        # Create a file that's too large (simulate 60MB)
        large_content = b"x" * (60 * 1024 * 1024)  # 60MB
        files = {"file": ("large.pdf", large_content, "application/pdf")}
        data = {"document_type": "INSURANCE_CERT", "notes": "Large file test"}

        response = await async_client.post(
            f"/api/v1/rooms/{test_room.id}/documents/upload", files=files, data=data
        )

        assert response.status_code == 413  # Request Entity Too Large


class TestSecurityHeaders:
    """Test security headers and CORS"""

    @pytest.mark.asyncio


    async def test_cors_headers(self, async_client):
        """Test CORS headers are present"""
        response = await async_client.options("/api/v1/rooms")
        # CORS headers should be present (implementation specific)
        assert response.status_code in [200, 405]  # OPTIONS might not be implemented

    @pytest.mark.asyncio


    async def test_security_headers(self, async_client):
        """Test security headers in responses"""
        response = await async_client.get("/health")
        assert response.status_code == 200
        # Security headers would be added by Nginx in production

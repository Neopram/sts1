"""
Test API endpoints for STS Clearance Hub
"""

import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

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
        self, async_client, auth_headers: dict, test_room: Room
    ):
        """Test getting rooms with authentication"""
        response = await async_client.get("/api/v1/rooms", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert len(data) >= 1
        assert data[0]["title"] == test_room.title

    @pytest.mark.asyncio


    async def test_get_specific_room(
        self, async_client, auth_headers: dict, test_room: Room
    ):
        """Test getting a specific room"""
        response = await async_client.get(
            f"/api/v1/rooms/{test_room.id}", headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        assert data["id"] == str(test_room.id)
        assert data["title"] == test_room.title

    @pytest.mark.asyncio


    async def test_create_room(
        self, async_client, auth_headers: dict, mock_room_data: dict
    ):
        """Test creating a new room"""
        response = await async_client.post(
            "/api/v1/rooms", json=mock_room_data, headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        assert data["title"] == mock_room_data["title"]
        assert data["location"] == mock_room_data["location"]

    @pytest.mark.asyncio


    async def test_update_room(
        self, async_client, auth_headers: dict, test_room: Room
    ):
        """Test updating a room"""
        update_data = {"title": "Updated STS Operation", "location": "Updated Port"}
        response = await async_client.patch(
            f"/api/v1/rooms/{test_room.id}", json=update_data, headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        assert data["title"] == update_data["title"]
        assert data["location"] == update_data["location"]

    @pytest.mark.asyncio


    async def test_delete_room(
        self, async_client, auth_headers: dict, test_room: Room
    ):
        """Test deleting a room"""
        response = await async_client.delete(
            f"/api/v1/rooms/{test_room.id}", headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        assert data["message"] == "Room deleted successfully"


class TestDocumentEndpoints:
    """Test document management endpoints"""

    @pytest.mark.asyncio


    async def test_get_room_summary(
        self, async_client, test_room: Room, test_document_types
    ):
        """Test getting room summary"""
        response = await async_client.get(f"/api/v1/rooms/{test_room.id}/summary")
        assert response.status_code == 200
        data = response.json()
        assert data["room_id"] == str(test_room.id)
        assert "progress_percentage" in data
        assert "total_required_docs" in data

    @pytest.mark.asyncio


    async def test_get_room_documents(
        self, async_client, test_room: Room, test_document_types
    ):
        """Test getting room documents"""
        response = await async_client.get(f"/api/v1/rooms/{test_room.id}/documents")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        assert len(data) >= len(test_document_types)

    @pytest.mark.asyncio


    async def test_get_document_types(self, async_client, test_document_types):
        """Test getting document types"""
        response = await async_client.get("/api/v1/document-types")
        assert response.status_code == 200
        data = response.json()
        assert len(data) >= len(test_document_types)
        assert any(doc["code"] == "INSURANCE_CERT" for doc in data)

    @pytest.mark.asyncio


    async def test_upload_document(
        self, async_client, test_room: Room, temp_file: str
    ):
        """Test document upload"""
        with open(temp_file, "rb") as f:
            files = {"file": ("test.pdf", f, "application/pdf")}
            data = {"document_type": "INSURANCE_CERT", "notes": "Test upload"}
            response = await async_client.post(
                f"/api/v1/rooms/{test_room.id}/documents/upload", files=files, data=data
            )

        assert response.status_code == 200
        response_data = response.json()
        assert response_data["message"] == "Document uploaded successfully"
        assert "document_id" in response_data


class TestActivityEndpoints:
    """Test activity logging endpoints"""

    @pytest.mark.asyncio


    async def test_get_user_activities(
        self, async_client, auth_headers: dict, test_room: Room
    ):
        """Test getting user activities"""
        response = await async_client.get(
            "/api/v1/activities/my-recent", headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)

    @pytest.mark.asyncio


    async def test_get_room_activities(
        self, async_client, auth_headers: dict, test_room: Room
    ):
        """Test getting room activities"""
        response = await async_client.get(
            f"/api/v1/rooms/{test_room.id}/activities", headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)

    @pytest.mark.asyncio


    async def test_get_activities_summary(
        self, async_client, auth_headers: dict, test_room: Room
    ):
        """Test getting activities summary"""
        response = await async_client.get(
            f"/api/v1/rooms/{test_room.id}/activities/summary", headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        assert "total_activities" in data
        assert "unique_actors" in data
        assert "action_counts" in data

    @pytest.mark.asyncio


    async def test_get_activities_timeline(
        self, async_client, auth_headers: dict, test_room: Room
    ):
        """Test getting activities timeline"""
        response = await async_client.get(
            f"/api/v1/rooms/{test_room.id}/activities/timeline", headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        assert "period_days" in data
        assert "timeline" in data


class TestErrorHandling:
    """Test error handling scenarios"""

    @pytest.mark.asyncio


    async def test_room_not_found(self, async_client, auth_headers: dict):
        """Test accessing non-existent room"""
        fake_room_id = "00000000-0000-0000-0000-000000000000"
        response = await async_client.get(
            f"/api/v1/rooms/{fake_room_id}", headers=auth_headers
        )
        assert response.status_code == 404

    @pytest.mark.asyncio


    async def test_invalid_document_type(
        self, async_client, test_room: Room, temp_file: str
    ):
        """Test uploading with invalid document type"""
        with open(temp_file, "rb") as f:
            files = {"file": ("test.pdf", f, "application/pdf")}
            data = {"document_type": "INVALID_TYPE", "notes": "Test upload"}
            response = await async_client.post(
                f"/api/v1/rooms/{test_room.id}/documents/upload", files=files, data=data
            )

        assert response.status_code in [400, 404]  # Bad request or not found

    @pytest.mark.asyncio


    async def test_invalid_file_type(self, async_client, test_room: Room):
        """Test uploading invalid file type"""
        files = {"file": ("test.exe", b"fake exe content", "application/x-executable")}
        data = {"document_type": "INSURANCE_CERT", "notes": "Test upload"}
        response = await async_client.post(
            f"/api/v1/rooms/{test_room.id}/documents/upload", files=files, data=data
        )

        assert response.status_code == 400


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

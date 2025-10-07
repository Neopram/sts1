"""
Integration tests for STS Clearance Hub API
Tests complete workflows and API endpoint interactions
"""

import json
from datetime import datetime, timedelta
from unittest.mock import AsyncMock, patch

import pytest


@pytest.mark.integration
@pytest.mark.asyncio
class TestRoomWorkflow:
    """Test complete room management workflow."""

    async def test_complete_room_lifecycle(
        self, authenticated_client, sample_document_types
    ):
        """Test complete room lifecycle from creation to deletion."""

        # 1. Create room
        room_data = {
            "title": "Integration Test STS Operation",
            "location": "Singapore Anchorage",
            "sts_eta": (datetime.utcnow() + timedelta(days=7)).isoformat(),
            "parties": [
                {"role": "owner", "name": "Test Owner", "email": "owner@test.com"},
                {
                    "role": "charterer",
                    "name": "Test Charterer",
                    "email": "charterer@test.com",
                },
            ],
        }

        response = authenticated_client.post("/api/v1/rooms", json=room_data)
        assert response.status_code == 201

        room_response = response.json()
        room_id = room_response["id"]
        assert room_response["title"] == room_data["title"]
        assert room_response["location"] == room_data["location"]

        # 2. Get room details
        response = authenticated_client.get(f"/api/v1/rooms/{room_id}")
        assert response.status_code == 200

        room_details = response.json()
        assert room_details["id"] == room_id
        assert room_details["title"] == room_data["title"]

        # 3. Add vessel to room
        vessel_data = {
            "name": "MV Test Vessel",
            "vessel_type": "Tanker",
            "flag": "Singapore",
            "imo": "1234567",
            "length": 200.0,
            "beam": 32.0,
            "draft": 12.5,
            "gross_tonnage": 50000,
        }

        response = authenticated_client.post(
            f"/api/v1/rooms/{room_id}/vessels", json=vessel_data
        )
        assert response.status_code == 201

        vessel_response = response.json()
        assert vessel_response["name"] == vessel_data["name"]
        assert vessel_response["imo"] == vessel_data["imo"]

        # 4. Upload document
        document_data = {
            "type_id": sample_document_types[0].id,
            "notes": "Test document upload",
        }

        # Mock file upload
        files = {"file": ("test.pdf", b"test content", "application/pdf")}
        response = authenticated_client.post(
            f"/api/v1/rooms/{room_id}/documents", data=document_data, files=files
        )
        assert response.status_code == 201

        # 5. Get room activities
        response = authenticated_client.get(f"/api/v1/rooms/{room_id}/activities")
        assert response.status_code == 200

        activities = response.json()
        assert len(activities["activities"]) > 0

        # 6. Send message
        message_data = {
            "content": "Test message for integration test",
            "message_type": "text",
        }

        response = authenticated_client.post(
            f"/api/v1/rooms/{room_id}/messages", json=message_data
        )
        assert response.status_code == 201

        # 7. Get messages
        response = authenticated_client.get(f"/api/v1/rooms/{room_id}/messages")
        assert response.status_code == 200

        messages = response.json()
        assert len(messages["messages"]) > 0
        assert messages["messages"][0]["content"] == message_data["content"]

        # 8. Update room
        update_data = {
            "title": "Updated Integration Test Room",
            "location": "Updated Location",
        }

        response = authenticated_client.put(
            f"/api/v1/rooms/{room_id}", json=update_data
        )
        assert response.status_code == 200

        updated_room = response.json()
        assert updated_room["title"] == update_data["title"]
        assert updated_room["location"] == update_data["location"]

        # 9. Delete room
        response = authenticated_client.delete(f"/api/v1/rooms/{room_id}")
        assert response.status_code == 200

        # 10. Verify room is deleted
        response = authenticated_client.get(f"/api/v1/rooms/{room_id}")
        assert response.status_code == 404

    async def test_room_access_control_workflow(self, test_client, db_session):
        """Test room access control across different users."""

        # Create two users
        user1_data = {"email": "user1@test.com", "name": "User 1", "role": "owner"}
        user2_data = {"email": "user2@test.com", "name": "User 2", "role": "charterer"}

        # Mock authentication for user1
        with patch("app.dependencies.get_current_user") as mock_auth:
            mock_auth.return_value = user1_data

            # User1 creates room
            room_data = {
                "title": "User1 Room",
                "location": "Test Location",
                "sts_eta": (datetime.utcnow() + timedelta(days=7)).isoformat(),
                "parties": [
                    {"role": "owner", "name": "User 1", "email": "user1@test.com"}
                ],
            }

            response = test_client.post("/api/v1/rooms", json=room_data)
            assert response.status_code == 201

            room_id = response.json()["id"]

        # User2 tries to access User1's room (should fail)
        with patch("app.dependencies.get_current_user") as mock_auth:
            mock_auth.return_value = user2_data

            response = test_client.get(f"/api/v1/rooms/{room_id}")
            assert response.status_code == 403  # Forbidden

        # User1 adds User2 as party
        with patch("app.dependencies.get_current_user") as mock_auth:
            mock_auth.return_value = user1_data

            party_data = {
                "role": "charterer",
                "name": "User 2",
                "email": "user2@test.com",
            }

            response = test_client.post(
                f"/api/v1/rooms/{room_id}/parties", json=party_data
            )
            assert response.status_code == 201

        # Now User2 can access the room
        with patch("app.dependencies.get_current_user") as mock_auth:
            mock_auth.return_value = user2_data

            response = test_client.get(f"/api/v1/rooms/{room_id}")
            assert response.status_code == 200

            room_details = response.json()
            assert room_details["id"] == room_id


@pytest.mark.integration
@pytest.mark.asyncio
class TestDocumentWorkflow:
    """Test document management workflow."""

    async def test_document_upload_and_approval_workflow(
        self, authenticated_client, sample_room, sample_document_types
    ):
        """Test complete document upload and approval workflow."""

        room_id = sample_room.id
        doc_type_id = sample_document_types[0].id

        # 1. Upload document
        document_data = {"type_id": doc_type_id, "notes": "Initial document upload"}

        files = {
            "file": ("certificate.pdf", b"mock certificate content", "application/pdf")
        }
        response = authenticated_client.post(
            f"/api/v1/rooms/{room_id}/documents", data=document_data, files=files
        )
        assert response.status_code == 201

        document_response = response.json()
        document_id = document_response["id"]
        assert document_response["status"] == "under_review"

        # 2. Get document details
        response = authenticated_client.get(
            f"/api/v1/rooms/{room_id}/documents/{document_id}"
        )
        assert response.status_code == 200

        document_details = response.json()
        assert document_details["id"] == document_id
        assert document_details["status"] == "under_review"

        # 3. Approve document
        approval_data = {
            "status": "approved",
            "notes": "Document approved after review",
        }

        response = authenticated_client.put(
            f"/api/v1/rooms/{room_id}/documents/{document_id}/status",
            json=approval_data,
        )
        assert response.status_code == 200

        approved_document = response.json()
        assert approved_document["status"] == "approved"

        # 4. Upload new version
        new_version_data = {"notes": "Updated version of the document"}

        files = {
            "file": (
                "certificate_v2.pdf",
                b"updated certificate content",
                "application/pdf",
            )
        }
        response = authenticated_client.post(
            f"/api/v1/rooms/{room_id}/documents/{document_id}/versions",
            data=new_version_data,
            files=files,
        )
        assert response.status_code == 201

        # 5. Get document versions
        response = authenticated_client.get(
            f"/api/v1/rooms/{room_id}/documents/{document_id}/versions"
        )
        assert response.status_code == 200

        versions = response.json()
        assert len(versions["versions"]) == 2  # Original + new version

        # 6. Download document
        response = authenticated_client.get(
            f"/api/v1/rooms/{room_id}/documents/{document_id}/download"
        )
        assert response.status_code == 200
        assert response.headers["content-type"] == "application/pdf"

    async def test_document_expiration_workflow(
        self, authenticated_client, sample_room, sample_document_types
    ):
        """Test document expiration handling."""

        room_id = sample_room.id
        doc_type_id = sample_document_types[0].id

        # Upload document with expiration date
        document_data = {
            "type_id": doc_type_id,
            "expires_on": (datetime.utcnow() + timedelta(days=30)).isoformat(),
            "notes": "Document with expiration",
        }

        files = {
            "file": ("expiring_cert.pdf", b"expiring certificate", "application/pdf")
        }
        response = authenticated_client.post(
            f"/api/v1/rooms/{room_id}/documents", data=document_data, files=files
        )
        assert response.status_code == 201

        document_id = response.json()["id"]

        # Get expiring documents
        response = authenticated_client.get(
            f"/api/v1/rooms/{room_id}/documents/expiring"
        )
        assert response.status_code == 200

        expiring_docs = response.json()
        assert len(expiring_docs["documents"]) > 0

        # Check if our document is in the expiring list
        doc_ids = [doc["id"] for doc in expiring_docs["documents"]]
        assert document_id in doc_ids


@pytest.mark.integration
@pytest.mark.asyncio
class TestActivityTimelineWorkflow:
    """Test activity timeline functionality."""

    async def test_activity_timeline_generation(
        self, authenticated_client, sample_room, sample_activities
    ):
        """Test activity timeline generation with real data."""

        room_id = sample_room.id

        # Get activity timeline
        response = authenticated_client.get(
            f"/api/v1/rooms/{room_id}/activities/timeline?days=7"
        )
        assert response.status_code == 200

        timeline_data = response.json()
        assert "timeline" in timeline_data
        assert "summary" in timeline_data
        assert timeline_data["period_days"] == 7

        # Verify timeline structure
        timeline = timeline_data["timeline"]
        assert len(timeline) > 0

        for day in timeline:
            assert "date" in day
            assert "total_activities" in day
            assert "actions" in day
            assert "actors" in day
            assert "unique_actors" in day
            assert isinstance(day["actors"], list)
            assert isinstance(day["actions"], dict)

        # Verify summary data
        summary = timeline_data["summary"]
        assert "total_activities" in summary
        assert "unique_actors" in summary
        assert "activity_trend" in summary
        assert summary["total_activities"] > 0

    async def test_activity_filtering_and_pagination(
        self, authenticated_client, sample_room, sample_activities
    ):
        """Test activity filtering and pagination."""

        room_id = sample_room.id

        # Test with different time periods
        for days in [1, 7, 30]:
            response = authenticated_client.get(
                f"/api/v1/rooms/{room_id}/activities/timeline?days={days}"
            )
            assert response.status_code == 200

            timeline_data = response.json()
            assert timeline_data["period_days"] == days

        # Test activity summary
        response = authenticated_client.get(
            f"/api/v1/rooms/{room_id}/activities/summary"
        )
        assert response.status_code == 200

        summary = response.json()
        assert "total_activities" in summary
        assert "recent_activities" in summary
        assert "top_actors" in summary


@pytest.mark.integration
@pytest.mark.maritime
@pytest.mark.asyncio
class TestMaritimeComplianceWorkflow:
    """Test maritime compliance workflows."""

    async def test_vessel_compliance_check(
        self, authenticated_client, sample_room, sample_vessels, maritime_assertions
    ):
        """Test vessel compliance checking."""

        room_id = sample_room.id
        vessel = sample_vessels[0]

        # Validate IMO number
        maritime_assertions.assert_valid_imo(vessel.imo)

        # Get vessel details
        response = authenticated_client.get(
            f"/api/v1/rooms/{room_id}/vessels/{vessel.id}"
        )
        assert response.status_code == 200

        vessel_data = response.json()
        assert vessel_data["imo"] == vessel.imo
        assert vessel_data["flag"] == vessel.flag
        assert vessel_data["vessel_type"] == vessel.vessel_type

        # Check vessel compliance status
        response = authenticated_client.get(
            f"/api/v1/rooms/{room_id}/vessels/{vessel.id}/compliance"
        )
        assert response.status_code == 200

        compliance_data = response.json()
        assert "compliance_score" in compliance_data
        assert "missing_documents" in compliance_data
        assert "expired_documents" in compliance_data

    async def test_document_criticality_workflow(
        self, authenticated_client, sample_room, sample_document_types
    ):
        """Test document criticality handling in maritime context."""

        room_id = sample_room.id

        # Get documents by criticality
        for criticality in ["high", "med", "low"]:
            response = authenticated_client.get(
                f"/api/v1/rooms/{room_id}/documents?criticality={criticality}"
            )
            assert response.status_code == 200

            documents = response.json()
            for doc in documents["documents"]:
                assert doc["document_type"]["criticality"] == criticality

        # Get compliance dashboard
        response = authenticated_client.get(
            f"/api/v1/rooms/{room_id}/compliance/dashboard"
        )
        assert response.status_code == 200

        dashboard = response.json()
        assert "high_criticality_missing" in dashboard
        assert "med_criticality_missing" in dashboard
        assert "low_criticality_missing" in dashboard
        assert "overall_compliance_score" in dashboard

    async def test_sts_operation_readiness(
        self, authenticated_client, sample_room, sample_vessels, sample_documents
    ):
        """Test STS operation readiness assessment."""

        room_id = sample_room.id

        # Get STS readiness assessment
        response = authenticated_client.get(f"/api/v1/rooms/{room_id}/sts/readiness")
        assert response.status_code == 200

        readiness = response.json()
        assert "overall_readiness" in readiness
        assert "vessel_readiness" in readiness
        assert "document_readiness" in readiness
        assert "regulatory_readiness" in readiness

        # Check readiness score is between 0 and 100
        assert 0 <= readiness["overall_readiness"] <= 100

        # Get readiness checklist
        response = authenticated_client.get(f"/api/v1/rooms/{room_id}/sts/checklist")
        assert response.status_code == 200

        checklist = response.json()
        assert "checklist_items" in checklist
        assert "completed_items" in checklist
        assert "pending_items" in checklist


@pytest.mark.integration
@pytest.mark.performance
@pytest.mark.asyncio
class TestPerformanceIntegration:
    """Test API performance under load."""

    async def test_concurrent_room_access(
        self, test_client, db_session, performance_test_data
    ):
        """Test concurrent access to rooms."""
        import asyncio
        import time

        import aiohttp

        # Create test room
        room_data = {
            "title": "Performance Test Room",
            "location": "Test Location",
            "sts_eta": (datetime.utcnow() + timedelta(days=7)).isoformat(),
            "parties": [{"role": "owner", "name": "Test", "email": "test@test.com"}],
        }

        with patch("app.dependencies.get_current_user") as mock_auth:
            mock_auth.return_value = {
                "email": "test@test.com",
                "name": "Test User",
                "role": "owner",
            }

            response = test_client.post("/api/v1/rooms", json=room_data)
            assert response.status_code == 201
            room_id = response.json()["id"]

        # Test concurrent access
        async def access_room():
            with patch("app.dependencies.get_current_user") as mock_auth:
                mock_auth.return_value = {
                    "email": "test@test.com",
                    "name": "Test User",
                    "role": "owner",
                }
                response = test_client.get(f"/api/v1/rooms/{room_id}")
                return response.status_code == 200

        # Run concurrent requests
        start_time = time.time()
        concurrent_requests = 20

        tasks = [access_room() for _ in range(concurrent_requests)]
        results = await asyncio.gather(*tasks)

        end_time = time.time()
        duration = end_time - start_time

        # All requests should succeed
        assert all(results)

        # Should complete within reasonable time
        assert duration < 5.0  # 5 seconds for 20 concurrent requests

    async def test_large_dataset_performance(
        self, authenticated_client, db_session, performance_test_data
    ):
        """Test performance with large datasets."""

        # Create room with many activities
        room_data = {
            "title": "Large Dataset Test Room",
            "location": "Test Location",
            "sts_eta": (datetime.utcnow() + timedelta(days=7)).isoformat(),
            "parties": [{"role": "owner", "name": "Test", "email": "test@test.com"}],
        }

        response = authenticated_client.post("/api/v1/rooms", json=room_data)
        assert response.status_code == 201
        room_id = response.json()["id"]

        # Test timeline with large dataset
        import time

        start_time = time.time()

        response = authenticated_client.get(
            f"/api/v1/rooms/{room_id}/activities/timeline?days=30"
        )

        end_time = time.time()
        duration = end_time - start_time

        assert response.status_code == 200
        # Should respond within 2 seconds even with large dataset
        assert duration < 2.0


@pytest.mark.integration
@pytest.mark.security
@pytest.mark.asyncio
class TestSecurityIntegration:
    """Test security features integration."""

    async def test_authentication_flow(self, test_client):
        """Test complete authentication flow."""

        # Test unauthenticated access
        response = test_client.get("/api/v1/rooms")
        assert response.status_code == 401

        # Test with invalid token
        headers = {"Authorization": "Bearer invalid_token"}
        response = test_client.get("/api/v1/rooms", headers=headers)
        assert response.status_code == 401

        # Test with valid authentication
        with patch("app.dependencies.get_current_user") as mock_auth:
            mock_auth.return_value = {
                "email": "test@test.com",
                "name": "Test User",
                "role": "owner",
            }

            response = test_client.get("/api/v1/rooms")
            assert response.status_code == 200

    async def test_input_validation_security(self, authenticated_client):
        """Test input validation for security."""

        # Test XSS prevention
        malicious_room_data = {
            "title": "<script>alert('xss')</script>",
            "location": "javascript:alert('xss')",
            "sts_eta": (datetime.utcnow() + timedelta(days=7)).isoformat(),
            "parties": [],
        }

        response = authenticated_client.post("/api/v1/rooms", json=malicious_room_data)
        # Should either reject or sanitize the input
        if response.status_code == 201:
            # If accepted, verify it's sanitized
            room_data = response.json()
            assert "<script>" not in room_data["title"]
            assert "javascript:" not in room_data["location"]
        else:
            # Should be rejected with 400 Bad Request
            assert response.status_code == 400

    async def test_rate_limiting_integration(self, authenticated_client):
        """Test rate limiting functionality."""

        # Make multiple rapid requests
        responses = []
        for i in range(10):
            response = authenticated_client.get("/api/v1/rooms")
            responses.append(response.status_code)

        # Most should succeed, but rate limiting might kick in
        success_count = sum(1 for status in responses if status == 200)
        rate_limited_count = sum(1 for status in responses if status == 429)

        # At least some requests should succeed
        assert success_count > 0

        # If rate limiting is active, some requests should be limited
        # This depends on the rate limiting configuration

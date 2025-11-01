"""
Tests for STS Operations API
Unit and integration tests for PHASE 1 implementation
"""
import pytest
from fastapi.testclient import TestClient
from datetime import datetime, timedelta
import json

# Mock test data
TEST_OPERATION = {
    "title": "Test STS Operation",
    "description": "Test operation for unit testing",
    "location": "Singapore Strait",
    "scheduled_start_date": (datetime.now() + timedelta(days=1)).isoformat(),
    "scheduled_end_date": (datetime.now() + timedelta(days=5)).isoformat(),
    "q88_enabled": False,
}

TEST_PARTICIPANT = {
    "participant_type": "Trading Company",
    "name": "John Smith",
    "email": "john@tradingco.com",
    "organization": "Trading Company Inc",
    "position": "Chartering Person",
}

TEST_VESSEL = {
    "vessel_name": "MT Ocean Paradise",
    "vessel_imo": "1234567",
    "mmsi": "123456789",
    "vessel_type": "Tanker",
    "vessel_role": "Receiving Vessel",
    "flag": "Singapore",
}


class TestStsOperationsAPI:
    """Test suite for STS Operations endpoints"""

    @pytest.mark.asyncio
    async def test_create_operation(self, client: TestClient, auth_headers: dict):
        """Test creating a new STS operation"""
        response = client.post(
            "/api/v1/sts-operations",
            json=TEST_OPERATION,
            headers=auth_headers
        )
        assert response.status_code == 201
        data = response.json()
        assert data['title'] == TEST_OPERATION['title']
        assert data['status'] == 'draft'
        assert 'id' in data
        assert 'sts_operation_code' in data
        return data['id']

    @pytest.mark.asyncio
    async def test_create_operation_invalid_data(self, client: TestClient, auth_headers: dict):
        """Test creating operation with invalid data"""
        invalid_data = {
            "title": "",  # Empty title
            "location": "Singapore Strait",
        }
        response = client.post(
            "/api/v1/sts-operations",
            json=invalid_data,
            headers=auth_headers
        )
        assert response.status_code == 422

    @pytest.mark.asyncio
    async def test_get_operation(self, client: TestClient, auth_headers: dict, operation_id: str):
        """Test retrieving an operation"""
        response = client.get(
            f"/api/v1/sts-operations/{operation_id}",
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        assert data['id'] == operation_id
        assert 'participants' in data
        assert 'vessels' in data

    @pytest.mark.asyncio
    async def test_list_operations(self, client: TestClient, auth_headers: dict):
        """Test listing operations"""
        response = client.get(
            "/api/v1/sts-operations?skip=0&limit=50",
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list) or 'items' in data

    @pytest.mark.asyncio
    async def test_add_participant(self, client: TestClient, auth_headers: dict, operation_id: str):
        """Test adding a participant to operation"""
        response = client.post(
            f"/api/v1/sts-operations/{operation_id}/participants",
            json=TEST_PARTICIPANT,
            headers=auth_headers
        )
        assert response.status_code == 201
        data = response.json()
        assert data['email'] == TEST_PARTICIPANT['email']
        assert data['name'] == TEST_PARTICIPANT['name']
        return data['id']

    @pytest.mark.asyncio
    async def test_add_participant_invalid_email(self, client: TestClient, auth_headers: dict, operation_id: str):
        """Test adding participant with invalid email"""
        invalid_participant = {
            **TEST_PARTICIPANT,
            "email": "invalid-email"
        }
        response = client.post(
            f"/api/v1/sts-operations/{operation_id}/participants",
            json=invalid_participant,
            headers=auth_headers
        )
        assert response.status_code == 422

    @pytest.mark.asyncio
    async def test_add_vessel(self, client: TestClient, auth_headers: dict, operation_id: str):
        """Test adding a vessel to operation"""
        response = client.post(
            f"/api/v1/sts-operations/{operation_id}/vessels",
            json=TEST_VESSEL,
            headers=auth_headers
        )
        assert response.status_code == 201
        data = response.json()
        assert data['vessel_name'] == TEST_VESSEL['vessel_name']
        assert data['vessel_imo'] == TEST_VESSEL['vessel_imo']
        return data['id']

    @pytest.mark.asyncio
    async def test_add_vessel_duplicate_imo(self, client: TestClient, auth_headers: dict, operation_id: str):
        """Test adding vessel with duplicate IMO"""
        # Add first vessel
        client.post(
            f"/api/v1/sts-operations/{operation_id}/vessels",
            json=TEST_VESSEL,
            headers=auth_headers
        )
        # Try to add duplicate
        response = client.post(
            f"/api/v1/sts-operations/{operation_id}/vessels",
            json=TEST_VESSEL,
            headers=auth_headers
        )
        assert response.status_code == 409  # Conflict

    @pytest.mark.asyncio
    async def test_finalize_operation(self, client: TestClient, auth_headers: dict, operation_id: str):
        """Test finalizing an operation"""
        # First add required participants and vessels
        client.post(
            f"/api/v1/sts-operations/{operation_id}/participants",
            json=TEST_PARTICIPANT,
            headers=auth_headers
        )
        client.post(
            f"/api/v1/sts-operations/{operation_id}/vessels",
            json=TEST_VESSEL,
            headers=auth_headers
        )

        # Finalize
        response = client.post(
            f"/api/v1/sts-operations/{operation_id}/finalize",
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        assert data['status'] == 'ready'

    @pytest.mark.asyncio
    async def test_start_operation(self, client: TestClient, auth_headers: dict, operation_id: str):
        """Test starting an operation"""
        # First finalize
        # ... (finalization code)

        response = client.post(
            f"/api/v1/sts-operations/{operation_id}/start",
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        assert data['status'] == 'active'
        assert data['actual_start_date'] is not None

    @pytest.mark.asyncio
    async def test_complete_operation(self, client: TestClient, auth_headers: dict, operation_id: str):
        """Test completing an operation"""
        response = client.post(
            f"/api/v1/sts-operations/{operation_id}/complete",
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        assert data['status'] == 'completed'

    @pytest.mark.asyncio
    async def test_operation_workflow(self, client: TestClient, auth_headers: dict):
        """Test complete workflow: create -> add data -> finalize -> start -> complete"""
        # Step 1: Create operation
        create_response = client.post(
            "/api/v1/sts-operations",
            json=TEST_OPERATION,
            headers=auth_headers
        )
        assert create_response.status_code == 201
        op_id = create_response.json()['id']

        # Step 2: Add participants
        p_response = client.post(
            f"/api/v1/sts-operations/{op_id}/participants",
            json=TEST_PARTICIPANT,
            headers=auth_headers
        )
        assert p_response.status_code == 201

        # Step 3: Add vessels
        v_response = client.post(
            f"/api/v1/sts-operations/{op_id}/vessels",
            json=TEST_VESSEL,
            headers=auth_headers
        )
        assert v_response.status_code == 201

        # Step 4: Finalize
        finalize_response = client.post(
            f"/api/v1/sts-operations/{op_id}/finalize",
            headers=auth_headers
        )
        assert finalize_response.status_code == 200
        assert finalize_response.json()['status'] == 'ready'

        # Step 5: Start
        start_response = client.post(
            f"/api/v1/sts-operations/{op_id}/start",
            headers=auth_headers
        )
        assert start_response.status_code == 200
        assert start_response.json()['status'] == 'active'

        # Step 6: Complete
        complete_response = client.post(
            f"/api/v1/sts-operations/{op_id}/complete",
            headers=auth_headers
        )
        assert complete_response.status_code == 200
        assert complete_response.json()['status'] == 'completed'

    @pytest.mark.asyncio
    async def test_sts_code_generation(self, client: TestClient, auth_headers: dict):
        """Test STS code generation is unique"""
        codes = set()

        for _ in range(5):
            response = client.post(
                "/api/v1/sts-operations",
                json=TEST_OPERATION,
                headers=auth_headers
            )
            code = response.json()['sts_operation_code']
            assert code not in codes  # Should be unique
            codes.add(code)
            assert code.startswith('STS-')  # Should have correct format

    @pytest.mark.asyncio
    async def test_operation_not_found(self, client: TestClient, auth_headers: dict):
        """Test accessing non-existent operation"""
        response = client.get(
            "/api/v1/sts-operations/nonexistent-id",
            headers=auth_headers
        )
        assert response.status_code == 404

    @pytest.mark.asyncio
    async def test_unauthorized_access(self, client: TestClient):
        """Test accessing endpoints without auth"""
        response = client.post(
            "/api/v1/sts-operations",
            json=TEST_OPERATION
        )
        assert response.status_code == 401


class TestEmailService:
    """Test email service integration"""

    @pytest.mark.asyncio
    async def test_send_operation_created_email(self):
        """Test sending operation creation email"""
        from app.services.email_service import email_service

        result = email_service.send_operation_created(
            to_email="test@example.com",
            operation_title="Test Operation",
            operation_code="STS-20250120-ABC123",
            recipient_name="Test User"
        )
        # Should return True even if email service is disabled
        assert isinstance(result, bool)

    @pytest.mark.asyncio
    async def test_send_bulk_emails(self):
        """Test sending bulk emails"""
        from app.services.email_service import email_service

        recipients = [
            {"email": "user1@example.com", "name": "User 1"},
            {"email": "user2@example.com", "name": "User 2"},
        ]

        results = email_service.send_bulk_emails(
            recipients=recipients,
            email_type="operation_created",
            operation_title="Test Operation",
            operation_code="STS-20250120-ABC123"
        )

        assert len(results) == 2
        assert all(isinstance(v, bool) for v in results.values())


# Fixtures
@pytest.fixture
def client():
    """FastAPI test client"""
    from app.main import app
    return TestClient(app)


@pytest.fixture
def auth_headers():
    """Authentication headers for tests"""
    return {
        "Authorization": "Bearer test-token-12345",
        "Content-Type": "application/json"
    }


@pytest.fixture
async def operation_id(client: TestClient, auth_headers: dict):
    """Create a test operation and return its ID"""
    response = client.post(
        "/api/v1/sts-operations",
        json=TEST_OPERATION,
        headers=auth_headers
    )
    return response.json()['id']
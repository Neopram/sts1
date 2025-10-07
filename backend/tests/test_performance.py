"""
Performance tests for STS Clearance Hub
Tests response times, throughput, and scalability
"""

import asyncio
import statistics
import time
import uuid
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timedelta

import pytest


@pytest.mark.performance
@pytest.mark.asyncio
class TestAPIPerformance:
    """Test API endpoint performance."""

    async def test_room_list_performance(
        self, authenticated_client, db_session, test_user
    ):
        """Test room list endpoint performance with various dataset sizes."""

        # Create test rooms
        room_counts = [10, 50, 100, 200]

        for room_count in room_counts:
            # Clean up previous test data
            await self._cleanup_test_rooms(db_session, test_user["email"])

            # Create rooms
            await self._create_test_rooms(db_session, room_count, test_user["email"])

            # Measure performance
            response_times = []
            for _ in range(5):  # 5 measurements
                start_time = time.time()
                response = authenticated_client.get("/api/v1/rooms")
                end_time = time.time()

                assert response.status_code == 200
                response_times.append((end_time - start_time) * 1000)  # Convert to ms

            avg_response_time = statistics.mean(response_times)
            max_response_time = max(response_times)

            # Performance assertions
            assert (
                avg_response_time < 200
            ), f"Average response time {avg_response_time:.2f}ms exceeds 200ms for {room_count} rooms"
            assert (
                max_response_time < 500
            ), f"Max response time {max_response_time:.2f}ms exceeds 500ms for {room_count} rooms"

            print(
                f"Room count: {room_count}, Avg: {avg_response_time:.2f}ms, Max: {max_response_time:.2f}ms"
            )

    async def test_activity_timeline_performance(
        self, authenticated_client, sample_room, db_session
    ):
        """Test activity timeline performance with large datasets."""

        room_id = sample_room.id

        # Create large number of activities
        activity_counts = [100, 500, 1000, 2000]

        for activity_count in activity_counts:
            # Clean up previous activities
            await self._cleanup_test_activities(db_session, room_id)

            # Create activities
            await self._create_test_activities(
                db_session, room_id, activity_count, "test@maritime.com"
            )

            # Test different time periods
            for days in [7, 30, 90]:
                response_times = []

                for _ in range(3):  # 3 measurements
                    start_time = time.time()
                    response = authenticated_client.get(
                        f"/api/v1/rooms/{room_id}/activities/timeline?days={days}"
                    )
                    end_time = time.time()

                    assert response.status_code == 200
                    response_times.append((end_time - start_time) * 1000)

                avg_response_time = statistics.mean(response_times)

                # Timeline should respond within 500ms even with large datasets
                assert (
                    avg_response_time < 500
                ), f"Timeline response time {avg_response_time:.2f}ms exceeds 500ms for {activity_count} activities over {days} days"

                print(
                    f"Activities: {activity_count}, Days: {days}, Avg: {avg_response_time:.2f}ms"
                )

    async def test_document_upload_performance(
        self, authenticated_client, sample_room, sample_document_types
    ):
        """Test document upload performance."""

        room_id = sample_room.id
        doc_type_id = sample_document_types[0].id

        # Test different file sizes
        file_sizes = [
            (1024, "1KB"),  # 1KB
            (10 * 1024, "10KB"),  # 10KB
            (100 * 1024, "100KB"),  # 100KB
            (1024 * 1024, "1MB"),  # 1MB
            (5 * 1024 * 1024, "5MB"),  # 5MB
        ]

        for file_size, size_label in file_sizes:
            # Create test file content
            file_content = b"0" * file_size

            response_times = []

            for i in range(3):  # 3 measurements
                document_data = {
                    "type_id": doc_type_id,
                    "notes": f"Performance test document {i}",
                }

                files = {
                    "file": (
                        f"test_{size_label}_{i}.pdf",
                        file_content,
                        "application/pdf",
                    )
                }

                start_time = time.time()
                response = authenticated_client.post(
                    f"/api/v1/rooms/{room_id}/documents",
                    data=document_data,
                    files=files,
                )
                end_time = time.time()

                assert response.status_code == 201
                response_times.append((end_time - start_time) * 1000)

            avg_response_time = statistics.mean(response_times)

            # Upload performance thresholds based on file size
            if file_size <= 100 * 1024:  # <= 100KB
                threshold = 1000  # 1 second
            elif file_size <= 1024 * 1024:  # <= 1MB
                threshold = 3000  # 3 seconds
            else:  # > 1MB
                threshold = 10000  # 10 seconds

            assert (
                avg_response_time < threshold
            ), f"Upload time {avg_response_time:.2f}ms exceeds {threshold}ms for {size_label} file"

            print(
                f"File size: {size_label}, Avg upload time: {avg_response_time:.2f}ms"
            )

    async def test_concurrent_requests_performance(
        self, authenticated_client, sample_room
    ):
        """Test performance under concurrent load."""

        room_id = sample_room.id

        # Test different concurrency levels
        concurrency_levels = [5, 10, 20, 50]

        for concurrency in concurrency_levels:

            async def make_request():
                start_time = time.time()
                response = authenticated_client.get(f"/api/v1/rooms/{room_id}")
                end_time = time.time()
                return response.status_code == 200, (end_time - start_time) * 1000

            # Execute concurrent requests
            start_time = time.time()
            tasks = [make_request() for _ in range(concurrency)]
            results = await asyncio.gather(*tasks)
            total_time = (time.time() - start_time) * 1000

            # Analyze results
            success_count = sum(1 for success, _ in results if success)
            response_times = [rt for _, rt in results]

            avg_response_time = statistics.mean(response_times)
            max_response_time = max(response_times)
            throughput = concurrency / (total_time / 1000)  # requests per second

            # Performance assertions
            assert (
                success_count == concurrency
            ), f"Not all requests succeeded: {success_count}/{concurrency}"
            assert (
                avg_response_time < 1000
            ), f"Average response time {avg_response_time:.2f}ms exceeds 1000ms with {concurrency} concurrent requests"
            assert (
                throughput > 10
            ), f"Throughput {throughput:.2f} req/s is below 10 req/s with {concurrency} concurrent requests"

            print(
                f"Concurrency: {concurrency}, Avg: {avg_response_time:.2f}ms, Max: {max_response_time:.2f}ms, Throughput: {throughput:.2f} req/s"
            )

    async def _create_test_rooms(self, db_session, count: int, user_email: str):
        """Helper to create test rooms."""
        from app.models import Party, Room

        rooms = []
        parties = []

        for i in range(count):
            room = Room(
                id=str(uuid.uuid4()),
                title=f"Performance Test Room {i}",
                location=f"Test Location {i}",
                sts_eta=datetime.utcnow() + timedelta(days=i % 30 + 1),
                created_by=user_email,
            )
            rooms.append(room)
            db_session.add(room)

            # Add user as party
            party = Party(
                id=str(uuid.uuid4()),
                room_id=room.id,
                role="owner",
                name="Test User",
                email=user_email,
            )
            parties.append(party)
            db_session.add(party)

        await db_session.commit()
        return rooms, parties

    async def _create_test_activities(
        self, db_session, room_id: str, count: int, user_email: str
    ):
        """Helper to create test activities."""
        from app.models import ActivityLog

        activities = []
        base_time = datetime.utcnow() - timedelta(days=30)

        actions = [
            "document_uploaded",
            "document_approved",
            "message_sent",
            "party_added",
            "vessel_added",
            "room_updated",
        ]

        for i in range(count):
            activity = ActivityLog(
                id=str(uuid.uuid4()),
                room_id=room_id,
                actor=user_email,
                action=actions[i % len(actions)],
                meta_json=f'{{"test_data": "value_{i}"}}',
                ts=base_time + timedelta(minutes=i * 5),
            )
            activities.append(activity)
            db_session.add(activity)

        await db_session.commit()
        return activities

    async def _cleanup_test_rooms(self, db_session, user_email: str):
        """Helper to cleanup test rooms."""
        from sqlalchemy import delete, select

        from app.models import Party, Room

        # Delete parties first
        await db_session.execute(delete(Party).where(Party.email == user_email))

        # Delete rooms
        await db_session.execute(delete(Room).where(Room.created_by == user_email))

        await db_session.commit()

    async def _cleanup_test_activities(self, db_session, room_id: str):
        """Helper to cleanup test activities."""
        from sqlalchemy import delete

        from app.models import ActivityLog

        await db_session.execute(
            delete(ActivityLog).where(ActivityLog.room_id == room_id)
        )

        await db_session.commit()


@pytest.mark.performance
@pytest.mark.asyncio
class TestDatabasePerformance:
    """Test database query performance."""

    async def test_complex_query_performance(self, db_session, test_user):
        """Test performance of complex database queries."""

        # Create test data
        await self._create_complex_test_data(db_session, test_user["email"])

        # Test complex queries
        queries = [
            # Room with documents and parties
            """
            SELECT r.*, COUNT(d.id) as document_count, COUNT(p.id) as party_count
            FROM rooms r
            LEFT JOIN documents d ON r.id = d.room_id
            LEFT JOIN parties p ON r.id = p.room_id
            WHERE r.created_by = :user_email
            GROUP BY r.id
            """,
            # Documents by criticality
            """
            SELECT dt.criticality, COUNT(d.id) as count, 
                   COUNT(CASE WHEN d.status = 'approved' THEN 1 END) as approved_count
            FROM documents d
            JOIN document_types dt ON d.type_id = dt.id
            JOIN rooms r ON d.room_id = r.id
            WHERE r.created_by = :user_email
            GROUP BY dt.criticality
            """,
            # Activity timeline aggregation
            """
            SELECT DATE(a.ts) as activity_date, 
                   COUNT(*) as activity_count,
                   COUNT(DISTINCT a.actor) as unique_actors
            FROM activity_log a
            JOIN rooms r ON a.room_id = r.id
            WHERE r.created_by = :user_email
            AND a.ts >= :start_date
            GROUP BY DATE(a.ts)
            ORDER BY activity_date DESC
            """,
        ]

        for i, query in enumerate(queries):
            response_times = []

            for _ in range(5):  # 5 measurements
                start_time = time.time()

                from sqlalchemy import text

                result = await db_session.execute(
                    text(query),
                    {
                        "user_email": test_user["email"],
                        "start_date": datetime.utcnow() - timedelta(days=30),
                    },
                )
                rows = result.fetchall()

                end_time = time.time()
                response_times.append((end_time - start_time) * 1000)

            avg_response_time = statistics.mean(response_times)

            # Complex queries should complete within 100ms
            assert (
                avg_response_time < 100
            ), f"Query {i+1} response time {avg_response_time:.2f}ms exceeds 100ms"

            print(f"Query {i+1}: {avg_response_time:.2f}ms avg, {len(rows)} rows")

    async def test_index_effectiveness(self, db_session, test_user):
        """Test that database indexes are effective."""

        # Create large dataset
        await self._create_large_test_dataset(db_session, test_user["email"])

        # Test queries that should use indexes
        indexed_queries = [
            # Should use idx_activity_log_room_ts
            (
                "Activity log by room and time",
                """
                SELECT * FROM activity_log 
                WHERE room_id = :room_id AND ts >= :start_date 
                ORDER BY ts DESC LIMIT 100
            """,
            ),
            # Should use idx_documents_room_status
            (
                "Documents by room and status",
                """
                SELECT * FROM documents 
                WHERE room_id = :room_id AND status = 'approved'
            """,
            ),
            # Should use idx_parties_room_email
            (
                "Parties by room and email",
                """
                SELECT * FROM parties 
                WHERE room_id = :room_id AND email = :email
            """,
            ),
        ]

        # Get a test room ID
        from sqlalchemy import select, text

        from app.models import Room

        room_result = await db_session.execute(
            select(Room.id).where(Room.created_by == test_user["email"]).limit(1)
        )
        room_id = room_result.scalar()

        for query_name, query in indexed_queries:
            response_times = []

            for _ in range(10):  # 10 measurements for better accuracy
                start_time = time.time()

                result = await db_session.execute(
                    text(query),
                    {
                        "room_id": room_id,
                        "start_date": datetime.utcnow() - timedelta(days=7),
                        "email": test_user["email"],
                    },
                )
                rows = result.fetchall()

                end_time = time.time()
                response_times.append((end_time - start_time) * 1000)

            avg_response_time = statistics.mean(response_times)

            # Indexed queries should be very fast
            assert (
                avg_response_time < 50
            ), f"{query_name} response time {avg_response_time:.2f}ms exceeds 50ms (index may not be effective)"

            print(f"{query_name}: {avg_response_time:.2f}ms avg")

    async def _create_complex_test_data(self, db_session, user_email: str):
        """Create complex test data for performance testing."""
        from app.models import ActivityLog, Document, DocumentType, Party, Room

        # Create document types
        doc_types = []
        for i, criticality in enumerate(["high", "med", "low"]):
            doc_type = DocumentType(
                id=str(uuid.uuid4()),
                code=f"TEST_TYPE_{i}",
                name=f"Test Document Type {i}",
                required=True,
                criticality=criticality,
            )
            doc_types.append(doc_type)
            db_session.add(doc_type)

        # Create rooms with related data
        for i in range(20):
            room = Room(
                id=str(uuid.uuid4()),
                title=f"Complex Test Room {i}",
                location=f"Test Location {i}",
                sts_eta=datetime.utcnow() + timedelta(days=i % 30 + 1),
                created_by=user_email,
            )
            db_session.add(room)

            # Add parties
            for j in range(3):
                party = Party(
                    id=str(uuid.uuid4()),
                    room_id=room.id,
                    role=["owner", "charterer", "broker"][j],
                    name=f"Test Party {j}",
                    email=f"party{j}@room{i}.com",
                )
                db_session.add(party)

            # Add documents
            for doc_type in doc_types:
                document = Document(
                    id=str(uuid.uuid4()),
                    room_id=room.id,
                    type_id=doc_type.id,
                    status=["missing", "under_review", "approved"][i % 3],
                    uploaded_by=user_email if i % 3 != 0 else None,
                    uploaded_at=datetime.utcnow() if i % 3 != 0 else None,
                )
                db_session.add(document)

            # Add activities
            for k in range(50):
                activity = ActivityLog(
                    id=str(uuid.uuid4()),
                    room_id=room.id,
                    actor=user_email,
                    action=f"test_action_{k % 5}",
                    meta_json=f'{{"test": "data_{k}"}}',
                    ts=datetime.utcnow() - timedelta(hours=k),
                )
                db_session.add(activity)

        await db_session.commit()

    async def _create_large_test_dataset(self, db_session, user_email: str):
        """Create large dataset for index testing."""
        from app.models import ActivityLog, Document, DocumentType, Party, Room

        # Create one room with lots of related data
        room = Room(
            id=str(uuid.uuid4()),
            title="Large Dataset Test Room",
            location="Test Location",
            sts_eta=datetime.utcnow() + timedelta(days=30),
            created_by=user_email,
        )
        db_session.add(room)

        # Create document type
        doc_type = DocumentType(
            id=str(uuid.uuid4()),
            code="LARGE_TEST",
            name="Large Test Document Type",
            required=True,
            criticality="high",
        )
        db_session.add(doc_type)

        await db_session.flush()  # Get IDs

        # Add many parties
        for i in range(100):
            party = Party(
                id=str(uuid.uuid4()),
                room_id=room.id,
                role=["owner", "charterer", "broker", "seller", "buyer"][i % 5],
                name=f"Large Test Party {i}",
                email=f"party{i}@large.test",
            )
            db_session.add(party)

        # Add many documents
        for i in range(200):
            document = Document(
                id=str(uuid.uuid4()),
                room_id=room.id,
                type_id=doc_type.id,
                status=["missing", "under_review", "approved", "expired"][i % 4],
                uploaded_by=user_email if i % 2 == 0 else None,
                uploaded_at=(
                    datetime.utcnow() - timedelta(hours=i) if i % 2 == 0 else None
                ),
            )
            db_session.add(document)

        # Add many activities
        for i in range(1000):
            activity = ActivityLog(
                id=str(uuid.uuid4()),
                room_id=room.id,
                actor=user_email,
                action=f"large_test_action_{i % 10}",
                meta_json=f'{{"large_test": "data_{i}"}}',
                ts=datetime.utcnow() - timedelta(minutes=i),
            )
            db_session.add(activity)

        await db_session.commit()


@pytest.mark.performance
@pytest.mark.slow
@pytest.mark.asyncio
class TestLoadTesting:
    """Load testing for sustained performance."""

    async def test_sustained_load(self, authenticated_client, sample_room):
        """Test performance under sustained load."""

        room_id = sample_room.id
        duration_seconds = 60  # 1 minute load test
        target_rps = 10  # 10 requests per second

        async def make_requests():
            """Make requests at target rate."""
            request_count = 0
            start_time = time.time()
            response_times = []
            errors = 0

            while time.time() - start_time < duration_seconds:
                request_start = time.time()

                try:
                    response = authenticated_client.get(f"/api/v1/rooms/{room_id}")
                    if response.status_code == 200:
                        response_times.append((time.time() - request_start) * 1000)
                    else:
                        errors += 1
                except Exception:
                    errors += 1

                request_count += 1

                # Rate limiting
                elapsed = time.time() - start_time
                expected_requests = elapsed * target_rps
                if request_count > expected_requests:
                    await asyncio.sleep(1 / target_rps)

            return {
                "request_count": request_count,
                "response_times": response_times,
                "errors": errors,
                "duration": time.time() - start_time,
            }

        # Run load test
        result = await make_requests()

        # Analyze results
        if result["response_times"]:
            avg_response_time = statistics.mean(result["response_times"])
            p95_response_time = statistics.quantiles(result["response_times"], n=20)[
                18
            ]  # 95th percentile
            p99_response_time = statistics.quantiles(result["response_times"], n=100)[
                98
            ]  # 99th percentile
        else:
            avg_response_time = p95_response_time = p99_response_time = 0

        actual_rps = result["request_count"] / result["duration"]
        error_rate = (
            result["errors"] / result["request_count"]
            if result["request_count"] > 0
            else 0
        )

        # Performance assertions
        assert error_rate < 0.01, f"Error rate {error_rate:.2%} exceeds 1%"
        assert (
            avg_response_time < 500
        ), f"Average response time {avg_response_time:.2f}ms exceeds 500ms"
        assert (
            p95_response_time < 1000
        ), f"95th percentile response time {p95_response_time:.2f}ms exceeds 1000ms"
        assert (
            p99_response_time < 2000
        ), f"99th percentile response time {p99_response_time:.2f}ms exceeds 2000ms"
        assert (
            actual_rps >= target_rps * 0.9
        ), f"Actual RPS {actual_rps:.2f} is below 90% of target {target_rps}"

        print(f"Load test results:")
        print(f"  Duration: {result['duration']:.2f}s")
        print(f"  Requests: {result['request_count']}")
        print(f"  RPS: {actual_rps:.2f}")
        print(f"  Error rate: {error_rate:.2%}")
        print(f"  Avg response time: {avg_response_time:.2f}ms")
        print(f"  95th percentile: {p95_response_time:.2f}ms")
        print(f"  99th percentile: {p99_response_time:.2f}ms")

    async def test_memory_usage_stability(self, authenticated_client, sample_room):
        """Test that memory usage remains stable under load."""
        import os

        import psutil

        process = psutil.Process(os.getpid())
        room_id = sample_room.id

        # Baseline memory usage
        initial_memory = process.memory_info().rss / 1024 / 1024  # MB

        # Make many requests
        for i in range(1000):
            response = authenticated_client.get(f"/api/v1/rooms/{room_id}")
            assert response.status_code == 200

            # Check memory every 100 requests
            if i % 100 == 0:
                current_memory = process.memory_info().rss / 1024 / 1024  # MB
                memory_increase = current_memory - initial_memory

                # Memory should not increase by more than 100MB
                assert (
                    memory_increase < 100
                ), f"Memory increased by {memory_increase:.2f}MB after {i} requests"

        # Final memory check
        final_memory = process.memory_info().rss / 1024 / 1024  # MB
        total_increase = final_memory - initial_memory

        print(
            f"Memory usage: Initial {initial_memory:.2f}MB, Final {final_memory:.2f}MB, Increase {total_increase:.2f}MB"
        )

        # Total memory increase should be reasonable
        assert (
            total_increase < 50
        ), f"Total memory increase {total_increase:.2f}MB exceeds 50MB"

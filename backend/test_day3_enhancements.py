import sys
import io
if sys.platform == 'win32':
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8', errors='replace')
"""
Day 3 Enhancements Test Suite
Tests for async background generation, dual-layer caching, and performance monitoring

Usage:
    python test_day3_enhancements.py
"""

import asyncio
import json
import logging
import time
import uuid
from pathlib import Path
from typing import Dict, Any

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Import services
from app.services.background_task_service import background_task_service, TaskStatus
from app.services.pdf_cache_service import pdf_cache_service, PDFCacheService
from app.services.metrics_service import metrics_service


class TestResults:
    """Track test results"""
    def __init__(self):
        self.passed = 0
        self.failed = 0
        self.tests = []
    
    def add_pass(self, name: str, message: str = ""):
        self.passed += 1
        self.tests.append({"name": name, "status": "PASS", "message": message})
        print(f"✅ PASS: {name}")
        if message:
            print(f"   {message}")
    
    def add_fail(self, name: str, message: str = ""):
        self.failed += 1
        self.tests.append({"name": name, "status": "FAIL", "message": message})
        print(f"❌ FAIL: {name}")
        if message:
            print(f"   {message}")
    
    def summary(self):
        total = self.passed + self.failed
        percent = (self.passed / total * 100) if total > 0 else 0
        print(f"\n{'='*60}")
        print(f"TEST SUMMARY: {self.passed}/{total} passed ({percent:.1f}%)")
        print(f"{'='*60}\n")


# ============================================================================
# TEST 1: Background Task Service
# ============================================================================

async def test_background_task_creation():
    """Test creating and tracking background tasks"""
    results = TestResults()
    
    print("\n" + "="*60)
    print("TEST 1: Background Task Service")
    print("="*60)
    
    try:
        # Create a test task
        task_id = await background_task_service.create_task(
            task_type="test_task",
            data={"test": "data", "value": 42}
        )
        
        # Verify task was created
        task_status = await background_task_service.get_task_status(task_id)
        if task_status:
            results.add_pass("Task Creation", f"Created task {task_id}")
        else:
            results.add_fail("Task Creation", "Task not found after creation")
        
        # Check task status
        if task_status.get("status") == "pending":
            results.add_pass("Task Status", "Task in PENDING state")
        else:
            results.add_fail("Task Status", f"Expected PENDING, got {task_status.get('status')}")
        
        # Check task data
        if task_status.get("task_type") == "test_task":
            results.add_pass("Task Data", "Task data preserved correctly")
        else:
            results.add_fail("Task Data", "Task data corrupted")
        
        results.summary()
        return results
        
    except Exception as e:
        results.add_fail("Background Task Service", str(e))
        results.summary()
        return results


# ============================================================================
# TEST 2: PDF Cache Service - Basic Operations
# ============================================================================

async def test_pdf_cache_basic():
    """Test basic PDF caching operations"""
    results = TestResults()
    
    print("\n" + "="*60)
    print("TEST 2: PDF Cache Service - Basic Operations")
    print("="*60)
    
    try:
        # Test data
        test_pdf = b"%PDF-1.4\n%Mock PDF content for testing"
        content_hash = "abc123def456"
        
        # Test in-memory cache hit/miss
        cache = PDFCacheService(max_memory_cache_size_mb=10)
        
        # First call - should miss
        if cache.cache_misses == 0:
            results.add_pass("Cache Init", "Cache initialized with zero misses")
        
        # Add to memory cache
        from app.services.pdf_cache_service import CacheEntry
        entry = CacheEntry(content_hash, test_pdf, {"test": "metadata"})
        await cache._add_to_memory_cache(entry)
        
        if len(cache.memory_cache) == 1:
            results.add_pass("Memory Cache Add", "Entry added to memory cache")
        else:
            results.add_fail("Memory Cache Add", "Entry not added to memory cache")
        
        # Verify we can retrieve it
        if content_hash in cache.memory_cache:
            results.add_pass("Memory Cache Retrieve", "Entry retrieved from memory cache")
        else:
            results.add_fail("Memory Cache Retrieve", "Entry not found in memory cache")
        
        results.summary()
        return results
        
    except Exception as e:
        results.add_fail("PDF Cache Service", str(e))
        results.summary()
        return results


# ============================================================================
# TEST 3: PDF Cache Service - Content Hashing
# ============================================================================

async def test_pdf_cache_hashing():
    """Test content hash calculation for deduplication"""
    results = TestResults()
    
    print("\n" + "="*60)
    print("TEST 3: PDF Cache Service - Content Hashing")
    print("="*60)
    
    try:
        # Test data
        room_data_1 = {
            "id": "room-1",
            "title": "Room A",
            "location": "Singapore",
            "sts_eta": "2024-01-15",
            "parties": [
                {"name": "Party A", "email": "a@test.com"},
                {"name": "Party B", "email": "b@test.com"},
            ],
            "vessels": [
                {"name": "Vessel 1", "imo_number": "1234567"},
            ]
        }
        
        room_data_2 = {
            "id": "room-1",  # Same ID
            "title": "Room A",  # Same data
            "location": "Singapore",
            "sts_eta": "2024-01-15",
            "parties": [
                {"name": "Party A", "email": "a@test.com"},
                {"name": "Party B", "email": "b@test.com"},
            ],
            "vessels": [
                {"name": "Vessel 1", "imo_number": "1234567"},
            ]
        }
        
        room_data_3 = {
            "id": "room-2",  # Different room
            "title": "Room B",
            "location": "Rotterdam",
            "sts_eta": "2024-01-20",
            "parties": [
                {"name": "Party C", "email": "c@test.com"},
            ],
            "vessels": []
        }
        
        # Calculate hashes
        hash_1 = pdf_cache_service.calculate_content_hash(room_data_1, True, True, True)
        hash_2 = pdf_cache_service.calculate_content_hash(room_data_2, True, True, True)
        hash_3 = pdf_cache_service.calculate_content_hash(room_data_3, True, True, True)
        
        # Identical data should produce identical hash
        if hash_1 == hash_2:
            results.add_pass("Hash Consistency", "Identical data produces identical hash")
        else:
            results.add_fail("Hash Consistency", "Identical data produced different hashes")
        
        # Different data should produce different hash
        if hash_1 != hash_3:
            results.add_pass("Hash Uniqueness", "Different data produces different hash")
        else:
            results.add_fail("Hash Uniqueness", "Different data produced same hash")
        
        # Test with different options
        hash_with_docs = pdf_cache_service.calculate_content_hash(room_data_1, True, True, True)
        hash_without_docs = pdf_cache_service.calculate_content_hash(room_data_1, False, True, True)
        
        if hash_with_docs != hash_without_docs:
            results.add_pass("Hash Options", "Different options produce different hashes")
        else:
            results.add_fail("Hash Options", "Options don't affect hash")
        
        results.summary()
        return results
        
    except Exception as e:
        results.add_fail("PDF Cache Hashing", str(e))
        results.summary()
        return results


# ============================================================================
# TEST 4: Metrics Service
# ============================================================================

async def test_metrics_service():
    """Test performance metrics collection"""
    results = TestResults()
    
    print("\n" + "="*60)
    print("TEST 4: Metrics Service")
    print("="*60)
    
    try:
        # Record some test metrics
        metrics_service.record_metric("test_metric", 123.45, "ms", {"test": True})
        metrics_service.record_pdf_generation(
            snapshot_id="snap-1",
            duration_ms=250.5,
            file_size_bytes=65536,
            included_sections=["documents", "approvals"],
            was_cached=False
        )
        metrics_service.record_pdf_generation(
            snapshot_id="snap-2",
            duration_ms=45.2,
            file_size_bytes=65536,
            included_sections=["documents"],
            was_cached=True  # Cached result
        )
        
        if len(metrics_service.metrics) >= 3:
            results.add_pass("Metric Recording", f"Recorded {len(metrics_service.metrics)} metrics")
        else:
            results.add_fail("Metric Recording", "Metrics not recorded properly")
        
        # Get summary statistics
        summary = metrics_service.get_summary(hours=24)
        if summary.get("total_metrics", 0) > 0:
            results.add_pass("Summary Generation", "Summary generated with metrics")
        else:
            results.add_fail("Summary Generation", "No metrics in summary")
        
        # Get PDF-specific statistics
        pdf_stats = metrics_service.get_pdf_generation_stats(hours=24)
        if pdf_stats.get("total_generations", 0) == 2:
            results.add_pass("PDF Stats", "PDF statistics calculated correctly")
        else:
            results.add_fail("PDF Stats", f"Expected 2 generations, got {pdf_stats.get('total_generations')}")
        
        # Check cache hit rate
        if pdf_stats.get("cached_count", 0) == 1:
            results.add_pass("Cache Hit Rate", "Cache hits counted correctly")
        else:
            results.add_fail("Cache Hit Rate", "Cache hit rate calculation incorrect")
        
        results.summary()
        return results
        
    except Exception as e:
        results.add_fail("Metrics Service", str(e))
        results.summary()
        return results


# ============================================================================
# TEST 5: API Performance Tracking
# ============================================================================

def test_api_performance_tracking():
    """Test API request performance tracking"""
    results = TestResults()
    
    print("\n" + "="*60)
    print("TEST 5: API Performance Tracking")
    print("="*60)
    
    try:
        # Record some API requests
        metrics_service.record_api_request(
            endpoint="/rooms/room-1/snapshots",
            method="POST",
            duration_ms=85.5,
            status_code=201,
            user_email="user@test.com"
        )
        metrics_service.record_api_request(
            endpoint="/rooms/room-1/snapshots",
            method="GET",
            duration_ms=32.1,
            status_code=200,
            user_email="user@test.com"
        )
        metrics_service.record_api_request(
            endpoint="/snapshots/tasks/task-1",
            method="GET",
            duration_ms=15.3,
            status_code=200,
            user_email="user@test.com"
        )
        
        # Get API performance stats
        api_perf = metrics_service.get_api_performance(hours=24)
        
        if api_perf.get("total_requests", 0) == 3:
            results.add_pass("API Request Tracking", "All API requests tracked")
        else:
            results.add_fail("API Request Tracking", f"Expected 3 requests, got {api_perf.get('total_requests')}")
        
        # Check endpoint grouping
        endpoints = api_perf.get("endpoints", {})
        if len(endpoints) >= 2:
            results.add_pass("Endpoint Grouping", "Requests grouped by endpoint")
        else:
            results.add_fail("Endpoint Grouping", "Endpoints not grouped properly")
        
        # Check status code tracking
        by_status = api_perf.get("by_status_code", {})
        if 200 in by_status and 201 in by_status:
            results.add_pass("Status Code Tracking", "Status codes tracked correctly")
        else:
            results.add_fail("Status Code Tracking", "Status codes not tracked")
        
        results.summary()
        return results
        
    except Exception as e:
        results.add_fail("API Performance", str(e))
        results.summary()
        return results


# ============================================================================
# MAIN TEST RUNNER
# ============================================================================

async def run_all_tests():
    """Run all Day 3 enhancement tests"""
    print("\n" + "="*70)
    print("DAY 3 ENHANCEMENTS - COMPREHENSIVE TEST SUITE")
    print("Testing: Async Background Generation, Dual-Layer Caching, Metrics")
    print("="*70)
    
    all_results = []
    
    # Run tests
    all_results.append(await test_background_task_creation())
    all_results.append(await test_pdf_cache_basic())
    all_results.append(await test_pdf_cache_hashing())
    all_results.append(await test_metrics_service())
    all_results.append(test_api_performance_tracking())
    
    # Aggregate results
    total_passed = sum(r.passed for r in all_results)
    total_failed = sum(r.failed for r in all_results)
    total = total_passed + total_failed
    
    print("\n" + "="*70)
    print("FINAL RESULTS")
    print("="*70)
    print(f"Total Tests: {total}")
    print(f"Passed: {total_passed} ✅")
    print(f"Failed: {total_failed} ❌")
    
    if total > 0:
        percent = (total_passed / total * 100)
        print(f"Success Rate: {percent:.1f}%")
    
    print("="*70 + "\n")
    
    if total_failed == 0:
        print("🎉 ALL DAY 3 ENHANCEMENT TESTS PASSED! 🎉\n")
    else:
        print(f"⚠️  {total_failed} test(s) failed. Please review.\n")


if __name__ == "__main__":
    asyncio.run(run_all_tests())
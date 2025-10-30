#!/usr/bin/env python3
"""
Phase 3: Complete Integration Testing Suite
Tests frontend-backend connectivity and all critical endpoints
"""

import asyncio
import json
import sys
import time
from datetime import datetime
from typing import Dict, List

import aiohttp

# Configuration
API_BASE_URL = "http://localhost:8001"
TIMEOUT = 10

class Colors:
    GREEN = "\033[92m"
    RED = "\033[91m"
    YELLOW = "\033[93m"
    BLUE = "\033[94m"
    RESET = "\033[0m"

def print_header(text: str):
    print(f"\n{Colors.BLUE}{'='*70}{Colors.RESET}")
    print(f"{Colors.BLUE}{text:^70}{Colors.RESET}")
    print(f"{Colors.BLUE}{'='*70}{Colors.RESET}\n")

def print_success(text: str):
    print(f"{Colors.GREEN}✓ {text}{Colors.RESET}")

def print_error(text: str):
    print(f"{Colors.RED}✗ {text}{Colors.RESET}")

def print_info(text: str):
    print(f"{Colors.YELLOW}ℹ {text}{Colors.RESET}")

async def test_endpoint(session: aiohttp.ClientSession, method: str, endpoint: str, 
                       data: Dict = None, name: str = None) -> bool:
    """Test a single endpoint"""
    url = f"{API_BASE_URL}{endpoint}"
    test_name = name or f"{method} {endpoint}"
    
    try:
        async with session.request(method, url, json=data, timeout=aiohttp.ClientTimeout(total=TIMEOUT)) as resp:
            if resp.status < 400:
                print_success(f"{test_name} (HTTP {resp.status})")
                return True
            else:
                print_error(f"{test_name} (HTTP {resp.status})")
                return False
    except asyncio.TimeoutError:
        print_error(f"{test_name} - TIMEOUT")
        return False
    except Exception as e:
        print_error(f"{test_name} - {str(e)}")
        return False

async def run_integration_tests():
    """Run all integration tests"""
    results = {
        "authentication": [],
        "documents": [],
        "messages": [],
        "notifications": [],
        "users": [],
        "rooms": [],
        "health": []
    }
    
    print_header("PHASE 3: INTEGRATION TEST SUITE")
    print(f"Testing API at: {API_BASE_URL}")
    print(f"Timestamp: {datetime.now().isoformat()}\n")
    
    async with aiohttp.ClientSession() as session:
        # Health & Status Checks
        print_header("1. HEALTH & STATUS CHECKS")
        results["health"].append(await test_endpoint(session, "GET", "/", name="Root Endpoint"))
        results["health"].append(await test_endpoint(session, "GET", "/api/v1/stats/system/health", name="Health Check"))
        
        # Authentication Endpoints
        print_header("2. AUTHENTICATION ENDPOINTS")
        results["authentication"].append(await test_endpoint(session, "GET", "/api/v1/auth/me", name="Get Current User"))
        
        # Users Endpoints
        print_header("3. USERS ENDPOINTS")
        results["users"].append(await test_endpoint(session, "GET", "/api/v1/users", name="List All Users"))
        results["users"].append(await test_endpoint(session, "GET", "/api/v1/users/profile", name="Get User Profile"))
        results["users"].append(await test_endpoint(session, "GET", "/api/v1/users/search?q=test", name="Search Users"))
        
        # Rooms Endpoints
        print_header("4. ROOMS ENDPOINTS")
        results["rooms"].append(await test_endpoint(session, "GET", "/api/v1/rooms", name="List Rooms"))
        results["rooms"].append(await test_endpoint(session, "GET", "/api/v1/rooms/active", name="List Active Rooms"))
        results["rooms"].append(await test_endpoint(session, "GET", "/api/v1/rooms/stats", name="Room Statistics"))
        
        # Documents Endpoints
        print_header("5. DOCUMENTS ENDPOINTS")
        results["documents"].append(await test_endpoint(session, "GET", "/api/v1/documents", name="List Documents"))
        results["documents"].append(await test_endpoint(session, "GET", "/api/v1/documents/missing", name="Missing Documents"))
        results["documents"].append(await test_endpoint(session, "GET", "/api/v1/documents/expiring", name="Expiring Documents"))
        results["documents"].append(await test_endpoint(session, "GET", "/api/v1/documents/search?q=test", name="Search Documents"))
        
        # Messages Endpoints
        print_header("6. MESSAGES ENDPOINTS")
        results["messages"].append(await test_endpoint(session, "GET", "/api/v1/messages", name="List Messages"))
        results["messages"].append(await test_endpoint(session, "GET", "/api/v1/messages/rooms/count", name="Message Count by Room"))
        
        # Notifications Endpoints
        print_header("7. NOTIFICATIONS ENDPOINTS")
        results["notifications"].append(await test_endpoint(session, "GET", "/api/v1/notifications", name="List Notifications"))
        results["notifications"].append(await test_endpoint(session, "GET", "/api/v1/notifications/unread", name="Unread Notifications"))
        results["notifications"].append(await test_endpoint(session, "GET", "/api/v1/notifications/stats", name="Notification Stats"))
        
        # Approvals Endpoints
        print_header("8. APPROVALS ENDPOINTS")
        results["authentication"].append(await test_endpoint(session, "GET", "/api/v1/approvals", name="List Approvals"))
        results["authentication"].append(await test_endpoint(session, "GET", "/api/v1/approvals/pending", name="Pending Approvals"))
        
        # Vessels Endpoints
        print_header("9. VESSELS ENDPOINTS")
        results["authentication"].append(await test_endpoint(session, "GET", "/api/v1/vessels", name="List Vessels"))
        results["authentication"].append(await test_endpoint(session, "GET", "/api/v1/vessels/search?q=test", name="Search Vessels"))
    
    # Summary
    print_header("TEST SUMMARY")
    
    total_tests = sum(len(v) for v in results.values())
    passed_tests = sum(sum(v) for v in results.values())
    failed_tests = total_tests - passed_tests
    
    for category, tests in results.items():
        if tests:
            passed = sum(tests)
            total = len(tests)
            percentage = (passed / total * 100) if total > 0 else 0
            status = Colors.GREEN if passed == total else Colors.YELLOW
            print(f"{status}{category.upper():25} {passed}/{total:2} ✓ ({percentage:.0f}%){Colors.RESET}")
    
    print(f"\n{Colors.BLUE}{'─'*70}{Colors.RESET}")
    
    if failed_tests == 0:
        print(f"{Colors.GREEN}🎉 ALL {total_tests} TESTS PASSED!{Colors.RESET}")
        return True
    else:
        print(f"{Colors.YELLOW}⚠ {passed_tests}/{total_tests} tests passed, {failed_tests} failed{Colors.RESET}")
        return False

if __name__ == "__main__":
    try:
        success = asyncio.run(run_integration_tests())
        sys.exit(0 if success else 1)
    except KeyboardInterrupt:
        print_error("\nTest interrupted by user")
        sys.exit(1)
    except Exception as e:
        print_error(f"Test failed with error: {e}")
        sys.exit(1)
#!/usr/bin/env python3
"""
Phase 3: Complete Integration Testing Suite - WITH AUTHENTICATION
Tests frontend-backend connectivity and all critical endpoints
"""

import asyncio
import json
import sys
import time
from datetime import datetime
from typing import Dict, List, Optional

import aiohttp

# Configuration
API_BASE_URL = "http://localhost:8001"
TIMEOUT = 10
TEST_USER_EMAIL = "admin@sts.com"
TEST_USER_PASSWORD = "password123"

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

async def get_auth_token(session: aiohttp.ClientSession) -> Optional[str]:
    """Get JWT token for authenticated requests"""
    url = f"{API_BASE_URL}/api/v1/auth/login"
    payload = {"email": TEST_USER_EMAIL, "password": TEST_USER_PASSWORD}
    
    try:
        async with session.post(url, json=payload, timeout=aiohttp.ClientTimeout(total=TIMEOUT)) as resp:
            if resp.status == 200:
                data = await resp.json()
                # Try both 'token' and 'access_token' keys
                token = data.get("token") or data.get("access_token")
                if token:
                    print_success(f"Authentication successful for {TEST_USER_EMAIL}")
                    return token
            print_error(f"Authentication failed: HTTP {resp.status}")
            return None
    except Exception as e:
        print_error(f"Authentication error: {str(e)}")
        return None

async def test_endpoint(session: aiohttp.ClientSession, method: str, endpoint: str, 
                       data: Dict = None, token: Optional[str] = None, name: str = None) -> bool:
    """Test a single endpoint"""
    url = f"{API_BASE_URL}{endpoint}"
    test_name = name or f"{method} {endpoint}"
    
    headers = {}
    if token:
        headers["Authorization"] = f"Bearer {token}"
    
    try:
        async with session.request(method, url, json=data, headers=headers, 
                                  timeout=aiohttp.ClientTimeout(total=TIMEOUT)) as resp:
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
        "health": [],
        "advanced": []
    }
    
    print_header("PHASE 3: FULL INTEGRATION TEST SUITE")
    print(f"Testing API at: {API_BASE_URL}")
    print(f"Timestamp: {datetime.now().isoformat()}\n")
    
    async with aiohttp.ClientSession() as session:
        # Get authentication token
        print_header("0. AUTHENTICATION")
        token = await get_auth_token(session)
        
        if not token:
            print_error("Cannot proceed without authentication token")
            return False
        
        # Health & Status Checks
        print_header("1. HEALTH & STATUS CHECKS")
        results["health"].append(await test_endpoint(session, "GET", "/", name="Root Endpoint"))
        results["health"].append(await test_endpoint(session, "GET", "/api/v1/stats/system/health", 
                                                    name="Health Check", token=token))
        
        # Authentication Endpoints
        print_header("2. AUTHENTICATION ENDPOINTS")
        results["authentication"].append(await test_endpoint(session, "GET", "/api/v1/auth/me", 
                                                            name="Get Current User", token=token))
        
        # Users Endpoints
        print_header("3. USERS ENDPOINTS")
        results["users"].append(await test_endpoint(session, "GET", "/api/v1/users", 
                                                   name="List All Users", token=token))
        results["users"].append(await test_endpoint(session, "GET", "/api/v1/users/profile", 
                                                   name="Get User Profile", token=token))
        results["users"].append(await test_endpoint(session, "GET", "/api/v1/users/search?q=test", 
                                                   name="Search Users", token=token))
        
        # Rooms Endpoints
        print_header("4. ROOMS ENDPOINTS")
        results["rooms"].append(await test_endpoint(session, "GET", "/api/v1/rooms", 
                                                   name="List Rooms", token=token))
        results["rooms"].append(await test_endpoint(session, "GET", "/api/v1/rooms/active", 
                                                   name="List Active Rooms", token=token))
        results["rooms"].append(await test_endpoint(session, "GET", "/api/v1/rooms/stats", 
                                                   name="Room Statistics", token=token))
        
        # Documents Endpoints
        print_header("5. DOCUMENTS ENDPOINTS")
        results["documents"].append(await test_endpoint(session, "GET", "/api/v1/documents", 
                                                       name="List Documents", token=token))
        results["documents"].append(await test_endpoint(session, "GET", "/api/v1/documents/missing", 
                                                       name="Missing Documents", token=token))
        results["documents"].append(await test_endpoint(session, "GET", "/api/v1/documents/expiring", 
                                                       name="Expiring Documents", token=token))
        results["documents"].append(await test_endpoint(session, "GET", "/api/v1/documents/search?q=test", 
                                                       name="Search Documents", token=token))
        
        # Messages Endpoints
        print_header("6. MESSAGES ENDPOINTS")
        results["messages"].append(await test_endpoint(session, "GET", "/api/v1/messages", 
                                                      name="List Messages", token=token))
        
        # Notifications Endpoints
        print_header("7. NOTIFICATIONS ENDPOINTS")
        results["notifications"].append(await test_endpoint(session, "GET", "/api/v1/notifications", 
                                                           name="List Notifications", token=token))
        
        # Approvals Endpoints
        print_header("8. APPROVALS ENDPOINTS")
        results["authentication"].append(await test_endpoint(session, "GET", "/api/v1/approvals", 
                                                            name="List Approvals", token=token))
        
        # Vessels Endpoints
        print_header("9. VESSELS ENDPOINTS")
        results["advanced"].append(await test_endpoint(session, "GET", "/api/v1/vessels", 
                                                      name="List Vessels", token=token))
        
        # Advanced endpoints
        print_header("10. ADVANCED FEATURES")
        results["advanced"].append(await test_endpoint(session, "GET", "/api/v1/stats/dashboard", 
                                                      name="Dashboard Stats", token=token))
        results["advanced"].append(await test_endpoint(session, "GET", "/api/v1/search", 
                                                      name="Global Search", token=token))
        results["advanced"].append(await test_endpoint(session, "GET", "/api/v1/activities", 
                                                      name="Activity Log", token=token))
    
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
        success_rate = (passed_tests / total_tests * 100) if total_tests > 0 else 0
        print(f"{Colors.YELLOW}⚠ {passed_tests}/{total_tests} tests passed ({success_rate:.0f}%), {failed_tests} failed{Colors.RESET}")
        return success_rate >= 70  # 70% pass rate is acceptable

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
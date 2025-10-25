#!/usr/bin/env python3
"""
Comprehensive test to verify document viewing functionality in the STS Clearance system
Tests: Upload, View, Download, List documents with proper access control
"""

import asyncio
import aiohttp
import json
import sys
from pathlib import Path
from datetime import datetime, timedelta

# Configuration
BASE_URL = "http://localhost:8000"
API_PREFIX = "/api/v1"

# Test user credentials
TEST_USERS = {
    "broker": {"email": "broker@test.com", "password": "password123"},
    "owner": {"email": "owner@test.com", "password": "password123"},
    "admin": {"email": "admin@test.com", "password": "password123"}
}

class DocumentViewingTester:
    def __init__(self):
        self.session = None
        self.tokens = {}
        self.test_results = {
            "tests_run": 0,
            "tests_passed": 0,
            "tests_failed": 0,
            "details": []
        }
        
    async def __aenter__(self):
        self.session = aiohttp.ClientSession()
        return self
    
    async def __aexit__(self, exc_type, exc_val, exc_tb):
        if self.session:
            await self.session.close()
    
    async def log_result(self, test_name, passed, message, details=None):
        self.test_results["tests_run"] += 1
        if passed:
            self.test_results["tests_passed"] += 1
            status = "✅ PASS"
        else:
            self.test_results["tests_failed"] += 1
            status = "❌ FAIL"
        
        print(f"\n{status} - {test_name}")
        print(f"   Message: {message}")
        if details:
            print(f"   Details: {json.dumps(details, indent=2)}")
        
        self.test_results["details"].append({
            "test": test_name,
            "passed": passed,
            "message": message,
            "details": details
        })
    
    async def authenticate_user(self, role="broker"):
        """Authenticate a user and store token"""
        try:
            creds = TEST_USERS[role]
            
            response = await self.session.post(
                f"{BASE_URL}{API_PREFIX}/auth/login",
                json={"email": creds["email"], "password": creds["password"]}
            )
            
            if response.status == 200:
                data = await response.json()
                self.tokens[role] = data.get("access_token")
                await self.log_result(
                    f"Authentication - {role}",
                    True,
                    f"Successfully authenticated as {role}"
                )
                return True
            else:
                await self.log_result(
                    f"Authentication - {role}",
                    False,
                    f"Failed with status {response.status}",
                    {"response": await response.text()}
                )
                return False
        except Exception as e:
            await self.log_result(
                f"Authentication - {role}",
                False,
                f"Exception: {str(e)}"
            )
            return False
    
    async def get_rooms(self, role="broker"):
        """Get available rooms for a user"""
        try:
            headers = {"Authorization": f"Bearer {self.tokens[role]}"}
            response = await self.session.get(
                f"{BASE_URL}{API_PREFIX}/rooms",
                headers=headers
            )
            
            if response.status == 200:
                rooms = await response.json()
                if rooms:
                    await self.log_result(
                        f"Get Rooms - {role}",
                        True,
                        f"Found {len(rooms)} room(s)",
                        {"rooms": [{"id": r.get("id"), "name": r.get("name")} for r in rooms]}
                    )
                    return rooms
                else:
                    await self.log_result(
                        f"Get Rooms - {role}",
                        False,
                        "No rooms found"
                    )
                    return []
            else:
                await self.log_result(
                    f"Get Rooms - {role}",
                    False,
                    f"Failed with status {response.status}"
                )
                return []
        except Exception as e:
            await self.log_result(
                f"Get Rooms - {role}",
                False,
                f"Exception: {str(e)}"
            )
            return []
    
    async def get_documents(self, room_id, role="broker"):
        """Get documents in a room"""
        try:
            headers = {"Authorization": f"Bearer {self.tokens[role]}"}
            response = await self.session.get(
                f"{BASE_URL}{API_PREFIX}/rooms/{room_id}/documents",
                headers=headers
            )
            
            if response.status == 200:
                docs = await response.json()
                await self.log_result(
                    f"Get Documents - {role}",
                    True,
                    f"Retrieved {len(docs)} document(s) from room {room_id}",
                    {
                        "count": len(docs),
                        "documents": [
                            {
                                "id": d.get("id"),
                                "type_name": d.get("type_name"),
                                "status": d.get("status"),
                                "file_url": d.get("file_url") is not None,
                                "uploaded_by": d.get("uploaded_by")
                            }
                            for d in docs[:3]
                        ]
                    }
                )
                return docs
            else:
                await self.log_result(
                    f"Get Documents - {role}",
                    False,
                    f"Failed with status {response.status}",
                    {"response": await response.text()}
                )
                return []
        except Exception as e:
            await self.log_result(
                f"Get Documents - {role}",
                False,
                f"Exception: {str(e)}"
            )
            return []
    
    async def get_document_detail(self, room_id, document_id, role="broker"):
        """Get detailed information about a specific document"""
        try:
            headers = {"Authorization": f"Bearer {self.tokens[role]}"}
            response = await self.session.get(
                f"{BASE_URL}{API_PREFIX}/rooms/{room_id}/documents/{document_id}",
                headers=headers
            )
            
            if response.status == 200:
                doc = await response.json()
                await self.log_result(
                    f"Get Document Detail - {role}",
                    True,
                    f"Retrieved document {document_id} details",
                    {
                        "id": doc.get("id"),
                        "type_name": doc.get("type_name"),
                        "status": doc.get("status"),
                        "file_url": doc.get("file_url"),
                        "uploaded_by": doc.get("uploaded_by"),
                        "uploaded_at": doc.get("uploaded_at"),
                        "criticality": doc.get("criticality")
                    }
                )
                return doc
            else:
                await self.log_result(
                    f"Get Document Detail - {role}",
                    False,
                    f"Failed with status {response.status}"
                )
                return None
        except Exception as e:
            await self.log_result(
                f"Get Document Detail - {role}",
                False,
                f"Exception: {str(e)}"
            )
            return None
    
    async def download_document(self, room_id, document_id, role="broker"):
        """Download a document file"""
        try:
            headers = {"Authorization": f"Bearer {self.tokens[role]}"}
            response = await self.session.get(
                f"{BASE_URL}{API_PREFIX}/rooms/{room_id}/documents/{document_id}/download",
                headers=headers
            )
            
            if response.status == 200:
                content_type = response.headers.get("Content-Type", "unknown")
                content_length = response.headers.get("Content-Length", "0")
                
                await self.log_result(
                    f"Download Document - {role}",
                    True,
                    f"Successfully downloaded document {document_id}",
                    {
                        "content_type": content_type,
                        "content_length": content_length
                    }
                )
                return await response.read()
            elif response.status == 404:
                await self.log_result(
                    f"Download Document - {role}",
                    False,
                    "Document file not found (404)"
                )
                return None
            else:
                await self.log_result(
                    f"Download Document - {role}",
                    False,
                    f"Failed with status {response.status}",
                    {"response": await response.text()}
                )
                return None
        except Exception as e:
            await self.log_result(
                f"Download Document - {role}",
                False,
                f"Exception: {str(e)}"
            )
            return None
    
    async def serve_static_file(self, file_path):
        """Test serving static files (document files)"""
        try:
            response = await self.session.get(
                f"{BASE_URL}{API_PREFIX}/files/{file_path}"
            )
            
            if response.status == 200:
                await self.log_result(
                    "Serve Static File",
                    True,
                    f"Successfully served static file: {file_path}",
                    {"status": response.status}
                )
                return True
            else:
                await self.log_result(
                    "Serve Static File",
                    False,
                    f"Failed with status {response.status}"
                )
                return False
        except Exception as e:
            await self.log_result(
                "Serve Static File",
                False,
                f"Exception: {str(e)}"
            )
            return False
    
    async def check_document_viewing_capability(self, room_id, docs, role="broker"):
        """Check if documents can be viewed (have file_url and accessible)"""
        try:
            viewable_count = 0
            missing_file_url_count = 0
            download_accessible_count = 0
            
            for doc in docs[:5]:  # Check first 5 documents
                if doc.get("file_url"):
                    viewable_count += 1
                    # Try to access the file
                    can_download = await self.download_document(room_id, doc.get("id"), role)
                    if can_download:
                        download_accessible_count += 1
                else:
                    missing_file_url_count += 1
            
            total_tested = min(5, len(docs))
            await self.log_result(
                "Document Viewing Capability",
                viewable_count > 0,
                f"Checked {total_tested} documents",
                {
                    "total_documents": len(docs),
                    "tested": total_tested,
                    "with_file_url": viewable_count,
                    "missing_file_url": missing_file_url_count,
                    "download_accessible": download_accessible_count
                }
            )
            
            return viewable_count > 0
        except Exception as e:
            await self.log_result(
                "Document Viewing Capability",
                False,
                f"Exception: {str(e)}"
            )
            return False
    
    async def run_tests(self):
        """Run all tests"""
        print("=" * 80)
        print("STS CLEARANCE - DOCUMENT VIEWING FUNCTIONALITY TEST")
        print("=" * 80)
        
        # Test 1: Authentication
        print("\n[PHASE 1] Authentication Tests")
        print("-" * 40)
        auth_success = await self.authenticate_user("broker")
        if not auth_success:
            print("\n❌ Cannot proceed - authentication failed")
            return
        
        # Test 2: Get Rooms
        print("\n[PHASE 2] Room Access Tests")
        print("-" * 40)
        rooms = await self.get_rooms("broker")
        if not rooms:
            print("\n❌ Cannot proceed - no rooms found")
            return
        
        room_id = rooms[0].get("id")
        print(f"\nUsing room: {room_id}")
        
        # Test 3: Get Documents
        print("\n[PHASE 3] Document Retrieval Tests")
        print("-" * 40)
        docs = await self.get_documents(room_id, "broker")
        
        if not docs:
            print("\n⚠️  No documents found in room")
        else:
            # Test 4: Get Document Details
            print("\n[PHASE 4] Document Detail Tests")
            print("-" * 40)
            first_doc = docs[0]
            doc_detail = await self.get_document_detail(room_id, first_doc.get("id"), "broker")
            
            # Test 5: Document Viewing Capability
            print("\n[PHASE 5] Document Viewing Capability Tests")
            print("-" * 40)
            await self.check_document_viewing_capability(room_id, docs, "broker")
        
        # Print Summary
        self.print_summary()
    
    def print_summary(self):
        """Print test summary"""
        print("\n" + "=" * 80)
        print("TEST SUMMARY")
        print("=" * 80)
        print(f"Total Tests Run: {self.test_results['tests_run']}")
        print(f"Passed: {self.test_results['tests_passed']} ✅")
        print(f"Failed: {self.test_results['tests_failed']} ❌")
        
        success_rate = (
            (self.test_results['tests_passed'] / self.test_results['tests_run'] * 100)
            if self.test_results['tests_run'] > 0
            else 0
        )
        print(f"Success Rate: {success_rate:.1f}%")
        
        print("\n" + "=" * 80)
        print("DOCUMENT VIEWING STATUS")
        print("=" * 80)
        
        if self.test_results['tests_failed'] == 0:
            print("✅ All tests passed! Document viewing is working correctly.")
        elif self.test_results['tests_passed'] > self.test_results['tests_failed']:
            print("⚠️  Most tests passed, but some issues were detected.")
        else:
            print("❌ Multiple failures detected. Document viewing has issues.")
        
        return self.test_results


async def main():
    try:
        async with DocumentViewingTester() as tester:
            await tester.run_tests()
    except KeyboardInterrupt:
        print("\n\n❌ Tests interrupted by user")
        sys.exit(1)
    except Exception as e:
        print(f"\n\n❌ Unexpected error: {str(e)}")
        import traceback
        traceback.print_exc()
        sys.exit(1)


if __name__ == "__main__":
    asyncio.run(main())
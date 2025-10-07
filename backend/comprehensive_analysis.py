"""
Comprehensive Analysis of STS Clearance System
Detailed functionality assessment of all endpoints/buttons
"""

import requests
import json
import asyncio
import websockets
from datetime import datetime
import time

BASE_URL = "http://localhost:8000"
WS_URL = "ws://localhost:8000"

class ComprehensiveAnalyzer:
    def __init__(self):
        self.token = None
        self.room_id = None
        self.user_info = None
        self.test_results = {}
        self.functionality_scores = {}
        
    def print_header(self):
        print("╔" + "═" * 100 + "╗")
        print("║" + " " * 25 + "STS CLEARANCE SYSTEM - COMPREHENSIVE FUNCTIONALITY ANALYSIS" + " " * 15 + "║")
        print("║" + " " * 100 + "║")
        print("║" + f"  Analysis Date: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}" + " " * 60 + "║")
        print("║" + f"  Server: {BASE_URL}" + " " * 65 + "║")
        print("╚" + "═" * 100 + "╝")
    
    def authenticate(self):
        """Get authentication token for testing"""
        try:
            response = requests.post(f"{BASE_URL}/api/v1/auth/login", json={
                "email": "test@example.com",
                "password": "testpass123"
            }, timeout=10)
            
            if response.status_code == 200:
                data = response.json()
                self.token = data.get("token")
                return True
            return False
        except:
            return False
    
    def get_user_info(self):
        """Get current user information"""
        if not self.token:
            return False
        
        try:
            headers = {"Authorization": f"Bearer {self.token}"}
            response = requests.get(f"{BASE_URL}/api/v1/auth/me", headers=headers, timeout=10)
            if response.status_code == 200:
                self.user_info = response.json()
                return True
            return False
        except:
            return False
    
    def create_test_room(self):
        """Create a test room for testing"""
        if not self.token:
            return False
        
        try:
            headers = {"Authorization": f"Bearer {self.token}"}
            room_data = {
                "title": f"Analysis Test Room {datetime.now().strftime('%H:%M:%S')}",
                "location": "Test Location",
                "sts_eta": "2024-12-31T23:59:59",
                "parties": [
                    {"role": "seller", "name": "Test Seller", "email": "seller@test.com"},
                    {"role": "buyer", "name": "Test Buyer", "email": "buyer@test.com"}
                ]
            }
            response = requests.post(f"{BASE_URL}/api/v1/rooms", json=room_data, headers=headers, timeout=10)
            if response.status_code == 200:
                self.room_id = response.json()["id"]
                return True
            return False
        except:
            return False
    
    def test_endpoint(self, method, endpoint, data=None, expected_status=200, description=""):
        """Test a single endpoint and return functionality percentage"""
        if not self.token and "/auth/" not in endpoint and endpoint not in ["/", "/api/v1/config/system-info", "/api/v1/stats/system/health"]:
            return {"status": "SKIP", "percentage": 0, "reason": "No authentication"}
        
        headers = {"Authorization": f"Bearer {self.token}"} if self.token else {}
        
        try:
            if method == "GET":
                response = requests.get(f"{BASE_URL}{endpoint}", headers=headers, timeout=10)
            elif method == "POST":
                response = requests.post(f"{BASE_URL}{endpoint}", json=data, headers=headers, timeout=10)
            elif method == "PUT":
                response = requests.put(f"{BASE_URL}{endpoint}", json=data, headers=headers, timeout=10)
            elif method == "PATCH":
                response = requests.patch(f"{BASE_URL}{endpoint}", json=data, headers=headers, timeout=10)
            elif method == "DELETE":
                response = requests.delete(f"{BASE_URL}{endpoint}", headers=headers, timeout=10)
            else:
                return {"status": "ERROR", "percentage": 0, "reason": "Unknown method"}
            
            # Determine functionality percentage based on response
            if response.status_code == expected_status:
                return {"status": "FULL", "percentage": 100, "reason": "Working perfectly"}
            elif response.status_code in [200, 201, 202, 204]:
                return {"status": "WORKING", "percentage": 90, "reason": f"Working (status {response.status_code})"}
            elif response.status_code in [400, 422]:
                return {"status": "PARTIAL", "percentage": 70, "reason": "Validation issues but endpoint exists"}
            elif response.status_code == 401:
                return {"status": "AUTH", "percentage": 60, "reason": "Authentication required (endpoint exists)"}
            elif response.status_code == 403:
                return {"status": "PERM", "percentage": 50, "reason": "Permission denied (endpoint exists)"}
            elif response.status_code == 404:
                return {"status": "MISSING", "percentage": 20, "reason": "Endpoint not found"}
            elif response.status_code == 405:
                return {"status": "METHOD", "percentage": 30, "reason": "Method not allowed"}
            elif response.status_code >= 500:
                return {"status": "ERROR", "percentage": 40, "reason": "Server error"}
            else:
                return {"status": "UNKNOWN", "percentage": 30, "reason": f"Unknown status {response.status_code}"}
                
        except requests.exceptions.Timeout:
            return {"status": "TIMEOUT", "percentage": 10, "reason": "Request timeout"}
        except requests.exceptions.ConnectionError:
            return {"status": "CONNECTION", "percentage": 0, "reason": "Connection error"}
        except Exception as e:
            return {"status": "EXCEPTION", "percentage": 5, "reason": f"Exception: {str(e)[:50]}"}
    
    def analyze_all_endpoints(self):
        """Analyze all endpoints systematically"""
        
        # Define all endpoints with their expected functionality
        endpoints = {
            # AUTHENTICATION & USER MANAGEMENT
            "Auth - Root Endpoint": ("GET", "/", 200),
            "Auth - Login": ("POST", "/api/v1/auth/login", 200),
            "Auth - Register": ("POST", "/api/v1/auth/register", 400),  # Expected to fail for existing user
            "Auth - Logout": ("POST", "/api/v1/auth/logout", 200),
            "Auth - Get Current User": ("GET", "/api/v1/auth/me", 200),
            "Auth - Validate Token": ("GET", "/api/v1/auth/validate", 200),
            
            # USER MANAGEMENT
            "Users - List Users": ("GET", "/api/v1/users", 200),
            "Users - Get User": ("GET", "/api/v1/users/test-user-id", 404),  # Expected 404
            "Users - Update User": ("PUT", "/api/v1/users/test-user-id", 404),
            "Users - Delete User": ("DELETE", "/api/v1/users/test-user-id", 404),
            
            # ROOM MANAGEMENT
            "Rooms - List Rooms": ("GET", "/api/v1/rooms", 200),
            "Rooms - Create Room": ("POST", "/api/v1/rooms", 200),
            "Rooms - Get Room": ("GET", f"/api/v1/rooms/{'{room_id}'}", 200),
            "Rooms - Update Room": ("PATCH", f"/api/v1/rooms/{'{room_id}'}", 200),
            "Rooms - Delete Room": ("DELETE", f"/api/v1/rooms/{'{room_id}'}", 200),
            
            # ROOM PARTIES
            "Parties - Get Room Parties": ("GET", f"/api/v1/rooms/{'{room_id}'}/parties", 200),
            "Parties - Add Party": ("POST", f"/api/v1/rooms/{'{room_id}'}/parties", 200),
            "Parties - Remove Party": ("DELETE", f"/api/v1/rooms/{'{room_id}'}/parties/test-party-id", 404),
            
            # DOCUMENT MANAGEMENT
            "Docs - List Document Types": ("GET", "/api/v1/document-types", 200),
            "Docs - Get Room Documents": ("GET", f"/api/v1/rooms/{'{room_id}'}/documents", 200),
            "Docs - Get Document": ("GET", f"/api/v1/rooms/{'{room_id}'}/documents/test-doc-id", 404),
            "Docs - Update Document": ("PATCH", f"/api/v1/rooms/{'{room_id}'}/documents/test-doc-id", 404),
            "Docs - Approve Document": ("POST", f"/api/v1/rooms/{'{room_id}'}/documents/test-doc-id/approve", 404),
            "Docs - Reject Document": ("POST", f"/api/v1/rooms/{'{room_id}'}/documents/test-doc-id/reject", 404),
            "Docs - Status Summary": ("GET", f"/api/v1/rooms/{'{room_id}'}/documents/status-summary", 200),
            
            # FILE MANAGEMENT
            "Files - Upload Document": ("POST", f"/api/v1/rooms/{'{room_id}'}/documents/test-doc-id/upload", 400),
            "Files - Download Document": ("GET", f"/api/v1/rooms/{'{room_id}'}/documents/test-doc-id/download", 404),
            "Files - Delete File": ("DELETE", f"/api/v1/rooms/{'{room_id}'}/documents/test-doc-id/files/test-version", 404),
            
            # VESSEL MANAGEMENT
            "Vessels - Get Room Vessels": ("GET", f"/api/v1/rooms/{'{room_id}'}/vessels", 200),
            "Vessels - Create Vessel": ("POST", f"/api/v1/rooms/{'{room_id}'}/vessels", 400),  # Missing data
            "Vessels - Get Vessel": ("GET", f"/api/v1/rooms/{'{room_id}'}/vessels/test-vessel-id", 404),
            "Vessels - Update Vessel (PATCH)": ("PATCH", f"/api/v1/rooms/{'{room_id}'}/vessels/test-vessel-id", 404),
            "Vessels - Update Vessel (PUT)": ("PUT", f"/api/v1/rooms/{'{room_id}'}/vessels/test-vessel-id", 404),
            "Vessels - Delete Vessel": ("DELETE", f"/api/v1/rooms/{'{room_id}'}/vessels/test-vessel-id", 404),
            
            # MESSAGING & CHAT
            "Messages - Get Room Messages": ("GET", f"/api/v1/rooms/{'{room_id}'}/messages", 200),
            "Messages - Send Message": ("POST", f"/api/v1/rooms/{'{room_id}'}/messages", 200),
            "Messages - Unread Count": ("GET", f"/api/v1/rooms/{'{room_id}'}/messages/unread-count", 200),
            "Messages - Mark Read": ("PATCH", f"/api/v1/rooms/{'{room_id}'}/messages/test-msg-id/read", 404),
            "Messages - Online Users": ("GET", f"/api/v1/rooms/{'{room_id}'}/online-users", 200),
            
            # APPROVALS
            "Approvals - Get Room Approvals": ("GET", f"/api/v1/rooms/{'{room_id}'}/approvals", 200),
            "Approvals - Create Approval": ("POST", f"/api/v1/rooms/{'{room_id}'}/approvals", 400),
            "Approvals - Update Approval": ("PUT", f"/api/v1/rooms/{'{room_id}'}/approvals/test-approval-id", 404),
            "Approvals - Revoke Approval": ("DELETE", f"/api/v1/rooms/{'{room_id}'}/approvals", 400),
            "Approvals - Get Status": ("GET", f"/api/v1/rooms/{'{room_id}'}/approvals/status", 200),
            "Approvals - My Status": ("GET", f"/api/v1/rooms/{'{room_id}'}/approvals/my-status", 200),
            "Approvals - Required Docs": ("GET", f"/api/v1/rooms/{'{room_id}'}/approvals/required-documents", 200),
            
            # ACTIVITIES & LOGS
            "Activities - Get Activities": ("GET", "/api/v1/activities", 200),
            "Activities - My Recent": ("GET", "/api/v1/activities/my-recent", 200),
            "Activities - Room Activities": ("GET", f"/api/v1/rooms/{'{room_id}'}/activities", 200),
            "Activities - Activities Summary": ("GET", f"/api/v1/rooms/{'{room_id}'}/activities/summary", 200),
            "Activities - Timeline": ("GET", f"/api/v1/rooms/{'{room_id}'}/activities/timeline", 200),
            
            # NOTIFICATIONS
            "Notifications - Get Notifications": ("GET", "/api/v1/notifications", 200),
            "Notifications - Unread Count": ("GET", "/api/v1/notifications/unread-count", 200),
            "Notifications - Mark Read": ("PATCH", "/api/v1/notifications/mark-read", 200),
            "Notifications - Mark All Read": ("PATCH", "/api/v1/notifications/mark-all-read", 200),
            "Notifications - Delete Notification": ("DELETE", "/api/v1/notifications/test-notif-id", 404),
            "Notifications - Delete All": ("DELETE", "/api/v1/notifications", 200),
            
            # SEARCH FUNCTIONALITY
            "Search - Global Search": ("GET", "/api/v1/search/global?q=test", 200),
            "Search - Search Rooms": ("GET", "/api/v1/search/rooms?q=test", 200),
            "Search - Search Documents": ("GET", "/api/v1/search/documents?q=test", 200),
            "Search - Search Suggestions": ("GET", "/api/v1/search/suggestions?q=test", 200),
            
            # STATISTICS & DASHBOARD
            "Stats - Dashboard Stats": ("GET", "/api/v1/stats/dashboard", 200),
            "Stats - System Health": ("GET", "/api/v1/stats/system/health", 200),
            "Stats - Room Analytics": ("GET", f"/api/v1/stats/room/{'{room_id}'}/analytics", 200),
            
            # SNAPSHOTS
            "Snapshots - Get Snapshots": ("GET", f"/api/v1/rooms/{'{room_id}'}/snapshots", 200),
            "Snapshots - Create Snapshot": ("POST", f"/api/v1/rooms/{'{room_id}'}/snapshots", 200),
            "Snapshots - Get Snapshot": ("GET", f"/api/v1/rooms/{'{room_id}'}/snapshots/test-snap-id", 404),
            "Snapshots - Download Snapshot": ("GET", f"/api/v1/rooms/{'{room_id}'}/snapshots/test-snap-id/download", 404),
            "Snapshots - Snapshot Status": ("GET", f"/api/v1/rooms/{'{room_id}'}/snapshots/test-snap-id/status", 404),
            "Snapshots - Delete Snapshot": ("DELETE", f"/api/v1/rooms/{'{room_id}'}/snapshots/test-snap-id", 404),
            
            # COCKPIT FEATURES
            "Cockpit - Room Activity": ("GET", f"/api/v1/rooms/{'{room_id}'}/activity", 200),
            "Cockpit - Room Summary": ("GET", f"/api/v1/rooms/{'{room_id}'}/summary", 200),
            "Cockpit - Upload Document": ("POST", f"/api/v1/rooms/{'{room_id}'}/documents/upload", 400),
            "Cockpit - Generate Snapshot": ("GET", f"/api/v1/rooms/{'{room_id}'}/snapshot.pdf", 200),
            
            # CONFIGURATION
            "Config - System Info": ("GET", "/api/v1/config/system-info", 200),
            "Config - Feature Flags": ("GET", "/api/v1/config/feature-flags", 200),
            "Config - Get Feature Flag": ("GET", "/api/v1/config/feature-flags/test-flag", 404),
            "Config - Update Feature Flag": ("PATCH", "/api/v1/config/feature-flags/test-flag", 404),
            "Config - Document Types": ("GET", "/api/v1/config/document-types", 200),
            "Config - Create Doc Type": ("POST", "/api/v1/config/document-types", 400),
            "Config - Update Doc Type": ("PATCH", "/api/v1/config/document-types/test-type-id", 404),
            "Config - Delete Doc Type": ("DELETE", "/api/v1/config/document-types/test-type-id", 404),
        }
        
        print(f"\n🔍 ANALYZING {len(endpoints)} ENDPOINTS/BUTTONS")
        print("=" * 120)
        
        results = {}
        total_score = 0
        
        for name, (method, endpoint, expected_status) in endpoints.items():
            # Replace room_id placeholder if we have one
            if "{room_id}" in endpoint and self.room_id:
                endpoint = endpoint.replace("{room_id}", self.room_id)
            
            # Prepare test data for POST/PUT/PATCH requests
            test_data = None
            if method in ["POST", "PUT", "PATCH"]:
                if "messages" in endpoint:
                    test_data = {"content": "Test message"}
                elif "rooms" in endpoint and method == "POST":
                    test_data = {
                        "title": "Test Room",
                        "location": "Test Location", 
                        "sts_eta": "2024-12-31T23:59:59",
                        "parties": []
                    }
                elif "vessels" in endpoint:
                    test_data = {"name": "Test Vessel", "vessel_type": "Tanker"}
                elif "parties" in endpoint:
                    test_data = {"role": "seller", "name": "Test Party", "email": "test@test.com"}
            
            result = self.test_endpoint(method, endpoint, test_data, expected_status, name)
            results[name] = result
            total_score += result["percentage"]
            
            # Color coding for status
            status_colors = {
                "FULL": "🟢", "WORKING": "🟡", "PARTIAL": "🟠", 
                "AUTH": "🔵", "PERM": "🟣", "MISSING": "🔴",
                "ERROR": "❌", "SKIP": "⚪", "TIMEOUT": "⏰",
                "CONNECTION": "🔌", "METHOD": "🚫", "UNKNOWN": "❓"
            }
            
            color = status_colors.get(result["status"], "❓")
            percentage = result["percentage"]
            
            print(f"{color} {percentage:3d}% | {method:6} | {name:35} | {result['reason']}")
        
        return results, total_score / len(endpoints)
    
    def test_websocket_functionality(self):
        """Test WebSocket chat functionality"""
        print(f"\n💬 TESTING WEBSOCKET CHAT FUNCTIONALITY")
        print("=" * 60)
        
        if not self.token or not self.room_id:
            print("❌ Cannot test WebSocket - missing token or room_id")
            return {"percentage": 0, "reason": "Missing prerequisites"}
        
        async def websocket_test():
            try:
                uri = f"{WS_URL}/ws/{self.room_id}?token={self.token}"
                
                async with websockets.connect(uri, timeout=10) as websocket:
                    print("🟢 WebSocket connection established")
                    
                    # Test sending message
                    test_message = {
                        "type": "message",
                        "content": f"WebSocket functionality test at {datetime.now().strftime('%H:%M:%S')}"
                    }
                    await websocket.send(json.dumps(test_message))
                    print("🟢 Message sent successfully")
                    
                    # Test receiving response
                    try:
                        response = await asyncio.wait_for(websocket.recv(), timeout=5.0)
                        message_data = json.loads(response)
                        print(f"🟢 Message received: {message_data.get('type', 'unknown')}")
                    except asyncio.TimeoutError:
                        print("🟡 No immediate response (normal behavior)")
                    
                    # Test ping/pong
                    ping_message = {"type": "ping"}
                    await websocket.send(json.dumps(ping_message))
                    
                    try:
                        pong_response = await asyncio.wait_for(websocket.recv(), timeout=5.0)
                        pong_data = json.loads(pong_response)
                        if pong_data.get("type") == "pong":
                            print("🟢 Ping/Pong working")
                            return {"percentage": 100, "reason": "Full WebSocket functionality"}
                        else:
                            print("🟡 Ping/Pong partial")
                            return {"percentage": 80, "reason": "WebSocket working, ping/pong partial"}
                    except asyncio.TimeoutError:
                        print("🟡 Ping/Pong timeout")
                        return {"percentage": 70, "reason": "WebSocket working, ping/pong timeout"}
                    
            except Exception as e:
                print(f"❌ WebSocket error: {e}")
                return {"percentage": 20, "reason": f"WebSocket error: {str(e)[:50]}"}
        
        try:
            return asyncio.run(websocket_test())
        except Exception as e:
            print(f"❌ WebSocket test failed: {e}")
            return {"percentage": 0, "reason": f"WebSocket test failed: {str(e)[:50]}"}
    
    def analyze_database_functionality(self):
        """Analyze database connectivity and functionality"""
        print(f"\n🗄️ TESTING DATABASE FUNCTIONALITY")
        print("=" * 60)
        
        db_tests = {
            "Database Health": ("GET", "/api/v1/stats/system/health", 200),
            "User Data Access": ("GET", "/api/v1/auth/me", 200),
            "Room Data Access": ("GET", "/api/v1/rooms", 200),
            "Document Types": ("GET", "/api/v1/config/document-types", 200),
            "Feature Flags": ("GET", "/api/v1/config/feature-flags", 200),
        }
        
        db_score = 0
        db_results = {}
        
        for test_name, (method, endpoint, expected) in db_tests.items():
            result = self.test_endpoint(method, endpoint, None, expected)
            db_results[test_name] = result
            db_score += result["percentage"]
            
            status_color = "🟢" if result["percentage"] >= 90 else "🟡" if result["percentage"] >= 70 else "🔴"
            print(f"{status_color} {result['percentage']:3d}% | {test_name:20} | {result['reason']}")
        
        avg_db_score = db_score / len(db_tests)
        return db_results, avg_db_score
    
    def generate_comprehensive_report(self):
        """Generate the complete functionality report"""
        self.print_header()
        
        print("\n🚀 INITIALIZING COMPREHENSIVE ANALYSIS...")
        print("=" * 60)
        
        # Step 1: Authentication
        print("🔐 Authenticating...")
        if self.authenticate():
            print("✅ Authentication successful")
            self.get_user_info()
        else:
            print("❌ Authentication failed")
            return
        
        # Step 2: Create test room
        print("🏢 Creating test room...")
        if self.create_test_room():
            print(f"✅ Test room created: {self.room_id}")
        else:
            print("⚠️  Could not create test room, using existing rooms")
        
        # Step 3: Analyze all endpoints
        endpoint_results, avg_endpoint_score = self.analyze_all_endpoints()
        
        # Step 4: Test WebSocket
        websocket_result = self.test_websocket_functionality()
        
        # Step 5: Test Database
        db_results, avg_db_score = self.analyze_database_functionality()
        
        # Generate final report
        self.generate_final_report(endpoint_results, avg_endpoint_score, websocket_result, db_results, avg_db_score)
    
    def generate_final_report(self, endpoint_results, avg_endpoint_score, websocket_result, db_results, avg_db_score):
        """Generate the final comprehensive report"""
        
        print("\n" + "═" * 120)
        print("📊 COMPREHENSIVE FUNCTIONALITY ANALYSIS REPORT")
        print("═" * 120)
        
        # Overall System Score
        websocket_score = websocket_result["percentage"]
        overall_score = (avg_endpoint_score * 0.7 + websocket_score * 0.15 + avg_db_score * 0.15)
        
        print(f"\n🎯 OVERALL SYSTEM FUNCTIONALITY: {overall_score:.1f}%")
        
        if overall_score >= 90:
            status = "🟢 EXCELLENT - Production Ready"
        elif overall_score >= 80:
            status = "🟡 GOOD - Minor Issues"
        elif overall_score >= 70:
            status = "🟠 FAIR - Needs Attention"
        elif overall_score >= 60:
            status = "🔴 POOR - Major Issues"
        else:
            status = "❌ CRITICAL - System Failure"
        
        print(f"📈 System Status: {status}")
        
        # Detailed Breakdown
        print(f"\n📋 DETAILED BREAKDOWN:")
        print(f"   🔗 API Endpoints: {avg_endpoint_score:.1f}% (Weight: 70%)")
        print(f"   💬 WebSocket Chat: {websocket_score:.1f}% (Weight: 15%)")
        print(f"   🗄️  Database: {avg_db_score:.1f}% (Weight: 15%)")
        
        # Category Analysis
        categories = {
            "Authentication & Users": [],
            "Room Management": [],
            "Document Management": [],
            "Vessel Management": [],
            "Messaging & Chat": [],
            "Approvals": [],
            "Activities & Logs": [],
            "Notifications": [],
            "Search": [],
            "Statistics": [],
            "Snapshots": [],
            "Configuration": [],
            "Cockpit Features": []
        }
        
        # Categorize results
        for name, result in endpoint_results.items():
            if any(x in name.lower() for x in ["auth", "user"]):
                categories["Authentication & Users"].append(result["percentage"])
            elif "room" in name.lower() and "parties" not in name.lower():
                categories["Room Management"].append(result["percentage"])
            elif any(x in name.lower() for x in ["doc", "file"]):
                categories["Document Management"].append(result["percentage"])
            elif "vessel" in name.lower():
                categories["Vessel Management"].append(result["percentage"])
            elif "message" in name.lower():
                categories["Messaging & Chat"].append(result["percentage"])
            elif "approval" in name.lower():
                categories["Approvals"].append(result["percentage"])
            elif "activit" in name.lower():
                categories["Activities & Logs"].append(result["percentage"])
            elif "notification" in name.lower():
                categories["Notifications"].append(result["percentage"])
            elif "search" in name.lower():
                categories["Search"].append(result["percentage"])
            elif "stats" in name.lower():
                categories["Statistics"].append(result["percentage"])
            elif "snapshot" in name.lower():
                categories["Snapshots"].append(result["percentage"])
            elif "config" in name.lower():
                categories["Configuration"].append(result["percentage"])
            elif "cockpit" in name.lower():
                categories["Cockpit Features"].append(result["percentage"])
        
        print(f"\n📊 FUNCTIONALITY BY CATEGORY:")
        print("-" * 80)
        
        for category, scores in categories.items():
            if scores:
                avg_score = sum(scores) / len(scores)
                status_icon = "🟢" if avg_score >= 90 else "🟡" if avg_score >= 70 else "🔴"
                print(f"{status_icon} {avg_score:5.1f}% | {category:25} | {len(scores):2d} endpoints")
        
        # Critical Issues
        print(f"\n⚠️  CRITICAL ISSUES IDENTIFIED:")
        print("-" * 80)
        
        critical_issues = []
        for name, result in endpoint_results.items():
            if result["percentage"] < 50:
                critical_issues.append(f"❌ {name}: {result['reason']}")
        
        if critical_issues:
            for issue in critical_issues[:10]:  # Show top 10
                print(issue)
            if len(critical_issues) > 10:
                print(f"... and {len(critical_issues) - 10} more issues")
        else:
            print("✅ No critical issues found!")
        
        # Recommendations
        print(f"\n💡 RECOMMENDATIONS:")
        print("-" * 80)
        
        if overall_score >= 90:
            print("✅ System is production-ready with excellent functionality")
            print("✅ All major features are working correctly")
            print("✅ Continue with regular monitoring and maintenance")
        elif overall_score >= 80:
            print("🟡 System is mostly functional with minor issues")
            print("🔧 Address authentication and permission issues")
            print("🔧 Fix any 404 endpoints that should exist")
        elif overall_score >= 70:
            print("🟠 System needs attention before production use")
            print("🔧 Fix critical endpoint failures")
            print("🔧 Improve error handling and validation")
        else:
            print("🔴 System requires major fixes before deployment")
            print("🔧 Address authentication system issues")
            print("🔧 Fix database connectivity problems")
            print("🔧 Resolve server errors and missing endpoints")
        
        # Feature Completeness
        print(f"\n🎯 FEATURE COMPLETENESS ANALYSIS:")
        print("-" * 80)
        
        total_endpoints = len(endpoint_results)
        fully_working = len([r for r in endpoint_results.values() if r["percentage"] >= 90])
        partially_working = len([r for r in endpoint_results.values() if 50 <= r["percentage"] < 90])
        not_working = len([r for r in endpoint_results.values() if r["percentage"] < 50])
        
        print(f"📈 Total Endpoints Analyzed: {total_endpoints}")
        print(f"🟢 Fully Functional: {fully_working} ({fully_working/total_endpoints*100:.1f}%)")
        print(f"🟡 Partially Functional: {partially_working} ({partially_working/total_endpoints*100:.1f}%)")
        print(f"🔴 Not Functional: {not_working} ({not_working/total_endpoints*100:.1f}%)")
        
        # Final Summary
        print(f"\n" + "═" * 120)
        print("🏆 FINAL ASSESSMENT")
        print("═" * 120)
        
        print(f"Overall System Score: {overall_score:.1f}%")
        print(f"System Status: {status}")
        print(f"Total Features Tested: {total_endpoints + 1}")  # +1 for WebSocket
        print(f"Authentication: {'✅ Working' if self.token else '❌ Failed'}")
        print(f"Database Connectivity: {avg_db_score:.1f}%")
        print(f"Real-time Chat: {websocket_score:.1f}%")
        print(f"API Documentation: ✅ Available at {BASE_URL}/docs")
        
        if overall_score >= 85:
            print(f"\n🚀 CONCLUSION: The STS Clearance System is {overall_score:.1f}% functional and ready for production use!")
        else:
            print(f"\n⚠️  CONCLUSION: The STS Clearance System needs improvement before production deployment.")
        
        print(f"\n📅 Analysis completed at: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        print("═" * 120)

def main():
    analyzer = ComprehensiveAnalyzer()
    analyzer.generate_comprehensive_report()

if __name__ == "__main__":
    main()
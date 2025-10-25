#!/usr/bin/env python3
"""
Test document GET endpoint after fixing file_url issues
"""
import asyncio
import httpx
import json
from pathlib import Path

# Server URL
API_URL = "http://localhost:8001/api/v1"

# Test credentials
TEST_USER = "admin@sts.com"
TEST_PASSWORD = "admin123"


async def test_document_retrieval():
    """Test the document retrieval flow"""
    
    async with httpx.AsyncClient() as client:
        try:
            # Step 1: Login
            print("🔐 Logging in...")
            login_response = await client.post(
                f"{API_URL}/auth/login",
                json={"email": TEST_USER, "password": TEST_PASSWORD}
            )
            
            if login_response.status_code != 200:
                print(f"❌ Login failed: {login_response.status_code}")
                print(login_response.text)
                return
            
            login_data = login_response.json()
            token = login_data.get("token") or login_data.get("access_token")
            headers = {"Authorization": f"Bearer {token}"}
            print(f"✅ Logged in as {TEST_USER}")
            
            # Step 2: Get list of rooms
            print("\n📋 Getting list of rooms...")
            rooms_response = await client.get(
                f"{API_URL}/rooms",
                headers=headers
            )
            
            if rooms_response.status_code != 200:
                print(f"❌ Failed to get rooms: {rooms_response.status_code}")
                print(rooms_response.text)
                return
            
            rooms = rooms_response.json()
            print(f"✅ Got {len(rooms)} rooms")
            
            if not rooms:
                print("❌ No rooms available")
                return
            
            room_id = rooms[0]["id"]
            print(f"  Using room: {room_id}")
            
            # Step 3: Get documents for this room
            print("\n📄 Getting documents for room...")
            docs_response = await client.get(
                f"{API_URL}/rooms/{room_id}/documents",
                headers=headers
            )
            
            if docs_response.status_code != 200:
                print(f"❌ Failed to get documents: {docs_response.status_code}")
                print(docs_response.text)
                return
            
            documents = docs_response.json()
            print(f"✅ Got {len(documents)} documents")
            
            if not documents:
                print("⚠️  No documents in this room, trying another...")
                for room in rooms[1:]:
                    room_id = room["id"]
                    docs_response = await client.get(
                        f"{API_URL}/rooms/{room_id}/documents",
                        headers=headers
                    )
                    if docs_response.status_code == 200:
                        documents = docs_response.json()
                        if documents:
                            print(f"✅ Found {len(documents)} documents in room {room_id}")
                            break
                
                if not documents:
                    print("❌ No documents found in any room")
                    return
            
            # Step 4: Get individual document
            doc_id = documents[0]["id"]
            print(f"\n🔍 Getting document details: {doc_id}")
            doc_response = await client.get(
                f"{API_URL}/rooms/{room_id}/documents/{doc_id}",
                headers=headers
            )
            
            if doc_response.status_code != 200:
                print(f"❌ Failed to get document: {doc_response.status_code}")
                print(f"Response: {doc_response.text}")
                return
            
            doc = doc_response.json()
            print(f"✅ Got document details:")
            print(f"  ID: {doc['id']}")
            print(f"  Type: {doc['type_code']} ({doc['type_name']})")
            print(f"  Status: {doc['status']}")
            print(f"  File URL: {doc['file_url']}")
            print(f"  Uploaded by: {doc['uploaded_by']}")
            print(f"  Criticality: {doc['criticality']}")
            
            print("\n✅ All tests passed! Document retrieval is working correctly.")
            
        except Exception as e:
            print(f"❌ Error: {type(e).__name__}: {e}")
            import traceback
            traceback.print_exc()


if __name__ == "__main__":
    asyncio.run(test_document_retrieval())
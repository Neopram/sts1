import sys
import io
if sys.platform == 'win32':
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8', errors='replace')
#!/usr/bin/env python3
"""Test the actual API endpoint"""

import asyncio
import requests
import json

async def test_api():
    # First, login to get a token
    login_data = {
        "email": "admin@sts.com",
        "password": "admin123"
    }
    
    print("1️⃣ Logging in...")
    login_response = requests.post(
        "http://localhost:8001/api/v1/auth/login",
        json=login_data
    )
    
    if login_response.status_code != 200:
        print(f"❌ Login failed: {login_response.status_code}")
        print(login_response.text)
        return
    
    token_data = login_response.json()
    token = token_data.get("access_token") or token_data.get("token")
    if not token:
        print(f"❌ No token received: {token_data}")
        return
    print(f"✅ Login successful, token: {token[:20]}...")
    
    # Get documents
    print("\n2️⃣ Fetching documents...")
    room_id = "4864508d-8f7e-4bf7-bf02-dc1fdb0746b4"
    headers = {"Authorization": f"Bearer {token}"}
    
    docs_response = requests.get(
        f"http://localhost:8001/api/v1/rooms/{room_id}/documents",
        headers=headers
    )
    
    if docs_response.status_code != 200:
        print(f"❌ Get documents failed: {docs_response.status_code}")
        print(docs_response.text)
        return
    
    docs = docs_response.json()
    print(f"✅ Documents fetched: {len(docs)} documents found")
    
    for doc in docs:
        print(f"\n  📄 Document: {doc.get('type_code')}")
        print(f"     ID: {doc.get('id')[:8]}...")
        print(f"     Status: {doc.get('status')}")
        print(f"     File URL: {doc.get('file_url')}")
    
    if len(docs) > 0:
        print("\n✅ SUCCESS! API returns documents correctly!")
    else:
        print("\n❌ FAIL! API returned empty list")

if __name__ == "__main__":
    asyncio.run(test_api())
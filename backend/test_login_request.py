#!/usr/bin/env python
"""
Test the login endpoint to verify backend is working
"""
import asyncio
import aiohttp
import json

async def test_login():
    print("=== TESTING LOGIN ENDPOINT ===\n")
    
    url = "http://localhost:8001/api/v1/auth/login"
    payload = {
        "email": "admin@sts.com",
        "password": "password123"
    }
    
    print(f"POST {url}")
    print(f"Payload: {json.dumps(payload, indent=2)}\n")
    
    try:
        async with aiohttp.ClientSession() as session:
            async with session.post(url, json=payload) as resp:
                print(f"Status: {resp.status}")
                
                try:
                    data = await resp.json()
                    print(f"Response: {json.dumps(data, indent=2)}")
                    
                    if resp.status == 200:
                        print("\n✅ LOGIN SUCCESSFUL!")
                        print(f"   Token: {data.get('token', 'N/A')[:50]}...")
                        return True
                    else:
                        print(f"\n❌ Login failed with status {resp.status}")
                        return False
                except Exception as e:
                    text = await resp.text()
                    print(f"Response: {text}")
                    print(f"\n❌ Error parsing response: {e}")
                    return False
                    
    except Exception as e:
        print(f"❌ Error connecting to backend: {e}")
        print("   Make sure backend is running on http://localhost:8001")
        return False

if __name__ == "__main__":
    success = asyncio.run(test_login())
    exit(0 if success else 1)
#!/usr/bin/env python
"""
Diagnostic script to test login and see detailed error messages
"""
import sys
import io
if sys.platform == 'win32':
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8', errors='replace')

import asyncio
import aiohttp
import json

async def test_login_diagnostic():
    print("=" * 70)
    print("🔍 LOGIN DIAGNOSTIC TEST")
    print("=" * 70)
    
    url = "http://localhost:8001/api/v1/auth/login"
    test_cases = [
        {"email": "admin@sts.com", "password": "password123"},
        {"email": "admin@sts.com", "password": ""},
        {"email": "nonexistent@sts.com", "password": "password123"},
    ]
    
    for i, payload in enumerate(test_cases, 1):
        print(f"\n📋 Test Case {i}: {payload['email']}")
        print("-" * 70)
        
        try:
            async with aiohttp.ClientSession() as session:
                async with session.post(url, json=payload) as resp:
                    status = resp.status
                    print(f"Status Code: {status}")
                    
                    try:
                        data = await resp.json()
                        print(f"Response JSON:")
                        print(json.dumps(data, indent=2))
                        
                        if status == 200:
                            print("✅ SUCCESS - Token received!")
                            if 'token' in data:
                                print(f"   Token: {data['token'][:50]}...")
                            if 'email' in data:
                                print(f"   Email: {data['email']}")
                            if 'role' in data:
                                print(f"   Role: {data['role']}")
                        else:
                            print(f"❌ ERROR - Status {status}")
                            if 'detail' in data:
                                detail = data['detail']
                                print(f"   Error Detail: {detail}")
                                # Show first 500 chars of detailed error
                                if len(detail) > 500:
                                    print(f"   (Full error: {len(detail)} characters)")
                                    print(f"   First 500 chars: {detail[:500]}")
                    except Exception as json_error:
                        text = await resp.text()
                        print(f"Response Text (not JSON):")
                        print(text[:1000])
                        print(f"\n⚠️ Could not parse as JSON: {json_error}")
                        
        except aiohttp.ClientConnectorError as e:
            print(f"❌ Connection Error: {e}")
            print("   → Backend server is NOT running on http://localhost:8001")
            print("   → Please start the backend server first!")
            return
        except Exception as e:
            print(f"❌ Unexpected Error: {e}")
            import traceback
            traceback.print_exc()
    
    print("\n" + "=" * 70)
    print("📝 DIAGNOSTIC COMPLETE")
    print("=" * 70)
    print("\n💡 If you see 500 errors, check the backend server console logs")
    print("   for detailed error messages starting with [LOGIN]")

if __name__ == "__main__":
    asyncio.run(test_login_diagnostic())


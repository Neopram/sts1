import asyncio
import json
import httpx

async def test_login():
    async with httpx.AsyncClient() as client:
        # Test login endpoint directly
        url = "http://localhost:8000/api/v1/auth/login"
        payload = {
            "email": "test@sts.com",
            "password": "test123"
        }
        
        print(f"Testing login at: {url}")
        print(f"Payload: {json.dumps(payload)}")
        
        try:
            response = await client.post(url, json=payload)
            print(f"Status: {response.status_code}")
            print(f"Response: {response.text}")
            
            if response.status_code == 200:
                data = response.json()
                print(f"✓ Login successful!")
                print(f"  Token: {data.get('token', 'N/A')[:50]}...")
                print(f"  Email: {data.get('email')}")
                print(f"  Role: {data.get('role')}")
            else:
                print(f"✗ Login failed with status {response.status_code}")
                
        except Exception as e:
            print(f"Error: {e}")

if __name__ == "__main__":
    asyncio.run(test_login())
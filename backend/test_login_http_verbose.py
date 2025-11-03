"""Test login endpoint with verbose output"""
import requests
import json
import time

# Give backend time to fully start
time.sleep(1)

url = "http://localhost:8001/api/v1/auth/login"
payload = {
    "email": "admin@sts.com",
    "password": "password123"
}

print("=" * 60)
print("🔐 LOGIN TEST - VERBOSE OUTPUT")
print("=" * 60)
print(f"\nURL: {url}")
print(f"Payload: {json.dumps(payload, indent=2)}\n")

try:
    print("📤 Sending request...")
    response = requests.post(url, json=payload, timeout=10)
    
    print(f"Status: {response.status_code}")
    print(f"\nHeaders:")
    for k, v in response.headers.items():
        print(f"  {k}: {v}")
    
    print(f"\nResponse Body:")
    try:
        body = response.json()
        print(json.dumps(body, indent=2))
    except:
        print(response.text)
    
    # Check for detailed error
    if response.status_code >= 400:
        print(f"\n❌ Error!")
        print(f"   Status Code: {response.status_code}")
        if "detail" in response.json():
            print(f"   Detail: {response.json()['detail']}")
    else:
        print(f"\n✅ Success!")
        
except requests.exceptions.ConnectionError as e:
    print(f"❌ Connection Error: {e}")
    print("   Make sure backend is running on http://localhost:8001")
except Exception as e:
    print(f"❌ Error: {e}")
import requests
import json

# Test login
url = "http://localhost:8001/api/v1/auth/login"
data = {
    "email": "admin@sts.com",
    "password": "password123"
}

print(f"Testing login at {url}")
print(f"Payload: {json.dumps(data, indent=2)}")

try:
    response = requests.post(url, json=data, timeout=5)
    print(f"\nStatus Code: {response.status_code}")
    print(f"Response:\n{json.dumps(response.json(), indent=2)}")
except Exception as e:
    print(f"\nError: {e}")
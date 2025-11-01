import requests
import json
import sys
import io
if sys.platform == 'win32':
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8', errors='replace')

# Prueba de login
print("🔐 Probando login con admin@sts.com / password123...")
print("=" * 60)

try:
    response = requests.post(
        'http://localhost:8001/api/v1/auth/login',
        json={
            'email': 'admin@sts.com',
            'password': 'password123'
        },
        timeout=5
    )
    
    print(f"Status Code: {response.status_code}")
    print(f"Response: {json.dumps(response.json(), indent=2)}")
    
    if response.status_code == 200:
        data = response.json()
        if 'token' in data or 'access_token' in data:
            print("\n✅ LOGIN EXITOSO!")
            token = data.get('token') or data.get('access_token')
            print(f"✅ Token: {token[:50]}...")
            print(f"✅ Role: {data.get('role', 'N/A')}")
            print(f"✅ Email: {data.get('email', 'N/A')}")
            print(f"✅ Name: {data.get('name', 'N/A')}")
        else:
            print("\n⚠️ Response sin token")
    else:
        print(f"\n❌ Error en login: {response.status_code}")
        
except Exception as e:
    print(f"❌ Error de conexión: {e}")
    print("Esperando a que el servidor esté listo...")

print("=" * 60)
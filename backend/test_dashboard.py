import requests
import json
import sys
import io
if sys.platform == 'win32':
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8', errors='replace')

print("🔐 Obteniendo token...")
print("=" * 60)

# Obtener token
login_response = requests.post(
    'http://localhost:8001/api/v1/auth/login',
    json={
        'email': 'admin@sts.com',
        'password': 'password123'
    },
    timeout=5
)

if login_response.status_code != 200:
    print("❌ Error en login")
    exit(1)

token = login_response.json()['token']
print(f"✅ Token obtenido: {token[:40]}...")

# Headers con token
headers = {
    'Authorization': f'Bearer {token}',
    'Content-Type': 'application/json'
}

# Probar endpoint del dashboard
print("\n📊 Probando endpoint /api/v1/dashboard/my-dashboard...")
print("=" * 60)

try:
    response = requests.get(
        'http://localhost:8001/api/v1/dashboard/my-dashboard',
        headers=headers,
        timeout=5
    )
    
    print(f"Status Code: {response.status_code}")
    
    if response.status_code == 200:
        data = response.json()
        print("✅ DASHBOARD DATA RECIBIDO!")
        print(json.dumps(data, indent=2)[:500] + "...")
    else:
        print(f"❌ Error: {response.status_code}")
        print(json.dumps(response.json(), indent=2))
        
except Exception as e:
    print(f"❌ Error de conexión: {e}")

# Probar endpoint admin stats
print("\n\n📈 Probando endpoint /api/v1/dashboard/admin/stats...")
print("=" * 60)

try:
    response = requests.get(
        'http://localhost:8001/api/v1/dashboard/admin/stats',
        headers=headers,
        timeout=5
    )
    
    print(f"Status Code: {response.status_code}")
    
    if response.status_code == 200:
        data = response.json()
        print("✅ ADMIN STATS RECIBIDO!")
        print(json.dumps(data, indent=2))
    else:
        print(f"❌ Error: {response.status_code}")
        print(json.dumps(response.json(), indent=2))
        
except Exception as e:
    print(f"❌ Error de conexión: {e}")

print("\n" + "=" * 60)
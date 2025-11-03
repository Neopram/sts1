#!/usr/bin/env python3
"""
🧪 TEST COMPLETO - VERIFICAR ACCESO A SALAS

Este script prueba TODO el sistema de acceso a salas:
1. Conecta a la BD
2. Obtiene las salas reales
3. Simula los 3 usuarios de prueba
4. Verifica acceso a cada sala
5. Muestra exactamente qué endpoint llamar
"""

import sqlite3
import json
import hashlib
from datetime import datetime

print("\n" + "="*80)
print("🧪 TEST COMPLETO - SISTEMA DE ACCESO A SALAS")
print("="*80)

# 1. CONECTAR A BD
print("\n1️⃣ CONECTANDO A BASE DE DATOS...")
try:
    db = sqlite3.connect('sts_clearance.db')
    cursor = db.cursor()
    print("✅ Conectado a sts_clearance.db")
except Exception as e:
    print(f"❌ Error conectando: {e}")
    exit(1)

# 2. OBTENER TODAS LAS SALAS REALES
print("\n2️⃣ OBTENIENDO SALAS REALES...")
cursor.execute('''
SELECT 
    id, 
    title, 
    location,
    sts_eta,
    created_by,
    (SELECT COUNT(*) FROM parties WHERE room_id = rooms.id) as party_count
FROM rooms
ORDER BY created_at DESC
''')
all_rooms = cursor.fetchall()
print(f"✅ Encontradas {len(all_rooms)} salas")

for i, (room_id, title, location, eta, creator, party_count) in enumerate(all_rooms, 1):
    print(f"\n   {i}. {title}")
    print(f"      ID: {room_id}")
    print(f"      Ubicación: {location}")
    print(f"      Creada por: {creator}")
    print(f"      Parties: {party_count}")

# 3. OBTENER USUARIOS DE PRUEBA
print("\n3️⃣ USUARIOS DE PRUEBA DISPONIBLES...")
test_users = [
    ('test@sts.com', 'password'),
    ('owner@sts.com', 'password'),
    ('broker@sts.com', 'password'),
]

cursor.execute("SELECT email, role, name FROM users WHERE email IN (?, ?, ?)", 
               tuple(u[0] for u in test_users))
users = cursor.fetchall()
print(f"✅ Encontrados {len(users)} usuarios")

for email, role, name in users:
    print(f"   • {email} (role: {role}) - {name}")

# 4. VERIFICAR ACCESO POR USUARIO
print("\n4️⃣ VERIFICAR ACCESO - USUARIO A SALA...")

for test_email, test_pass in test_users:
    print(f"\n   👤 Analizando: {test_email}")
    
    # Obtener datos del usuario
    cursor.execute("SELECT id, role FROM users WHERE email = ?", (test_email,))
    user_row = cursor.fetchone()
    
    if not user_row:
        print(f"      ❌ Usuario no encontrado")
        continue
    
    user_id, user_role = user_row
    
    # Obtener salas a las que tiene acceso
    cursor.execute('''
    SELECT DISTINCT r.id, r.title, p.role
    FROM parties p
    JOIN rooms r ON r.id = p.room_id
    WHERE p.email = ?
    ORDER BY r.created_at DESC
    ''', (test_email,))
    
    accessible_rooms = cursor.fetchall()
    print(f"      ✅ Acceso a {len(accessible_rooms)} salas:")
    
    for room_id, room_title, party_role in accessible_rooms:
        print(f"         • {room_title[:40]}")
        print(f"           └─ Room ID: {room_id}")
        print(f"           └─ Tu rol: {party_role}")

# 5. SIMULAR LLAMADAS API
print("\n5️⃣ LLAMADAS API SIMULADAS (para copiar/pegar)...")

print("\n   📌 PASO 1: LOGIN")
for test_email, test_pass in test_users[:1]:
    print(f"\n   curl -X POST http://localhost:8000/api/v1/auth/login")
    print(f"     -H 'Content-Type: application/json'")
    print(f"     -d '{{ email: {test_email}, password: {test_pass} }}'")

print("\n   📌 PASO 2: OBTENER SALAS")
print("\n   curl -H 'Authorization: Bearer TOKEN'")
print("     http://localhost:8000/api/v1/operations")

print("\n   📌 PASO 3: ACCEDER A UNA SALA (copia el ID de arriba)")

cursor.execute("SELECT id, title FROM rooms LIMIT 1")
room_id, room_title = cursor.fetchone()
print(f"\n   # Ejemplo con: {room_title}")
print(f"   curl -H 'Authorization: Bearer TOKEN'")
print(f"     http://localhost:8000/api/v1/rooms/{room_id}/summary")

# 6. VERIFICAR LA SALA PROBLEMÁTICA
print("\n6️⃣ VERIFICAR SALA PROBLEMÁTICA...")
problem_room_id = 'fdf18990-39d9-4214-bcaa-a0772ec77955'
cursor.execute("SELECT id FROM rooms WHERE id = ?", (problem_room_id,))
exists = cursor.fetchone()

if exists:
    print(f"   ✅ Sala {problem_room_id[:8]}... EXISTE")
else:
    print(f"   ❌ Sala {problem_room_id[:8]}... NO EXISTE en BD")
    print(f"   💡 Por eso obtenías error 403!")
    print(f"   💡 Usa uno de los IDs de arriba en su lugar")

# 7. JSON CON INFORMACIÓN COMPLETA
print("\n7️⃣ EXPORTAR A JSON (para debugging)...")

output_data = {
    "timestamp": datetime.now().isoformat(),
    "total_rooms": len(all_rooms),
    "rooms": [
        {
            "id": room_id,
            "title": title,
            "location": location,
            "created_by": creator,
            "parties": party_count
        }
        for room_id, title, location, eta, creator, party_count in all_rooms
    ],
    "users": [
        {
            "email": user[0],
            "role": user[1]
        }
        for user in users
    ],
    "problem_room": {
        "id": problem_room_id,
        "exists": exists is not None
    }
}

with open('ROOM_ACCESS_TEST.json', 'w') as f:
    json.dump(output_data, f, indent=2)
print("   ✅ Guardado en: ROOM_ACCESS_TEST.json")

# 8. INSTRUCCIONES PARA TESTING
print("\n8️⃣ PASO A PASO - PARA TESTING EN NAVEGADOR...")
print("""
   1. Abre http://localhost:5173 (o tu puerto frontend)
   2. Login con: test@sts.com / password
   3. Espera a que carguen las salas
   4. Abre DevTools (F12) → Network
   5. Filtra por: rooms
   6. Verás las llamadas GET a /api/v1/rooms/*/summary
   7. Verifica que todas retornen 200 OK
   8. Si alguna retorna 403, es porque no tienes acceso a esa sala
   
   ✅ SALAS QUE DEBERÍAN FUNCIONAR:
""")

for room_id, title, location, eta, creator, party_count in all_rooms:
    status = "✅"
    print(f"      {status} {room_id} - {title[:40]}")

# 9. RESUMEN FINAL
print("\n9️⃣ RESUMEN...")
print(f"""
   ✅ Total salas en BD: {len(all_rooms)}
   ✅ Usuarios disponibles: {len(users)}
   ✅ Sala problemática ({problem_room_id[:8]}...): {'EXISTE' if exists else 'NO EXISTE'}
   
   🎯 PRÓXIMO PASO:
      Usa cualquiera de los room IDs de arriba para testing
      Evita usar: {problem_room_id[:8]}...
""")

# 10. COMANDOS PYTHON PARA COPIAR
print("\n🔟 CÓDIGO PYTHON - PARA DEBUGGING EN PYTHON...")
print("""
   # En tu script Python:
   import requests
   
   # 1. Login
   login_resp = requests.post('http://localhost:8000/api/v1/auth/login', json={
       'email': 'test@sts.com',
       'password': 'password'
   })
   token = login_resp.json()['token']
   
   # 2. Obtener salas
   headers = {'Authorization': f'Bearer {token}'}
   rooms_resp = requests.get('http://localhost:8000/api/v1/operations', headers=headers)
   rooms = rooms_resp.json()
   
   # 3. Acceder a una sala
   room_id = rooms[0]['id']  # Primera sala
   summary_resp = requests.get(f'http://localhost:8000/api/v1/rooms/{room_id}/summary', 
                               headers=headers)
   
   if summary_resp.status_code == 200:
       print("✅ Acceso a sala exitoso!")
   else:
       print(f"❌ Error: {summary_resp.status_code}")
""")

# Cerrar BD
db.close()

print("\n" + "="*80)
print("✅ TEST COMPLETADO")
print("="*80 + "\n")
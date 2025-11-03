import sqlite3
import json

db = sqlite3.connect('sts_clearance.db')
cursor = db.cursor()

print("=" * 80)
print("🔍 DIAGNÓSTICO COMPLETO DEL SISTEMA")
print("=" * 80)

# 1. Total de salas
cursor.execute('SELECT COUNT(*) FROM rooms')
total_rooms = cursor.fetchone()[0]
print(f"\n1️⃣ TOTAL DE SALAS EN LA BD: {total_rooms}")

# 2. Salas disponibles
print("\n2️⃣ SALAS DISPONIBLES:")
cursor.execute('''
SELECT 
    id, 
    title, 
    created_by, 
    (SELECT COUNT(*) FROM parties WHERE room_id = rooms.id) as party_count
FROM rooms
ORDER BY created_at DESC
LIMIT 10
''')
rooms = cursor.fetchall()
for i, r in enumerate(rooms, 1):
    print(f"   {i}. [{r[0][:8]}...] '{r[1]}' (Creada por: {r[2]}, Parties: {r[3]})")

# 3. Usuarios del sistema
print("\n3️⃣ USUARIOS EN EL SISTEMA:")
cursor.execute('SELECT email, role, name FROM users ORDER BY email')
users = cursor.fetchall()
for u in users:
    print(f"   • {u[0]:<30} | Role: {u[1]:<12} | {u[2]}")

# 4. La sala "problema"
problem_room_id = 'fdf18990-39d9-4214-bcaa-a0772ec77955'
print(f"\n4️⃣ SALA ESPECÍFICA: {problem_room_id}")
cursor.execute('SELECT id FROM rooms WHERE id = ?', (problem_room_id,))
exists = cursor.fetchone()
if exists:
    print("   ✅ LA SALA EXISTE")
    cursor.execute('''
    SELECT 
        id, title, created_by,
        (SELECT COUNT(*) FROM parties WHERE room_id = rooms.id) as party_count
    FROM rooms 
    WHERE id = ?
    ''', (problem_room_id,))
    r = cursor.fetchone()
    print(f"      • Creada por: {r[2]}")
    print(f"      • Parties: {r[3]}")
    
    if r[3] > 0:
        cursor.execute('''
        SELECT role, email, name 
        FROM parties 
        WHERE room_id = ?
        ORDER BY role
        ''', (problem_room_id,))
        parties = cursor.fetchall()
        for p in parties:
            print(f"        - {p[1]:<30} ({p[0]})")
else:
    print("   ❌ LA SALA NO EXISTE EN LA BD")

# 5. Relaciones de cada usuario
print("\n5️⃣ ROOMS ACCESIBLES POR CADA USUARIO:")
for u in users:
    user_email = u[0]
    cursor.execute('''
    SELECT COUNT(DISTINCT p.room_id)
    FROM parties p
    WHERE p.email = ?
    ''', (user_email,))
    count = cursor.fetchone()[0]
    print(f"   • {user_email:<30} accede a: {count} salas")
    if count > 0:
        cursor.execute('''
        SELECT DISTINCT r.id, r.title, p.role
        FROM parties p
        JOIN rooms r ON r.id = p.room_id
        WHERE p.email = ?
        ORDER BY r.created_at DESC
        ''', (user_email,))
        rooms_user = cursor.fetchall()
        for r in rooms_user:
            print(f"      - [{r[0][:8]}...] '{r[1][:40]}' ({r[2]})")

db.close()

print("\n" + "=" * 80)
print("💡 CONCLUSIÓN:")
print("=" * 80)
print("""
Si la sala fdf18990-39d9-4214-bcaa-a0772ec77955 NO EXISTE:
  → El error 403 es incorrecto (debería ser 404)
  → El usuario intenta acceder a una sala que fue borrada o nunca existió
  → El ID podría estar hardcodeado en el frontend

Si la sala EXISTE pero está vacía (sin parties):
  → El usuario no tiene acceso legítimo
  → El sistema está funcionando correctamente rechazando acceso
  → Necesita ser agregado como party o la sala necesita DEBUG=true

RECOMENDACIÓN:
  Verifica el frontend para saber de dónde sale ese room_id
""")
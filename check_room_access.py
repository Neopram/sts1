import sqlite3

db = sqlite3.connect('sts_clearance.db')
cursor = db.cursor()

print('=== SALAS EN LA BD ===')
cursor.execute('SELECT id, title, created_by FROM rooms LIMIT 5')
rooms = cursor.fetchall()
for r in rooms:
    print(f'ID: {r[0][:8]}... | Title: {r[1][:30] if r[1] else "N/A":<30} | Creator: {r[2]}')

room_id = 'fdf18990-39d9-4214-bcaa-a0772ec77955'
print(f'\n=== PARTIES EN LA SALA {room_id[:8]}... ===')
cursor.execute('SELECT role, name, email FROM parties WHERE room_id = ?', (room_id,))
parties = cursor.fetchall()
if parties:
    for p in parties:
        print(f'  Role: {p[0]:<10} | Name: {p[1]:<20} | Email: {p[2]}')
else:
    print('  ❌ NO PARTIES ENCONTRADAS EN ESTA SALA')

print('\n=== SALA ESPECÍFICA ===')
cursor.execute('SELECT id, title, created_by FROM rooms WHERE id = ?', (room_id,))
room = cursor.fetchone()
if room:
    print(f'  Creada por: {room[2]}')
    print(f'  Título: {room[1]}')
else:
    print('  ❌ SALA NO ENCONTRADA')

print('\n=== USUARIOS EN LA BD ===')
cursor.execute('SELECT email, role, name FROM users LIMIT 5')
users = cursor.fetchall()
for u in users:
    print(f'  Email: {u[0]:<25} | Role: {u[1]:<10} | Name: {u[2]}')

db.close()
print('\n✅ Análisis completo')
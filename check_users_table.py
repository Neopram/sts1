import sqlite3

conn = sqlite3.connect('backend/sts_clearance.db')
cursor = conn.cursor()
cursor.execute('SELECT id, email, password_hash FROM users')
users = cursor.fetchall()
print('=== USUARIOS EN BD ===')
print(f'Total de usuarios: {len(users)}')
for user in users:
    print(f'ID: {user[0]}, Email: {user[1]}, Hash: {user[2][:20] if user[2] else "None"}...')
conn.close()
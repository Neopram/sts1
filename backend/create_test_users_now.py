import sys
import io
if sys.platform == 'win32':
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8', errors='replace')
#!/usr/bin/env python3
"""Create test users for login"""
import sqlite3
import uuid
from passlib.hash import bcrypt
from datetime import datetime

db_path = 'sts_clearance.db'
conn = sqlite3.connect(db_path)
cursor = conn.cursor()

print("=" * 60)
print("🔨 Creando usuarios de prueba")
print("=" * 60)

# Test users
test_users = [
    {
        'email': 'admin@sts.com',
        'password': 'admin123',
        'name': 'Admin User',
        'role': 'admin'
    },
    {
        'email': 'buyer@sts.com',
        'password': 'buyer123',
        'name': 'Buyer User',
        'role': 'buyer'
    },
    {
        'email': 'seller@sts.com',
        'password': 'seller123',
        'name': 'Seller User',
        'role': 'seller'
    },
]

for user_data in test_users:
    user_id = str(uuid.uuid4())
    # Hash password
    password_hash = bcrypt.hash(user_data['password'])
    
    try:
        cursor.execute(
            """
            INSERT INTO users (id, email, name, role, password_hash, created_at, is_active)
            VALUES (?, ?, ?, ?, ?, ?, ?)
            """,
            (user_id, user_data['email'], user_data['name'], user_data['role'], password_hash, datetime.now().isoformat(), 1)
        )
        print(f"✅ Usuario creado: {user_data['email']} / password: {user_data['password']}")
    except Exception as e:
        print(f"❌ Error creando usuario {user_data['email']}: {e}")

conn.commit()

# Verify
print("\n📊 Usuarios en la BD después de la creación:")
cursor.execute("SELECT email, name, role FROM users")
users = cursor.fetchall()
for user in users:
    print(f"  ✓ {user[0]} | {user[1]} | Role: {user[2]}")

conn.close()
print("\n✅ Usuarios creados exitosamente")
print("=" * 60)
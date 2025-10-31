#!/usr/bin/env python3
"""Create all demo test users for the STS Clearance Hub login page"""
import sqlite3
import uuid
from passlib.hash import bcrypt
from datetime import datetime

db_path = 'sts_clearance.db'
conn = sqlite3.connect(db_path)
cursor = conn.cursor()

print("=" * 70)
print("🔨 Setting up all demo test users")
print("=" * 70)

# Test users matching LoginPage.tsx DEMO_USERS
test_users = [
    {
        'email': 'admin@sts.com',
        'password': 'password123',
        'name': 'Admin User',
        'role': 'admin'
    },
    {
        'email': 'broker@sts.com',
        'password': 'password123',
        'name': 'Broker User',
        'role': 'broker'
    },
    {
        'email': 'owner@sts.com',
        'password': 'password123',
        'name': 'Owner User',
        'role': 'owner'
    },
    {
        'email': 'seller@sts.com',
        'password': 'password123',
        'name': 'Seller User',
        'role': 'seller'
    },
    {
        'email': 'buyer@sts.com',
        'password': 'password123',
        'name': 'Buyer User',
        'role': 'buyer'
    },
    {
        'email': 'charterer@sts.com',
        'password': 'password123',
        'name': 'Charterer User',
        'role': 'charterer'
    },
    {
        'email': 'viewer@sts.com',
        'password': 'password123',
        'name': 'Viewer User',
        'role': 'viewer'
    },
]

# First, delete existing demo users to avoid conflicts
for user in test_users:
    cursor.execute("DELETE FROM users WHERE email = ?", (user['email'],))

conn.commit()

# Create all users
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
        print(f"✅ Created: {user_data['email']:25} | Role: {user_data['role']:12} | Password: {user_data['password']}")
    except Exception as e:
        print(f"❌ Error creating {user_data['email']}: {e}")

conn.commit()

# Verify
print("\n📊 All users in database:")
cursor.execute("SELECT email, name, role, is_active FROM users ORDER BY created_at DESC LIMIT 10")
users = cursor.fetchall()
for user in users:
    status = "✓ Active" if user[3] else "✗ Inactive"
    print(f"  {user[0]:25} | {user[1]:20} | Role: {user[2]:12} | {status}")

conn.close()
print("\n" + "=" * 70)
print("✅ Demo users setup complete!")
print("=" * 70)
print("\n🔐 You can now login with any of these demo accounts:")
for user in test_users:
    print(f"   Email: {user['email']:25} Password: {user['password']}")
print("\n" + "=" * 70)
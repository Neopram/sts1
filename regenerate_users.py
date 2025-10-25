#!/usr/bin/env python3
"""
Regenerate test users with correct bcrypt hashing using passlib
"""

import sqlite3
import sys
sys.path.insert(0, 'backend')

from passlib.hash import bcrypt

# Datos de usuarios con sus contraseñas
users = [
    {'email': 'admin@sts.com', 'password': 'admin123'},
    {'email': 'owner@sts.com', 'password': 'owner123'},
    {'email': 'charterer@sts.com', 'password': 'charterer123'},
    {'email': 'broker@sts.com', 'password': 'broker123'},
    {'email': 'viewer@sts.com', 'password': 'viewer123'},
    {'email': 'test@sts.com', 'password': 'test123'},
    {'email': 'buyer@sts.com', 'password': 'buyer123'},
    {'email': 'seller@sts.com', 'password': 'seller123'},
]

conn = sqlite3.connect('backend/sts_clearance.db')
cursor = conn.cursor()

print("🔄 Regenerating user password hashes with passlib.bcrypt...")

for user_data in users:
    email = user_data['email']
    password = user_data['password']
    
    # Create hash using passlib bcrypt (same as used in auth.py)
    new_hash = bcrypt.hash(password)
    
    print(f"\n📧 {email}")
    print(f"  Old hash: (checking...)")
    
    # Get current user
    cursor.execute('SELECT password_hash FROM users WHERE email = ?', (email,))
    result = cursor.fetchone()
    
    if result:
        old_hash = result[0]
        print(f"  Old: {old_hash[:30]}...")
        
        # Update with new hash
        cursor.execute('UPDATE users SET password_hash = ? WHERE email = ?', (new_hash, email))
        print(f"  New: {new_hash[:30]}...")
        print(f"  ✓ Updated")
        
        # Verify the new hash works
        try:
            is_valid = bcrypt.verify(password, new_hash)
            print(f"  Verify: {'✓ PASS' if is_valid else '✗ FAIL'}")
        except Exception as e:
            print(f"  Verify: ✗ ERROR - {e}")
    else:
        print(f"  ✗ User not found")

conn.commit()
print("\n✅ User password regeneration completed!")
print("\nTest the credentials now:")
for user in users:
    print(f"  {user['email']} / {user['password']}")

conn.close()
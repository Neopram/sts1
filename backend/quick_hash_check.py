import sqlite3
from passlib.hash import bcrypt

conn = sqlite3.connect('sts_clearance.db')
cursor = conn.cursor()
cursor.execute("SELECT email, password_hash FROM users WHERE email IN ('test@sts.com', 'admin@sts.com')")
for row in cursor.fetchall():
    email, hash_val = row
    print(f"\n{email}:")
    print(f"  Hash: {hash_val[:50]}...")
    
    # Try to verify common passwords
    for pwd in ["test123", "admin123", "password"]:
        try:
            result = bcrypt.verify(pwd, hash_val)
            if result:
                print(f"  ✅ Password: {pwd}")
        except Exception as e:
            print(f"  Error checking {pwd}: {str(e)[:50]}")

conn.close()
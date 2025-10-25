import sqlite3
import sys
sys.path.insert(0, 'backend')

from passlib.hash import bcrypt

conn = sqlite3.connect('backend/sts_clearance.db')
cursor = conn.cursor()

# Get test user
cursor.execute('SELECT id, email, password_hash FROM users WHERE email = "test@sts.com"')
user = cursor.fetchone()

if user:
    print(f"User: {user[1]}")
    print(f"Hash: {user[2]}")
    
    # Try to verify with test123
    password_to_test = "test123"
    try:
        result = bcrypt.verify(password_to_test, user[2])
        print(f"bcrypt.verify('{password_to_test}', hash) = {result}")
        if result:
            print("✅ Password verification successful!")
        else:
            print("❌ Password verification failed!")
    except Exception as e:
        print(f"ERROR verifying: {e}")
else:
    print("test@sts.com not found")

conn.close()
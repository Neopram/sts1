import sqlite3
from passlib.hash import bcrypt

conn = sqlite3.connect('backend/sts_clearance.db')
cursor = conn.cursor()

# Get test user
cursor.execute('SELECT id, email, password_hash FROM users WHERE email = "test@sts.com"')
user = cursor.fetchone()

if user:
    print(f"User: {user[1]}")
    print(f"Hash stored: {user[2][:50]}...")
    
    # Try to verify with test123
    password_to_test = "test123"
    try:
        result = bcrypt.verify(password_to_test, user[2])
        print(f"bcrypt.verify('{password_to_test}', hash) = {result}")
    except Exception as e:
        print(f"ERROR verifying: {e}")
    
    # Try admin
    admin_cursor = cursor.execute('SELECT id, email, password_hash FROM users WHERE email = "admin@sts.com"')
    admin_user = admin_cursor.fetchone()
    if admin_user:
        print(f"\nAdmin User: {admin_user[1]}")
        print(f"Admin Hash: {admin_user[2][:50]}...")
        try:
            result = bcrypt.verify("admin123", admin_user[2])
            print(f"bcrypt.verify('admin123', hash) = {result}")
        except Exception as e:
            print(f"ERROR verifying admin: {e}")
else:
    print("test@sts.com not found")

conn.close()
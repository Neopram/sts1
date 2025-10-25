import sqlite3

conn = sqlite3.connect('backend/sts_clearance.db')
cursor = conn.cursor()

# Get test user
cursor.execute('SELECT id, email, password_hash FROM users WHERE email = "test@sts.com"')
user = cursor.fetchone()

if user:
    hash_val = user[2]
    print(f"Email: {user[1]}")
    print(f"Hash length: {len(hash_val)}")
    print(f"Hash: {hash_val}")
    print(f"Hash type: {type(hash_val)}")
    
    # Check if hash is valid bcrypt format
    if hash_val.startswith('$2'):
        print("✓ Valid bcrypt hash format")
    else:
        print("✗ Invalid hash format")

conn.close()
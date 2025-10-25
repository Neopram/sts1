import sqlite3
import sys
sys.path.insert(0, 'backend')

from passlib.hash import bcrypt

conn = sqlite3.connect('backend/sts_clearance.db')
cursor = conn.cursor()

# Get test user exactly like the backend does
cursor.execute('SELECT id, email, password_hash FROM users WHERE email = "test@sts.com"')
result = cursor.fetchone()

if result:
    user_id, user_email, password_hash = result
    print(f"User found: {user_email}")
    print(f"Password hash type: {type(password_hash)}")
    print(f"Password hash: {password_hash}")
    
    # Test password to verify
    test_password = "test123"
    
    # Replicate backend logic exactly
    try:
        print(f"\nAttempting bcrypt.verify('{test_password}', hash)...")
        
        # Ensure password is a string
        password_str = test_password if isinstance(test_password, str) else str(test_password)
        hash_str = password_hash if isinstance(password_hash, str) else password_hash.decode('utf-8')
        
        print(f"Password string type: {type(password_str)}")
        print(f"Hash string type: {type(hash_str)}")
        
        # Try bcrypt.verify
        is_valid = bcrypt.verify(password_str, hash_str)
        print(f"\nbcrypt.verify result: {is_valid}")
        
        if is_valid:
            print("✓ Login would succeed")
        else:
            print("✗ Login would fail - password doesn't match")
            
    except Exception as e:
        print(f"✗ Exception during bcrypt.verify: {e}")
        print(f"Exception type: {type(e)}")
        import traceback
        traceback.print_exc()
else:
    print("User not found")

conn.close()
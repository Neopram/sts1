import sqlite3
from passlib.hash import bcrypt

conn = sqlite3.connect('backend/sts_clearance.db')
cursor = conn.cursor()
cursor.execute('SELECT email, role, password_hash FROM users')
print('Users in database:')
for row in cursor.fetchall():
    email, role, password_hash = row
    print(f'  {email:30} | {role:15} | hash: {str(password_hash)[:30] if password_hash else "None"}...')
    
    # Try to verify password123 for this user
    if password_hash:
        try:
            if bcrypt.verify('password123', password_hash):
                print(f'    ✓ "password123" matches!')
            else:
                print(f'    ✗ "password123" does NOT match')
        except Exception as e:
            print(f'    Error verifying: {e}')
    else:
        print(f'    No password hash set')

conn.close()
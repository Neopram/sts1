import sqlite3
from passlib.hash import bcrypt

password = "password123"
new_hash = bcrypt.hash(password)

print(f"Password: {password}")
print(f"New hash: {new_hash}")

# Update all demo users (@sts.com)
conn = sqlite3.connect('backend/sts_clearance.db')
cursor = conn.cursor()

demo_emails = [
    'admin@sts.com',
    'broker@sts.com',
    'owner@sts.com',
    'seller@sts.com',
    'buyer@sts.com',
    'charterer@sts.com',
    'viewer@sts.com',
]

for email in demo_emails:
    cursor.execute(
        "UPDATE users SET password_hash = ? WHERE email = ?",
        (new_hash, email)
    )
    print(f"Updated {email}")

conn.commit()
conn.close()

print("\nVerifying new hash...")
try:
    if bcrypt.verify(password, new_hash):
        print("✓ Verification successful!")
    else:
        print("✗ Verification failed!")
except Exception as e:
    print(f"Error: {e}")
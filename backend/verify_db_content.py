#!/usr/bin/env python
"""
Verify database content and schema
"""
import sqlite3

db_path = "sts_clearance.db"
conn = sqlite3.connect(db_path)
cursor = conn.cursor()

print("=== DATABASE VERIFICATION ===\n")

# Get all tables
cursor.execute("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name;")
tables = cursor.fetchall()
print(f"Total tables: {len(tables)}")
print(f"Tables: {[t[0] for t in tables]}\n")

# Check users table
if any(t[0] == 'users' for t in tables):
    print("Users table schema:")
    cursor.execute("PRAGMA table_info(users);")
    columns = cursor.fetchall()
    for col in columns:
        print(f"  {col[1]}: {col[2]}")
    
    # Check user count
    cursor.execute("SELECT COUNT(*) FROM users;")
    count = cursor.fetchone()[0]
    print(f"\nTotal users: {count}")
    
    if count > 0:
        print("\nUsers in database:")
        cursor.execute("SELECT id, email, name, role, password_hash FROM users;")
        for user in cursor.fetchall():
            pwd_preview = user[4][:30] + "..." if user[4] else "None"
            print(f"  - {user[1]}: {user[2]} ({user[3]}) - pwd: {pwd_preview}")
else:
    print("❌ Users table NOT found!")

conn.close()
print("\n✅ Verification complete")
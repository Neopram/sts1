#!/usr/bin/env python
import sqlite3

db_path = "sts_clearance.db"
conn = sqlite3.connect(db_path)
cursor = conn.cursor()

# Get all tables
cursor.execute("SELECT name FROM sqlite_master WHERE type='table';")
tables = cursor.fetchall()
print(f"Tables in database: {[t[0] for t in tables]}\n")

# Check users table schema
if any(t[0] == 'users' for t in tables):
    print("Users table schema:")
    cursor.execute("PRAGMA table_info(users);")
    columns = cursor.fetchall()
    for col in columns:
        print(f"  {col[1]}: {col[2]}")
else:
    print("Users table NOT found!")

conn.close()
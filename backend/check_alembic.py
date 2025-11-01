#!/usr/bin/env python
import sqlite3

try:
    conn = sqlite3.connect('sts_clearance.db')
    cursor = conn.cursor()
    
    # Check alembic version
    cursor.execute('SELECT version_num FROM alembic_version')
    version = cursor.fetchone()
    if version:
        print(f"Current Alembic Version: {version[0]}")
    else:
        print("No Alembic version recorded (table might be empty)")
    
    # List all revisions that exist
    cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='alembic_version'")
    if cursor.fetchone():
        print("✓ alembic_version table exists")
    
    conn.close()
except Exception as e:
    print(f"ERROR: {e}")
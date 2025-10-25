import sqlite3
import os

db_path = 'sts_clearance.db'
if os.path.exists(db_path):
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    # Get all tables
    cursor.execute("SELECT name FROM sqlite_master WHERE type='table'")
    tables = cursor.fetchall()
    print("=== ALL TABLES ===")
    for t in tables:
        print(f"Table: {t[0]}")
        # Get count of rows
        try:
            cursor.execute(f'SELECT COUNT(*) FROM "{t[0]}"')
            count = cursor.fetchone()[0]
            print(f"  Rows: {count}")
        except Exception as e:
            print(f"  Error: {e}")
    
    conn.close()
else:
    print("DB not found")
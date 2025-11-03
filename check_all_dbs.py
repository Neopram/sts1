import sqlite3
import pathlib

db_files = [
    'c:\\Users\\feder\\Desktop\\StsHub\\sts_clearance.db',
    'c:\\Users\\feder\\Desktop\\StsHub\\Mardowns\\sts_clearance.db',
    'c:\\Users\\feder\\Desktop\\StsHub\\sts\\sts_clearance.db',
    'c:\\Users\\feder\\Desktop\\StsHub\\sts\\backend\\sts_clearance.db',
]

for db_path in db_files:
    p = pathlib.Path(db_path)
    if not p.exists():
        print(f"[{db_path}] - NOT FOUND")
        continue
    
    try:
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        cursor.execute("PRAGMA table_info(users)")
        columns = {row[1] for row in cursor.fetchall()}
        print(f"[{db_path}]")
        print(f"  Has 'department': {'department' in columns}")
        print(f"  Total columns: {len(columns)}")
        conn.close()
    except Exception as e:
        print(f"[{db_path}] - ERROR: {e}")

print("\n" + "="*80)
print("Checking which DB backend is currently using by examining the backend/sts_clearance.db schema:")
conn = sqlite3.connect('c:\\Users\\feder\\Desktop\\StsHub\\sts\\backend\\sts_clearance.db')
cursor = conn.cursor()
cursor.execute("SELECT name FROM sqlite_master WHERE type='table'")
tables = [row[0] for row in cursor.fetchall()]
print(f"Tables in backend/sts_clearance.db: {tables}")
conn.close()
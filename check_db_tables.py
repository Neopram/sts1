import sqlite3

conn = sqlite3.connect('backend/sts_clearance.db')
cursor = conn.cursor()
cursor.execute("SELECT name FROM sqlite_master WHERE type='table'")
tables = cursor.fetchall()
print('=== TABLAS EN BD ===')
for table in tables:
    print(f'  - {table[0]}')
conn.close()
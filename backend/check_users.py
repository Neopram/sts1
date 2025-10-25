import sqlite3

db_path = 'sts_clearance.db'
conn = sqlite3.connect(db_path)
cursor = conn.cursor()

# Get users - try both table names
try:
    cursor.execute('SELECT email, role FROM users')
    users = cursor.fetchall()
    print("=== USERS (from 'users' table) ===")
    for u in users:
        print(f"  {u[0]:30} | Role: {u[1]}")
except Exception as e:
    print(f"Error: {e}")
    try:
        cursor.execute('SELECT email, role FROM "user"')
        users = cursor.fetchall()
        print("=== USERS (from 'user' table) ===")
        for u in users:
            print(f"  {u[0]:30} | Role: {u[1]}")
    except Exception as e2:
        print(f"Also failed: {e2}")

conn.close()
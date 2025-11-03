import sqlite3

db_path = "./sts_clearance.db"
conn = sqlite3.connect(db_path)
cursor = conn.cursor()

cursor.execute("SELECT id, email, role, password_hash FROM users ORDER BY email;")
users = cursor.fetchall()

print("📋 All users in database:")
for u in users:
    hash_preview = (u[3][:20] + "...") if u[3] else "None"
    print(f"   {u[1]:30} ({u[2]:10}) - Hash: {hash_preview}")

conn.close()
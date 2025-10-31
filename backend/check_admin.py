import sqlite3
conn = sqlite3.connect('sts_clearance.db')
c = conn.cursor()
c.execute("SELECT email, role FROM users WHERE role='admin' LIMIT 5")
users = c.fetchall()
print("Admin users in database:")
for user in users:
    print(f'✅ Email: {user[0]} | Role: {user[1]}')
if not users:
    print('⚠️ No admin users found, checking all users...')
    c.execute("SELECT email, role FROM users LIMIT 10")
    all_users = c.fetchall()
    for user in all_users:
        print(f'  Email: {user[0]} | Role: {user[1]}')
conn.close()
import sqlite3
import os

db_path = "./sts_clearance.db"

if not os.path.exists(db_path):
    print(f"❌ Database file not found at {db_path}")
else:
    print(f"✅ Database file found at {db_path}")
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    # Check tables
    cursor.execute("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name;")
    tables = cursor.fetchall()
    print(f"\n📊 Total tables: {len(tables)}")
    
    # Check if users table exists
    if ('user',) in tables or ('users',) in tables:
        # Try both names
        try:
            cursor.execute("SELECT COUNT(*) FROM user;")
            user_count = cursor.fetchone()[0]
            print(f"✅ 'user' table found with {user_count} records")
            
            cursor.execute("SELECT id, email, role, password_hash FROM user LIMIT 5;")
            users = cursor.fetchall()
            print(f"   Sample users:")
            for u in users:
                print(f"     - {u[1]} ({u[2]}): {'✅ hash' if u[3] else '❌ no hash'}")
        except Exception as e:
            try:
                cursor.execute("SELECT COUNT(*) FROM users;")
                user_count = cursor.fetchone()[0]
                print(f"✅ 'users' table found with {user_count} records")
                
                cursor.execute("SELECT id, email, role, password_hash FROM users LIMIT 5;")
                users = cursor.fetchall()
                print(f"   Sample users:")
                for u in users:
                    print(f"     - {u[1]} ({u[2]}): {'✅ hash' if u[3] else '❌ no hash'}")
            except Exception as e2:
                print(f"❌ Error querying user tables: {e2}")
    else:
        print("❌ No 'user' or 'users' table found")
        print(f"   Available tables: {[t[0] for t in tables[:10]]}")
    
    conn.close()
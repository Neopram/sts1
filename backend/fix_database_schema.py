#!/usr/bin/env python3
"""
Fix database schema by adding missing password_hash column and recreating users
"""

import sqlite3
import bcrypt
import uuid
from datetime import datetime

DATABASE_PATH = "sts_clearance.db"

def fix_database_schema():
    """Fix the database schema and add test users"""
    print("🔧 Fixing database schema...")
    
    conn = sqlite3.connect(DATABASE_PATH)
    cursor = conn.cursor()
    
    try:
        # Step 1: Check current schema
        cursor.execute("PRAGMA table_info(users)")
        columns = cursor.fetchall()
        column_names = [col[1] for col in columns]
        
        print(f"Current columns: {column_names}")
        
        # Step 2: Add password_hash column if missing
        if 'password_hash' not in column_names:
            print("Adding password_hash column...")
            cursor.execute("ALTER TABLE users ADD COLUMN password_hash VARCHAR(255)")
            print("✅ Added password_hash column")
        else:
            print("✅ password_hash column already exists")
        
        # Step 3: Clear existing users and add new ones with proper passwords
        print("Clearing existing users...")
        cursor.execute("DELETE FROM users")
        
        # Step 4: Create test users with proper password hashes
        print("Creating test users...")
        
        users_to_create = [
            {
                "id": str(uuid.uuid4()),
                "email": "admin@sts.com",
                "name": "System Administrator", 
                "role": "admin",
                "password": "admin123"
            },
            {
                "id": str(uuid.uuid4()),
                "email": "owner@sts.com",
                "name": "Room Owner",
                "role": "owner", 
                "password": "admin123"
            },
            {
                "id": str(uuid.uuid4()),
                "email": "test@sts.com",
                "name": "Test User",
                "role": "owner",
                "password": "test123"
            }
        ]
        
        for user_data in users_to_create:
            # Hash the password
            password_hash = bcrypt.hashpw(
                user_data["password"].encode('utf-8'), 
                bcrypt.gensalt()
            ).decode('utf-8')
            
            # Insert user
            cursor.execute("""
                INSERT INTO users (id, email, name, role, password_hash, created_at, is_active)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            """, (
                user_data["id"],
                user_data["email"],
                user_data["name"],
                user_data["role"],
                password_hash,
                datetime.utcnow().isoformat(),
                True
            ))
            
            print(f"✅ Created user: {user_data['email']} (role: {user_data['role']})")
        
        # Step 5: Verify the users were created
        cursor.execute("SELECT email, name, role, password_hash FROM users")
        users = cursor.fetchall()
        
        print(f"\n📊 Verification - {len(users)} users in database:")
        for user in users:
            email, name, role, password_hash = user
            print(f"  - {email} ({role}) - Password hash: {password_hash[:20]}...")
        
        # Step 6: Test password verification
        print("\n🔑 Testing password verification...")
        for user_data in users_to_create:
            cursor.execute("SELECT password_hash FROM users WHERE email = ?", (user_data["email"],))
            result = cursor.fetchone()
            
            if result:
                stored_hash = result[0]
                is_valid = bcrypt.checkpw(
                    user_data["password"].encode('utf-8'),
                    stored_hash.encode('utf-8')
                )
                print(f"  {user_data['email']}: {'✅ VALID' if is_valid else '❌ INVALID'}")
            else:
                print(f"  {user_data['email']}: ❌ NOT FOUND")
        
        conn.commit()
        print("\n🎉 Database schema fixed successfully!")
        
        print("\n📝 Login credentials:")
        print("  - admin@sts.com / admin123 (admin role)")
        print("  - owner@sts.com / admin123 (owner role - can create rooms)")
        print("  - test@sts.com / test123 (owner role)")
        
    except Exception as e:
        print(f"❌ Error: {e}")
        conn.rollback()
        raise
    finally:
        conn.close()

if __name__ == "__main__":
    fix_database_schema()
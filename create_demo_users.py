#!/usr/bin/env python3
"""
Create demo users for STS Clearance Hub with consistent passwords
This script creates the demo users that the LoginPage expects
"""

import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'backend'))

import asyncio
import sqlite3
from sqlalchemy import select
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker

from app.models import User, Base
from app.database import engine, AsyncSessionLocal
from passlib.hash import bcrypt

# Demo users matching LoginPage.tsx
DEMO_USERS = [
    {'email': 'admin@sts.com', 'role': 'admin', 'name': 'Admin User'},
    {'email': 'broker@sts.com', 'role': 'broker', 'name': 'Broker User'},
    {'email': 'owner@sts.com', 'role': 'owner', 'name': 'Owner User'},
    {'email': 'seller@sts.com', 'role': 'seller', 'name': 'Seller User'},
    {'email': 'buyer@sts.com', 'role': 'buyer', 'name': 'Buyer User'},
    {'email': 'charterer@sts.com', 'role': 'charterer', 'name': 'Charterer User'},
    {'email': 'viewer@sts.com', 'role': 'viewer', 'name': 'Viewer User'},
]

DEMO_PASSWORD = 'password123'

def create_demo_users():
    """Create demo users in the database using SQLite directly"""
    
    # Path to the database
    db_path = os.path.join(os.path.dirname(__file__), 'backend', 'sts_clearance.db')
    
    print(f"📝 Creating demo users in {db_path}")
    print(f"🔐 Password: {DEMO_PASSWORD}\n")
    
    # Connect to SQLite database
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    try:
        # Check if users table exists
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='users'")
        if not cursor.fetchone():
            print("❌ Users table does not exist. Please run database migrations first.")
            return
        
        # Get the columns of the users table
        cursor.execute("PRAGMA table_info(users)")
        columns = {row[1] for row in cursor.fetchall()}
        print(f"✓ Found columns: {len(columns)} columns in users table")
        
        for user_data in DEMO_USERS:
            email = user_data['email']
            
            # Check if user already exists
            cursor.execute('SELECT id FROM users WHERE email = ?', (email,))
            if cursor.fetchone():
                print(f"⏭️  Skipping {email} (already exists)")
                continue
            
            # Create password hash
            password_hash = bcrypt.hash(DEMO_PASSWORD)
            
            # Insert user - only use columns that exist
            import uuid
            user_id = str(uuid.uuid4())
            
            sql = '''
                INSERT INTO users (id, email, password_hash, name, role, is_active)
                VALUES (?, ?, ?, ?, ?, ?)
            '''
            
            try:
                cursor.execute(sql, (
                    user_id,
                    email,
                    password_hash,
                    user_data['name'],
                    user_data['role'],
                    True
                ))
                print(f"✅ Created {email} ({user_data['role']})")
            except sqlite3.IntegrityError as e:
                print(f"⚠️  Error creating {email}: {e}")
        
        conn.commit()
        print("\n✨ Demo users created successfully!")
        print("\nLogin with any of these credentials:")
        for user in DEMO_USERS:
            print(f"  📧 {user['email']} / 🔐 {DEMO_PASSWORD}")
            
    except Exception as e:
        print(f"❌ Error: {e}")
        conn.rollback()
    finally:
        conn.close()

if __name__ == '__main__':
    create_demo_users()
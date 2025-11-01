#!/usr/bin/env python3
"""
Update demo user passwords to use 'password123'
"""

import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'backend'))

import sqlite3
from passlib.hash import bcrypt

# Demo users to update
DEMO_EMAILS = [
    'admin@sts.com',
    'broker@sts.com',
    'owner@sts.com',
    'seller@sts.com',
    'buyer@sts.com',
    'charterer@sts.com',
    'viewer@sts.com',
]

DEMO_PASSWORD = 'password123'

def update_passwords():
    """Update all demo user passwords"""
    
    db_path = os.path.join(os.path.dirname(__file__), 'backend', 'sts_clearance.db')
    
    print(f"🔑 Updating demo user passwords in {db_path}")
    print(f"📝 New password: {DEMO_PASSWORD}\n")
    
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    try:
        # Create password hash
        password_hash = bcrypt.hash(DEMO_PASSWORD)
        
        for email in DEMO_EMAILS:
            cursor.execute(
                'UPDATE users SET password_hash = ? WHERE email = ?',
                (password_hash, email)
            )
            
            # Check if it was updated
            cursor.execute('SELECT id, role FROM users WHERE email = ?', (email,))
            result = cursor.fetchone()
            
            if result:
                print(f"✅ Updated {email} ({result[1]})")
            else:
                print(f"⚠️  User not found: {email}")
        
        conn.commit()
        print("\n✨ Password update completed!")
        print("\nYou can now login with:")
        for email in DEMO_EMAILS:
            print(f"  📧 {email} / 🔐 {DEMO_PASSWORD}")
            
    except Exception as e:
        print(f"❌ Error: {e}")
        conn.rollback()
    finally:
        conn.close()

if __name__ == '__main__':
    update_passwords()
#!/usr/bin/env python3
"""Reset test user passwords"""

import bcrypt
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker

# Connect to database
engine = create_engine('sqlite:///sts_clearance.db')
SessionLocal = sessionmaker(bind=engine)
session = SessionLocal()

# Hash password
password = 'password123'
hashed = bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()

# Update users
users_to_update = ['admin@sts.com', 'owner@sts.com', 'charterer@sts.com', 'broker@sts.com']

with session.begin():
    for email in users_to_update:
        session.execute(
            text(f"UPDATE users SET password_hash = :hash WHERE email = :email"),
            {"hash": hashed, "email": email}
        )
        print(f"✓ Updated {email} with test password")

print(f"\nPassword hash: {hashed}")
print("Test password: password123")

session.close()
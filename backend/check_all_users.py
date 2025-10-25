#!/usr/bin/env python3
import sqlite3
from passlib.hash import bcrypt

db_path = 'sts_clearance.db'
conn = sqlite3.connect(db_path)
cursor = conn.cursor()

print("=" * 80)
print("👤 USUARIOS Y SUS CREDENCIALES")
print("=" * 80)

cursor.execute("SELECT email, name, role, password_hash FROM users")
users = cursor.fetchall()

for user in users:
    email, name, role, pwd_hash = user
    print(f"\n📧 Email: {email}")
    print(f"   Nombre: {name}")
    print(f"   Role: {role}")
    print(f"   Hash: {pwd_hash[:30]}..." if pwd_hash else "   Hash: None")
    
    # Try common passwords
    common_passwords = ["admin123", "password", "123456", "test123", email.split("@")[0]]
    
    if pwd_hash:
        for pwd in common_passwords:
            try:
                if bcrypt.verify(pwd, pwd_hash):
                    print(f"   ✅ Contraseña válida: {pwd}")
            except:
                pass

conn.close()
print("\n" + "=" * 80)
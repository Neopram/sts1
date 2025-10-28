#!/usr/bin/env python3
from passlib.hash import bcrypt
import sqlite3

# Generar hash para 'password'
pwd = 'password'
hashed_str = bcrypt.hash(pwd)
print(f'DEBUG: Hash generated = {repr(hashed_str)}')

print(f'🔐 Generated bcrypt hash for "{pwd}":')
print(f'   {hashed_str}')

# Actualizar la BD
db_path = 'sts_clearance.db'
conn = sqlite3.connect(db_path)
cursor = conn.cursor()

# Actualizar admin@sts.com con el nuevo hash
cursor.execute('UPDATE users SET password_hash = ? WHERE email = ?', (hashed_str, 'admin@sts.com'))
conn.commit()

print(f'\n✅ Updated admin@sts.com with new password hash')

# Verificar
cursor.execute('SELECT email, password_hash FROM users WHERE email = ?', ('admin@sts.com',))
result = cursor.fetchone()
if result:
    print(f'   Email: {result[0]}')
    print(f'   Hash: {result[1][:20]}...')

conn.close()
#!/usr/bin/env python3
"""Check login issue and database state"""
import sqlite3
import os
from pathlib import Path

db_path = Path('sts_clearance.db')
print("=" * 60)
print("🔍 Diagnosticando problema de login")
print("=" * 60)

if db_path.exists():
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    # Check tables
    print("\n📊 Tablas en la BD:")
    cursor.execute("SELECT name FROM sqlite_master WHERE type='table'")
    tables = cursor.fetchall()
    for table in tables:
        print(f"  ✓ {table[0]}")
    
    # Check user table
    print("\n👤 Usuarios en la BD:")
    try:
        cursor.execute("SELECT email, name, role FROM user")
        users = cursor.fetchall()
        if users:
            for user in users:
                print(f"  ✓ {user[0]} | {user[1]} | Role: {user[2]}")
        else:
            print("  ❌ No hay usuarios en la base de datos")
    except Exception as e:
        print(f"  ❌ Error al consultar usuarios: {e}")
    
    # Check feature_flags
    print("\n🚩 Feature Flags:")
    try:
        cursor.execute("SELECT key, enabled FROM feature_flags")
        flags = cursor.fetchall()
        if flags:
            for flag in flags:
                print(f"  ✓ {flag[0]}: {'Habilitado' if flag[1] else 'Deshabilitado'}")
        else:
            print("  ❌ No hay feature flags configurados")
    except Exception as e:
        print(f"  ❌ Error al consultar feature_flags: {e}")
    
    conn.close()
    print("\n✅ Verificación completada")
else:
    print(f"\n❌ Base de datos no encontrada en: {db_path.absolute()}")

print("=" * 60)
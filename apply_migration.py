#!/usr/bin/env python3
"""Apply PHASE 1 Database Migration"""
import sqlite3
import os
import shutil
from pathlib import Path

db_path = 'sts_clearance.db'
sql_file = '../PHASE_1_DATABASE_MIGRATION.sql'

print("🔄 Iniciando migración de BD...")

# Hacer backup
if os.path.exists(db_path):
    backup_path = f'{db_path}.backup'
    shutil.copy(db_path, backup_path)
    print(f"✅ Backup creado: {backup_path}")

# Ejecutar migración
conn = sqlite3.connect(db_path)
cursor = conn.cursor()

try:
    with open(sql_file, 'r') as f:
        sql_content = f.read()
        # Separar los scripts
        statements = [s.strip() for s in sql_content.split(';') if s.strip() and not s.strip().startswith('--')]
        
        created_count = 0
        for stmt in statements:
            if stmt and not stmt.startswith('SELECT'):
                try:
                    cursor.execute(stmt)
                    created_count += 1
                except sqlite3.OperationalError as e:
                    if 'already exists' not in str(e):
                        print(f"⚠️  Error: {e}")
    
    conn.commit()
    
    # Verificar tablas
    cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND (name LIKE 'sts_%' OR name LIKE 'operation_%');")
    tables = cursor.fetchall()
    
    print("\n✅ MIGRACIÓN COMPLETADA!")
    print(f"\n📊 Tablas creadas ({len(tables)}):")
    for table in tables:
        cursor.execute(f"PRAGMA table_info({table[0]})")
        columns = cursor.fetchall()
        print(f"  ✓ {table[0]}: {len(columns)} columns")
    
    # Verificar índices
    cursor.execute("SELECT name FROM sqlite_master WHERE type='index' AND (name LIKE '%sts%' OR name LIKE '%op_%');")
    indexes = cursor.fetchall()
    print(f"\n📈 Índices creados ({len(indexes)}):")
    for idx in indexes:
        print(f"  ✓ {idx[0]}")
    
    print("\n✅ BD lista para usar!")
    
except Exception as e:
    print(f"❌ Error durante migración: {e}")
    conn.rollback()
finally:
    conn.close()
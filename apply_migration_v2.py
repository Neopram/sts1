#!/usr/bin/env python3
"""Apply PHASE 1 Database Migration - V2"""
import sqlite3
import os
import shutil

db_path = 'sts_clearance.db'

print("🔄 Iniciando migración de BD (v2)...")

# Hacer backup
if os.path.exists(db_path):
    backup_path = f'{db_path}.backup'
    shutil.copy(db_path, backup_path)
    print(f"✅ Backup creado: {backup_path}")

conn = sqlite3.connect(db_path)
cursor = conn.cursor()

try:
    # STEP 1: Create main tables (sin foreign keys)
    print("\n📝 Creando tablas...")
    
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS sts_operation_sessions (
            id TEXT PRIMARY KEY,
            title VARCHAR(500) NOT NULL,
            description TEXT,
            location VARCHAR(255) NOT NULL,
            region VARCHAR(100),
            scheduled_start_date TIMESTAMP NOT NULL,
            scheduled_end_date TIMESTAMP,
            actual_start_date TIMESTAMP,
            actual_end_date TIMESTAMP,
            sts_operation_code VARCHAR(50) NOT NULL UNIQUE,
            code_generated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            q88_enabled BOOLEAN DEFAULT 0,
            q88_operation_id VARCHAR(100),
            q88_last_sync TIMESTAMP,
            status VARCHAR(50) DEFAULT 'draft',
            created_by VARCHAR(255),
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    print("  ✓ sts_operation_sessions")
    
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS operation_participants (
            id TEXT PRIMARY KEY,
            operation_id TEXT NOT NULL,
            participant_type VARCHAR(50) NOT NULL,
            role VARCHAR(50) NOT NULL,
            name VARCHAR(255) NOT NULL,
            email VARCHAR(255) NOT NULL,
            phone VARCHAR(50),
            organization VARCHAR(255),
            position VARCHAR(100),
            status VARCHAR(50) DEFAULT 'invited',
            invitation_sent_at TIMESTAMP,
            acceptance_date TIMESTAMP,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    print("  ✓ operation_participants")
    
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS operation_vessels (
            id TEXT PRIMARY KEY,
            operation_id TEXT NOT NULL,
            vessel_id TEXT,
            vessel_name VARCHAR(255) NOT NULL,
            vessel_imo VARCHAR(20) NOT NULL UNIQUE,
            mmsi VARCHAR(20),
            vessel_type VARCHAR(50),
            flag VARCHAR(50),
            gross_tonnage REAL,
            vessel_role VARCHAR(50) NOT NULL,
            assigned_to_party VARCHAR(100),
            assigned_to_email VARCHAR(255),
            status VARCHAR(50) DEFAULT 'assigned',
            documents_status VARCHAR(50) DEFAULT 'pending',
            documents_required JSON,
            documents_submitted JSON,
            documents_approved JSON,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    print("  ✓ operation_vessels")
    
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS sts_operation_codes (
            id TEXT PRIMARY KEY,
            operation_id TEXT NOT NULL,
            code VARCHAR(50) NOT NULL UNIQUE,
            generated_by VARCHAR(255),
            generated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            is_active BOOLEAN DEFAULT 1,
            expires_at TIMESTAMP,
            format_version VARCHAR(20) DEFAULT '1.0',
            notes TEXT
        )
    ''')
    print("  ✓ sts_operation_codes")
    
    # STEP 2: Create indexes
    print("\n📈 Creando índices...")
    
    indexes = [
        ("idx_sts_op_sessions_title", "sts_operation_sessions(title)"),
        ("idx_sts_op_sessions_location", "sts_operation_sessions(location)"),
        ("idx_sts_op_sessions_code", "sts_operation_sessions(sts_operation_code)"),
        ("idx_sts_op_sessions_status", "sts_operation_sessions(status)"),
        ("idx_op_participants_operation_id", "operation_participants(operation_id)"),
        ("idx_op_participants_participant_type", "operation_participants(participant_type)"),
        ("idx_op_participants_email", "operation_participants(email)"),
        ("idx_op_vessels_operation_id", "operation_vessels(operation_id)"),
        ("idx_op_vessels_vessel_name", "operation_vessels(vessel_name)"),
        ("idx_op_vessels_vessel_imo", "operation_vessels(vessel_imo)"),
        ("idx_sts_op_codes_operation_id", "sts_operation_codes(operation_id)"),
        ("idx_sts_op_codes_code", "sts_operation_codes(code)"),
    ]
    
    for idx_name, idx_def in indexes:
        try:
            cursor.execute(f"CREATE INDEX IF NOT EXISTS {idx_name} ON {idx_def}")
            print(f"  ✓ {idx_name}")
        except sqlite3.OperationalError as e:
            print(f"  ⚠️  {idx_name}: {e}")
    
    conn.commit()
    
    # STEP 3: Verify
    print("\n✅ VERIFICANDO...")
    cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND (name LIKE 'sts_%' OR name LIKE 'operation_%');")
    tables = cursor.fetchall()
    
    print(f"\n📊 Tablas creadas ({len(tables)}):")
    for table in tables:
        cursor.execute(f"SELECT COUNT(*) FROM {table[0]}")
        count = cursor.fetchone()[0]
        print(f"  ✓ {table[0]}: {count} rows")
    
    cursor.execute("SELECT name FROM sqlite_master WHERE type='index' AND (name LIKE 'idx_sts%' OR name LIKE 'idx_op_%');")
    indexes_created = cursor.fetchall()
    print(f"\n📈 Índices ({len(indexes_created)}):")
    for idx in indexes_created:
        print(f"  ✓ {idx[0]}")
    
    print("\n✅ MIGRACIÓN COMPLETADA EXITOSAMENTE!")
    print("✅ BD lista para usar!")
    
except Exception as e:
    print(f"\n❌ Error durante migración: {e}")
    import traceback
    traceback.print_exc()
    conn.rollback()
finally:
    conn.close()
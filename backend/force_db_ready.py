#!/usr/bin/env python
"""
Force database to be ready by directly adding missing columns
This bypasses alembic for now and ensures the DB has everything needed
"""
import sqlite3
import sys

def add_column_if_not_exists(cursor, table_name, column_name, column_type):
    """Add a column to a table if it doesn't already exist"""
    try:
        # Check if column exists
        cursor.execute(f"PRAGMA table_info({table_name})")
        columns = [row[1] for row in cursor.fetchall()]
        
        if column_name not in columns:
            cursor.execute(f"ALTER TABLE {table_name} ADD COLUMN {column_name} {column_type}")
            print(f"  ✓ Added {table_name}.{column_name}")
            return True
        else:
            print(f"  - Skipped {table_name}.{column_name} (already exists)")
            return False
    except Exception as e:
        print(f"  ✗ Error adding {table_name}.{column_name}: {e}")
        return False

def force_db_ready():
    """Ensure database has all necessary columns for dashboard"""
    try:
        conn = sqlite3.connect('sts_clearance.db')
        cursor = conn.cursor()
        
        print("\n=== ADDING MISSING COLUMNS TO ROOMS ===")
        
        # Add dashboard columns to rooms table
        columns_to_add = [
            ('cargo_type', 'VARCHAR(100)'),
            ('cargo_quantity', 'FLOAT'),
            ('cargo_value_usd', 'FLOAT'),
            ('demurrage_rate_per_day', 'FLOAT'),
            ('demurrage_rate_per_hour', 'FLOAT'),
            ('status_detail', 'VARCHAR(50)'),
            ('timeline_phase', 'VARCHAR(50)'),
            ('eta_actual', 'DATETIME'),
            ('eta_estimated', 'DATETIME'),
            ('created_at_timestamp', 'DATETIME'),
            ('broker_commission_percentage', 'FLOAT'),
            ('broker_commission_amount', 'FLOAT'),
        ]
        
        for col_name, col_type in columns_to_add:
            add_column_if_not_exists(cursor, 'rooms', col_name, col_type)
        
        conn.commit()
        
        print("\n=== ADDING MISSING COLUMNS TO DOCUMENTS ===")
        
        doc_columns = [
            ('uploaded_by_user_id', 'VARCHAR(36)'),
            ('critical_path', 'BOOLEAN DEFAULT 0'),
            ('estimated_days_to_expire', 'INTEGER'),
        ]
        
        for col_name, col_type in doc_columns:
            add_column_if_not_exists(cursor, 'documents', col_name, col_type)
        
        conn.commit()
        
        # Verify
        print("\n=== VERIFICATION ===")
        cursor.execute("PRAGMA table_info(rooms)")
        room_columns = [row[1] for row in cursor.fetchall()]
        
        print("\n✓ Rooms table columns:")
        dashboard_cols = ['cargo_type', 'cargo_quantity', 'cargo_value_usd', 'demurrage_rate_per_day']
        for col in dashboard_cols:
            status = "✓" if col in room_columns else "✗"
            print(f"  {status} {col}")
        
        cursor.execute("PRAGMA table_info(documents)")
        doc_columns = [row[1] for row in cursor.fetchall()]
        
        print("\n✓ Documents table columns:")
        for col in ['uploaded_by_user_id', 'critical_path']:
            status = "✓" if col in doc_columns else "✗"
            print(f"  {status} {col}")
        
        # Check tables exist
        print("\n=== DATABASE TABLES ===")
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name")
        tables = [row[0] for row in cursor.fetchall()]
        
        required_tables = ['metrics', 'party_metrics', 'users', 'rooms', 'documents']
        for table in required_tables:
            status = "✓" if table in tables else "✗"
            print(f"  {status} {table}")
        
        conn.close()
        print("\n✅ Database is ready!")
        return True
        
    except Exception as e:
        print(f"❌ ERROR: {e}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == '__main__':
    success = force_db_ready()
    sys.exit(0 if success else 1)
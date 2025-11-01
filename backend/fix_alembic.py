#!/usr/bin/env python
"""
Fix alembic versioning by stamping the database with the latest applied version
"""
import sqlite3
import sys

def fix_alembic():
    try:
        conn = sqlite3.connect('sts_clearance.db')
        cursor = conn.cursor()
        
        # Check current state
        cursor.execute("SELECT count(*) FROM alembic_version")
        count = cursor.fetchone()[0]
        
        if count == 0:
            print("⚠️  alembic_version table is empty. Initializing...")
            
            # Based on the table structure, we've determined that we have:
            # - metrics table (NEW - from 005_dashboard_metrics)
            # - party_metrics table (NEW - from 005_dashboard_metrics)
            # - We need to apply from 005_dashboard_metrics onward
            
            # But the safest approach is to start from 003 and work up
            # Insert initial version: we'll use '003' as a starting point
            cursor.execute("INSERT INTO alembic_version (version_num) VALUES (?)", ('003',))
            conn.commit()
            print("✓ Stamped database as version 003")
            print("\nNow you need to run:")
            print("  alembic upgrade head")
            
        else:
            cursor.execute("SELECT version_num FROM alembic_version")
            versions = [row[0] for row in cursor.fetchall()]
            print(f"Current versions: {versions}")
            print("Database already has version history")
        
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name")
        tables = [row[0] for row in cursor.fetchall()]
        
        print(f"\nTables in database ({len(tables)}):")
        dashboard_tables = ['metrics', 'party_metrics']
        for table in dashboard_tables:
            if table in tables:
                print(f"  ✓ {table}")
            else:
                print(f"  ✗ {table}")
        
        conn.close()
        return True
        
    except Exception as e:
        print(f"ERROR: {e}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == '__main__':
    success = fix_alembic()
    sys.exit(0 if success else 1)
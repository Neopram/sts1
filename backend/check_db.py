#!/usr/bin/env python
import sqlite3
import sys

try:
    conn = sqlite3.connect('sts_clearance.db')
    cursor = conn.cursor()
    cursor.execute("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name")
    tables = [row[0] for row in cursor.fetchall()]
    print("=== CURRENT TABLES IN DATABASE ===")
    for table in tables:
        print(f"  ✓ {table}")
    
    print("\n=== CHECKING DASHBOARD TABLES ===")
    dashboard_tables = ['metrics', 'party_metrics']
    for table in dashboard_tables:
        if table in tables:
            print(f"  ✓ {table} - EXISTS")
        else:
            print(f"  ✗ {table} - MISSING")
    
    print("\n=== CHECKING ROOMS TABLE COLUMNS ===")
    cursor.execute("PRAGMA table_info(rooms)")
    columns = [row[1] for row in cursor.fetchall()]
    dashboard_cols = ['cargo_type', 'cargo_quantity', 'cargo_value_usd', 'demurrage_rate_per_day', 'broker_commission_percentage']
    for col in dashboard_cols:
        if col in columns:
            print(f"  ✓ {col}")
        else:
            print(f"  ✗ {col} - MISSING")
    
    conn.close()
    sys.exit(0)
except Exception as e:
    print(f"ERROR: {e}")
    sys.exit(1)
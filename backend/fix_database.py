"""
Script para arreglar la base de datos directamente
Agrega los campos faltantes a la tabla document_types
"""

import sqlite3
import os
from pathlib import Path

def fix_database():
    """Agrega campos description y category a document_types si es necesario"""
    
    db_path = "sts_clearance.db"
    
    if not os.path.exists(db_path):
        print(f"❌ Database not found at {db_path}")
        return False
    
    try:
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        
        # Check current schema
        cursor.execute("PRAGMA table_info(document_types)")
        columns = {row[1]: row[2] for row in cursor.fetchall()}
        
        print(f"📋 Current document_types columns: {list(columns.keys())}")
        
        # Add description column if missing
        if 'description' not in columns:
            try:
                cursor.execute("ALTER TABLE document_types ADD COLUMN description TEXT")
                print("✅ Added description column")
            except sqlite3.OperationalError as e:
                print(f"⚠️  Error adding description: {e}")
        else:
            print("ℹ️  description column already exists")
        
        # Add category column if missing
        if 'category' not in columns:
            try:
                cursor.execute("ALTER TABLE document_types ADD COLUMN category TEXT DEFAULT 'general' NOT NULL")
                print("✅ Added category column with default value 'general'")
            except sqlite3.OperationalError as e:
                print(f"⚠️  Error adding category: {e}")
        else:
            print("ℹ️  category column already exists")
        
        conn.commit()
        conn.close()
        
        print("\n✅ Database fixed successfully!")
        return True
        
    except Exception as e:
        print(f"❌ Error: {e}")
        return False

if __name__ == "__main__":
    fix_database()
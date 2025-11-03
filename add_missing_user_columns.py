import sqlite3

conn = sqlite3.connect('backend/sts_clearance.db')
cursor = conn.cursor()

# Get current columns
cursor.execute("PRAGMA table_info(users)")
existing_columns = {row[1] for row in cursor.fetchall()}
print(f"Existing columns: {existing_columns}")

# Define all required columns
required_columns = {
    'department': 'TEXT',
    'position': 'TEXT',
    'preferences': 'TEXT',
    'two_factor_enabled': 'INTEGER DEFAULT 0',
    'last_password_change': 'TIMESTAMP',
    'password_expiry_date': 'TIMESTAMP',
    'login_attempts': 'INTEGER DEFAULT 0',
    'locked_until': 'TIMESTAMP',
    'last_login': 'TIMESTAMP',
}

# Add missing columns
for col_name, col_type in required_columns.items():
    if col_name not in existing_columns:
        try:
            cursor.execute(f"ALTER TABLE users ADD COLUMN {col_name} {col_type}")
            print(f"✓ Added column: {col_name}")
        except sqlite3.OperationalError as e:
            print(f"✗ Error adding {col_name}: {e}")
    else:
        print(f"- Column {col_name} already exists")

conn.commit()
conn.close()

print("\nAll missing columns added successfully!")
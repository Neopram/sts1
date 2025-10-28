import sqlite3

# Connect to the database
conn = sqlite3.connect('sts_clearance.db')
cursor = conn.cursor()

# Get the list of columns in users table
cursor.execute("PRAGMA table_info(users)")
columns = cursor.fetchall()
column_names = [col[1] for col in columns]

print("Current columns in users table:")
for col in column_names:
    print(f"  - {col}")

# Add new columns if they don't exist
new_columns = {
    'department': 'VARCHAR(255)',
    'position': 'VARCHAR(255)',
    'two_factor_enabled': 'BOOLEAN DEFAULT 0',
    'last_password_change': 'DATETIME',
    'password_expiry_date': 'DATETIME',
    'login_attempts': 'INTEGER DEFAULT 0',
    'locked_until': 'DATETIME'
}

print("\n🔄 Adding new columns:")
for col_name, col_type in new_columns.items():
    if col_name not in column_names:
        try:
            cursor.execute(f"ALTER TABLE users ADD COLUMN {col_name} {col_type}")
            print(f"✓ Added column: {col_name}")
        except Exception as e:
            print(f"✗ Error adding {col_name}: {e}")
    else:
        print(f"- Column {col_name} already exists")

conn.commit()

# Verify all columns were added
cursor.execute("PRAGMA table_info(users)")
updated_columns = cursor.fetchall()
print("\nUpdated columns in users table:")
for col in updated_columns:
    print(f"  - {col[1]}")

conn.close()

print("\n✓ Database migration completed!")
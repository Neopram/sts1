import sys
sys.path.insert(0, 'backend')

from passlib.hash import bcrypt

# Test bcrypt
password = "password123"
hash_from_db = "$2b$12$pUKXbbrV8xXZVhh1zCYgBuE..BZ7/K8IFrGfHsyc7C9bF8m2EEkQu"

print(f"Testing bcrypt verification...")
print(f"Password: {password}")
print(f"Hash: {hash_from_db}")

try:
    result = bcrypt.verify(password, hash_from_db)
    print(f"Result: {result}")
except Exception as e:
    print(f"Error: {e}")
    import traceback
    traceback.print_exc()
#!/usr/bin/env python
"""
Fix all current_user bugs across all router files
Converts from dict access to SQLAlchemy object access
"""

import re
from pathlib import Path

def fix_file(filepath):
    """Fix a single file"""
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    original_content = content
    
    # List of replacements
    replacements = [
        # current_user["email"] -> current_user.email
        (r'current_user\["email"\]', 'current_user.email'),
        # current_user.get("email") -> current_user.email
        (r'current_user\.get\("email"(?:,\s*[^)]+)?\)', 'current_user.email'),
        
        # current_user["role"] -> current_user.role
        (r'current_user\["role"\]', 'current_user.role'),
        # current_user.get("role") -> current_user.role
        (r'current_user\.get\("role"(?:,\s*[^)]+)?\)', 'current_user.role'),
        
        # current_user["name"] -> current_user.name
        (r'current_user\["name"\]', 'current_user.name'),
        # current_user.get("name") -> current_user.name
        (r'current_user\.get\("name"(?:,\s*[^)]+)?\)', 'current_user.name'),
        
        # current_user.get(..., "default") with default values - needs special handling
        # Let's handle the common patterns:
        # current_user.get("email", "Unknown") -> current_user.email or "Unknown"
        (r'current_user\.get\("email",\s*"([^"]*)"\)', r'(current_user.email or "\1")'),
        (r'current_user\.get\("name",\s*"([^"]*)"\)', r'(current_user.name or "\1")'),
        (r'current_user\.get\("role",\s*"([^"]*)"\)', r'(current_user.role or "\1")'),
    ]
    
    for pattern, replacement in replacements:
        content = re.sub(pattern, replacement, content)
    
    if content != original_content:
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(content)
        return True
    return False

def main():
    router_dir = Path("c:\\Users\\feder\\Desktop\\StsHub\\sts\\backend\\app\\routers")
    
    print("🔧 FIXING current_user BUGS")
    print("="*80)
    
    fixed_count = 0
    for py_file in sorted(router_dir.glob("*.py")):
        if py_file.name == "__pycache__":
            continue
        
        if fix_file(py_file):
            print(f"✅ {py_file.name}")
            fixed_count += 1
        else:
            print(f"⏭️  {py_file.name} (no changes needed)")
    
    print("\n" + "="*80)
    print(f"✅ Fixed {fixed_count} files")

if __name__ == "__main__":
    main()
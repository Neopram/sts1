#!/usr/bin/env python3
"""
Phase 2 Setup Verification Script
Verifies that all Phase 2 components are correctly installed and configured
"""

import sys
import os
import importlib
from pathlib import Path

# Colors for output
GREEN = '\033[92m'
RED = '\033[91m'
YELLOW = '\033[93m'
RESET = '\033[0m'

def check_file_exists(path: str, description: str) -> bool:
    """Check if a file exists"""
    exists = os.path.exists(path)
    status = f"{GREEN}✓{RESET}" if exists else f"{RED}✗{RESET}"
    print(f"{status} {description}: {path}")
    return exists

def check_import(module_name: str, description: str) -> bool:
    """Check if a module can be imported"""
    try:
        importlib.import_module(module_name)
        print(f"{GREEN}✓{RESET} {description}: {module_name}")
        return True
    except ImportError as e:
        print(f"{RED}✗{RESET} {description}: {module_name} - {str(e)}")
        return False

def main():
    print("\n" + "="*60)
    print("🔍 PHASE 2 SETUP VERIFICATION")
    print("="*60 + "\n")
    
    checks_passed = 0
    checks_total = 0
    
    # Check Python version
    print(f"\n📌 Python Version: {sys.version}")
    
    # Check backend services
    print(f"\n{YELLOW}📦 Checking Backend Services...{RESET}")
    services = [
        ("app.services.email_service", "Email Service"),
        ("app.services.totp_service", "TOTP Service"),
        ("app.services.login_tracking_service", "Login Tracking Service"),
        ("app.services.backup_service", "Backup Service"),
        ("app.services.export_service", "Export Service"),
    ]
    
    for module, desc in services:
        checks_total += 1
        if check_import(module, desc):
            checks_passed += 1
    
    # Check backend routers
    print(f"\n{YELLOW}📡 Checking Backend Routers...{RESET}")
    routers = [
        ("app.routers.email_settings", "Email Settings Router"),
        ("app.routers.totp_settings", "TOTP Settings Router"),
        ("app.routers.login_tracking", "Login Tracking Router"),
        ("app.routers.backup_settings", "Backup Settings Router"),
        ("app.routers.advanced_export", "Advanced Export Router"),
    ]
    
    for module, desc in routers:
        checks_total += 1
        if check_import(module, desc):
            checks_passed += 1
    
    # Check models
    print(f"\n{YELLOW}📊 Checking Models...{RESET}")
    models = [
        ("app.models", "Models"),
    ]
    
    for module, desc in models:
        checks_total += 1
        try:
            models_module = importlib.import_module(module)
            # Check if Phase 2 models exist
            phase2_models = [
                'EmailSettings', 'TwoFactorAuth', 'LoginHistory',
                'BackupSchedule', 'BackupMetadata'
            ]
            missing = []
            for model in phase2_models:
                if not hasattr(models_module, model):
                    missing.append(model)
            
            if not missing:
                print(f"{GREEN}✓{RESET} {desc}: All Phase 2 models found")
                checks_passed += 1
            else:
                print(f"{RED}✗{RESET} {desc}: Missing models - {', '.join(missing)}")
        except ImportError as e:
            print(f"{RED}✗{RESET} {desc}: {str(e)}")
    
    # Check schemas
    print(f"\n{YELLOW}📋 Checking Schemas...{RESET}")
    schemas = [
        ("app.schemas", "Schemas"),
    ]
    
    for module, desc in schemas:
        checks_total += 1
        try:
            schemas_module = importlib.import_module(module)
            phase2_schemas = [
                'EmailSettingsResponse', 'TwoFactorAuthResponse',
                'LoginHistoryResponse', 'BackupScheduleResponse',
                'ExportResponse'
            ]
            missing = []
            for schema in phase2_schemas:
                if not hasattr(schemas_module, schema):
                    missing.append(schema)
            
            if not missing:
                print(f"{GREEN}✓{RESET} {desc}: All Phase 2 schemas found")
                checks_passed += 1
            else:
                print(f"{RED}✗{RESET} {desc}: Missing schemas - {', '.join(missing)}")
        except ImportError as e:
            print(f"{RED}✗{RESET} {desc}: {str(e)}")
    
    # Check dependencies
    print(f"\n{YELLOW}📚 Checking Dependencies...{RESET}")
    dependencies = [
        ("pyotp", "PyOTP"),
        ("qrcode", "QRCode"),
        ("jinja2", "Jinja2"),
        ("geoip2", "GeoIP2"),
        ("user_agents", "User Agents"),
        ("openpyxl", "OpenPyXL"),
        ("reportlab", "ReportLab"),
        ("fastapi", "FastAPI"),
        ("sqlalchemy", "SQLAlchemy"),
    ]
    
    for module, desc in dependencies:
        checks_total += 1
        if check_import(module, desc):
            checks_passed += 1
    
    # Check frontend components
    print(f"\n{YELLOW}🎨 Checking Frontend Components...{RESET}")
    components = [
        ("../src/components/EmailSettingsPanel.tsx", "EmailSettingsPanel"),
        ("../src/components/TwoFactorAuthPanel.tsx", "TwoFactorAuthPanel"),
        ("../src/components/SessionTimeoutWarning.tsx", "SessionTimeoutWarning"),
    ]
    
    base_path = Path(__file__).parent / "backend" / "app"
    for component_path, desc in components:
        checks_total += 1
        full_path = str(Path(__file__).parent / component_path)
        if check_file_exists(full_path, desc):
            checks_passed += 1
    
    # Check main.py includes
    print(f"\n{YELLOW}🔗 Checking Main.py Includes...{RESET}")
    main_py_path = str(Path(__file__).parent / "backend" / "app" / "main.py")
    checks_total += 1
    
    with open(main_py_path, 'r') as f:
        main_content = f.read()
        required_imports = [
            'email_settings',
            'totp_settings',
            'login_tracking',
            'backup_settings',
            'advanced_export'
        ]
        
        missing_imports = []
        for imp in required_imports:
            if imp not in main_content:
                missing_imports.append(imp)
        
        if not missing_imports:
            print(f"{GREEN}✓{RESET} Main.py includes all Phase 2 routers")
            checks_passed += 1
        else:
            print(f"{RED}✗{RESET} Main.py missing: {', '.join(missing_imports)}")
    
    # Summary
    print(f"\n" + "="*60)
    print(f"📊 VERIFICATION SUMMARY")
    print("="*60)
    print(f"Checks Passed: {GREEN}{checks_passed}/{checks_total}{RESET}")
    
    if checks_passed == checks_total:
        print(f"\n{GREEN}✓ ALL CHECKS PASSED! Phase 2 is properly configured.{RESET}\n")
        return 0
    else:
        failed = checks_total - checks_passed
        print(f"\n{RED}✗ {failed} CHECKS FAILED! Please review the errors above.{RESET}\n")
        return 1

if __name__ == "__main__":
    sys.exit(main())